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

O fundo paranormal é procedural, composto por CSS e SVG inline, sem imagens, fontes ou bibliotecas externas. Cada carregamento completo escolhe aleatoriamente uma de duas composições (véu rubro ou ruptura espectral): nuvens de fumaça desfocadas, filamentos vermelhos curvos que descem e clarões brancos intermitentes. A animação permanece sob o conteúdo, com superfícies escuras translúcidas e contraste de texto preservado. A preferência `prefers-reduced-motion` interrompe o movimento contínuo sem remover o fundo.
