package com.meheryeventsender

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import android.app.NotificationChannel


object LiveActivityUtils {

    fun handleLiveActivityNotification(context: Context, data: Map<String, String>) {
        try {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channelId = "live_activity_channel"
                val channelName = "Live Activity Notifications"
                val channel = NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }

            val customService = CustomNotificationService(context)

            val notificationId = (data["activity_id"] ?: "activity_${System.currentTimeMillis()}").hashCode()

            val notification = customService.createCustomNotification(
                channelId = "live_activity_channel",
                title = data["message1"] ?: "",
                message = data["message2"] ?: "",
                tapText = data["message3"] ?: "",
                progress = ((data["progressPercent"]?.toDoubleOrNull() ?: 0.0) * 100).toInt(),
                titleColor = data["message1FontColorHex"] ?: "#FF0000",
                messageColor = data["message2FontColorHex"] ?: "#000000",
                tapTextColor = data["message3FontColorHex"] ?: "#CCCCCC",
                progressColor = data["progressColorHex"] ?: "#00FF00",
                backgroundColor = data["backgroundColorHex"] ?: "#FFFFFF",
                imageUrl = NotificationPayloadUtils.resolveSingleImageUrl(data),
                bg_color_gradient = data["bg_color_gradient"] ?: "",
                bg_color_gradient_dir = data["bg_color_gradient_dir"] ?: "",
                align = data["align"] ?: "",
                notificationId = notificationId,
                imageUrls = NotificationPayloadUtils.extractImageList(data)
            )

            Log.d("LiveActivityUtils", "Notifying with ID: $notificationId")
            notificationManager.notify(notificationId, notification.build())

        } catch (e: Exception) {
            Log.e("LiveActivityUtils", "Live activity error: ${e.message}", e)
        }
    }

    fun handleCarouselNotification(context: Context, data: Map<String, String>) {
        try {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val channelId = "rich_media_channel"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    channelId,
                    "Rich Media Notifications",
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }

            val imageList = NotificationPayloadUtils.extractImageList(data)
            if (imageList.isEmpty()) return

            val customService = CustomNotificationService(context)
            val notificationId =
                (data["notification_id"] ?: "carousel_${System.currentTimeMillis()}").hashCode()

            val builder = customService.createCustomNotification(
                channelId = channelId,
                title = data["title"] ?: "Notification",
                message = data["message"] ?: (data["body"] ?: ""),
                tapText = data["tapText"] ?: "",
                titleColor = data["titleColorHex"] ?: "#000000",
                messageColor = data["messageColorHex"] ?: "#000000",
                tapTextColor = data["tapTextColorHex"] ?: "#666666",
                progressColor = data["progressColorHex"] ?: "#00FF00",
                backgroundColor = data["backgroundColorHex"] ?: "#FFFFFF",
                imageUrl = NotificationPayloadUtils.resolveSingleImageUrl(data),
                bg_color_gradient = data["bg_color_gradient"] ?: "",
                bg_color_gradient_dir = data["bg_color_gradient_dir"] ?: "",
                align = data["align"] ?: "",
                notificationId = notificationId,
                imageUrls = imageList,
                showProgress = false,
                isRichMedia = true
            )

            notificationManager.notify(notificationId, builder.build())
        } catch (e: Exception) {
            Log.e("LiveActivityUtils", "Carousel notification error: ${e.message}", e)
        }
    }
}