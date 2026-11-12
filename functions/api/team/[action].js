import {upload} from '../../../lib/content/media.mjs';
import { onMembers } from '../../../lib/content/members.mjs';
import { onAuth, response } from '../../../lib/content/auth.mjs';
import { onContent } from '../../../lib/content/content-api.mjs';
export async function onRequest(context) {
  try { if(context.params.action==='upload')return await upload(context); if(context.params.action==='members')return await onMembers(context); return await (['products','product','preview','save','publish','create','unpublish'].includes(context.params.action) ? onContent(context) : onAuth(context)); }
  catch { return response({ error: '后台暂时不可用，请稍后再试。' }, 503); }
}
