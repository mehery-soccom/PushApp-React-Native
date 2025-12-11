package com.meheryeventsender

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CarouselReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra("id", -1)
        if (id == -1) return

        val service = CustomNotificationService(context)

        when (intent.action) {
            CustomNotificationService.ACTION_NEXT ->
                service.changeImage(id, forward = true)

            CustomNotificationService.ACTION_PREV ->
                service.changeImage(id, forward = false)
        }
    }
}
