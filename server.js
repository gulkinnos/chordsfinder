const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const { songOperations } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper function to detect Cyrillic characters
function hasCyrillic(text) {
  return /[\u0400-\u04FF]/.test(text);
}

// Helper function to add random delay (human-like behavior)
function randomDelay(min, max) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

// Helper function to extract content using Puppeteer with stealth (acts like a real person)
async function extractWithPuppeteer(url) {
  let browser;
  try {
    console.log(`[Stealth Mode] Extracting from: ${url}`);
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Set additional headers to appear more human-like
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Random delay before navigation (1-3 seconds)
    await randomDelay(1000, 3000);
    
    console.log('[Stealth Mode] Navigating to page...');
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    
    // Wait for page to be fully loaded
    await randomDelay(2000, 4000);
    
    // Simulate human-like behavior: random mouse movements
    console.log('[Stealth Mode] Simulating human behavior...');
    await page.mouse.move(100, 100);
    await randomDelay(500, 1000);
    await page.mouse.move(300, 400);
    await randomDelay(300, 800);
    
    // Scroll down slowly (like a human reading)
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if(totalHeight >= scrollHeight / 2) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    // Random delay after scrolling
    await randomDelay(1000, 2000);
    
    console.log('[Stealth Mode] Extracting chord content...');
    
    // Extract chord content using various selectors
    const chordContent = await page.evaluate(() => {
      // Ultimate Guitar specific selectors
      const ugSelectors = [
        'pre[class*="js-tab-content"]',
        '[data-name="tab-content"] pre',
        '.js-tab-content pre',
        'pre.ZGNwb',
        'code[class*="code"]',
        'pre'
      ];
      
      for (const selector of ugSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 50) {
          return element.textContent.trim();
        }
      }
      
      // Russian chord site specific selectors
      const russianSelectors = [
        '.song_text',
        '.chord_text',
        '.song-text',
        '.b-podbor__text',
        'pre'
      ];
      
      for (const selector of russianSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 50) {
          return element.textContent.trim();
        }
      }
      
      // Try any pre tag as fallback
      const allPre = document.querySelectorAll('pre');
      for (const pre of allPre) {
        if (pre.textContent.trim().length > 50) {
          return pre.textContent.trim();
        }
      }
      
      return null;
    });
    
    if (chordContent) {
      console.log(`[Stealth Mode] Successfully extracted ${chordContent.length} characters`);
    } else {
      console.log('[Stealth Mode] Could not find chord content with known selectors');
    }
    
    return chordContent || 'Could not extract chord content from this page. The site structure may have changed.';
  } catch (error) {
    console.error('[Stealth Mode] Extraction error:', error.message);
    if (error.message.includes('timeout')) {
      return 'Page took too long to load. Please try again or use manual entry.';
    }
    return 'Error loading chord content. The page may have additional protection or the content structure has changed.';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to scrape Ultimate Guitar with Stealth Puppeteer
async function scrapeUltimateGuitar(query) {
  let browser;
  try {
    console.log(`[Stealth Search] Searching Ultimate Guitar for: ${query}`);
    
    const searchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`;
    
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });
    
    // Random delay before navigation
    await randomDelay(1000, 2000);
    
    console.log('[Stealth Search] Navigating to search page...');
    await page.goto(searchUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for content to load
    await randomDelay(2000, 3000);
    
    console.log('[Stealth Search] Extracting search results...');
    
    // Extract search results from the page
    const results = await page.evaluate(() => {
      const searchResults = [];
      
      // Ultimate Guitar stores data in window.__APOLLO_STATE__ or similar
      // Try to access it
      let tabData = null;
      if (window.__APOLLO_STATE__) {
        tabData = window.__APOLLO_STATE__;
      }
      
      // Ultimate Guitar uses div.dyhP1 containers for each result row
      const resultRows = document.querySelectorAll('div.dyhP1');
      
      resultRows.forEach((row, i) => {
        if (i === 0) return; // Skip header row (first dyhP1)
        if (i > 10) return; // Limit to 10 results
        
        // Find artist in SUEyv column (first column)
        const artistCell = row.querySelector('.SUEyv, .qNp1Q:first-child');
        const artistLink = artistCell ? artistCell.querySelector('a[href*="/artist/"]') : null;
        let artist = artistLink ? artistLink.textContent.trim() : null;
        
        // Find song in SGCxQ column (second column)
        const songCell = row.querySelector('.SGCxQ, .qNp1Q:nth-child(2)');
        if (!songCell) return;
        
        // Look for link with tabcount attribute
        const songLink = songCell.querySelector('a[tabcount]') || songCell.querySelector('a');
        if (!songLink) return;
        
        // Extract title from the link - get full text content
        const title = songLink.textContent.trim() || 'Unknown Song';
        
        // Try to get URL from data attributes or construct it
        let url = songLink.getAttribute('href');
        
        // If href is "#", try to find the URL in the page's data or construct it
        if (!url || url === '#') {
          // Try to find a data-* attribute with the URL
          const dataUrl = songLink.getAttribute('data-url') || songLink.getAttribute('data-href');
          if (dataUrl) {
            url = dataUrl;
          } else {
            // Look for the URL in parent elements or nearby
            const parentLink = row.querySelector('a[href*="/tab/"]');
            if (parentLink) {
              url = parentLink.getAttribute('href');
            } else {
              // Skip this result if we can't find the URL
              return;
            }
          }
        }
        
        if (!url || url === '#' || url.includes('submit')) return;
        
        // If artist not found in DOM, extract from URL path
        // URL format: /tab/artist-name/song-name-type-id or https://tabs.ultimate-guitar.com/tab/artist-name/...
        if (!artist) {
          const urlPath = url.includes('ultimate-guitar.com') ? url.split('ultimate-guitar.com')[1] : url;
          const pathParts = urlPath.split('/').filter(p => p);
          // Path is usually: ['tab', 'artist-name', 'song-info']
          if (pathParts.length >= 2 && pathParts[0] === 'tab') {
            const artistSlug = pathParts[1];
            // Convert slug to proper case (oasis -> Oasis, the-beatles -> The Beatles)
            artist = artistSlug.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          } else {
            artist = 'Unknown Artist';
          }
        }
        
        // Try to find quality/rating info
        let quality = '';
        
        // Check for official badge/star icon within the song link
        if (songLink.innerHTML.includes('Official version') || songLink.innerHTML.includes('data-tip')) {
          const dataTip = songLink.querySelector('[data-tip]');
          if (dataTip) {
            const tipAttr = dataTip.getAttribute('data-tip');
            if (tipAttr && tipAttr.includes('Official version')) {
              quality = 'Official';
            }
          }
        }
        
        // Check for green star SVG (indicates official/high quality)
        const starSvg = songLink.querySelector('svg path[fill="#00E148"]');
        if (starSvg && !quality) {
          quality = 'Official';
        }
        
        // Fallback: check for quality span in the row
        if (!quality) {
          const qualitySpan = row.querySelector('.D8BqY');
          if (qualitySpan) {
            quality = qualitySpan.textContent.trim();
          }
        }
        
        // Try to find type (Chords, Tab, etc.)
        const typeText = row.textContent;
        let type = 'Chords';
        if (typeText.includes('Official')) type = 'Official';
        else if (typeText.includes('Tab') && !typeText.includes('Guitar Pro')) type = 'Tab';
        else if (typeText.includes('Ukulele')) type = 'Ukulele';
        else if (typeText.includes('Bass')) type = 'Bass';
        else if (typeText.includes('Guitar Pro')) type = 'Guitar Pro';
        
        if (title && url && artist) {
          searchResults.push({
            title,
            artist,
            url: url.startsWith('http') ? url : `https://www.ultimate-guitar.com${url}`,
            type,
            quality,
            source: 'Ultimate Guitar'
          });
        }
      });
      
      return searchResults;
    });
    
    console.log(`[Stealth Search] Found ${results.length} results`);
    
    // Sort results by quality/rating
    // Priority: Official > High quality > others
    results.sort((a, b) => {
      const qualityScore = (result) => {
        if (result.type === 'Official' || result.quality.includes('Official')) return 3;
        if (result.quality.includes('High quality')) return 2;
        if (result.quality) return 1;
        return 0;
      };
      return qualityScore(b) - qualityScore(a);
    });
    
    return results;
    
  } catch (error) {
    console.error('[Stealth Search] Ultimate Guitar scraping error:', error.message);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to scrape Russian chord site (amdm.ru)
async function scrapeAmdmRu(query) {
  try {
    const searchUrl = `https://amdm.ru/search/?q=${encodeURIComponent(query)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    // Parse search results
    $('.search_result').each((i, element) => {
      if (i >= 10) return false; // Limit to 10 results
      
      const $el = $(element);
      const $link = $el.find('a').first();
      const title = $link.text().trim();
      const url = $link.attr('href');
      
      if (title && url) {
        // Extract artist from title (usually in format "Artist - Song")
        const parts = title.split(' - ');
        const artist = parts.length > 1 ? parts[0] : 'Unknown';
        const songTitle = parts.length > 1 ? parts.slice(1).join(' - ') : title;
        
        results.push({
          title: songTitle,
          artist,
          url: url.startsWith('http') ? url : `https://amdm.ru${url}`,
          type: 'Chords',
          source: 'AMDM.ru'
        });
      }
    });

    return results;
  } catch (error) {
    console.error('AMDM.ru scraping error:', error.message);
    return [];
  }
}

