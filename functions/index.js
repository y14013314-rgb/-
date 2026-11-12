import {onCatalogPage,catalogCollection} from '../lib/content/catalog-published.mjs';
export const onRequest=async context=>catalogCollection(context,await onCatalogPage(context,'homepage'));
