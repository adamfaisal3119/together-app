// Fixes two npm workspace hoisting issues for the native Expo app:
//
// 1. nativewind (hoisted to root) resolves tailwindcss from root (v4), but
//    NativeWind only supports v3. Fix: nested junction inside nativewind's
//    node_modules pointing at the native workspace's local tailwindcss@3.
//
// 2. @expo/router-server (hoisted to root) requires expo-router, but expo-router
//    lives locally in apps/native/node_modules (not hoisted). Fix: junction at
//    root node_modules/expo-router pointing at the native workspace copy.

const fs = require('fs')
const path = require('path')
const root = path.join(__dirname, '..')

function ensureJunction(target, link, label) {
  if (!fs.existsSync(target)) {
    console.log(`[postinstall] ${label}: target not found — skipping`)
    return
  }
  const linkDir = path.dirname(link)
  fs.mkdirSync(linkDir, { recursive: true })
  if (fs.existsSync(link)) {
    const stat = fs.lstatSync(link)
    if (stat.isSymbolicLink() || stat.isDirectory()) return
  }
  fs.symlinkSync(target, link, 'junction')
  console.log(`[postinstall] Created junction: ${label}`)
}

// Fix 1: nativewind -> tailwindcss v3
ensureJunction(
  path.join(root, 'apps/native/node_modules/tailwindcss'),
  path.join(root, 'node_modules/nativewind/node_modules/tailwindcss'),
  'nativewind -> tailwindcss@3'
)

// Fix 2: root -> expo-router (for @expo/router-server typed-routes)
ensureJunction(
  path.join(root, 'apps/native/node_modules/expo-router'),
  path.join(root, 'node_modules/expo-router'),
  'root -> expo-router'
)

// Fix 4: react-native-css-interop (root) requires react-native and react which
// are local to the native workspace. Expose them at root so hoisted packages find them.
ensureJunction(
  path.join(root, 'apps/native/node_modules/react-native'),
  path.join(root, 'node_modules/react-native'),
  'root -> react-native'
)
ensureJunction(
  path.join(root, 'apps/native/node_modules/react'),
  path.join(root, 'node_modules/react'),
  'root -> react'
)

// Fix 3: metro-config loadConfig.js uses `await import(absolutePath)` with a raw
// Windows path (C:\...) which Node.js 22+ ESM loader rejects. Patch it to use
// pathToFileURL so the loader receives a valid file:// URL.
;(function patchMetroLoadConfig() {
  const target = path.join(root, 'apps/native/node_modules/metro-config/src/loadConfig.js')
  if (!fs.existsSync(target)) return
  const src = fs.readFileSync(target, 'utf8')
  const broken = 'await import(absolutePath)'
  const fixed  = "await import(require('url').pathToFileURL(absolutePath).href)"
  if (src.includes(broken)) {
    fs.writeFileSync(target, src.replace(broken, fixed), 'utf8')
    console.log('[postinstall] Patched metro-config loadConfig.js for Node.js 22+ on Windows')
  }
})()
