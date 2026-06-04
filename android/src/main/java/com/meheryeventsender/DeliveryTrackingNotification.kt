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
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.DrawableCompat
import org.json.JSONArray

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
            val milestoneLabels = parseMilestoneLabels(data["milestone_labels"] ?: data["milestoneLabels"])

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
                milestoneLabels = milestoneLabels,
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

    private fun parseMilestoneLabels(raw: String?): List<String> {
        val defaults = listOf("Placed", "Preparing", "On the way", "Delivered")
        if (raw.isNullOrBlank()) return defaults
        return try {
            val arr = JSONArray(raw.trim())
            (0 until arr.length()).map { arr.getString(it) }.ifEmpty { defaults }
        } catch (_: Exception) {
            raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }.ifEmpty { defaults }
        }
    }

    fun createMilestoneIconsBitmap(
        context: Context,
        widthPx: Int,
        step: Int,
        total: Int,
        labels: List<String>,
        activeColor: Int,
        inactiveColor: Int,
        labelColor: Int
    ): Bitmap {
        val iconResIds = listOf(
            R.drawable.ic_milestone_placed,
            R.drawable.ic_milestone_preparing,
            R.drawable.ic_milestone_delivery,
            R.drawable.ic_milestone_home
        )
        val safeTotal = total.coerceAtLeast(1)
        val safeStep = step.coerceIn(0, safeTotal)
        val heightPx = (context.resources.displayMetrics.density * 44).toInt().coerceAtLeast(44)
        val bitmap = Bitmap.createBitmap(widthPx.coerceAtLeast(1), heightPx, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val iconSize = (heightPx * 0.42f).coerceAtLeast(18f)
        val circleRadius = iconSize * 0.72f
        val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = labelColor
            textSize = (heightPx * 0.18f).coerceAtLeast(9f)
            textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
        }
        val slotWidth = widthPx.toFloat() / safeTotal

        for (index in 0 until safeTotal) {
            val centerX = slotWidth * index + slotWidth / 2f
            val circleY = circleRadius + 4f
            val isActive = index < safeStep
            paint.color = if (isActive) activeColor else inactiveColor
            canvas.drawCircle(centerX, circleY, circleRadius, paint)

            val iconRes = iconResIds.getOrElse(index) { iconResIds.last() }
            val drawable: Drawable? = ContextCompat.getDrawable(context, iconRes)
            if (drawable != null) {
                val tinted = DrawableCompat.wrap(drawable.mutate())
                DrawableCompat.setTint(tinted, if (isActive) Color.WHITE else Color.argb(180, 255, 255, 255))
                val left = (centerX - iconSize / 2f).toInt()
                val top = (circleY - iconSize / 2f).toInt()
                tinted.setBounds(left, top, left + iconSize.toInt(), top + iconSize.toInt())
                tinted.draw(canvas)
            }

            if (index < safeTotal - 1) {
                val lineY = circleY
                val lineStart = centerX + circleRadius + 4f
                val nextCenterX = slotWidth * (index + 1) + slotWidth / 2f
                val lineEnd = nextCenterX - circleRadius - 4f
                paint.strokeWidth = 2f
                paint.style = Paint.Style.STROKE
                paint.color = if (index < safeStep - 1) activeColor else inactiveColor
                canvas.drawLine(lineStart, lineY, lineEnd, lineY, paint)
                paint.style = Paint.Style.FILL
            }

            val label = labels.getOrElse(index) { "" }
            if (label.isNotEmpty()) {
                canvas.drawText(label, centerX, heightPx - 4f, labelPaint)
            }
        }
        return bitmap
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
