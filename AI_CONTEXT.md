# Chord Finder - AI Context & Project Overview

## Project Purpose
A full-stack web application for searching, extracting, saving, and sharing guitar chord charts from online sources. Built to bypass bot protection on chord sites using stealth browser automation.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: SQLite with better-sqlite3
- **Web Scraping**: Puppeteer with stealth plugin, Axios, Cheerio
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Deployment**: Designed for Render.com (free tier)

## Architecture Overview

### Backend (server.js)
- Express server on port 3000 (configurable via PORT env var)
- Puppeteer-based stealth scraping to bypass Cloudflare bot protection
- Simulates human-like behavior: random delays, mouse movements, scrolling
- Extracts chord content from Ultimate Guitar and Russian sites (AMDM.ru)
- RESTful API for chord search, extraction, and CRUD operations

### Database (db/database.js)
- SQLite database with songs table
- Fields: id, share_id (UUID), title, artist, chord_content, source_url, personal_notes, timestamps
- CRUD operations via songOperations object

### Frontend (public/index.html)
- Single-page application with three tabs:
  1. **Search Chords**: Search Ultimate Guitar (English) or AMDM.ru (Cyrillic)
  2. **Manual Entry**: Paste chord content directly
  3. **Saved Songs**: View, edit, delete, and share saved chords
- Modal-based editing
- Share functionality: WhatsApp, Telegram, native share API, copy link

## Key Features & How They Work

### 1. Bot Protection Bypass
**Problem**: Ultimate Guitar uses Cloudflare which blocks simple HTTP requests.

**Solution**: 
- Puppeteer with stealth plugin acts like a real browser
- Simulates human behavior: random delays (1-3 seconds), mouse movements, scrolling
- Sets realistic user agent and headers
- Takes 10-20 seconds per request but successfully bypasses detection

**Implementation**:
```javascript
// In server.js:
- extractWithPuppeteer(): Extracts chord content from any URL
- scrapeUltimateGuitar(): Searches Ultimate Guitar and extracts results
- randomDelay(): Adds human-like timing variance
```

### 2. Search & Extraction
**Workflow**:
1. User searches for a song (e.g., "wonderwall")
2. Backend detects language (Cyrillic → AMDM.ru, English → Ultimate Guitar)
3. Puppeteer navigates to search page, extracts results
4. Returns: title, artist (extracted from URL path), song URL, type (Chords/Tab/Official)
5. User clicks "View Chords" → second Puppeteer session extracts chord content
6. Chord content appears directly below the clicked result
7. User can save to database with personal notes

**Artist Extraction Logic**:
- Ultimate Guitar's DOM structure doesn't reliably expose artist names
- **Workaround**: Parse artist from URL path (`/tab/oasis/wonderwall-chords-123` → "Oasis")
- Convert slug to proper case: `the-beatles` → "The Beatles"

**Title Extraction**:
- Full song title extracted using `link.textContent` to capture multi-span titles
- Example: `<b>Hotel</b> <b>California</b>` → "Hotel California"

### 3. Chord Content Positioning
**Issue**: Originally appended chord content to bottom of page.

**Fix**: 
- Pass button element to `viewChords(url, title, artist, this)`
- Use `buttonElement.closest('.result-item')` to find parent
- Insert chord content immediately after parent with `insertAdjacentElement('afterend', chordDiv)`

### 4. Data Persistence
- Songs saved with UUID-based share_id for public sharing
- Share URLs: `http://localhost:3000/share/{share_id}`
- Full CRUD operations: create, read, update, delete
- Search within saved songs by title, artist, or content

### 5. Sharing
- WhatsApp: Pre-filled message with song title and share link
- Telegram: Share URL with song metadata
- Native Share API: Mobile device integration
- Copy Link: Clipboard API with fallback

## API Endpoints

### Chord Search & Extraction
- `GET /api/chords?q=<query>` - Search for chords (returns 10 results)
- `POST /api/extract-chords` - Extract chord content from URL
  - Body: `{ "url": "https://..." }`

### Song Management
- `GET /api/songs` - Get all saved songs
- `GET /api/songs/:id` - Get song by ID
- `POST /api/songs` - Save new song
  - Body: `{ title, artist, chord_content, source_url?, personal_notes? }`
