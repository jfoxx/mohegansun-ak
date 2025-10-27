import { getConfig } from '../ak.js';

export default function loadIcons(icons) {
  for (const icon of icons) {
    const name = icon.classList[1].substring(5);
    const iconPath = `/img/icons/${name}.svg`;
    icon.style.maskImage = `url(${iconPath})`;
  }
}
