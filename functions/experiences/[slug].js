import {onCatalogPage} from '../../lib/content/catalog-published.mjs';
export const onRequest=context=>onCatalogPage(context,'experiences-'+context.params.slug);
