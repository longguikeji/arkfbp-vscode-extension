//@ts-check

'use strict';

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const TerserPlugin = require('terser-webpack-plugin');


module.exports = function (env, argv) {
  env = env || {};
  env.analyzeBundle = Boolean(env.analyzeBundle);
  env.analyzeDeps = Boolean(env.analyzeDeps);
  env.production = env.analyzeBundle || Boolean(env.production);
  env.optimizeImages = Boolean(env.optimizeImages) || (env.production && !env.analyzeBundle);

  if (!env.optimizeImages && !fs.existsSync(path.resolve(__dirname, 'images/settings'))) {
    env.optimizeImages = true;
  }

  return [getExtensionConfig(env)];
};


function getExtensionConfig(env) {
  return {
    name: 'extension',
    target: 'node',
    mode: env.production ? 'production' : 'development',
    entry: './src/extension.ts',
    node: {
			__dirname: false
		},
    output: {
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    devtool: 'source-map',
    optimization: {
			minimizer: [
				new TerserPlugin({
					cache: true,
					parallel: true,
					sourceMap: true,
					terserOptions: {
						ecma: 8,
						// Keep the class names otherwise @log won't provide a useful name
						// eslint-disable-next-line @typescript-eslint/camelcase
						keep_classnames: true,
						module: true
					}
				})
			]
		},
    externals: {
      vscode: 'commonjs vscode'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules|\.d\.ts$/,
          use: {
						loader: 'ts-loader',
						options: {
							experimentalWatchApi: true,
							transpileOnly: true
						}
					}
        }
      ]
    }
  };
}