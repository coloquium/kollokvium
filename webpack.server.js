var Path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const sourceFolder = 'src';

module.exports = {
  mode: "production",
  target: "node",
  watch: false,
  entry: {
    server: Path.resolve(__dirname, sourceFolder, 'backend', 'server.ts')
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
      { from : Path.join(sourceFolder, 'cert'), to: 'cert' }
    ])
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: Path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
}