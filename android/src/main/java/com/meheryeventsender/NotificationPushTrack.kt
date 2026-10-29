package com.meheryeventsender

import android.content.Context
import android.net.Uri
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/** Shared push tracking + URL normalization for notification actions. */
object NotificationPushTrack {
    private const val TAG = "NotificationPushTrack"

    fun normalizeTargetUrl(raw: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return trimmed
        val parsed = Uri.parse(trimmed)
        return if (!parsed.scheme.isNullOrBlank()) trimmed else "https://$trimmed"
    }

    fun sendPushTrackEvent(
        context: Context,
        baseUrl: String,
        actionType: String,
        messageId: String,
        filterId: String,
        notificationId: String,
        ctaLabel: String,
        trackToken: String = "",
        buttonId: String = "",
        contactIdOverride: String = ""
    ) {
        if (trackToken.isBlank()) {
            Log.w(
                TAG,
                "Push track skipped: missing click token (t / click_token). " +
                    "actionType=${actionType.ifBlank { "opened" }}"
            )
            return
        }

        val contactId = MeheryPushTrackPrefs.resolveContactId(
            context,
            intentContactId = contactIdOverride
        )
        val profileId = MeheryPushTrackPrefs.getProfileId(context)
        val sessionId = MeheryPushTrackPrefs.getSessionId(context)
        if (contactId.isBlank()) {
            Log.w(
                TAG,
                "Push track contact_id missing (prefs empty / not synced from JS). " +
                    "actionType=${actionType.ifBlank { "opened" }}"
            )
        }

        Thread {
            val endpoint = baseUrl.trimEnd('/') + "/v1/notification/push/track"
            var conn: HttpURLConnection? = null
            try {
                conn = URL(endpoint).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")

                val payload = JSONObject()
                val event = actionType.ifBlank { "opened" }
                payload.put("event", event)
                payload.put("t", trackToken)
                if (messageId.isNotBlank()) payload.put("messageId", messageId)
                if (filterId.isNotBlank()) payload.put("filterId", filterId)
                if (notificationId.isNotBlank()) payload.put("notificationId", notificationId)
                if (contactId.isNotBlank()) payload.put("contact_id", contactId)
                if (profileId.isNotBlank()) payload.put("p_id", profileId)
                if (sessionId.isNotBlank()) payload.put("session_id", sessionId)
                if (event == "cta" && (ctaLabel.isNotBlank() || buttonId.isNotBlank())) {
                    val data = JSONObject()
                    data.put("ctaId", ctaLabel)
                    data.put("button_id", buttonId)
                    payload.put("data", data)
                    if (ctaLabel.isNotBlank()) {
                        payload.put("ctaId", ctaLabel)
                    }
                }

                Log.i(TAG, "Push track click POST body: $payload")

                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(Charsets.UTF_8))
                }
                val code = conn.responseCode
                if (code in 200..299) {
                    Log.i(
                        TAG,
                        "Push track OK HTTP $code event=$event hasContactId=${contactId.isNotBlank()} endpoint=$endpoint"
                    )
                } else {
                    val errBody = try {
                        conn.errorStream?.use { it.readBytes() }?.toString(Charsets.UTF_8)?.take(500)
                    } catch (_: Exception) {
                        null
                    }
                    Log.w(
                        TAG,
                        "Push track HTTP $code endpoint=$endpoint body=${payload} errBody=$errBody"
                    )
                }
            } catch (err: Exception) {
                Log.w(TAG, "Push track call failed endpoint=$endpoint", err)
            } finally {
                conn?.disconnect()
            }
        }.start()
    }
}
