/**
 * Liquid Glass — Host half.
 *
 * B-only by design: the live-desktop material is owned by the desktop shell
 * patch (`desktop-patch`). This plugin never serves a wallpaper, never reads
 * the registry wallpaper, and has no image fallback. All visual work happens
 * in the Client half over the native Acrylic/Mica window.
 */
export function apply() {
  // Intentionally empty. The desktop shell patch exposes
  // window.dshDesktop.window.getMaterial/setMaterial to the renderer.
}
