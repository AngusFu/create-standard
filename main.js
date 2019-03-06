/*!
 * This file is based on the project `create-esm`:
 * https://github.com/standard-things/create-esm
 */
import { join, resolve } from 'path'
import execa from 'execa'
import { getPackageManager, install } from 'pkg-install'
import { copySync, readFileSync, writeFileSync } from 'fs-extra'

const defaults = function(source, dest) {
  Object.keys(dest || {}).forEach(key => {
    if (key in source === false) {
      source[key] = dest[key]
    }
  })
}

const initFiles = function() {
  copySync(join(__dirname, 'template'), '.')
}

const initPackage = function(pkgManager) {
  const args = process.argv.slice(2).filter(arg => arg.startsWith('-'))
  return execa(pkgManager, ['init', ...args], {
    stdio: 'inherit'
  })
}

const initCommitizen = function(pkgManager) {
  const isYarn = pkgManager === 'yarn'
  let args = 'commitizen init cz-conventional-changelog'.split(/\s{1,}/)
  args = args.concat(isYarn ? ['--yarn', '--dev'] : ['--save-dev'])

  return execa('npx', args, {
    stdio: 'inherit'
  })
}

const installDependencies = function(pkgManager) {
  const dependencies = [
    'husky',
    'prettier',
    'pretty-quick',
    'lint-staged',
    'standard-version',

    'eslint',
    'babel-eslint',
    'eslint-config-prettier',
    'eslint-plugin-prettier',
    'eslint-formatter-friendly',

    'commitizen',
    '@commitlint/cli',
    '@commitlint/config-conventional'
  ]

  console.log('Installing dependencies...')
  return install(dependencies, {
    dev: true,
    prefer: pkgManager
  })
}

const extendPkgJson = function() {
  const pkgPath = resolve('package.json')
  const pkgString = readFileSync(pkgPath, 'utf8')
  const pkgJSON = JSON.parse(pkgString)

  pkgJSON.husky = {
    hooks: {
      'commit-msg': 'commitlint -E HUSKY_GIT_PARAMS',
      'pre-commit': 'pretty-quick --staged && lint-staged'
    }
  }

  pkgJSON['lint-staged'] = {
    linters: {
      '*.{js,jsx}': ['eslint --format friendly']
    },
    ignore: ['**/dist/*.js']
  }

  pkgJSON.commitlint = {
    extends: ['@commitlint/config-conventional']
  }

  const scripts = {
    commit: 'npx git-cz',
    release: 'npx standard-version',
    lint: 'eslint ./src',
    'lint:fix': 'eslint --fix --ext .js,.jsx ./src',
    format: 'pretty-quick --pattern "**/*.*(js|jsx)"'
  }

  if (!pkgJSON.scripts) {
    pkgJSON.scripts = scripts
  } else {
    defaults(pkgJSON.scripts, scripts)
  }

  writeFileSync(pkgPath, JSON.stringify(pkgJSON, null, 2))
}

export function createStandard() {
  return getPackageManager({ cwd: process.cwd() }).then(pkgManager =>
    Promise.resolve()
      .then(() => console.log(''))
      .then(() => initPackage(pkgManager))
      .then(() => installDependencies(pkgManager))
      .then(() => initFiles(pkgManager))
      .then(() => initCommitizen(pkgManager))
      .then(() => extendPkgJson())
  )
}
