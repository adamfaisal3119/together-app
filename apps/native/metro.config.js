const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Monorepo: watch root node_modules so Metro can resolve hoisted packages
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

const withNW = withNativeWind(config, { input: './global.css' })

// Force a single React instance.
// extraNodeModules is a fallback (ignored when local node_modules exists), so
// we use resolveRequest which fires before any local resolution.
const rootReact = path.resolve(workspaceRoot, 'node_modules/react')

withNW.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const sub = moduleName === 'react' ? 'index.js' : moduleName.slice('react/'.length)
    return { type: 'sourceFile', filePath: path.join(rootReact, sub) }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNW
