import { getMetadata } from '../../scripts/ak.js';

function formatDate(dateString) {
  // Parse MM/DD/YYYY format
  const [month, day, year] = dateString.split('/');
  const date = new Date(year, month - 1, day);
  
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
  // Handle formats like "8:00 pm"
  return timeString;
}

function createEventDetails() {
  const eventLocation = getMetadata('event-location');
  const eventDate = getMetadata('event-date');
  const eventTime = getMetadata('event-time');
  const artistWebsite = getMetadata('artist-website');
  const ticketsUrl = getMetadata('tickets');
  const onsale = getMetadata('onsale');

  if (!eventLocation && !eventDate && !eventTime) {
    return null; // No event metadata found
  }

  const eventDetails = document.createElement('div');
  eventDetails.className = 'event-details';

  // Event location
  if (eventLocation) {
    const locationDiv = document.createElement('div');
    locationDiv.className = 'event-location';
    locationDiv.innerHTML = `<span class="event-label">at</span> <span class="event-venue">${eventLocation}</span>`;
    eventDetails.appendChild(locationDiv);
  }

  // Event date and time
  if (eventDate) {
    const dateDiv = document.createElement('div');
    dateDiv.className = 'event-datetime';
    
    const formattedDate = formatDate(eventDate);
    dateDiv.textContent = formattedDate;
    eventDetails.appendChild(dateDiv);
    
    // Add time on separate line if provided
    if (eventTime) {
      const timeDiv = document.createElement('div');
      timeDiv.className = 'event-time';
      timeDiv.textContent = formatTime(eventTime);
      eventDetails.appendChild(timeDiv);
    }
  }

  // Ticket button (only if tickets URL exists and is not 'free')
  if (ticketsUrl && ticketsUrl.toLowerCase() !== 'free') {
    const ticketButton = document.createElement('a');
    ticketButton.href = ticketsUrl;
    ticketButton.className = 'btn btn-primary event-tickets-btn';
    ticketButton.textContent = 'PURCHASE TICKETS';
    ticketButton.target = '_blank';
    ticketButton.rel = 'noopener noreferrer';
    eventDetails.appendChild(ticketButton);
  }

  // On-sale date
  if (onsale) {
    const onsaleDiv = document.createElement('div');
    onsaleDiv.className = 'event-onsale';
    
    // Check if onsale date is in the past
    const [month, day, year] = onsale.split('/');
    const onsaleDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison
    
    const onsaleText = onsaleDate < today ? 'Now' : formatDate(onsale);
    onsaleDiv.innerHTML = `<strong>On-Sale:</strong> ${onsaleText}`;
    eventDetails.appendChild(onsaleDiv);
  }

  return eventDetails;
}

function createEventLinks() {
  const artistWebsite = getMetadata('artist-website');
  const eventLocation = getMetadata('event-location');

  // Venue URL mapping
  const venueUrls = {
    'Wolf Den': '/poi/venues/wolf-den',
    'Mohegan Sun Arena': '/poi/venues/mohegan-sun-arena',
    'Comix Roadhouse': '/poi/dining/comix-roadhouse',
  };

  // Only render if there's an artist website or a recognized venue
  if (!artistWebsite && !venueUrls[eventLocation]) {
    return null;
  }

  const linksDiv = document.createElement('div');
  linksDiv.className = 'event-links';

  const parts = [];
  
  if (artistWebsite) {
    parts.push(`<a href="${artistWebsite}" target="_blank" rel="noopener noreferrer">VIEW WEBSITE</a>`);
  }
  
  if (eventLocation) {
    const venueUrl = venueUrls[eventLocation];
    if (venueUrl) {
      parts.push(`<a href="${venueUrl}"><strong>${eventLocation.toUpperCase()}</strong></a>`);
    } else {
      parts.push(`<strong>${eventLocation.toUpperCase()}</strong>`);
    }
  }

  linksDiv.innerHTML = parts.join(' | ');

  return linksDiv;
}

export default function init() {
  const heading = document.querySelector('main h1, main h2');
  if (!heading) return;

  const eventDetails = createEventDetails();
  if (eventDetails) {
    // Insert event details after heading
    heading.insertAdjacentElement('afterend', eventDetails);
  }

  // Find the last paragraph of body text before section-metadata or other blocks
  const section = heading.closest('.section') || heading.parentElement;
  const paragraphs = [...section.querySelectorAll('p')].filter(p => {
    // Exclude paragraphs inside other blocks
    return !p.closest('.section-metadata, .hero, .event-details');
  });

  const eventLinks = createEventLinks();
  if (eventLinks && paragraphs.length > 0) {
    // Insert links after the last body paragraph
    const lastParagraph = paragraphs[paragraphs.length - 1];
    lastParagraph.insertAdjacentElement('afterend', eventLinks);
  }
}

