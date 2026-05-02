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
