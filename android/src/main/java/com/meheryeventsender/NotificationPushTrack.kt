package com.meheryeventsender

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
        baseUrl: String,
        actionType: String,
        messageId: String,
        filterId: String,
        notificationId: String,
        ctaId: String
    ) {
        Thread {
            var conn: HttpURLConnection? = null
            try {
                val endpoint = baseUrl.trimEnd('/') + "/v1/notification/push/track"
                conn = URL(endpoint).openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")

                val payload = JSONObject()
                payload.put("event", actionType.ifBlank { "opened" })
                if (messageId.isNotBlank()) payload.put("messageId", messageId)
                if (filterId.isNotBlank()) payload.put("filterId", filterId)
                if (notificationId.isNotBlank()) payload.put("notificationId", notificationId)
                if (ctaId.isNotBlank()) {
                    payload.put("ctaId", ctaId)
                    payload.put("data", JSONObject().put("ctaId", ctaId))
                }

                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(Charsets.UTF_8))
                }
                conn.responseCode
            } catch (err: Exception) {
                Log.w(TAG, "Push track call failed", err)
            } finally {
                conn?.disconnect()
            }
        }.start()
    }
}
