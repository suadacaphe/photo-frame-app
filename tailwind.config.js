module.exports = {
  purge: ["./public/**/*.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  darkMode: false, // or 'media' or 'class'

  variants: {
    extend: {},
  },
  plugins: [],
  theme: {
    extend: {
      animation: {
        gradientAnimation: "gradientAnimation 15s ease infinite",
      },
      keyframes: {
        gradientAnimation: {
          "0%": {
            background:
              "linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)",
          },
          "50%": {
            background:
              "linear-gradient(to bottom right, #141e30, #243b55, #243b55)",
          },
          "100%": {
            background:
              "linear-gradient(to bottom right, #0f2027, #203a43, #2c5364)",
          },
        },
      },
    },
  },
};
