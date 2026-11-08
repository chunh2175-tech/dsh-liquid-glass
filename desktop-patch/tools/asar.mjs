// Minimal, dependency-free Electron ASAR reader/extractor.
// Header layout (Chromium Pickle):
//   u32 = 4            (payload size of the leading size field)
//   u32 = headerSize   (4 + jsonLength; data starts at 8 + headerSize)
//   u32 = jsonLength
//   json bytes
// Entry offsets are relative to dataStart, never to the file start.
import { createReadStream, createWriteStream, promises as fsp } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'

const ASAR_HEADER_FIXED = 12

function parseHeader(prefix, fileSize) {
  // This build uses the 12-byte prefix described above. Parse defensively and
  // fall back to the classic 8-byte layout if the first attempt fails.
  const candidates = []
  if (prefix.length >= 12) {
    const headerSize = prefix.readUInt32LE(4)
    const jsonLength = prefix.readUInt32LE(8)
    candidates.push({
      headerSize,
      jsonLength,
      jsonOffset: 12,
      dataStart: 8 + headerSize,
      layout: 'prefix-12',
    })
  }
  if (prefix.length >= 8) {
    const headerSize = prefix.readUInt32LE(0)
    candidates.push({
      headerSize,
      jsonLength: headerSize - 4,
      jsonOffset: 8,
      dataStart: 8 + headerSize,
      layout: 'classic-8',
    })
  }
  for (const candidate of candidates) {
    if (
      candidate.jsonOffset + candidate.jsonLength > fileSize ||
      candidate.jsonLength <= 0 ||
      candidate.jsonLength > 32 * 1024 * 1024
    ) {
      continue
    }
    candidates.push(candidate)
    return candidate
  }
  throw new Error('no plausible ASAR header layout found')
}

export async function openAsar(asarPath) {
  const stat = await fsp.stat(asarPath)
  const fd = await fsp.open(asarPath, 'r')
  try {
    const prefix = Buffer.alloc(16)
    const { bytesRead } = await fd.read(prefix, 0, 16, 0)
    const header = parseHeader(prefix.subarray(0, bytesRead), stat.size)
    const jsonBytes = Buffer.alloc(header.jsonLength)
    await fd.read(jsonBytes, 0, header.jsonLength, header.jsonOffset)
    const jsonText = jsonBytes.toString('utf8')
    let files
    try {
      files = JSON.parse(jsonText).files
    } catch (error) {
      // Header may be padded: retry on the first JSON brace.
      const brace = jsonText.indexOf('{')
      if (brace < 0) throw error
      files = JSON.parse(jsonText.slice(brace)).files
    }
    return {
      fd,
      files,
      header,
      size: stat.size,
      dataStart: header.dataStart,
      jsonLength: header.jsonLength,
    }
  } catch (error) {
    await fd.close()
    throw error
  }
}

export function* walk(files, base = '') {
  for (const [name, meta] of Object.entries(files)) {
    const relative = base === '' ? name : base + '/' + name
    if (meta.files !== undefined) {
      yield { path: relative, meta }
      yield* walk(meta.files, relative)
    } else {
      yield { path: relative, meta }
    }
  }
}

export async function readEntry(archive, entry) {
  const meta = entry.meta ?? entry
  if (meta.unpacked) throw new Error('entry is unpacked: read from app.asar.unpacked')
  if (meta.link !== undefined) throw new Error('entry is a link: ' + meta.link)
  const size = Number(meta.size ?? 0)
  const offset = Number(meta.offset ?? 0)
  const buffer = Buffer.alloc(size)
  if (size > 0) {
    const { bytesRead } = await archive.fd.read(
      buffer,
      0,
      size,
      archive.dataStart + offset,
    )
    if (bytesRead !== size) throw new Error('short read for ' + entry.path)
  }
  return buffer
}

