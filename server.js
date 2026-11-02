import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Upstream Gateway Proxy Configuration
const DEFAULT_TOKEN = process.env.CARRIER_API_TOKEN || 'Ect9DpdpkmmYK_3y_XGDzBx_zsF8nzO2AmxfvYEqIWk';
const BASE_UPSTREAM = 'https://panel.lamix.org/api/v1';

const cache = {};
const inFlight = {};

// In-server persistent panels storage
const PANELS_FILE = path.join(__dirname, 'carrier_panels.json');
let configuredPanels = [];

try {
  if (fs.existsSync(PANELS_FILE)) {
    configuredPanels = JSON.parse(fs.readFileSync(PANELS_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('[Panels Store Load Warn]:', e.message);
}

if (!Array.isArray(configuredPanels) || configuredPanels.length === 0) {
  configuredPanels = [
    {
      id: 'panel-lamix-primary',
      name: 'Lamix Primary (mariyaaiagent)',
      provider: 'lamix',
      baseUrl: 'https://panel.lamix.org/api/v1',
      token: DEFAULT_TOKEN,
      status: 'active',
      defaultRate: 0.0250,
      userPayoutRate: 0.0150,
      marginPercent: 40,
      autoSync: true,
      lastSyncTime: new Date().toISOString(),
      stats: { rangesCount: 5, numbersCount: 500, messagesCount: 30, lastStatus: 'connected' }
    }
  ];
}

function savePanelsToFile() {
  try {
    fs.writeFileSync(PANELS_FILE, JSON.stringify(configuredPanels, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Panels Store Save Warn]:', err.message);
  }
}

async function fetchWithCache(endpoint, token, queryString = '', customBase = '') {
  let base = (customBase && customBase.trim()) ? customBase.trim().replace(/\/+$/, '') : BASE_UPSTREAM;
  // If base doesn't end with api/v1 and doesn't contain /api/, append /api/v1
  if (!base.includes('/api')) {
    base = `${base}/api/v1`;
  }
  
  const cacheKey = `${base}:${endpoint}:${token}:${queryString}`;
  const now = Date.now();

  // 3500ms cache to strictly observe rate limit (1 req/sec)
  if (cache[cacheKey] && (now - cache[cacheKey].time) < 3500) {
    return cache[cacheKey].data;
  }

  if (inFlight[cacheKey]) {
    try {
      return await inFlight[cacheKey];
    } catch {}
  }

  inFlight[cacheKey] = (async () => {
    try {
      const queryParams = new URLSearchParams(queryString);
      queryParams.set('token', token);
      const upstreamUrl = `${base}/${endpoint}?${queryParams.toString()}`;
      let upstreamRes = await fetch(upstreamUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      let json = await upstreamRes.json();

      if (json && json.error === 'rate_limited' && !cache[cacheKey]) {
        await new Promise(r => setTimeout(r, 1200));
        upstreamRes = await fetch(upstreamUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        json = await upstreamRes.json();
      }

      if (json && !json.error) {
        cache[cacheKey] = { data: json, time: Date.now() };
        return json;
      }

      if (cache[cacheKey]) {
        return cache[cacheKey].data;
      }
      return json;
    } catch (err) {
      console.error(`[Gateway Proxy ${endpoint} Error]:`, err.message);
      return cache[cacheKey]?.data || { records: [], count: 0, error: err.message };
    } finally {
      inFlight[cacheKey] = null;
    }
  })();

  return await inFlight[cacheKey];
}

async function handleProxy(req, res, endpoint) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const token = req.query.token || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || DEFAULT_TOKEN;
    const customBase = req.query.baseUrl || req.headers['x-carrier-base-url'] || '';
    const forwardParams = new URLSearchParams(req.query);
    forwardParams.delete('token');
    forwardParams.delete('baseUrl');
    const data = await fetchWithCache(endpoint, token, forwardParams.toString(), customBase);
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'gateway_proxy_error', message: err.message });
  }
}

// Gateway API Endpoints
app.get('/api/core-gateway/messages', (req, res) => handleProxy(req, res, 'messages'));
app.get('/api/core-gateway/ranges', (req, res) => handleProxy(req, res, 'ranges'));
app.get('/api/core-gateway/numbers', (req, res) => handleProxy(req, res, 'numbers'));
app.get('/api/core-gateway/cdrs', (req, res) => handleProxy(req, res, 'cdrs'));
app.get('/api/core-gateway/clients', (req, res) => handleProxy(req, res, 'clients'));
app.get('/api/gateway/stream', (req, res) => handleProxy(req, res, 'messages'));
app.get('/api/lamix/messages', (req, res) => handleProxy(req, res, 'messages'));

// Test Connection Endpoint for any Lamix or Carrier Panel
app.get('/api/core-gateway/test-connection', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const token = req.query.token || DEFAULT_TOKEN;
  const customBase = req.query.baseUrl || '';

  try {
    const start = Date.now();
    const data = await fetchWithCache('ranges', token, '', customBase);
    const latency = Date.now() - start;

    if (data && Array.isArray(data.ranges)) {
      return res.status(200).json({
        success: true,
        latencyMs: latency,
        rangesCount: data.ranges.length,
        message: 'Connected successfully to upstream carrier panel',
        sampleRange: data.ranges[0] || null
      });
    }

    if (data && data.error) {
      return res.status(400).json({
        success: false,
        latencyMs: latency,
        error: data.error,
        message: data.message || 'Upstream panel returned an error'
      });
    }

    return res.status(200).json({
      success: true,
      latencyMs: latency,
      data: data,
      message: 'Upstream responded'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      message: 'Failed to connect to panel endpoint'
    });
  }
});

// Upstream Assignment endpoints (Forward to Lamix /api/v1/numbers/assign)
app.post('/api/core-gateway/numbers/assign', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = req.query.token || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || DEFAULT_TOKEN;
  const customBase = req.query.baseUrl || BASE_UPSTREAM;
  try {
    const upstreamUrl = `${customBase.replace(/\/+$/, '')}/numbers/assign?token=${encodeURIComponent(token)}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(req.body)
    });
    const json = await upstreamRes.json();
    res.status(upstreamRes.status).json(json);
  } catch (err) {
    res.status(500).json({ error: 'assign_failed', message: err.message });
  }
});

// Upstream Unassignment endpoint
app.post('/api/core-gateway/numbers/unassign', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = req.query.token || req.headers['authorization']?.replace(/^Bearer\s+/i, '') || DEFAULT_TOKEN;
  const customBase = req.query.baseUrl || BASE_UPSTREAM;
  try {
    const upstreamUrl = `${customBase.replace(/\/+$/, '')}/numbers/unassign?token=${encodeURIComponent(token)}`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(req.body)
    });
    const json = await upstreamRes.json();
    res.status(upstreamRes.status).json(json);
  } catch (err) {
    res.status(500).json({ error: 'unassign_failed', message: err.message });
  }
});

// Panels Config Persistence API (Get and Update all panels)
app.get('/api/core-gateway/panels', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ panels: configuredPanels });
});

app.post('/api/core-gateway/panels', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (Array.isArray(req.body?.panels)) {
    configuredPanels = req.body.panels;
    savePanelsToFile();
    res.status(200).json({ success: true, count: configuredPanels.length, panels: configuredPanels });
  } else {
    res.status(400).json({ error: 'invalid_format', message: 'Expected panels array' });
  }
});

// Serve static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/assets', express.static(path.join(__dirname, 'dist/assets')));
app.use('/js', express.static(path.join(__dirname, 'dist/js')));

// Health check endpoint for Render
app.get('/healthz', (req, res) => res.status(200).send('OK'));

// SPA routing fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[IMS PRO Server] Running on http://0.0.0.0:${PORT}`);
});
