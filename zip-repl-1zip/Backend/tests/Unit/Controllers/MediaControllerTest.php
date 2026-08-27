<?php

declare(strict_types=1);

namespace app\tests\Unit\Controllers;

use Yii;

final class MediaControllerTest extends ApiControllerTestCase
{
    public function testAdminCanListAndDeleteUploadedMedia(): void
    {
        $adminId = $this->createAdminUser('media-admin@example.com');
        $this->authenticateAs($adminId, 'admin');

        $uploads = Yii::getAlias('@webroot') . '/uploads';
        $createdDirectory = !is_dir($uploads);
        if (!is_dir($uploads)) {
            mkdir($uploads, 0775, true);
        }
        $id = '123e4567-e89b-12d3-a456-426614174000';
        $path = $uploads . '/' . $id . '.png';
        file_put_contents($path, 'test-media');

        try {
            $controller = new \app\modules\api\controllers\MediaController('media', Yii::$app, []);
            $items = $controller->actionIndex()->data;
            $match = array_values(array_filter($items, static fn (array $item): bool => $item['id'] === $id));

            $this->assertCount(1, $match);
            $this->assertSame('/api/files/' . $id, $match[0]['url']);

            $this->setMethod('DELETE');
            $this->assertTrue($controller->actionDelete($id)->data['ok']);
            $this->assertFileDoesNotExist($path);
        } finally {
            if (is_file($path)) {
                unlink($path);
            }
            if ($createdDirectory && is_dir($uploads)) {
                rmdir($uploads);
            }
        }
    }
}
