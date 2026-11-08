# Verification

This is a sanitized record from the reference machine. Install paths are
shown as `<DSH_DIR>`; personal desktop screenshots are intentionally not
committed.

## Environment

| Item | Value |
| --- | --- |
| DSH Desktop | 0.2.2-rc.1 |
| Electron | 44.7.0 |
| OS | Windows 11 |
| Install dir | `<DSH_DIR>` |
| Plugin | `@local/liquid-glass` 0.2.1 |
| Profile | desktop |

## Fuse check

Sentinel `dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX` followed by:

```
version=1 count=9 states=101100011
```

| # | Fuse | State |
| --- | --- | --- |
| 0 | RunAsNode | on |
| 1 | EnableCookieEncryption | off |
| 2 | EnableNodeOptionsEnvironmentVariable | on |
| 3 | EnableNodeCliInspectArguments | on |
| 4 | **EnableEmbeddedAsarIntegrityValidation** | **off** |
| 5 | **OnlyLoadAppFromAsar** | **off** |
| 6 | LoadBrowserProcessSpecificV8Snapshot | off |
| 7 | GrantFileProtocolExtraPrivileges | on |
| 8 | WasmTrapHandlers | on |

## Extract + patch

```
extracting <DSH_DIR>\resources\app.asar -> <DSH_DIR>\resources\app
extracted 22102 files / 3316 dirs / 441.2 MiB
patching lib/main.js
patching lib/preload-app.cjs
verifying patched app directory
done.
```

- `resources\app\.liquid-glass-patch.json` records the source asar size,
  mtime, version, and SHA-256.
- `package.json` keeps `@deepseek-ai/dsh-desktop`; UTF-8 without BOM.
- `lib/main.js` contains `backgroundMaterial: "acrylic"`,
  `dsh-desktop:window-material`, `mainWindowMaterial`, and the transparent
  title bar overlay.
- `lib/preload-app.cjs` contains
  `window.dshDesktop.window.getMaterial/setMaterial`.

## Apply

```
=== liquid-glass apply requested ===
exe: <DSH_DIR>\DeepSeek Harness.exe
app: <DSH_DIR>\resources\app
stock: <DSH_DIR>\resources\app.asar.liquid-glass-stock
force-closing DeepSeek Harness and renaming app.asar in a tight loop
renamed app.asar -> app.asar.liquid-glass-stock
starting the patched app from resources\app
verified: host runtime loaded from resources\app\dsh
renderer app-path="<DSH_DIR>\resources\app"
apply complete
```

The app was still running from `app.asar` during the extract, so the stock
copy stayed locked until the tight-loop rename in apply. `app.asar` is absent
after the switch; `app.asar.liquid-glass-stock` is present.

## Verify

`verify.ps1` returned `ok: true` for:

- `app.asar` absent, stock backup present
- `resources\app` + `.liquid-glass-patch.json` present
- main / preload SHA-256 match metadata
- stock asar SHA-256 matches metadata
- main IPC/acrylic/overlay markers, preload window API
- plugin package and `client.js` present
- app running; exe path matches

## Plugin registration

The live Client slot inspection showed:

```
settings.section occupants:
  liquid-glass  order 12  active true
```

So the settings section is registered and mounted. The settings launcher sits
at the bottom of the sidebar; on a short window it can be clipped — maximize
the window if the entry is not visible.

## Design adjustment

After the first live run, the drawn window border was removed:

- `#root::after` hairline removed; borderless edge-to-edge window.
- Sidebar hard border removed; faint inset edge only.
- Menu / dialog / settings borders reduced.
- Default glass values moved to `dsh.liquid-glass.v2`: `bgVeil 0.44`,
  `panelTint 0.24`, `saturation 130`, `grain 0.03`.

The red frame visible in some local debugging screenshots is the agent's
desktop-control overlay, not plugin CSS; a normal background screenshot does
not contain it.

## Screenshots

Not committed: the author's capture contains personal desktop content.
See `docs/screenshots/README.md` for a safe capture checklist.
