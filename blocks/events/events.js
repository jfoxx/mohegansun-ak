/**
 * Fetch events from the query index
 */
async function fetchEvents() {
  try {
    const response = await fetch('/events-and-promotions/schedule-of-events/query-index.json');
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    const json = await response.json();
    return json.data || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

/**
 * Format date from serial number to readable format
 */
function formatEventDate(dateValue) {
  if (!dateValue) return { day: '', monthDay: '' };
  
  // Convert Excel serial number to JavaScript Date
  // Excel serial date is days since January 1, 1900
  const excelEpoch = new Date(1900, 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + (dateValue - 2) * msPerDay);
  
  // Format as "SATURDAY" and "NOV 15"
  const dayOptions = { weekday: 'long' };
  const dateOptions = { month: 'short', day: 'numeric' };
  
  return {
    day: date.toLocaleDateString('en-US', dayOptions).toUpperCase(),
    monthDay: date.toLocaleDateString('en-US', dateOptions).toUpperCase(),
  };
}

/**
 * Create an event card
 */
function createEventCard(event) {
  const card = document.createElement('div');
  card.className = 'event-card';
  
  // Event link wrapper
  const link = document.createElement('a');
  link.href = event.path;
  link.className = 'event-card-link';
  
  // Event image
  const imageContainer = document.createElement('div');
  imageContainer.className = 'event-card-image';
  
  if (event.image) {
    const img = document.createElement('img');
    img.src = event.image;
    img.alt = event.title || '';
    img.loading = 'lazy';
    imageContainer.appendChild(img);
  }
  
  // Event content
  const content = document.createElement('div');
  content.className = 'event-card-content';
  
  // Date and category row
  const headerRow = document.createElement('div');
  headerRow.className = 'event-card-header';
  
  // Date box
  if (event.eventDate) {
    const dateBox = document.createElement('div');
    dateBox.className = 'event-card-date-box';
    
    const { day, monthDay } = formatEventDate(event.eventDate);
    const daySpan = document.createElement('div');
    daySpan.className = 'event-date-day';
    daySpan.textContent = day;
    
    const monthDaySpan = document.createElement('div');
    monthDaySpan.className = 'event-date-monthday';
    monthDaySpan.textContent = monthDay;
    
    dateBox.appendChild(daySpan);
    dateBox.appendChild(monthDaySpan);
    headerRow.appendChild(dateBox);
  }
  
  // Category
  const category = document.createElement('div');
  category.className = 'event-card-category';
  category.textContent = 'ENTERTAINMENT';
  headerRow.appendChild(category);
  
  content.appendChild(headerRow);
  
  // Event title
  if (event.title) {
    const title = document.createElement('h3');
    title.className = 'event-card-title';
    title.textContent = event.title;
    content.appendChild(title);
  }
  
  // Time and location
  if (event.eventTime || event.eventLocation) {
    const meta = document.createElement('div');
    meta.className = 'event-card-meta';
    
    const parts = [];
    if (event.eventTime) parts.push(event.eventTime);
    if (event.eventLocation) parts.push(`at ${event.eventLocation}`);
    
    meta.textContent = parts.join(' ');
    content.appendChild(meta);
  }
  
  // Learn More button
  const button = document.createElement('div');
  button.className = 'event-card-button';
  button.textContent = 'LEARN MORE';
  content.appendChild(button);
  
  link.appendChild(imageContainer);
  link.appendChild(content);
  card.appendChild(link);
  
  return card;
}

/**
 * Filter events by date (future events only)
 */
function filterFutureEvents(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Convert today to Excel serial number for comparison
  const excelEpoch = new Date(1900, 0, 1);
  const msPerDay = 24 * 60 * 60 * 1000;
  const todaySerial = (today.getTime() - excelEpoch.getTime()) / msPerDay + 2;
  
  return events.filter(event => {
    if (!event.eventDate) return true; // Include events without dates
    return event.eventDate >= todaySerial;
  });
}

/**
 * Sort events by date (earliest first)
 */
function sortEventsByDate(events) {
  return events.sort((a, b) => {
    if (!a.eventDate) return 1;
    if (!b.eventDate) return -1;
    return a.eventDate - b.eventDate;
  });
}

/**
 * Get unique venues from events
 */
function getUniqueVenues(events) {
  const venues = new Set();
  events.forEach(event => {
    if (event.eventLocation) {
      venues.add(event.eventLocation);
    }
  });
  return Array.from(venues).sort();
}

/**
 * Get unique types from events
 */
function getUniqueTypes(events) {
  const types = new Set();
  events.forEach(event => {
    if (event.eventType) {
      types.add(event.eventType);
    }
  });
  return Array.from(types).sort();
}

/**
 * Create filter UI
 */
function createFilterUI(events) {
  const filterContainer = document.createElement('div');
  filterContainer.className = 'events-filters';
  
  // Filter controls wrapper
  const filterControls = document.createElement('div');
  filterControls.className = 'events-filters-controls';
  
  // Calendar icon
  const calendarIcon = document.createElement('span');
  calendarIcon.className = 'icon icon-calendar-outline events-filter-icon';
  filterControls.appendChild(calendarIcon);
  
  // Venue dropdown
  const venueSelect = document.createElement('select');
  venueSelect.id = 'events-venue-filter';
  venueSelect.className = 'events-filter-select';
  venueSelect.innerHTML = '<option value="">All Venues</option>';
  
  const venues = getUniqueVenues(events);
  venues.forEach(venue => {
    const option = document.createElement('option');
    option.value = venue;
    option.textContent = venue;
    venueSelect.appendChild(option);
  });
  
  filterControls.appendChild(venueSelect);
  
  // Type dropdown
  const typeSelect = document.createElement('select');
  typeSelect.id = 'events-type-filter';
  typeSelect.className = 'events-filter-select';
  typeSelect.innerHTML = '<option value="">All Types</option>';
  
  const eventTypes = [
    { value: 'conventions', label: 'Conventions & Expos' },
    { value: 'tastings', label: 'Food, Tastings & Festivals' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'country', label: 'Country' },
    { value: 'hotel-package', label: 'Hotel Package' },
    { value: 'nightlife', label: 'Nightlife' },
    { value: 'dance', label: 'Dance' },
    { value: 'rnb', label: 'R & B' },
    { value: 'pop', label: 'Pop' },
    { value: 'latin', label: 'Latin' },
    { value: 'rap', label: 'Rap' },
    { value: 'rock', label: 'Rock' },
    { value: 'sports-entertainment', label: 'Sports' },
    { value: 'boxing', label: 'Boxing' },
    { value: 'folk', label: 'Folk' },
    { value: 'blues', label: 'Blues' },
    { value: 'jazz', label: 'Jazz' },
    { value: 'family', label: 'Family' },
    { value: 'tribute', label: 'Tribute Bands' },
    { value: 'asian', label: 'Asian' },
    { value: 'holiday', label: 'Holiday' },
    { value: 'classical', label: 'Classical' },
    { value: 'oldies', label: 'Oldies' },
    { value: 'new-years-eve', label: 'NYE' },
    { value: 'sun-winefoodfest', label: 'Sun Wine & Food Fest' },
    { value: 'brunch', label: 'Brunch' },
  ];
  
  eventTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.label;
    typeSelect.appendChild(option);
  });
  
  filterControls.appendChild(typeSelect);
  
  // Category dropdown (placeholder for now)
  const categorySelect = document.createElement('select');
  categorySelect.id = 'events-category-filter';
  categorySelect.className = 'events-filter-select';
  categorySelect.innerHTML = '<option value="">All Categories</option>';
  filterControls.appendChild(categorySelect);
  
  // Results counter
  const resultsCounter = document.createElement('div');
  resultsCounter.className = 'events-filter-results';
  resultsCounter.innerHTML = `
    <div class="events-count">
      <span class="count" id="events-count">0</span>
      <span class="label">Matching Events</span>
    </div>
    <div class="promos-count">
      <span class="count" id="promos-count">0</span>
      <span class="label">Matching Promos</span>
    </div>
  `;
  
  filterContainer.appendChild(filterControls);
  filterContainer.appendChild(resultsCounter);
  
  return filterContainer;
}

