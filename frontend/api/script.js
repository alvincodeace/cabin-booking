function normalizeAppsScriptUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/$/, '')
    .replace(
      /https:\/\/script\.google\.com\/a\/macros\/[^/]+\/s\//,
      'https://script.google.com/macros/s/'
    );
}

function asQueryValue(value) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export default async function handler(req, res) {
  const scriptUrl = normalizeAppsScriptUrl(
    process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  );

  if (!scriptUrl) {
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'CONFIG',
        message: 'VITE_APPS_SCRIPT_URL is not configured in Vercel',
      },
    });
    return;
  }

  try {
    let url = scriptUrl;
    const init = { redirect: 'follow' };

    if (req.method === 'GET') {
      const params = new URLSearchParams();
      Object.entries(req.query || {}).forEach(([key, value]) => {
        const queryValue = asQueryValue(value);
        if (queryValue != null && queryValue !== '') {
          params.set(key, String(queryValue));
        }
      });
      url = `${scriptUrl}?${params.toString()}`;
    } else {
      init.method = 'POST';
      init.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      init.body =
        typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
    }

    const response = await fetch(url, init);
    const text = await response.text();

    try {
      res.status(200).json(JSON.parse(text));
    } catch {
      res.status(502).json({
        success: false,
        data: null,
        error: {
          code: 'APPS_SCRIPT_HTML',
          message:
            'Apps Script returned a login page. Open Deploy → Manage deployments, set Execute as: Me and Who has access: Anyone (not Anyone in CodeAce), then update VITE_APPS_SCRIPT_URL with the new /macros/s/.../exec URL.',
        },
      });
    }
  } catch (error) {
    res.status(502).json({
      success: false,
      data: null,
      error: {
        code: 'PROXY_ERROR',
        message: error instanceof Error ? error.message : 'Proxy request failed',
      },
    });
  }
}
