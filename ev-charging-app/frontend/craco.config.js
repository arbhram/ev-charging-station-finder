module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        /Critical dependency: the request of a dependency is an expression/,
      ];
      return webpackConfig;
    },
  },
  devServer: {
    allowedHosts: "all",
  },
};
