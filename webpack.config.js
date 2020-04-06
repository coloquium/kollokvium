module.exports = {
  mode:"development", 
  watch: false,
  entry: {    
    kollokvium :'./client/app.js',
  },
  
  output: {
    path: __dirname + '/js',
    filename: '[name]-bundle.js'
  },
}