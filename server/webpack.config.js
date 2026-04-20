const CopyWebpackPlugin = require("copy-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

const path = require("path");

const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  entry: "./src/server.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"], // Load and inject CSS
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),

    new CopyWebpackPlugin({
      patterns: [
        {
          from: "../client/dist",
          to: "./client",
        },
        {
          from: "release_config.json",
          to: "config.json",
        },
        {
          from: "release_readme.md",
          to: "README.md",
        },
      ],
    }),
  ],
  resolve: {
    extensions: [".ts", ".js", ".json"],
  },
  externals: ["bcrypt"], // Avoid bundling Node.js modules
  output: {
    filename: "server.bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  target: "node",
  mode: "production",
};
