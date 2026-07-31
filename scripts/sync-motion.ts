import { createHash } from "node:crypto"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, resolve } from "node:path"

const showcaseRoot = resolve(import.meta.dir, "..")
const archiveRoot = resolve(showcaseRoot, ".packages")
const packageNames = ["opentui-motion", "opentui-toast"] as const
mkdirSync(archiveRoot, { recursive: true })

for (const expectedName of packageNames) {
  const packageRoot = resolve(showcaseRoot, "../" + expectedName)
  const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8")) as {
    name?: string
    version?: string
  }
  if (packageJson.name !== expectedName || !packageJson.version) {
    throw new Error(`Expected the sibling ../${expectedName} package`)
  }

  const archive = resolve(archiveRoot, packageJson.name + "-" + packageJson.version + ".tgz")
  rmSync(archive, { force: true })
  run(["bun", "run", "build"], packageRoot)
  run(["bun", "pm", "pack", "--destination", archiveRoot, "--ignore-scripts"], packageRoot)
  refreshArchiveIntegrity(archive, packageJson.name)
  rmSync(resolve(showcaseRoot, "node_modules", packageJson.name), { recursive: true, force: true })
}

const installCache = mkdtempSync(resolve(tmpdir(), "opentui-showcase-sync-"))
try {
  run(["bun", "install", "--force", "--no-cache", "--omit", "peer", "--cache-dir", installCache], showcaseRoot)
} finally {
  rmSync(installCache, { recursive: true, force: true })
}

function refreshArchiveIntegrity(archivePath: string, packageName: string): void {
  const lockPath = resolve(showcaseRoot, "bun.lock")
  const lock = readFileSync(lockPath, "utf8")
  const marker = `"${packageName}": ["${packageName}@.packages/${basename(archivePath)}"`
  const lines = lock.split("\n")
  const entryIndex = lines.findIndex((line) => line.includes(marker))
  if (entryIndex < 0) return

  const integrity = "sha512-" + createHash("sha512").update(readFileSync(archivePath)).digest("base64")
  const integrityPattern = /"sha512-[^"]+"(?=\],?$)/
  if (!integrityPattern.test(lines[entryIndex]!)) throw new Error(`Could not find the packed ${packageName} integrity`)
  const updatedEntry = lines[entryIndex]!.replace(integrityPattern, `"${integrity}"`)
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
