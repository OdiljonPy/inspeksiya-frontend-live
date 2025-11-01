import { prettier } from '@siberiacancode/prettier';

/** @type {import('prettier').Config} */
export default {
  ...prettier,
  plugins: [
    ...(prettier.plugins || []), // Include existing plugins if any
    'prettier-plugin-tailwindcss'
  ]
};
