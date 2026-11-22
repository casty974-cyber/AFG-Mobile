
package com.allfoundation.group

import android.app.Activity
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewAssetLoader

class MainActivity : Activity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val assetLoader = WebViewAssetLoader.Builder()
            .addPathHandler(
                "/assets/",
                WebViewAssetLoader.AssetsPathHandler(this)
            )
            .build()

        webView = WebView(this)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
        }

        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(request.url)
                    ?: super.shouldInterceptRequest(view, request)
            }

            @Suppress("DEPRECATION")
            override fun shouldInterceptRequest(
                view: WebView,
                url: String
            ): WebResourceResponse? {
                return assetLoader.shouldInterceptRequest(
                    android.net.Uri.parse(url)
                ) ?: super.shouldInterceptRequest(view, url)
            }
        }

        webView.webChromeClient = WebChromeClient()

        setContentView(webView)

        webView.loadUrl(
            "https://appassets.androidplatform.net/assets/index.html"
        )
    }

    @Deprecated("Deprecated in Android")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}

