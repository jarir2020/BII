<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Uuid;
use Yii;

/**
 * /api/duas/* and /api/dua-categories/*.
 */
class DuasController extends ApiController
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
                'icon' => (string) ($b['icon'] ?? '🤲'),
                'description' => (string) ($b['description'] ?? ''),
                'sort_order' => (int) ($b['sort_order'] ?? 0),
                'color' => (string) ($b['color'] ?? ''),
            ];
            Yii::$app->db->createCommand()->insert('dua_categories', $doc)->execute();
            return $this->json($doc);
        }
        $rows = Yii::$app->db->createCommand('SELECT * FROM dua_categories ORDER BY sort_order ASC, name_bn ASC')->queryAll();
        return $this->json($rows);
    }

    public function actionCategory(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if (Yii::$app->request->isDelete) {
            Yii::$app->db->createCommand()->delete('dua_categories', ['id' => $id])->execute();
            return $this->json(['ok' => true]);
        }
        $b = Yii::$app->request->post();
        Yii::$app->db->createCommand()->update('dua_categories', [
            'name_bn' => (string) ($b['name_bn'] ?? ''),
            'icon' => (string) ($b['icon'] ?? '🤲'),
            'description' => (string) ($b['description'] ?? ''),
            'sort_order' => (int) ($b['sort_order'] ?? 0),
            'color' => (string) ($b['color'] ?? ''),
        ], ['id' => $id])->execute();
        $row = Yii::$app->db->createCommand('SELECT * FROM dua_categories WHERE id = :id', [':id' => $id])->queryOne();
        return $this->json($row);
    }

    // ── Duas ─────────────────────────────────────────────────────
    public function actionToday(): \yii\web\Response
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM duas WHERE is_today_dua = 1 LIMIT 1')->queryOne();
        if ($row === false) {
            $row = Yii::$app->db->createCommand('SELECT * FROM duas LIMIT 1')->queryOne();
        }
        return $this->json($row === false ? new \stdClass() : $row);
    }

    public function actionPopular(): \yii\web\Response
    {
        $rows = Yii::$app->db->createCommand('SELECT * FROM duas ORDER BY view_count DESC LIMIT 20')->queryAll();
        return $this->json($rows);
    }

    public function actionFavorites(): \yii\web\Response
    {
        $user = $this->user();
        $rows = Yii::$app->db->createCommand(
            'SELECT d.* FROM duas d INNER JOIN dua_favorites f ON f.dua_id = d.id WHERE f.user_id = :u ORDER BY d.title_bn ASC',
            [':u' => $user['id']]
        )->queryAll();
        return $this->json($rows);
    }

    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            return $this->createDua();
        }
        $category = (string) Yii::$app->request->get('category', '');
        $sql = 'SELECT * FROM duas';
        $params = [];
        if ($category !== '' && $category !== 'all') {
            $sql .= ' WHERE category_id = :c';
            $params[':c'] = $category;
        }
        $sql .= ' ORDER BY created_at DESC';
        $rows = Yii::$app->db->createCommand($sql, $params)->queryAll();
        return $this->json($rows);
    }

    public function actionView(string $id): \yii\web\Response
    {
        $row = Yii::$app->db->createCommand('SELECT * FROM duas WHERE id = :id', [':id' => $id])->queryOne();
        if ($row === false) {
            $this->notFound('Dua not found');
        }
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            $b = $request->post();
            if (!empty($b['is_today_dua'])) {
                Yii::$app->db->createCommand()->update('duas', ['is_today_dua' => 0], 'id <> :id', [':id' => $id])->execute();
            }
            Yii::$app->db->createCommand()->update('duas', $this->duaFields($b), ['id' => $id])->execute();
            $row = Yii::$app->db->createCommand('SELECT * FROM duas WHERE id = :id', [':id' => $id])->queryOne();
            return $this->json($row);
        }
        if ($request->isDelete) {
            $this->requireAdmin();
            Yii::$app->db->createCommand()->delete('duas', ['id' => $id])->execute();
            return $this->json(['deleted' => true]);
        }
        return $this->json($row);
    }

    /** POST /api/duas/{id}/view — increments view_count. */
    public function actionViewCount(): \yii\web\Response
    {
        $did = (string) Yii::$app->request->get('did', '');
        Yii::$app->db->createCommand()->update('duas', ['view_count' => new \yii\db\Expression('view_count + 1')], ['id' => $did])->execute();
        $vc = (int) Yii::$app->db->createCommand('SELECT view_count FROM duas WHERE id = :id', [':id' => $did])->queryScalar();
        return $this->json(['ok' => true, 'view_count' => $vc]);
    }

    /** POST (favorite) / DELETE (unfavorite) /api/duas/{id}/favorite */
    public function actionFavorite(): \yii\web\Response
    {
        $user = $this->user();
        $did = (string) Yii::$app->request->get('did', '');
        if (Yii::$app->request->isDelete) {
            Yii::$app->db->createCommand()->delete('dua_favorites', ['user_id' => $user['id'], 'dua_id' => $did])->execute();
            return $this->json(['ok' => true, 'favorite' => false]);
        }
        $this->addFavorite($user['id'], $did);
        return $this->json(['ok' => true, 'favorite' => true]);
    }

    /** GET /api/duas/{id}/is-favorite */
    public function actionIsFavorite(): \yii\web\Response
    {
        $user = $this->user();
        $did = (string) Yii::$app->request->get('did', '');
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM dua_favorites WHERE user_id = :u AND dua_id = :d', [':u' => $user['id'], ':d' => $did]
        )->queryOne();
        return $this->json(['is_favorite' => $exists !== false]);
    }

    private function createDua(): \yii\web\Response
    {
        $this->requireAdmin();
        $b = Yii::$app->request->post();
        if (!empty($b['is_today_dua'])) {
            Yii::$app->db->createCommand()->update('duas', ['is_today_dua' => 0])->execute();
        }
        $doc = array_merge($this->duaFields($b), [
            'id' => Uuid::v4(),
            'view_count' => 0,
            'created_at' => $this->now(),
        ]);
        Yii::$app->db->createCommand()->insert('duas', $doc)->execute();
        return $this->json($doc);
    }

    private function duaFields(array $b): array
    {
        return [
            'title_bn' => (string) ($b['title_bn'] ?? ''),
            'category_id' => (string) ($b['category_id'] ?? ''),
            'arabic_text' => (string) ($b['arabic_text'] ?? ''),
            'transliteration' => (string) ($b['transliteration'] ?? ''),
            'meaning_bn' => (string) ($b['meaning_bn'] ?? ''),
            'when_to_read' => (string) ($b['when_to_read'] ?? ''),
            'fazilat' => (string) ($b['fazilat'] ?? ''),
            'source' => (string) ($b['source'] ?? ''),
            'is_today_dua' => !empty($b['is_today_dua']) ? 1 : 0,
        ];
    }

    private function addFavorite(string $userId, string $duaId): void
    {
        $exists = Yii::$app->db->createCommand(
            'SELECT id FROM dua_favorites WHERE user_id = :u AND dua_id = :d', [':u' => $userId, ':d' => $duaId]
        )->queryOne();
        if ($exists === false) {
            Yii::$app->db->createCommand()->insert('dua_favorites', ['id' => Uuid::v4(), 'user_id' => $userId, 'dua_id' => $duaId])->execute();
        }
    }
}
