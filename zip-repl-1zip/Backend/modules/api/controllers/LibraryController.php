<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;
use yii\web\UploadedFile;

/**
 * /api/library/* — categories + books + file upload/serve/download.
 */
class LibraryController extends ApiController
{
    // ── Categories ───────────────────────────────────────────────
    public function actionCategories(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $doc = [
                'id' => Uuid::v4(),
                'name_bn' => (string) ($b['name_bn'] ?? ''),
                'name_en' => (string) ($b['name_en'] ?? ''),
                'description' => (string) ($b['description'] ?? ''),
                'icon' => (string) ($b['icon'] ?? '📚'),
                'sort_order' => (int) ($b['sort_order'] ?? 0),
            ];
            Yii::$app->db->createCommand()->insert('library_categories', $doc)->execute();
            return $this->json($doc);
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM library_categories ORDER BY sort_order ASC')->queryAll();
        return $this->json($rows);
    }

    public function actionCategory(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isDelete) {
            Yii::$app->db->createCommand()->delete('library_categories', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        $b = Yii::$app->request->post();
        Yii::$app->db->createCommand()->update('library_categories', [
            'name_bn' => (string) ($b['name_bn'] ?? ''),
            'name_en' => (string) ($b['name_en'] ?? ''),
            'description' => (string) ($b['description'] ?? ''),
            'icon' => (string) ($b['icon'] ?? '📚'),
            'sort_order' => (int) ($b['sort_order'] ?? 0),
        ], ['id' => $id])->execute();
        $row = Yii::$app->db->createCommand('SELECT * FROM library_categories WHERE id = :id', [':id' => $id])->queryOne();
        return $this->json($row);
    }

    // ── Books ────────────────────────────────────────────────────
    // 2026-08-06: Added try-catch for better error diagnostics
    public function actionBooks(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $doc = array_merge($this->bookFields($b), ['id' => Uuid::v4(), 'created_at' => $this->now()]);
            Yii::$app->db->createCommand()->insert('books', $doc)->execute();
            return $this->json($doc);
        }

        try {
            $category = (string) Yii::$app->request->get('category', '');
            $search = (string) Yii::$app->request->get('search', '');
            $featured = (bool) Yii::$app->request->get('featured', false);
            $skip = (int) Yii::$app->request->get('skip', 0);
            $limit = (int) Yii::$app->request->get('limit', 40);

            $where = ['is_published = 1'];
            $params = [];
            if ($category !== '' && $category !== 'all') {
                $where[] = 'category = :c';
                $params[':c'] = $category;
            }
            if ($featured) {
                $where[] = 'is_featured = 1';
            }
            if ($search !== '') {
                $where[] = '(title_bn LIKE :s1 OR title_en LIKE :s2 OR author_en LIKE :s3 OR author_bn LIKE :s4)';
                $like = '%' . $search . '%';
                $params[':s1'] = $like; $params[':s2'] = $like; $params[':s3'] = $like; $params[':s4'] = $like;
            }

            $whereClause = implode(' AND ', $where);

            // Count total matching records
            $countSql = 'SELECT COUNT(*) FROM books WHERE ' . $whereClause;
            $total = (int) Yii::$app->db->createCommand($countSql, $params)->queryScalar();

            $sql = 'SELECT * FROM books WHERE ' . $whereClause . ' ORDER BY sort_order ASC LIMIT ' . ((int) $limit) . ' OFFSET ' . ((int) $skip);
            $rows = Yii::$app->db->createCommand($sql, $params)->queryAll();
            return $this->json(['total' => $total, 'books' => array_map(fn ($r) => $this->bookDoc($r), $rows)]);
        } catch (\Throwable $e) {
            Yii::$app->response->statusCode = 500;
            return $this->json(['error' => $e->getMessage(), 'trace' => YII_DEBUG ? $e->getTraceAsString() : null]);
        }
    }

