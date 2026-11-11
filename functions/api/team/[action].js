import { onAuth, response } from '../../../lib/content/auth.mjs';
export async function onRequest(context) {
  try { return await onAuth(context); }
  catch { return response({ error: '后台暂时不可用，请稍后再试。' }, 503); }
}
