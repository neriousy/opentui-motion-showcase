import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, resolve } from "node:path"

const showcaseRoot = resolve(import.meta.dir, "..")
const packageRoot = resolve(showcaseRoot, "../opentui-motion")
const archiveRoot = resolve(showcaseRoot, ".packages")
const installedRoot = resolve(showcaseRoot, "node_modules/opentui-motion")
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
  name?: string
  version?: string
}

if (packageJson.name !== "opentui-motion" || !packageJson.version) {
  throw new Error("Expected the sibling ../opentui-motion package")
}

const archive = resolve(archiveRoot, packageJson.name + "-" + packageJson.version + ".tgz")
rmSync(archive, { force: true })
mkdirSync(archiveRoot, { recursive: true })

run(["bun", "run", "build"], packageRoot)
run(["bun", "pm", "pack", "--destination", archiveRoot, "--ignore-scripts"], packageRoot)
refreshArchiveIntegrity(archive)
rmSync(installedRoot, { recursive: true, force: true })
const installCache = mkdtempSync(resolve(tmpdir(), "opentui-motion-sync-"))
try {
  run(["bun", "install", "--force", "--no-cache", "--cache-dir", installCache], showcaseRoot)
} finally {
  rmSync(installCache, { recursive: true, force: true })
}

function refreshArchiveIntegrity(archivePath: string): void {
  const lockPath = resolve(showcaseRoot, "bun.lock")
  const lock = readFileSync(lockPath, "utf8")
  const marker = `"${packageJson.name}": ["${packageJson.name}@.packages/${basename(archivePath)}"`
  const lines = lock.split("\n")
  const entryIndex = lines.findIndex((line) => line.includes(marker))
  if (entryIndex < 0) return

  const integrity = "sha512-" + createHash("sha512").update(readFileSync(archivePath)).digest("base64")
  const updatedEntry = lines[entryIndex]!.replace(/"sha512-[^"]+"(?=\],?$)/, `"${integrity}"`)
  if (updatedEntry === lines[entryIndex]) throw new Error("Could not update the packed opentui-motion integrity")
  lines[entryIndex] = updatedEntry
  writeFileSync(lockPath, lines.join("\n"))
}

function run(command: string[], cwd: string): void {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  })
  if (result.exitCode !== 0) process.exit(result.exitCode)
}
