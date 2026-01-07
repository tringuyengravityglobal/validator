// Local VPN Proxy Server
// This server runs on your local machine (which is whitelisted via WiFi)
// and forwards requests to IP-restricted URLs

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Local VPN proxy is running',
    timestamp: new Date().toISOString()
  });
});

// Proxy endpoint to fetch URL content
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
    
    // Prepare request headers
    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      ...headers
    };
    
    // Fetch the URL (local machine is whitelisted)
    const response = await axios.get(url, {
      headers: requestHeaders,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`[${new Date().toISOString()}] Successfully fetched ${url} - Status: ${response.status}`);
    
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
  console.log('📝 To find your local IP address:');
  console.log('   - macOS/Linux: ifconfig | grep "inet "');
  console.log('   - Windows:     ipconfig');
  console.log('');
  console.log('🔧 Usage in staging:');
  console.log('   1. Check "Use Local Proxy" checkbox');
  console.log('   2. Enter: http://YOUR_LOCAL_IP:' + PORT);
  console.log('   3. Click "Test Connection"');
  console.log('   4. Start scanning URLs');
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

