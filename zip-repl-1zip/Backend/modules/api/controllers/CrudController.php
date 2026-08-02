<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use app\helpers\Json;
use app\helpers\Uuid;
use Yii;

/**
 * Generic list/create/get/update/delete for simple admin-managed resources.
 * FastAPI distinguishes CRUD actions by HTTP method on the same path, so this
 * base dispatches by method inside a single action:
 *
 *   /{resource}        GET  -> list,  POST -> create
 *   /{resource}/{id}   GET  -> view,  PUT  -> update,  DELETE -> delete
 *
 * Concrete controllers set: $table, $fields, $defaults, $jsonFields,
 * $boolFields, $floatFields, $publicRead.
 */
abstract class CrudController extends ApiController
{
    protected string $table;
    protected array $fields = [];
    protected array $defaults = [];
    protected array $jsonFields = [];
    protected array $boolFields = [];
    protected array $floatFields = [];
    protected bool $publicRead = true;

    public function actionIndex(): \yii\web\Response
    {
        if (Yii::$app->request->isPost) {
            return $this->doCreate();
        }
        return $this->doList();
    }

    public function actionView(string $id): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            return $this->doUpdate($id);
        }
        if ($request->isDelete) {
            return $this->doDelete($id);
        }
        return $this->doView($id);
    }

    protected function doList(): \yii\web\Response
    {
        if (!$this->publicRead) {
            $this->requireAdmin();
        }
        $rows = Yii::$app->db->createCommand(
            "SELECT * FROM {$this->table} ORDER BY created_at DESC"
        )->queryAll();
        return $this->json(array_map(fn ($r) => $this->toDoc($r), $rows));
    }

    protected function doView(string $id): \yii\web\Response
    {
        $row = $this->findRow($id);
        if ($row === null) {
            $this->notFound($this->notFoundMsg());
        }
        return $this->json($this->toDoc($row));
    }

    protected function doCreate(): \yii\web\Response
    {
        $this->requireAdmin();
        $body = Yii::$app->request->post();

        $data = $this->buildDoc($body);
        $data['id'] = Uuid::v4();
        $data['created_at'] = $this->now();

        $row = Json::encodeRow($data, $this->jsonFields);
        Yii::$app->db->createCommand()->insert($this->table, $row)->execute();

        return $this->json($this->toDoc($row));
    }

    protected function doUpdate(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        if ($this->findRow($id) === null) {
            $this->notFound($this->notFoundMsg());
        }
        $body = Yii::$app->request->post();

        $data = $this->buildDoc($body);
        $data['updated_at'] = $this->now();

        $row = Json::encodeRow($data, $this->jsonFields);
        Yii::$app->db->createCommand()->update($this->table, $row, ['id' => $id])->execute();

        return $this->json($this->toDoc($this->findRow($id)));
    }

    protected function doDelete(string $id): \yii\web\Response
    {
        $this->requireAdmin();
        Yii::$app->db->createCommand()->delete($this->table, ['id' => $id])->execute();
        return $this->json(['ok' => true]);
    }

    /** Merge submitted body with defaults (Pydantic semantics: missing -> default). */
    protected function buildDoc(array $body): array
    {
        $data = $this->defaults;
        foreach ($this->fields as $f) {
            if (array_key_exists($f, $body)) {
                $data[$f] = $body[$f];
            }
        }
        foreach ($this->jsonFields as $c) {
            if (!array_key_exists($c, $data)) {
                $data[$c] = null;
            }
        }
        $this->postProcess($data);
        return $data;
    }

    /** Hook for per-resource normalization. */
    protected function postProcess(array &$data): void
    {
    }

    protected function findRow(string $id): ?array
    {
        $row = Yii::$app->db->createCommand(
            "SELECT * FROM {$this->table} WHERE id = :id",
            [':id' => $id]
        )->queryOne();
        return $row === false ? null : $row;
    }

    protected function toDoc(array $row): array
    {
        return Json::row($row, $this->jsonFields, $this->boolFields, $this->floatFields);
    }

    protected function notFoundMsg(): string
    {
        return 'Not Found';
    }
}
