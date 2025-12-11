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
                imageUrl = data["imageUrl"] ?: "",
                bg_color_gradient = data["bg_color_gradient"] ?: "",
                bg_color_gradient_dir = data["bg_color_gradient_dir"] ?: "",
                align = data["align"] ?: "",
                notificationId = notificationId
            )

            Log.d("LiveActivityUtils", "Notifying with ID: $notificationId")
            notificationManager.notify(notificationId, notification.build())

        } catch (e: Exception) {
            Log.e("LiveActivityUtils", "Live activity error: ${e.message}", e)
        }
    }
}