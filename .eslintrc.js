module.exports = {
  root: true,
  extends: ['@react-native'],
  env: {
    jest: true,
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react-native/no-inline-styles': 'off',
  },
};
