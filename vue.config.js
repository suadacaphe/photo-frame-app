const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: "/photo-frame-app/",
});
// vue.config.js
// vue.config.js
const dotenv = require("dotenv");
const webpack = require("webpack");
module.exports = {
  configureWebpack: (config) => {
    if (process.env.NODE_ENV !== "production") {
      const env = dotenv.config().parsed;

      // Modify the config object directly
      config.plugins = config.plugins || []; // Ensure plugins array exists
      config.plugins.push(
        new webpack.DefinePlugin({
          "process.env": {
            ...Object.keys(env).reduce((acc, key) => {
              acc[`${key}`] = JSON.stringify(env[key]); // Add VUE_APP_ prefix
              return acc;
            }, {}),
          },
        })
      );
    }
  },
};
