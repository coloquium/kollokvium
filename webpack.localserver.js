var Path = require('path');
const sourceFolder = 'src';

module.exports = {
  mode: "development",
  target: "node",
  watch: false,
  entry: Path.resolve(__dirname, sourceFolder, 'backend', 'localserver.ts'),
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
   
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: Path.resolve(__dirname, 'dist'),
    filename: 'localserver.js'
  },
}