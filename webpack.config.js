//@ts-check

'use strict';

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { CleanWebpackPlugin: CleanPlugin } = require('clean-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const CspHtmlPlugin = require('csp-html-webpack-plugin');
const ForkTsCheckerPlugin = require('fork-ts-checker-webpack-plugin');
const HtmlExcludeAssetsPlugin = require('html-webpack-exclude-assets-plugin');
const HtmlInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const HtmlPlugin = require('html-webpack-plugin');
const ImageminPlugin = require('imagemin-webpack-plugin').default;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = function (env, argv) {
  env = env || {};
  env.analyzeBundle = Boolean(env.analyzeBundle);
  env.analyzeDeps = Boolean(env.analyzeDeps);
  env.production = env.analyzeBundle || Boolean(env.production);
  env.optimizeImages = Boolean(env.optimizeImages) || (env.production && !env.analyzeBundle);

  if (!env.optimizeImages && !fs.existsSync(path.resolve(__dirname, 'images/settings'))) {
    env.optimizeImages = true;
  }

  return [getExtensionConfig(env), getWebviewConfig(env)];
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

function getWebviewConfig(env) {
	const clean = ['**/*'];
	if (env.optimizeImages) {
		console.log('Optimizing images (src/webviews/apps/images/preview/*.png)...');
		clean.push(path.resolve(__dirname, 'images/preview/*'));
	}

	const cspPolicy = {
		'default-src': "'none'",
		'img-src': ['vscode-resource:', 'https:', 'data:'],
		'script-src': ['vscode-resource:', "'nonce-Z2l0bGVucy1ib290c3RyYXA='"],
		'style-src': ['vscode-resource:']
	};

	if (!env.production) {
		cspPolicy['script-src'].push("'unsafe-eval'");
	}

	/**
	 * @type any[]
	 */
	const plugins = [
		new CleanPlugin({ cleanOnceBeforeBuildPatterns: clean }),
		new ForkTsCheckerPlugin({
			tsconfig: path.resolve(__dirname, 'tsconfig.webviews.json'),
			async: false,
			eslint: true
		}),
		new MiniCssExtractPlugin({
			filename: '[name].css'
		}),
		new HtmlPlugin({
			excludeAssets: [/.+-styles\.js/],
			excludeChunks: ['settings'],
			template: 'preview/public/index.html',
			filename: path.resolve(__dirname, 'dist/webviews/preview.html'),
			inject: true,
			inlineSource: env.production ? '.css$' : undefined,
			cspPlugin: {
				enabled: true,
				policy: cspPolicy,
				nonceEnabled: {
					'script-src': true,
					'style-src': true
				}
			},
			minify: env.production
				? {
						removeComments: true,
						collapseWhitespace: true,
						removeRedundantAttributes: false,
						useShortDoctype: true,
						removeEmptyAttributes: true,
						removeStyleLinkTypeAttributes: true,
						keepClosingSlash: true,
						minifyCSS: true
				  }
				: false
		}),
		new HtmlExcludeAssetsPlugin(null),
		new CspHtmlPlugin(),
		new ImageminPlugin({
			disable: !env.optimizeImages,
			externalImages: {
				context: path.resolve(__dirname, 'src/webviews/apps/images'),
				sources: glob.sync('src/webviews/apps/images/preview/*.png'),
				destination: path.resolve(__dirname, 'images')
			},
			cacheFolder: path.resolve(__dirname, 'node_modules', '.cache', 'imagemin-webpack-plugin'),
			gifsicle: null,
			jpegtran: null,
			optipng: null,
			pngquant: {
				quality: '85-100',
				speed: env.production ? 1 : 10
			},
			svgo: null
		}),
		new HtmlInlineSourcePlugin(null),
		new VueLoaderPlugin()
	];

	return {
		name: 'webviews',
		context: path.resolve(__dirname, 'src/webviews/apps'),
		entry: {
			'main-styles': ['./scss/main.scss'],
			preview: ['./preview/src/main.ts']
		},
		mode: env.production ? 'production' : 'development',
		devtool: env.production ? undefined : 'eval-source-map',
		node: { global: true, fs: 'empty' },
		output: {
			filename: '[name].js',
			path: path.resolve(__dirname, 'dist/webviews'),
			publicPath: '#{root}/dist/webviews/'
		},
		module: {
			rules: [
				{
					exclude: /node_modules|\.d\.ts$/,
					test: /\.tsx?$/,
					use: {
						loader: 'ts-loader',
						options: {
							configFile: 'tsconfig.webviews.json',
							transpileOnly: true
						}
					}
				},
				{
					test: /\.vue?$/,
					use: {
						loader: 'vue-loader',
						options: {
						}
					},
					exclude: /node_modules/
				},
				{
					test: /\.less$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader
						},
						'css-loader', 'less-loader']
				},
				{
					test: /\.scss$/,
					use: [
						{
							loader: MiniCssExtractPlugin.loader
						},
						{
							loader: 'css-loader',
							options: {
								sourceMap: true,
								url: false
							}
						},
						{
							loader: 'sass-loader',
							options: {
								sourceMap: true
							}
						}
					],
					exclude: /node_modules/
				}
			]
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
			modules: [path.resolve(__dirname, 'src/webviews/apps'), 'node_modules']
		},
		plugins: plugins,
		stats: {
			all: false,
			assets: true,
			builtAt: true,
			env: true,
			errors: true,
			timings: true,
			warnings: true
		}
	};
}