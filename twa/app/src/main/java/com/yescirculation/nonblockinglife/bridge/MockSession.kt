package com.yescirculation.nonblockinglife.bridge

import android.os.Bundle
//import androidx.browser.customtabs.CustomTabsSession

interface MessageSender {
    fun postMessage(message: String, extras: Bundle? = null): Int
}
class MockSession(private val bridge: AndroidBridge): MessageSender {

    // 模擬原先 mSession.postMessage(String message, Bundle extras) 的簽名
    override fun postMessage(message: String, extras: Bundle?): Int {
        bridge.sendToPwa(message)
        return 0
    }
}

//class RealSessionAdapter(val realSession: CustomTabsSession): MessageSender {
//    override fun postMessage(message: String, extras: Bundle?): Int {
//        return realSession.postMessage(message, extras)
//    }
//}