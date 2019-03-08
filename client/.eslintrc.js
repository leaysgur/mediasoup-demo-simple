module.exports = {
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: [
    'import', 'prettier'
  ],
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'strict': ['error', 'global'],

    'default-case': 'error',
    'no-self-compare': 'error',
    'no-else-return': 'error',
    'no-throw-literal': 'error',
    'no-console': 'off',
    'no-debugger': 'off',
    'no-void': 'error',
    'no-var': 'error',
    'no-new-require': 'error',
    'no-lonely-if': 'error',
    'no-nested-ternary': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 2 }],
    'no-unused-vars': ['error', {'args': 'all', 'argsIgnorePattern': '^_'}],
    'no-unused-expressions': 'off',
    'no-use-before-define': 'off',
    'prefer-const': 'error',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],

    'import/order': 'error',

    'prettier': [
      true, { 'singleQuote': true, 'trailingComma': 'all' },
    ],
  },
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true
  },
};
