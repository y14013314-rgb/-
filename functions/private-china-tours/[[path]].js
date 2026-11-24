import {privateRequest} from '../../lib/content/private-pages.mjs';
import {onRequest as legacyCollection} from '../private-china-tours.js';
export function onRequest(context){return context.params.path?.length?privateRequest(context):legacyCollection(context);}
