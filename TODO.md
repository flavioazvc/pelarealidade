# TODO — Escudo do Mestre e Tela dos Jogadores

## Fundação das abas e segurança

- [ ] Ao iniciar uma sessão, abrir automaticamente uma nova aba do Escudo do Mestre.
- [ ] Criar a rota separada do Escudo, com controles disponíveis somente para o mestre/admin responsável pela campanha.
- [ ] Criar a rota separada da Tela dos Jogadores, iniciada pelo Escudo e limitada ao mesmo dispositivo por comunicação entre abas.
- [ ] Não expor aos jogadores nenhuma rota, controle ou conteúdo do Escudo; manter o fluxo atual de login e ficha intacto.
- [ ] Fazer encerramento da sessão fechar a apresentação visual e retornar a Tela dos Jogadores a um estado de espera.

## Apresentação visual

- [ ] Mostrar no Escudo uma prévia central da Tela dos Jogadores.
- [ ] Mostrar na Tela dos Jogadores o tema atmosférico escolhido para a sessão, a identidade da campanha e a cena ativa.
- [ ] Criar transições discretas entre cenas e respeitar preferência de movimento reduzido.
- [ ] Reservar uma área de transcrição com estado “em breve”, sem gravação ou transcrição automática nesta fase.

## Cenas

- [ ] Permitir criar, editar, excluir e reordenar cenas da sessão.
- [ ] Permitir título, descrição textual, imagem e efeito visual básico.
- [ ] Permitir transmitir uma cena à Tela dos Jogadores com um clique.
- [ ] Exibir estado da cena atual no Escudo e na prévia.

## Overview e áudio

- [ ] Mostrar no overview do Escudo apenas retrato, nome, PV, SAN, PE e Defesa.
- [ ] Permitir upload persistente de músicas e efeitos sonoros.
- [ ] Implementar um player de música ambiente.
- [ ] Permitir tocar efeitos sonoros sobre a música sem interrompê-la.
- [ ] Adicionar controle individual de volume e opção de fade in/out para músicas.

## Persistência e publicação

- [ ] Criar migração SQL versionada para cenas, apresentação, biblioteca de áudio e políticas RLS.
- [ ] Criar migração SQL versionada para bucket de áudio e políticas de upload.
- [ ] Manter fallback seguro quando as novas migrações ainda não forem aplicadas.
- [ ] Validar JavaScript, diff e publicação no GitHub Pages.
- [ ] Atualizar README e decisões técnicas com o novo fluxo.
