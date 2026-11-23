/** A blue/green "mesh gradient" wash echoing the login page's backdrop —
 * shared by every authenticated shell and the public card page so the app
 * doesn't read as flat white.
 *
 * Deliberately pure `background-image` gradients, NOT blurred `<div>`s with
 * `filter: blur()`. Blur filters force the browser to rasterize a much
 * larger area than the visible shape and keep it on its own composited
 * layer — stacked with `backdrop-blur` on the sticky header and fixed
 * mobile tab bar (which must re-sample their backdrop on every scroll
 * frame), this was the actual cause of the reported "animations aren't
 * smooth on mobile" / "hamburger takes 10-15s to open" — the compositor
 * was falling behind, not any particular animation being slow. A gradient
 * is a single cheap paint operation with no filter/compositing cost, so it
 * can also be considerably more visible/saturated than the old blurred
 * blobs without adding anything back to that cost. */
export function AmbientBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        backgroundImage: [
          "radial-gradient(circle at 8% 8%, rgba(9, 60, 113, 0.20), transparent 42%)",
          "radial-gradient(circle at 92% 22%, rgba(89, 166, 51, 0.22), transparent 45%)",
          "radial-gradient(circle at 20% 92%, rgba(9, 60, 113, 0.16), transparent 40%)",
          "radial-gradient(circle at 82% 88%, rgba(89, 166, 51, 0.18), transparent 42%)",
        ].join(", "),
      }}
    />
  );
}
