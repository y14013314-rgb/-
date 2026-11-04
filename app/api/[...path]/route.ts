import {env} from 'cloudflare:workers';
import {api} from '../../server-api';
export const dynamic='force-dynamic';
export function GET(r:Request){return api(r,env)}
export function POST(r:Request){return api(r,env)}
