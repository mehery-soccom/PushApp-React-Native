package com.meheryeventsender

import org.json.JSONArray

object NotificationPayloadUtils {
    const val MAX_CAROUSEL_IMAGES = 4
    private val singleImageKeys = listOf("image", "imageUrl", "image_url")
    private val listImageKeys = listOf("imageUrls", "image_urls", "carousel_images", "images")
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

    /**
     * Picks a single image URL from [image], [imageUrl], [image_url].
     * If more than one is set (e.g. bulk sends a placeholder in [image] and the real URL in [image_url]),
     * the first value that looks like an http(s) URL wins; otherwise the first non-empty in key order.
     */
    fun resolveSingleImageUrl(data: Map<String, String>): String {
        val ordered = singleImageKeys.mapNotNull { key ->
            data[key]?.trim()?.takeIf { it.isNotEmpty() }
        }
        if (ordered.isEmpty()) return ""
        return ordered.firstOrNull { looksLikeHttpImageUrl(it) } ?: ordered.first()
    }

    private fun looksLikeHttpImageUrl(s: String): Boolean {
        val t = s.trim()
        if (t.isEmpty()) return false
        val u = if (t.startsWith("@")) t.substring(1).trim() else t
        return u.startsWith("http://", ignoreCase = true) ||
            u.startsWith("https://", ignoreCase = true)
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

    fun extractLimitedImageList(data: Map<String, String>): List<String> {
        return extractImageList(data).take(MAX_CAROUSEL_IMAGES)
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
            input
                .split(",")
                .map { it.trim().trim('"', '\'') }
                .filter { it.isNotEmpty() }
        }
    }
}
