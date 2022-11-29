const Path = require('path');
const Webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

const sourceFolder = Path.resolve(__dirname, 'src');
const outFolder = Path.resolve(__dirname, 'dist');
const assetFolders = ['cert'];

const package = require('./package.json');

module.exports = {
  target: "node",
  mode: process.env.WEBPACK_DEV_SERVER ? "development" : "production",
  watch: false,
  entry: {
    server: Path.join(sourceFolder, 'backend', 'server.ts')
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        loader: "node-loader",
      },      
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader'
        }
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: assetFolders.map(folder => new Object({ from : Path.join(sourceFolder, folder), to: folder}))
    }),
    new Webpack.DefinePlugin({
      'process.env.KOLLOKVIUM_VERSION': JSON.stringify(process.env.KOLLOKVIUM_VERSION || package.version)
    })
  ],
  resolve: {
    extensions: ['.js', '.ts'],
  },
  output: {
    path: outFolder,
    filename: '[name].js'
  },
}