# LumaTex

Editor de LaTeX em português, com login por e-mail, documentos sincronizados e convites para colaboradores. A interface é estática e pode ser hospedada no GitHub Pages; autenticação, banco e e-mails são fornecidos por Supabase e Resend.

## Configuração para habilitar contas Google

O botão **Continuar com Google** cria a conta automaticamente no primeiro acesso e abre o editor após o retorno do Google. O Supabase precisa conhecer as credenciais OAuth do Google para concluir esse fluxo.

1. Crie um projeto no [Supabase](https://supabase.com/) e execute [`supabase/schema.sql`](supabase/schema.sql) no **SQL Editor**.

Se o projeto já estava configurado antes de adicionar o arquivo BibTeX, execute também [`supabase/migrations/20261015180000_add_document_bibliography.sql`](supabase/migrations/20261015180000_add_document_bibliography.sql) no **SQL Editor** antes de publicar o `index.html` atualizado. Essa migração adiciona a coluna que armazena `referencias.bib`.
2. No Google Cloud, crie um cliente OAuth do tipo **Web application**. Em **Authorized JavaScript origins**, adicione a origem do site (por exemplo, `https://SEU_USUARIO.github.io`). Em **Authorized redirect URIs**, adicione o callback mostrado na configuração do provedor Google no Supabase, normalmente `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`.
3. No Supabase, abra **Authentication → Providers → Google**, habilite o provedor e informe o Google **Client ID** e **Client Secret**. Guarde o segredo no painel do Supabase; não o publique no GitHub.
4. Em **Authentication → URL Configuration**, defina o endereço publicado do site como **Site URL** e inclua o endereço do GitHub Pages na lista de redirecionamentos permitidos. O app retorna para o endereço da página que iniciou o login.
5. Copie a **Project URL** e a chave pública anon/publishable para [`supabase-config.js`](supabase-config.js). Esse arquivo contém somente valores públicos do navegador; com o schema aplicado, o acesso aos documentos é limitado por RLS.
6. Publique `index.html`, `supabase-config.js`, `busytex-sw.js`, as pastas `supabase/` e `vendor/` e este `README.md` no repositório. No GitHub, use **Settings → Pages** para ativar o Pages. A autenticação e os links de convite precisam do site publicado em HTTPS; abrir `index.html` diretamente como `file://` não funciona para login.

O formulário de e-mail e senha continua disponível como alternativa; para habilitá-lo, ative o provedor Email no Supabase e configure confirmação de e-mail e um SMTP de produção.

## Configurar e-mail de convite

1. Crie uma conta Resend e verifique um domínio de envio. O endereço remetente deve pertencer a esse domínio.
2. Instale o Supabase CLI, vincule a pasta ao projeto com `supabase link --project-ref SEU_PROJECT_REF` e publique a função com `supabase functions deploy invite-collaborator`.
3. Cadastre em **Supabase → Edge Functions → Secrets**: `RESEND_API_KEY`, `INVITE_FROM_EMAIL` (por exemplo, `LumaTex <convites@seudominio.com>`) e `APP_URL` (o endereço HTTPS publicado, incluindo a pasta do repositório se houver). A função lê a URL e as chaves do Supabase injetadas pelo próprio ambiente Edge.
4. Envie um convite na tela **Compartilhar**. A função verifica a sessão e a propriedade do documento, grava a permissão e envia o e-mail. Quem recebe deve entrar ou criar uma conta com o mesmo endereço convidado.

**Segredos:** nunca coloque `SUPABASE_SERVICE_ROLE_KEY` nem `RESEND_API_KEY` em `supabase-config.js`, no HTML ou no repositório. A chave service role ignora as políticas de acesso e só é usada pela Edge Function.

## Recursos

- Criar, editar e sincronizar documentos na nuvem, com importação dos documentos locais existentes no primeiro acesso.
- Alternar entre `main.tex` e `referencias.bib`, com os dois arquivos salvos no documento.
- Criar conta, confirmar e-mail, entrar, sair e solicitar redefinição de senha.
- Compartilhar por convite com permissão de edição ou somente leitura; atualizações são retransmitidas pelo Supabase Realtime.
- Completar comandos LaTeX e fechar automaticamente ambientes `\begin{...}`.
- Compilar documentos com TeX Live 2026 em WebAssembly, mostrar o PDF real e baixá-lo. O compilador processa classes, pacotes, comandos personalizados, TikZ e PGFPlots, incluindo `compat=1.18`.
- Processar bibliografias BibTeX quando o documento usa `\bibliography{referencias}` e o arquivo `referencias.bib` está preenchido. O fluxo atual atende BibTeX tradicional; documentos que usam `biblatex`/Biber precisam de uma etapa adicional.

## Limites atuais

O primeiro login, os convites reais por e-mail e a sincronização dependem de configurar Google OAuth, Supabase e Resend como descrito acima. A sincronização salva o documento inteiro; se duas pessoas editarem ao mesmo tempo, a última gravação pode substituir alterações simultâneas.

A compilação exige o site publicado em HTTPS e conexão com a internet. Na primeira compilação, o service worker busca a engine WebAssembly de aproximadamente 32 MB do host público do BusyTeX e a guarda em cache local; o navegador também baixa os arquivos base do TeX Live de aproximadamente 66 MB. Depois, os arquivos base ficam em cache local. Outros arquivos de pacotes são buscados sob demanda no servidor TeX Live 2026 e podem ser solicitados novamente em outra sessão. O código do documento é compilado no navegador; o servidor externo recebe somente pedidos dos arquivos de pacotes. MathJax carrega do jsDelivr para a prévia rápida e também requer internet.