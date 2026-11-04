import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { clientIp, denied, rateLimit, serviceClient } from '../_shared/guards.ts';
import { getCorsHeaders } from '../_shared/middleware.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok',{headers:getCorsHeaders(req)});
  if (req.method !== 'POST') return denied(req,405,'Method not allowed');
  const limited=await rateLimit(req,`view-investor-update:${clientIp(req)}`,30); if(limited)return limited;
  let token=''; try { const body=await req.json(); token=typeof body?.token==='string'?body.token:''; } catch { return denied(req,400,'Invalid request'); }
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return denied(req,404,'Report not found');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map((b)=>b.toString(16).padStart(2,'0')).join('');
  const result=await serviceClient().rpc('consume_investor_update_share_v1',{p_token_hash:hash});
  if(result.error){console.error('[view-investor-update] lookup failed',result.error.message);return denied(req,503,'Report temporarily unavailable');}
  if(!result.data)return denied(req,404,'Report not found or link expired');
  return new Response(JSON.stringify({report:result.data}),{headers:{...getCorsHeaders(req),'Content-Type':'application/json','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow, noarchive'}});
});
