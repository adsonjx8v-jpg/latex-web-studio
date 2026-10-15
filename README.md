# LumaTex

Editor de LaTeX em português, com login por e-mail, documentos sincronizados e convites para colaboradores. A interface é estática e pode ser hospedada no GitHub Pages; autenticação, banco e e-mails são fornecidos por Supabase e Resend.

## Configuração para habilitar contas

1. Crie um projeto no [Supabase](https://supabase.com/) e execute [`supabase/schema.sql`](supabase/schema.sql) no **SQL Editor**.
2. Em **Authentication → Providers → Email**, habilite o provedor e a confirmação de e-mail. Configure um SMTP de produção para que confirmações e recuperação de senha sejam entregues de forma confiável.
3. Em **Authentication → URL Configuration**, defina o endereço publicado do site como **Site URL** e inclua o endereço do GitHub Pages na lista de redirecionamentos permitidos.
4. Copie a **Project URL** e a chave pública anon/publishable para [`supabase-config.js`](supabase-config.js). Esse arquivo contém somente valores públicos do navegador; com o schema aplicado, o acesso aos documentos é limitado por RLS.
5. Publique `index.html`, `supabase-config.js`, a pasta `supabase/` e este `README.md` no repositório. No GitHub, use **Settings → Pages** para ativar o Pages. A autenticação e os links de convite precisam do site publicado em HTTPS; abrir `index.html` diretamente como `file://` não funciona para login.

## Configurar e-mail de convite

1. Crie uma conta Resend e verifique um domínio de envio. O endereço remetente deve pertencer a esse domínio.
2. Instale o Supabase CLI, vincule a pasta ao projeto com `supabase link --project-ref SEU_PROJECT_REF` e publique a função com `supabase functions deploy invite-collaborator`.
3. Cadastre em **Supabase → Edge Functions → Secrets**: `RESEND_API_KEY`, `INVITE_FROM_EMAIL` (por exemplo, `LumaTex <convites@seudominio.com>`) e `APP_URL` (o endereço HTTPS publicado, incluindo a pasta do repositório se houver). A função lê a URL e as chaves do Supabase injetadas pelo próprio ambiente Edge.
4. Envie um convite na tela **Compartilhar**. A função verifica a sessão e a propriedade do documento, grava a permissão e envia o e-mail. Quem recebe deve entrar ou criar uma conta com o mesmo endereço convidado.

**Segredos:** nunca coloque `SUPABASE_SERVICE_ROLE_KEY` nem `RESEND_API_KEY` em `supabase-config.js`, no HTML ou no repositório. A chave service role ignora as políticas de acesso e só é usada pela Edge Function.

## Recursos

- Criar, editar e sincronizar documentos na nuvem, com importação dos documentos locais existentes no primeiro acesso.
- Criar conta, confirmar e-mail, entrar, sair e solicitar redefinição de senha.
- Compartilhar por convite com permissão de edição ou somente leitura; atualizações são retransmitidas pelo Supabase Realtime.
- Completar comandos LaTeX e fechar automaticamente ambientes `\\begin{...}`.
- Renderizar matemática com MathJax e baixar um PDF simplificado da pré-visualização.

## Limites atuais

O primeiro login, os convites reais por e-mail e a sincronização dependem de configurar Supabase, SMTP e Resend como descrito acima. A sincronização salva o documento inteiro; se duas pessoas editarem ao mesmo tempo, a última gravação pode substituir alterações simultâneas. O PDF atual é uma exportação simplificada no navegador; não substitui a compilação completa com LaTeX/TeX Live. MathJax carrega do jsDelivr e requer internet.