// Helper function to extract chord content from Ultimate Guitar
async function extractUGChords(url) {
  // Use Puppeteer with stealth mode for better bot protection bypassing
  console.log('Extracting Ultimate Guitar chords using Stealth Puppeteer...');
  return await extractWithPuppeteer(url);
}

// Helper function to extract chord content from AMDM.ru
async function extractAmdmChords(url) {
  // Use Puppeteer for better bot protection handling
  console.log('Extracting AMDM.ru chords using Puppeteer...');
  return await extractWithPuppeteer(url);
}

// API Routes

// Search for chords
app.get('/api/chords', async (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    let results = [];

    if (hasCyrillic(query)) {
      // Search Russian sites for Cyrillic queries
      results = await scrapeAmdmRu(query);
    } else {
      // Search Ultimate Guitar for English queries
      results = await scrapeUltimateGuitar(query);
    }

    // If no results found, provide fallback links
    if (results.length === 0) {
      results = [
        {
          title: `Search "${query}" on Ultimate Guitar`,
          artist: 'External Link',
          url: `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(query)}`,
          type: 'Search',
          source: 'Ultimate Guitar'
        },
        {
          title: `Search "${query}" on Chordify`,
          artist: 'External Link',
          url: `https://chordify.net/search/${encodeURIComponent(query)}`,
          type: 'Search',
          source: 'Chordify'
        }
      ];
    }

    res.json({ results });
  } catch (error) {
    console.error('Chord search error:', error);
    res.status(500).json({ error: 'Failed to search for chords' });
  }
});

