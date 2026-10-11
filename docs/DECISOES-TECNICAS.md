# Decisões técnicas e limites desta versão

## Implantação e privacidade

O site é uma aplicação estática hospedável no GitHub Pages: HTML, CSS e JavaScript no navegador, sem API, servidor de aplicação, analytics ou dependência paga. Campanhas, fichas, sessões e quadros são gravados no `localStorage` deste navegador e origem do site. O conteúdo não é enviado ao GitHub Pages nem sincronizado automaticamente entre navegadores ou dispositivos. Como não há autenticação, qualquer pessoa com acesso ao mesmo perfil de navegador/dispositivo pode consultar ou apagar esses registros; não use um equipamento compartilhado para informações que precisem de sigilo. A publicação torna o código e a interface acessíveis publicamente, mas não publica os registros que permanecem no armazenamento local.

A persistência depende das políticas e da capacidade do navegador. Limpar os dados do site, usar outro navegador/dispositivo ou exceder a cota pode tornar os registros inacessíveis. Use a exportação JSON periódica para cópia de segurança. Não há recuperação remota. A aplicação não oferece controle de acesso, criptografia de dados em repouso, backup automático, edição simultânea ou recuperação de conta.

Não existe login, cadastro, perfil ou permissão simulada. O modelo separa campanha, personagem, sessão e quadro; a associação de personagens às campanhas é independente da ficha. Excluir uma campanha remove suas sessões e quadro, mas apenas desassocia — não apaga — as fichas originais.

## Ficha de personagem

Referência declarada: **Ordem Paranormal RPG — Livro Básico, versão 1.3 (Registro de Atualizações publicado pela Jambô em 31/01/2025)**. A editora havia esclarecido que correções da reimpressão não constituíam uma nova edição do sistema e que as versões anteriores permaneciam válidas. A tela usa nomes de campos e atributos como registro funcional, não reproduz textos, tabelas ou ilustrações do livro.

Atributos, perícias, PV, PE, SAN, Defesa, NEX/patente e demais campos numéricos são anotados manualmente. Não há cálculo automático nem validação de combinações de regras: isso evita misturar versões ou afirmar uma regra não confirmada. Confirme valores e erratas com a cópia oficial adotada pela mesa. Esta primeira entrega não inclui uma lista fechada de perícias nem importação de ficha oficial.

Fontes consultadas:

- [Página oficial do Livro Básico — Jambô Editora](https://jamboeditora.com.br/produto/ordem-paranormal-rpg/)
- [Nota da Jambô sobre as correções de reimpressão (28/01/2025)](https://x.com/jamboeditora/status/1884336499203645882)
- [Anúncio da Jambô do Registro de Atualizações, versão 1.3 (31/01/2025)](https://x.com/jamboeditora/status/1885424944462340310)
- [Conteúdo editorial de Ordem Paranormal RPG — blog da Jambô](https://blog.jamboeditora.com.br/tags/ordem-paranormal-rpg/)

## Compatibilidade

O projeto não usa framework ou compilação. Os caminhos de recursos são relativos para funcionar na URL de projeto do Pages (`/<repositório>/`). O roteamento usa fragmentos (`#/...`), evitando necessidade de fallback de servidor. Os navegadores precisam suportar módulos JavaScript, `localStorage`, `structuredClone` e a API `<dialog>`.

## Atmosfera visual

O fundo usa uma única superfície Canvas 2D fixa que cobre o viewport inteiro, com neblina procedural em camadas de cores frias e quentes e relâmpagos ramificados e intermitentes. Duas paletas atmosféricas são sorteadas no carregamento completo. A resolução interna é limitada a aproximadamente 700 mil pixels e a renderização a 18 quadros por segundo; a animação pausa quando a aba fica oculta. Não há `blur` animado, imagens de fundo, fontes ou bibliotecas externas. A preferência `prefers-reduced-motion` mantém um quadro estático sem relâmpagos ou animação contínua.


## Apresentação dos registros

A página inicial prioriza a saudação, os totais e a lista de alterações recentes; o espaço “Logins e senhas” é apenas um marcador em manutenção, sem coleta de credenciais. As listas de campanhas e personagens usam cartões responsivos, com três colunas em telas largas. Capas e retratos são URLs HTTP(S) opcionais; sem imagem, a interface exibe um placeholder e as iniciais. Nome do jogador e anotação do jogador são campos separados para preservar notas preexistentes.

Na campanha, cada ficha vinculada resume NEX, PV, PE, SAN, Defesa e os cinco atributos registrados manualmente, com link para a ficha completa. A tela de planejamento monta uma miniatura SVG a partir de uma amostra limitada de cartões, ligações e traços do quadro persistido, sem salvar imagem derivada. Exportação e importação JSON continuam disponíveis no menu global.
