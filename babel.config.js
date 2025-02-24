module.exports = {
  presets: ["react-app"],
  plugins: [
    [
      "@babel/plugin-transform-typescript",
      {
        allowDeclareFields: true,
      },
    ],
  ],
};
