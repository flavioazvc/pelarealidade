# Plano — Escudo do Mestre e Tela dos Jogadores

## Objetivo

Adicionar ao Pela Realidade uma sala de controle paralela para sessões ao vivo. Ao iniciar uma sessão, o mestre abre automaticamente uma nova aba do Escudo do Mestre. A partir dele, uma segunda aba opcional exibe a Tela dos Jogadores, pensada para ser arrastada para uma TV ou projetor no mesmo computador.

## Decisões confirmadas

- A Tela dos Jogadores será usada no mesmo computador do mestre, em outra aba ou janela.
- Jogadores não terão acesso à Tela dos Jogadores, ao Escudo ou aos controles da sessão; continuam limitados ao login e às fichas autorizadas.
- A transcrição automática por microfone não será implementada agora. O layout reservará uma área para transcrição futura.
- Músicas e efeitos serão arquivos enviados pelo computador e permanecerão salvos no projeto Supabase.
- Haverá um player de música ambiente, efeitos sobrepostos e controle individual de volume. Música poderá usar fade in/out configurável.
- A primeira versão das cenas aceitará título, texto, imagem e efeitos visuais; vídeo fica preparado para extensão posterior.
- O overview do Escudo mostrará apenas retrato, nome, PV, SAN, PE e Defesa.
- O retrato dinâmico da Tela dos Jogadores ficará para uma fase posterior.

## Arquitetura

- Criar rotas hash separadas: `#/escudo/:sessionId` e `#/tela/:sessionId`.
- A aba do Escudo será aberta pelo navegador ao iniciar uma sessão, usando `window.open` diretamente no clique do mestre.
- A comunicação entre as abas usará `BroadcastChannel` e uma chave de sessão no `sessionStorage`/`localStorage` apenas para o mesmo dispositivo. A Tela dos Jogadores não fará login próprio nem receberá dados por uma URL pública.
- O Escudo consultará o workspace autenticado normalmente e transmitirá apenas o estado visual da sessão para a Tela dos Jogadores.
- A sincronização persistente de cenas, biblioteca de áudio e estado de apresentação será feita pelo Supabase, com fallback local enquanto migrações ainda não forem aplicadas.
- Novas tabelas serão isoladas por usuário/campanha e protegidas por RLS. Arquivos serão armazenados em buckets separados de mídia visual e áudio.

## Design

### Estilos candidatos

- 0,06 — “Sala de controle noir”: painéis densos, monoespaçados e sinais de estado.
- 0,91 — “Arquivo paranormal de transmissão”: preto carvão, vinho queimado, cobre e linhas técnicas.
- 0,03 — “Estúdio neon futurista”: alto contraste, ciano e magenta.

Escolhido: **Arquivo paranormal de transmissão**.

### Princípios

- O Escudo prioriza leitura rápida e controle em poucos cliques.
- A Tela dos Jogadores elimina ruído administrativo e trata o conteúdo como uma transmissão cênica.
- O vermelho queimado permanece como assinatura do Pela Realidade; dourado e cinza indicam estados e metadados.
- Painéis têm bordas finas, sombras profundas e textura técnica discreta, sem competir com o conteúdo narrativo.

### Layout

- Escudo: barra superior com sessão e estado, coluna lateral de cenas/áudio, preview central grande da Tela dos Jogadores e coluna lateral de overview.
- Tela: canvas visual em tela cheia com logo/capa, título de cena, texto e imagem; controles ficam ocultos.
- Transição de cenas usa dissolução curta e respeita `prefers-reduced-motion`.

### Tipografia e voz

- Manter a tipografia existente: display editorial para títulos e mono para rótulos operacionais.
- Microcopy: “Transmitir aos jogadores”, “Cena em exibição”, “Abrir Tela dos Jogadores”, “Transcrição — espaço reservado”.

## Entregas

1. Rotas, abertura automática do Escudo e handoff seguro entre abas.
2. Migração de dados para cenas, apresentação e biblioteca de áudio.
3. Escudo com preview, cenas, overview e área reservada de transcrição.
4. Tela dos Jogadores em tela cheia com atmosfera da sessão, campanha e cena ativa.
5. Upload persistente de músicas/efeitos e mixer com música + efeitos sobrepostos.
6. Documentação, cache busting e publicação no GitHub Pages.

## Limites desta fase

- Não haverá transcrição automática agora.
- Não haverá acesso remoto da Tela dos Jogadores por outro dispositivo.
- Não haverá portrait dinâmico/animado ainda.
- Vídeo poderá ser adicionado depois sem alterar o conceito das rotas.
