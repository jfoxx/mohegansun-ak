import { getConfig, loadStyle, loadBlock } from './ak.js';
import setColorTheme from './utils/color-theme.js';

const { locale } = getConfig();

(async function loadPostLCP() {
  setColorTheme();
  const header = document.querySelector('header');
  if (header) loadBlock(header);
  import('./utils/sidemenu.js');
  loadStyle(`https://use.typekit.net/${locale.fonts}`);
}());
