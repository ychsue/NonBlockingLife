import { useNativeBridge } from "../native/useNativeBridge";
import { useAppStore } from "../store/appStore";
import { openExternalHref } from "../utils/shortcutUtils";

interface ExternalAProps {
  href: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  className?: string;
  "data-tour"?: string;
  title?: string;
  onTouchStart?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
  onTouchEnd?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLAnchorElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function ExternalA({
  href,
  children,
  target,
  rel,
  onClick,
  ...rest
}: ExternalAProps) {
  const capabilitiesAndKind = useAppStore((state) => state.capabilitiesAndKind);
  const canOpenExternal =
    capabilitiesAndKind.capabilities.includes("openExternal");

  return (
    <a
      href={canOpenExternal ? undefined : href}
      onClick={(event) => {
        if (canOpenExternal) {
          openExternalHref(href);
          return false;
        }
        event.stopPropagation();
        onClick?.(event);
      }}
      target={target ?? "_blank"}
      rel={rel ?? "noopener noreferrer"}
      {...rest}
    >
      {children}
    </a>
  );
}
