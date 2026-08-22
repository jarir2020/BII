<?php

declare(strict_types=1);

namespace app\helpers;

use Yii;

/**
 * Writes to the existing in-app notifications table.
 *
 * The image column is optional during a rolling deployment so older databases
 * continue to accept notifications until the media migration is applied.
 */
final class NotificationStore
{
    public static function insert(array $notification): array
    {
        $schema = Yii::$app->db->getSchema()->getTableSchema('notifications', true);
        if ($schema !== null && !isset($schema->columns['image_url'])) {
            unset($notification['image_url']);
        }

        Yii::$app->db->createCommand()->insert('notifications', $notification)->execute();
        return $notification;
    }
}
