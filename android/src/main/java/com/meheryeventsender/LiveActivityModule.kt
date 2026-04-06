package com.meheryeventsender

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import org.json.JSONArray

@ReactModule(name = LiveActivityModule.NAME)
class LiveActivityModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "LiveActivityModule"
    }

    override fun getName(): String = NAME

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

        // ✅ Call the shared utility instead of private method
        LiveActivityUtils.handleLiveActivityNotification(reactContext, data)
    }

    @ReactMethod
    fun triggerCarousel(dataMap: ReadableMap) {
        val data = mutableMapOf<String, String>()
        val iterator = dataMap.keySetIterator()

        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (dataMap.getType(key)) {
                ReadableType.String -> {
                    dataMap.getString(key)?.let { data[key] = it }
                }
                ReadableType.Array -> {
                    if (key == "images") {
                        val arr = dataMap.getArray(key)
                        val list = mutableListOf<String>()
                        if (arr != null) {
                            for (i in 0 until arr.size()) {
                                val item = arr.getString(i)
                                if (!item.isNullOrBlank()) list.add(item)
                            }
                        }
                        if (list.isNotEmpty()) {
                            data["image_urls"] = JSONArray(list).toString()
                        }
                    }
                }
                else -> Unit
            }
        }

        LiveActivityUtils.handleCarouselNotification(reactContext, data)
    }
}