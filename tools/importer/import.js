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

/**
 * Extract event information from the page
 */
function extractEventInfo(document) {
  const eventInfo = {};

  // Find event location - look for element with .event_operations_venue class
  const venueElement = document.querySelector('.event_operations_venue');
  if (venueElement) {
    // Extract just the venue name, removing "at" prefix if present
    const venueText = venueElement.textContent.trim();
    eventInfo.location = venueText.replace(/^at\s+/i, '').trim();
  }

  // Find date and time - look for patterns in the page
  const elements = Array.from(document.querySelectorAll('p, div, h2, h3'));
  for (const el of elements) {
    const text = el.textContent.trim();
    
    // Match date patterns like "Thursday, November 20th 2025" or "Friday, July 19th"
    const dateMatch = text.match(/([A-Z][a-z]+day),?\s+([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)(?:\s+(\d{4}))?/i);
    if (dateMatch && !eventInfo.date) {
      const [, , month, day, year] = dateMatch;
      const monthNum = new Date(`${month} 1`).getMonth() + 1;
      const yearValue = year || new Date().getFullYear();
      eventInfo.date = `${monthNum}/${day}/${yearValue}`;
    }

    // Match time patterns like "8:00pm" or "8:00 pm"
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(pm|am)/i);
    if (timeMatch && !eventInfo.time) {
      eventInfo.time = `${timeMatch[1]}:${timeMatch[2]}${timeMatch[3].toLowerCase()}`;
    }
  }

  // Find artist website
  const websiteLink = Array.from(document.querySelectorAll('a')).find(a => 
    a.textContent.match(/view\s+website/i) && !a.href.includes('mohegansun.com')
  );
  if (websiteLink) {
    eventInfo.artistWebsite = websiteLink.href;
  }

  // Find ticket link
  const ticketLink = Array.from(document.querySelectorAll('a')).find(a => 
    a.textContent.match(/purchase\s+tickets|buy\s+tickets/i) || a.href.includes('ticketmaster.com')
  );
  if (ticketLink) {
    eventInfo.tickets = ticketLink.href;
  } else {
    // Check if it's a free event
    const freeText = Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent.match(/admission\s+is\s+free|free\s+admission|no\s+cover/i)
    );
    if (freeText) {
      eventInfo.tickets = 'free';
    }
  }

  // Find on-sale date
  const onsaleText = Array.from(document.querySelectorAll('p, div')).find(el => 
    el.textContent.match(/on-sale/i)
  );
  if (onsaleText) {
    const text = onsaleText.textContent;
    const onsaleMatch = text.match(/on-sale:?\s*(.+)/i);
    if (onsaleMatch) {
      const dateText = onsaleMatch[1].trim();
      // Try to parse the date
      if (dateText.toLowerCase() === 'now') {
        eventInfo.onsale = 'Now';
      } else {
        // Try to extract MM/DD/YYYY format
        const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          eventInfo.onsale = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
        } else {
          // Try to parse natural date format
          const naturalMatch = dateText.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
          if (naturalMatch) {
            const [, month, day, year] = naturalMatch;
            const monthNum = new Date(`${month} 1`).getMonth() + 1;
            eventInfo.onsale = `${monthNum}/${day}/${year}`;
          }
        }
      }
    }
  }

  return eventInfo;
}

/**
 * Create metadata block for event pages
 */
