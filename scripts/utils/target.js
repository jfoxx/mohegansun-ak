import { getMetadata, loadBlock } from '../ak.js';

function setTargetPageParams() {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.text = `
      function targetPageParams() {
        return {
          "at_property": "ca9df9f8-e7d6-9f5f-505d-5cb876c8287c"
        };
      }
    `;
    document.head.appendChild(script);
  }
  
  function initATJS(path, config) {
    window.targetGlobalSettings = config;
    return new Promise((resolve) => {
      import(path).then(resolve);
    });
  }
  
  function onDecoratedElement(fn) {
    // Apply propositions to all already decorated blocks/sections
    if (document.querySelector('[data-block-status="loaded"],[data-section-status="loaded"]')) {
      fn();
    }
  
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.target.tagName === 'BODY'
        || m.target.dataset.sectionStatus === 'loaded'
        || m.target.dataset.blockStatus === 'loaded')) {
        fn();
      }
    });
    // Watch sections and blocks being decorated async
    observer.observe(document.querySelector('main'), {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-block-status', 'data-section-status'],
    });
    // Watch anything else added to the body
    observer.observe(document.querySelector('body'), { childList: true });
  }
  
  function toCssSelector(selector) {
    return selector.replace(/(\.\S+)?:eq\((\d+)\)/g, (_, clss, i) => `:nth-child(${Number(i) + 1}${clss ? ` of ${clss})` : ''}`);
  }
  
  async function getElementForOffer(offer) {
    const selector = offer.cssSelector || toCssSelector(offer.selector);
    return document.querySelector(selector);
  }
  
  async function getElementForMetric(metric) {
    const selector = toCssSelector(metric.selector);
    return document.querySelector(selector);
  }
  
  function autoDecorateFragment(el) {
    const a = document.createElement('a');
    const href = el.getAttribute('data-fragment');
    a.href = href;
    a.className = 'at-element-marker';
    const fragmentBlock = buildBlock('fragment', a);
    el.replaceWith(fragmentBlock);
    decorateBlock(fragmentBlock);
    return loadBlock(fragmentBlock);
  }
  
  function observeAndDecorateBlocks() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute('data-fragment')) {
            autoDecorateFragment(node);
          }
        });
      });
    });
  
    observer.observe(document.querySelector('main'), {
      childList: true,
      subtree: true,
    });
  }
  
  async function getAndApplyOffers() {
    const response = await window.adobe.target.getOffers({ request: { execute: { pageLoad: {} } } });
    const { options = [], metrics = [] } = response.execute.pageLoad;
    onDecoratedElement(() => {
      window.adobe.target.applyOffers({ response });
      // keeping track of offers that were already applied
      // eslint-disable-next-line no-return-assign
      options.forEach((o) => o.content = o.content.filter((c) => !getElementForOffer(c)));
      // keeping track of metrics that were already applied
      metrics.map((m, i) => (getElementForMetric(m) ? i : -1))
        .filter((i) => i >= 0)
        .reverse()
        .map((i) => metrics.splice(i, 1));
    });
  }
  
  // eslint-disable-next-line no-unused-vars
  let atjsPromise = Promise.resolve();
  if (getMetadata('target')) {
    setTargetPageParams();
    // eslint-disable-next-line no-unused-vars
    atjsPromise = initATJS('../at.js', {
      clientCode: 'foxx',
      serverDomain: 'foxx.tt.omtrdc.net',
      imsOrgId: '4009236F6182AB170A495EC3@AdobeOrg',
      bodyHidingEnabled: false,
      cookieDomain: window.location.hostname,
      pageLoadEnabled: false,
      secureOnly: true,
      viewsEnabled: false,
      withWebGLRenderer: false,
    });
    document.addEventListener('at-library-loaded', () => {
      observeAndDecorateBlocks();
      getAndApplyOffers();
    });
  }