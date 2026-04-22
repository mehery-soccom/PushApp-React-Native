package com.meheryeventsender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log

class NotificationActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val actionType = intent.getStringExtra(EXTRA_ACTION_TYPE).orEmpty()
        val targetUrl = intent.getStringExtra(EXTRA_TARGET_URL).orEmpty()
        Log.i(
            TAG,
            "notification intent: actionType=$actionType targetUrl=$targetUrl " +
                "extras=${intent.extras?.keySet()?.joinToString()}"
        )
        val trackBaseUrl = intent.getStringExtra(EXTRA_TRACK_BASE_URL).orEmpty()
        val messageId = intent.getStringExtra(EXTRA_MESSAGE_ID).orEmpty()
        val filterId = intent.getStringExtra(EXTRA_FILTER_ID).orEmpty()
        val notificationId = intent.getStringExtra(EXTRA_NOTIFICATION_ID).orEmpty()
        val ctaId = intent.getStringExtra(EXTRA_CTA_ID).orEmpty()

        if (trackBaseUrl.isNotBlank()) {
            NotificationPushTrack.sendPushTrackEvent(
                trackBaseUrl,
                actionType,
                messageId,
                filterId,
                notificationId,
                ctaId
            )
        }

        // Legacy: older PendingIntents may still target this receiver for CTAs.
        // Prefer [NotificationCtaUrlActivity] (see [NotificationCtaUtils.createUrlPendingIntent]).
        if (targetUrl.isNotBlank()) {
            try {
                val normalizedUrl = NotificationPushTrack.normalizeTargetUrl(targetUrl)
                val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse(normalizedUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                if (openIntent.resolveActivity(context.packageManager) != null) {
                    context.startActivity(openIntent)
                } else {
                    Log.w(TAG, "No activity found for CTA url: $normalizedUrl")
                    openApp(context)
                }
            } catch (err: Exception) {
                Log.w(TAG, "Unable to open CTA url: $targetUrl", err)
                openApp(context)
            }
            return
        }

        openApp(context)
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

    private fun openApp(context: Context) {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
            launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            context.startActivity(launchIntent)
        }
    }
}
