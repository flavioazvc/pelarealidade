# PROJETO: PELA REALIDADE — ACESSO RESTRITO

## 1. OBJETIVO DO PROJETO

Desenvolva uma aplicação web funcional chamada **Pela Realidade — Acesso Restrito**, destinada ao gerenciamento de campanhas de RPG de mesa baseadas no sistema Ordem Paranormal RPG.

O projeto deverá funcionar como uma plataforma independente para organizar campanhas, personagens, fichas, sessões e planejamentos narrativos. Seu principal objetivo é facilitar o trabalho do mestre, oferecendo ferramentas práticas e uma interface imersiva inspirada no clima investigativo, misterioso e paranormal do universo de Ordem Paranormal.

A primeira versão deverá priorizar a funcionalidade, a simplicidade de utilização, a persistência dos dados e a possibilidade de expansão futura.

Não quero apenas um protótipo visual. Os botões, formulários, operações de criação, edição, exclusão e navegação deverão funcionar de verdade, e os dados deverão ser persistidos conforme os requisitos deste documento.

## 2. REGRAS FUNDAMENTAIS DE IMPLEMENTAÇÃO

Siga rigorosamente estas determinações:

1. Não implemente autenticação nesta versão.
2. Não crie páginas, formulários ou telas de login, cadastro de usuários ou recuperação de senha.
3. Não implemente contas de jogadores ou mestres neste momento.
4. Desenvolva a aplicação com dados reais e persistentes, sem depender exclusivamente de dados temporários ou fictícios.
5. Escolha a arquitetura e as tecnologias mais adequadas ao projeto, priorizando simplicidade, segurança, manutenção e expansão futura.
6. Explique brevemente as principais escolhas técnicas e eventuais limitações da solução adotada.
7. Não preencha automaticamente as campanhas, os personagens ou os quadros com histórias, pistas, missões ou outros conteúdos narrativos inventados.
8. Não considere uma funcionalidade concluída apenas porque sua interface foi desenhada. Implemente e teste seu funcionamento real.
9. Prepare a estrutura do projeto para que seja possível adicionar autenticação e permissões posteriormente, sem implementar esses recursos agora.
10. Não substitua funcionalidades solicitadas por botões decorativos, dados simulados apresentados como reais ou operações que não salvam as alterações.

## 3. IDENTIDADE VISUAL

O nome exibido no site deverá ser:

**Pela Realidade**
**ACESSO RESTRITO**

A identidade visual deverá transmitir mistério, investigação, tensão e imersão, inspirando-se no gênero de terror investigativo e nas convenções visuais de plataformas de RPG de mesa.

### Diretrizes visuais

- Utilize uma paleta predominantemente escura, com preto, cinza-carvão e tons próximos.
- Utilize cores de destaque discretas, como vermelho escuro, cinza-claro ou outras tonalidades coerentes com a identidade visual.
- Trabalhe com tipografia legível, boa hierarquia visual, espaçamento consistente e contraste adequado.
- Utilize elementos gráficos sutis que remetam a arquivos confidenciais, investigações, documentos, registros e fenômenos paranormais.
- Evite excesso de efeitos, animações, partículas e elementos decorativos que prejudiquem a usabilidade.
- Mantenha a identidade visual consistente em todas as páginas.
- Utilize ícones coerentes e componentes visuais reutilizáveis.
- Desenvolva uma identidade própria, sem copiar diretamente a interface, os logotipos, as ilustrações ou outros elementos protegidos de plataformas existentes.

A interface deve parecer parte de uma ferramenta profissional de organização de RPG, com atmosfera imersiva, e não apenas uma página genérica com tema escuro.

## 4. NAVEGAÇÃO PRINCIPAL

Implemente uma barra superior persistente nas páginas principais da aplicação.

A barra deverá conter:

- **Início:** painel principal.
- **Campanhas:** gerenciamento das campanhas.
- **Personagens:** biblioteca de personagens e fichas.
- **Sessões:** organização das sessões.
- **Planejamento:** acesso aos quadros de planejamento.
- **Criar:** botão que abre um menu com opções de criação.
- **Perfil ou configurações locais:** somente se houver uma utilidade real nesta versão, sem criar um sistema de contas ou de perfil de usuário.

O botão Criar deverá apresentar opções para criar:

- Uma campanha.
- Um personagem ou ficha.
- Uma sessão.
- Um quadro de planejamento, quando a criação de quadros estiver disponível no contexto selecionado.

Quando uma criação depender de uma campanha, permita selecionar a campanha correspondente.

