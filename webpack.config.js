module.exports = {
  mode:"production", 
  watch: false,
  entry: {
    
    app :'./client/app.js'
  },
  
  output: {
    path: __dirname + '/build',
    filename: '[name]-bundle.js'
  },
}