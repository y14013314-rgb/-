import { published } from '../../lib/content/published.mjs';
import { catalogCollection } from '../../lib/content/catalog-published.mjs';
export const onRequest = async context => catalogCollection(context,await published(context,true));
