<?php

// 2026-08-08: Kill-switch config — file-based maintenance mode toggle.
// site/off creates the kill file, site/on removes it.

return [
    'env_var'          => 'KILL_SWITCH_ENABLED',
    'file_path'        => dirname(__DIR__) . '/runtime/skills.md',
    'file_enabled_value' => '1',
    'db'               => [
        'connection' => null,
        'table'      => null,
        'column'     => 'enabled',
        'id'         => 1,
    ],
    'view_path'        => dirname(__DIR__) . '/views/maintenance.php',
    'message'          => 'বাঙালি ইসলামিক ইনস্টিটিউট বর্তমানে রক্ষণাবেক্ষণ মোডে আছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।',
    'retry_after'      => 3600,
];
