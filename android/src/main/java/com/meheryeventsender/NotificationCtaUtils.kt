package com.meheryeventsender

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Parses CTA payloads (aligned with iOS: cta_buttons JSON, title1/url1, etc.) and
 * attaches [NotificationCompat.Builder.addAction] targets.
 */
object NotificationCtaUtils {

    private const val MAX_ANDROID_ACTIONS = 3

    data class CtaSpec(val label: String, val url: String, val trackId: String)

    fun trackBaseUrl(data: Map<String, String>): String {
        val explicit = data["track_base_url"]?.trim().orEmpty()
        if (explicit.isNotEmpty()) return explicit
        return data["api_base_url"]?.trim().orEmpty()
    }

    fun extractCtaSpecs(data: Map<String, String>): List<CtaSpec> {
        val fromJson = parseCtaButtons(data["cta_buttons"])
        if (fromJson.isNotEmpty()) return fromJson

        val legacy = mutableListOf<CtaSpec>()
        fun addPair(titleKey: String, urlKey: String) {
            val label = data[titleKey]?.trim().orEmpty()
            val url = data[urlKey]?.trim().orEmpty()
            if (label.isNotEmpty() && url.isNotEmpty()) {
                legacy.add(CtaSpec(label, url, label))
            }
        }
        addPair("title1", "url1")
        addPair("title2", "url2")
        addPair("title3", "url3")
        return legacy
    }

    private fun parseCtaButtons(raw: String?): List<CtaSpec> {
        val input = raw?.trim().orEmpty()
        if (input.isEmpty()) return emptyList()
        return try {
            when (val root = org.json.JSONTokener(input).nextValue()) {
                is JSONArray -> parseCtaButtonArray(root)
                is JSONObject -> {
                    val nested = root.optJSONArray("buttons")
                        ?: root.optJSONArray("items")
                        ?: root.optJSONArray("ctas")
                    if (nested != null) parseCtaButtonArray(nested) else emptyList()
                }
                else -> emptyList()
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun parseCtaButtonArray(arr: JSONArray): List<CtaSpec> {
        val out = mutableListOf<CtaSpec>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val label = listOf("title", "label", "text", "name", "buttonTitle")
                .firstNotNullOfOrNull { k -> o.optString(k).trim().takeIf { it.isNotEmpty() } }
                ?: continue
            val url = listOf("url", "link", "href", "deepLink", "deeplink", "targetUrl")
                .firstNotNullOfOrNull { k -> o.optString(k).trim().takeIf { it.isNotEmpty() } }
                ?: continue
            val trackId = o.optString("id").trim().takeIf { it.isNotEmpty() } ?: label
            out.add(CtaSpec(label, url, trackId))
        }
        return out
    }

    fun appendCtaActions(
        context: Context,
        builder: NotificationCompat.Builder,
        data: Map<String, String>
    ) {
        val specs = extractCtaSpecs(data).take(MAX_ANDROID_ACTIONS)
        for (spec in specs) {
            builder.addAction(
                0,
                spec.label,
                createUrlPendingIntent(context, data, spec)
            )
        }
    }

    private fun buildActionReceiverIntent(
        context: Context,
        data: Map<String, String>,
        eventName: String,
        targetUrl: String? = null,
        ctaId: String? = null
    ): Intent {
        return Intent(context, NotificationActionReceiver::class.java).apply {
            putExtra(NotificationActionReceiver.EXTRA_ACTION_TYPE, eventName)
            putExtra(NotificationActionReceiver.EXTRA_TARGET_URL, targetUrl.orEmpty())
            putExtra(NotificationActionReceiver.EXTRA_TRACK_BASE_URL, trackBaseUrl(data))
            putExtra(NotificationActionReceiver.EXTRA_MESSAGE_ID, data["messageId"].orEmpty())
            putExtra(NotificationActionReceiver.EXTRA_FILTER_ID, data["filterId"].orEmpty())
            putExtra(
                NotificationActionReceiver.EXTRA_NOTIFICATION_ID,
                data["notification_id"].orEmpty()
            )
            putExtra(NotificationActionReceiver.EXTRA_CTA_ID, ctaId.orEmpty())
        }
    }

    private fun createUrlPendingIntent(
        context: Context,
        data: Map<String, String>,
        spec: CtaSpec
    ): PendingIntent {
        val intent = buildActionReceiverIntent(
            context = context,
            data = data,
            eventName = "cta",
            targetUrl = spec.url,
            ctaId = spec.trackId
        )
        return PendingIntent.getBroadcast(
            context,
            (spec.trackId + spec.url).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    fun buildOpenPendingIntent(context: Context, data: Map<String, String>): PendingIntent {
        val intent = buildActionReceiverIntent(
            context = context,
            data = data,
            eventName = "opened",
            targetUrl = null,
            ctaId = null
        )
        return PendingIntent.getBroadcast(
            context,
            ("open_" + (data["notification_id"] ?: System.currentTimeMillis().toString())).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /** For [android.content.Context.sendBroadcast] (e.g. received tracking). */
    fun intentForPushTrackEvent(
        context: Context,
        data: Map<String, String>,
        eventName: String,
        targetUrl: String? = null,
        ctaId: String? = null
    ): Intent {
        return buildActionReceiverIntent(context, data, eventName, targetUrl, ctaId)
    }
}
