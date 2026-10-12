# Decisões técnicas e limites desta versão

## Implantação e persistência atual

O site continua sendo uma aplicação estática publicada no GitHub Pages. Campanhas, fichas, sessões e quadros ainda são gravados no `localStorage` do navegador e não são enviados ao Supabase. Exportação JSON continua sendo o backup disponível; não há migração remota nem recuperação de dados entre dispositivos nesta etapa.

## Integração Supabase — etapa de conexão

`src/supabase.js` guarda a URL pública do projeto e a chave `publishable`, inicializa de forma assíncrona o SDK `@supabase/supabase-js` em versão fixada e consulta `auth/v1/settings` para confirmar que a API Auth responde. Essa verificação não cria usuário, não abre sessão e não consulta nem grava dados do jogo. Se o SDK ou a API falhar, a aplicação local continua funcionando.

A chave publishable foi projetada para uso no navegador e o repositório GitHub é público. Ela não é uma credencial administrativa. Nenhuma chave Secret/`service_role`, senha de banco ou token administrativo pode ser publicada no HTML, JavaScript ou GitHub. Operações administrativas futuras — convites, schema e migrações — precisam de execução confiável no servidor ou no painel Supabase.

Na primeira verificação, o endpoint Auth respondeu com sucesso e indicou que o cadastro público estava habilitado. Após o login autorizado no painel, `Allow new users to sign up` foi desligado e a resposta pública de `auth/v1/settings` confirmou `disable_signup: true`. A confirmação de e-mail continua habilitada. Ainda não foram criadas tabelas, políticas RLS, buckets, Edge Functions, convites ou contas de jogadores/mestres; não trate a aplicação como sincronizada ou autenticada.

## Arquitetura de contas e permissões aprovada

A arquitetura futura usa Supabase Auth para credenciais de acesso. Os convites são iniciados pelo Administrador Flávio; cada convidado conclui a própria conta e define sua senha. A aplicação não guarda senha recuperável, e o administrador não consulta as senhas dos usuários.

Papéis previstos: `admin` (Flávio), `master` e `player`. Flávio poderá ler todas as fichas e campanhas e administrar contas; um mestre verá as campanhas que administra; um jogador verá as próprias fichas e as campanhas das quais é membro. As autorizações deverão ser verificadas no servidor e aplicadas por RLS no Postgres e no Storage. Papéis não devem ser confiados a metadados editáveis pelo usuário.

## Ficha de personagem

Referência declarada: **Ordem Paranormal RPG — Livro Básico, versão 1.3 (Registro de Atualizações publicado pela Jambô em 31/01/2025)**. A editora havia esclarecido que correções da reimpressão não constituíam uma nova edição do sistema e que as versões anteriores permaneciam válidas. A tela usa nomes de campos e atributos como registro funcional, não reproduz textos, tabelas ou ilustrações do livro.

Atributos, perícias, PV, PE, SAN, Defesa, NEX/patente e demais campos numéricos são anotados manualmente. Não há cálculo automático nem validação de combinações de regras: isso evita misturar versões ou afirmar uma regra não confirmada. Confirme valores e erratas com a cópia oficial adotada pela mesa. Esta primeira entrega não inclui uma lista fechada de perícias nem importação de ficha oficial.

Fontes consultadas:

- [Página oficial do Livro Básico — Jambô Editora](https://jamboeditora.com.br/produto/ordem-paranormal-rpg/)
- [Nota da Jambô sobre as correções de reimpressão (28/01/2025)](https://x.com/jamboeditora/status/1884336499203645882)
- [Anúncio da Jambô do Registro de Atualizações, versão 1.3 (31/01/2025)](https://x.com/jamboeditora/status/1885424944462340310)
- [Conteúdo editorial de Ordem Paranormal RPG — blog da Jambô](https://blog.jamboeditora.com.br/tags/ordem-paranormal-rpg/)

## Compatibilidade e experiência visual

O projeto não usa framework ou compilação. Os caminhos de recursos são relativos para funcionar na URL de projeto do Pages (`/<repositório>/`). O roteamento usa fragmentos (`#/...`), evitando necessidade de fallback de servidor. Os navegadores precisam suportar módulos JavaScript, `localStorage`, `structuredClone` e a API `<dialog>`.

O fundo usa uma única superfície Canvas 2D fixa que cobre o viewport inteiro, com neblina procedural em camadas de cores frias e quentes e relâmpagos ramificados e intermitentes. Duas paletas atmosféricas são sorteadas no carregamento completo. A resolução interna é limitada a aproximadamente 700 mil pixels e a renderização a 18 quadros por segundo; a animação pausa quando a aba fica oculta. Não há `blur` animado, imagens de fundo ou fontes externas. A preferência `prefers-reduced-motion` mantém um quadro estático sem relâmpagos ou animação contínua.

A página inicial prioriza a saudação, os totais e a lista de alterações recentes; o espaço “Logins e senhas” permanece um marcador em manutenção, sem coleta de credenciais. As listas de campanhas e personagens usam cartões responsivos, com três colunas em telas largas. Capas e retratos são URLs HTTP(S) opcionais; sem imagem, a interface exibe um placeholder e as iniciais. Nome do jogador e anotação do jogador são campos separados para preservar notas preexistentes.

Na campanha, cada ficha vinculada resume NEX, PV, PE, SAN, Defesa e os cinco atributos registrados manualmente, com link para a ficha completa. A tela de planejamento monta uma miniatura SVG a partir de uma amostra limitada de cartões, ligações e traços do quadro persistido, sem salvar imagem derivada. Exportação e importação JSON continuam disponíveis no menu global.
