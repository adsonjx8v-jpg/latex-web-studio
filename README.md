# LumaTex

Editor de LaTeX em português, com login por e-mail, documentos sincronizados e convites para colaboradores. A interface é estática e pode ser hospedada no GitHub Pages; autenticação, banco e e-mails são fornecidos por Supabase e Resend.

## Configuração para habilitar contas Google

O botão **Continuar com Google** cria a conta automaticamente no primeiro acesso e abre o editor após o retorno do Google. O Supabase precisa conhecer as credenciais OAuth do Google para concluir esse fluxo.

1. Crie um projeto no [Supabase](https://supabase.com/) e execute [`supabase/schema.sql`](supabase/schema.sql) no **SQL Editor**. Se o projeto Supabase já existia, execute também as migrações pendentes de BibTeX e de arquivos do projeto ZIP listadas abaixo, antes de publicar a nova versão.
2. No Google Cloud, crie um cliente OAuth do tipo **Web application**. Em **Authorized JavaScript origins**, adicione a origem do site (por exemplo, `https://SEU_USUARIO.github.io`). Em **Authorized redirect URIs**, adicione o callback mostrado na configuração do provedor Google no Supabase, normalmente `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`.
3. No Supabase, abra **Authentication → Providers → Google**, habilite o provedor e informe o Google **Client ID** e **Client Secret**. Guarde o segredo no painel do Supabase; não o publique no GitHub.
4. Em **Authentication → URL Configuration**, defina o endereço publicado do site como **Site URL** e inclua o endereço do GitHub Pages na lista de redirecionamentos permitidos. O app retorna para o endereço da página que iniciou o login.
5. Copie a **Project URL** e a chave pública anon/publishable para [`supabase-config.js`](supabase-config.js). Esse arquivo contém somente valores públicos do navegador; com o schema aplicado, o acesso aos documentos é limitado por RLS.
6. Publique `index.html`, `project-zip.js`, `supabase-config.js`, `texlive-sw.js`, as pastas `supabase/` e `vendor/swiftlatex/` e este `README.md` no repositório. No GitHub, use **Settings → Pages** para ativar o Pages. A autenticação e os links de convite precisam do site publicado em HTTPS; abrir `index.html` diretamente como `file://` não funciona para login.

O formulário de e-mail e senha continua disponível como alternativa; para habilitá-lo, ative o provedor Email no Supabase e configure confirmação de e-mail e um SMTP de produção.

## Configurar e-mail de convite

1. Crie uma conta Resend e verifique um domínio de envio. O endereço remetente deve pertencer a esse domínio.
2. Instale o Supabase CLI, vincule a pasta ao projeto com `supabase link --project-ref SEU_PROJECT_REF` e publique a função com `supabase functions deploy invite-collaborator`.
3. Cadastre em **Supabase → Edge Functions → Secrets**: `RESEND_API_KEY`, `INVITE_FROM_EMAIL` (por exemplo, `LumaTex <convites@seudominio.com>`) e `APP_URL` (o endereço HTTPS publicado, incluindo a pasta do repositório se houver). A função lê a URL e as chaves do Supabase injetadas pelo próprio ambiente Edge.
4. Envie um convite na tela **Compartilhar**. A função verifica a sessão e a propriedade do documento, grava a permissão e envia o e-mail. Quem recebe deve entrar ou criar uma conta com o mesmo endereço convidado.

**Segredos:** nunca coloque `SUPABASE_SERVICE_ROLE_KEY` nem `RESEND_API_KEY` em `supabase-config.js`, no HTML ou no repositório. A chave service role ignora as políticas de acesso e só é usada pela Edge Function.

Em uma instalação Supabase já existente, execute no **SQL Editor** as migrações que ainda não foram aplicadas: [`supabase/migrations/20261015180000_add_document_bibliography.sql`](supabase/migrations/20261015180000_add_document_bibliography.sql) para armazenar `referencias.bib` e [`supabase/migrations/20261018190000_add_project_files.sql`](supabase/migrations/20261018190000_add_project_files.sql) para armazenar arquivos auxiliares de projetos ZIP.

## Recursos

- Criar, editar e sincronizar documentos na nuvem, com importação dos documentos locais existentes no primeiro acesso.
- Importar projetos `.zip` de até 25 MB, com arquivos de até 16 MB descompactados no total; o `.tex` principal, a bibliografia, as classes, os estilos e as figuras são sincronizados e enviados juntos ao compilador.
- Alternar entre `main.tex`, `referencias.bib` e arquivos de texto auxiliares do projeto.
- Criar conta, confirmar e-mail, entrar, sair e solicitar redefinição de senha.
- Compartilhar por convite com permissão de edição ou somente leitura; atualizações são retransmitidas pelo Supabase Realtime.
- Completar comandos LaTeX e fechar automaticamente ambientes `\begin{...}`.
- Compilar documentos com PDFTeX em WebAssembly, visualizar o PDF compilado no editor e baixá-lo separadamente pelo botão “Baixar PDF”. O modelo **Artigo matemático** inclui o preâmbulo enviado por Adson e exemplos de `amsthm`, `tcolorbox`, TikZ e PGFPlots (`compat=1.18`). Os arquivos dos pacotes LaTeX são solicitados sob demanda ao espelho TeX Live; o motor não baixa um conjunto grande de pacotes antes da primeira compilação.
- Processar bibliografias BibTeX quando o documento usa `\bibliography{referencias}` e o arquivo `referencias.bib` está preenchido. O fluxo atual atende BibTeX tradicional; documentos que usam `biblatex`/Biber precisam de uma etapa adicional.

## Limites atuais

O primeiro login, os convites reais por e-mail e a sincronização dependem de configurar Google OAuth, Supabase e Resend como descrito acima. A sincronização salva o documento inteiro; se duas pessoas editarem ao mesmo tempo, a última gravação pode substituir alterações simultâneas.

A compilação exige o site publicado em HTTPS e conexão com a internet. O motor PDFTeX em WebAssembly fica em `vendor/swiftlatex/`; o service worker `texlive-sw.js` busca e armazena em cache somente os arquivos de pacotes necessários à compilação. O código do documento é compilado no navegador; o espelho externo recebe pedidos de arquivos TeX, não o conteúdo do documento. MathJax carrega do jsDelivr para a prévia rápida e também requer internet. A prévia HTML é aproximada: comandos TikZ e figuras arbitrárias são mostrados como indicação até a compilação, quando o PDF real substitui a prévia.