// Extract chord content from URL
app.post('/api/extract-chords', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if this is a search page URL (not a specific chord page)
    if (url.includes('/search.php') || url.includes('/search/')) {
      return res.json({ 
        chord_content: '⚠️ <strong>This is a search page link, not a direct chord page.</strong><br><br>' +
                      'Unfortunately, due to bot protection on chord sites, automatic chord extraction is currently limited.<br><br>' +
                      '<strong>To use this app:</strong><br>' +
                      '1. Click "Open Original" to visit the chord site<br>' +
                      '2. Find the song you want and copy the chord content<br>' +
                      '3. Return here and paste it into a new song using the manual entry feature<br><br>' +
                      'Or search for Russian songs (in Cyrillic) which work automatically!'
      });
    }

    let chordContent = '';
    
    if (url.includes('ultimate-guitar.com')) {
      chordContent = await extractUGChords(url);
    } else if (url.includes('amdm.ru')) {
      chordContent = await extractAmdmChords(url);
    } else if (url.includes('chordify.net')) {
      chordContent = '⚠️ <strong>Chordify extraction is not currently supported.</strong><br><br>' +
                    'Chordify provides interactive chord overlays on videos rather than static chord sheets.<br><br>' +
                    '<strong>Recommendation:</strong><br>' +
                    '• Use Ultimate Guitar or AMDM.ru for traditional chord sheets<br>' +
                    '• Or manually copy chord content from Chordify and save it here';
    } else {
      chordContent = '⚠️ <strong>Chord extraction not supported for this site.</strong><br><br>' +
                    'Currently supported: Ultimate Guitar (individual chord pages) and AMDM.ru';
    }

    res.json({ chord_content: chordContent });
  } catch (error) {
    console.error('Chord extraction error:', error);
    res.status(500).json({ error: 'Failed to extract chord content' });
  }
});

