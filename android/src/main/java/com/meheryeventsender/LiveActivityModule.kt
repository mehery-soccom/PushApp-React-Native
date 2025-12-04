package com.meheryeventsender

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = LiveActivityModule.NAME)
class LiveActivityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "LiveActivityModule"
    }

    override fun getName(): String = NAME

    // Existing live activity method
    @ReactMethod
    fun triggerLiveActivity(dataMap: ReadableMap) {
        val data = mutableMapOf<String, String>()
        val iterator = dataMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            val value = dataMap.getString(key)
            if (value != null) {
                data[key] = value
            }
        }

        LiveActivityUtils.handleLiveActivityNotification(reactContext, data)
    }

    // ⭐ New Carousel method (Kotlin-correct)
    @ReactMethod
    fun triggerCarousel(params: ReadableMap) {
        val title = params.getString("title") ?: ""
        val message = params.getString("message") ?: ""

        val imagesArray = params.getArray("images")
        val images = ArrayList<String>()

        if (imagesArray != null) {
            for (i in 0 until imagesArray.size()) {
                val url = imagesArray.getString(i)
                if (url != null) images.add(url)
            }
        }

        // Launch CarouselActivity
        val intent = Intent(reactContext, CarouselActivity::class.java)
        intent.putStringArrayListExtra("images", images)
        intent.putExtra("title", title)
        intent.putExtra("message", message)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

        reactContext.startActivity(intent)
    }
}
