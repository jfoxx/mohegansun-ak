import { loadBlock } from '../ak.js';

const sidemenu = document.createElement('div');
sidemenu.id = 'sidemenu';
sidemenu.className = 'sidemenu';
document.body.prepend(sidemenu);
loadBlock(sidemenu);
