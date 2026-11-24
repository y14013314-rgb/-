export const onRequest=({request})=>Response.redirect(new URL('/private-china-tours/destinations/',request.url).href,301);