function createMetadata(main, document, eventInfo, firstParagraph) {
  const meta = {};

  // Template
  meta.template = 'event';

  // Title - from h1 or h2
  const title = main.querySelector('h1, h2');
  if (title) {
    meta.title = title.textContent.trim();
  }

  // Description - from first body paragraph
  if (firstParagraph) {
    meta.description = firstParagraph.textContent.trim();
  }

  // Image - from og:image meta tag
  const metaImage = document.querySelector('meta[property="og:image"]');
  if (metaImage) {
    meta.image = metaImage.content;
  }

  // Event-specific metadata from extracted info
  if (eventInfo.location) {
    meta['event-location'] = eventInfo.location;
  }

  if (eventInfo.date) {
    meta['event-date'] = eventInfo.date;
  }

  if (eventInfo.time) {
    meta['event-time'] = eventInfo.time;
  }

  if (eventInfo.artistWebsite) {
    meta['artist-website'] = eventInfo.artistWebsite;
  }

  if (eventInfo.tickets) {
    meta.tickets = eventInfo.tickets;
  }

  if (eventInfo.onsale) {
    meta.onsale = eventInfo.onsale;
  }

  // Color theme - default to purple
  meta['color-theme'] = 'purple';

  // Create metadata block
  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);

  return meta;
}

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
  transformDOM: ({ document, url, html, params }) => {
    // Check if this is an event page
    const isEventPage = url.includes('/schedule-of-events/') || 
                       url.includes('/events-and-promotions/');

    if (!isEventPage) {
      // For non-event pages, use default transformation
      return document.body;
    }

    // Extract event information
    const eventInfo = extractEventInfo(document);

    // Use helper to remove header, footer and other elements
    WebImporter.DOMUtils.remove(document, [
      'header',
      'footer',
      'nav',
      '.header',
      '.footer',
      '.navigation',
      '.breadcrumb',
      'script',
      'noscript',
      'style',
    ]);

    const main = document.body;

    // Create a new structure for the event page
    const sections = [];

    // Section 1: Hero with image and title
    const heroSection = document.createElement('div');
    
    // Find the main event image
    const mainImage = main.querySelector('img[alt], img[src*="media_"]');
    if (mainImage) {
      const heroDiv = document.createElement('div');
      const heroContent = document.createElement('div');
      const heroPicture = mainImage.closest('picture') || mainImage;
      heroContent.append(heroPicture.cloneNode(true));
      heroDiv.append(heroContent);
      
      // Create hero block
      const heroBlock = WebImporter.DOMUtils.createTable([
        ['Hero'],
        [heroDiv],
      ], document);
      heroSection.append(heroBlock);
    }

    // Add the title
    const title = main.querySelector('h1, h2');
    if (title) {
      heroSection.append(title.cloneNode(true));
    }

    // Add the description/body paragraphs
    const paragraphs = Array.from(main.querySelectorAll('p')).filter(p => {
      const text = p.textContent.trim();
      // Filter out navigation, links, and very short paragraphs
      return text.length > 50 && 
             !text.match(/^(on-sale|view|purchase|at\s+[A-Z])/i) &&
             !p.querySelector('a[href*="ticketmaster"]');
    });

    // Keep reference to first paragraph for metadata description
    const firstParagraph = paragraphs[0];

    paragraphs.forEach(p => {
      heroSection.append(p.cloneNode(true));
    });

    // Add section metadata for center alignment
    const sectionMetadata = WebImporter.DOMUtils.createTable([
      ['Section Metadata'],
      ['text-align', 'center'],
    ], document);
    heroSection.append(sectionMetadata);

    sections.push(heroSection);

    // Section 2: Disclaimers (reference to fragment)
    const disclaimerSection = document.createElement('div');
    const disclaimerLink = document.createElement('a');
    disclaimerLink.href = '/fragments/event-disclaimers';
    disclaimerLink.textContent = '/fragments/event-disclaimers';
    const disclaimerH3 = document.createElement('h3');
    disclaimerH3.append(disclaimerLink);
    disclaimerSection.append(disclaimerH3);
    sections.push(disclaimerSection);

    // Clear main and add sections
    main.innerHTML = '';
    sections.forEach(section => main.append(section));

    // Create metadata block
    createMetadata(main, document, eventInfo, firstParagraph);

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {String} url The url of the document being transformed.
   * @param {HTMLDocument} document The document
   */
  generateDocumentPath: ({ document, url }) => {
    // Extract path from URL
    let path = new URL(url).pathname;
    
    // Remove .html extension if present
    if (path.endsWith('.html')) {
      path = path.slice(0, -5);
    }
    
    return path;
  },
};
