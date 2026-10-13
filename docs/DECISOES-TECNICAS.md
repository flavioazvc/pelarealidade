# Decisões técnicas e limites desta versão

## Implantação e persistência atual

O site é uma aplicação estática publicada no GitHub Pages. A autenticação usa Supabase Auth com nickname; campanhas, fichas, sessões e quadros são sincronizados com o Supabase, com RLS no Postgres. O `localStorage` permanece como estado local/cache do navegador e o backup JSON continua disponível.

## Integração Supabase — estado atual

`src/supabase.js` inicializa o SDK `@supabase/supabase-js` com URL e chave publishable. `src/auth.js` autentica por nickname por meio da Edge Function autorizada; as Edge Functions `username-login` e `admin-users` mediam login e operações administrativas. A criação de contas permanece restrita ao administrador e o cadastro público fica desativado.

A chave publishable foi projetada para uso no navegador e o repositório GitHub é público. Ela não é uma credencial administrativa. Nenhuma chave Secret/`service_role`, senha de banco ou token administrativo pode ser publicada no HTML, JavaScript ou GitHub. Migrações de schema devem ser executadas por uma ferramenta autenticada de administração ou pelo painel Supabase.

O perfil protegido armazena nickname, papel e nome de exibição — nunca a senha. Os papéis aplicados pelo servidor são `admin`, `master` e `player`.

## Arquitetura de contas e permissões atual

O administrador Flávio cria/gerencia contas; o login é exclusivo por nickname e senha via Supabase Auth. A aplicação não guarda senha recuperável e o administrador não consulta as senhas dos usuários. O nome de exibição do perfil é usado na associação visível entre ficha e jogador.

Flávio pode ler e administrar os dados globais; mestres gerenciam suas campanhas; jogadores ficam limitados às próprias fichas e participações autorizadas. A autorização é verificada no servidor e no RLS; papéis não são confiados a metadados editáveis pelo usuário.

## Sessões ao vivo e acesso de jogadores

Uma sessão pode ser iniciada/encerrada por administrador ou mestre na área **Sessões**. Há no máximo uma sessão ativa por campanha. Jogadores veem apenas uma tela preta de espera até sua campanha ter sessão ativa; então a aplicação mostra somente as fichas vinculadas ao próprio usuário nessa campanha, em modo somente leitura. O estado é verificado novamente a cada 10 segundos para refletir início e encerramento sem exigir recarga. O RLS limita a leitura de campanhas e sessões ao contexto ativo, bloqueia quadros e impede a leitura de fichas de outros jogadores.

## Rituais da ficha

Rituais são armazenados em formato estruturado, preservando texto legado existente. Elemento, círculo, execução e alcance usam as opções definidas na interface; alvo, duração e resistência são textos personalizados. Efeito base e versões Discente/Verdadeiro são opcionais/personalizáveis. A imagem é registrada como URL HTTP(S); upload de arquivo para Storage ainda não faz parte deste fluxo.

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
