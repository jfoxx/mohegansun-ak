import { getConfig, loadStyle, loadBlock } from './ak.js';

const { locale } = getConfig();

(async function loadPostLCP() {
  const header = document.querySelector('header');
  if (header) loadBlock(header);
  loadStyle(`https://use.typekit.net/${locale.fonts}`);
}());