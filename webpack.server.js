var path = require('path');

module.exports = {
  mode: "production",
  target: "node",
  watch: false,
  entry: {    
    server : path.join(__dirname, 'server.ts'),
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
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: '[name].js'
  },
}