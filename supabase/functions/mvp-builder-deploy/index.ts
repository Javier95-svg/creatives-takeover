import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Compatibility endpoint: publication always uses the tested, immutable artifact.
serve(async req => {
 const url = Deno.env.get('SUPABASE_URL');
 if (!url) return new Response('Service unavailable',{status:503});
 return fetch(url + '/functions/v1/mvp-builder-publish',{method:req.method,headers:req.headers,body:req.method==='OPTIONS'?undefined:await req.text()});
});
