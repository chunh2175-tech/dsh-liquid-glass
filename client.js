window.__ModuleLoader__.load({
  id: '@local/liquid-glass',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useSyncExternalStore } = React

    const SOURCE = '@local/liquid-glass'
    const NS = 'liquidGlass'
    const STORAGE_KEY = 'dsh.liquid-glass.v2'
    const SETTINGS_SECTION = 'liquid-glass'
    const ORDER = 12

    const DEFAULT_SETTINGS = Object.freeze({
      enabled: true,
      material: 'acrylic',
      bgVeil: 0.44,
      panelBlur: 26,
      panelTint: 0.24,
      saturation: 130,
      radius: 18,
      grain: 0.03,
    })

    const LIMITS = Object.freeze({
      bgVeil: [0, 0.8],
      panelBlur: [0, 40],
      panelTint: [0, 0.6],
      saturation: [100, 200],
      radius: [8, 28],
      grain: [0, 0.12],
    })

    const MATERIALS = Object.freeze(['acrylic', 'mica', 'none'])
    const NATIVE_API =
      typeof window !== 'undefined' && window.dshDesktop && window.dshDesktop.window
        ? window.dshDesktop.window
        : undefined
    const NATIVE_SUPPORTED =
      NATIVE_API !== undefined &&
      typeof NATIVE_API.getMaterial === 'function' &&
      typeof NATIVE_API.setMaterial === 'function'

    const PRESETS = Object.freeze({
      clear: { bgVeil: 0.2, panelBlur: 16, panelTint: 0.16, saturation: 130, grain: 0.02 },
      frosted: { bgVeil: 0.38, panelBlur: 26, panelTint: 0.3, saturation: 145, grain: 0.035 },
      rich: { bgVeil: 0.52, panelBlur: 34, panelTint: 0.44, saturation: 165, grain: 0.05 },
    })

    const DICT = {
      zh: {
        nav: '液态玻璃',
        title: '液态玻璃',
        intro:
          '真实桌面透视：应用窗口使用 Windows 11 Acrylic，桌面、桌面图标和后方窗口实时透出；所有页面都是透明玻璃。',
        preview: '实时预览',
        enabledTitle: '真实桌面透视',
        enabledDesc: '关闭后恢复宿主默认外观，窗口回到不透明；你的玻璃参数会保留。',
        nativeTitle: '真实桌面',
        nativeNote: '材质由 Windows 桌面壳原生提供，不是壁纸图片；需要 Windows 11 22H2 或更高版本。',
        materialTitle: '桌面材质',
        materialDesc: 'Acrylic 实时模糊桌面；Mica 取系统壁纸色调；纯透明不模糊。',
        materialAcrylic: 'Acrylic',
        materialMica: 'Mica',
        materialNone: '纯透明',
        veilTitle: '玻璃遮罩',
        veilDesc: '在桌面和玻璃之间加一层淡色遮罩；越高越清晰，越低越通透。',
        glassTitle: '玻璃',
        glassNote: '控制侧栏、菜单和浮层的磨砂强度、浓度、颜色与形状。',
        panelBlurTitle: '玻璃模糊',
        panelBlurDesc: '侧栏、菜单和弹窗的 backdrop 模糊强度。',
        panelTintTitle: '玻璃浓度',
        panelTintDesc: '玻璃面板的不透明度；越高越像磨砂，越低越像清透玻璃。',
        saturationTitle: '饱和度',
        saturationDesc: '玻璃与桌面的颜色浓度。',
        radiusTitle: '圆角',
        radiusDesc: '玻璃面板、菜单和窗口边框的圆角半径。',
        grainTitle: '颗粒',
        grainDesc: '给玻璃加一点胶片颗粒，减少塑料感。',
        presetsTitle: '预设',
        presetClear: '清透',
        presetFrosted: '磨砂',
        presetRich: '浓郁',
        reset: '恢复默认',
        retry: '重试',
        statusOn: '实时桌面：',
        statusOff: '真实桌面透视已关闭',
        statusUnsupported: '未检测到桌面壳补丁',
        statusFailed: '桌面材质切换失败',
        unsupportedTitle: '需要桌面壳补丁',
        unsupportedDesc:
          '当前窗口没有液态玻璃接口。请先运行 desktop-patch 的 apply，然后重新打开应用。这个插件不会回退到壁纸方案。',
        failedDesc: '桌面材质没有应用成功，窗口已恢复宿主外观。可以重试，或确认 Windows 版本和显卡驱动。',
        footer:
          '当前为真实桌面透视：窗口使用系统 Acrylic / Mica，所有页面为透明玻璃。移动窗口、切换桌面或打开后方窗口都会实时变化。',
        previewNote: '实时玻璃样片',
        statusNative: '实时桌面材质',
        patchHint: '运行 desktop-patch\\apply.cmd 后重启应用。',
      },
      en: {
        nav: 'Liquid Glass',
        title: 'Liquid Glass',
        intro:
          'Real desktop transparency: the window uses Windows 11 Acrylic, and the live desktop, icons, and windows behind it show through every page as translucent glass.',
        preview: 'Live preview',
        enabledTitle: 'Real desktop transparency',
        enabledDesc:
          'Turn off to restore the host appearance; the window becomes opaque. Your glass values are kept.',
        nativeTitle: 'Real desktop',
        nativeNote:
          'The material is provided by the Windows desktop shell, not a wallpaper image. Requires Windows 11 22H2 or newer.',
        materialTitle: 'Desktop material',
        materialDesc: 'Acrylic blurs the live desktop; Mica tints with the system wallpaper; Clear has no blur.',
        materialAcrylic: 'Acrylic',
        materialMica: 'Mica',
        materialNone: 'Clear',
        veilTitle: 'Glass veil',
        veilDesc: 'A light tint between the desktop and the glass; higher is clearer, lower is more transparent.',
        glassTitle: 'Glass',
        glassNote: 'Frost, density, color, and shape of the sidebar, menus, and floating surfaces.',
        panelBlurTitle: 'Glass blur',
        panelBlurDesc: 'Backdrop blur for the sidebar, menus, and dialogs.',
        panelTintTitle: 'Glass density',
        panelTintDesc: 'Opacity of the glass panels; higher feels more frosted, lower feels clearer.',
        saturationTitle: 'Saturation',
        saturationDesc: 'Color intensity of the glass and the desktop.',
        radiusTitle: 'Corner radius',
        radiusDesc: 'Rounding for glass panels, menus, and the window border.',
        grainTitle: 'Grain',
        grainDesc: 'A little film grain keeps the glass from feeling plastic.',
        presetsTitle: 'Presets',
        presetClear: 'Clear',
        presetFrosted: 'Frosted',
        presetRich: 'Rich',
        reset: 'Reset to defaults',
        retry: 'Retry',
        statusOn: 'Live desktop: ',
        statusOff: 'Real desktop transparency is off',
        statusUnsupported: 'Desktop shell patch not detected',
        statusFailed: 'Desktop material failed',
        unsupportedTitle: 'Desktop shell patch required',
        unsupportedDesc:
          'This window has no liquid-glass interface. Run desktop-patch apply first, then reopen the app. This plugin never falls back to a wallpaper.',
        failedDesc:
          'The desktop material did not apply; the host appearance was restored. Retry, or check the Windows version and graphics driver.',
        footer:
          'Real desktop transparency is active: the window uses system Acrylic / Mica and every page is transparent glass. Moving the window, switching desktops, or opening a window behind it changes live.',
        previewNote: 'Live glass sample',
        statusNative: 'Live desktop material',
        patchHint: 'Run desktop-patch\\apply.cmd, then restart the app.',
      },
    }

    const TOKENS = Object.freeze({
      '--dsw-alias-bg-base': { light: 'var(--lg-bg-base)', dark: 'var(--lg-bg-base)' },
      '--dsw-alias-bg-layer-1': { light: 'var(--lg-bg-layer-1)', dark: 'var(--lg-bg-layer-1)' },
      '--dsw-alias-bg-layer-2': { light: 'var(--lg-bg-layer-2)', dark: 'var(--lg-bg-layer-2)' },
      '--dsw-alias-bg-overlay': { light: 'var(--lg-bg-overlay)', dark: 'var(--lg-bg-overlay)' },
      '--dsw-alias-border-l1': { light: 'var(--lg-border-1)', dark: 'var(--lg-border-1)' },
      '--dsw-alias-border-l2': { light: 'var(--lg-border-2)', dark: 'var(--lg-border-2)' },
      '--dsw-specific-sidebar-fill': { light: 'var(--lg-sidebar-fill)', dark: 'var(--lg-sidebar-fill)' },
    })

    const CSS = `
html[data-native-glass] {
  --lg-veil-rgb: 250, 250, 252;
  --lg-panel-rgb: 255, 255, 255;
  --lg-bg-base: rgba(255, 255, 255, .02);
  --lg-bg-layer-1: rgba(var(--lg-panel-rgb), var(--lg-alpha-1, .11));
  --lg-bg-layer-2: rgba(var(--lg-panel-rgb), var(--lg-alpha-2, .17));
  --lg-bg-overlay: rgba(var(--lg-panel-rgb), var(--lg-alpha-overlay, .3));
  --lg-sidebar-glass: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.04));
  --lg-sidebar-fill: var(--lg-native-caption);
  --lg-menu: rgba(255, 255, 255, .6);
  --lg-settings-bg: rgba(255, 255, 255, .3);
  --lg-native-caption: rgba(255, 255, 255, .40);
  --lg-native-scrim: rgba(250, 250, 252, calc(var(--lg-veil-alpha, .44) * .38));
  --lg-border-1: rgba(255, 255, 255, .34);
  --lg-border-2: rgba(255, 255, 255, .48);
  --lg-glass-edge: rgba(255, 255, 255, .45);
  --lg-accent: #3f6fff;
  --lg-noise: none;
}

html[data-native-glass] body[data-ds-dark-theme] {
  --lg-veil-rgb: 8, 10, 14;
  --lg-panel-rgb: 18, 20, 24;
  --lg-bg-base: rgba(8, 10, 14, .05);
  --lg-sidebar-glass: linear-gradient(180deg, rgba(24,26,32,.19), rgba(12,14,18,.07));
  --lg-sidebar-fill: var(--lg-native-caption);
  --lg-menu: rgba(18, 20, 26, .7);
  --lg-settings-bg: rgba(16, 18, 24, .46);
  --lg-native-caption: rgba(10, 12, 16, .36);
  --lg-native-scrim: rgba(8, 10, 14, calc(var(--lg-veil-alpha, .44) * .5));
  --lg-border-1: rgba(255, 255, 255, .10);
  --lg-border-2: rgba(255, 255, 255, .16);
  --lg-glass-edge: rgba(255, 255, 255, .14);
  --lg-accent: #8fb0ff;
}

html[data-native-glass],
html[data-native-glass] body {
  background: transparent !important;
}

html[data-native-glass] body {
  isolation: isolate;
}

html[data-native-glass] #root {
  position: relative;
  z-index: 1;
  background: transparent !important;
}

/* The native Acrylic layer is the only backdrop. This scrim is the only
   thing between the desktop and the UI; no wallpaper image is involved. */
html[data-native-glass] body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: var(--lg-native-scrim);
}

/* Edge-to-edge glass: no inner window frame. The native window corners and
   the Acrylic material carry the shape; the UI has no drawn border. */

html[data-native-glass] [class*='_frame'],
html[data-native-glass] [class*='_centerCol'],
html[data-native-glass] [class*='_mainPanel'],
html[data-native-glass] [class*='_rightCol'],
html[data-native-glass] [class*='_rightbar'] {
  background: transparent !important;
}

html[data-native-glass] [class*='_sidebarCol'] {
  background-color: transparent !important;
  background-image: var(--lg-noise), var(--lg-sidebar-glass) !important;
  border-right: 0 !important;
  -webkit-backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  box-shadow:
    inset -1px 0 0 rgba(255, 255, 255, .06),
    inset 0 1px 0 rgba(255, 255, 255, .12);
}

html[data-native-glass] [class*='_menu'],
html[data-native-glass] [class*='_popover'],
html[data-native-glass] [class*='_dropdown'] {
  background-color: var(--lg-menu) !important;
  background-image: var(--lg-noise) !important;
  border: .5px solid var(--lg-border-1) !important;
  border-radius: var(--lg-radius, 18px) !important;
  -webkit-backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  box-shadow:
    0 18px 48px rgba(0, 0, 0, .22),
    inset 0 1px 0 var(--lg-glass-edge);
}

html[data-native-glass] [class*='_dialog'],
html[data-native-glass] [class*='_modal'] {
  border: .5px solid var(--lg-border-1) !important;
  border-radius: var(--lg-radius, 18px) !important;
  -webkit-backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  box-shadow:
    0 24px 80px rgba(0, 0, 0, .26),
    inset 0 1px 0 var(--lg-glass-edge);
}

html[data-native-glass] [data-shortcut-modal='settings'] {
  background-color: var(--lg-settings-bg) !important;
  background-image: var(--lg-noise) !important;
  border: .5px solid var(--lg-border-1);
  -webkit-backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  box-shadow:
    0 24px 80px rgba(0, 0, 0, .24),
    inset 0 1px 0 var(--lg-glass-edge);
}
/* The settings shell is a body portal: overlay > mask + panel. Keep the mask
   translucent so the live desktop still shows around the panel. */
html[data-native-glass] div:has(> [data-shortcut-modal='settings']) > [class*='_mask'] {
  background: rgba(8, 10, 14, .16) !important;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

html[data-native-glass] [class*='_terminal'],
html[data-native-glass] [class*='_xterm'] {
  background: transparent !important;
}

html[data-native-glass] [class*='_titlebar'],
html[data-native-glass] [class*='_titleBar'],
html[data-native-glass] [class*='_windowBar'] {
  background: transparent !important;
}

html[data-native-glass] [class*='_card'] {
  background-color: var(--lg-bg-layer-1) !important;
  border: .5px solid var(--lg-border-1);
  -webkit-backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  backdrop-filter: blur(var(--lg-panel-blur, 24px)) saturate(var(--lg-saturation, 1.45));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .12);
}

/* Settings page */
.lg-page {
  max-width: 760px;
  padding: 8px 0 56px;
  color: var(--dsw-alias-label-primary);
}
.lg-pageTitle {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 500;
  line-height: 28px;
  letter-spacing: -.01em;
}
.lg-pageIntro {
  max-width: 590px;
  margin: 0 0 22px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.lg-preview {
  position: relative;
  height: 180px;
  overflow: hidden;
  isolation: isolate;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 22px;
  background-color: #0c1018;
  background-image:
    radial-gradient(120% 90% at 12% 10%, #3d5f96 0%, transparent 58%),
    radial-gradient(90% 80% at 88% 18%, #6a477f 0%, transparent 62%),
    radial-gradient(80% 70% at 50% 110%, #1c8f8a 0%, transparent 55%),
    linear-gradient(135deg, #0b0f16 0%, #252c3a 100%);
  background-position: center;
  background-size: cover;
  box-shadow: 0 18px 46px rgba(0, 0, 0, .26), inset 0 1px 0 rgba(255, 255, 255, .18);
}
.lg-previewVeil {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--lg-native-scrim, rgba(10, 14, 20, .2));
  -webkit-backdrop-filter: blur(6px) saturate(1.2);
  backdrop-filter: blur(6px) saturate(1.2);
}
.lg-previewInner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  box-sizing: border-box;
  padding: 18px 20px;
}
.lg-previewLabel {
  color: rgba(255, 255, 255, .86);
  font-size: 11px;
  letter-spacing: .08em;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0, 0, 0, .28);
}
.lg-previewTiles {
  display: flex;
  gap: 12px;
}
.lg-previewTile {
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  border: .5px solid rgba(255, 255, 255, .42);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(255, 255, 255, .24), rgba(255, 255, 255, .06));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .55), 0 10px 26px rgba(0, 0, 0, .22);
  -webkit-backdrop-filter: blur(18px) saturate(1.5);
  backdrop-filter: blur(18px) saturate(1.5);
}
.lg-previewTile svg {
  display: block;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, .25));
}
.lg-group {
  margin-top: 26px;
}
.lg-groupHead {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 500;
  line-height: 22px;
}
.lg-groupNote {
  margin: 0 0 6px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.lg-row {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 14px 0;
  border-bottom: .5px solid var(--dsw-alias-border-l2);
}
.lg-row:last-child {
  border-bottom: 0;
}
.lg-rowText {
  flex: 1;
  min-width: 0;
}
.lg-rowWide .lg-control {
  flex-basis: 340px;
}
.lg-label {
  font-size: 14px;
  line-height: 22px;
}
.lg-desc {
  margin-top: 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.lg-control {
  flex: 0 0 244px;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: flex-end;
}
.lg-range {
  width: 100%;
  height: 20px;
  accent-color: var(--lg-accent, #3f6fff);
}
.lg-range[disabled] {
  opacity: .5;
  cursor: default;
}
.lg-value {
  width: 54px;
  flex: none;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.lg-switch {
  position: relative;
  width: 44px;
  height: 26px;
  padding: 0;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  cursor: pointer;
  transition: background .18s ease;
}
.lg-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--dsw-alias-switch-thumb, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .28);
  transition: transform .18s ease;
}
.lg-switch[aria-checked='true'] {
  border-color: transparent;
  background: var(--lg-accent, #3f6fff);
}
.lg-switch[aria-checked='true']::after {
  transform: translateX(18px);
}
.lg-switch[disabled] {
  opacity: .5;
  cursor: default;
}
.lg-seg {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
}
.lg-seg button {
  flex: 1;
  padding: 5px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}
.lg-seg button[aria-pressed='true'] {
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, .14), inset 0 1px 0 rgba(255, 255, 255, .22);
}
.lg-seg button[disabled] {
  opacity: .5;
  cursor: default;
}
.lg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.lg-button {
  padding: 7px 12px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.lg-button:hover {
  background: var(--dsw-alias-bg-layer-2);
}
.lg-button[disabled] {
  opacity: .5;
  cursor: default;
}
.lg-status {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 10px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.lg-dot {
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background: var(--dsw-alias-state-idle-primary);
}
.lg-status[data-status='ready'] .lg-dot {
  background: var(--dsw-alias-state-success-primary);
}
.lg-status[data-status='missing'] .lg-dot {
  background: var(--dsw-alias-state-warn-primary);
}
.lg-footer {
  margin: 26px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.lg-presetRow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.lg-preset {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 7px 11px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.lg-preset:hover {
  background: var(--dsw-alias-bg-layer-2);
}
.lg-presetDot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: .5px solid rgba(255, 255, 255, .5);
  background: var(--lg-sidebar-glass);
}
.lg-preset[data-preset='clear'] .lg-presetDot {
  background: linear-gradient(135deg, #bfe8ff, #5f9dff);
}
.lg-preset[data-preset='frosted'] .lg-presetDot {
  background: linear-gradient(135deg, #e8eef7, #9aa7bd);
}
.lg-preset[data-preset='rich'] .lg-presetDot {
  background: linear-gradient(135deg, #ffc4e1, #8d6bff);
}
.lg-alert {
  margin: 10px 0 0;
  padding: 10px 12px;
  border: .5px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
@media (max-width: 767px) {
  .lg-row {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .lg-control {
    flex: none;
    justify-content: flex-start;
  }
  .lg-preview {
    height: 150px;
  }
  .lg-previewTile {
    width: 62px;
    height: 62px;
    border-radius: 15px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .lg-switch,
  .lg-switch::after {
    transition: none;
  }
}
`

    // ---------------------------------------------------------------------
    // Settings store
    // ---------------------------------------------------------------------

    function clamp(value, min, max, fallback) {
      const number = Number(value)
      if (!Number.isFinite(number)) return fallback
      return Math.min(max, Math.max(min, number))
    }

    function normalizeSettings(input) {
      const raw = input !== null && typeof input === 'object' ? input : {}
      const value = {
        enabled: raw.enabled !== false,
        material: MATERIALS.includes(raw.material) ? raw.material : DEFAULT_SETTINGS.material,
        bgVeil: clamp(raw.bgVeil, ...LIMITS.bgVeil, DEFAULT_SETTINGS.bgVeil),
        panelBlur: clamp(raw.panelBlur, ...LIMITS.panelBlur, DEFAULT_SETTINGS.panelBlur),
        panelTint: clamp(raw.panelTint, ...LIMITS.panelTint, DEFAULT_SETTINGS.panelTint),
        saturation: clamp(raw.saturation, ...LIMITS.saturation, DEFAULT_SETTINGS.saturation),
        radius: clamp(raw.radius, ...LIMITS.radius, DEFAULT_SETTINGS.radius),
        grain: clamp(raw.grain, ...LIMITS.grain, DEFAULT_SETTINGS.grain),
      }
      return Object.freeze(value)
    }

    function loadSettings() {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY)
        return stored === null ? normalizeSettings({}) : normalizeSettings(JSON.parse(stored))
      } catch {
        return normalizeSettings({})
      }
    }

    function createStore() {
      let current = loadSettings()
      const listeners = new Set()
      let timer = 0

      const persist = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
          } catch {
            /* Settings stay in memory when storage is unavailable. */
          }
        }, 120)
      }

      const commit = (next) => {
        if (JSON.stringify(next) === JSON.stringify(current)) return
        current = next
        persist()
        for (const listener of [...listeners]) listener()
      }

      return {
        get: () => current,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        set(key, value) {
          commit(normalizeSettings({ ...current, [key]: value }))
        },
        applyPreset(name) {
          const preset = PRESETS[name]
          if (preset === undefined) return
          commit(normalizeSettings({ ...current, ...preset }))
        },
        reset() {
          commit(normalizeSettings(DEFAULT_SETTINGS))
        },
      }
    }

    // ---------------------------------------------------------------------
    // Native material runtime
    // ---------------------------------------------------------------------

    function makeNoise(alpha) {
      const opacity = clamp(alpha, 0, 0.2, 0.035)
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
        '<filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter>' +
        '<rect width="120" height="120" filter="url(#n)" opacity="' +
        opacity +
        '"/></svg>'
      return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'
    }

    function createNativeRuntime(store, onChange) {
      const listeners = new Set()
      let failed = false
      let lastMaterial = ''
      let disposed = false
      let snapshot = Object.freeze({
        supported: NATIVE_SUPPORTED,
        active: false,
        material: DEFAULT_SETTINGS.material,
        failed: false,
      })

      const emit = (patch) => {
        snapshot = Object.freeze({ ...snapshot, ...patch })
        for (const listener of [...listeners]) listener()
      }

      const removeAttribute = () => {
        document.documentElement.removeAttribute('data-native-glass')
      }

      const fail = () => {
        if (disposed || failed) return
        failed = true
        removeAttribute()
        emit({ active: false, failed: true })
        onChange?.()
      }

      const sync = () => {
        if (!NATIVE_SUPPORTED || disposed) return
        const settings = store.get()
        if (!settings.enabled) {
          failed = false
          if (lastMaterial !== 'none') {
            lastMaterial = 'none'
            removeAttribute()
            emit({ active: false, material: settings.material, failed: false })
            NATIVE_API.setMaterial('none').catch(() => {})
          }
          return
        }
        if (failed) {
          removeAttribute()
          emit({ active: false, failed: true })
          return
        }
        const material = settings.material
        if (snapshot.active && lastMaterial === material) return
        lastMaterial = material
        document.documentElement.dataset.nativeGlass = material
        emit({ active: true, material, failed: false })
        NATIVE_API.setMaterial(material).then(
          (result) => {
            if (result === false) fail()
          },
          () => fail(),
        )
      }

      return {
        supported: NATIVE_SUPPORTED,
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        sync,
        retry() {
          failed = false
          lastMaterial = ''
          sync()
        },
        dispose() {
          disposed = true
          if (NATIVE_SUPPORTED) NATIVE_API.setMaterial('none').catch(() => {})
          listeners.clear()
        },
      }
    }

    function applyCssVariables(settings, active) {
      const root = document.documentElement
      if (!active) {
        clearCssVariables()
        return
      }
      root.dataset.nativeGlass = settings.material
      root.style.setProperty('--lg-panel-blur', settings.panelBlur + 'px')
      root.style.setProperty('--lg-saturation', String(settings.saturation / 100))
      root.style.setProperty('--lg-veil-alpha', String(settings.bgVeil))
      root.style.setProperty('--lg-grain-alpha', String(settings.grain))
      root.style.setProperty('--lg-radius', settings.radius + 'px')
      root.style.setProperty('--lg-alpha-1', String(Math.min(0.9, 0.08 + settings.panelTint * 0.6)))
      root.style.setProperty('--lg-alpha-2', String(Math.min(0.95, 0.14 + settings.panelTint * 0.7)))
      root.style.setProperty('--lg-alpha-overlay', String(Math.min(0.98, 0.2 + settings.panelTint * 0.85)))
      root.style.setProperty('--lg-noise', makeNoise(settings.grain))
      if (document.body !== null) {
        document.body.style.setProperty('--lg-sidebar-fill', 'var(--lg-native-caption)')
      }
    }

    function clearCssVariables() {
      const root = document.documentElement
      root.removeAttribute('data-native-glass')
      root.removeAttribute('data-liquid-glass')
      root.removeAttribute('data-lg-source')
      if (document.body !== null) document.body.style.removeProperty('--lg-sidebar-fill')
      for (const name of [
        '--lg-panel-blur',
        '--lg-saturation',
        '--lg-veil-alpha',
        '--lg-grain-alpha',
        '--lg-radius',
        '--lg-alpha-1',
        '--lg-alpha-2',
        '--lg-alpha-overlay',
        '--lg-noise',
        '--lg-pointer-x',
        '--lg-pointer-y',
      ]) {
        root.style.removeProperty(name)
      }
    }

    // ---------------------------------------------------------------------
    // UI controls
    // ---------------------------------------------------------------------

    function Row({ label, desc, wide, children }) {
      return h(
        'div',
        { className: wide ? 'lg-row lg-rowWide' : 'lg-row' },
        h('div', { className: 'lg-rowText' }, h('div', { className: 'lg-label' }, label), desc ? h('div', { className: 'lg-desc' }, desc) : null),
        h('div', { className: 'lg-control' }, children),
      )
    }

    function Switch({ checked, label, onChange, disabled = false }) {
      return h('button', {
        type: 'button',
        className: 'lg-switch',
        role: 'switch',
        'aria-checked': checked ? 'true' : 'false',
        'aria-label': label,
        'aria-disabled': disabled ? 'true' : 'false',
        disabled: disabled || undefined,
        onClick: disabled ? undefined : () => onChange(!checked),
      })
    }

    function Slider({ id, label, value, min, max, step, unit, onChange, disabled = false }) {
      return h(
        React.Fragment,
        null,
        h('input', {
          id,
          className: 'lg-range',
          type: 'range',
          min,
          max,
          step,
          value,
          disabled: disabled || undefined,
          'aria-label': label,
          onChange: disabled ? undefined : (event) => onChange(Number(event.currentTarget.value)),
        }),
        h('span', { className: 'lg-value' }, value + (unit || '')),
      )
    }

    function Segmented({ label, value, options, onChange, disabled = false }) {
      return h(
        'div',
        { className: 'lg-seg', role: 'group', 'aria-label': label },
        options.map((option) =>
          h(
            'button',
            {
              key: option.id,
              type: 'button',
              'aria-pressed': value === option.id ? 'true' : 'false',
              disabled: disabled || undefined,
              onClick: disabled ? undefined : () => onChange(option.id),
            },
            option.label,
          ),
        ),
      )
    }

    function Preview({ t }) {
      return h(
        'div',
        { className: 'lg-preview', 'aria-hidden': 'true' },
        h('div', { className: 'lg-previewVeil' }),
        h(
          'div',
          { className: 'lg-previewInner' },
          h('div', { className: 'lg-previewLabel' }, t('previewNote')),
          h(
            'div',
            { className: 'lg-previewTiles' },
            [0, 1, 2].map((index) =>
              h(
                'div',
                { key: index, className: 'lg-previewTile' },
                h(
                  'svg',
                  { viewBox: '0 0 64 64', width: 32, height: 32, 'aria-hidden': 'true' },
                  h('rect', { x: 6, y: 6, width: 52, height: 52, rx: 16, fill: 'rgba(255,255,255,.18)', stroke: 'rgba(255,255,255,.7)', strokeWidth: 2 }),
                  h('path', {
                    d: 'M18 42c7-13 19-20 28-23-2 10-9 19-20 25',
                    fill: 'none',
                    stroke: 'rgba(255,255,255,.92)',
                    strokeWidth: 3.5,
                    strokeLinecap: 'round',
                  }),
                  h('circle', { cx: 24, cy: 20, r: 3.5, fill: 'rgba(255,255,255,.9)' }),
                ),
              ),
            ),
          ),
        ),
      )
    }

    function LiquidGlassSettings({ t, store, nativeRuntime }) {
      const settings = useSyncExternalStore(store.subscribe, store.get, store.get)
      const native = useSyncExternalStore(nativeRuntime.subscribe, nativeRuntime.getSnapshot, nativeRuntime.getSnapshot)
      const label = typeof t === 'function' ? t : (key) => key
      const set = (key) => (value) => store.set(key, value)
      const supported = native.supported
      const active = supported && native.active && !native.failed
      const materialKey =
        settings.material === 'acrylic'
          ? 'materialAcrylic'
          : settings.material === 'mica'
            ? 'materialMica'
            : 'materialNone'
      const statusKey = !supported
        ? 'statusUnsupported'
        : native.failed
          ? 'statusFailed'
          : active
            ? 'statusNative'
            : 'statusOff'
      const statusState = !supported || native.failed ? 'missing' : active ? 'ready' : 'idle'

      return h(
        'section',
        { className: 'lg-page' },
        h('h2', { className: 'lg-pageTitle' }, label('title')),
        h('p', { className: 'lg-pageIntro' }, label('intro')),
        h(Preview, { t: label }),
        h(
          'div',
          { className: 'lg-group' },
          h('h3', { className: 'lg-groupHead' }, label('nativeTitle')),
          h('p', { className: 'lg-groupNote' }, label('nativeNote')),
          h(
            Row,
            { label: label('enabledTitle'), desc: label('enabledDesc') },
            h(Switch, {
              checked: supported && settings.enabled,
              label: label('enabledTitle'),
              disabled: !supported,
              onChange: set('enabled'),
            }),
          ),
          supported
            ? h(
                Row,
                { label: label('materialTitle'), desc: label('materialDesc'), wide: true },
                h(Segmented, {
                  label: label('materialTitle'),
                  value: settings.material,
                  disabled: !settings.enabled || !active,
                  options: MATERIALS.map((id) => ({
                    id,
                    label: label(id === 'acrylic' ? 'materialAcrylic' : id === 'mica' ? 'materialMica' : 'materialNone'),
                  })),
                  onChange: set('material'),
                }),
              )
            : null,
          supported
            ? h(
                Row,
                { label: label('veilTitle'), desc: label('veilDesc') },
                h(Slider, {
                  id: 'lg-native-veil',
                  label: label('veilTitle'),
                  value: Math.round(settings.bgVeil * 100),
                  min: 0,
                  max: 80,
                  step: 1,
                  unit: '%',
                  disabled: !settings.enabled || !active,
                  onChange: (value) => store.set('bgVeil', value / 100),
                }),
              )
            : null,
          supported
            ? h(
                'p',
                { className: 'lg-status', 'data-status': statusState },
                h('span', { className: 'lg-dot' }),
                h(
                  'span',
                  null,
                  native.failed
                    ? label('statusFailed')
                    : active
                      ? label('statusOn') + label(materialKey)
                      : label('statusOff'),
                ),
              )
            : null,
          !supported
            ? h(
                'div',
                { className: 'lg-alert' },
                h('strong', null, label('unsupportedTitle')),
                h('br'),
                label('unsupportedDesc'),
                h('br'),
                label('patchHint'),
              )
            : native.failed
              ? h(
                  'div',
                  { className: 'lg-alert' },
                  label('failedDesc'),
                  h(
                    'div',
                    { className: 'lg-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'lg-button',
                        onClick: nativeRuntime.retry,
                      },
                      label('retry'),
                    ),
                  ),
                )
              : null,
        ),
        supported
          ? h(
              'div',
              { className: 'lg-group' },
              h('h3', { className: 'lg-groupHead' }, label('glassTitle')),
              h('p', { className: 'lg-groupNote' }, label('glassNote')),
              h(
                Row,
                { label: label('panelBlurTitle'), desc: label('panelBlurDesc') },
                h(Slider, {
                  id: 'lg-panel-blur',
                  label: label('panelBlurTitle'),
                  value: settings.panelBlur,
                  min: LIMITS.panelBlur[0],
                  max: LIMITS.panelBlur[1],
                  step: 1,
                  unit: 'px',
                  disabled: !active,
                  onChange: set('panelBlur'),
                }),
              ),
              h(
                Row,
                { label: label('panelTintTitle'), desc: label('panelTintDesc') },
                h(Slider, {
                  id: 'lg-panel-tint',
                  label: label('panelTintTitle'),
                  value: Math.round(settings.panelTint * 100),
                  min: 0,
                  max: 60,
                  step: 1,
                  unit: '%',
                  disabled: !active,
                  onChange: (value) => store.set('panelTint', value / 100),
                }),
              ),
              h(
                Row,
                { label: label('saturationTitle'), desc: label('saturationDesc') },
                h(Slider, {
                  id: 'lg-saturation',
                  label: label('saturationTitle'),
                  value: settings.saturation,
                  min: LIMITS.saturation[0],
                  max: LIMITS.saturation[1],
                  step: 5,
                  unit: '%',
                  disabled: !active,
                  onChange: set('saturation'),
                }),
              ),
              h(
                Row,
                { label: label('radiusTitle'), desc: label('radiusDesc') },
                h(Slider, {
                  id: 'lg-radius',
                  label: label('radiusTitle'),
                  value: settings.radius,
                  min: LIMITS.radius[0],
                  max: LIMITS.radius[1],
                  step: 1,
                  unit: 'px',
                  disabled: !active,
                  onChange: set('radius'),
                }),
              ),
              h(
                Row,
                { label: label('grainTitle'), desc: label('grainDesc') },
                h(Slider, {
                  id: 'lg-grain',
                  label: label('grainTitle'),
                  value: Math.round(settings.grain * 100),
                  min: 0,
                  max: 12,
                  step: 1,
                  unit: '%',
                  disabled: !active,
                  onChange: (value) => store.set('grain', value / 100),
                }),
              ),
            )
          : null,
        supported
          ? h(
              'div',
              { className: 'lg-group' },
              h('h3', { className: 'lg-groupHead' }, label('presetsTitle')),
              h(
                'div',
                { className: 'lg-presetRow' },
                ['clear', 'frosted', 'rich'].map((id) =>
                  h(
                    'button',
                    {
                      key: id,
                      type: 'button',
                      className: 'lg-preset',
                      'data-preset': id,
                      onClick: () => store.applyPreset(id),
                    },
                    h('span', { className: 'lg-presetDot' }),
                    h('span', null, label(id === 'clear' ? 'presetClear' : id === 'frosted' ? 'presetFrosted' : 'presetRich')),
                  ),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'lg-button',
                    onClick: store.reset,
                  },
                  label('reset'),
                ),
              ),
            )
          : null,
        supported ? h('p', { className: 'lg-footer' }, label('footer')) : null,
      )
    }

    // ---------------------------------------------------------------------
    // Plugin
    // ---------------------------------------------------------------------

    const inject = ['slots', 'theme', 'locale']

    function apply(ctx) {
      if (typeof document === 'undefined') return

      const store = createStore()
      const nativeRuntime = createNativeRuntime(store, () => sync())
      let disposeTokens = null

      const style = document.createElement('style')
      style.dataset.plugin = SOURCE
      style.textContent = CSS

      const syncTokens = (active) => {
        if (ctx.theme === undefined) return
        if (active && disposeTokens === null) {
          try {
            disposeTokens = ctx.theme.overrideTokens(SOURCE, TOKENS)
          } catch {
            disposeTokens = null
          }
        } else if (!active && disposeTokens !== null) {
          disposeTokens()
          disposeTokens = null
        }
      }

      const sync = () => {
        const settings = store.get()
        nativeRuntime.sync()
        const snapshot = nativeRuntime.getSnapshot()
        const active = snapshot.supported && snapshot.active && !snapshot.failed
        applyCssVariables(settings, active)
        syncTokens(active)
      }

      ctx.effect(
        () => {
          document.head.appendChild(style)
          return () => style.remove()
        },
        'liquid-glass: styles',
      )
      ctx.effect(() => ctx.locale.register(NS, DICT), 'liquid-glass: locale')
      ctx.effect(() => {
        sync()
        const unsubscribe = store.subscribe(sync)
        return () => {
          unsubscribe()
          nativeRuntime.dispose()
          if (disposeTokens !== null) {
            disposeTokens()
            disposeTokens = null
          }
          clearCssVariables()
        }
      }, 'liquid-glass: runtime')

      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: SETTINGS_SECTION,
            order: ORDER,
            label: () => ctx.locale.bind(NS)('nav'),
            locale: NS,
            inject: () => ({ store, nativeRuntime, t: ctx.locale.bind(NS) }),
          },
          LiquidGlassSettings,
        ),
      )

      ctx.slots.inject('settings.section.icon', () =>
        ctx.slots.register(
          {
            name: 'settings.section.icon',
            id: SETTINGS_SECTION,
            order: ORDER,
          },
          GlassIcon,
        ),
      )
    }

    function GlassIcon({ size = 16, active = false }) {
      return h(
        'svg',
        {
          viewBox: '0 0 20 20',
          width: size,
          height: size,
          'aria-hidden': 'true',
          style: { display: 'block', color: 'currentColor' },
        },
        h('rect', {
          x: 2.5,
          y: 2.5,
          width: 15,
          height: 15,
          rx: 4.5,
          fill: active ? 'currentColor' : 'none',
          stroke: 'currentColor',
          strokeWidth: 1.3,
          opacity: active ? 0.18 : 1,
        }),
        h('path', {
          d: 'M6 13c1.6-3.4 4.6-5.4 7.2-6.2-.4 2.8-2.2 5.2-5 6.8',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('circle', { cx: 7, cy: 6.6, r: 1, fill: 'currentColor', opacity: 0.8 }),
      )
    }

    return {
      inject,
      apply,
    }
  },
})
