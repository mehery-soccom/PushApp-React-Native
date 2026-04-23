package com.meheryeventsender

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import android.app.NotificationManager
import android.graphics.drawable.GradientDrawable
import com.meheryeventsender.R
import android.view.View
import android.util.Log
import java.io.BufferedInputStream


class CustomNotificationService(private val context: Context) {

    companion object {
        const val ACTION_NEXT = "com.meheryeventsender.CAROUSEL_NEXT"
        const val ACTION_PREV = "com.meheryeventsender.CAROUSEL_PREV"
        private const val TAG = "CustomNotificationSvc"
        private const val CONNECT_TIMEOUT_MS = 15000
        private const val READ_TIMEOUT_MS = 15000
        private const val IMAGE_DOWNLOAD_RETRIES = 3
        private const val MAX_NOTIFICATION_BITMAP_EDGE_PX = 1200
        // Shared process-level cache so CarouselReceiver can access state.
        private val carouselIndexes = mutableMapOf<Int, Int>()
        private val cachedBitmaps = mutableMapOf<Int, List<Bitmap?>>()
        private val cachedTitles = mutableMapOf<Int, String>()
        private val cachedMessages = mutableMapOf<Int, String>()
        private val cachedTapTexts = mutableMapOf<Int, String>()
        private val cachedChannels = mutableMapOf<Int, String>()
        /** FCM data map for re-attaching CTA actions after carousel [updateCarouselView] rebuilds the notification. */
        private val carouselCtaPayload = mutableMapOf<Int, Map<String, String>>()
    }


    // ========================================================================================
    //  CREATE NOTIFICATION
    // ========================================================================================
    fun createCustomNotification(
    channelId: String,
    title: String,
    message: String,
    tapText: String,
    titleColor: String,
    messageColor: String,
    tapTextColor: String,
    progressColor: String,            // ✅ KEPT
    backgroundColor: String,
    imageUrl: String,
    bg_color_gradient: String,
    bg_color_gradient_dir: String,
    align: String,
    notificationId: Int,
    imageUrls: List<String> = emptyList(),
    showProgress: Boolean = false,
    progress: Int = 0,
    isRichMedia: Boolean = false,
    ctaData: Map<String, String>? = null

): NotificationCompat.Builder {

        if (imageUrls.isNotEmpty() && ctaData != null) {
            carouselCtaPayload[notificationId] = ctaData
        }

    val layoutRes = if (isRichMedia) {
        R.layout.rich_media_notification_layout
    } else {
        R.layout.custom_notification_layout
    }
    
    val customView = RemoteViews(context.packageName, layoutRes)
    
        // Background
        try {
            if (bg_color_gradient.isNotEmpty() && bg_color_gradient_dir.isNotEmpty()) {
                val startColor = Color.parseColor(backgroundColor)
                val endColor = Color.parseColor(bg_color_gradient)
                val isHorizontal = bg_color_gradient_dir.equals("horizontal", true)
                customView.setImageViewBitmap(R.id.root_background, createGradientBitmap(startColor, endColor, isHorizontal))
            } else {
                customView.setImageViewBitmap(R.id.root_background, createSolidColorBitmap(Color.parseColor(backgroundColor)))
            }
        } catch (_: Exception) {}

        // Text
        customView.setTextViewText(R.id.title, title)
        customView.setTextViewText(R.id.message, message)
        customView.setTextViewText(R.id.tap_text, tapText)

        try {
            customView.setTextColor(R.id.title, Color.parseColor(titleColor))
            customView.setTextColor(R.id.message, Color.parseColor(messageColor))
            customView.setTextColor(R.id.tap_text, Color.parseColor(tapTextColor))
        } catch (_: Exception) {}

        if (!isRichMedia) {
            if (showProgress) {
                customView.setProgressBar(R.id.progress_bar, 100, progress, false)
            
                try {
                    val color = Color.parseColor(progressColor)
                    customView.setInt(
                        R.id.progress_bar,
                        "setColorFilter",
                        color
                    )
                } catch (_: Exception) {}
            } else {
                customView.setViewVisibility(R.id.progress_bar, View.GONE)
            }
            
        }
        
                customView.setImageViewResource(R.id.icon, R.mipmap.ic_launcher)

        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val pendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setCustomContentView(customView)
            .setCustomBigContentView(customView)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(false)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        // ------------------------------------------------------------------------------------
        // MULTI-IMAGE (CAROUSEL MODE)
        // ------------------------------------------------------------------------------------
        if (imageUrls.isNotEmpty()) {
            downloadImages(imageUrls) { bitmaps ->

                val safeBitmaps = bitmaps.filterNotNull()
                if (safeBitmaps.isEmpty()) {
                    Log.w(TAG, "No valid carousel bitmaps for notificationId=$notificationId")
                    return@downloadImages
                }

                // Save state for carousel navigation
                cachedBitmaps[notificationId] = safeBitmaps
                cachedTitles[notificationId] = title
                cachedMessages[notificationId] = message
                cachedTapTexts[notificationId] = tapText
                cachedChannels[notificationId] = channelId

                carouselIndexes[notificationId] = 0

                // Show first image
                updateCarouselView(
                    notificationId,
                    channelId,
                    title,
                    message,
                    tapText,
                    safeBitmaps,
                    0
                )

                // Start auto sliding
                startAutoSlide(
                    notificationId,
                    channelId,
                    title,
                    message,
                    tapText,
                    safeBitmaps
                )
            }
        }

        // ------------------------------------------------------------------------------------
        // SINGLE IMAGE FALLBACK - update customView in place so notification shows image
        // ------------------------------------------------------------------------------------
        else if (imageUrl.isNotEmpty()) {
            downloadImage(imageUrl) { bitmap ->
                if (bitmap != null) {
                    if (isRichMedia) {
                        customView.setImageViewBitmap(R.id.richImage, bitmap)
                    } else {
                        customView.setImageViewBitmap(R.id.icon, bitmap)
                    }
                    val manager =
                        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(notificationId, builder.build())
                    Log.i(
                        TAG,
                        "Custom notification: bitmap loaded, posted notificationId=$notificationId " +
                            "richMedia=$isRichMedia"
                    )
                }
            }
        }

        return builder
    }


