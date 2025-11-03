package com.meheryeventsender

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.util.Log
import kotlinx.coroutines.*
import java.net.HttpURLConnection
import java.net.URL

object LiveActivityUtils {

    fun handleLiveActivityNotification(context: Context, data: Map<String, String>) {
        try {
            val notificationManager =
                context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val channelId = "live_activity_channel"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channelName = "Live Activity Notifications"
                val channel = NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH
                )
                notificationManager.createNotificationChannel(channel)
            }

            // Run image download & notification creation asynchronously
            GlobalScope.launch(Dispatchers.IO) {
                var bitmap: Bitmap? = null
                val imageUrl = data["imageUrl"]

                try {
                    if (!imageUrl.isNullOrEmpty()) {
                        val connection = URL(imageUrl).openConnection() as HttpURLConnection
                        connection.doInput = true
                        connection.connect()
                        bitmap = BitmapFactory.decodeStream(connection.inputStream)
                        connection.disconnect()
                        Log.d("LiveActivityUtils", "✅ Image loaded successfully")
                    }
                } catch (e: Exception) {
                    Log.e("LiveActivityUtils", "⚠️ Failed to load image: ${e.message}")
                }

                withContext(Dispatchers.Main) {
                    try {
                        val customService = CustomNotificationService(context)

                        val notificationId =
                            (data["activity_id"] ?: "activity_${System.currentTimeMillis()}").hashCode()

                        val notification = customService.createCustomNotification(
                            channelId = channelId,
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
                            notificationId = notificationId,
                            bitmap = bitmap // 👈 pass the loaded bitmap
                        )

                        Log.d("LiveActivityUtils", "📢 Showing Live Activity with ID: $notificationId")
                        notificationManager.notify(notificationId, notification.build())
                    } catch (e: Exception) {
                        Log.e("LiveActivityUtils", "Live activity display error: ${e.message}", e)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("LiveActivityUtils", "Live activity error: ${e.message}", e)
        }
    }
}
