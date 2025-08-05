package com.meheryeventsender
import com.meheryeventsender.CustomNotificationService

import com.meheryeventsender.R

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import androidx.core.app.NotificationCompat

class MyFirebaseMessagingService : FirebaseMessagingService() {
  private val TAG = "MyFirebaseMessagingService"
override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")

        // Check if message contains a data payload
        if (remoteMessage.data.isNotEmpty()) {
            Log.d(TAG, "Message data payload: ${remoteMessage.data}")

            try {
                // Check if this is a live activity notification
                if (remoteMessage.data.containsKey("message1") &&
                    remoteMessage.data.containsKey("message2") &&
                    remoteMessage.data.containsKey("message3")) {

                    handleLiveActivityNotification(remoteMessage.data)
                } else {
                    val title = remoteMessage.data["title"] ?: "Notification"
                    val message = remoteMessage.data["body"] ?: "You have a new message"
                    val title1 = remoteMessage.data["title1"]
                    val url1 = remoteMessage.data["url1"]
                    val title2 = remoteMessage.data["title2"]
                    val url2 = remoteMessage.data["url2"]

                    val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    val channelId = "default_channel_id"
                    val channelName = "Default Channel"

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_HIGH)
                        notificationManager.createNotificationChannel(channel)
                    }



                    val builder = NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(message)
                        .setAutoCancel(true)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)

                    if (!title1.isNullOrBlank() && !url1.isNullOrBlank()) {
                        val intent1 = createUrlIntent(this, url1)
                        builder.addAction(0, title1, intent1)
                    }
                    if (!title2.isNullOrBlank() && !url2.isNullOrBlank()) {
                        val intent2 = createUrlIntent(this, url2)
                        builder.addAction(0, title2, intent2)
                    }

                    notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())


                }
            } catch (e: Exception) {
                Log.e(TAG, "Error handling FCM message", e)
            }
        }
    }
    private fun createUrlIntent(context: Context, url: String): PendingIntent {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            data = android.net.Uri.parse(url)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        return PendingIntent.getActivity(
            context,
            url.hashCode(), // unique requestCode
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun handleLiveActivityNotification(data: Map<String, String>) {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            // ✅ Create the "live_activity_channel" if not already created
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

            val customService = CustomNotificationService(this)

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
            println("NotifID 2")
            println(notificationId)
            notificationManager.notify(notificationId, notification.build())

        } catch (e: Exception) {
            Log.e("MySdk", "Live activity error: ${e.message}", e)
        }
    }
}

