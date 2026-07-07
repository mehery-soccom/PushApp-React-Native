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
        ctaLabel: String,
        trackToken: String = "",
        receivedAt: String = "",
        buttonId: String = ""
    ) {
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
                if (event == "received" && receivedAt.isNotBlank()) {
                    payload.put("receivedAt", receivedAt)
                }
                if (trackToken.isNotBlank()) {
                    payload.put("t", trackToken)
                }
                if (messageId.isNotBlank()) payload.put("messageId", messageId)
                if (filterId.isNotBlank()) payload.put("filterId", filterId)
                if (notificationId.isNotBlank()) payload.put("notificationId", notificationId)
                if (event == "cta" && (ctaLabel.isNotBlank() || buttonId.isNotBlank())) {
                    val data = JSONObject()
                    data.put("ctaId", ctaLabel)
                    data.put("button_id", buttonId)
                    payload.put("data", data)
                    if (ctaLabel.isNotBlank()) {
                        payload.put("ctaId", ctaLabel)
                    }
                }

                if (event == "received" && receivedAt.isNotBlank()) {
                    Log.i(
                        TAG,
                        "Push track POST event=received receivedAt=$receivedAt " +
                            "messageId=$messageId notificationId=$notificationId"
                    )
                }

                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(Charsets.UTF_8))
                }
                val code = conn.responseCode
                if (code in 200..299) {
                    Log.i(
                        TAG,
                        "Push track OK HTTP $code event=$event" +
                            if (event == "received" && receivedAt.isNotBlank()) {
                                " receivedAt=$receivedAt"
                            } else {
                                ""
                            } +
                            " endpoint=$endpoint"
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
