// Read Electron's fuse wire and refuse the asar-unpack route if the two
// relevant fuses are not off.
//
// Wire after the 32-byte sentinel: version (1 byte), count (1 byte), then one
// ASCII '0'/'1' per fuse. The count of 9 is Electron 44's FuseV1Options order.
import { readFileSync } from 'node:fs'

const FUSES = [
  'RunAsNode',
  'EnableCookieEncryption',
  'EnableNodeOptionsEnvironmentVariable',
  'EnableNodeCliInspectArguments',
  'EnableEmbeddedAsarIntegrityValidation',
  'OnlyLoadAppFromAsar',
  'LoadBrowserProcessSpecificV8Snapshot',
  'GrantFileProtocolExtraPrivileges',
  'WasmTrapHandlers',
]

const exe = process.argv[2] ?? 'D:\\dsh\\DeepSeek Harness.exe'
const sentinel = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX', 'ascii')
const bytes = readFileSync(exe)
const offset = bytes.indexOf(sentinel)
if (offset < 0) {
  console.error('sentinel not found in ' + exe)
  process.exit(2)
}
const version = bytes[offset + 32]
const count = bytes[offset + 33]
const states = [...bytes.subarray(offset + 34, offset + 34 + count)].map((value) => value === 0x31)
const names = FUSES.slice(0, count)
const values = Object.fromEntries(names.map((name, index) => [name, states[index]]))
console.log(JSON.stringify({ exe, sentinelOffset: offset, version, count, states: states.map((v) => (v ? '1' : '0')).join(''), fuses: values }, null, 2))
const ok = values.EnableEmbeddedAsarIntegrityValidation === false && values.OnlyLoadAppFromAsar === false
if (!ok) {
  console.error('UNSAFE: EnableEmbeddedAsarIntegrityValidation and OnlyLoadAppFromAsar must both be off')
  process.exit(1)
}
console.log('OK: both asar integrity validation and OnlyLoadAppFromAsar are off')
