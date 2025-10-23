import { getConfig, localizeUrl } from '../../scripts/ak.js';
import ENV from '../../scripts/utils/env.js';
import { loadFragment } from '../fragment/fragment.js';

const config = getConfig();

async function removeSchedule(a, e) {
  if (ENV === 'prod') {
    a.remove();
    return;
  }
  if (e) config.log(e);
  config.log(`Could not load: ${a.href}`);
}

async function loadEvent(a, event) {
  try {
    if (!event.fragment) {
      a.remove();
      return;
    }
    const url = new URL(event.fragment);
    const localized = localizeUrl({ config, url });
    const path = localized?.pathname || url.pathname;
    const fragment = await loadFragment(path);

    let count = 0;
    let current = a;
    const parent = a.closest('.section');

    // Walk up the DOM tree from child to parent
    while (current && current !== parent) {
      current = current.parentElement;
      if (current && current !== parent) {
        count += 1;
      }
    }

    // Do 1:1 swap if parent is a section
    if (count === 2) {
      const sections = fragment.querySelectorAll(':scope > .section');
      for (const section of sections) {
        parent.insertAdjacentElement('afterend', section);
      }
      parent.remove();
      return;
    }

    a.parentElement.replaceChild(fragment, a);
  } catch (e) {
    removeSchedule(a, e);
  }
}

function getDate() {
  const now = Date.now();
  if (ENV === 'prod') return now;

  // Attempt a simulated schedule
  const sim = localStorage.getItem('aem-schedule')
   || new URL(window.location.href).searchParams.get('schedule');
  return sim * 1000 || now;
}

export default async function init(a) {
  const resp = await fetch(a.href);
  if (!resp.ok) {
    await removeSchedule(a);
    return;
  }
  const { data } = await resp.json();
  // Look
  data.reverse();
  const now = getDate();
  const found = data.find((evt) => {
    try {
      const start = Date.parse(evt.start);
      const end = Date.parse(evt.end);
      return now > start && now < end;
    } catch {
      config.log(`Could not get scheduled event: ${evt.name}`);
      return false;
    }
  });

  const event = found || data.find((evt) => !(evt.start && evt.end));
  if (!event) {
    await removeSchedule(a);
    return;
  }

  await loadEvent(a, event);
}
