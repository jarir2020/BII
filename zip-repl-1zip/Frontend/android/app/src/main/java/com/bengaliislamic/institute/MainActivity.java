package com.bengaliislamic.institute;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.capacitorjs.plugins.pushnotifications.PushNotifications;

/**
 * Main Capacitor activity.
 *
 * 2026-08-08: Register PushNotifications plugin for native push support.
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PushNotifications.class);
        super.onCreate(savedInstanceState);
    }
}
