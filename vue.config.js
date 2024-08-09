const { defineConfig } = require("@vue/cli-service");
const dotenv = require("dotenv");
const webpack = require("webpack");

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: process.env.NODE_ENV === "production" ? "/" : "/",
  outputDir: "dist",

  // Combine configureWebpack into the main object:
  configureWebpack: (config) => {
    if (process.env.NODE_ENV !== "production") {
      const env = dotenv.config().parsed;

      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env": {
            ...Object.keys(env).reduce((acc, key) => {
              acc[`VUE_APP_${key}`] = JSON.stringify(env[key]);
              return acc;
            }, {}),
          },
        })
      );
    }
  },
});
