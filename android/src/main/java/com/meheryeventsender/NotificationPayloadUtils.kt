package com.meheryeventsender

import org.json.JSONArray

object NotificationPayloadUtils {
    private val singleImageKeys = listOf("image", "imageUrl", "image_url")
    private val listImageKeys = listOf("imageUrls", "image_urls", "carousel_images")
    private val customTemplateKeys = listOf(
        "tapText",
        "titleColorHex",
        "messageColorHex",
        "tapTextColorHex",
        "backgroundColorHex",
        "bg_color_gradient",
        "bg_color_gradient_dir",
        "align",
        "progressPercent",
        "progressColorHex"
    )

    fun resolveSingleImageUrl(data: Map<String, String>): String {
        for (key in singleImageKeys) {
            val value = data[key]?.trim()
            if (!value.isNullOrEmpty()) {
                return value
            }
        }
        return ""
    }

    fun extractImageList(data: Map<String, String>): List<String> {
        for (key in listImageKeys) {
            val parsed = parseJsonArray(data[key])
            if (parsed.isNotEmpty()) {
                return parsed
            }
        }

        val indexed = mutableListOf<String>()
        var index = 1
        while (true) {
            val key = "image$index"
            if (!data.containsKey(key)) break
            val value = data[key]?.trim()
            if (!value.isNullOrEmpty()) {
                indexed.add(value)
            }
            index++
        }
        return indexed
    }

    fun hasAnyImage(data: Map<String, String>): Boolean {
        if (resolveSingleImageUrl(data).isNotEmpty()) return true
        if (extractImageList(data).isNotEmpty()) return true
        return false
    }

    fun shouldUseBigPictureStyle(data: Map<String, String>): Boolean {
        if (extractImageList(data).isNotEmpty()) return false
        if (resolveSingleImageUrl(data).isEmpty()) return false

        for (key in customTemplateKeys) {
            if (!data[key].isNullOrBlank()) return false
        }
        return true
    }

    private fun parseJsonArray(raw: String?): List<String> {
        val input = raw?.trim()
        if (input.isNullOrEmpty()) return emptyList()
        return try {
            val array = JSONArray(input)
            val out = mutableListOf<String>()
            for (i in 0 until array.length()) {
                val value = array.optString(i).trim()
                if (value.isNotEmpty()) {
                    out.add(value)
                }
            }
            out
        } catch (_: Exception) {
            emptyList()
        }
    }
}