- `PUT /api/songs/:id` - Update song
- `DELETE /api/songs/:id` - Delete song
- `GET /api/search?q=<query>` - Search saved songs

### Sharing
- `GET /share/:shareId` - View shared song (public)

## Current Limitations

### Quality/Rating Data
- **Status**: Attempted but not consistently available
- Ultimate Guitar embeds quality indicators ("Official", "High quality") in tooltip JSON attributes
- HTML structure varies; reliable extraction proved difficult
- **Current State**: `quality` field exists in results but often empty
- **Impact**: Minimal - sorting by quality implemented but may not differentiate results

### Performance
- Stealth mode takes 10-20 seconds per search/extraction
- Trade-off: Speed vs. bot protection bypass
- User informed via UI message: "Please be patient!"

## Development Workflow

### Local Development
```bash
cd chord-finder
npm install
npm start  # Starts server on localhost:3000
```

### Testing
```bash
# Search API
curl "http://localhost:3000/api/chords?q=wonderwall"

# Extract chords
curl -X POST http://localhost:3000/api/extract-chords \
  -H "Content-Type: application/json" \
  -d '{"url":"https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-6125"}'
```

### Deployment (Render.com)
1. Push to GitHub
2. Create Web Service on Render.com
3. Connect repository
4. Build command: `npm install`
5. Start command: `npm start`
6. Auto-deploys on push to main branch

## Recent Fixes (2026-02-14)

### Issue 1: Chord Content Positioning ✅
- **Problem**: Chords appeared at bottom of page
- **Solution**: Insert content adjacent to clicked button's parent element

### Issue 2: Artist Shows "Unknown Artist" ✅
- **Problem**: DOM selectors unreliable for artist extraction
- **Solution**: Parse artist from URL path with proper case conversion

### Issue 3: Title Truncation ✅
- **Problem**: Only first word extracted ("Hotel" instead of "Hotel California")
- **Solution**: Use full `textContent` of link element instead of first child

### Issue 4: Rating/Quality Sorting ❌
- **Problem**: Quality data not consistently available in HTML
- **Status**: Partial implementation - extraction logic exists but often returns empty
- **Decision**: Acceptable limitation given project scope

## Code Structure

```
chord-finder/
├── db/
│   └── database.js          # SQLite setup and operations
├── public/
│   └── index.html          # Frontend SPA
├── server.js               # Express server & scraping logic
├── package.json            # Dependencies
├── AI_CONTEXT.md          # This file
└── README.md              # Public-facing documentation
```

## Future Enhancement Ideas
- Implement actual rating extraction from Ultimate Guitar's internal data store
- Add Chordify support (currently fallback only)
- Offline mode with service workers
- Chord transposition feature
- Print-friendly formatting
- User accounts and private collections
- Mobile app (React Native?)
- Chord diagram generation

## Key Dependencies
- `puppeteer` + `puppeteer-extra` + `puppeteer-extra-plugin-stealth`: Bot protection bypass
- `express`: Web server
- `better-sqlite3`: Database
- `axios` + `cheerio`: Fallback scraping for Russian sites
- `uuid`: Share link generation
- `cors`: CORS handling

## Important Notes for AI Continuation
1. **Puppeteer is essential** - Don't suggest replacing with axios alone
2. **Stealth plugin is required** - Regular puppeteer won't bypass Cloudflare
3. **Human-like delays are critical** - Remove them and detection increases
4. **Artist extraction from URL is a workaround** - DOM structure unreliable
5. **Quality data extraction is challenging** - Don't promise easy fixes
6. **Russian sites (AMDM.ru) work differently** - Less protection, axios + cheerio sufficient
7. **Free hosting constraints** - Keep memory/CPU usage reasonable for Render.com free tier

## Error Handling Patterns
- Puppeteer timeouts: Return user-friendly messages
- 403 errors: Return informative warnings about bot protection
- Missing chord content: Return "Could not extract chord content"
- Database errors: Return error JSON with appropriate status codes
- Search failures: Return fallback search page links

## UI/UX Principles
- Loading states for slow operations
- Informative error messages (not technical jargon)
- Manual entry as fallback for bot protection failures
- Persistent "be patient" reminders for stealth mode delays
- Mobile-responsive design
- Accessible controls (native form elements, semantic HTML)
