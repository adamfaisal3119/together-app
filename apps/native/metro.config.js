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

// Force a single React instance — the one local to this workspace (19.1.0),
// which matches the version the react-native renderer was compiled against.
// resolveRequest fires before any local resolution (unlike extraNodeModules).
const rootReact = path.resolve(projectRoot, 'node_modules/react')

withNW.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    const sub = moduleName === 'react' ? 'index.js' : moduleName.slice('react/'.length)
    try {
      return { type: 'sourceFile', filePath: require.resolve(path.join(rootReact, sub)) }
    } catch {
      return context.resolveRequest(context, moduleName, platform)
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNW
