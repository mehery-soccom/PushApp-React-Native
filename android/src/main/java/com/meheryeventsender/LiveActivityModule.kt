package com.meheryeventsender

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

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
}
