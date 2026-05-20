#!/usr/bin/env bun
/**
 * Post-install script: Creates top-level symlinks for native binary packages
 * that bun leaves in .bun/ without exposing to Node.js resolution.
 *
 * Context: bun stores optional native packages (like lightningcss-darwin-arm64,
 * @rolldown/binding-*) inside node_modules/.bun/ but doesn't create the
 * top-level symlinks that Node.js's require() resolution expects.
 *
 * This script detects and fixes those missing links.
 */

import { existsSync, mkdirSync, readdirSync, readlinkSync, symlinkSync, unlinkSync } from "node:fs";
import { resolve, relative, dirname, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUN_DIR = resolve(ROOT, "node_modules/.bun");
const NM_DIR = resolve(ROOT, "node_modules");

/** Known native binary packages that need top-level symlinks */
const NATIVE_PACKAGES = new Set([
  "lightningcss-darwin-arm64",
  "lightningcss-darwin-x64",
  "lightningcss-linux-x64-gnu",
  "lightningcss-linux-arm64-gnu",
  "lightningcss-win32-x64-msvc",
  "lightningcss-win32-arm64-msvc",
]);

interface NativeDep {
  scopedPkg: string;   // e.g. "@rolldown/binding-darwin-arm64"
  unscopedPkg: string; // e.g. "rolldown-binding-darwin-arm64"
}

/** Scoped packages that follow @org/name pattern */
function findScopedNativeDeps(): NativeDep[] {
  const results: NativeDep[] = [];
  if (!existsSync(BUN_DIR)) return results;

  const entries = readdirSync(BUN_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Match patterns like "@rolldown+binding-darwin-arm64@1.0.0-rc.18"
    // and "@turbo+darwin-arm64@2.9.14"
    const match = entry.name.match(/^@([^+]+)\+(.+)@/);
    if (!match) continue;

    const scope = match[1];     // "rolldown"
    const pkgName = match[2];   // "binding-darwin-arm64" or "darwin-arm64"
    const scoped = `@${scope}/${pkgName}`;

    // Check if the package has a .node binary
    const pkgDir = resolve(BUN_DIR, entry.name, "node_modules", scoped);
    if (!existsSync(pkgDir)) continue;

    const binDir = readdirSync(pkgDir);
    const hasNodeBinary = binDir.some((f) => f.endsWith(".node"));
    if (!hasNodeBinary) continue;

    results.push({ scopedPkg: scoped, unscopedPkg: pkgName });
  }
  return results;
}

function findUnscopedNativeDeps(): string[] {
  const results: string[] = [];
  if (!existsSync(BUN_DIR)) return results;

  const entries = readdirSync(BUN_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // Match patterns like "lightningcss-darwin-arm64@1.32.0"
    const match = entry.name.match(/^([a-z][a-z0-9_-]+)@/);
    if (!match) continue;

    const pkgName = match[1];
    if (!NATIVE_PACKAGES.has(pkgName)) continue;

    const pkgDir = resolve(BUN_DIR, entry.name, "node_modules", pkgName);
    if (!existsSync(pkgDir)) continue;

    const binDir = readdirSync(pkgDir);
    const hasNodeBinary = binDir.some((f) => f.endsWith(".node"));
    if (!hasNodeBinary) continue;

    results.push(pkgName);
  }
  return results;
}

function ensureSymlink(target: string, linkPath: string): boolean {
  // Ensure parent directory exists for scoped packages
  const parentDir = dirname(linkPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }

  // Remove existing symlink/file if it exists
  if (existsSync(linkPath)) {
    try {
      const existing = readlinkSync(linkPath);
      if (existing === target) return false; // Already correct
      unlinkSync(linkPath);
    } catch {
      // Not a symlink or can't read - remove it
      try { unlinkSync(linkPath); } catch {}
    }
  }

  // Use relative symlink if possible for portability
  const relTarget = relative(dirname(linkPath), target);
  symlinkSync(relTarget, linkPath);
  return true;
}

function main() {
  let count = 0;
  const platform = `${process.platform}-${process.arch}`;
  console.log(`🔗 Linking native binaries for ${platform}...`);

  // 1. Unscoped packages (lightningcss-*)
  for (const pkg of findUnscopedNativeDeps()) {
    const bunPkgDir = resolve(BUN_DIR);
    const bunEntries = readdirSync(bunPkgDir, { withFileTypes: true });
    const pkgEntry = bunEntries.find((e) => e.name.startsWith(pkg + "@"));
    if (!pkgEntry) continue;

    const target = resolve(bunPkgDir, pkgEntry.name, "node_modules", pkg);
    const linkPath = resolve(NM_DIR, pkg);

    if (ensureSymlink(target, linkPath)) {
      console.log(`  ✅ ${pkg}`);
      count++;
    }
  }

  // 2. Scoped packages (@rolldown/binding-*, @turbo/darwin-*)
  for (const dep of findScopedNativeDeps()) {
    const bunPkgDir = resolve(BUN_DIR);
    const bunEntries = readdirSync(bunPkgDir, { withFileTypes: true });
    const pkgEntry = bunEntries.find((e) =>
      e.name.startsWith(`@${dep.scopedPkg.replace("/", "+").replace("@", "")}`)
    );
    // More flexible matching: @org+name@version
    const scopedEntry = bunEntries.find((e) => {
      const [orgWithAt, rest] = e.name.split("+");
      const org = orgWithAt.replace("@", "");
      const namePart = rest?.split("@")[0];
      return org === dep.scopedPkg.split("/")[0].replace("@", "") &&
             namePart === dep.scopedPkg.split("/")[1];
    });

    if (!scopedEntry) continue;

    const target = resolve(bunPkgDir, scopedEntry.name, "node_modules", dep.scopedPkg);
    const linkPath = resolve(NM_DIR, dep.scopedPkg);

    if (ensureSymlink(target, linkPath)) {
      console.log(`  ✅ ${dep.scopedPkg}`);
      count++;
    }
  }

  // 3. Also link the main packages that native deps depend on (e.g. lightningcss itself)
  const mainPackages = ["lightningcss"];
  for (const pkg of mainPackages) {
    const bunEntries = readdirSync(BUN_DIR, { withFileTypes: true });
    const pkgEntry = bunEntries.find((e) => e.name.startsWith(pkg + "@"));
    if (!pkgEntry) continue;

    const target = resolve(BUN_DIR, pkgEntry.name, "node_modules", pkg);
    const linkPath = resolve(NM_DIR, pkg);
    if (existsSync(target) && !existsSync(linkPath)) {
      if (ensureSymlink(target, linkPath)) {
        console.log(`  ✅ ${pkg} (main package)`);
        count++;
      }
    }
  }

  if (count === 0) {
    console.log("  No missing native binary links found.");
  } else {
    console.log(`\n✨ Linked ${count} native binary package(s).`);
  }
}

main();
