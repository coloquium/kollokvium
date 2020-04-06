const Path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const sourceFolder = 'src';

module.exports = {
  mode:"development", 
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