/**
 * Filter events based on selected criteria
 */
function filterEvents(events, venue, type) {
  return events.filter(event => {
    // Filter by venue
    if (venue && event.eventLocation !== venue) {
      return false;
    }
    
    // Filter by type
    if (type && event.eventType !== type) {
      return false;
    }
    
    return true;
  });
}

/**
 * Update the events grid with filtered results
 */
function updateEventsGrid(grid, events) {
  grid.innerHTML = '';
  
  if (events.length === 0) {
    const noResults = document.createElement('p');
    noResults.className = 'events-no-results';
    noResults.textContent = 'No events match your filter criteria.';
    grid.appendChild(noResults);
    return;
  }
  
  events.forEach(event => {
    const card = createEventCard(event);
    grid.appendChild(card);
  });
}

/**
 * Update results counter
 */
function updateResultsCounter(count) {
  const eventsCount = document.getElementById('events-count');
  if (eventsCount) {
    eventsCount.textContent = count;
  }
}

/**
 * Decorate the events block
 */
export default async function decorate(block) {
  // Clear the block
  block.innerHTML = '';
  
  // Add loading state
  block.classList.add('events-loading');
  block.textContent = 'Loading events...';
  
  // Fetch events
  const allEvents = await fetchEvents();
  
  if (allEvents.length === 0) {
    block.classList.remove('events-loading');
    block.classList.add('events-empty');
    block.innerHTML = '<p>No events found.</p>';
    return;
  }
  
  // Filter and sort events
  const futureEvents = filterFutureEvents(allEvents);
  let sortedEvents = sortEventsByDate(futureEvents);
  
  // Remove loading state and clear content
  block.classList.remove('events-loading');
  block.textContent = '';
  
  // Create filter UI
  const filterUI = createFilterUI(sortedEvents);
  block.appendChild(filterUI);
  
  // Load icons in filter UI
  const icons = filterUI.querySelectorAll('span.icon');
  if (icons.length) {
    const { default: loadIcons } = await import('../../scripts/utils/icons.js');
    loadIcons(icons);
  }
  
  // Create events grid
  const grid = document.createElement('div');
  grid.className = 'events-grid';
  
  // Initial render
  updateEventsGrid(grid, sortedEvents);
  updateResultsCounter(sortedEvents.length);
  
  block.appendChild(grid);
  
  // Add filter event listeners
  const venueSelect = document.getElementById('events-venue-filter');
  const typeSelect = document.getElementById('events-type-filter');
  const categorySelect = document.getElementById('events-category-filter');
  
  const applyFilters = () => {
    const selectedVenue = venueSelect.value;
    const selectedType = typeSelect.value;
    
    const filtered = filterEvents(sortedEvents, selectedVenue, selectedType);
    updateEventsGrid(grid, filtered);
    updateResultsCounter(filtered.length);
  };
  
  venueSelect.addEventListener('change', applyFilters);
  typeSelect.addEventListener('change', applyFilters);
  categorySelect.addEventListener('change', applyFilters);
}

