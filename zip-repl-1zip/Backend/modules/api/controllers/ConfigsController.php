<?php

declare(strict_types=1);

namespace app\modules\api\controllers;

use Yii;

/**
 * /api/configs/{name} — single-document config resource.
 * Sensitive configs (firebase, security, payment_gateways, ads) require admin for GET.
 *
 * 2026-08-10: Added platform-aware ads config with separate web/app publisher IDs.
 * When `ads` config is saved by admin, syncs client-safe subset to `ads-web` config.
 */
class ConfigsController extends ApiController
{
    private const SENSITIVE = ['firebase', 'security', 'payment_gateways', 'ads'];
    // 'ads-web' is intentionally NOT in SENSITIVE — frontend fetches it publicly

    /** GET (view) / PUT (update) /api/configs/{name} */
    public function actionView(string $name): \yii\web\Response
    {
        $request = Yii::$app->request;
        if ($request->isPut || $request->isPatch) {
            $this->requireAdmin();
            $body = $request->post();
            $data = is_array($body) ? $body : [];
            $this->writeConfig($name, $data);

            // Sync firebase → firebase-web when admin saves Firebase config
            if ($name === 'firebase') {
                $this->syncFirebaseWeb($data);
            }

            // When saving `ads`, sync platform-specific publisher IDs to ads-web
            if ($name === 'ads') {
                $this->syncAdsWeb($data);
            }

            return $this->json($data);
        }

        if (in_array($name, self::SENSITIVE, true)) {
            $this->requireAdmin();
        }

        // For `ads-web` config, return the public client-safe view (no admin auth)
        if ($name === 'ads-web') {
            return $this->json($this->adsClientView());
        }

        // For `ads` config, return a merged client-safe view
        if ($name === 'ads') {
            return $this->json($this->adsClientView());
        }

        return $this->json($this->configValue($name));
    }

    /**
     * When admin saves the `firebase` config, extract client-safe keys
     * and write them to the `firebase-web` config so the frontend and
     * service worker can fetch them without admin auth.
     */
    private function syncFirebaseWeb(array $firebaseData): void
    {
        $clientSafe = [
            'api_key'             => $firebaseData['api_key'] ?? '',
            'auth_domain'         => $firebaseData['auth_domain'] ?? '',
            'project_id'          => $firebaseData['project_id'] ?? '',
            'storage_bucket'      => $firebaseData['storage_bucket'] ?? '',
            'messaging_sender_id' => $firebaseData['messaging_sender_id'] ?? '',
            'app_id'              => $firebaseData['app_id'] ?? '',
            'vapid_key'           => $firebaseData['vapid_key'] ?? '',
        ];

        // Only write if there's actual content (avoid overwriting with empty)
        $hasContent = false;
        foreach ($clientSafe as $v) {
            if ($v !== '') {
                $hasContent = true;
                break;
            }
        }

        if ($hasContent) {
            $this->writeConfig('firebase-web', $clientSafe);
        }
    }

    /**
     * When admin saves the `ads` config, extract client-safe keys
     * and write them to the `ads-web` config so the frontend can
     * fetch platform-specific publisher IDs without admin auth.
     */
    private function syncAdsWeb(array $adsData): void
    {
        $clientSafe = [
            'publisher_web' => $adsData['publisher_web'] ?? '',
            'publisher_app' => $adsData['publisher_app'] ?? '',
            'enabled_web'   => (bool) ($adsData['enabled_web'] ?? false),
            'enabled_app'   => (bool) ($adsData['enabled_app'] ?? false),
            'slots'         => $adsData['slots'] ?? [],
        ];

        // Only write if there's actual content
        $hasContent = !empty($clientSafe['publisher_web'])
                   || !empty($clientSafe['publisher_app'])
                   || !empty($clientSafe['slots']);

        if ($hasContent) {
            $this->writeConfig('ads-web', $clientSafe);
        }
    }