A navegação deverá funcionar sem recarregamentos desnecessários e manter uma experiência consistente entre as páginas.

Em dispositivos menores, adapte a barra para um menu compacto, sem comprometer a navegação.

## 5. PÁGINA INICIAL

Crie um painel inicial que funcione como central de gerenciamento.

Ele deverá apresentar:

- Um título de boas-vindas coerente com a identidade do projeto.
- Acesso às campanhas existentes.
- Um atalho para criar uma campanha.
- Um atalho para criar uma ficha.
- Acesso ao planejamento.
- Um resumo das sessões próximas, quando existirem.
- Acesso rápido aos últimos conteúdos modificados, quando existirem.

Quando não houver dados cadastrados, apresente um estado vazio bem projetado, com instruções simples e ações para começar.

Não crie campanhas fictícias para preencher o painel.

## 6. GERENCIAMENTO DE CAMPANHAS

Implemente uma área completa para criar, visualizar, editar e excluir campanhas.

Cada campanha deverá possuir, no mínimo:

- Nome.
- Descrição.
- Imagem de capa opcional.
- Data de criação.
- Data de atualização.
- Personagens associados.
- Sessões vinculadas.
- Quadro geral de planejamento.

### Funcionalidades

- Criar campanhas por meio de um formulário.
- Editar os dados de uma campanha existente.
- Abrir uma página de detalhes da campanha.
- Consultar os personagens associados.
- Acessar as sessões da campanha.
- Abrir seu quadro geral de planejamento.
- Excluir campanhas mediante confirmação explícita.
- Exibir mensagens de sucesso ou erro nas operações.

Cada campanha deverá ser independente das demais.

A estrutura deverá permitir que um personagem seja associado a diferentes campanhas sem exigir a criação de cópias desnecessárias de sua ficha.

### Exclusão e integridade dos dados

A exclusão de uma campanha não deverá apagar automaticamente as fichas originais dos personagens associados.

Antes de excluir uma campanha, explique ao usuário o que acontecerá com seus dados relacionados, como sessões e planejamento. Execute a operação de forma consistente, sem deixar registros órfãos ou referências inválidas.

## 7. BIBLIOTECA DE PERSONAGENS E FICHAS

Crie uma biblioteca central de personagens, independente das campanhas.

O mestre deverá poder:

- Criar personagens.
- Visualizar fichas.
- Editar fichas existentes.
- Excluir fichas mediante confirmação.
- Pesquisar personagens por nome.
- Associar personagens a campanhas existentes.
- Remover associações sem apagar automaticamente a ficha original.
- Consultar em quais campanhas um personagem está sendo utilizado.

Nesta versão, todas as operações de criação e edição de fichas serão realizadas pelo próprio operador da aplicação. Não implemente contas de jogadores ou edição por terceiros.

### Fichas de Ordem Paranormal

Utilize como referência o livro publicado de Ordem Paranormal RPG, respeitando a edição e as erratas oficiais aplicáveis.

Antes de implementar os campos e cálculos, identifique a edição de referência e documente quais regras estão sendo utilizadas. Não misture regras de livros publicados, materiais de playtest e versões diferentes do sistema sem uma decisão explícita.

A ficha deverá ser dividida em seções claras, contemplando os campos aplicáveis à edição escolhida, como:

- Identificação do personagem.
- Atributos.
- Perícias.
- Origem.
- Classe e trilha.
- Nível ou patente, conforme as regras aplicáveis.
- Pontos de vida, pontos de esforço e defesa, quando pertinentes.
- Habilidades e poderes.
- Inventário e equipamentos.
- Informações de progressão.
- Outros campos exigidos pela ficha oficial de referência.

Os campos exatos deverão seguir a estrutura da edição identificada, em vez de utilizar uma lista genérica que possa estar incorreta.

### Cálculos e validação

Quando existirem cálculos derivados de regras oficiais claramente identificadas, implemente-os de forma consistente.

- Atualize os valores dependentes quando um campo relevante for alterado.
- Valide limites e combinações conforme as regras aplicáveis.
- Evite cálculos duplicados ou contraditórios.
- Diferencie valores calculados automaticamente de valores editáveis manualmente.
- Quando uma regra não estiver suficientemente definida, não invente uma fórmula.

A ficha deverá ser funcional, organizada e fácil de consultar.

Não inclua imagens, textos extensos ou conteúdos proprietários do livro de regras sem autorização. Utilize os nomes dos campos necessários para a compatibilidade funcional e produza uma interface original.

