# desktop-patch

把 DeepSeek Harness Desktop 从 `resources\app.asar` 切换到 `resources\app`，只修改安装目录的 `resources`，不修改 exe、签名或安装器。

> This is an unofficial community patch. It targets the MIT-licensed `@deepseek-ai/dsh-desktop` package. DeepSeek Harness is a DeepSeek product; this project is not affiliated with DeepSeek.

## 它做什么

- 在 Windows 主窗口上启用 `backgroundColor: "#00000000"` + `backgroundMaterial: "acrylic"`。
- 通过 `dsh-desktop:window-material` IPC 给渲染层提供 `setBackgroundMaterial`。
- 在 preload 暴露 `window.dshDesktop.window.getMaterial/setMaterial`。
- 把 `titleBarOverlay` 固定为透明，并随原生主题更新 symbolColor。

## 要求

| 项 | 值 |
| --- | --- |
| OS | Windows 11 22H2+（Acrylic） |
| DSH Desktop | 0.2.2-rc.1（Electron 44） |
| Node | 20+（可用 DSH 自带 Node，见下） |
| 安装目录 | 例：`D:\dsh`、`%LOCALAPPDATA%\Programs\DeepSeek Harness` |

脚本只对 **0.2.2-rc.1** 的 main.js / preload-app.cjs 做精确锚点替换；其他版本会中止，不会留下半成品。

## 安全前提：fuse

在 exe 中搜索 ASCII 哨兵 `dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX`，后面的 11 字节是 `version + count + 9 个状态`。本补丁要求：

```
version=1 count=9 states=101100011
EnableEmbeddedAsarIntegrityValidation = off
OnlyLoadAppFromAsar = off
```

复核：

```powershell
node .\desktop-patch\tools\check-fuses.mjs "D:\dsh\DeepSeek Harness.exe"
```

如果这两个 fuse 不是 off，**停止**：说明该方法不适用。

## 快速开始

### 1. 安装插件

先在 DSH 里安装仓库根目录的插件（设置 → 插件，或 `plugin_manager install_bundle <repo>`）。插件在补丁前会显示“需要桌面壳补丁”，不会回退壁纸。

### 2. 解包 + 打补丁（应用可以继续运行）

在仓库根目录执行：

```powershell
node .\desktop-patch\scripts\extract-and-patch.mjs --install-dir "D:\dsh"
```

没有全局 Node 时，用 DSH 自带 Node：

```powershell
& "D:\dsh\resources\runtime\primary-runtime\dependencies\node\bin\node.exe" `
  ".\desktop-patch\scripts\extract-and-patch.mjs" --install-dir "D:\dsh"
```

可选参数：

```powershell
... --asar "D:\dsh\resources\app.asar"
... --app "D:\dsh\resources\app"
... --unpacked "D:\dsh\resources\app.asar.unpacked"
... --force
```

脚本会：

1. 读 asar header；entry 的 `offset` 相对 `8 + headerSize`（dataStart），不是文件绝对偏移。
2. 解包到 `resources\app`，合并 `app.asar.unpacked`。
3. 只改 `lib/main.js` 的 win32 primary 分支（不碰欢迎窗口的 acrylic）。
4. 改 `lib/preload-app.cjs`，加 window API。
5. 写 `.liquid-glass-patch.json`；失败时自动删除生成的 `resources\app`。

### 3. apply（从 Explorer / 外部终端）

**不要从 DSH 内置终端运行 apply.cmd**：DSH 关闭时会把该终端和脚本一起杀掉。双击：

```text
desktop-patch\apply.cmd
```

脚本会自动从正在运行的 `DeepSeek Harness.exe` 找安装目录；如果应用没运行，可以显式指定：

```powershell
.\desktop-patch\apply.cmd -InstallDir "D:\dsh"
```

它会：

1. 等待 20 秒（`-WaitSeconds 0` 跳过）。
2. 清空 `ELECTRON_RUN_AS_NODE` / `NODE_OPTIONS`。
3. 强杀 + 立即重命名紧循环：`app.asar` → `app.asar.liquid-glass-stock`。
4. 从 `resources\app` 重启。
5. 15 秒内如果进程退出，自动回滚 stock。
6. 写 `resources\liquid-glass-apply.log`，记录 host/renderer 实际加载路径。

### 4. 验证

```powershell
.\desktop-patch\verify.cmd
```

检查：`app.asar` 不存在、stock 备份存在、`resources\app` 与元数据存在、main/preload hash、插件安装、进程运行。人工检查：

- 移动窗口、切换桌面、在后方打开白色 Notepad，窗口实时透出。
- 设置 → 液态玻璃：开关、Acrylic/Mica/纯透明、遮罩、玻璃参数。
- 深浅色标题栏可读。
- 重启应用后材质保持。

### 5. 回滚

双击 `desktop-patch\revert.cmd`，或：

```powershell
.\desktop-patch\revert.cmd -InstallDir "D:\dsh"
```

恢复 `app.asar`，把 `resources\app` 移成 `app.liquid-glass-unpacked-<时间戳>`，启动 stock。

## 可选：应用后截图

```powershell
.\desktop-patch\scripts\capture-after.ps1 -DelaySeconds 90
```

等待后截屏到 `resources\liquid-glass-after.png` 并运行 verify 写 `liquid-glass-verify.log`。这是可选的验收辅助，不会修改应用。

## 更新

Desktop 更新会重建 `app.asar`。更新后：

1. 先 `revert.cmd`（如果当前是 patched 状态）。
2. 重新跑 `extract-and-patch.mjs`。
3. 重新 `apply.cmd`。
4. 插件检测不到 `window.dshDesktop.window` 时只提示，不回退壁纸。

## 已知坑

1. asar entry 的 `offset` 相对 dataStart，不是文件绝对偏移。
2. 不要用 PowerShell 的 `LastWriteTimeUtc.Ticks` 和 Unix ms 比较；本脚本用 Node `mtimeMs`。
3. `package.json` 用 UTF-8 无 BOM；Node `writeFile(..., 'utf8')` 不写 BOM。
4. 运行中的 `app.asar` 被锁定；改名必须在强杀紧循环里完成。
5. 在 DSH 内运行 apply 会被 job 一起杀掉；脚本检测到父进程链有 `DeepSeek Harness` 会拒绝执行。
6. `ELECTRON_RUN_AS_NODE=1` 会让 exe 变 Node；apply 会清空。
7. 欢迎窗口本来就有 `backgroundMaterial: "acrylic"`，不要用字符串计数判断主窗口是否已打补丁。
8. 标题栏的 `windowsAppearance` 观察器会用侧栏色覆盖 overlay；补丁把它固定为 `#00000000`，并用 `nativeTheme` 同步 symbolColor。
9. 更新后必须重新解包；旧 `resources\app` 不能复用。

## 文件

```
desktop-patch/
  apply.cmd / revert.cmd / verify.cmd
  scripts/
    extract-and-patch.mjs
    apply.ps1
    revert.ps1
    verify.ps1
    capture-after.ps1
  tools/
    asar.mjs
    check-fuses.mjs
```

## License

MIT。见仓库根目录 `LICENSE`。
