// Extract the stock Desktop app.asar into resources\app and apply the B-phase
// window patch (transparent Acrylic window + window-material IPC + preload API).
//
// Run this while the app is still running from app.asar: reading the asar is
// safe and resources\app is not loaded yet. `apply.cmd` only performs the
// kill + rename + restart step afterwards.
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, promises as fsp } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { extractAll, openAsar, walk } from '../tools/asar.mjs'

const { values } = parseArgs({
  options: {
    'install-dir': { type: 'string' },
    asar: { type: 'string' },
    app: { type: 'string' },
    unpacked: { type: 'string' },
    force: { type: 'boolean', default: false },
  },
})

function detectInstallDir() {
  const candidates = [
    process.env.DSH_DESKTOP_DIR,
    'D:\\dsh',
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness') : '',
    'C:\\Program Files\\DeepSeek Harness',
  ]
  for (const candidate of candidates) {
    if (candidate && existsSync(join(candidate, 'resources', 'app.asar'))) return candidate
  }
  throw new Error('Could not locate DeepSeek Harness. Pass --install-dir "D:\\path\\to\\app".')
}

const asarPath = resolve(
  values.asar ??
    join(
      values['install-dir'] ? resolve(values['install-dir']) : detectInstallDir(),
      'resources',
      'app.asar',
    ),
)
const installDir = values['install-dir']
  ? resolve(values['install-dir'])
  : dirname(dirname(asarPath))
const appDir = resolve(values.app ?? join(installDir, 'resources', 'app'))
const unpackedDir = resolve(values.unpacked ?? join(installDir, 'resources', 'app.asar.unpacked'))

const MAIN_BLOCK_OLD = `\t\t...process.platform === "win32" && primary ? {
\t\t\ttitleBarStyle: "hidden",
\t\t\ttitleBarOverlay: {
\t\t\t\theight: 40,
\t\t\t\tcolor: chromeFallbackFill(),
\t\t\t\tsymbolColor: nativeTheme.shouldUseDarkColors ? "#f9fafb" : "#0f1115"
\t\t\t}
\t\t} : {},`

const MAIN_BLOCK_NEW = `\t\t...process.platform === "win32" && primary ? {
\t\t\ttitleBarStyle: "hidden",
\t\t\ttitleBarOverlay: {
\t\t\t\theight: 40,
\t\t\t\tcolor: "#00000000",
\t\t\t\tsymbolColor: nativeTheme.shouldUseDarkColors ? "#f9fafb" : "#0f1115"
\t\t\t},
\t\t\tbackgroundColor: "#00000000",
\t\t\tbackgroundMaterial: "acrylic"
\t\t} : {},`

const WINDOWS_APPEARANCE_OLD = `\t\tipcMain.on(DESKTOP_IPC.windowsAppearance, (event, _language, color, symbolColor) => {
\t\t\tif (mainWindow === void 0 || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return;
\t\t\tif (!event.senderFrame.url.startsWith(\`dsh-app://app/\`)) return;
\t\t\tconst validColor = (value) => typeof value === "string" && /^(?:#[\\da-f]{3,8}|rgba?\\([\\d.,%\\s]+\\))$/iu.test(value);
\t\t\tif (validColor(color) && validColor(symbolColor)) mainWindow.setTitleBarOverlay({
\t\t\t\tcolor,
\t\t\t\tsymbolColor
\t\t\t});
\t\t});
\t}`

const WINDOWS_APPEARANCE_NEW = `\t\tipcMain.on(DESKTOP_IPC.windowsAppearance, (event, _language, color, symbolColor) => {
\t\t\tif (mainWindow === void 0 || event.sender !== mainWindow.webContents || event.senderFrame !== mainWindow.webContents.mainFrame) return;
\t\t\tif (!event.senderFrame.url.startsWith(\`dsh-app://app/\`)) return;
\t\t\tconst validColor = (value) => typeof value === "string" && /^(?:#[\\da-f]{3,8}|rgba?\\([\\d.,%\\s]+\\))$/iu.test(value);
\t\t\tif (validColor(color) && validColor(symbolColor)) mainWindow.setTitleBarOverlay({
\t\t\t\tcolor: "#00000000",
\t\t\t\tsymbolColor
\t\t\t});
\t\t});
\t\tipcMain.handle("dsh-desktop:window-material", (event, material) => {
\t\t\tconst window = assertProductSender(event);
\t\t\tif (event.senderFrame === null || !event.senderFrame.url.startsWith(applicationUrl)) throw new Error("desktop material: rejected frame URL");
\t\t\tif (typeof material !== "string" || !["get", "auto", "none", "mica", "acrylic", "tabbed"].includes(material)) throw new Error("desktop material: invalid material");
\t\t\tif (material === "get") return mainWindowMaterial;
\t\t\tif (process.platform !== "win32") return false;
\t\t\ttry {
\t\t\t\twindow.setBackgroundMaterial(material);
\t\t\t\tmainWindowMaterial = material;
\t\t\t\treturn material;
\t\t\t} catch (error) {
\t\t\t\tconsole.warn("desktop material: failed to apply", material, error);
\t\t\t\treturn false;
\t\t\t}
\t\t});
\t}`