## 8. ORGANIZAÇÃO DAS SESSÕES

Cada campanha deverá possuir uma área de gerenciamento de sessões.

Cada sessão deverá permitir registrar:

- Título.
- Data e horário opcionais.
- Descrição.
- Estado da sessão.
- Anotações.
- Data de criação e atualização.

Utilize os seguintes estados:

- Planejada.
- Realizada.
- Cancelada.

O mestre deverá poder criar, editar, consultar e excluir sessões, com confirmação nas operações destrutivas.

Organize as sessões de maneira clara, permitindo consultar as futuras e as já realizadas.

A página da sessão deverá permitir registrar anotações sobre os acontecimentos, sem preencher automaticamente qualquer conteúdo narrativo.

O quadro geral de planejamento será associado à campanha, e não deverá ser duplicado automaticamente para cada sessão.

## 9. QUADRO BRANCO DE PLANEJAMENTO

Esta é uma das funcionalidades centrais do projeto.

Implemente um quadro branco interativo inspirado em ferramentas de canvas e colaboração visual, adaptado ao planejamento de campanhas de RPG.

Cada campanha deverá possuir um quadro geral próprio.

O quadro deverá ser privado ao mestre na futura arquitetura de permissões. Como a primeira versão não terá autenticação, a proteção dos dados deverá ser tratada conforme as restrições de implantação descritas na seção de segurança.

### Estado inicial

Todo quadro novo deverá começar completamente vazio.

Não crie automaticamente:

- Cartões.
- Notas.
- Pistas.
- Personagens.
- Missões.
- Conexões.
- Modelos narrativos.
- Mapas fictícios.

O usuário deverá construir seu próprio planejamento.

### Ferramentas obrigatórias

Implemente as seguintes ferramentas:

**1. Navegação pelo espaço**
- Arrastar o canvas para navegar.
- Aproximar e afastar o zoom.
- Centralizar ou ajustar a visualização.
- Manter os objetos posicionados corretamente durante a navegação.

**2. Cartões de texto**
- Criar cartões.
- Inserir títulos e textos.
- Editar seu conteúdo.
- Mover livremente pelo canvas.
- Redimensionar.
- Alterar cores.
- Excluir mediante confirmação ou ação reversível, quando aplicável.

**3. Desenho livre**
- Permitir desenhar diretamente no quadro.
- Armazenar os traços realizados.
- Permitir apagar desenhos.
- Garantir que os desenhos permaneçam corretamente posicionados durante o zoom e a movimentação do canvas.

**4. Linhas e conexões**
- Criar linhas e setas.
- Conectar elementos.
- Permitir selecionar e editar as conexões.
- Manter as conexões coerentes quando os elementos conectados forem movidos.
- Remover conexões quando necessário, sem deixar referências inválidas.

**5. Seleção e edição**
- Selecionar objetos.
- Mover elementos.
- Redimensionar elementos compatíveis.
- Excluir elementos.
- Evitar que a edição de um cartão interfira acidentalmente na navegação do canvas.

**6. Salvamento**
- Persistir o conteúdo dos cartões.
- Persistir posições, dimensões e cores.
- Persistir desenhos e conexões.
- Recuperar o estado do quadro ao abri-lo novamente.
- Evitar perda de dados durante alterações e navegação.

O quadro deverá permitir que o mestre organize ideias, cenas, pistas, personagens, cronologias e relações narrativas de maneira inteiramente livre, sem impor um modelo específico de planejamento.

Não é necessário implementar colaboração simultânea em tempo real nesta versão.

## 10. PERSISTÊNCIA DOS DADOS

Os dados deverão ser reais e persistentes.

Escolha uma solução técnica apropriada, explicando as vantagens e limitações da opção adotada.

A aplicação deverá preservar os dados após:

- Recarregar a página.
- Fechar e abrir novamente o navegador.
- Navegar entre as páginas.
- Reiniciar o servidor ou a aplicação, quando houver um banco de dados persistente configurado.

Não trate o estado temporário da interface como armazenamento definitivo.

### Requisitos

- Criar, consultar, editar e excluir registros de forma consistente.
- Validar os dados antes de salvar.
- Tratar falhas de gravação.
- Informar quando uma operação falhar.
- Evitar apresentar uma alteração como salva antes de confirmar que ela foi persistida.
- Preservar os relacionamentos entre campanhas, personagens, sessões e quadros.
- Garantir que a exclusão de um registro não cause perda indevida de dados independentes.
- Implementar salvamento automático no quadro branco, com tratamento de alterações pendentes e falhas de conexão.

