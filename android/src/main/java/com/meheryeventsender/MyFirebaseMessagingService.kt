package com.meheryeventsender

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.ProcessLifecycleOwner
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Extends [ReactNativeFirebaseMessagingService] and removes the extra default RNFB service
 * (see [android/src/main/AndroidManifest.xml] tools:node=remove) so a single
 * MESSAGING_EVENT handler runs. The stock RN service had an empty onMessageReceived, which
 * could "win" manifest merge and prevent this class from ever handling data messages in background.
 */
class MyFirebaseMessagingService : ReactNativeFirebaseMessagingService() {
    private val TAG = "MyFirebaseMessagingService"

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Must run first: RN Firebase wires foreground `messaging().onMessage` and related JS
        // delivery through the parent implementation.
        super.onMessageReceived(remoteMessage)
        Log.i(
            TAG,
            "Mehery FCM: onMessageReceived messageId=${remoteMessage.messageId} " +
                "dataKeyCount=${remoteMessage.data.size} " +
                "hasNotificationBlock=${remoteMessage.notification != null}"
        )
        logFcmSnapshot(remoteMessage, phase = "raw")
        val data = remoteMessage.data.toMutableMap()
        if (remoteMessage.notification != null && remoteMessage.data.isEmpty()) {
            Log.w(
                TAG,
                "FCM: notification-only (empty data) — Android often skips onMessageReceived when " +
                    "backgrounded, so this SDK cannot attach image/actions; send a data map (Android " +
                    "data-only or notification+data) for Mehery native handling."
            )
        }

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

        if (data.isEmpty()) {
            Log.w(TAG, "FCM: merged data empty after notification merge; nothing to display")
            return
        }
        logResolvedPayloadAndHandler(data)

        // Foreground: RN Firebase delivers to JS `onMessage`, which shows the notification.
        // Posting here too caused duplicates. When only RN runs (no native delivery), skipping
        // here alone would show nothing — so JS must remain the foreground path on Android.
        if (isAppInForeground()) {
            Log.i(TAG, "App in foreground; skip native notify (handled in JS)")
            return
        }

        try {
            if (data.containsKey("message1") && data.containsKey("message2") && data.containsKey("message3")) {
                Log.i(TAG, "Native handler: live activity (message1/2/3)")
                handleLiveActivityNotification(data)
            } else if (NotificationPayloadUtils.extractImageList(data).size > 1) {
                Log.i(TAG, "Native handler: rich media (multi-image carousel)")
                handleRichMediaNotification(data)
            } else if (
                NotificationPayloadUtils.shouldUseBigPictureStyle(data) ||
                NotificationPayloadUtils.resolveSingleImageUrl(data).isNotBlank()
            ) {
                val reason =
                    if (NotificationPayloadUtils.shouldUseBigPictureStyle(data)) "standard"
                    else "single image fallback (template keys present)"
                Log.i(TAG, "Native handler: big picture ($reason)")
                handleBigPictureNotification(data)
            } else if (NotificationPayloadUtils.hasAnyImage(data)) {
                Log.i(TAG, "Native handler: rich media / custom layout (image list without single URL)")
                handleRichMediaNotification(data)
            } else {
                Log.i(TAG, "Native handler: simple (no image in data)")
                handleSimpleNotification(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling FCM message", e)
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Confirms the merged manifest uses this service class (token refresh path).
        Log.i(TAG, "Mehery FCM: onNewToken (service active, token length=${token.length})")
    }

    /** See README: `adb logcat -s MyFirebaseMessagingService:I` (zsh: quote *:S if using the silence-all form). */
    private fun logFcmSnapshot(remoteMessage: RemoteMessage, phase: String) {
        val n = remoteMessage.notification
        Log.i(
            TAG,
            "FCM[$phase] id=${remoteMessage.messageId} from=${remoteMessage.from} " +
                "sentTime=${remoteMessage.sentTime} " +
                "hasNotificationBlock=${n != null} priority=${remoteMessage.priority} " +
                "origPriority=${remoteMessage.originalPriority}"
        )
        if (n != null) {
            Log.i(
                TAG,
                "FCM[$phase] notification.title=${truncateForLog(n.title)} " +
                    "body=${truncateForLog(n.body)} " +
                    "imageUrl=${n.imageUrl} channelId=${n.channelId} " +
                    "icon=${n.icon} tag=${n.tag} clickAction=${n.clickAction}"
            )
        }
        val map = remoteMessage.data
        if (map.isEmpty()) {
            Log.i(TAG, "FCM[$phase] data: (empty map)")
        } else {
            Log.i(TAG, "FCM[$phase] data (${map.size} keys) — per-key on next lines")
            for (key in map.keys.sorted()) {
                Log.i(TAG, "FCM[$phase]   [$key] = ${truncateForLog(map[key] ?: "")}")
            }
        }
    }

    private fun logResolvedPayloadAndHandler(data: Map<String, String>) {
        val imageUrl = NotificationPayloadUtils.resolveSingleImageUrl(data)
        val ctaCount = NotificationCtaUtils.extractCtaSpecs(data).size
        val useBig = NotificationPayloadUtils.shouldUseBigPictureStyle(data)
        val hasImage = NotificationPayloadUtils.hasAnyImage(data)
        Log.i(
            TAG,
            "FCM[merged] resolveSingleImageUrl=${truncateForLog(imageUrl)} " +
                "ctaCount=$ctaCount shouldUseBigPicture=$useBig hasAnyImage=$hasImage"
        )
        Log.i(TAG, "FCM[merged] data (${data.size} keys) after notification merge")
        for (key in data.keys.sorted()) {
            Log.i(TAG, "FCM[merged]   [$key] = ${truncateForLog(data[key] ?: "")}")
        }
    }

    private fun truncateForLog(s: String?, max: Int = 2000): String {
        if (s.isNullOrEmpty()) return ""
        if (s.length <= max) return s
        return s.substring(0, max) + "…(+" + (s.length - max) + " chars)"
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
            // Text-only first so a slow/failed image download still shows title/body (better on strict OEMs).
            notificationManager.notify(notificationId, builder.build())
            val customService = CustomNotificationService(this)
            customService.downloadImage(imageUrl) { bitmap ->
                // Same id as first post: onlyAlertOnce suppresses a second sound when this update posts.
                val finalBuilder = (if (bitmap != null) {
                    // Large icon improves collapsed/preview on many devices (e.g. Samsung, MIUI).
                    builder
                        .setLargeIcon(bitmap)
                        .setStyle(
                            NotificationCompat.BigPictureStyle()
                                .bigPicture(bitmap)
                                .bigLargeIcon(null as android.graphics.Bitmap?)
                        )
                } else {
                    builder
                }).setOnlyAlertOnce(true)
                notificationManager.notify(notificationId, finalBuilder.build())
                sendReceivedTracking(data)
            }
        } else {
            notificationManager.notify(notificationId, builder.build())
            sendReceivedTracking(data)
        }
    }
}
