const { ClientSecretCredential } = require('@azure/identity');

let _credential = null;

function getCredential() {
  if (!_credential) {
    _credential = new ClientSecretCredential(
      process.env.MS_TENANT_ID,
      process.env.MS_CLIENT_ID,
      process.env.MS_CLIENT_SECRET
    );
  }
  return _credential;
}

/**
 * Make an authenticated Microsoft Graph API request.
 * @param {string} path  - Graph API path, e.g. /drives/{id}/items/{id}/workbook/...
 * @param {object} opts
 * @param {string}  [opts.method='GET']
 * @param {object}  [opts.body]         - JSON body (for POST/PATCH)
 * @param {string}  [opts.sessionId]    - workbook-session-id header value
 */
async function graphRequest(path, { method = 'GET', body, sessionId } = {}) {
  const tokenResponse = await getCredential().getToken('https://graph.microsoft.com/.default');

  const headers = {
    Authorization: `Bearer ${tokenResponse.token}`,
    'Content-Type': 'application/json',
  };
  if (sessionId) headers['workbook-session-id'] = sessionId;

  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  const text = await res.text();
  if (!res.ok) {
    throw Object.assign(
      new Error(`Graph ${method} ${path} → ${res.status}`),
      { status: res.status, body: text }
    );
  }

  return JSON.parse(text);
}

module.exports = { graphRequest };