Se utilizar salvamento automático, implemente uma estratégia que evite gravações concorrentes conflitantes ou perda de alterações recentes.

### Escolha tecnológica

Você poderá escolher as tecnologias de frontend, backend e armazenamento mais adequadas ao projeto.

Priorize:

- Tecnologias estáveis e bem documentadas.
- Estrutura simples de manter.
- Separação entre interface e lógica de dados.
- Validação no servidor, quando houver backend.
- Facilidade de migração e expansão futura.
- Compatibilidade com o ambiente de desenvolvimento e publicação disponível.

Não adicione serviços pagos ou dependências externas desnecessárias sem explicar sua necessidade.

## 11. AUSÊNCIA DE LOGIN E RESTRIÇÕES DE SEGURANÇA

Não implemente nenhuma funcionalidade de autenticação nesta versão.

Isso inclui:

- Nenhuma tela de login.
- Nenhuma tela de cadastro.
- Nenhuma recuperação de senha.
- Nenhum sistema de contas.
- Nenhum gerenciamento de sessões autenticadas.
- Nenhum cadastro de jogadores ou mestres.

O sistema deverá funcionar sem exigir uma conta para utilizar a aplicação no ambiente autorizado.

Entretanto, não presuma que a ausência de login torna seguro publicar dados privados na internet.

Como o projeto possui informações de campanhas e quadros que futuramente serão privados, siga estas regras:

- Não publique uma aplicação desprotegida com dados privados acessíveis a qualquer pessoa.
- Se não houver autenticação, utilize um ambiente local ou uma implantação controlada com proteção apropriada.
- Não considere uma URL difícil de adivinhar como substituta de autenticação.
- Não exponha credenciais, segredos de serviços ou chaves privadas no código do frontend.
- Se utilizar um backend ou serviço externo, proteja os dados e as operações conforme as capacidades reais da arquitetura.
- Explique claramente quais garantias de privacidade são possíveis na versão sem login.
- Não simule permissões de usuários que ainda não existem.

Prepare o código para que a autenticação possa ser adicionada posteriormente, mas não a implemente nem crie telas relacionadas a ela.

## 12. ARQUITETURA PREPARADA PARA EXPANSÃO

Organize a aplicação para permitir futuras funcionalidades, sem implementá-las agora.

A arquitetura deverá permitir a inclusão posterior de:

- Cadastro e autenticação de mestres e jogadores.
- Associação de usuários às campanhas.
- Diferenciação de permissões entre mestre e jogador.
- Acesso de jogadores às próprias fichas.
- Compartilhamento controlado de informações.
- Proteção dos quadros de planejamento.
- Participação de um mesmo usuário em várias campanhas, atuando como mestre em algumas e jogador em outras.

Esses recursos não deverão aparecer como funcionalidades ativas nesta versão.

O modelo de dados deverá distinguir conceitualmente personagens, usuários, campanhas e participações. Um personagem não deve ser confundido com a conta de um jogador.

## 13. EXPERIÊNCIA DO USUÁRIO

A aplicação deverá apresentar estados claros para as principais situações:

- Nenhuma campanha cadastrada.
- Nenhum personagem cadastrado.
- Nenhuma sessão cadastrada.
- Nenhum elemento no quadro.
- Operação concluída com sucesso.
- Falha ao salvar.
- Erro de validação.
- Confirmação de exclusão.

Utilize mensagens claras e objetivas.

Os formulários deverão ser fáceis de preencher, com rótulos visíveis, indicação de campos obrigatórios e validação apropriada.

Implemente confirmações para ações destrutivas e evite perder alterações não salvas ao navegar entre páginas.

Priorize a acessibilidade, a legibilidade e a navegação por teclado sempre que aplicável.

## 14. RESPONSIVIDADE E COMPATIBILIDADE

A aplicação deverá funcionar em navegadores modernos para computadores e dispositivos móveis.

Priorize a experiência de uso em computadores, especialmente no quadro branco, sem impedir a utilização em telas menores.

Garanta que:

- A barra superior se adapte a diferentes larguras.
- Os formulários continuem utilizáveis em dispositivos móveis.
- As fichas permaneçam legíveis.
- Os cartões e ferramentas do quadro não sejam cortados indevidamente.
- Os controles de zoom e navegação continuem acessíveis.
- A interface não apresente rolagens horizontais desnecessárias nas páginas comuns.

## 15. ORGANIZAÇÃO E QUALIDADE DO CÓDIGO

