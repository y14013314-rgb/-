import {image} from '../../lib/content/media.mjs';
export async function onRequest(context){try{return await image(context);}catch{return new Response('Image temporarily unavailable',{status:503,headers:{'Cache-Control':'no-store'}});}}
