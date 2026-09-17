import { processSlackEvent } from '../../lib/bookingApi.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await request.text();
  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const result = await processSlackEvent(headers, rawBody);
  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