    /**
     * Return a merged ads view combining `ads` (admin) and `ads-web` (client) configs.
     * Frontend calls GET /api/configs/ads and gets the platform-aware result.
     */
    private function adsClientView(): array
    {
        $admin = $this->configValue('ads') ?? [];
        $web   = $this->configValue('ads-web') ?? [];

        // Resolve publisher ID: web platform uses publisher_web, fallback to legacy flat key
        $publisherWeb = $web['publisher_web'] ?? $admin['publisher_web'] ?? $admin['adsense_publisher_id'] ?? '';
        $enabledWeb   = $web['enabled_web']   ?? $admin['enabled_web']   ?? $admin['ads_enabled'] ?? false;

        return [
            // New nested structure
            'publisher_web' => $publisherWeb,
            'publisher_app' => $web['publisher_app'] ?? $admin['publisher_app'] ?? '',
            'enabled_web'   => $enabledWeb,
            'enabled_app'   => $web['enabled_app']   ?? $admin['enabled_app']   ?? false,
            'slots'         => $web['slots']         ?? $admin['slots']         ?? [],
            // Flat keys that frontend AdsContext reads
            'adsense_publisher_id' => $publisherWeb,
            'ads_enabled'          => $enabledWeb,
            // Per-slot enabled flags (flat keys)
            'ad_slot_header_enabled'          => $admin['ad_slot_header_enabled']          ?? true,
            'ad_slot_in_content_enabled'      => $admin['ad_slot_in_content_enabled']      ?? true,
            'ad_slot_footer_enabled'          => $admin['ad_slot_footer_enabled']          ?? true,
            'ad_slot_sidebar_enabled'         => $admin['ad_slot_sidebar_enabled']         ?? true,
            'ad_slot_shop_enabled'            => $admin['ad_slot_shop_enabled']            ?? true,
            'ad_slot_courses_enabled'         => $admin['ad_slot_courses_enabled']         ?? true,
            'ad_slot_videos_enabled'          => $admin['ad_slot_videos_enabled']          ?? true,
            'ad_slot_home_enabled'            => $admin['ad_slot_home_enabled']            ?? true,
            'ad_slot_payment_form_enabled'    => $admin['ad_slot_payment_form_enabled']    ?? true,
            'ad_slot_payment_success_enabled' => $admin['ad_slot_payment_success_enabled'] ?? true,
            'ad_slot_quiz_result_enabled'     => $admin['ad_slot_quiz_result_enabled']     ?? true,
            'ad_slot_post_bottom_enabled'     => $admin['ad_slot_post_bottom_enabled']     ?? true,
            'ad_slot_lesson_between_enabled'  => $admin['ad_slot_lesson_between_enabled']  ?? true,
            'ad_slot_quiz_interstitial_enabled' => $admin['ad_slot_quiz_interstitial_enabled'] ?? true,
            'ad_slot_reward_zone_enabled'     => $admin['ad_slot_reward_zone_enabled']     ?? true,
            // Per-slot ad unit IDs (flat keys)
            'ad_unit_header'          => $admin['ad_unit_header']          ?? '',
            'ad_unit_in_content'      => $admin['ad_unit_in_content']      ?? '',
            'ad_unit_footer'          => $admin['ad_unit_footer']          ?? '',
            'ad_unit_sidebar'         => $admin['ad_unit_sidebar']         ?? '',
            'ad_unit_shop'            => $admin['ad_unit_shop']            ?? '',
            'ad_unit_courses'         => $admin['ad_unit_courses']         ?? '',
            'ad_unit_videos'          => $admin['ad_unit_videos']          ?? '',
            'ad_unit_home'            => $admin['ad_unit_home']            ?? '',
            'ad_unit_payment_form'    => $admin['ad_unit_payment_form']    ?? '',
            'ad_unit_payment_success' => $admin['ad_unit_payment_success'] ?? '',
            'ad_unit_quiz_result'     => $admin['ad_unit_quiz_result']     ?? '',
            'ad_unit_post_bottom'     => $admin['ad_unit_post_bottom']     ?? '',
            'ad_unit_lesson_between'  => $admin['ad_unit_lesson_between']  ?? '',
            'ad_unit_quiz_interstitial' => $admin['ad_unit_quiz_interstitial'] ?? '',
            'ad_unit_reward_zone'     => $admin['ad_unit_reward_zone']     ?? '',
            // Bottom banner ad units (Phase 1-3)
            'ad_unit_shop_bottom'         => $admin['ad_unit_shop_bottom']         ?? '',
            'ad_unit_courses_bottom'      => $admin['ad_unit_courses_bottom']      ?? '',
            'ad_unit_my_courses_bottom'   => $admin['ad_unit_my_courses_bottom']   ?? '',
            'ad_unit_live_classes_bottom' => $admin['ad_unit_live_classes_bottom'] ?? '',
            'ad_unit_videos_bottom'       => $admin['ad_unit_videos_bottom']       ?? '',
            'ad_unit_quiz_bottom'         => $admin['ad_unit_quiz_bottom']         ?? '',
            'ad_unit_reward_zone_bottom'  => $admin['ad_unit_reward_zone_bottom']  ?? '',
            'ad_unit_contact_bottom'      => $admin['ad_unit_contact_bottom']      ?? '',
            'ad_unit_notifications_bottom'=> $admin['ad_unit_notifications_bottom']?? '',
            'ad_unit_complaints_bottom'   => $admin['ad_unit_complaints_bottom']   ?? '',
            'ad_unit_home_bottom'         => $admin['ad_unit_home_bottom']         ?? '',
            'ad_unit_library'             => $admin['ad_unit_library']             ?? '',
            // Library slot enabled flag
            'ad_slot_library_enabled'     => $admin['ad_slot_library_enabled']     ?? true,
        ];
    }
}
