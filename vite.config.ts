import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function coreCarrierGatewayProxyPlugin(): Plugin {
  const cache: Record<string, { data: any; time: number }> = {};
  const inFlight: Record<string, Promise<any> | null> = {};
  const DEFAULT_TOKEN = 'Ect9DpdpkmmYK_3y_XGDzBx_zsF8nzO2AmxfvYEqIWk';
  const BASE_UPSTREAM = 'https://panel.lamix.org/api/v1';

  async function fetchWithCache(endpoint: string, token: string, queryString: string = ''): Promise<any> {
    const cacheKey = `${endpoint}:${token}:${queryString}`;
    const now = Date.now();

    // Cache for 3500ms to strictly comply with upstream 1 req/sec rate limit
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

        // If rate limited and no cache yet, wait 1.2s and retry once
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
          // clone params and remove token to pass the rest to query
          const forwardParams = new URLSearchParams(parsedUrl.search);
          forwardParams.delete('token');
          const data = await fetchWithCache(endpoint, token, forwardParams.toString());
          res.statusCode = 200;
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'gateway_proxy_error', message: err.message }));
        }
      };

      // Clean white-labeled endpoints
      server.middlewares.use('/api/core-gateway/messages', (req, res) => handleProxy(req, res, 'messages'));
      server.middlewares.use('/api/core-gateway/ranges', (req, res) => handleProxy(req, res, 'ranges'));
      server.middlewares.use('/api/core-gateway/numbers', (req, res) => handleProxy(req, res, 'numbers'));
      server.middlewares.use('/api/core-gateway/cdrs', (req, res) => handleProxy(req, res, 'cdrs'));
      server.middlewares.use('/api/gateway/stream', (req, res) => handleProxy(req, res, 'messages'));

      // Backward compatible alias
      server.middlewares.use('/api/lamix/messages', (req, res) => handleProxy(req, res, 'messages'));
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
