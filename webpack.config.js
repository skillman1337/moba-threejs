const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // Development mode
  entry: path.resolve(__dirname, 'src', 'index.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },
  devtool: 'source-map', // Enable source maps for debugging
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      }
    ]
  },
  devServer: {
    static: path.join(__dirname, 'public'),
    compress: true,
    port: 3000,
    hot: true // Enable hot reloading
  }
  // resolve: {
  //     alias: {
  //     components: path.resolve(__dirname, 'src/components')
  //     },
  //     extensions: ['.js', '.jsx']
  // }
};
