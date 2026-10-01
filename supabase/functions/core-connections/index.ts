import { coreGoogleConfig } from '../_shared/core-google-config.ts';
import { verifyConnectionEvent } from '../_shared/connection-events.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { readProvider, normalizeImport, type DataRow } from '../_shared/connected-data.ts';
import { sealSecret, openSecret } from '../_shared/connection-secrets.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const providers = ['sheets','tally','stripe','posthog','ga4','hubspot','typeform','shopify','mailchimp'];
const enabledProviders = () => (Deno.env.get('CORE_TOOLS_PROVIDERS') || 'sheets,tally').split(',').map(value=>value.trim()).filter(value=>providers.includes(value));
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const checked = (result: { error?: any; data?: any }) => { if (result.error) throw new Error(result.error.message); return result.data; };
const callbackUrl = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/core-connections`;

async function connectionToken(db: any, connection: DataRow) {
  const row = checked(await db.from('ct_connection_secrets').select('encrypted_secret').eq('connection_id', connection.id).single());
  const secret = await openSecret(row.encrypted_secret);
  if (!secret.refresh_token) return secret.token;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({
    client_id: coreGoogleConfig(Deno.env.get).clientId, client_secret: coreGoogleConfig(Deno.env.get).clientSecret, refresh_token: secret.refresh_token, grant_type: 'refresh_token',
  }), signal: AbortSignal.timeout(15000) });
  const data = await response.json(); if (!response.ok || !data.access_token) throw new Error('Authorization expired. Reconnect Google.');
  return data.access_token;
}

async function sync(db: any, connection: DataRow, preview: boolean) {
  const run = checked(await db.from('ct_sync_runs').insert({ user_id: connection.user_id, connection_id: connection.id }).select('id').single());
  try {
    checked(await db.from('ct_connections').update({ status: 'syncing', last_error: null }).eq('id', connection.id).neq('status','disconnected').select('id').single());
    const rows = await readProvider(connection.provider, connection.config, await connectionToken(db, connection));
    const batch = checked(await db.from('ct_import_batches').insert({ user_id: connection.user_id, product_id: connection.product_id, connection_id: connection.id, rows, mapping: connection.mapping }).select('id').single());
    let count = 0;
    if (!preview) {
      const normalized = await normalizeImport(connection.provider, rows, connection.mapping, connection.id);
      count = checked(await db.rpc('ct_publish_import', { p_batch_id: batch.id, p_evidence: normalized.evidence, p_metrics: normalized.metrics }));
    }
    checked(await db.from('ct_sync_runs').update({ status: preview ? 'preview' : 'succeeded', rows_imported: count, finished_at: new Date().toISOString() }).eq('id', run.id));
    checked(await db.from('ct_connections').update({ status: 'connected', ...(preview ? {} : { last_synced_at: new Date().toISOString() }) }).eq('id', connection.id).neq('status','disconnected'));
    if(!preview&&connection.refresh_requested_at) checked(await db.from('ct_connections').update({refresh_requested_at:null}).eq('id',connection.id).eq('refresh_requested_at',connection.refresh_requested_at));
    return { batchId: batch.id, rows, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed. Retry the connection.';
    await db.from('ct_sync_runs').update({ status: 'failed', error: message, finished_at: new Date().toISOString() }).eq('id', run.id);
    await db.from('ct_connections').update({ status: /Authorization/.test(message) ? 'expired' : 'error', last_error: message }).eq('id', connection.id).neq('status','disconnected');
    throw error;
  }
}

serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    if (Deno.env.get('CORE_TOOLS_CONNECTED_ENABLED') !== 'true') return json({ error: 'Connected data is not enabled for this release.' }, 503);
    const db = admin(); const url = new URL(req.url);
    if(req.method==='POST' && url.searchParams.has('connection')){
      const connection=checked(await db.from('ct_connections').select('*').eq('id',url.searchParams.get('connection')).neq('status','disconnected').single());
      if(!enabledProviders().includes(connection.provider))return json({error:'Provider is not enabled.'},503);
      const row=checked(await db.from('ct_connection_secrets').select('encrypted_secret').eq('connection_id',connection.id).single());
      const secret=await openSecret(row.encrypted_secret);
      const event=await verifyConnectionEvent(connection.provider,await req.text(),req.headers,secret.webhook_secret,connection.config);
      checked(await db.rpc('ct_queue_connection_event',{p_connection:connection.id,p_event:event.id,p_type:event.type}));
      return json({success:true});
    }
    if (req.method === 'GET') {
      const state = url.searchParams.get('state'), code = url.searchParams.get('code');
      if (!state || !code) return json({ error: 'Google authorization was cancelled or is incomplete.' }, 400);
      const stateRow = checked(await db.from('ct_connection_oauth_states').delete().eq('state', state).gt('expires_at', new Date().toISOString()).select('*').single());
      if(!enabledProviders().includes(stateRow.provider)) throw new Error('This provider is not enabled for the current rollout.');
      const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code, client_id: coreGoogleConfig(Deno.env.get).clientId, client_secret: coreGoogleConfig(Deno.env.get).clientSecret, redirect_uri: callbackUrl(), grant_type: 'authorization_code' }), signal: AbortSignal.timeout(15000) });
      const tokens = await response.json(); if (!response.ok || !tokens.refresh_token) throw new Error('Google did not grant ongoing access. Reconnect and approve read access.');
      const connection = checked(await db.from('ct_connections').insert({ user_id: stateRow.user_id, product_id: stateRow.product_id, provider: stateRow.provider, label: stateRow.provider === 'sheets' ? 'Google Sheets' : 'Google Analytics', config: stateRow.config }).select('id').single());
      try { checked(await db.from('ct_connection_secrets').insert({ connection_id: connection.id, encrypted_secret: await sealSecret({ refresh_token: tokens.refresh_token }) })); }
      catch(error) { await db.from('ct_connections').delete().eq('id', connection.id); throw error; }
      return new Response(null, { status: 302, headers: { Location: `${Deno.env.get('PUBLIC_APP_URL') || 'https://creatives-takeover.com'}/connections` } });
    }
    const bearer = req.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const body = await req.json();
    if (body.action === 'daily_sync') {
      if (bearer !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') && !(Deno.env.get('CORE_TOOLS_CRON_SECRET') && req.headers.get('x-core-cron-secret') === Deno.env.get('CORE_TOOLS_CRON_SECRET'))) return json({ error: 'Unauthorized' }, 401);
      const cutoff = new Date(Date.now()-15*60000).toISOString();
      const abandoned = checked(await db.from('ct_sync_runs').update({status:'failed',error:'Sync interrupted. Retry the connection.',finished_at:new Date().toISOString()}).eq('status','running').lt('started_at',cutoff).select('connection_id'));
      if(abandoned.length) checked(await db.from('ct_connections').update({status:'error',last_error:'Sync interrupted. Preview another sync to retry.'}).in('id',abandoned.map((r:any)=>r.connection_id)).eq('status','syncing'));
      const connections = checked(await db.from('ct_connections').select('*').eq('status', 'connected').in('provider',enabledProviders()).not('last_synced_at', 'is', null).or('last_synced_at.lt.'+new Date(Date.now()-86400000).toISOString()+',refresh_requested_at.not.is.null').order('last_synced_at').limit(10));
      const results = [];
      for (const connection of connections) { try { results.push({ id: connection.id, count: (await sync(db, connection, false)).count }); } catch { results.push({ id: connection.id, error: 'Sync failed; see connection status.' }); } }
      return json({ success: true, results });
    }
    const { data: auth } = await db.auth.getUser(bearer); if (!auth.user) return json({ error: 'Sign in to manage connections.' }, 401);
    const userId = auth.user.id;
    const product = body.productId ? checked(await db.from('ct_products').select('id').eq('id', body.productId).eq('user_id', userId).single()) : null;
    if (body.action === 'connect' || body.action === 'oauth_start') {
      if (!product || !enabledProviders().includes(body.provider)) return json({ error: 'Choose a product and provider.' }, 400);
      const config = body.config && typeof body.config === 'object' ? body.config : {};
      if(config.productScopeConfirmed !== 'true') throw new Error('Confirm that the selected source belongs to this product.');
      if (Object.values(config).some(value => typeof value !== 'string' || String(value).length > 250)) return json({ error: 'Invalid source settings.' }, 400);
      if (body.action === 'oauth_start') {
        if (!['sheets','ga4'].includes(body.provider) || !coreGoogleConfig(Deno.env.get).clientId) throw new Error('Google connection setup is not available yet.');
        const state = crypto.randomUUID(); checked(await db.from('ct_connection_oauth_states').insert({ state, user_id: userId, product_id: product.id, provider: body.provider, config }));
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.search = new URLSearchParams({ client_id: coreGoogleConfig(Deno.env.get).clientId, redirect_uri: callbackUrl(), response_type: 'code', access_type: 'offline', prompt: 'consent', state, scope: body.provider === 'sheets' ? 'https://www.googleapis.com/auth/spreadsheets.readonly' : 'https://www.googleapis.com/auth/analytics.readonly' }).toString();
        return json({ success: true, url: authUrl.toString() });
      }
      if (typeof body.token !== 'string' || body.token.length < 10 || body.token.length > 10000) return json({ error: 'Enter a valid read-only API credential.' }, 400);
      const connection = checked(await db.from('ct_connections').insert({ user_id: userId, product_id: product.id, provider: body.provider, label: String(body.label || body.provider).slice(0, 160), config }).select('id').single());
      try { checked(await db.from('ct_connection_secrets').insert({ connection_id: connection.id, encrypted_secret: await sealSecret({ token: body.token }) })); }
      catch(error) { await db.from('ct_connections').delete().eq('id', connection.id); throw error; }
      return json({ success: true, connectionId: connection.id });
    }
    if (body.action === 'upload') {
      if (!product || !Array.isArray(body.rows) || body.rows.length > 1000 || JSON.stringify(body.rows).length > 1000000) return json({ error: 'Choose a product and up to 1,000 rows (1 MB).' }, 400);
      const batch = checked(await db.from('ct_import_batches').insert({ user_id: userId, product_id: product.id, source_namespace: 'csv:' + String(body.sourceName || 'spreadsheet').trim().toLowerCase().slice(0,160), rows: body.rows }).select('id').single());
      return json({ success: true, batchId: batch.id, rows: body.rows });
    }
    if (body.action === 'accept' || body.action === 'preview') {
      const batch = checked(await db.from('ct_import_batches').select('*').eq('id', body.batchId).eq('user_id', userId).single());
      const connection = batch.connection_id ? checked(await db.from('ct_connections').select('*').eq('id', batch.connection_id).eq('user_id', userId).single()) : null;
      if (connection?.status === 'disconnected') throw new Error('Reconnect before accepting this import.');
      const mapping = body.mapping ?? batch.mapping;
      if (typeof mapping !== 'object' || Object.values(mapping).some(value => typeof value !== 'string')) throw new Error('Choose valid column mappings.');
      const normalized = await normalizeImport(connection?.provider ?? 'csv', batch.rows, mapping, connection?.id ?? batch.source_namespace);
      const keys = normalized.evidence.map(row => row.source_key);
      const existing = keys.length ? checked(await db.from('ct_evidence').select('source_key').eq('product_id', batch.product_id).eq('user_id', userId).in('source_key', keys)) : [];
      if (body.action === 'preview') return json({ success: true, evidence: normalized.evidence, metrics: normalized.metrics, duplicates: normalized.duplicates + existing.length });
      checked(await db.from('ct_import_batches').update({mapping}).eq('id',batch.id).eq('status','preview'));
      const count = checked(await db.rpc('ct_publish_import', { p_batch_id: batch.id, p_evidence: normalized.evidence, p_metrics: normalized.metrics }));
      if (connection) checked(await db.from('ct_connections').update({ mapping, last_synced_at: new Date().toISOString() }).eq('id', connection.id));
      return json({ success: true, count });
    }
    const connection = checked(await db.from('ct_connections').select('*').eq('id', body.connectionId).eq('user_id', userId).single());
    if(body.action==='configure_events'){
      if(!['stripe','tally','typeform','shopify'].includes(connection.provider)||typeof body.secret!=='string'||body.secret.length<16||body.secret.length>500)throw new Error('Use a supported provider and its webhook signing secret (16?500 characters).');
      const row=checked(await db.from('ct_connection_secrets').select('encrypted_secret').eq('connection_id',connection.id).single());
      const secret=await openSecret(row.encrypted_secret);secret.webhook_secret=body.secret;
      checked(await db.from('ct_connection_secrets').update({encrypted_secret:await sealSecret(secret)}).eq('connection_id',connection.id));
      return json({success:true,url:callbackUrl()+'?connection='+connection.id});
    }
    if (body.action === 'disconnect') {
      checked(await db.from('ct_connection_secrets').delete().eq('connection_id', connection.id));
      checked(await db.from('ct_connections').update({ status: 'disconnected', last_error: null }).eq('id', connection.id));
      return json({ success: true });
    }
    if (body.action === 'sync' && connection.status !== 'disconnected' && enabledProviders().includes(connection.provider)) return json({ success: true, ...await sync(db, connection, true) });
    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'The connection request failed.' }, 400);
  }
});
