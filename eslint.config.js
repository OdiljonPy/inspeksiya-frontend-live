import { eslint } from '@siberiacancode/eslint';
// import pluginTanstackQuery from '@tanstack/eslint-plugin-query';

export default eslint(
  {
    typescript: true,
    react: true,
    jsx: true,
    rules: {
      'siberiacancode-react/jsx-no-undef': 'off',
      'react/no-unstable-default-props': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      'react/no-unstable-context-value': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
      'ts/ban-ts-comment': 'off',
      'node/prefer-global/process': 'off',
      'react/no-array-index-key': 'off',
      'react-dom/no-missing-button-type': 'off',
      'react-refresh/only-export-components': 'off',
      'react/no-nested-components': 'off',
      'react/no-nested-component-definitions': 'off'
    }
  },
  // {
  //   name: 'tanstack-query',
  //   plugins: {
  //     '@tanstack/query': pluginTanstackQuery
  //   },
  //   rules: {
  //     ...pluginTanstackQuery.configs.recommended.rules,
  //     '@tanstack/query/exhaustive-deps': 'warn'
  //   }
  // },
);
