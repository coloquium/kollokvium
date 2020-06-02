const Path = require('path');
const Webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const sourceFolder = Path.resolve(__dirname, 'src');
const outFolder = Path.resolve(__dirname, 'dist', 'client');
const assetFolders = ['css', 'img', 'js'];

const package = require('./package.json');

module.exports = {
  watch: false,
 /// mode: process.env.WEBPACK_DEV_SERVER ? "development" : "production",
  mode:"production",
  entry: {
    kollkovium: Path.join(sourceFolder, 'client', 'app'),
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader'
        }
      },
    ],
  },
  plugins: [

    new CopyPlugin(assetFolders.map(folder => new Object({ from: Path.join(sourceFolder, folder), to: folder }))),

    new HtmlWebpackPlugin({
      template: Path.join(sourceFolder, 'index.html')
    }),
    new Webpack.DefinePlugin({
      'process.env.APPINSIGHTS_INSTRUMENTATIONKEY': JSON.stringify(process.env.APPINSIGHTS_INSTRUMENTATIONKEY),
      'process.env.WSS_SERVER_URL': JSON.stringify(process.env.WSS_SERVER_URL),
      'process.env.KOLLOKVIUM_VERSION': JSON.stringify(process.env.KOLLOKVIUM_VERSION || package.version)
    })
  ],
  resolve: {
    extensions: ['.js', '.ts'],
  },
  output: {
    path: outFolder,
    filename: 'js/[name]-bundle.js'
  }
}
