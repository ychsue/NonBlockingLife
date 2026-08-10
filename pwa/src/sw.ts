import type { PrecacheEntry } from "workbox-precaching";
import { precacheAndRoute } from "workbox-precaching";

declare const self: typeof globalThis & {
  __WB_MANIFEST: PrecacheEntry[];
  skipWaiting: () => Promise<void>;
  clients: {
    claim: () => Promise<void>;
    matchAll: (options: { type: string; includeUncontrolled: boolean }) => Promise<unknown[]>;
    openWindow: (url: string) => Promise<Window | null>;
  };
  location: Location;
};

const APP_URL = "/NonBlockingLife/";

self.__WB_MANIFEST;
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener("install", ((event: Event & { waitUntil: (promise: Promise<unknown>) => void }) => {
  event.waitUntil(self.skipWaiting());
}) as EventListener);

self.addEventListener("activate", ((event: Event & { waitUntil: (promise: Promise<unknown>) => void }) => {
  event.waitUntil(self.clients.claim());
}) as EventListener);

self.addEventListener(
  "notificationclick",
  ((event: Event & { notification: Notification; waitUntil: (promise: Promise<unknown>) => void }) => {
    const notificationData = event.notification.data as
      | { url?: string; dismissOnClick?: boolean }
      | undefined;
    const dismissOnClick = notificationData?.dismissOnClick ?? true;

    if (dismissOnClick) {
      event.notification.close();
    }

    const targetUrl = notificationData?.url || APP_URL;
    const url = new URL(targetUrl, self.location.origin).toString();

    event.waitUntil(
      (async () => {
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });

        const matchingClient = clientList.find((client: unknown) => {
          if (typeof client !== "object" || client === null || !("url" in client)) {
            return false;
          }

          const clientUrl = new URL((client as { url: string }).url, self.location.origin).toString();
          return clientUrl === url || clientUrl.startsWith(url);
        });

        if (matchingClient && typeof matchingClient === "object" && matchingClient !== null && "focus" in matchingClient) {
          await (matchingClient as { focus: () => Promise<void> }).focus();
          return;
        }

        await self.clients.openWindow(url);
      })(),
    );
  }) as EventListener,
);
