import { loadArea, setConfig, getMetadata, getConfig } from './ak.js';

const hostnames = ['authorkit.dev'];

const locales = {
  '': { lang: 'en', fonts: 'oey3xll.css'},
  '/de': { lang: 'de' },
  '/es': { lang: 'es' },
  '/fr': { lang: 'fr' },
  '/hi': { lang: 'hi' },
  '/ja': { lang: 'ja' },
  '/zh': { lang: 'zh' },
};

// Widget patterns to look for
const widgets = [
  { fragment: '/fragments/' },
  { schedule: '/schedules/' },
  { youtube: 'https://www.youtube' },
];

// Blocks with self-managed styles
const components = ['fragment', 'schedule'];

// How to decorate an area before loading it
const decorateArea = ({ area = document }) => {
  const eagerLoad = (parent, selector) => {
    const img = parent.querySelector(selector);
    if (!img) return;
    img.removeAttribute('loading');
    img.fetchPriority = 'high';
  };

  eagerLoad(area, 'img');
};

// Load template JavaScript
async function loadTemplateJS() {
  const template = getMetadata('template');
  if (!template) return;
  
  const { codeBase } = getConfig();
  
  try {
    const mod = await import(`${codeBase}/templates/${template}/${template}.js`);
    if (mod.default) {
      await mod.default();
    }
  } catch (error) {
    // Template JS is optional, only log if it exists but has errors
    if (!error.message.includes('Failed to fetch')) {
      console.error(`Error loading template ${template}:`, error);
    }
  }
}

(async function loadPage() {
  setConfig({ hostnames, locales, widgets, components, decorateArea });
  await loadArea();
  await loadTemplateJS();
}());