Mantenha o código organizado, com componentes reutilizáveis e separação clara de responsabilidades.

Evite:

- Repetição desnecessária de código.
- Dependências excessivas.
- Lógica de negócio espalhada pela interface.
- Dados fictícios apresentados como reais.
- Operações que funcionam apenas durante a primeira renderização.
- Manipulações frágeis que dependam de comportamentos específicos do navegador.

Inclua instruções de execução e configuração do projeto.

Se a solução utilizar variáveis de ambiente, disponibilize um exemplo de configuração sem credenciais reais.

Documente as decisões técnicas importantes, especialmente a persistência, a organização dos dados e as limitações de segurança da versão sem login.

## 16. ORDEM DE IMPLEMENTAÇÃO

Desenvolva o projeto nesta sequência:

### Etapa 1 — Estrutura e navegação
- Configurar o projeto.
- Implementar a identidade visual.
- Criar a barra superior.
- Implementar as páginas principais e seus estados vazios.

### Etapa 2 — Dados e persistência
- Escolher e configurar o armazenamento.
- Definir o modelo de dados.
- Implementar as operações de criação, consulta, edição e exclusão.
- Verificar a persistência real dos dados.

### Etapa 3 — Campanhas e personagens
- Implementar o gerenciamento de campanhas.
- Implementar a biblioteca de personagens.
- Desenvolver as fichas de Ordem Paranormal de acordo com a edição identificada.
- Implementar as associações entre personagens e campanhas.

### Etapa 4 — Sessões
- Implementar a criação e o gerenciamento de sessões.
- Desenvolver as anotações e os estados das sessões.
- Integrar as sessões às campanhas.

### Etapa 5 — Quadro branco
- Implementar o canvas.
- Desenvolver cartões, desenhos, linhas e conexões.
- Implementar zoom e navegação.
- Implementar persistência e recuperação do estado do quadro.

### Etapa 6 — Testes e refinamento
- Testar os formulários.
- Verificar a persistência após recarregamento.
- Testar as operações de edição e exclusão.
- Verificar as associações entre os dados.
- Testar as interações do quadro branco.
- Revisar responsividade, acessibilidade e mensagens de erro.
- Documentar a execução e as limitações da solução.

## 17. CRITÉRIOS DE ACEITAÇÃO

Considere a primeira versão concluída somente quando os seguintes cenários funcionarem:

1. É possível criar uma campanha, editá-la, recarregar a página e encontrar os dados preservados.
2. É possível criar uma ficha, editar seus campos e mantê-la na biblioteca independentemente de uma campanha.
3. É possível associar um personagem a uma campanha e remover a associação sem apagar a ficha original.
4. É possível criar sessões, alterar seus estados e consultar suas anotações posteriormente.
5. Cada campanha pode ter seu próprio quadro geral de planejamento.
6. Um quadro novo começa vazio.
7. É possível criar cartões, movê-los, redimensioná-los, alterar cores e editar textos.
8. É possível desenhar, criar conexões e setas, e mover os elementos sem perder a integridade das conexões.
9. O quadro preserva seu conteúdo e sua organização após fechar e reabrir a aplicação.
10. Erros de persistência são comunicados corretamente.
11. Exclusões são confirmadas e não apagam indevidamente dados independentes.
12. A aplicação funciona em computadores e dispositivos móveis.
13. Não existe nenhuma tela ou funcionalidade de login, cadastro ou autenticação.
14. As limitações de segurança e as condições de acesso da versão sem autenticação estão documentadas.
15. As funcionalidades implementadas foram efetivamente testadas, e não apenas representadas visualmente.

## 18. ENTREGA FINAL

Ao concluir a implementação, apresente:

- A aplicação funcional.
- A estrutura do projeto.
- As tecnologias escolhidas e as justificativas.
- As instruções para executar e configurar a aplicação.
- As informações necessárias para configurar a persistência.
- Uma lista das funcionalidades implementadas e testadas.
- Uma lista de limitações conhecidas.
- As medidas adotadas para proteger os dados na ausência de autenticação.
- Uma indicação explícita de qualquer requisito que não tenha sido concluído.

Não afirme que uma funcionalidade foi concluída se ela não tiver sido implementada e testada.

O objetivo final é entregar uma primeira versão utilizável do **Pela Realidade — Acesso Restrito**, com estrutura sólida, identidade visual própria, dados persistentes e ferramentas úteis para a preparação de campanhas de Ordem Paranormal.

Priorize uma aplicação funcional, confiável e expansível, em vez de uma interface visualmente impressionante, mas incompleta.