async function extractFile(archive, entry, outDir, unpackedRoot) {
  const target = join(outDir, entry.path)
  await fsp.mkdir(dirname(target), { recursive: true })
  const meta = entry.meta
  if (meta.link !== undefined) {
    const linkTarget = meta.link
    try {
      await fsp.symlink(linkTarget, target, 'junction')
    } catch {
      // Windows often denies symlink creation without developer mode. Write a
      // small marker so the extraction stays honest instead of failing whole.
      await fsp.writeFile(target + '.link.txt', linkTarget, 'utf8')
    }
    return
  }
  if (meta.unpacked) {
    const source = join(unpackedRoot, entry.path)
    await fsp.copyFile(source, target)
    return
  }
  const size = Number(meta.size ?? 0)
  const source = join(unpackedRoot, '.asar-data', String(entry.path.length))
  // Rarely used helper: read into memory for small files, stream for large.
  if (size <= 8 * 1024 * 1024) {
    const buffer = await readEntry(archive, entry)
    await fsp.writeFile(target, buffer)
    return
  }
  const offset = Number(meta.offset ?? 0)
  await pipeline(
    createReadStream(asarPathOf(archive), {
      start: archive.dataStart + offset,
      end: archive.dataStart + offset + size - 1,
    }),
    createWriteStream(target),
  )
  void source
}

let asarPathRef = ''
function asarPathOf() {
  return asarPathRef
}

export async function extractAll(asarPath, outDir, unpackedRoot) {
  asarPathRef = resolve(asarPath)
  const archive = await openAsar(asarPathRef)
  const entries = [...walk(archive.files)]
  const files = entries.filter((entry) => entry.meta.files === undefined)
  const dirs = entries.filter((entry) => entry.meta.files !== undefined)
  const total = files.reduce((sum, entry) => sum + Number(entry.meta.size ?? 0), 0)
  let done = 0
  let count = 0
  const concurrency = 24
  const queue = [...files]
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift()
      if (entry === undefined) return
      await extractFile(archive, entry, outDir, unpackedRoot)
      done += Number(entry.meta.size ?? 0)
      count += 1
      if (count % 500 === 0) {
        process.stderr.write(
          `extract ${count}/${files.length} files, ${(done / 1024 / 1024).toFixed(1)}/${(total / 1024 / 1024).toFixed(1)} MiB\n`,
        )
      }
    }
  })
  for (const dir of dirs) {
    await fsp.mkdir(join(outDir, dir.path), { recursive: true })
  }
  await fsp.mkdir(outDir, { recursive: true })
  await Promise.all(workers)
  await archive.fd.close()
  return { entries: entries.length, files: files.length, dirs: dirs.length, bytes: total }
}

export async function readOne(asarPath, targetPath) {
  const archive = await openAsar(asarPath)
  try {
    const entry = [...walk(archive.files)].find((candidate) => candidate.path === targetPath)
    if (entry === undefined) return null
    return await readEntry(archive, entry)
  } finally {
    await archive.fd.close()
  }
}

export async function findEntries(asarPath, pattern) {
  const archive = await openAsar(asarPath)
  try {
    return [...walk(archive.files)]
      .map((entry) => entry.path)
      .filter((path) => pattern.test(path))
  } finally {
    await archive.fd.close()
  }
}

if (process.argv[1]?.toLowerCase().endsWith('asar.mjs')) {
  const [cmd, asar, a, b] = process.argv.slice(2)
  if (cmd === 'inspect') {
    const archive = await openAsar(asar)
    const entries = [...walk(archive.files)]
    console.log(
      JSON.stringify(
        {
          size: archive.size,
          dataStart: archive.dataStart,
          header: archive.header,
          entries: entries.length,
          files: entries.filter((entry) => entry.meta.files === undefined).length,
          packageJson: archive.files['package.json'],
          top: Object.keys(archive.files),
        },
        null,
        2,
      ),
    )
    await archive.fd.close()
  } else if (cmd === 'read') {
    const archive = await openAsar(asar)
    const entry = [...walk(archive.files)].find((candidate) => candidate.path === a)
    if (entry === undefined) {
      console.error('not found: ' + a)
      process.exitCode = 1
    } else {
      const buffer = await readEntry(archive, entry)
      if (b !== undefined) await fsp.writeFile(b, buffer)
      else process.stdout.write(buffer)
    }
    await archive.fd.close()
  } else if (cmd === 'extract') {
    const result = await extractAll(asar, a, b ?? join(dirname(asar), 'app.asar.unpacked'))
    console.log(JSON.stringify(result))
  } else if (cmd === 'find') {
    console.log((await findEntries(asar, new RegExp(a))).join('\n'))
  } else {
    console.error('usage: asar.mjs inspect|read|extract|find ...')
    process.exitCode = 2
  }
}
