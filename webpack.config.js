const Path = require('path');
const Webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const sourceFolder = 'src';
console.log(process.env.WSS_SERVER_URL);

module.exports = {
  mode:"production", 
  watch: false,
  entry: {    
    kollkovium : Path.resolve(__dirname, sourceFolder, 'client', 'app.ts'),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            allowTsInNodeModules: 'true'
          }
        }
      },
    ],
  },
  plugins: [
    new CopyPlugin([
      { from : Path.join(sourceFolder, 'css'), to: 'css'},
      { from : Path.join(sourceFolder, 'img'), to: 'img' },
    ]),
    new HtmlWebpackPlugin({
      template: Path.join(sourceFolder, 'index.html')
    }),
    new Webpack.DefinePlugin({
      'process.env.WSS_SERVER_URL': JSON.stringify(process.env.WSS_SERVER_URL)
    })
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  
  output: {
    path: Path.resolve(__dirname, 'dist', 'client'),
    filename: 'js/[name]-bundle.js'
  }
}