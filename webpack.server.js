var Path = require('path');
const sourceFolder = 'src';

module.exports = {
  mode: "production",
  target: "node",
  watch: false,
  entry: {
    server : Path.resolve(__dirname, sourceFolder, 'backend', 'server.ts'),
  },
  externals: ['utf-8-validate', 'bufferutil'],
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
    path: Path.resolve(__dirname, 'dist', 'backend'),
    filename: '[name].js'
  },
}