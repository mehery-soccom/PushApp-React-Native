package com.meheryeventsender

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
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

    private fun getTrackBaseUrl(data: Map<String, String>): String {
        val explicit = data["track_base_url"]?.trim().orEmpty()
        if (explicit.isNotEmpty()) return explicit
        val apiBase = data["api_base_url"]?.trim().orEmpty()
        return apiBase
    }

    private fun buildActionReceiverIntent(
        data: Map<String, String>,
        eventName: String,
        targetUrl: String? = null,
        ctaId: String? = null
    ): Intent {
        return Intent(this, NotificationActionReceiver::class.java).apply {
            putExtra(NotificationActionReceiver.EXTRA_ACTION_TYPE, eventName)
            putExtra(NotificationActionReceiver.EXTRA_TARGET_URL, targetUrl.orEmpty())
            putExtra(NotificationActionReceiver.EXTRA_TRACK_BASE_URL, getTrackBaseUrl(data))
            putExtra(NotificationActionReceiver.EXTRA_MESSAGE_ID, data["messageId"].orEmpty())
            putExtra(NotificationActionReceiver.EXTRA_FILTER_ID, data["filterId"].orEmpty())
            putExtra(
                NotificationActionReceiver.EXTRA_NOTIFICATION_ID,
                data["notification_id"].orEmpty()
            )
            putExtra(NotificationActionReceiver.EXTRA_CTA_ID, ctaId.orEmpty())
        }
    }

    private fun createUrlIntent(data: Map<String, String>, title: String, url: String): PendingIntent {
        val intent = buildActionReceiverIntent(
            data = data,
            eventName = "cta",
            targetUrl = url,
            ctaId = title
        )
        return PendingIntent.getBroadcast(
            this,
            (title + url).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun buildOpenIntent(data: Map<String, String>): PendingIntent {
        val intent = buildActionReceiverIntent(
            data = data,
            eventName = "opened",
            targetUrl = null,
            ctaId = null
        )
        return PendingIntent.getBroadcast(
            this,
            ("open_" + (data["notification_id"] ?: System.currentTimeMillis().toString())).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
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
            .setContentIntent(buildOpenIntent(data))

        appendCtaActions(builder, data)

        notificationManager.notify(System.currentTimeMillis().toInt(), builder.build())
    }

    private fun appendCtaActions(builder: NotificationCompat.Builder, data: Map<String, String>) {
        val title1 = data["title1"]
        val url1 = data["url1"]
        val title2 = data["title2"]
        val url2 = data["url2"]
        if (!title1.isNullOrBlank() && !url1.isNullOrBlank()) {
            builder.addAction(0, title1, createUrlIntent(data, title1, url1))
        }
        if (!title2.isNullOrBlank() && !url2.isNullOrBlank()) {
            builder.addAction(0, title2, createUrlIntent(data, title2, url2))
        }
    }

    private fun decorateWithOpenTrackingIntent(
        builder: NotificationCompat.Builder,
        data: Map<String, String>
    ) {
        builder.setContentIntent(buildOpenIntent(data))
    }

    private fun sendReceivedTracking(data: Map<String, String>) {
        val trackBase = getTrackBaseUrl(data)
        if (trackBase.isBlank()) return
        val intent = buildActionReceiverIntent(
            data = data,
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
                progress = progressInt
            )

            decorateWithOpenTrackingIntent(notification, data)
            appendCtaActions(notification, data)
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


        )
        decorateWithOpenTrackingIntent(builder, data)
        appendCtaActions(builder, data)
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
        appendCtaActions(builder, data)

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
