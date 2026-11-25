import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { removeExactDuplicateRules } from './scripts/removeExactDuplicateCss.mjs';

export default {
  plugins: [tailwindcss(), autoprefixer(), removeExactDuplicateRules()]
};
