// After npm install, nativewind (hoisted to root) resolves tailwindcss from root (v4).
// NativeWind only supports v3, which is installed locally in apps/native/node_modules.
// This script creates a nested node_modules symlink so nativewind finds v3 first.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const target = path.join(root, 'apps/native/node_modules/tailwindcss')
const linkDir = path.join(root, 'node_modules/nativewind/node_modules')
const link = path.join(linkDir, 'tailwindcss')

if (!fs.existsSync(target)) {
  console.log('[fix-nativewind] apps/native/node_modules/tailwindcss not found — skipping')
  process.exit(0)
}

fs.mkdirSync(linkDir, { recursive: true })

if (fs.existsSync(link)) {
  const stat = fs.lstatSync(link)
  if (stat.isSymbolicLink() || stat.isDirectory()) {
    console.log('[fix-nativewind] junction already exists — skipping')
    process.exit(0)
  }
}

fs.symlinkSync(target, link, 'junction')
console.log('[fix-nativewind] Created junction: nativewind -> tailwindcss v3')
