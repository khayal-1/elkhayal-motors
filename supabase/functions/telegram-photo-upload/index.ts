import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const destination = Deno.env.get('TELEGRAM_CHAT_ID');
  if (!authHeader || !supabaseUrl || !anonKey) return json({ error: 'Authentication is required.' }, 401);
  if (!botToken || !destination) return json({ error: 'Telegram integration is not configured.' }, 503);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Sign in is required.' }, 401);

  const { data: roles, error: roleError } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (roleError) return json({ error: 'Could not verify upload permission.' }, 403);
  if (!(roles || []).some(({ role }) => ['employee', 'manager', 'owner', 'admin'].includes(role))) {
    return json({ error: 'You do not have permission to upload catalog photos.' }, 403);
  }

  let form: FormData;
  try { form = await req.formData(); } catch { return json({ error: 'Expected multipart form data.' }, 400); }
  const image = form.get('photo');
  const motorcycleId = String(form.get('motorcycle_id') || '').trim() || null;
  if (!(image instanceof File) || !image.type.startsWith('image/')) return json({ error: 'Choose an image file.' }, 400);
  if (image.size < 1 || image.size > 10 * 1024 * 1024) return json({ error: 'Images must be 10 MB or smaller.' }, 413);

  const telegramForm = new FormData();
  telegramForm.set('chat_id', destination);
  telegramForm.set('photo', image, image.name || 'motorcycle-photo');
  telegramForm.set('caption', 'El Khayal Motors catalog image');
  const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, { method: 'POST', body: telegramForm });
  const telegramResult = await telegramResponse.json().catch(() => null);
  if (!telegramResponse.ok || !telegramResult?.ok) return json({ error: 'Telegram did not accept the image.' }, 502);

  const photo = telegramResult.result.photo?.at(-1);
  if (!photo?.file_id) return json({ error: 'Telegram response did not include an image reference.' }, 502);
  const { data: saved, error: saveError } = await supabase.from('photo_assets').insert({
    motorcycle_id: motorcycleId,
    telegram_file_id: photo.file_id,
    telegram_message_id: telegramResult.result.message_id,
    mime_type: image.type,
    created_by: user.id
  }).select('id, motorcycle_id, created_at').single();
  if (saveError) return json({ error: 'Image reached Telegram but its reference could not be saved.' }, 502);
  return json({ photo_asset: saved });
});
