/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

const createSections = (main, document) => {
  const sections = document.querySelectorAll('.main_content > .section');
  sections.forEach((section) => {
    if (section.textContent.trim() === '') return;
    const hr = document.createElement('hr');
    section.before(hr);
  });
}

const createColumnsBlock = (main, document) => {
  const columnsBlocks = document.querySelectorAll('.col_2:not(.col_2:has(.columns), .col_3:not(.col_3:has(.columns)');
  if (columnsBlocks !== null) {
    columnsBlocks.forEach(cb => {
      const cells = [['Columns']];
      const columns = cb.querySelectorAll('.cell');
      columns.forEach(c => {
        cells.push([c.cloneNode(true)]);
      });
      const block = WebImporter.DOMUtils.createTable(cells, document);
      cb.after(block);
      cb.remove();
    });
  }
}

const boxedH1 = (main, document) => {
  const boxed = document.querySelectorAll('.box:has(h1)');
  boxed.forEach(box => {
    const h1 = box.querySelector('h1');
    const cells = [
      ['Title (boxed)'],
      [h1.cloneNode(true)]
    ]
    const block = WebImporter.DOMUtils.createTable(cells, document);
    h1.after(block);
    h1.remove();
  });
}

const createCarouselBlock = (main, document) => {
  const carousels = document.querySelectorAll('.slides-wrapper');

  carousels.forEach((carousel) => {
    const cells = [['Carousel']];

    const slides = carousel.querySelectorAll('.slides');

    slides.forEach((slide) => {
      const heroOption = slide.querySelector('.hero-option');
      const title = heroOption?.querySelector('h2');
      const text = heroOption?.querySelector('p');
      const link = heroOption?.querySelector('a');

      const content = document.createElement('div');

      if (title) content.append(title.cloneNode(true));
      if (text) content.append(text.cloneNode(true));
      if (link) content.append(link.cloneNode(true));

      const img = slide.querySelector('img');
      if (!img) return;

      if (content.childNodes.length > 0) {
        // Two-column row
        cells.push([
          img.cloneNode(true),
          content
        ]);
      } else {
        // One-column row
        cells.push([
          img.cloneNode(true)
        ]);
      }
    });

    if (cells.length > 1) {
      const block = WebImporter.DOMUtils.createTable(cells, document);
      carousel.after(block);
    }

    carousel.remove();
  });
};



export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @returns {HTMLElement} The root element to be transformed
   */
  transform: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    // define the main element: the one that will be transformed to Markdown
    const main = document.body;
    createColumnsBlock(main, document);
    boxedH1(main, document);
    createSections(main, document);
    createCarouselBlock(main, document);
    // attempt to remove non-content elements
    WebImporter.DOMUtils.remove(main, [
      'header',
      '.header',
      'nav',
      '.nav',
      'footer',
      '.footer',
      'iframe',
      'noscript',
      '.hero_arc',
    ]);

    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
    WebImporter.rules.convertIcons(main, document);

    const ret = [];

    const path = ((u) => {
      let p = new URL(u).pathname;
      if (p.endsWith('/')) {
        p = `${p}index`;
      }
      return decodeURIComponent(p)
        .toLowerCase()
        .replace(/\.html$/, '')
        .replace(/[^a-z0-9/]/gm, '-');
    })(url);

    // multi output import

    // first, the main content
    ret.push({
      element: main,
      path,
    });

    main.querySelectorAll('img').forEach((img) => {
      console.log(img.outerHTML);
      const src = img.src;
      if (src) {
        const u = new URL(src);
        // then, all images
        ret.push({
          from: src,
          path: u.pathname,
        });
        // adjust the src to be relative to the current page
        const imgpath = (u.pathname).toLowerCase().replace('%20', '-').replace(/[^a-z0-9/.]/gm, '-').split('/').pop();
        img.src = `https://content.da.live/jfoxx/mohegansun-da/images/${imgpath}`;
      }
    });

    return ret;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {HTMLDocument} document The document
   * @param {string} url The url of the page imported
   * @param {string} html The raw html (the document is cleaned up during preprocessing)
   * @param {object} params Object containing some parameters given by the import process.
   * @return {string} The path
   */
  generateDocumentPath: ({
    // eslint-disable-next-line no-unused-vars
    document, url, html, params,
  }) => {
    let p = new URL(url).pathname;
    if (p.endsWith('/')) {
      p = `${p}index`;
    }
    return decodeURIComponent(p)
      .toLowerCase()
      .replace(/\.html$/, '')
      .replace(/[^a-z0-9/]/gm, '-');
  },
};