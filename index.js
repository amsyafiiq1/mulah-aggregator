const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 4200;

// Enable CORS
app.use(cors());

// Serve static files from public directory
app.use(express.static('public'));


// Create custom axios instance with configurations
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.wired.com',
    'Origin': 'https://www.wired.com'
  }
});

const url = 'https://www.wired.com'; // Replace with your chosen website

// API endpoint to fetch headlines
app.get('/api/headlines', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1 if not specified
    
    // Validate page parameter
    if (isNaN(page) || page < 1) {
      return res.status(400).json({ error: 'Invalid page parameter. Must be a positive number.' });
    }

    const startDate = new Date('2025-01-01');
    
    const { data } = await axios.get(`${url}/search/?q=&sort=publishdate%20desc&format=json&page=${page}`);
    
    if (!data.search.items || data.search.items.length === 0) {
      return res.json([]);
    }

    // Filter items by date
    const filteredItems = data.search.items.filter(item => {
      const pubDate = new Date(item.pubDate);
      return pubDate >= startDate;
    });

    res.json(filteredItems);
    
  } catch (error) {
    console.error('Error fetching headlines:', error);
    res.status(500).json({ error: 'Failed to fetch headlines' });
  }
});

// API endpoint to find last page of 2022
app.get('/api/last-page', async (req, res) => {
  try {
    let left = 1;
    let right = 100; // Assuming max 100 pages
    let lastPage = 1;
    const targetDate = new Date('2022-12-31');

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const { data } = await axios.get(`${url}/search/?q=&sort=publishdate%20desc&format=json&page=${mid}`);

      if (!data.search.items || data.search.items.length === 0) {
        right = mid - 1;
        continue;
      }

      const oldestArticleDate = new Date(data.search.items[data.search.items.length - 1].pubDate);
      const newestArticleDate = new Date(data.search.items[0].pubDate);

      if (oldestArticleDate > targetDate) {
        // Page is too recent
        left = mid + 1;
      } else if (newestArticleDate < targetDate) {
        // Page is too old
        right = mid - 1;
      } else {
        // Found a page containing 2022 articles
        lastPage = mid;
        break;
      }
    }

    res.json({ lastPage });
  } catch (error) {
    console.error('Error finding last page:', error);
    res.status(500).json({ error: 'Failed to find last page' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