    public function actionBook(string $id): \yii\web\Response
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM books WHERE id = :id', [':id' => $id])->queryOne();
        if ($row === false) {
            $this->notFound('Not Found');
        }
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            Yii::$app->db->createCommand()->update('books', $this->bookFields($request->post()), ['id' => $id])->execute();
            $row = Yii::$app->db->createCommand('SELECT * FROM books WHERE id = :id', [':id' => $id])->queryOne();
            return $this->json($this->bookDoc($row));
        }
        if ($request->isDelete) {
            $this->requireAdmin();
            Yii::$app->db->createCommand()->delete('books', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        return $this->json($this->bookDoc($row));
    }

    // ── File Upload (admin only, no size limit) ──────────────────
    public function actionUpload(): \yii\web\Response
    {
        $this->requireAdmin();

        // Unlimited upload: remove PHP time and memory limits
        set_time_limit(0);
        ini_set('memory_limit', '-1');

        $file = UploadedFile::getInstanceByName('file');
        if ($file === null || $file->error !== UPLOAD_ERR_OK || $file->name === '') {
            $this->badRequest('No file');
        }

        $ext = strtolower(pathinfo($file->name, PATHINFO_EXTENSION));
        $allowed = ['pdf', 'epub', 'html', 'htm', 'png', 'jpg', 'jpeg', 'webp'];
        if (!in_array($ext, $allowed, true)) {
            $this->badRequest('Unsupported file type: ' . $ext);
        }

        $dir = Yii::getAlias('@webroot') . '/uploads/library';
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $fileId = Uuid::v4();
        $name = $fileId . '.' . $ext;
        try {
            $file->saveAs($dir . '/' . $name);
        } catch (\Throwable $e) {
            $this->badRequest('Upload failed: ' . $e->getMessage());
        }

        return $this->json([
            'url' => '/uploads/library/' . $name,
            'file_type' => $ext,
            'file_size' => $file->size,
        ]);
    }

    // ── File Serve (authenticated users, streams with proper headers) ──
    // 2026-08-06: Added EPUB sub-path support for epub.js (META-INF/container.xml, OEBPS/*, etc.)
    public function actionServe(string $id): void
    {
        $this->user();

        // EPUB sub-path: route sends "uuid/sub/path" as $id — split on first /
        $bookId = $id;
        $subPath = null;
        if (($pos = strpos($id, '/')) !== false) {
            $bookId = substr($id, 0, $pos);
            $subPath = substr($id, $pos + 1);
        }

        // 2026-08-06: Debug — log what we received
        error_log("[LibraryServe] id=$id bookId=$bookId subPath=" . ($subPath ?: 'none'));

        $row = Yii::$app->db->createCommand('SELECT * FROM books WHERE id = :id', [':id' => $bookId])->queryOne();
        if ($row === false || empty($row['file_url'])) {
            // 2026-08-06: If no book found and there's a sub-path, the route may not have <id:path>
            // Return CORS-friendly 404 so the browser console shows the real issue
            Yii::$app->response->statusCode = 404;
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Book not found', 'received_id' => $id, 'hint' => 'If you see META-INF as the id, the <id:path> route is not deployed']);
            return;
        }

        $filePath = Yii::getAlias('@webroot') . $row['file_url'];
        if (!file_exists($filePath)) {
            Yii::$app->response->statusCode = 404;
            echo json_encode(['error' => 'File not found on disk', 'path' => $filePath]);
            return;
        }

        $ext = $row['file_type'] ?: strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mimeMap = [
            'pdf' => 'application/pdf',
            'epub' => 'application/epub+zip',
            'html' => 'text/html',
            'htm' => 'text/html',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
        ];

        // EPUB sub-path: extract file from inside the .epub zip archive
        if ($subPath && $ext === 'epub' && class_exists('ZipArchive')) {
            $zip = new \ZipArchive();
            if ($zip->open($filePath) === true) {
                $subPath = urldecode($subPath);
                error_log("[LibraryServe] EPUB sub-path lookup: $subPath");
                $name = $zip->locateName($subPath);
                if ($name === false) {
                    // List first 10 entries to help debug
                    $entries = [];
                    for ($i = 0; $i < min(10, $zip->numFiles); $i++) {
                        $entries[] = $zip->getNameIndex($i);
                    }
                    $zip->close();
                    Yii::$app->response->statusCode = 404;
                    header('Content-Type: application/json');
                    echo json_encode(['error' => 'File not found in EPUB', 'requested' => $subPath, 'sample_entries' => $entries]);
                    return;
                }
                $content = $zip->getFromName($subPath);
                $zip->close();

                $subExt = strtolower(pathinfo($subPath, PATHINFO_EXTENSION));
                $subMime = $mimeMap[$subExt] ?? 'application/octet-stream';

                // 2026-08-06: Bypass Yii response component entirely — native PHP output
                header_remove('X-Powered-By');
                header('Content-Type: ' . $subMime);
                header('Content-Length: ' . strlen($content));
                header('Cache-Control: public, max-age=3600');
                echo $content;
                exit;
                return;
            }
        }

        $contentType = $mimeMap[$ext] ?? 'application/octet-stream';

        // 2026-08-06: Bypass Yii response component entirely — native PHP file output
        header_remove('X-Powered-By');
        header('Content-Type: ' . $contentType);
        header('Content-Disposition: inline');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=3600');
        readfile($filePath);
        exit;
    }

    // ── File Download (authenticated users, triggers browser download) ──
    public function actionDownload(string $id): void
    {
        $this->user();

        $row = Yii::$app->db->createCommand('SELECT * FROM books WHERE id = :id', [':id' => $id])->queryOne();
        if ($row === false || empty($row['file_url'])) {
            Yii::$app->response->statusCode = 404;
            echo 'Book or file not found';
            return;
        }

        $filePath = Yii::getAlias('@webroot') . $row['file_url'];
        if (!file_exists($filePath)) {
            Yii::$app->response->statusCode = 404;
            echo 'File not found on disk';
            return;
        }

        $ext = $row['file_type'] ?: strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $title = $row['title_en'] ?: $row['title_bn'];
        $safeTitle = preg_replace('/[^a-zA-Z0-9_-]/', '_', $title);
        $filename = $safeTitle . '.' . $ext;

        $mimeMap = [
            'pdf' => 'application/pdf',
            'epub' => 'application/epub+zip',
            'html' => 'text/html',
            'htm' => 'text/html',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
        ];
        $contentType = $mimeMap[$ext] ?? 'application/octet-stream';

        $response = Yii::$app->response;
        $response->statusCode = 200;
        $response->headers->set('Content-Type', $contentType);
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
        $response->headers->set('Content-Length', (string) filesize($filePath));
        $response->content = file_get_contents($filePath);
    }

    // ── Helpers ──────────────────────────────────────────────────
    private function bookFields(array $b): array
    {
        return [
            'title_bn' => (string) ($b['title_bn'] ?? ''),
            'title_en' => (string) ($b['title_en'] ?? ''),
            'author_bn' => (string) ($b['author_bn'] ?? ''),
            'author_en' => (string) ($b['author_en'] ?? ''),
            'category' => (string) ($b['category'] ?? ''),
            'description' => (string) ($b['description'] ?? ''),
            'cover_image' => (string) ($b['cover_image'] ?? ''),
            'pdf_url' => (string) ($b['pdf_url'] ?? ''),
            'file_url' => (string) ($b['file_url'] ?? ''),
            'file_type' => (string) ($b['file_type'] ?? ''),
            'file_size' => (int) ($b['file_size'] ?? 0),
            'is_published' => ($b['is_published'] ?? true) ? 1 : 0,
            'is_featured' => ($b['is_featured'] ?? false) ? 1 : 0,
            'sort_order' => (int) ($b['sort_order'] ?? 0),
        ];
    }

    private function bookDoc(array $r): array
    {
        $r['is_published'] = (bool) $r['is_published'];
        $r['is_featured'] = (bool) $r['is_featured'];
        return $r;
    }
}
