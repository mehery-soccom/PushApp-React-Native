package com.meheryeventsender

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.viewpager2.widget.ViewPager2
import android.widget.TextView
import com.bumptech.glide.Glide
import android.widget.ImageView
import androidx.recyclerview.widget.RecyclerView

class CarouselActivity : AppCompatActivity() {

    private lateinit var viewPager: ViewPager2
    private lateinit var titleText: TextView
    private lateinit var messageText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_carousel)

        viewPager = findViewById(R.id.carouselViewPager)
        titleText = findViewById(R.id.carouselTitle)
        messageText = findViewById(R.id.carouselMessage)

        val images = intent.getStringArrayListExtra("images") ?: arrayListOf()
        val title = intent.getStringExtra("title") ?: ""
        val message = intent.getStringExtra("message") ?: ""

        titleText.text = title
        messageText.text = message

        viewPager.adapter = ImagePagerAdapter(images)
        viewPager.orientation = ViewPager2.ORIENTATION_HORIZONTAL
    }

    // Adapter inside activity OR create this as separate file
    class ImagePagerAdapter(private val images: List<String>) :
        RecyclerView.Adapter<ImagePagerAdapter.ImageViewHolder>() {

        class ImageViewHolder(val imageView: ImageView) :
            RecyclerView.ViewHolder(imageView)

        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): ImageViewHolder {
            val iv = ImageView(parent.context)
            iv.layoutParams = android.view.ViewGroup.LayoutParams(
                android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                android.view.ViewGroup.LayoutParams.MATCH_PARENT
            )
            iv.scaleType = ImageView.ScaleType.CENTER_CROP
            return ImageViewHolder(iv)
        }

        override fun onBindViewHolder(holder: ImageViewHolder, position: Int) {
            Glide.with(holder.imageView.context)
                .load(images[position])
                .into(holder.imageView)
        }

        override fun getItemCount(): Int = images.size
    }
}
