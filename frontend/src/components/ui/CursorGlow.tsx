import { useEffect, useRef } from "react";

const DOT_SIZE = 7; // px — core dot, kept near the small end of the 8–10px spec.
const EASE = 0.16; // Lower = more lag/inertia behind the real pointer.

/** Premium cursor-follower: a small glowing emerald dot that trails the
 * real pointer with spring-like inertia — purely decorative chrome layered
 * on top of the app, never a replacement for the native cursor (nothing
 * here touches `cursor` styling). Position is driven by a rAF loop that
 * mutates the DOM node's `transform` directly instead of React state, so
 * mousemove never triggers a re-render — this is the "cursor tracking
 * dot" the site-wide `cursor: pointer` audit was never going to satisfy,
 * since that's a completely different, hover-affordance feature. */
export function CursorGlow() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Touch devices have no persistent pointer to follow — skip entirely.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let hasMoved = false;
    let frameId = 0;

    function handleMove(event: MouseEvent) {
      target.x = event.clientX;
      target.y = event.clientY;
      // Always restore visibility on movement — not just the very first
      // move ever. Without this, once `handleLeave` hides the dot (mouse
      // exits the window, or the tab loses focus), it stayed invisible
      // forever because the old one-shot `!hasMoved` guard only fired
      // once per mount, requiring a full page reload to see it again.
      dotRef.current?.style.setProperty("opacity", "1");
      if (!hasMoved) {
        hasMoved = true;
        current.x = event.clientX;
        current.y = event.clientY;
      }
    }

    function handleLeave() {
      dotRef.current?.style.setProperty("opacity", "0");
    }

    function tick() {
      current.x += (target.x - current.x) * EASE;
      current.y += (target.y - current.y) * EASE;
      const node = dotRef.current;
      if (node) {
        node.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      frameId = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", handleMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", handleLeave);
    window.addEventListener("blur", handleLeave);
    frameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      document.documentElement.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("blur", handleLeave);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] opacity-0 transition-opacity duration-300 motion-reduce:hidden"
      style={{
        width: DOT_SIZE,
        height: DOT_SIZE,
        borderRadius: "9999px",
        backgroundColor: "#22c55e",
        // Trimmed down from the original spread — the core dot was in-spec
        // (8-10px) but the glow's effective footprint made the whole thing
        // read as noticeably larger than intended.
        boxShadow:
          "0 0 3px 1px rgba(34, 197, 94, 0.7), 0 0 6px 2px rgba(34, 197, 94, 0.35), 0 0 11px 4px rgba(34, 197, 94, 0.16), 0 0 18px 6px rgba(34, 197, 94, 0.07)",
        willChange: "transform, opacity",
      }}
    />
  );
}
