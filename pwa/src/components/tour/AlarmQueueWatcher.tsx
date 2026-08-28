import { createContext, useContext } from "react";
import { useAlarmQueueWatcher } from "../../hooks/useAlarmQueueWatcher";

const WatcherContext = createContext<ReturnType<typeof useAlarmQueueWatcher> | null>(null);
export function AlarmQueueWatcherProvider({ children, watcher }: { children: React.ReactNode; watcher: ReturnType<typeof useAlarmQueueWatcher> }) {
  return (
    <WatcherContext.Provider value={watcher}>
      {children}
    </WatcherContext.Provider>
  );
}

export function useAlarmQueueWatcherContext() {
  const context = useContext(WatcherContext);
  if (!context) {
    throw new Error("useAlarmQueueWatcherContext must be used within an AlarmQueueWatcherProvider");
  }
  return context;
}