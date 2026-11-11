import { published } from '../../lib/content/published.mjs';
export const onRequest = context => published(context,true);
