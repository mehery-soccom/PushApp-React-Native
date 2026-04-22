package com.meheryeventsender

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log

/**
 * Handles notification CTA taps that open a URL.
 *
 * Android 12+ restricts starting activities from a [android.content.BroadcastReceiver] used as a
 * notification trampoline. Using an activity [PendingIntent] is the supported path.
 */
class NotificationCtaUrlActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val urlRaw = intent.getStringExtra(NotificationActionReceiver.EXTRA_TARGET_URL).orEmpty()
        Log.i(
            TAG,
            "CTA button tap: urlRaw=$urlRaw extras=${intent.extras?.keySet()?.joinToString()}"
        )
        val trackBaseUrl =
            intent.getStringExtra(NotificationActionReceiver.EXTRA_TRACK_BASE_URL).orEmpty()
        val actionType =
            intent.getStringExtra(NotificationActionReceiver.EXTRA_ACTION_TYPE).orEmpty()
                .ifBlank { "cta" }
        val messageId = intent.getStringExtra(NotificationActionReceiver.EXTRA_MESSAGE_ID).orEmpty()
        val filterId = intent.getStringExtra(NotificationActionReceiver.EXTRA_FILTER_ID).orEmpty()
        val notificationId =
            intent.getStringExtra(NotificationActionReceiver.EXTRA_NOTIFICATION_ID).orEmpty()
        val ctaId = intent.getStringExtra(NotificationActionReceiver.EXTRA_CTA_ID).orEmpty()

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

        if (urlRaw.isNotBlank()) {
            try {
                val normalized = NotificationPushTrack.normalizeTargetUrl(urlRaw)
                val parsed = Uri.parse(normalized)
                val viewIntent = Intent(Intent.ACTION_VIEW, parsed).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                if (viewIntent.resolveActivity(packageManager) != null) {
                    startActivity(viewIntent)
                } else {
                    Log.w(TAG, "No handler for CTA URL: $normalized")
                    openAppFallback()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to open CTA URL: $urlRaw", e)
                openAppFallback()
            }
        } else {
            openAppFallback()
        }

        finish()
    }

    private fun openAppFallback() {
        val launch = packageManager.getLaunchIntentForPackage(packageName)
        if (launch != null) {
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            startActivity(launch)
        }
    }

    companion object {
        private const val TAG = "NotificationCtaUrlAct"
    }
}