    // ========================================================================================
    //  MANUAL CAROUSEL NAVIGATION
    // ========================================================================================
    fun changeImage(notificationId: Int, forward: Boolean) {
        val current = carouselIndexes[notificationId] ?: return
        val bitmaps = cachedBitmaps[notificationId] ?: return

        val newIndex =
            if (forward) (current + 1) % bitmaps.size
            else if (current == 0) bitmaps.size - 1
            else current - 1

        carouselIndexes[notificationId] = newIndex

        updateCarouselView(
            notificationId,
            cachedChannels[notificationId]!!,
            cachedTitles[notificationId]!!,
            cachedMessages[notificationId]!!,
            cachedTapTexts[notificationId]!!,
            bitmaps,
            newIndex
        )
    }


    // ========================================================================================
    //  UPDATE CAROUSEL VIEW
    // ========================================================================================
    private fun updateCarouselView(
        notificationId: Int,
        channelId: String,
        title: String,
        message: String,
        tapText: String,
        bitmaps: List<Bitmap?>,
        index: Int
    ) {
        val rv = RemoteViews(context.packageName, R.layout.carousel_notification_layout)

        rv.setTextViewText(R.id.title, title)
        rv.setTextViewText(R.id.message, message)
        rv.setImageViewBitmap(R.id.carouselImage, bitmaps[index])

        // Explicit intents required for Android 8+ (implicit broadcasts blocked)
        val nextIntent = PendingIntent.getBroadcast(
            context, notificationId * 2,
            Intent(context, CarouselReceiver::class.java).apply {
                action = ACTION_NEXT
                putExtra("id", notificationId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val prevIntent = PendingIntent.getBroadcast(
            context, notificationId * 2 + 1,
            Intent(context, CarouselReceiver::class.java).apply {
                action = ACTION_PREV
                putExtra("id", notificationId)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        rv.setOnClickPendingIntent(R.id.btnNext, nextIntent)
        rv.setOnClickPendingIntent(R.id.btnPrev, prevIntent)

        val contentIntent = carouselCtaPayload[notificationId]?.let { payload ->
            NotificationCtaUtils.buildOpenPendingIntent(context, payload)
        } ?: PendingIntent.getActivity(
            context,
            0,
            context.packageManager.getLaunchIntentForPackage(context.packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setCustomContentView(rv)
            .setCustomBigContentView(rv)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setContentIntent(contentIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        carouselCtaPayload[notificationId]?.let { payload ->
            NotificationCtaUtils.appendCtaActions(context, builder, payload)
        }

        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        mgr.notify(notificationId, builder.build())
    }


    // ========================================================================================
    //  AUTO-SLIDE (EVERY 3 SECONDS)
    // ========================================================================================
    private fun startAutoSlide(
        notificationId: Int,
        channelId: String,
        title: String,
        message: String,
        tapText: String,
        bitmaps: List<Bitmap?>
    ) {
        val handler = Handler(Looper.getMainLooper())

        val runnable = object : Runnable {
            override fun run() {
                val curr = carouselIndexes[notificationId] ?: 0
                val next = (curr + 1) % bitmaps.size
                carouselIndexes[notificationId] = next

                updateCarouselView(
                    notificationId,
                    channelId,
                    title,
                    message,
                    tapText,
                    bitmaps,
                    next
                )

                handler.postDelayed(this, 3000)
            }
        }

        handler.postDelayed(runnable, 3000)
    }


    // ========================================================================================
    //  BITMAP HELPERS
    // ========================================================================================
    fun downloadImages(urlList: List<String>, onResult: (List<Bitmap?>) -> Unit) {
        Thread {
            val results = mutableListOf<Bitmap?>()

            for (urlString in urlList) {
                val clean = sanitizeImageUrl(urlString)
                var conn: HttpURLConnection? = null
                try {
                    val url = URL(clean)
                    conn = url.openConnection() as HttpURLConnection
                    conn.doInput = true
                    conn.connectTimeout = CONNECT_TIMEOUT_MS
                    conn.readTimeout = READ_TIMEOUT_MS
                    conn.instanceFollowRedirects = true
                    conn.connect()
                    val bitmap = conn.inputStream.use { input ->
                        BufferedInputStream(input).use { buffered ->
                            BitmapFactory.decodeStream(buffered)
                        }
                    }
                    conn.disconnect()
                    if (bitmap == null) {
                        Log.w(TAG, "Bitmap decode failed for carousel image: $clean")
                        results.add(null)
                    } else {
                        val limited = limitBitmapSizeForNotification(bitmap)
                        if (limited !== bitmap) {
                            bitmap.recycle()
                        }
                        results.add(limited)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Carousel image download failed for $clean", e)
                    results.add(null)
                } finally {
                    conn?.disconnect()
                }
            }

            Handler(Looper.getMainLooper()).post { onResult(results) }
        }.start()
    }


    fun downloadImage(urlString: String, onResult: (Bitmap?) -> Unit) {
        Thread {
            var bmp: Bitmap? = null
            for (attempt in 1..IMAGE_DOWNLOAD_RETRIES) {
                bmp = downloadImageSyncOnce(urlString)
                if (bmp != null) break
                if (attempt < IMAGE_DOWNLOAD_RETRIES) {
                    try {
                        Thread.sleep(400L * attempt)
                    } catch (_: InterruptedException) {
                        break
                    }
                }
            }
            if (bmp != null) {
                val limited = limitBitmapSizeForNotification(bmp!!)
                if (limited !== bmp) {
                    bmp!!.recycle()
                }
                bmp = limited
            }
            val out = bmp
            Handler(Looper.getMainLooper()).post { onResult(out) }
        }.start()
    }

    private fun downloadImageSyncOnce(urlString: String): Bitmap? {
        var conn: HttpURLConnection? = null
        return try {
            val cleanedUrl = sanitizeImageUrl(urlString)
            val url = URL(cleanedUrl)
            conn = url.openConnection() as HttpURLConnection
            conn.doInput = true
            conn.connectTimeout = CONNECT_TIMEOUT_MS
            conn.readTimeout = READ_TIMEOUT_MS
            conn.instanceFollowRedirects = true
            conn.connect()
            val decoded = conn.inputStream.use { input ->
                BufferedInputStream(input).use { buffered ->
                    BitmapFactory.decodeStream(buffered)
                }
            }
            if (decoded == null) {
                Log.w(TAG, "Bitmap decode failed for $cleanedUrl")
            }
            decoded
        } catch (e: Exception) {
            Log.e(TAG, "Single image download failed for $urlString", e)
            null
        } finally {
            conn?.disconnect()
        }
    }

    private fun limitBitmapSizeForNotification(src: Bitmap): Bitmap {
        val max = MAX_NOTIFICATION_BITMAP_EDGE_PX
        if (src.width <= max && src.height <= max) return src
        val scale = minOf(max.toFloat() / src.width, max.toFloat() / src.height)
        val w = (src.width * scale).toInt().coerceAtLeast(1)
        val h = (src.height * scale).toInt().coerceAtLeast(1)
        return Bitmap.createScaledBitmap(src, w, h, true)
    }

    private fun sanitizeImageUrl(urlString: String): String {
        val trimmed = urlString.trim()
        return if (trimmed.startsWith("@")) trimmed.substring(1) else trimmed
    }


    fun createGradientBitmap(startColor: Int, endColor: Int, isHorizontal: Boolean): Bitmap {
        val gradient = GradientDrawable(
            if (isHorizontal) GradientDrawable.Orientation.LEFT_RIGHT
            else GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(startColor, endColor)
        )

        val bmp = Bitmap.createBitmap(1080, 350, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        gradient.setBounds(0, 0, 1080, 350)
        gradient.draw(canvas)
        return bmp
    }

    fun createSolidColorBitmap(color: Int): Bitmap {
        val bmp = Bitmap.createBitmap(1080, 350, Bitmap.Config.ARGB_8888)
        bmp.eraseColor(color)
        return bmp
    }

}
