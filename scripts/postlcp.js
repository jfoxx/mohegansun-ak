import { getConfig, loadStyle, loadBlock } from './ak.js';
import setColorTheme from './utils/color-theme.js';

const { locale } = getConfig();

export default async function loadPostLCP() {
  setColorTheme();
  const header = document.querySelector('header');
  if (header) await loadBlock(header);
  import('./utils/sidemenu.js');
  loadStyle(`https://use.typekit.net/${locale.fonts}`);
}
