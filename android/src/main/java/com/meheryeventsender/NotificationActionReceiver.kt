package com.meheryeventsender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionType = intent.getStringExtra(EXTRA_ACTION_TYPE).orEmpty()
        val targetUrl = intent.getStringExtra(EXTRA_TARGET_URL).orEmpty()
        val trackBaseUrl = intent.getStringExtra(EXTRA_TRACK_BASE_URL).orEmpty()
        val messageId = intent.getStringExtra(EXTRA_MESSAGE_ID).orEmpty()
        val filterId = intent.getStringExtra(EXTRA_FILTER_ID).orEmpty()
        val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID).orEmpty()
        val ctaId = intent.getStringExtra(EXTRA_CTA_ID).orEmpty()

        if (trackBaseUrl.isNotBlank()) {
            sendTrackEvent(trackBaseUrl, actionType, messageId, filterId, notificationId, ctaId)
        }

        if (targetUrl.isNotBlank()) {
            try {
                val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(targetUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(openIntent)
            } catch (err: Exception) {
                Log.w(TAG, "Unable to open CTA url: $targetUrl", err)
            }
            return
        }

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            context.startActivity(launchIntent)
        }
    }

    private fun sendTrackEvent(
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
                if (ctaId.isNotBlank()) payload.put("ctaId", ctaId)

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

    companion object {
        private const val TAG = "NotificationActionRcvr"
        const val EXTRA_ACTION_TYPE = "extra_action_type"
        const val EXTRA_TARGET_URL = "extra_target_url"
        const val EXTRA_TRACK_BASE_URL = "extra_track_base_url"
        const val EXTRA_MESSAGE_ID = "extra_message_id"
        const val EXTRA_FILTER_ID = "extra_filter_id"
        const val EXTRA_NOTIFICATION_ID = "extra_notification_id"
        const val EXTRA_CTA_ID = "extra_cta_id"
    }
}
