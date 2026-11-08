# Changelog

## 0.2.1

- Borderless edge-to-edge glass: removed the drawn `#root::after` window border.
- Softer sidebar separation: dropped the hard `border-right`; kept a very faint inset edge.
- Menu / dialog / settings hairlines reduced to `--lg-border-1`.
- More neutral glass defaults: `bgVeil 0.44`, `panelTint 0.24`, `saturation 130`, `grain 0.03`; storage key moved to `dsh.liquid-glass.v2`.
- Dark glass panel RGB changed from blue-ish `20,24,32` to neutral `18,20,24`; stronger scrim.
- Published packaging: generic install-path detection, relative docs, sanitized verification notes.

## 0.2.0

- B-only rewrite: removed the wallpaper route, wallpaper runtime, wallpaper source/preview, and A fallback.
- Native Windows 11 Acrylic / Mica / Clear support through the desktop shell IPC.
- A settings section with real-desktop switch, material, veil, glass parameters, and presets.
- Host half is a no-op; the desktop patch owns the window material.
