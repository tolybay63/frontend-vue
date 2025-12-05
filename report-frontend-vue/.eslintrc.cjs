module.exports = {
  root: true,
  env: { browser: true, es2021: true },
  extends: ['eslint:recommended', 'plugin:vue/vue3-recommended', 'prettier'],
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  rules: {
    'vue/multi-word-component-names': 'off',
  },
}