// Get all saved songs
app.get('/api/songs', (req, res) => {
  try {
    const songs = songOperations.getAll();
    res.json({ songs });
  } catch (error) {
    console.error('Error fetching songs:', error);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
});

// Get song by ID
app.get('/api/songs/:id', (req, res) => {
  try {
    const song = songOperations.getById(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    res.json({ song });
  } catch (error) {
    console.error('Error fetching song:', error);
    res.status(500).json({ error: 'Failed to fetch song' });
  }
});

// Save a new song
app.post('/api/songs', (req, res) => {
  try {
    const { title, artist, chord_content, source_url, personal_notes } = req.body;
    
    if (!title || !artist || !chord_content) {
      return res.status(400).json({ error: 'Title, artist, and chord content are required' });
    }

    const result = songOperations.create({
      title,
      artist,
      chord_content,
      source_url,
      personal_notes
    });

    res.json({ 
      message: 'Song saved successfully',
      id: result.id,
      share_id: result.share_id
    });
  } catch (error) {
    console.error('Error saving song:', error);
    res.status(500).json({ error: 'Failed to save song' });
  }
});

// Update a song
app.put('/api/songs/:id', (req, res) => {
  try {
    const { title, artist, chord_content, source_url, personal_notes } = req.body;
    
    if (!title || !artist || !chord_content) {
      return res.status(400).json({ error: 'Title, artist, and chord content are required' });
    }

    const success = songOperations.update(req.params.id, {
      title,
      artist,
      chord_content,
      source_url,
      personal_notes
    });

    if (!success) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ message: 'Song updated successfully' });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song' });
  }
});

// Delete a song
app.delete('/api/songs/:id', (req, res) => {
  try {
    const success = songOperations.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Song not found' });
    }

    res.json({ message: 'Song deleted successfully' });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Share song by share ID
app.get('/share/:shareId', (req, res) => {
  try {
    const song = songOperations.getByShareId(req.params.shareId);
    
    if (!song) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Song Not Found</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Song Not Found</h1>
          <p>The shared song could not be found.</p>
          <a href="/">Go to Chord Finder</a>
        </body>
        </html>
      `);
    }

    // Return a simple HTML page with the song
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${song.title} - ${song.artist}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .song-header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .chord-content { white-space: pre-wrap; font-family: monospace; background: #f5f5f5; padding: 20px; border-radius: 5px; }
          .notes { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px; }
          .back-link { display: inline-block; margin-top: 20px; color: #007bff; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="song-header">
          <h1>${song.title}</h1>
          <h2>by ${song.artist}</h2>
          ${song.source_url ? `<p><a href="${song.source_url}" target="_blank">Original Source</a></p>` : ''}
        </div>
        <div class="chord-content">${song.chord_content}</div>
        ${song.personal_notes ? `<div class="notes"><strong>Notes:</strong><br>${song.personal_notes}</div>` : ''}
        <a href="/" class="back-link">← Back to Chord Finder</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error sharing song:', error);
    res.status(500).send('Error loading shared song');
  }
});

// Search saved songs
app.get('/api/search', (req, res) => {
  try {
    const { q: query } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const songs = songOperations.search(query);
    res.json({ songs });
  } catch (error) {
    console.error('Error searching songs:', error);
    res.status(500).json({ error: 'Failed to search songs' });
  }
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Chord Finder server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the application`);
});

module.exports = app;