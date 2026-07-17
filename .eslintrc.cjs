module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended', 'plugin:storybook/recommended', 'plugin:storybook/recommended', 'plugin:storybook/recommended'],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ["@typescript-eslint"],
  root: true,
  // parserOptions: {
  //   "parser": "@babel/eslint-parser",
  //   "requireConfigFile": false
  // },
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    "@typescript-eslint/no-unused-vars": "off",
    // "@typescript-eslint/no-var-requires": "off",
    "react-hooks/exhaustive-deps": "off",
    // default export を許可する
    "import/no-default-export": "off",
    // devDependencies からの import を許可する
    "import/no-extraneous-dependencies": "off"
  },
}
