package com.meheryeventsender

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** RN bridge: cache API base URL / contact_id for background push track when FCM has no host. */
class MeheryPushTrackModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "MeheryPushTrack"

    @ReactMethod
    fun setApiBaseUrl(url: String) {
        MeheryPushTrackPrefs.setApiBaseUrl(reactContext, url)
    }

    @ReactMethod
    fun setContactId(contactId: String) {
        MeheryPushTrackPrefs.setContactId(reactContext, contactId)
    }

    @ReactMethod
    fun setUserId(userId: String) {
        MeheryPushTrackPrefs.setUserId(reactContext, userId)
    }

    @ReactMethod
    fun setDeviceId(deviceId: String) {
        MeheryPushTrackPrefs.setDeviceId(reactContext, deviceId)
    }

    @ReactMethod
    fun setProfileId(profileId: String) {
        MeheryPushTrackPrefs.setProfileId(reactContext, profileId)
    }

    @ReactMethod
    fun setSessionId(sessionId: String) {
        MeheryPushTrackPrefs.setSessionId(reactContext, sessionId)
    }

    @ReactMethod
    fun setNotificationLinkRewrite(httpsHost: String, appScheme: String) {
        NotificationLinkConfig.httpsHost = httpsHost
        NotificationLinkConfig.appScheme = appScheme
    }
}
