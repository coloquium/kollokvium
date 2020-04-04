var path = require('path');

module.exports = {
  mode:"production", 
  watch: false,
  entry: {    
    kollkovium : path.join(__dirname, 'client', 'app.ts'),
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
    path: path.resolve(__dirname, 'build'),
    filename: '[name]-bundle.js'
  },
}