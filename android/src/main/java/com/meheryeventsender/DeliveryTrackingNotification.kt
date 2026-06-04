package com.meheryeventsender

import android.app.NotificationManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat

/**
 * Zomato-style stacked delivery tracking notification (Phase 2).
 * Uses merchant header, status, ETA, segmented milestone bar, and hero illustration.
 */
object DeliveryTrackingNotification {

    private const val TAG = "DeliveryTrackingNotif"

    fun shouldUseDeliveryTrackingUi(data: Map<String, String>): Boolean {
        if (data["delivery_ui"]?.equals("v2", ignoreCase = true) == true) return true
        return !data["delivery_state"].isNullOrBlank()
    }

    fun handle(context: Context, data: Map<String, String>) {
        try {
            if (data["action"]?.equals("end", ignoreCase = true) == true) {
                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                val notificationId =
                    (data["activity_id"] ?: "activity_${System.currentTimeMillis()}").hashCode()
                notificationManager.cancel(notificationId)
                Log.d(TAG, "Ended delivery tracking notification id=$notificationId")
                return
            }

            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = android.app.NotificationChannel(
                    "live_activity_channel",
                    "Live Activity Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }

            val customService = CustomNotificationService(context)
            val notificationId =
                (data["activity_id"] ?: "activity_${System.currentTimeMillis()}").hashCode()

            val merchantName = data["merchant_name"] ?: data["message1"] ?: ""
            val statusSubtitle = data["status_subtitle"] ?: data["message2"] ?: ""
            val etaLine = data["eta_line"] ?: data["message3"] ?: ""
            val backgroundColor = data["backgroundColorHex"] ?: "#1A1A1A"
            val progressColor = data["progressColorHex"] ?: "#FFFFFF"
            val titleColor = data["message1FontColorHex"] ?: "#FFFFFF"
            val subtitleColor = data["message2FontColorHex"] ?: "#B0B0B0"
            val etaColor = data["message3FontColorHex"] ?: "#FFFFFF"
            val logoUrl = NotificationPayloadUtils.resolveLiveActivityLogoUrl(data)
            val heroUrl = NotificationPayloadUtils.resolveLiveActivityHeroImageUrl(data)

            val milestoneStep = data["milestone_step"]?.toIntOrNull()
                ?: milestoneStepFromState(data["delivery_state"])
            val milestoneTotal = data["milestone_total"]?.toIntOrNull()?.coerceAtLeast(1) ?: 4

            val notification = customService.createDeliveryTrackingNotification(
                channelId = "live_activity_channel",
                merchantName = merchantName,
                statusSubtitle = statusSubtitle,
                etaLine = etaLine,
                merchantColor = titleColor,
                statusColor = subtitleColor,
                etaColor = etaColor,
                progressColor = progressColor,
                backgroundColor = backgroundColor,
                bg_color_gradient = data["bg_color_gradient"] ?: "",
                bg_color_gradient_dir = data["bg_color_gradient_dir"] ?: "",
                logoUrl = logoUrl,
                heroImageUrl = heroUrl,
                milestoneStep = milestoneStep,
                milestoneTotal = milestoneTotal,
                notificationId = notificationId,
                ctaData = data
            )

            notification.setContentIntent(NotificationCtaUtils.buildOpenPendingIntent(context, data))
            NotificationCtaUtils.appendCtaActions(context, notification, data)

            notificationManager.notify(notificationId, notification.build())
            Log.d(TAG, "Posted delivery tracking notification id=$notificationId step=$milestoneStep")
        } catch (e: Exception) {
            Log.e(TAG, "Delivery tracking notification error: ${e.message}", e)
        }
    }

    private fun milestoneStepFromState(deliveryState: String?): Int {
        return when (deliveryState?.trim()?.lowercase()) {
            "preparing" -> 1
            "on_the_way" -> 2
            "arriving" -> 3
            "arrived", "delivered" -> 4
            else -> 1
        }
    }

    fun createMilestoneBitmap(
        widthPx: Int,
        heightPx: Int,
        step: Int,
        total: Int,
        activeColor: Int,
        inactiveColor: Int
    ): Bitmap {
        val bitmap = Bitmap.createBitmap(widthPx.coerceAtLeast(1), heightPx.coerceAtLeast(1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val safeTotal = total.coerceAtLeast(1)
        val safeStep = step.coerceIn(0, safeTotal)
        val segmentGap = (widthPx * 0.02f).coerceAtLeast(2f)
        val segmentWidth = (widthPx - segmentGap * (safeTotal - 1)) / safeTotal.toFloat()
        val corner = heightPx / 2f

        for (i in 0 until safeTotal) {
            val left = i * (segmentWidth + segmentGap)
            val rect = RectF(left, 0f, left + segmentWidth, heightPx.toFloat())
            paint.color = if (i < safeStep) activeColor else inactiveColor
            canvas.drawRoundRect(rect, corner, corner, paint)
        }
        return bitmap
    }
}
