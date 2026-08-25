(function () {
    const bridge = {
        port: null,
        sendDelegate: null,
        connected: false,
        lastMessage: null,
        listeners: new Set(),
        setPort(port) {
            if (this.port === port) return;
            // 不輕易 close，僅解除 handler
            if (this.port) {
                try { this.port.onmessage = null; } catch (e) { }
            }
            this.port = port;
            this.sendDelegate = port || null;
            this.connected = Boolean(port);
            if (!port) return;
            try {
                // 若需要，啟動 port
                if (typeof port.start === 'function') port.start();
                port.onmessage = (ev) => {
                    this.lastMessage = ev.data ?? null;
                    // 分發給 listeners（每個 listener 用 try/catch）
                    for (const fn of Array.from(this.listeners)) {
                        try { fn(ev.data, ev); } catch (err) { console.error('bridge listener error', err); }
                    }
                };
                console.log('bridge setPort success', port);
            } catch (err) {
                console.error('bridge setPort error', err);
            }
        },
        subscribe(fn, { replay = false } = {}) {
            this.listeners.add(fn);
            if (replay && this.lastMessage !== null) {
                try { fn(this.lastMessage); } catch (e) { console.error(e); }
            }
            return () => this.listeners.delete(fn);
        },
        postMessage(msg) {
            if (!this.sendDelegate) {
                console.warn('bridge: no port to postMessage');
                return false;
            }
            try {
                this.sendDelegate.postMessage(msg);
                return true;
            } catch (err) {
                console.error('bridge postMessage failed', err);
                return false;
            }
        }
    };

    // 暴露到 window
    window.__NBL_TWA_BRIDGE__ = window.__NBL_TWA_BRIDGE__ || bridge;

    window.addEventListener('message', (event) => {
        if (event?.ports?.length>0) {
            console.log('twa-pm-bridge received message port #', event?.ports?.length, 'data', event);
        }
        // optional: 檢查 event.origin 或 event.data.type
        const port = event?.ports?.[0];
        if (port) {
            window.__NBL_TWA_BRIDGE__.setPort(port);
            console.log('bridge port set from TWA message event', port);
        }
        // } else {
        //     // 若 TWA 直接傳 data 而非 port，也可處理
        //     window.__NBL_TWA_BRIDGE__.lastMessage = event.data ?? null;
        //     for (const fn of Array.from(window.__NBL_TWA_BRIDGE__.listeners)) {
        //         try { fn(event.data, event); } catch (e) { console.error(e); }
        //     }
        // }
    });
    console.log('twa-pm-bridge initialized');
})();
