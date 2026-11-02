import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function coreCarrierGatewayProxyPlugin(): Plugin {
  const cache: Record<string, { data: any; time: number }> = {};
  const inFlight: Record<string, Promise<any> | null> = {};
  const DEFAULT_TOKEN = 'Ect9DpdpkmmYK_3y_XGDzBx_zsF8nzO2AmxfvYEqIWk';
  const BASE_UPSTREAM = 'https://panel.lamix.org/api/v1';

  const PANELS_FILE = path.join(__dirname, 'carrier_panels.json');
  let configuredPanels: any[] = [];

  try {
    if (fs.existsSync(PANELS_FILE)) {
      configuredPanels = JSON.parse(fs.readFileSync(PANELS_FILE, 'utf-8'));
    }
  } catch {}

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
    } catch {}
  }

  async function fetchWithCache(endpoint: string, token: string, queryString: string = '', customBase: string = ''): Promise<any> {
    let base = (customBase && customBase.trim()) ? customBase.trim().replace(/\/+$/, '') : BASE_UPSTREAM;
    if (!base.includes('/api')) {
      base = `${base}/api/v1`;
    }
    const cacheKey = `${base}:${endpoint}:${token}:${queryString}`;
    const now = Date.now();

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
      } catch (err: any) {
        console.error(`[Gateway Proxy ${endpoint} Error]:`, err.message);
        return cache[cacheKey]?.data || { records: [], count: 0, error: err.message };
      } finally {
        inFlight[cacheKey] = null;
      }
    })();

    return await inFlight[cacheKey];
  }

  return {
    name: 'core-carrier-gateway-proxy',
    configureServer(server) {
      const handleProxy = async (req: any, res: any, endpoint: string) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');

        try {
          const parsedUrl = new URL(req.url || '', 'http://localhost');
          const token = parsedUrl.searchParams.get('token') || DEFAULT_TOKEN;
          const customBase = parsedUrl.searchParams.get('baseUrl') || '';
          const forwardParams = new URLSearchParams(parsedUrl.search);
          forwardParams.delete('token');
          forwardParams.delete('baseUrl');
          const data = await fetchWithCache(endpoint, token, forwardParams.toString(), customBase);
          res.statusCode = 200;
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'gateway_proxy_error', message: err.message }));
        }
      };

      server.middlewares.use('/api/core-gateway/messages', (req, res) => handleProxy(req, res, 'messages'));
      server.middlewares.use('/api/core-gateway/ranges', (req, res) => handleProxy(req, res, 'ranges'));
      server.middlewares.use('/api/core-gateway/numbers', (req, res) => handleProxy(req, res, 'numbers'));
      server.middlewares.use('/api/core-gateway/cdrs', (req, res) => handleProxy(req, res, 'cdrs'));
      server.middlewares.use('/api/core-gateway/clients', (req, res) => handleProxy(req, res, 'clients'));
      server.middlewares.use('/api/gateway/stream', (req, res) => handleProxy(req, res, 'messages'));
      server.middlewares.use('/api/lamix/messages', (req, res) => handleProxy(req, res, 'messages'));

      server.middlewares.use('/api/core-gateway/test-connection', async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        const parsedUrl = new URL(req.url || '', 'http://localhost');
        const token = parsedUrl.searchParams.get('token') || DEFAULT_TOKEN;
        const customBase = parsedUrl.searchParams.get('baseUrl') || '';

        try {
          const start = Date.now();
          const data = await fetchWithCache('ranges', token, '', customBase);
          const latency = Date.now() - start;

          if (data && Array.isArray(data.ranges)) {
            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              latencyMs: latency,
              rangesCount: data.ranges.length,
              message: 'Connected successfully to upstream carrier panel',
              sampleRange: data.ranges[0] || null
            }));
            return;
          }

          if (data && data.error) {
            res.statusCode = 400;
            res.end(JSON.stringify({
              success: false,
              latencyMs: latency,
              error: data.error,
              message: data.message || 'Upstream panel returned an error'
            }));
            return;
          }

          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, latencyMs: latency, data }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });

      server.middlewares.use('/api/core-gateway/panels', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body);
              if (Array.isArray(parsed?.panels)) {
                configuredPanels = parsed.panels;
                savePanelsToFile();
                res.statusCode = 200;
                res.end(JSON.stringify({ success: true, count: configuredPanels.length, panels: configuredPanels }));
                return;
              }
            } catch {}
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'invalid_json' }));
          });
        } else {
          res.statusCode = 200;
          res.end(JSON.stringify({ panels: configuredPanels }));
        }
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), coreCarrierGatewayProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
