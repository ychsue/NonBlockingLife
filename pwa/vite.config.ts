import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: false, // 開發模式下停用 PWA
      },
      includeAssets: [
        "favicon.svg",
        "icons/icon-192.svg",
        "icons/icon-512.svg",
      ],
      manifest: {
        id: "/NonBlockingLife/",
        name: "NonBlockingLife",
        short_name: "NBL",
        description: "NonBlockingLife local-first task manager",
        start_url: "/NonBlockingLife/",
        scope: "/NonBlockingLife/",
        display: "standalone",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        orientation: "portrait-primary",
        protocol_handlers: [
          {
            protocol: "web+nbl",
            url: "/NonBlockingLife/?%s",
          },
        ],
        share_target: {
          action: "/NonBlockingLife/share-to-inbox",
          method: "GET",
          enctype: "application/x-www-form-urlencoded",
          params: {
            title: "title",
            text: "text",
            url: "url",
          },
        },
        icons: [
          {
            src: "icons/icon-180.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "screenshots/desktop.png",
            sizes: "1280x800",
            type: "image/png",
            form_factor: "wide",
          },
          {
            src: "screenshots/mobile.png",
            sizes: "720x1280",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: command === "serve" ? "/" : "/NonBlockingLife/",
}));
