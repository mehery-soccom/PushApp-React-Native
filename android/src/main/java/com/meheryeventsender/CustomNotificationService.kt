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

class CustomNotificationService(private val context: Context) {

    companion object {
        const val ACTION_NEXT = "com.meheryeventsender.CAROUSEL_NEXT"
        const val ACTION_PREV = "com.meheryeventsender.CAROUSEL_PREV"
    }

    // State caches
    private val carouselIndexes = mutableMapOf<Int, Int>()
    private val cachedBitmaps = mutableMapOf<Int, List<Bitmap?>>()
    private val cachedTitles = mutableMapOf<Int, String>()
    private val cachedMessages = mutableMapOf<Int, String>()
    private val cachedTapTexts = mutableMapOf<Int, String>()
    private val cachedChannels = mutableMapOf<Int, String>()


    // ========================================================================================
    //  CREATE NOTIFICATION
    // ========================================================================================
    fun createCustomNotification(
        channelId: String,
        title: String,
        message: String,
        tapText: String,
        progress: Int,
        titleColor: String,
        messageColor: String,
        tapTextColor: String,
        progressColor: String,
        backgroundColor: String,
        imageUrl: String,
        bg_color_gradient: String,
        bg_color_gradient_dir: String,
        align: String,
        notificationId: Int,
        imageUrls: List<String> = emptyList()
    ): NotificationCompat.Builder {

        val customView = RemoteViews(context.packageName, R.layout.custom_notification_layout)

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

        customView.setProgressBar(R.id.progress_bar, 100, progress, false)
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
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(false)

        // ------------------------------------------------------------------------------------
        // MULTI-IMAGE (CAROUSEL MODE)
        // ------------------------------------------------------------------------------------
        if (imageUrls.isNotEmpty()) {
            downloadImages(imageUrls) { bitmaps ->

                val safeBitmaps = bitmaps.filterNotNull()
                if (safeBitmaps.isEmpty()) return@downloadImages

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
        // SINGLE IMAGE FALLBACK
        // ------------------------------------------------------------------------------------
        else if (imageUrl.isNotEmpty()) {
            downloadImage(imageUrl) { bitmap ->
                if (bitmap != null) {
                    val updatedView =
                        RemoteViews(context.packageName, R.layout.custom_notification_layout)

                    updatedView.setTextViewText(R.id.title, title)
                    updatedView.setTextViewText(R.id.message, message)
                    updatedView.setTextViewText(R.id.tap_text, tapText)
                    updatedView.setImageViewBitmap(R.id.icon, bitmap)

                    val manager =
                        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                    manager.notify(notificationId, builder.build())
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

        val nextIntent = PendingIntent.getBroadcast(
            context, notificationId,
            Intent(ACTION_NEXT).putExtra("id", notificationId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val prevIntent = PendingIntent.getBroadcast(
            context, notificationId + 1,
            Intent(ACTION_PREV).putExtra("id", notificationId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        rv.setOnClickPendingIntent(R.id.btnNext, nextIntent)
        rv.setOnClickPendingIntent(R.id.btnPrev, prevIntent)

        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setCustomContentView(rv)
            .setCustomBigContentView(rv)
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())

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
                val clean = if (urlString.startsWith("@")) urlString.substring(1) else urlString
                try {
                    val url = URL(clean)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.doInput = true
                    conn.connect()
                    results.add(BitmapFactory.decodeStream(conn.inputStream))
                } catch (e: Exception) {
                    results.add(null)
                }
            }

            Handler(Looper.getMainLooper()).post { onResult(results) }
        }.start()
    }


    fun downloadImage(urlString: String, onResult: (Bitmap?) -> Unit) {
        Thread {
            var bmp: Bitmap? = null
            try {
                val url = URL(urlString)
                val conn = url.openConnection() as HttpURLConnection
                conn.doInput = true
                conn.connect()
                bmp = BitmapFactory.decodeStream(conn.inputStream)
            } catch (_: Exception) {}

            Handler(Looper.getMainLooper()).post { onResult(bmp) }
        }.start()
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
