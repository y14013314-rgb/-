export async function onRequest({next}){
  const result=await next();
  const response=new Response(result.body,result);
  response.headers.set('X-Frame-Options','DENY');
  if(!response.headers.has('Content-Security-Policy'))response.headers.set('Content-Security-Policy',"frame-ancestors 'none'");
  response.headers.set('X-Content-Type-Options','nosniff');
  if(!response.headers.has('Referrer-Policy'))response.headers.set('Referrer-Policy','no-referrer');
  return response;
}
