import { getMetadata, loadBlock } from '../ak.js';
import { loadFragment } from '../../blocks/fragment/fragment.js';

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
  
  async function transformPromoToCarouselSlide(fragmentContent, slideEl) {
    // Find the content div (first div in fragment)
    const contentDiv = fragmentContent.querySelector('div');
    if (!contentDiv) return;
    
    // Preserve critical attributes before clearing
    const slideIndex = slideEl.dataset.slideIndex;
    const slideId = slideEl.id;
    const ariaLabelledBy = slideEl.getAttribute('aria-labelledby');
    
    // Clear the slide
    slideEl.innerHTML = '';
    
    // Restore attributes
    if (slideIndex !== undefined) slideEl.dataset.slideIndex = slideIndex;
    if (slideId) slideEl.id = slideId;
    
    // Get the picture from the first paragraph
    const pictureParagraph = contentDiv.querySelector('p:has(picture)');
    const picture = pictureParagraph?.querySelector('picture');
    
    // Create carousel slide image
    const carouselImageDiv = document.createElement('div');
    carouselImageDiv.className = 'carousel-slide-image';
    if (picture) {
      carouselImageDiv.appendChild(picture.cloneNode(true));
    }
    
    // Create carousel slide content
    const carouselContentDiv = document.createElement('div');
    carouselContentDiv.className = 'carousel-slide-content';
    
    // Get all content elements except the picture paragraph
    const heading = contentDiv.querySelector('h1, h2, h3, h4, h5, h6');
    const paragraphs = [...contentDiv.querySelectorAll('p')].filter(p => !p.querySelector('picture'));
    
    if (heading) {
      const clonedHeading = heading.cloneNode(true);
      // Update aria-labelledby with the heading id
      if (clonedHeading.id) {
        slideEl.setAttribute('aria-labelledby', clonedHeading.id);
      }
      carouselContentDiv.appendChild(clonedHeading);
    } else if (ariaLabelledBy) {
      // Restore original if no heading found
      slideEl.setAttribute('aria-labelledby', ariaLabelledBy);
    }
    
    const buttonParagraphs = [];
    const textParagraphs = [];
    
    // Separate button paragraphs from text paragraphs
    paragraphs.forEach((p) => {
      const link = p.querySelector('a');
      if (link) {
        buttonParagraphs.push(p);
      } else if (p.textContent.trim()) {
        textParagraphs.push(p);
      }
    });
    
    // Add text paragraphs
    textParagraphs.forEach((p) => {
      carouselContentDiv.appendChild(p.cloneNode(true));
    });
    
    // Create button group if there are buttons
    if (buttonParagraphs.length > 0) {
      const btnGroup = document.createElement('p');
      btnGroup.className = 'btn-group';
      
      buttonParagraphs.forEach((p, index) => {
        const link = p.querySelector('a');
        if (link) {
          const clonedLink = link.cloneNode(true);
          clonedLink.classList.add('btn');
          
          // Determine button style based on emphasis markup
          const isStrong = p.querySelector('strong');
          const isEm = p.querySelector('em');
          const isStrongEm = isStrong && isEm;
          
          if (isStrongEm) {
            clonedLink.classList.add('btn-accent');
          } else if (isStrong) {
            clonedLink.classList.add('btn-primary');
          } else if (isEm) {
            clonedLink.classList.add('btn-secondary');
          } else {
            // Default to primary for first button, secondary for others
            clonedLink.classList.add(index === 0 ? 'btn-primary' : 'btn-secondary');
          }
          
          btnGroup.appendChild(clonedLink);
          if (index < buttonParagraphs.length - 1) {
            btnGroup.appendChild(document.createTextNode(' '));
          }
        }
      });
      
      carouselContentDiv.appendChild(btnGroup);
    }
    
    slideEl.appendChild(carouselImageDiv);
    slideEl.appendChild(carouselContentDiv);
  }
  
  async function autoDecorateFragment(el) {
    const href = el.getAttribute('data-fragment');
    
    // Check if this is a carousel slide itself or inside one
    const isCarouselSlideItself = el.classList.contains('carousel-slide');
    const parentCarouselSlide = el.parentElement?.closest('.carousel-slide');
    
    if (isCarouselSlideItself && parentCarouselSlide) {
      // Target injected an <li class="carousel-slide"> inside an existing slide
      // Transform the parent slide, not this nested one
      try {
        const fragmentContent = await loadFragment(href);
        await transformPromoToCarouselSlide(fragmentContent, parentCarouselSlide);
        
        // Remove the injected nested slide
        el.remove();
        
        // Trigger carousel to re-initialize or update
        const carousel = parentCarouselSlide.closest('.carousel');
        if (carousel) {
          carousel.dispatchEvent(new CustomEvent('carousel-slide-updated', { 
            detail: { slide: parentCarouselSlide } 
          }));
        }
      } catch (error) {
        console.error('Failed to load carousel fragment:', error);
      }
    } else if (isCarouselSlideItself) {
      // This is a standalone carousel slide with data-fragment
      try {
        const fragmentContent = await loadFragment(href);
        await transformPromoToCarouselSlide(fragmentContent, el);
        
        const carousel = el.closest('.carousel');
        if (carousel) {
          el.removeAttribute('data-fragment');
          carousel.dispatchEvent(new CustomEvent('carousel-slide-updated', { 
            detail: { slide: el } 
          }));
        }
      } catch (error) {
        console.error('Failed to load carousel fragment:', error);
      }
    } else {
      // For non-carousel elements, load fragment directly
      try {
        const fragmentContent = await loadFragment(href);
        el.innerHTML = '';
        el.appendChild(fragmentContent);
      } catch (error) {
        console.error('Failed to load fragment:', error);
      }
    }
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
      options.forEach((o) => {
        if (o.content && Array.isArray(o.content)) {
          o.content = o.content.filter((c) => !getElementForOffer(c));
        }
      });
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