const CREATE_WINDOW_ANCHOR = 'function createWindow(preload, show = false, primary = false) {'
const CREATE_WINDOW_DECL = `/** Liquid Glass: the native material currently applied to the primary window. */
let mainWindowMaterial = "acrylic";
${CREATE_WINDOW_ANCHOR}`

const CREATE_MAIN_ANCHOR = '\t\tmainWindow = window;'
const CREATE_MAIN_PATCHED = `\t\tmainWindow = window;
\t\tmainWindowMaterial = "acrylic";`

const TITLEBAR_ANCHOR = '\t\tshortcuts.attach(window);'
const TITLEBAR_PATCHED = `\t\tshortcuts.attach(window);
\t\tif (process.platform === "win32") {
\t\t\tconst syncTitleBar = () => {
\t\t\t\tif (window.isDestroyed()) return;
\t\t\t\twindow.setTitleBarOverlay({
\t\t\t\t\tcolor: "#00000000",
\t\t\t\t\tsymbolColor: nativeTheme.shouldUseDarkColors ? "#f9fafb" : "#0f1115",
\t\t\t\t\theight: 40
\t\t\t\t});
\t\t\t};
\t\t\tnativeTheme.on("updated", syncTitleBar);
\t\t\twindow.on("closed", () => nativeTheme.off("updated", syncTitleBar));
\t\t}`

const PRELOAD_OLD = `\treturn {
\t\tprotocolVersion: 1,
\t\tfileActions: {`

const PRELOAD_NEW = `\treturn {
\t\tprotocolVersion: 1,
\t\twindow: {
\t\t\tgetMaterial: () => electron.ipcRenderer.invoke("dsh-desktop:window-material", "get"),
\t\t\tsetMaterial: (material) => electron.ipcRenderer.invoke("dsh-desktop:window-material", material)
\t\t},
\t\tfileActions: {`

function log(message) {
  process.stdout.write(`[${new Date().toISOString()}] ${message}\n`)
}

function replaceOnce(source, search, replacement, label) {
  const count = source.split(search).length - 1
  if (count !== 1) {
    throw new Error(`${label}: expected exactly 1 match, found ${count}; this Desktop build is not the supported 0.2.2-rc.1 layout`)
  }
  return source.replace(search, replacement)
}

function sha256File(path) {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(path)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
}

