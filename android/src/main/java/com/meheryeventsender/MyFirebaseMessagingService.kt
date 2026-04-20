package com.meheryeventsender

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage


class MyFirebaseMessagingService : FirebaseMessagingService() {
    private val TAG = "MyFirebaseMessagingService"

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}")
        val data = remoteMessage.data.toMutableMap()

        // Merge notification payload into data fallback keys for mixed payload compatibility.
        remoteMessage.notification?.title?.let {
            if (data["title"].isNullOrBlank()) data["title"] = it
        }
        remoteMessage.notification?.body?.let {
            if (data["body"].isNullOrBlank()) data["body"] = it
        }
        remoteMessage.notification?.imageUrl?.toString()?.let {
            if (data["image"].isNullOrBlank() && data["imageUrl"].isNullOrBlank() && data["image_url"].isNullOrBlank()) {
                data["image"] = it
            }
        }

        if (data.isEmpty()) return
        Log.d(TAG, "Message data payload: $data")

        // Foreground: RN Firebase delivers to JS `onMessage`, which shows the notification.
        // Posting here too caused duplicates. When only RN runs (no native delivery), skipping
        // here alone would show nothing — so JS must remain the foreground path on Android.
        if (isAppInForeground()) {
            Log.d(TAG, "App in foreground; skip native notify (handled in JS)")
            return
        }

        try {
            if (data.containsKey("message1") && data.containsKey("message2") && data.containsKey("message3")) {
                handleLiveActivityNotification(data)
            } else if (NotificationPayloadUtils.shouldUseBigPictureStyle(data)) {
                handleBigPictureNotification(data)
            } else if (NotificationPayloadUtils.hasAnyImage(data)) {
                handleRichMediaNotification(data)
            } else {
                handleSimpleNotification(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling FCM message", e)
        }
    }

    private fun isAppInForeground(): Boolean {
        return ProcessLifecycleOwner.get().lifecycle.currentState.isAtLeast(
            Lifecycle.State.STARTED
        )
    }

    private fun handleSimpleNotification(data: Map<String, String>) {
        val title = data["title"] ?: "Notification"
        val message = data["body"] ?: "You have a new message"
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
            .setContentIntent(NotificationCtaUtils.buildOpenPendingIntent(this, data))

        NotificationCtaUtils.appendCtaActions(this, builder, data)

        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    private fun decorateWithOpenTrackingIntent(
        builder: NotificationCompat.Builder,
        data: Map<String, String>
    ) {
        builder.setContentIntent(NotificationCtaUtils.buildOpenPendingIntent(this, data))
    }

    private fun sendReceivedTracking(data: Map<String, String>) {
        val trackBase = NotificationCtaUtils.trackBaseUrl(data)
        if (trackBase.isBlank()) return
        val intent = NotificationCtaUtils.intentForPushTrackEvent(
            this,
            data,
            eventName = "received",
            targetUrl = null,
            ctaId = null
        )
        sendBroadcast(intent)
    }

    private fun handleLiveActivityNotification(data: Map<String, String>) {
        try {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    
            // Create channel for live activity
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
    
            // Extract image list from FCM
            val imageList = NotificationPayloadUtils.extractLimitedImageList(data)
    
            val notificationId =
                (data["activity_id"] ?: "activity_${System.currentTimeMillis()}").hashCode()
    
            val progressPercent = data["progressPercent"]?.toDoubleOrNull() ?: 0.0
            val progressInt = (progressPercent * 100).toInt().coerceIn(0, 100)
            val showProgress = !data["progressPercent"].isNullOrBlank()

            val notification = customService.createCustomNotification(
                channelId = "live_activity_channel",
                title = data["message1"] ?: "",
                message = data["message2"] ?: "",
                tapText = data["message3"] ?: "",
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
                imageUrls = imageList,
                showProgress = showProgress,
                progress = progressInt,
                ctaData = data
            )

            decorateWithOpenTrackingIntent(notification, data)
            NotificationCtaUtils.appendCtaActions(this, notification, data)
            notificationManager.notify(notificationId, notification.build())
            sendReceivedTracking(data)
        } catch (e: Exception) {
            Log.e("MySdk", "Live activity error: ${e.message}", e)
        }
    }

    private fun handleRichMediaNotification(data: Map<String, String>) {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    
        val channelId = "rich_media_channel"
    
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Rich Media Notifications",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }
    
        val notificationId =
            (data["notification_id"] ?: System.currentTimeMillis().toString()).hashCode()
    
        val customService = CustomNotificationService(this)
    
        val imageList = NotificationPayloadUtils.extractLimitedImageList(data)
    
        val builder = customService.createCustomNotification(
            channelId = channelId,
            title = data["title"] ?: "Notification",
            message = data["body"] ?: "",
            tapText = data["tapText"] ?: "",
            titleColor = data["titleColorHex"] ?: "#000000",
            messageColor = data["messageColorHex"] ?: "#000000",
            tapTextColor = data["tapTextColorHex"] ?: "#666666",
            backgroundColor = data["backgroundColorHex"] ?: "#FFFFFF",
            imageUrl = NotificationPayloadUtils.resolveSingleImageUrl(data),
            bg_color_gradient = data["bg_color_gradient"] ?: "",
            bg_color_gradient_dir = data["bg_color_gradient_dir"] ?: "",
            align = data["align"] ?: "",
            notificationId = notificationId,
            imageUrls = imageList,
            showProgress = false, // ✅ IMPORTANT
            isRichMedia = true,   // ✅ KEY LINE
            progressColor = data["progressColorHex"] ?: "#00FF00",
            ctaData = data


        )
        decorateWithOpenTrackingIntent(builder, data)
        NotificationCtaUtils.appendCtaActions(this, builder, data)
        notificationManager.notify(notificationId, builder.build())
        sendReceivedTracking(data)
    }

    private fun handleBigPictureNotification(data: Map<String, String>) {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channelId = "default_channel_id"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Default Channel",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val title = data["title"] ?: "Notification"
        val message = data["body"] ?: "You have a new message"
        val imageUrl = NotificationPayloadUtils.resolveSingleImageUrl(data)
        val notificationId =
            (data["notification_id"] ?: System.currentTimeMillis().toString()).hashCode()

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
        decorateWithOpenTrackingIntent(builder, data)
        NotificationCtaUtils.appendCtaActions(this, builder, data)

        if (imageUrl.isNotBlank()) {
            val customService = CustomNotificationService(this)
            customService.downloadImage(imageUrl) { bitmap ->
                val finalBuilder = if (bitmap != null) {
                    builder.setStyle(
                        NotificationCompat.BigPictureStyle()
                            .bigPicture(bitmap)
                            .bigLargeIcon(null as android.graphics.Bitmap?)
                    )
                } else {
                    builder
                }
                notificationManager.notify(notificationId, finalBuilder.build())
                sendReceivedTracking(data)
            }
        } else {
            notificationManager.notify(notificationId, builder.build())
            sendReceivedTracking(data)
        }
    }
}
