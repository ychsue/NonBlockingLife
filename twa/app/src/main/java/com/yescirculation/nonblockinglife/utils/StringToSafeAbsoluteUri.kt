package com.yescirculation.nonblockinglife.utils

import android.net.Uri
import android.webkit.URLUtil
import androidx.core.net.toUri

fun String.toSafeAbsoluteUri(baseUrl: String, stProtocol: String): Uri? {
    val trimmed = this.trim()
    if (trimmed.isEmpty()) return null

    // 1. 先得到 trimmed.toUri()
    val uri = trimmed.toUri()

    val resultUri = when {
        // 1.1 如果 uri.host 是 stProtocol，把它改成 baseUrl
        uri.host?.startsWith("show-clock") == true || uri.host?.startsWith("set-timer") == true  -> uri
        uri.scheme == stProtocol -> uri.buildUpon().scheme(baseUrl).build()

        // 2. 如果 uri 是絕對 URI，直接返回
        uri.isAbsolute -> uri

        // 3. 否則，使用 baseUrl 作為基礎，拼接成絕對 URI
        else -> {
            val baseUri = baseUrl.toUri()
            // 如果 baseUri.path 有出現在 uri.encodedPath 的前面，就完全使用 uri.encodedPath，若沒有出現，就要加baseUri.path 到前面
            val path = if (uri.encodedPath?.startsWith(baseUri.path ?: "") == true) {
                uri.encodedPath
            } else {
                (baseUri.path ?: "") + (uri.encodedPath?.removePrefix("/") ?: "")
            }
            baseUri.buildUpon()
                .encodedPath(path)
                .encodedQuery(uri.encodedQuery)
                .encodedFragment(uri.encodedFragment)
                .build()
        }
    }

    return resultUri.takeIf { it.isValidWebOrActionUri() }
}

private fun Uri.isValidWebOrActionUri(): Boolean {
    val scheme = this.scheme?.lowercase() ?: return false

    return when (scheme) {
        "http", "https" -> !this.host.isNullOrBlank() && URLUtil.isValidUrl(this.toString())
        "tel", "mailto", "sms", "nonblockinglife" -> !this.schemeSpecificPart.isNullOrBlank()

        else -> false
    }
}