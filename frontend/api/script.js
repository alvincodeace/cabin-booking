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

function toQueryRecord(value) {
  if (value == null) {
    return {};
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

async function verifyGoogleAccessToken(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!tokenInfoResponse.ok) {
      return null;
    }
    const tokenInfo = await tokenInfoResponse.json();
    return tokenInfo.email ? String(tokenInfo.email).toLowerCase() : null;
  }
  const profile = await response.json();
  return profile.email ? String(profile.email).toLowerCase() : null;
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
    const payload = {
      ...toQueryRecord(req.method === 'GET' ? req.query : req.body),
    };

    if (req.method === 'GET' && req.query) {
      Object.entries(req.query).forEach(([key, value]) => {
        payload[key] = asQueryValue(value);
      });
    }

    if (payload.accessToken) {
      const email = await verifyGoogleAccessToken(String(payload.accessToken));
      if (!email) {
        res.status(200).json({
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Google sign-in expired or is invalid. Click Sign in with Google again.',
          },
        });
        return;
      }
      if (!email.endsWith('@codeace.com')) {
        res.status(200).json({
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Only @codeace.com accounts can sign in.',
          },
        });
        return;
      }
      payload.email = email;
    }

    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });

    // Apps Script 302-redirects POST bodies away, so the proxy always uses GET.
    const response = await fetch(`${scriptUrl}?${params.toString()}`, {
      method: 'GET',
      redirect: 'follow',
    });
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
