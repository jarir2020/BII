<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/library/* — categories + books.
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
    public function actionBooks(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            $this->requireAdmin();
            $b = Yii::$app->request->post();
            $doc = array_merge($this->bookFields($b), ['id' => Uuid::v4(), 'created_at' => $this->now()]);
            Yii::$app->db->createCommand()->insert('books', $doc)->execute();
            return $this->json($doc);
        }

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
        $sql = 'SELECT * FROM books WHERE ' . implode(' AND ', $where) . ' ORDER BY sort_order ASC LIMIT ' . ((int) $limit) . ' OFFSET ' . ((int) $skip);
        $rows = Yii::$app->db->createCommand($sql, $params)->queryAll();
        return $this->json(array_map(fn ($r) => $this->bookDoc($r), $rows));
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
