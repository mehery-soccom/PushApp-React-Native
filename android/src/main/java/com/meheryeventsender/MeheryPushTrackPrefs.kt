package com.meheryeventsender

import android.content.Context

/**
 * Persists the push track API base URL and contact_id from JS so background notification CTAs
 * can POST to …/v1/notification/push/track when FCM [data] omits host fields / contact_id.
 */
object MeheryPushTrackPrefs {
    private const val PREFS = "mehery_event_sender_push_track"
    private const val KEY_API_BASE = "cached_api_base_url"
    private const val KEY_CONTACT_ID = "cached_contact_id"
    private const val KEY_USER_ID = "cached_user_id"
    private const val KEY_DEVICE_ID = "cached_device_id"
    private const val KEY_PROFILE_ID = "cached_p_id"
    private const val KEY_SESSION_ID = "cached_session_id"

    fun getApiBaseUrl(context: Context): String {
        val app = context.applicationContext
        return app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_API_BASE, "").orEmpty().trim()
    }

    fun setApiBaseUrl(context: Context, url: String) {
        val trimmed = url.trim()
        val app = context.applicationContext
        // commit(): background CTA may fire after process death before apply() flushes.
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_API_BASE, trimmed)
            .commit()
    }

    fun getContactId(context: Context): String {
        val app = context.applicationContext
        return app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CONTACT_ID, "").orEmpty().trim()
    }

    fun setContactId(context: Context, contactId: String) {
        val trimmed = contactId.trim()
        val app = context.applicationContext
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_CONTACT_ID, trimmed)
            .commit()
    }

    fun setUserId(context: Context, userId: String) {
        val app = context.applicationContext
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_USER_ID, userId.trim())
            .commit()
    }

    fun setDeviceId(context: Context, deviceId: String) {
        val app = context.applicationContext
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_DEVICE_ID, deviceId.trim())
            .commit()
    }

    fun getProfileId(context: Context): String {
        val app = context.applicationContext
        return app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PROFILE_ID, "").orEmpty().trim()
    }

    fun setProfileId(context: Context, profileId: String) {
        val app = context.applicationContext
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PROFILE_ID, profileId.trim())
            .commit()
    }

    fun getSessionId(context: Context): String {
        val app = context.applicationContext
        return app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_SESSION_ID, "").orEmpty().trim()
    }

    fun setSessionId(context: Context, sessionId: String) {
        val app = context.applicationContext
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_SESSION_ID, sessionId.trim())
            .commit()
    }

    /**
     * Intent extra → FCM data → cached contact_id → synthesize userId_deviceId
     * (same fallback JS getEffectiveContactId uses).
     */
    fun resolveContactId(
        context: Context,
        data: Map<String, String> = emptyMap(),
        intentContactId: String = ""
    ): String {
        val fromIntent = intentContactId.trim()
        if (fromIntent.isNotEmpty()) return fromIntent
        for (k in listOf("contact_id", "contactId")) {
            val v = data[k]?.trim().orEmpty()
            if (v.isNotEmpty()) return v
        }
        val cached = getContactId(context)
        if (cached.isNotEmpty()) return cached

        val prefs = context.applicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val userId = prefs.getString(KEY_USER_ID, "").orEmpty().trim()
        val deviceId = prefs.getString(KEY_DEVICE_ID, "").orEmpty().trim()
        if (userId.isNotEmpty() && deviceId.isNotEmpty()) {
            return "${userId}_${deviceId}"
        }
        return ""
    }
}
