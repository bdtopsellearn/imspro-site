import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Upstream Gateway Proxy Configuration
const DEFAULT_TOKEN = process.env.CARRIER_API_TOKEN || 'Ect9DpdpkmmYK_3y_XGDzBx_zsF8nzO2AmxfvYEqIWk';
const BASE_UPSTREAM = 'https://panel.lamix.org/api/v1';

const cache = {};
const inFlight = {};

async function fetchWithCache(endpoint, token, queryString = '') {
  const cacheKey = `${endpoint}:${token}:${queryString}`;
  const now = Date.now();

  // 3500ms cache to strictly observe rate limit
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
      const upstreamUrl = `${BASE_UPSTREAM}/${endpoint}?${queryParams.toString()}`;
      let upstreamRes = await fetch(upstreamUrl);
      let json = await upstreamRes.json();

      if (json && json.error === 'rate_limited' && !cache[cacheKey]) {
        await new Promise(r => setTimeout(r, 1200));
        upstreamRes = await fetch(upstreamUrl);
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
    const token = req.query.token || DEFAULT_TOKEN;
    const forwardParams = new URLSearchParams(req.query);
    forwardParams.delete('token');
    const data = await fetchWithCache(endpoint, token, forwardParams.toString());
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
app.get('/api/gateway/stream', (req, res) => handleProxy(req, res, 'messages'));
app.get('/api/lamix/messages', (req, res) => handleProxy(req, res, 'messages'));

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
