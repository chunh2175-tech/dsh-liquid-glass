# B 方案：真实桌面 Acrylic + 全页面液态玻璃

这份文档记录 B 方案的结构、验收点和回滚方式。A 方案（读取并显示桌面壁纸）已彻底移除。

## 结构

```
desktop-patch/                 app.asar 解包 + 主进程/preload 补丁 + apply/revert/verify
client.js                      B-only 客户端：native 材质运行时、设置页、玻璃 CSS
index.js                       Host 半：no-op，无壁纸路由
locale/zh.json, en.json        插件显示名与描述
docs/true-desktop.md           本文
```

## 数据流

1. 主进程 `createWindow(..., primary)` 在 Windows 上创建透明窗口：
   - `titleBarStyle: "hidden"`
   - `titleBarOverlay.color: "#00000000"`
   - `backgroundColor: "#00000000"`
   - `backgroundMaterial: "acrylic"`
2. preload 暴露 `window.dshDesktop.window.getMaterial/setMaterial`。
3. 主进程 IPC `dsh-desktop:window-material` 校验 sender 为主窗口主 frame 且 URL 为 `dsh-app://app/`，调用 `mainWindow.setBackgroundMaterial`。
4. 插件检测 API；存在则给 `<html>` 加 `data-native-glass`，调用 `setMaterial`；不存在则只显示补丁提示。
5. `body::before` 只画 `var(--lg-native-scrim)`；窗口不画内嵌边框，靠 Windows 原生圆角 + Acrylic 材质；侧栏用极淡 inset 高光分隔。token 覆盖让宿主背景透明。

## 验收

- `<DSH_DIR>\resources\app.asar` 不存在，`app.asar.liquid-glass-stock` 存在。
- 主应用从 `<DSH_DIR>\resources\app` 启动（运行时 checkout 为 `...\resources\app\dsh`）。
- 设置 → 液态玻璃 → 真实桌面透视可开关；Acrylic / Mica / 纯透明可切换。
- 移动窗口、切换桌面、打开白色 Notepad，窗口内容实时变化（不是壁纸）。
- 深浅色标题栏都可读；关闭插件恢复宿主。
- `revert.cmd` 能恢复 stock 应用。

## 回滚

```powershell
# 关闭应用后
<DSH_DIR>\resources\app.asar.liquid-glass-stock  ->  app.asar
resources\app                                     ->  app.liquid-glass-unpacked-<timestamp>
```

直接运行 `desktop-patch\revert.cmd`。

## 更新

Desktop 更新会重建 `app.asar`。更新后：

1. 运行 `desktop-patch\scripts\extract-and-patch.mjs --install-dir <DSH_DIR>`（需要新的 app.asar）。
2. 运行 `desktop-patch\apply.cmd`。
3. 插件检测不到 API 时只提示，不回退壁纸。
