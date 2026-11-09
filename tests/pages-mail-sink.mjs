import http from 'node:http';

const attempts = new Map();
const accepted = new Set();

http.createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/emails') {
    response.writeHead(404).end();
    return;
  }
  const key = request.headers['idempotency-key'];
  const payload = JSON.parse(await new Response(request).text());
  if (!key || payload.to[0] !== 'sandbox@example.test') {
    response.writeHead(400).end();
    return;
  }
  const attempt = (attempts.get(key) || 0) + 1;
  attempts.set(key, attempt);
  const status = payload.text.includes('retry-fixture') && attempt === 1 ? 503 : 200;
  const delivered = status === 200 && !accepted.has(key);
  if (delivered) accepted.add(key);
  console.log(JSON.stringify({ reference: key, attempt, status, delivered }));
  response.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ id: key }));
}).listen(8789, '127.0.0.1', () => console.log('Test mail sink listening on 127.0.0.1:8789'));
