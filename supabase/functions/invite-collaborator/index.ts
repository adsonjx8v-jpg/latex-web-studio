import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

function defaultKey(name: string) {
  try {
    const keys = JSON.parse(Deno.env.get(name) || '{}');
    return typeof keys.default === 'string' ? keys.default : '';
  } catch { return ''; }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || defaultKey('SUPABASE_PUBLISHABLE_KEYS');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || defaultKey('SUPABASE_SECRET_KEYS');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL');
  const appUrl = Deno.env.get('APP_URL');
  if (!supabaseUrl || !anonKey || !serviceKey || !resendKey || !fromEmail || !appUrl) {
    return json({ error: 'O serviço de convites ainda não foi configurado.' }, 503);
  }

  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Entre na sua conta para enviar um convite.' }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData.user;
  if (authError || !user?.id || !user.email) return json({ error: 'Sua sessão expirou. Entre novamente.' }, 401);

  let body: { documentId?: string; email?: string; role?: string };
  try { body = await request.json(); } catch { return json({ error: 'Dados do convite inválidos.' }, 400); }
  const documentId = typeof body.documentId === 'string' ? body.documentId : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role;
  if (!/^[0-9a-f-]{36}$/i.test(documentId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Informe um e-mail válido e um documento.' }, 400);
  }
  if (role !== 'editor' && role !== 'viewer') return json({ error: 'Selecione uma permissão válida.' }, 400);
  if (email === user.email.toLowerCase()) return json({ error: 'Esse documento já pertence à sua conta.' }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: document, error: documentError } = await admin
    .from('documents').select('id, owner_id, title').eq('id', documentId).maybeSingle();
  if (documentError) return json({ error: 'Não foi possível verificar o documento.' }, 500);
  if (!document || document.owner_id !== user.id) return json({ error: 'Somente o proprietário pode convidar pessoas.' }, 403);

  const { error: shareError } = await admin.from('document_shares').upsert({
    document_id: document.id,
    owner_id: user.id,
    email,
    role,
    invite_status: 'pending',
    invited_by: user.id,
  }, { onConflict: 'document_id,email' });
  if (shareError) return json({ error: 'Não foi possível registrar as permissões do convite.' }, 500);

  let inviteUrl: URL;
  try {
    inviteUrl = new URL(appUrl);
    inviteUrl.searchParams.set('document', document.id);
  } catch { return json({ error: 'O endereço público do site não está configurado.' }, 503); }
  const title = escapeHtml(document.title || 'Documento LaTeX');
  const roleLabel = role === 'editor' ? 'editar' : 'visualizar';
  const sender = escapeHtml(user.email);
  let response: Response;
  try { response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: 'Convite para colaborar no LumaTex',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:32px auto;color:#26243a"><div style="font-size:22px;font-weight:700;margin-bottom:24px">LumaTex</div><h1 style="font-size:22px">Você recebeu um convite</h1><p><b>${sender}</b> convidou você para ${roleLabel} em <b>${title}</b>.</p><p style="margin:28px 0"><a href="${escapeHtml(inviteUrl.href)}" style="background:#6958e8;color:white;text-decoration:none;padding:13px 19px;border-radius:8px;display:inline-block;font-weight:700">Abrir documento</a></p><p style="color:#747589;font-size:13px">Entre ou crie uma conta usando este endereço de e-mail para acessar o documento.</p></div>`,
    }),
  }); } catch (error) {
    console.error('Resend request failed:', error);
    return json({ error: 'O convite foi registrado, mas não foi possível conectar ao serviço de e-mail.' }, 502);
  }
  if (!response.ok) {
    const details = await response.text();
    console.error('Resend error:', response.status, details);
    return json({ error: 'O convite foi registrado, mas o e-mail não foi enviado. Confira o domínio e a chave do Resend.' }, 502);
  }
  return json({ ok: true, email, role });
});
