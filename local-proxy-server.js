// Local VPN Proxy Server
// This server runs on your local machine (which is whitelisted via WiFi)
// and forwards requests to IP-restricted URLs
// Supports HTTP Basic Auth via user:pass@host URL format

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins (local proxy, safe to allow all)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

app.use(express.json());

/**
 * Parse a URL that may contain HTTP Basic Auth credentials
 * e.g., https://preview:P3PIq6AS1ki@dev.butlermfg.com/
 * Returns { cleanUrl, authHeader } where authHeader is null if no credentials
 */
function parseAuthUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    let authHeader = null;

    if (parsed.username || parsed.password) {
      const credentials = `${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`;
      authHeader = 'Basic ' + Buffer.from(credentials).toString('base64');

      // Strip credentials from URL
      parsed.username = '';
      parsed.password = '';
    }

    return {
      cleanUrl: parsed.toString(),
      authHeader: authHeader,
      originalHost: parsed.hostname
    };
  } catch (e) {
    return {
      cleanUrl: urlString,
      authHeader: null,
      originalHost: null
    };
  }
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Local VPN Proxy Server is running',
    endpoints: {
      health: '/health',
      fetch: '/fetch-url (POST)',
      fetchMulti: '/fetch-multi (POST)'
    },
    features: ['HTTP Basic Auth (user:pass@host)', 'Multi-URL support', 'Custom headers'],
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Local VPN proxy is running',
    features: ['basic-auth', 'multi-url'],
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoint to fetch URL content (single URL)
app.post('/fetch-url', async (req, res) => {
  try {
    const { url, headers } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    console.log(`[${new Date().toISOString()}] Fetching URL via local proxy: ${url}`);
    
    // Parse URL for embedded Basic Auth credentials
    const { cleanUrl, authHeader, originalHost } = parseAuthUrl(url);
    
    if (authHeader) {
      console.log(`[${new Date().toISOString()}]   → Detected Basic Auth credentials for ${originalHost}`);
    }

    // Prepare request headers
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ...headers
    };

    // Add Authorization header if credentials were in the URL
    if (authHeader && !requestHeaders['Authorization']) {
      requestHeaders['Authorization'] = authHeader;
    }
    
    // Fetch the URL (local machine is whitelisted)
    const response = await axios.get(cleanUrl, {
      headers: requestHeaders,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`[${new Date().toISOString()}] Successfully fetched ${cleanUrl} - Status: ${response.status}`);
    
    res.json({
      success: true,
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching URL:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Multi-URL fetch endpoint
app.post('/fetch-multi', async (req, res) => {
  try {
    const { urls, headers } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'urls array is required'
      });
    }
    
    console.log(`[${new Date().toISOString()}] Fetching ${urls.length} URLs via local proxy`);
    
    const results = await Promise.allSettled(urls.map(async (url, index) => {
      const { cleanUrl, authHeader, originalHost } = parseAuthUrl(url);
      
      if (authHeader) {
        console.log(`[${new Date().toISOString()}]   [${index + 1}/${urls.length}] Auth URL: ${originalHost}`);
      }

      const requestHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        ...headers
      };

      if (authHeader && !requestHeaders['Authorization']) {
        requestHeaders['Authorization'] = authHeader;
      }
      
      const response = await axios.get(cleanUrl, {
        headers: requestHeaders,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true
      });
      
      return {
        url: url,
        cleanUrl: cleanUrl,
        success: true,
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    }));
    
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: urls[index],
          success: false,
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
    
    console.log(`[${new Date().toISOString()}] Multi-fetch completed: ${processedResults.filter(r => r.success).length}/${urls.length} successful`);
    
    res.json({
      success: true,
      results: processedResults
    });
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in multi-fetch:`, error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('✅ Local VPN Proxy Server is running!');
  console.log('='.repeat(60));
  console.log(`   Local URL:    http://localhost:${PORT}`);
  console.log(`   Network URL:  http://YOUR_LOCAL_IP:${PORT}`);
  console.log('');
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔐 HTTP Basic Auth Support:');
  console.log('   URLs with format user:pass@host are auto-detected');
  console.log('   Example: https://preview:P3PIq6AS1ki@dev.butlermfg.com/');
  console.log('');
  console.log('📝 To find your local IP address:');
  console.log('   - macOS/Linux: ifconfig | grep "inet "');
  console.log('   - Windows:     ipconfig');
  console.log('');
  console.log('🔧 Usage in staging:');
  console.log('   1. Check "Use Local Proxy" checkbox');
  console.log('   2. Enter: http://YOUR_LOCAL_IP:' + PORT);
  console.log('   3. Click "Test Connection"');
  console.log('   4. Start scanning URLs (with or without auth)');
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  process.exit(0);
});