async function main() {
  const asarStat = await fsp.stat(asarPath).catch(() => null)
  if (asarStat === null) throw new Error(`app.asar not found: ${asarPath}`)
  if (!asarStat.isFile()) throw new Error(`app.asar is not a file: ${asarPath}`)
  const unpackedStat = await fsp.stat(unpackedDir).catch(() => null)
  if (unpackedStat === null || !unpackedStat.isDirectory()) {
    throw new Error(`app.asar.unpacked not found: ${unpackedDir}`)
  }

  const appStat = await fsp.stat(appDir).catch(() => null)
  if (appStat !== null) {
    if (!values.force) {
      throw new Error(
        `${appDir} already exists. Run revert.cmd first, or pass --force to rebuild it (only safe while app.asar exists).`,
      )
    }
    log(`removing existing ${appDir}`)
    await fsp.rm(appDir, { recursive: true, force: true })
  }

  let created = false
  try {
    const archive = await openAsar(asarPath)
    const packageEntry = [...walk(archive.files)].find((entry) => entry.path === 'package.json')
    if (packageEntry === undefined) throw new Error('app.asar has no top-level package.json')
    const packageBytes = await (async () => {
      const size = Number(packageEntry.meta.size ?? 0)
      const offset = Number(packageEntry.meta.offset ?? 0)
      const buffer = Buffer.alloc(size)
      const { bytesRead } = await archive.fd.read(buffer, 0, size, archive.dataStart + offset)
      if (bytesRead !== size) throw new Error('short read for package.json')
      return buffer
    })()
    await archive.fd.close()
    const stockPackage = JSON.parse(packageBytes.toString('utf8'))
    if (stockPackage.name !== '@deepseek-ai/dsh-desktop') {
      throw new Error(`unexpected package name: ${String(stockPackage.name)}`)
    }
    if (stockPackage.version !== '0.2.2-rc.1') {
      throw new Error(`unsupported Desktop version ${String(stockPackage.version)}; this patch targets 0.2.2-rc.1`)
    }

    log(`extracting ${asarPath} -> ${appDir}`)
    const result = await extractAll(asarPath, appDir, unpackedDir)
    created = true
    log(`extracted ${result.files} files / ${result.dirs} dirs / ${(result.bytes / 1024 / 1024).toFixed(1)} MiB`)

    const mainPath = join(appDir, 'lib', 'main.js')
    const preloadPath = join(appDir, 'lib', 'preload-app.cjs')
    await fsp.access(mainPath)
    await fsp.access(preloadPath)

    log('patching lib/main.js')
    let mainSource = await fsp.readFile(mainPath, 'utf8')
    mainSource = replaceOnce(mainSource, MAIN_BLOCK_OLD, MAIN_BLOCK_NEW, 'primary window material options')
    mainSource = replaceOnce(mainSource, CREATE_WINDOW_ANCHOR, CREATE_WINDOW_DECL, 'createWindow anchor')
    mainSource = replaceOnce(mainSource, CREATE_MAIN_ANCHOR, CREATE_MAIN_PATCHED, 'createMainWindow material state')
    mainSource = replaceOnce(mainSource, TITLEBAR_ANCHOR, TITLEBAR_PATCHED, 'titlebar theme sync')
    mainSource = replaceOnce(mainSource, WINDOWS_APPEARANCE_OLD, WINDOWS_APPEARANCE_NEW, 'windowsAppearance + window-material IPC')
    if (!mainSource.includes('dsh-desktop:window-material')) throw new Error('main.js patch marker missing')
    if (!mainSource.includes('backgroundMaterial: "acrylic"')) throw new Error('main.js acrylic marker missing')
    await fsp.writeFile(mainPath, mainSource, 'utf8')

    log('patching lib/preload-app.cjs')
    let preloadSource = await fsp.readFile(preloadPath, 'utf8')
    preloadSource = replaceOnce(preloadSource, PRELOAD_OLD, PRELOAD_NEW, 'preload window API')
    if (!preloadSource.includes('dsh-desktop:window-material')) throw new Error('preload patch marker missing')
    await fsp.writeFile(preloadPath, preloadSource, 'utf8')

    const [mainHash, preloadHash, sourceHash] = await Promise.all([
      sha256File(mainPath),
      sha256File(preloadPath),
      sha256File(asarPath),
    ])

    const patchMeta = {
      patch: 'liquid-glass-b',
      patchVersion: 2,
      createdAt: new Date().toISOString(),
      source: {
        path: asarPath,
        size: asarStat.size,
        mtimeMs: asarStat.mtimeMs,
        version: stockPackage.version,
        name: stockPackage.name,
        sha256: sourceHash,
      },
      appDir,
      unpackedDir,
      expected: {
        'lib/main.js': mainHash,
        'lib/preload-app.cjs': preloadHash,
      },
      features: [
        'transparent win32 primary window + backgroundMaterial acrylic',
        'dsh-desktop:window-material IPC with sender/frame validation',
        'window.dshDesktop.window.getMaterial/setMaterial preload API',
        'transparent titleBarOverlay with nativeTheme sync',
      ],
    }
    await fsp.writeFile(join(appDir, '.liquid-glass-patch.json'), JSON.stringify(patchMeta, null, 2) + '\n', 'utf8')

    log('verifying patched app directory')
    const checkMain = await fsp.readFile(mainPath, 'utf8')
    const checkPreload = await fsp.readFile(preloadPath, 'utf8')
    if (!checkMain.includes('dsh-desktop:window-material')) throw new Error('verify: main.js IPC marker missing')
    if (!checkMain.includes('backgroundMaterial: "acrylic"')) throw new Error('verify: main.js acrylic marker missing')
    if (!checkMain.includes('mainWindowMaterial')) throw new Error('verify: main.js material state missing')
    if (!checkPreload.includes('setMaterial: (material)')) throw new Error('verify: preload setMaterial missing')
    if (!(await fsp.readFile(join(appDir, 'package.json'), 'utf8')).includes('@deepseek-ai/dsh-desktop')) {
      throw new Error('verify: package.json name missing')
    }

    log('done. resources\\app is ready; run apply.cmd from Explorer/external terminal to switch the live app.')
    log(`stock asar stays untouched: ${asarPath}`)
    log(`patch metadata: ${join(appDir, '.liquid-glass-patch.json')}`)
  } catch (error) {
    if (created) {
      log(`patching failed; removing generated ${appDir}`)
      await fsp.rm(appDir, { recursive: true, force: true }).catch(() => {})
    }
    throw error
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
