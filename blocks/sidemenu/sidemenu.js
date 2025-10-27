import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';
import { setColorScheme } from '../section-metadata/section-metadata.js';

const { locale } = getConfig();

const NAV_PATH = '/fragments/nav/header/sidebar';

function makeLink(el) {
  const a = document.createElement('a');
  a.href = '#';
  a.textContent = el.textContent;
  el.textContent = '';
  el.append(a);
}

function toggleItem(el) {
  el.classList.toggle('is-open');
}

/**
 * loads and decorates the header
 * @param {Element} el The header element
 */
export default async function init(el) {
  const path = NAV_PATH;
  try {
    const fragment = await loadFragment(`${locale.prefix}${path}`);
    el.append(fragment);
    const items = el.querySelectorAll('li');
    items.forEach(
      (li) => {
        if (!li.querySelector('a')) {
          if (li.querySelector('p')) {
            makeLink(li.querySelector('p'));
          } else {
            makeLink(li);
          }
        }

        if (li.querySelector('ul')) {
          li.classList.add('has-children');
          const link = li.querySelector('a');
          link.addEventListener('click', (e) => {
            e.preventDefault();
            toggleItem(li);
          });
        }
      },
    );
  } catch (e) {
    throw Error(e);
  }
}
