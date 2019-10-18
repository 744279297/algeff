import fs from 'fs';
import path from 'path';
import replace from 'rollup-plugin-replace';
import alias from 'rollup-plugin-alias';
import json from 'rollup-plugin-json';
import resolvePlug from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

if (!process.env.TARGET) {
  throw new Error('TARGET package must be specified via --environment flag.');
}

const packagesDir = path.resolve(__dirname, 'packages');
const packageDir = path.resolve(packagesDir, process.env.TARGET);
const name = path.basename(packageDir);
const resolve = p => path.resolve(packageDir, p);
const pkg = require(resolve(`package.json`));
const packageOptions = pkg.buildOptions || {};

// build aliases dynamically
const aliasOptions = { resolve: ['.js'] };
fs.readdirSync(packagesDir).forEach(dir => {
  if (dir === 'algeff') {
    return;
  }
  if (fs.statSync(path.resolve(packagesDir, dir)).isDirectory()) {
    aliasOptions[`@algeff/${dir}`] = path.resolve(
      packagesDir,
      `${dir}/src/index`
    );
  }
});
const aliasPlugin = alias(aliasOptions);

const configs = {
  esm: {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: `es`
  },
  cjs: {
    file: resolve(`dist/${name}.cjs.js`),
    format: `cjs`
  },
  global: {
    file: resolve(`dist/${name}.global.js`),
    format: `iife`
  },
  'esm-browser': {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: `es`
  }
};

const defaultFormats = ['esm', 'cjs'];
const inlineFormats = process.env.FORMATS && process.env.FORMATS.split(',');
const packageFormats =
  inlineFormats || packageOptions.formats || defaultFormats;
const packageConfigs = process.env.PROD_ONLY
  ? []
  : packageFormats.map(format => createConfig(configs[format]));

if (process.env.NODE_ENV === 'production') {
  packageFormats.forEach(format => {
    if (format === 'cjs') {
      packageConfigs.push(createProductionConfig(format));
    }
    if (format === 'global' || format === 'esm-browser') {
      packageConfigs.push(createMinifiedConfig(format));
    }
  });
}

export default packageConfigs;

function createConfig(output, plugins = []) {
  const isProductionBuild =
    process.env.__DEV__ === 'false' || /\.prod\.js$/.test(output.file);
  const isGlobalBuild = /\.global(\.prod)?\.js$/.test(output.file);
  const isBundlerESMBuild = /\.esm-bundler\.js$/.test(output.file);
  const isBrowserESMBuild = /esm-browser(\.prod)?\.js$/.test(output.file);

  console.log(isBundlerESMBuild);

  if (isGlobalBuild) {
    output.name = packageOptions.name;
  }

  const externals = Object.keys(aliasOptions).filter(
    p => p !== '@algeff/shared'
  );

  return {
    input: resolve(`src/index.js`),
    // Global and Browser ESM builds inlines everything so that they can be
    // used alone.
    external: isGlobalBuild || isBrowserESMBuild ? [] : externals,
    plugins: [
      resolvePlug(),
      babel({
        exclude: 'node_modules/**',
        sourceMaps: true,
        rootMode: 'upward'
      }),
      json({
        namedExports: false
      }),
      aliasPlugin,
      createReplacePlugin(isProductionBuild, isBundlerESMBuild),
      ...plugins
    ],
    output,
    onwarn: (msg, warn) => {
      if (!/Circular/.test(msg)) {
        warn(msg);
      }
    }
  };
}

function createReplacePlugin(isProduction, isBundlerESMBuild) {
  return replace({
    __DEV__: isBundlerESMBuild
      ? // preserve to be handled by bundlers
        `process.env.NODE_ENV !== 'production'`
      : // hard coded dev/prod builds
        !isProduction
  });
}

function createProductionConfig(format) {
  return createConfig({
    file: resolve(`dist/${name}.${format}.prod.js`),
    format: configs[format].format
  });
}

function createMinifiedConfig(format) {
  const { terser } = require('rollup-plugin-terser');
  return createConfig(
    {
      file: resolve(`dist/${name}.${format}.prod.js`),
      format: configs[format].format
    },
    [
      terser({
        module: /^esm/.test(format)
      })
    ]
  );
}
