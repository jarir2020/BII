<?php

declare(strict_types=1);

use yii\db\Migration;

/**
 * Add `platform` column to `reward_ads` for full-screen interstitial ads.
 * Also seed default ad slot config into `configs` table.
 *
 * platform values: 'all', 'web', 'app'
 * Used only for full-screen interstitial ads (payment success, library first-click).
 * Bottom banners use AdSense, controlled by ad_slots config toggles.
 *
 * @see m250802_000005_rewards (original reward_ads creation)
 */
class m250809_000002_add_ad_platform extends Migration
{
    public function safeUp(): void
    {
        // ── Add platform column to reward_ads (nullable, defaults to 'all') ──
        if (!$this->db->getSchema()->hasColumn('reward_ads', 'platform')) {
            $this->addColumn('reward_ads', 'platform', $this->string(16)->notNull()->defaultValue('all'));
            $this->createIndex('idx_ra_platform', 'reward_ads', 'platform');
        }

        // ── Seed default ad slot config into configs table ──
        $defaultSlots = [
            'courses-bottom'          => true,
            'my-courses-bottom'       => true,
            'live-classes-bottom'     => true,
            'videos-bottom'           => true,
            'quiz-bottom'             => true,
            'reward-zone-bottom'      => true,
            'contact-bottom'          => true,
            'shop-bottom'             => true,
            'notifications-bottom'    => true,
            'complaints-bottom'       => true,
            'library-first-click'     => true,
            'payment-success-fullscreen' => true,
        ];

        $existing = $this->db->createCommand('SELECT data FROM configs WHERE key = :k', [':k' => 'ad_slots'])
            ->queryOne();

        if ($existing === false) {
            $this->insert('configs', [
                'key'        => 'ad_slots',
                'data'       => json_encode($defaultSlots, JSON_UNESCAPED_UNICODE),
                'created_at' => date('c'),
                'updated_at' => date('c'),
            ]);
        } else {
            $current = json_decode((string) $existing['data'], true) ?? [];
            $merged  = array_merge($current, $defaultSlots);
            $this->db->createCommand()
                ->update('configs', ['data' => json_encode($merged, JSON_UNESCAPED_UNICODE)], ['key' => 'ad_slots'])
                ->execute();
        }
    }

    public function safeDown(): void
    {
        if ($this->db->getSchema()->hasColumn('reward_ads', 'platform')) {
            $this->dropIndex('idx_ra_platform', 'reward_ads');
            $this->dropColumn('reward_ads', 'platform');
        }
        $this->delete('configs', ['key' => 'ad_slots']);
    }
}
