import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Renders overlays outside the pivot markup.
 *
 * A `position: fixed` overlay is only positioned against the viewport when no
 * ancestor creates a containing block. Host apps routinely add `transform`,
 * `filter`, `contain` or `will-change` to a wrapper (cards, animations, zoom),
 * which silently re-anchors and clips the dialog. Portalling to the document
 * removes that whole class of bug.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // In fullscreen the browser paints only the fullscreen element, so a dialog
    // attached to <body> would be invisible. Follow the fullscreen element.
    const pick = () => setHost((document.fullscreenElement as HTMLElement | null) ?? document.body);
    pick();
    document.addEventListener("fullscreenchange", pick);
    return () => document.removeEventListener("fullscreenchange", pick);
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
