const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const getUpstreamUrl = () => {
  const explicitUrl = normalizeBaseUrl(process.env.UPSTREAM_TOKEN_USAGE_URL);
  if (explicitUrl) return explicitUrl;

  const baseUrl = normalizeBaseUrl(process.env.UPSTREAM_API_BASE);
  if (!baseUrl) return '';

  return `${baseUrl}/api/usage/token/`;
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.end(JSON.stringify(payload));
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Allow', 'GET, OPTIONS');
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, {
      code: false,
      message: 'Method Not Allowed，只支持 GET',
    });
    return;
  }

  const upstreamUrl = getUpstreamUrl();
  if (!upstreamUrl) {
    sendJson(res, 500, {
      code: false,
      message: '服务端未配置 UPSTREAM_API_BASE 环境变量',
      hint: '请在 Vercel Project Settings -> Environment Variables 中添加 UPSTREAM_API_BASE，例如你的 NewAPI / OneAPI 站点根地址。',
    });
    return;
  }

  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    sendJson(res, 401, {
      code: false,
      message: '缺少 Authorization: Bearer sk-xxxx 请求头',
    });
    return;
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
        'User-Agent': 'check-api-tool-vercel-proxy/1.0',
      },
      cache: 'no-store',
    });

    const contentType = upstream.headers.get('content-type') || '';
    const text = await upstream.text();

    if (!contentType.includes('application/json')) {
      sendJson(res, 502, {
        code: false,
        message: '上游返回的不是 JSON，请检查 UPSTREAM_API_BASE 是否配置正确',
        upstreamStatus: upstream.status,
        upstreamContentType: contentType,
        upstreamPreview: text.slice(0, 300),
      });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      sendJson(res, 502, {
        code: false,
        message: '上游 JSON 解析失败',
        upstreamStatus: upstream.status,
        detail: error instanceof Error ? error.message : String(error),
        upstreamPreview: text.slice(0, 300),
      });
      return;
    }

    sendJson(res, upstream.ok ? 200 : upstream.status, payload);
  } catch (error) {
    sendJson(res, 502, {
      code: false,
      message: '代理请求上游失败',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}