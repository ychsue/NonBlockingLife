import { useNativeBridge } from "../native/useNativeBridge";

interface ExternalAProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onTouchStart?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
  onTouchEnd?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
}

export function ExternalA({
  href,
  children,
  className,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
}: ExternalAProps) {
  const bridge = useNativeBridge();

  return (
    <a
      href={bridge.kind === "desktop" ? undefined : href}
      onClick={(event) => {
        if (bridge.kind === "desktop") {
          bridge.request("nbl:open-external", { url: href });
          return false;
        }
        event.stopPropagation();
      }}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
    >
      {children}
    </a>
  );
}
