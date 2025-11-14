import { getMetadata } from '../ak.js';

export default function setColorTheme() {
    const colorTheme = getMetadata('color-theme');
    if (colorTheme) {
        document.body.classList.add(`color-theme-${colorTheme}`);
    }
}