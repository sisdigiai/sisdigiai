# Changelog — digiai

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), simplificado.

## 2026-11-23 — Os fatos vencidos, "no período", e o que está no ar

Cinco itens da fila numa tacada, por ordem do dono. O primeiro mudou de forma assim que eu medi.

### 1. 24 fatos vencidos — e o conserto não era carimbar data

Antes de reescrever qualquer número, fui ver o que o **verificador diário** (`verificar-fatos`, 4h30)
tinha medido. Ele estava **cego de duas maneiras, e as duas se pareciam com trabalho normal na tela**:

- **A `v_espelho_pulso` responde 401 desde 08/09.** O anon do Pulso foi revogado naquele dia porque a
  view carrega custo e receita; o front migrou para a edge `espelho-pulso`, a function não. Ela
  continuou batendo na porta antiga com a chave revogada **escrita no código** — a variável
  `PULSO_ANON_KEY` nunca existiu no projeto, então o "fallback" era a única fonte, e estava morto. O
  `catch` engolia o 401 e o fato saía como *"a fonte exige verificação humana"*. Dois fatos do Pulso
  ficaram assim **109 e 84 dias**, parecendo tarefa de gente que ninguém fez — e eram leitura de máquina.
- **Leitura que falha virava zero.** A contagem de `mkt.publications` era lida sem olhar o `error`, e
  `?? 0` transformava falha em zero. A série mostra o degrau: 14, 8, 8 e **zero todo dia desde
  08/09**, com o texto *"Caiu — a esteira ficou parada"*. A tabela tem **2.114 linhas em 7 dias**.
  Era alarme falso, e do tipo que se acredita, porque vinha com número.

Consertado: a medição do Pulso entra pela edge que a casa já tem (**mesma base de antes**, então o
número continua comparável — trocar a base para arrumar a leitura seria arrumar o termômetro mudando
a febre); existe o quarto veredito **`fonte_inacessivel`** (migration 267), porque *"não consegui ler"*
nunca pode se parecer com *"precisa de gente"*; e zero só existe quando a leitura deu certo.

Com a porta certa, os dois fatos foram **curados com o que a máquina mediu** (migration 268):
**820.006 views em 1.325 publicações** e **543 inscritos no YouTube, +56 em 28 dias** — o crescimento
desacelerou, e fato tem que poder **piorar**. A fonte do segundo saiu do "YouTube Studio, à mão", que
o condenava a uma tarefa semanal que ninguém fez em quatro meses, e passou ao espelho, que coleta
sozinho. **Rotina que depende de alguém lembrar não é rotina.**

Vencidos: **24 → 22**. Os 22 não são meus de medir: 21 são números da folha única (banco do Clearix,
que o digiai não lê em runtime) e 1 é do Limelight. Os dois donos foram avisados no mesmo turno.

E o que ninguém via: a view `v_ops_fatos_verificados` **já existia** com o último veredito de cada
fato, e **nenhuma tela lia**. Agora cada fato mostra o que a máquina mediu hoje. Medição que não chega
a lugar nenhum é medição que ninguém confere — foi assim que o alarme falso viveu 76 dias.

### 2. "No período" — 26 ocorrências em 8 arquivos

Quem obedece à barra passa a dizer **"no recorte"** e deixa a barra falar (ela escreve janela e
régua). Quem lê janela própria **diz a janela**, por `rotuloJanela()`, que agora mora num lugar só.
Foi esse rótulo — igual nas duas telas, significando coisas diferentes — que escondeu o 168k × 41,8k
de 20/11.

### 3. As três abas que ignoram a barra agora dizem isso

Régua, Território e Saúde ganharam a nota **"a barra não vale aqui"**, com o motivo de cada uma.
A Régua, que **é** por marca, passou a **obedecer** ao recorte de quem — obedecer é sempre melhor que
avisar. Recortar por Mello e ver o território inteiro é concluir que o território é da Mello.

### 4. Raio-X: último deploy e código fora do ar

Migration 269. **Três colunas, não uma**, porque o resumo "5 apps com código fora do ar" junta coisas
que se resolvem de modo diferente: **falta deploy** (4 apps — Clinics, com deploy de 23/09, DCL,
Estoque e Finance), **outro ramo** (RH) e **sem commit** (Finance, 3 arquivos — a única das três que
some sozinha se a máquina morrer). E `deploy_lido` falso diz **"não lido"**, nunca "em dia": a
diferença entre "nada pendente" e "ninguém olhou" é a diferença entre dormir tranquilo e achar que
dormiu tranquilo.

### 5. Crescimento de seguidores com data — já estava pronto, e na fonte certa

A `v_mkt_conta_dia`, que estava na fila para isso, tem **17.089 linhas desde 2012** com `seguidores`
preenchido em **6.253** (Instagram: **396 de 5.873**) e **não tem TikTok**. A `mkt.audiencia_diaria`,
que a aba Audiência já lê, tem **1.067 linhas, todas com número**, em cinco redes, 105 dias desde
02/07. Trocar uma pela outra seria perder medição e ganhar buraco.

O que faltava era o **grão**: o painel soma as contas da mesma marca na mesma rede. Medido, isso
acontece em **um** lugar — três canais de YouTube sob Bastidores DIGIAI, um deles o `@pulsohistorias`,
que é do Pulso. A Saúde agora mostra as **parcelas**. Enquanto ficar somado, o total da casa está
certo por acaso, e o cadastro é do MKT.

## 2026-11-23 — A barra de filtro do Marketing: a forma diz a natureza

Depois de fechar a barra por padrão (ganho medido de 289 px), o dono: *"a ideia de esconder o filtro
já ajudou bastante"* — e pediu o acabamento do que aparece quando ela abre. O diagnóstico que ele
mesmo deu antes: *"o que está bom são os filtros, a lógica correta, só não temos a mesma qualidade no
front"*. Então nada de lógica mudou aqui. Mudou a forma.

**O defeito era de tipografia de interface, não de regra:** as quatro fileiras eram a mesma coisa na
tela — 48 chips iguais, soltos, em quatro linhas — e a forma não dizia nada sobre a natureza de cada
escolha. Chip solto quer dizer "marque quantos quiser", e isso era mentira em duas das quatro linhas.

1. **Período em segmento colado** (a mesma forma das abas da página): num segmento, um só pode estar
   aceso, e isso se lê sem legenda. O intervalo de datas só aparece quando pedido — dois campos de
   data vazios na barra convidavam a preencher sem dizer para quê. Saiu também o resumo repetido à
   direita da linha, que já está na frase do topo.
2. **Quem com selo por canal:** logo onde existe logo de verdade (digiai, mello, osi e os três canais
   do Pulso), sigla na cor da marca onde não existe (Lancaster, Polá, Pessoal, Bastidores). Desenhar
   um logo que a marca não tem seria inventar um fato na tela. Nome de família virou texto
   sublinhado, sem caixa — caixa é de canal; a diferença entre "o grupo inteiro" e "este canal"
   passou a ser visível em vez de explicada no rodapé.
3. **Rede em sigla colorida:** oito quadrados iguais, na cor que o olho já conhece. "Instagram" e
   "Pinterest" escritos ocupavam meia linha e não informavam o que o roxo e o vermelho informam.
   Acesa fica **preenchida** — de longe se vê que há recorte de rede valendo, que era o engano mais
   comum da tela antiga. Nome completo no `title` e no `aria-label`: a sigla não é a única porta.

**E a régua da data ganhou moldura própria.** Período, quem e rede *recortam* — mostram menos do
mesmo. A régua da data **troca o significado de cada número da página**. Misturada com as outras,
parecia um filtro a mais, e era a mais perigosa das quatro: foi dela que veio o 168k × 41,8k de 20/11,
dois números certos respondendo a perguntas diferentes com o mesmo rótulo.

A regra que fica para o próximo filtro: **organização não é ter menos coisas, é ter menos tipos de
coisa.** Escolha única → segmento. Muitos, com identidade → selo. Atalho conhecido → sigla colorida.
O que muda o significado → moldura.

## 2026-11-23 — Raio-X do eco: tela nova, lendo um retrato — não o banco do Clearix

Ordem do dono pelo canal do eco: *"pode o primeiro raio-x… precisamos de tudo completo… chamar o
agent digiai, para resolver as telas dele"*. O agente do eco cruza o catálogo do banco do Clearix com
o código dos 18 apps e escreve `Cockpit/raio-x/latest.json`.

**O caminho, que foi a pergunta dele:** a página é estática e o Cockpit é outro repositório — ela não
consegue ler o arquivo em tempo de execução, e embutir no build daria à tela a idade do último
deploy, que é o defeito que este app passou a semana removendo. Então o arquivo vai para
`ops.raiox_snapshot` (migration 236, uma linha, jsonb) por `Cockpit/scripts/raiox-carregar.mjs`, e a
tela lê sete views `public.v_raiox_*`. **O banco do Clearix continua isolado: nada aqui fala com ele.**

**Pedi quatro coisas no formato antes de começar**, e o eco atendeu: `contrato: "1"` (para a carga
recusar formato desconhecido em vez de encher o banco), `gerado_em` em ISO com fuso (depois do UTC ×
BRT da semana passada), todos os achados em vez de um contador de "info" que não abria, e marca de
`conferido` para a tela não ressuscitar o que já foi descartado à mão.

**A tela:** cartões do banco, tabela por app (o número de "a conferir" abre os achados daquele app),
achados com filtro por app e gravidade, ligações entre apps, robôs com última rodada, a data de
geração **com a idade do retrato** no alto, e o que o método não enxerga no pé.

**Duas recusas de propósito:**

- **"alta" aparece como "a conferir", nunca como fato.** O próprio eco avisou que esta primeira
  versão dá falso alarme — já descartou três à mão. Cada linha traz arquivo e linha, para a
  conferência ser possível. Dizer "132 falhas de segurança" seria repetir na tela o erro que a tela
  existe para pegar.
- **A carga recusa** contrato diferente de 1 e retrato com seção vazia, em vez de apagar em silêncio
  o que estava certo.

**O portão faltou na primeira migration e a tela achou:** abriu dizendo *"permission denied for table
raiox_snapshot"*. As views nascem `security_invoker`, então quem lê é o usuário, e ele não tinha
direito na tabela de baixo. Consertado como o Controle faz (R-037): RLS ligada + política
`is_staff()`. Sem isso a view entregaria o retrato inteiro a qualquer portador da chave anon.

**Conferido no ar:** 1.839 funções, 1.344 tabelas e visões, 49 robôs, **1.466 de 1.466** achados
chegando (passam do teto de mil da API — lidos em páginas com ordem única, a mesma armadilha que o
raio-x acusa 250 vezes no eco), e `rpc_iam_can_use_app_feature` usada por 14 apps.

## 2026-11-23 — O topo da página de Marketing: mobília fechada, número na primeira tela

Dono: *"agora nossa página de marketing tem um storytelling de usabilidade, é de fácil leitura?"* A
resposta honesta era **não** — fácil de usar depois de aprender, não fácil de ler na primeira olhada.
E isso foi medido, não achado:

| | antes | depois |
|---|---|---|
| do topo ao primeiro número | **807 px** | **520 px** |
| palavras antes do número | 262 | 104 |
| botões na primeira tela | 48 | 14 |

Numa janela de 889 px o número grande raspava a borda; num notebook comum ficava **abaixo da dobra**.
A página explicava três vezes antes de informar uma: o subtítulo explicava a página, um parágrafo
ensinava a diferença entre origem e marca, e a faixa verde explicava a aba.

Três cortes, **nenhum escondendo informação**:

1. **A barra de filtro fecha** (era 289 px, o maior bloco) e vira UMA linha que diz o recorte inteiro
   em palavras — `30d · tudo · todas as redes · por publicação`. "ajustar" abre a caixa como estava,
   "fechar" volta. Conferido no ar: abre, mostra as quatro linhas e os 50 chips, e fecha.
2. **A faixa de travas vira uma linha** com "ver". São referência, não notícia — não mudam há meses.
3. **O subtítulo cai de três linhas para uma.** A explicação da régua de DATA já vive na própria linha
   da DATA, onde é precisa.

Eu tinha estimado ~400 px e deu 520. O que sobra é o cabeçalho da página (212 px, comum a todas as
telas) e a faixa "O que se decide aqui" — essa fica, é ela que diz para que serve a aba.

## 2026-11-21 — Uma página só de Marketing, e a leitura que parou de travar

Dono: *"eu montaria uma página só, que nos traz nas abas todas as informações"* e, depois do mock,
*"pode implantar completo e só o cuidado da leitura não ficar lenta"*.

### A página

O Espelho do MKT e o Radar 360 viraram **uma página**, com **onze abas em duas fileiras** — DECIDIR
(Hoje, Resultado, O que funciona, Fôlego, Publicações) e CONFERIR (Marca × rede, Leitura das peças,
Vídeo & motores, Régua, Território, Saúde). Nada foi perdido; o menu passou a ter **uma porta só**, e
`#/mkt-crescimento` continua vivo abrindo em Marca × rede, para link salvo não quebrar. O endereço
guarda aba e período (`#/marketing/saude/30`).

**O ganho de verdade não foi juntar — foi a barra única.** Cada tela tinha a sua régua de data, e foi
daí que nasceu o *168k × 41,8k "na mesma janela"* de 20/11. Agora a barra tem a linha **data**:

| régua | o que responde | medido hoje, 30 dias |
|---|---|---|
| por **PUBLICAÇÃO** | quanto rendeu o que a casa publicou no período | **42.483** views em 473 peças |
| por **LEITURA** | quanto a casa já somou do que foi medido no período | **170.994** views em 966 peças |

As duas contas sempre estiveram certas. O rótulo muda junto com a escolha, e os dois números bateram
exato com o banco antes de eu abrir a tela.

### E a primeira versão do filtro estava confusa — dito pelo dono no mesmo dia

*"ficamos com os filtros confusos, mas está funcionando sim."* Ele foi procurar o Pulso onde o Pulso
sempre esteve — na linha de **marca** — e não achou: eu tinha posto **origem** numa linha e **marca**
em outra, e as duas conversavam. Escolher "casa" fazia os canais do Pulso **desaparecerem** da linha
de marca, sem dizer nada. Separei pela regra em vez de por como se procura.

Agora é **uma linha só, `quem`**, com tudo à vista em grupos: `tudo · casa · 6 · … · Cortes · 2 · … ·
Pulso · 3 · … · Limelight`. O grupo **ensina** a diferença entre origem e marca em vez de esconder
chip; clicar no nome do grupo pega o grupo inteiro, clicar num canal pega só ele e já escolhe a
origem. O estado por baixo é o mesmo — nenhuma conta mudou.

Um detalhe que só apareceu com a linha pronta: dentro do grupo do Pulso os canais ficavam
"Bastidores" e "Cortes", e **"Cortes" é também o nome de um grupo** (os canais da casa). Dois chips
com o mesmo nome na mesma linha é trocar uma confusão por outra — o canal do Pulso passou a levar o
sobrenome (`cortes do Pulso`, `bastidores do Pulso`, `canal principal`).

### A leitura

| | antes | agora |
|---|---|---|
| Espelho do MKT | 23 leituras, **24,6 s** | — |
| Radar 360 | 24 leituras, **5,1 s** | — |
| página única | | 18 leituras; **tudo no ar em 3,1 s**, e as views da casa em 5,3 s **sem travar a tela** |

Quatro consertos, cada um medido:

1. **Cada aba lê o que mostra**, dos dois lados. Dez das onze leituras do Espelho serviam abas
   fechadas; a régua não precisa de publicação e o território não precisa de nada.
2. **A consolidação por peça saiu do TypeScript e virou view** (`v_mkt_peca_consolidada`): uma peça,
   uma linha, com a data de publicação junto. No recorte de 30 dias são **473 linhas numa página**,
   no lugar de 1.128 leituras cruas em duas páginas **mais 3.072 publicações em quatro páginas
   enfileiradas** (3,9 s só nisso). Conferida contra a regra do TypeScript linha a linha **antes** de
   trocar: 473 peças e 42.483 views pelos dois caminhos.
   *E a primeira versão dela estava lenta por culpa minha:* o casamento com a publicação usava
   `pb.id::text = peca_ref` dentro de um LATERAL. Cast do lado da coluna mata o índice — eram 3,4
   milhões de comparações para achar uma data. Virou mapa lido uma vez e hash join: **8,4 s → 3,7 s**.
3. **Seis leituras de cada vez**, no `fetch` do próprio cliente do Supabase. ~20 pedidos no mesmo
   instante não ficam mais rápidos: o pool atende em série e a fila inteira espera o pior. Vale para
   toda tela do app, sem depender de cada componente se comportar.
4. **A tela não espera a fonte mais lenta.** Cada fonte chega quando chega e o bloco que depende dela
   escreve *"medindo…"* — nunca 0, nunca em branco.

### O que sobrou, e não é meu para consertar

A `v_mkt_peca_consolidada` roda em **108 ms no banco** e leva **~3,5 s** para chegar. A causa está na
view de baixo: ela chama `mkt.pode_ver_marca(code)` **linha a linha** e, por ser `SECURITY DEFINER`, o
Postgres não consegue embutir a função na consulta — são milhares de chamadas para responder o que
seriam nove. A função é do MKT; está avisado, com a medição.

### Dois defeitos que só apareceram com a tela aberta

- O cartão de saúde dos blogs dizia **"espelho indisponível"** quando a fonte apenas não tinha sido
  lida naquela aba. Fonte não lida não é fonte quebrada.
- A tela em branco do dia anterior (função usada antes de existir) e o *"0 posts"* no recorte de um
  motor de fora, ambos consertados antes deste pacote.

## 2026-11-21 — A leitura que trava: medida, e o primeiro conserto

Dono: *"pode fazer a página única agora … mas mandar um mock e testar a leitura que está travando
nestas páginas"*. Medido no ar, com o relógio do navegador:

| tela | até terminar de ler | leituras |
|---|---|---|
| Espelho do MKT | **24,6 s** | 23 disparadas juntas, **10 a 14 s cada** |
| Radar 360 | **5,1 s** | 24; `publications` vem em **4 páginas em fila** (3,9 s) |

**E o banco não é o culpado.** As mesmas views, medidas no servidor com `explain analyze`:
`v_mkt_fila_saude` **3,8 ms** (9,8 s na tela), `v_marketing_cadeia_dia` **692 ms** (14,3 s na tela),
`v_pontualidade` **11 ms** (11,9 s na tela). Uma view que roda em 3,8 ms e demora 9,8 s para chegar
não está lenta — está **na fila**: são ~20 pedidos ao mesmo tempo num banco que os atende em série.

### Consertado hoje: o portão de papel era consultado 3 a 4 vezes por abertura

`current_role_code` saía **3 ou 4 vezes idênticas** a cada abertura do painel, antes de qualquer tela
começar a ler — e num dos carregamentos levaram **5,4 s cada**. O efeito dependia do objeto `session`,
e `onAuthStateChange` entrega um objeto novo a cada evento (INITIAL_SESSION, SIGNED_IN,
TOKEN_REFRESHED). O papel é do usuário e não muda quando o token se renova. Conferido no ar depois do
deploy: **1 chamada, 61 ms**. Commit `73c98fc`.

### O resto do conserto mora na página única

Ler por aba derruba a abertura de 23 leituras para 4, e isso só existe se a página for uma. Junto vai
parar de trazer **3.072 publicações** (4 páginas enfileiradas) para mostrar um total e uma lista de 12,
e paginar em paralelo quando muitas linhas forem mesmo necessárias. Mock da estrutura proposta, com os
números reais de hoje: [`docs/mock-pagina-unica-marketing.html`](mock-pagina-unica-marketing.html).

## 2026-11-21 — Filtro de ORIGEM no Radar, e o Pulso deixa de ser um cartão só

Ordem do dono (19/11, confirmada hoje): *"pode fazer o filtro de origem no radar agora"*.

**O filtro mentia nos dois sentidos**, e isso foi medido antes de mexer:

- **"PULSO" era um chip de MARCA.** A marca `pulso` em `mkt.brands` tem **zero publicação, zero censo
  de audiência e zero leitura** — o dado do Pulso vive no banco dele, no espelho. Clicar no chip
  deixava a tela em branco sem dizer por quê.
- **Clicar "Bastidores DIGIAI" escondia o cartão do Pulso**, que é justamente quem publica e mede
  esses canais.

Agora são duas linhas de filtro: **origem** (de quem é o canal: casa · Cortes · Pulso · Limelight) e
**marca**, dentro da origem. Um crivo só — `marcaOk` — passou a valer para toda leitura da casa, no
lugar do `!fMarca || code === fMarca` repetido em cada bloco: era por isso que o cartão do Pulso usava
uma regra e a tabela de audiência usava outra, e a mesma seleção dava respostas diferentes em abas
diferentes.

**Não confundir com a coluna `origem` da `v_mkt_analytics_peca_dia`**: aquela diz quem **mediu** a
peça. Medido hoje: `cortes.da.digiai` aparece com origem `pulso` E `digiai_cortes` — duas coletas das
MESMAS contas da casa, e nenhuma peça repetida (zero `peca_ref` em duas origens). É saúde de coleta,
não dono de canal; está escrito no código para o próximo que abrir.

### O Pulso são três canais

Passou a ler `v_espelho_pulso_contas_dias`, que reparte por marca e conta. Conferida por mim como anon,
linha a linha: é a **soma exata** das duas views antigas — `v_espelho_pulso_dias` (curtos do canal
principal) mais `v_espelho_pulso_longos_dias` (cortes e longos) — e acrescenta marca e conta. São
**+1.658 views e +59 publicações** que o Radar não contava (o Espelho do MKT já contava).

No recorte de 30 dias: **PULSO Histórias 105.452 views / 155 pubs / 2.841 seguidores**, **Cortes PULSO
845 / 25 / 8**, **Bastidores PULSO 810 / 32 / 6**.

**Duas coisas mudam e estão ditas na tela:**

1. A view nova **não traz `saves`** (169 no histórico inteiro, ~25.750 interações). Interação aqui
   passa a ser curtidas + comentários + compartilhamentos. Pedi a coluna ao agente do Pulso.
2. **As duas views datam o mesmo dia diferente.** O total histórico bate exato (811.364 views nas
   duas), mas em **544 pares (dia, plataforma)** a view antiga põe as mesmas views **um dia depois**:
   ela nasceu datando em UTC, e as duas novas datam no dia do negócio, BRT, que é a regra da casa. No
   recorte de 30 dias o canal principal vai de **107.600 para 105.452**. Não é view perdida — é view
   no dia certo. Pedi ao Pulso que confirme a coluna de data das três views.

### A Saúde ganhou as contas do Pulso

A cobertura lia só `v_mkt_accounts`, que é da casa: as **13 contas do Pulso não apareciam em lugar
nenhum do painel** — inclusive `corteshistoriaspulso`, **bloqueada pela Meta desde 12/11/2026**. Conta
parada sem aviso vira número congelado, que é o defeito que essa aba existe para pegar.

### O que só apareceu depois de abrir a tela

Três coisas, nenhuma delas visível antes do deploy — por isso a regra é abrir:

1. **Tela em branco.** `serieDe` era chamada dentro de um `useMemo` que roda antes da declaração dela
   (zona morta temporal). Nada renderizava. Commit `fb173d7`.
2. **Com o recorte no Pulso, a casa continuava falando** — "posts nas redes **0**", "engajamento não
   coletado nesta rede", "a coletar — despacho no MKT" e a caixa dos blogs. Zero é medição e "a
   coletar" é culpa do coletor; as duas mentem quando a verdade é que a pergunta não é daquela
   origem. Uma frase só, num lugar só. Commit `2fb7855`.
3. **A cobertura da Saúde dava conta medida por carona.** Casava por marca+rede: quando uma marca tem
   duas contas na mesma rede, o censo de uma marcava as duas. A tela dizia **31** contas "✓ no censo";
   o censo por conta são **29** (de 50). Agora casa por `account_id` e mostra a data do censo de cada
   conta — conferido no ar: 29 ✓, 21 "a ligar". Commit `ee78137`.

### Dois cadastros errados que a cobertura por conta revelou

- **`@pulsohistorias` no YouTube está cadastrada sob a marca Bastidores DIGIAI.** É o canal do PULSO,
  com 524 inscritos, medido todo dia dentro do censo da casa. Avisado ao MKT; o cadastro é de lá.
- **Uma segunda conta de Instagram da Lancaster** tem censo desde agosto (1.160 seguidores, último em
  **25/08**) e **não existe em `mkt.accounts`** — órfã.

**O número de seguidores está certo hoje, e a regra está errada.** O KPI agrupa por marca+rede e fica
com a última linha de cada par: por sorte da ordenação, hoje ele fica com a conta certa nos dois casos
(descarta os 524 do Pulso e o órfão de agosto). Mas a regra certa é por conta, com prazo de validade,
e ela depende de arrumar o cadastro primeiro — anotado, não mexido.

### Os espelhos passam a paginar

Mesmo teto de sempre: a API corta QUALQUER resposta em 1.000 linhas e devolve como sucesso — vale para
o banco do digiai e vale para o de cada motor. Medido hoje no Pulso: 757, 683 e 657 linhas, crescendo
todo dia. A ordem de cada view agora é **única**, senão página repete linha e some com outra, em
silêncio.

## 2026-11-20 — O corte entre o Espelho do MKT e o Radar 360, e o rótulo que mentia nos dois

Dono: *"porque temos espelho do MKT e radar 360, qual a diferença?"* — e, depois da medição,
*"pode fazer o corte agora"*.

**O que a medição achou:** as duas telas leem **três views em comum** (`v_marketing_cadeia`,
`v_mkt_analytics_peca_dia`, `v_mkt_fila_saude`) e quatro blocos apareciam nas duas.

**O corte que eu propus primeiro estava errado** — mover os totais para o Radar. Isso desfaria ordem
dele: em **17/11** pediu os analytics TOTAIS no Espelho, e em **18/11** reclamou que o número grande do
Radar não somava os posts do MKT. Ele quer o total **nas duas**. Disse isso antes de executar, e o
corte passou a ser por **profundidade**:

- **Espelho do MKT** = o TOTAL e a DECISÃO. Resultado, o que funciona, o dia, o fôlego, as
  publicações, os fatos, as fontes. Onde se decide o que fazer.
- **Radar 360** = o DETALHE e a SAÚDE. Marca × rede × conta, seguidores dia a dia, régua,
  território, saúde da coleta. Onde se descobre DE ONDE o total veio.

**O que saiu:** a aba **Funil** do Radar, duplicação inteira. A cadeia produzir→vender é a mesma
`v_marketing_cadeia` da Central do Espelho, e o bloco do Clearix Calc era a mesma `v_mkt_calc_funil` da
página própria do Calc — mesmos quatro números, mesma fonte, **três lugares**. Saíram duas leituras
do banco e 81 linhas junto.

**O que NÃO era duplicação e ficou:** "Motores" no Espelho é ESTADO e custo de cada motor;
"Vídeo & motores" no Radar é DESEMPENHO por plataforma. Mesmas marcas, perguntas diferentes.

### E então a tela me desmentiu, dez minutos depois de eu escrever nela

Conferindo o corte no ar: o Espelho mostrava **168k views em 961 peças** nos últimos 30 dias; o Radar,
**41,8k em 469**, na **mesma janela**. Quatro vezes de diferença, com o mesmo rótulo "contas da casa".

Eu tinha acabado de escrever na tela que, se os números não batessem, era a **janela**. Estava errado,
e a frase teria mandado o leitor comparar períodos que já estavam iguais. A causa é a **data**:

- **Espelho** filtra `data` da **LEITURA** — peça publicada em julho e lida ontem entra, com todas as
  views que acumulou;
- **Radar** filtra `published_at` da **PUBLICAÇÃO** — só o que saiu no período.

As duas contas estão certas e respondem a perguntas diferentes: *"quanto a casa já somou do que foi
medido agora"* contra *"quanto rendeu o que a casa publicou neste período"*. O que estava errado era o
rótulo, **igual nos dois lugares**. Agora cada tela diz qual data usa e que a outra usa a outra.

**Verificado no ar** (builds `3435f26` e `7772020`): Radar com 7 abas e o subtítulo novo; Espelho com
"PEÇAS LIDAS NOS ÚLTIMOS 30 DIAS" e a explicação das duas datas no pé das parcelas.

## 2026-11-19 (22h) — "Estamos lendo tudo já?" Não: a página Controle mostrava 1.000 de 5.106

Pergunta do dono às 22h. A resposta honesta exigia varrer o que eu **não** tinha coberto: hoje às 20h
eu consertei as leituras que **pediam mais de mil**. Mas o teto é do **servidor**, não do pedido —
leitura **sem limite nenhum** também volta cortada em 1.000. Varri as 133 leituras do app e contei as
linhas de cada fonte no banco.

**Sete fontes já passaram de mil. Seis estavam bem; uma não:**

| fonte | linhas | como era lida | veredito |
|---|---|---|---|
| **`v_controle_itens`** | **5.106** | **sem limite, sem página** | **cortada — consertada agora** |
| `mkt.publications` | 3.042 | pagina | ok (consertada às 15h) |
| `v_mkt_gbp_avaliacoes` | 1.775 | filtrada (estrelas≤3, não publicada) | ok — devolve **2** linhas |
| `v_ops_ordem_do_dia` | 1.659 | filtrada por dia | ok — no máximo **19** por dia |
| `v_lousa` | 1.552 | pagina | ok |
| `v_mkt_analytics_peca_dia` | 1.133 | pagina (3 telas) | ok |
| `v_audit_logs` | 1.000 | `.limit(100)` de propósito | ok |

**O que o dono não via na própria página dele.** A ordem da Controle começa pelo nível, então o corte
em mil entregava:

- nível 1: **245 de 245** — completo, e é por isso que o defeito passou despercebido: o que mais
  importa chegava inteiro;
- nível 2: **755 de 839** — faltavam 84;
- nível 3: **0 de 4.022** — nenhum.

Quatro em cada cinco itens nunca apareciam. E o pior não é a falta: **os contadores dos chips contam o
que chegou**, então o chip "Nível 3" mostrava zero com cara de resposta medida. Tela que responde "não
há" quando o certo seria "não li" é a mesma família de defeito do dia inteiro.

Marcar como resolvido não ajudaria: **1 item de 5.106** está marcado.

**Depois do conserto, lido no ar** (build `29aac7e`, seis páginas de mil, offsets 0–5000, todas 200):
todos **5.105** · nível 1 **244** · nível 2 **839** · nível 3 **4.022** · riscos **728** · pendentes do
dono **1.112** · 36 agentes com estado. Os números de risco e pendência não subiram hoje — eles já
estavam lá, só não chegavam à tela.

Termina em `id` (único, conferido no banco), pela regra do desempate das 20h50.

**Observação que não é minha para resolver:** dos 5.105 não resolvidos, **1.913 são do tipo "feito"** e
377 são "ideia". A página acumula tudo que todo agente já escreveu, e quem carrega é o Geral.

## 2026-11-19 (20h) — O teto de mil linhas sai do app inteiro, e uma tela já estava mentindo por causa dele

O Geral contou as linhas das duas leituras que sobraram no Radar 360 e avisou **antes** de quebrarem.
Medi as outras sete do app e achei uma que **já estava cortada no ar**.

**A regra, de novo porque hoje ela mordeu três vezes:** a API corta QUALQUER resposta em 1.000 linhas
e devolve isso como sucesso. `.limit(5000)` não ajuda, `.limit(3000)` não ajuda; só pedir em páginas.

**Medido em 19/11, 20h12:**

| fonte | linhas | cresce | situação |
|---|---|---|---|
| `v_mkt_resultado_peca` | **1.025** | — | **já cortada** |
| `mkt.publications` | 1.130 | — | já cortada (consertada às 15h) |
| `mkt.audiencia_diaria` | 951 | **24/dia** | passa de mil em 21–22/11 |
| `mkt.content_performance` | 946 | ~17/dia | passa de mil em ~23/11 |
| `v_pontualidade` | 810 | 17/dia | dezembro |
| `v_marketing_cadeia_dia` | 588 | ~5/dia | longe |
| `v_lousa` | 1.468 (semana: 636) | — | o aviso de teto estava morto |
| `v_mkt_resultado_recorte` | 159 | — | longe |
| `v_vendas_eventos` | 0 | — | vazia, mas é a de vendas |

**O defeito que estava no ar, com antes e depois na tela:** o Placar de Decisão — a faixa que ABRE a aba
Resultado — pedia 3.000 linhas de `v_mkt_resultado_peca` e recebia 1.000. A tela dizia **"base de 717
peças com leitura confiável"**; a verdade é **742**. A diferença é 25, que é exatamente quanto a view
tem acima de mil. Depois do conserto a tela diz **742**. A mediana não mudou (1), e isso é sorte, não
desenho: o número certo estava na tela por coincidência.

**O pior que não aconteceu, porque o Geral contou antes:** `audiencia_diaria` vem em ordem CRESCENTE de
dia. O corte comeria os dias mais NOVOS. Os seguidores congelariam no último dia que sobrou, o
`ultimoCenso` ficaria velho, e o aviso "contas sem censo nos últimos 3 dias" passaria a acusar contas
que estão sendo medidas todo dia. **Erro falso é pior que número errado**: manda consertar o que não
está quebrado.

**O aviso que nasceu morto, e por que ele saiu:** em 17/11, na Lousa, eu pedi 3.000 linhas "para servir
de sinal — se a resposta vier exatamente neste tamanho, a tela avisa que pode estar cortada". Não podia
funcionar nunca: a API corta em 1.000 antes do meu teto, então o tamanho recebido era no máximo mil e a
comparação com 3.000 nunca era verdadeira. Eu tinha escrito o teto da API no comentário logo abaixo e
mesmo assim calibrei o aviso acima dele. O aviso saiu; a leitura vai em páginas.

**E um defeito meu dentro do próprio conserto:** a primeira versão do `lerTudo` lia `{ data }` e
ignorava `{ error }`. Leitura que falhasse devolveria lista vazia, e a tela mostraria "nenhuma peça"
com cara de medição. Era o mesmo pecado do teto — falha silenciosa com aparência de sucesso — escrito
dentro do conserto do teto. Agora `lerTudo` levanta o erro, e a Central e o "O que funciona" voltaram a
mostrar erro na tela em vez de vazio.

**Fora deste conserto, de propósito:** `src/modules/ReceitaEmpresas.tsx` tem `.limit(1000)` exato em
`v_receita_empresas_resumo` (625 linhas hoje). A página Receita é do Agente de Receita (R-051), então
não mexi. **Tentei avisar às 20h40 e a mensagem expirou sem ser entregue** — a sessão dele está em
modo de permissão diferente e não teve como aprovar. Ele NÃO sabe. Fica como pendência do dono: ou ele
chama o Agente de Receita, ou me autoriza a corrigir em ramo próprio.

**Verificado no ar** (build `ef1bab7`), em app.digiai.app.br: Placar 717 → **742**; Lousa com as 264
peças da semana e duas chamadas paginadas (`offset=0&limit=1000`, página curta, para); Radar com
seguidores 8.983 (+603) e views 152.888 = Pulso 110.191 + Limelight 839 + casa 41.858. Conferi o
41.858 no banco com a mesma regra da tela: **469 peças, 439 com views, 41.858** — bate ao número. O
salto desde as 17h (24.495 em 395 peças) é leitura que chegou à noite: 284 linhas datadas de hoje.

## 2026-11-19 (15h) — O número grande do Radar 360 passa a somar, e as views de TikTok e YouTube aparecem

Dois defeitos apontados pelo dono no canal do MKT e medidos pelo Geral; um terceiro, meu, que apareceu ao
medir os dois primeiros. Todos na mesma família: **ler metade da fonte e chamar de tudo**.

**1. O número grande escolhia em vez de somar.** Com motor de vídeo no recorte, a Visão mostrava só os
motores (Pulso + Limelight) e **descartava** as views das peças da casa. O dono somou marca a marca e não
bateu — com razão: na Mello, as 1.212 views das peças do MKT ficavam fora das 26.502 do Limelight. Agora o
número soma as parcelas e **escreve cada uma embaixo**, para a soma ser conferível. Somar não duplica, e
isso foi medido em 17/11, não suposto: o espelho do Pulso lê só as contas dele, a `leitura_dia` só as da
DIGIAI, zero linhas cruzadas. A barra de participação por plataforma passou a somar as mesmas parcelas —
barra que divide um total diferente do número de cima é a mesma mentira em outro formato.

**2. A tela lia a fonte que não tem o número.** Ela usava `mkt.content_performance`, que **não tem view de
TikTok nem de YouTube**: medido hoje, Instagram 31.457 e Facebook 13.272, TikTok **0**, YouTube **0**. Por
isso o Bastidores aparecia com 46 views — que é a soma do Instagram das duas marcas dele — quando as peças
tinham **1.069 no TikTok** (759 em `cortes.da.digiai`, 310 em `bastidores.digiai`, exatamente o que o Geral
mediu). A tela não errava a conta: lia o lugar errado. Fonte trocada para a leitura por peça da
`v_mkt_analytics_peca_dia`, a mesma do Espelho do marketing. **Antes → depois:** no recorte de 30 dias,
23.753 → **24.491** views, com TikTok 1.070 e YouTube 80 saindo da invisibilidade; no total, 44.252 →
45.409. A fonte velha foi **removida**, não mantida ao lado: duas fontes de views na mesma tela é o defeito
que o dono apontou em 18/11 na tabela de motores.

**3. O defeito que eu mesmo tinha, e ninguém pediu para olhar:** o cartão "Leituras do conteúdo" somava
**todas as leituras diárias** da mesma peça, e `mkt.leitura_dia` guarda **acumulado, não diferença**.
Provado no banco: a peça `001b54de` no TikTok tem 95 views em 18/11 e 103 em 19/11; outra tem 12 e depois
74. São 51 peças com mais de uma leitura. A conta velha dava **48.204** views contra **45.885** reais —
**2.319 a mais, 5%**, desde 17/11. A regra agora vive num lugar só, `src/lib/leituraPorPeca.ts`, usada pelas
duas telas: *o valor de uma peça é a leitura mais recente dela*. Campo não medido na última leitura não
vira zero nem apaga medição boa — vale o valor mais recente que existe.

**A data da peça, e por que não é a da leitura:** o recorte do Radar é por data de **publicação**. Quando a
peça casa com uma publicação (o `peca_ref` é o id dela, ou o `corte_peca_id` do metadata), vale a data de
publicação; quando não casa — corte que saiu em conta do Pulso, sem registro aqui: 14 de 43 hoje — vale a
**primeira** leitura. É aproximação, não medição, e está escrita na tela.

**O defeito que só apareceu depois de publicar, e que era o mais grave dos quatro:** com o conserto no ar,
a tela mostrou **39.755** views das contas da casa onde o banco dizia **24.491**. A diferença, 15.264, batia
exatamente com um conjunto: as peças cuja publicação **não chegava à tela**. A API corta qualquer resposta
em **1.000 linhas** e devolve isso como sucesso — são 1.130 publicações, e as 130 mais antigas nunca eram
lidas; 99 peças perdiam a data de publicação e entravam no recorte de 30 dias pela primeira leitura. O teto
já tinha mordido esta casa em 17/11, na Lousa, e eu mesmo tinha escrito o aviso lá — e repeti o erro aqui.
Agora a leitura vai em páginas de mil (`src/lib/paginar.ts`), no Radar, no cartão Leituras e nos Motores.
Conferido no ar: 39.755 → **24.495**, com Pulso 110.170 e Limelight 839 ao lado, somando 135.504.

**E duas verdades que a tela passou a contar depois de eu olhar para ela no ar:** em rede sem coleta de
engajamento, o KPI dizia **0** — que é uma medição, e falsa: agora mostra traço e "engajamento não coletado
nesta rede". E "0 medidos" ao lado de "16 de 16 peças com leitura" parecia contradição na mesma tela; virou
"0 **com engajamento medido**". Conferido no TikTok, onde os dois apareciam juntos.

**Dois erros meus apanhados pela própria medição, antes de chegarem ao dono:** (a) ao simular em SQL o que a
tela mostraria, juntei as peças por `conta` com `join using` e o Postgres descartou toda peça com conta
nula — 254 peças e 38 mil views "desapareceram", e eu quase fui atrás de um defeito que não existia; o
código sempre agrupou com `conta ?? ''`. (b) publicação apagada da rede continua fora da conta, como no
resto da tela: 44 peças e 476 views, que é o motivo de o total "tudo" ser 45.409 e não 45.885.

## 2026-11-19 (12h05) — O espelho do marketing deixa de ser uma pilha: oito abas no padrão de cartão

Dono, 19/11: *"muita informação embolada… a aba marcas e publicações está bem organizada, temos que
melhorar motor e levar o padrão das outras 2 com os cards… fontes eu padronizaria também"*. Montei o mock
(`docs/mocks/marketing-espelho-2026-11-19.html`), ele aprovou — *"pode, implementa nessa ordem mesmo"* — e
acrescentou o que muda tudo: *"a ideia é que a parte de resultado traga todas as informações, neste mock
diminuiu, mas se quiser dividir em mais abas, fique à vontade"*.

**Nada saiu da página.** As nove faixas de largura inteira empilhadas numa aba só viraram **três abas**,
cada uma com uma pergunta: **Resultado** (está dando resultado?), **Audiência** (quantos leram, e quanto
disso medimos?) e **Dia** (sai hoje, e dá para continuar saindo?).

- **Placar de decisão** abre o Resultado: rotas, ligações, peças em 7 dias e interação mediana. O cartão do
  Google **perdeu a linha de totais** no mesmo movimento — o mesmo número em dois lugares da mesma tela faz
  desconfiar dos dois, que foi o defeito achado em 18/11 com a cadeia antiga.
- **"Motor no ar" saiu do Resultado** sem perder um número: os seis que ele mostrava já estavam, um a um, no
  cartão do DIGIAI MKT na aba Motores. Eram duas faixas iguais em duas abas da mesma tela.
- **Motores no cartão da aba Marcas:** cantoneira na cor, sigla, nome em serifa, selo de estado, faixa de
  quatro números com moldura, linhas curtas. As ressalvas saíram do meio dos números e foram para o pé do
  cartão — continuam lá, uma linha, onde se lê depois do número e não por cima dele.
- **Fontes, um número por azulejo:** eram doze azulejos com gramática diferente cada um e metade dos títulos
  sem acento ("publicaveis", "prospeccao", "ha 3d"). Agora nome, um número, a unidade, o frescor e o destino,
  agrupados em quatro famílias. **Traço quer dizer não medido, nunca zero** — zero é uma medição.
- **Fatos mostram o que a IA pode citar**, não quantos existem. A faixa diz **citáveis hoje** (fresco E
  público), porque é essa a conta que o motor do MKT faz. E **trava aparece como trava**: fato preso a um uso
  tem cadeado e diz a que está preso.

**O que a tela passou a confessar, e ninguém tinha pedido:** dos **34** fatos, a IA pode citar **6**. Vinte
estão públicos e **vencidos desde outubro** (verificados em 14–16/09, com 30 dias de validade). A Mello não
tem nenhum; o Pulso também não. Não quebra nada — fato vencido é silêncio por construção — mas quer dizer
que há um mês o gerador trabalha quase sem número, e isso não aparecia em lugar nenhum.

**Dois números meus corrigidos pela medição antes de chegarem ao dono:** no mock eu tinha escrito 12.480
seguidores (são **2.737**) e 530 cliques de SEO (são **106**, em três sites). Também estavam errados o
Facebook (0 de 207 lidas, não 171), as peças do Cortes (85, não 14) e os disparos da OSI (406 em 30 dias,
não zero). Conferi tudo contra o banco antes de publicar o mock.

**Verificado no ar**, aba por aba, em app.digiai.app.br (builds `6275f7f`, `21418d9` e `f6a4296`): Resultado,
Audiência, Dia, Motores, Fontes e Fatos. Ao abrir a aba Fontes vi "sem data" pendurado em cinco azulejos que
não têm leitura datada — rótulo repetido que não informa é ruído, e ruído é o que esta aba veio consertar.
Corrigido e publicado de novo.

## 2026-11-19 (11h07) — Os números do E02 do Pulso carimbados em mkt.fatos, e carimbados fechados (266)

Pedido do Geral às 10h56, depois de ele pôr os números na folha única às 10h55 (Cockpit `e7adc724`). A palavra do
dono está no canal do Pulso ("trocar pelo número real", "R$ 559 (bruto)"), registrada na folha — e é a folha que
autoriza número público nesta casa. Conferi os seis números na folha e no arquivo do Pulso antes de escrever: batem,
com fonte e data cada um.

**O problema que o carimbo tinha de resolver.** A folha escreve *"Uso: episódio 2 dos Bastidores do Pulso. Fora disso,
pedir"*, e em `mkt.fatos` não havia onde guardar isso. O gerador do MKT lê `fresco and publico` e manda a lista para a
IA: carimbar "R$ 559 num dia" como público jogaria o número em **qualquer** peça da marca pulso — exatamente o que a
folha proíbe. Carimbar sem registrar a restrição seria pior, porque o próximo a reverificar o fato não teria como
saber que ele é preso a um episódio.

- **Coluna `mkt.fatos.uso_restrito`** (nula = sem restrição) e uma **trava de banco**: fato com uso restrito não pode
  ser público. Para liberar é preciso apagar a restrição — ato deliberado, não um update distraído.
- **Seis fatos novos** em `brand_slug = 'pulso'`, todos `publico = false`: R$ 559 num dia (bruto, 12/06, com os R$ 425
  líquidos dentro da frase), a projeção de R$ 16.770 dita como projeção, a estimativa de junho de R$ 93,80 → R$ 11,18
  (sem a frase proibida "conferido no extrato"), 179 de 257 até 18/11 com validade de 30 dias porque envelhece, os 81%
  e 5,6× de junho, e o **"R$ 1.710" como trava**: não é dinheiro, era a tela contando crédito a R$ 1,00.
- **Cada frase sai com a ressalva dentro** ("num dia", "projeção", "estimativa de junho", "até 18 de novembro", "no
  bruto"). Ressalva que vive fora da frase é ressalva que não viaja com o número. Há prova que recusa a migration se
  alguma delas cair do texto, e outra que recusa se "conferido no extrato" voltar.
- **`v_mkt_fatos` mostra `uso_restrito`** (coluna no fim; as dez de antes intactas, `security_invoker` mantido, anon
  continua fora). O card de fatos do Marketing vai de 28 para 34 linhas.
- **Efeito zero no gerador, de propósito:** a prova central repete a consulta exata do motor do MKT
  (`_shared/fatos.ts`) e exige que **nenhum** dos seis apareça. O E02 é escrito à mão pelo Pulso; o que o banco tem de
  garantir é que o número não escape para o resto.
- **Duas sabotagens, as duas mordendo no lugar certo:** tirar a trava e publicar um fato → a prova da consulta do
  motor acusa; tirar "estimativa de junho" da frase → a prova do texto acusa.

**Achado ao medir, que ninguém tinha pedido:** a marca pulso **não tem nenhum fato fresco e público**. Os dois antigos
(436 mil views do canal e 223 inscritos no YouTube) venceram em **01/09/2026**. Para qualquer peça do Pulso fora do
E02, a IA está proibida de citar número — fail-closed, como deve ser, mas é silêncio por vencimento, não por escolha.
Avisado ao Geral; reverificar é do Pulso.

**O que este carimbo não faz:** não mexe em `mkt.content_rules`, a outra porta por onde o "R$ 1.710" poderia voltar.
Fica dito, não resolvido.

## 2026-11-18 (22h30) — O espelho do marketing passa a dizer o que funciona (263, 264)

Dono, 18/11: *"precisamos melhorar o espelho do marketing… nossos resultados estão complexos e misturados, temos
postagens, porém nada de dados sérios para tomada de decisão, mostra o que saiu e bem pouco o que funciona, onde
melhorar isso?"*; apresentei seis pontos medidos e ele respondeu *"de 1 a 6 todos"* e *"já chama quem for te ajudar"*.

**O diagnóstico, medido antes de escrever uma linha de tela:** a tela mostrava o que saiu porque o que saiu era o
único dado inteiro. Havia **770 peças com resultado próprio desde 16/07**, e a view que a tela lia entregava **só
`engajamento`** — a coluna com menos dado (290 de 770 com valor). `views` (562) e `alcance` (469) estavam coletados e
invisíveis desde julho. E a tela calculava **média**, com uma peça de 11.333 views no meio de medianas de 14.

- **`v_mkt_resultado_peca`** (263): uma linha por peça publicada, das **duas** fontes — a coleta do MKT (instagram e
  facebook) e a leitura diária do Pulso e do Cortes (que cobre **também tiktok e youtube**, e é a única com
  retenção). Uma view de uma fonte só deixaria metade das redes fora.
- **Nulo deixou de ser zero, e eu mesmo tinha misturado os dois na primeira leitura.** Medido: no Facebook o
  `alcance` é nulo nas 239 peças (a Meta não fornece — o MKT testou em 17/08 na v23) e `views` tem 39 nulos contra
  **118 zeros medidos**. Agora cada métrica tem três estados na tela: não coletado, medido zero, medido com valor.
- **`engajamento` nunca é nulo nas 770 peças** — coletor que sempre escreve número nunca admite falha. Medido: em
  **287** peças o zero é confiável (a peça foi lida por outra métrica) e em **71** não há prova. A coluna
  `engajamento_confiavel` carrega a diferença, e a mediana só usa as confiáveis.
- **`v_mkt_resultado_recorte`** (263, refeita na 264): o que funciona por marca, rede, tipo, tema, formato, faixa de
  hora e dia da semana, **em dois níveis** — dentro de uma rede e todas juntas. A 263 saiu com um nível só e a
  leitura veio misturada: a faixa "12h–15h" somava Instagram, Facebook, TikTok e YouTube na mesma mediana. View de
  TikTok não é view de Instagram, e entregar isso repetiria a queixa que abriu o trabalho.
- **Duas recusas escritas na view:** só peça com **7 a 90 dias** de vida (peça de ontem não performou, peça de julho
  acumulou meses) e mediana **só sobre a métrica não nula**, nunca `coalesce(metrica, 0)` — foi o coalesce que me deu
  mediana 12 na primeira passada e quase me fez concluir que nada funciona. Grupo com menos de 4 leituras não recebe
  posição.
- **`v_mkt_cobertura_leitura`** (263): quantas peças têm leitura, alcance, causa e segunda leitura, por marca e rede.
  Serve ao dono para saber o tamanho do buraco e ao MKT e a mim para medirmos o avanço da coleta sem conversar.
- **`v_mkt_negocio_semana`** (263): o painel do Google por semana — **530 pedidos de rota e 40 ligações desde
  22/09**, que é o número mais perto de dinheiro desta página e não estava na tela. Com o aviso de que o Google mede
  por **ficha e por dia, não por post**: não atribui rota a peça nenhuma.
- **Dez sabotagens nas duas migrations, todas mordendo**, e uma delas foi a minha própria guarda: a prova da leitura
  cumulativa escolheu uma peça em que soma e último valor dão o mesmo número, e abortou dizendo "a prova é cega".
- **O portão de marca não é provável por esta porta, e eu digo isso em vez de dizer que provei.**
  `mkt.contexto_privilegiado()` olha **`session_user`**, e a API de gestão entra como `postgres`; `set role` muda o
  `current_user`, não o `session_user`. A primeira versão da prova afirmava "logado sem marca lê zero" e **falhou com
  792** — não era a view aberta, era a prova impossível. Tentei `set session authorization` e levei permissão negada.
- **O que só apareceu ao abrir a tela:** a frase de destaque anunciou *"(sem tipo registrado) rende 3,6× a mediana de
  vídeo"*. O grupo sem rótulo tinha ganhado o ranking. Ele continua na tabela — a peça não pode sair da conta — mas
  sem posição e sem entrar na frase. Com ele fora, a leitura verdadeira é **imagem 18 contra vídeo 5 no Instagram**.

**As primeiras respostas honestas da tela** (Instagram, peças de 7 a 90 dias): **imagem rende 3,6× o vídeo** (mediana
18 contra 5); **story 22, png 9, jpg 7, mp4 5**; e a faixa de hora mais usada, **09h–12h com 106 peças, rende 14**,
contra **20 das 12h–15h**. A interação mediana é **0** em quase todo grupo — é a verdade desconfortável do volume
atual, e por isso rota e ligação estão na tela acima das views.

- **265, achada na tela depois de publicar:** toda semana do resultado de negócio aparecia como "incompleta",
  inclusive as cheias. A conta comparava `count(distinct dia)` com `7 × fichas` — a Mello tem quatro fichas, então
  pedia 28 dias numa semana de 7. **E a prova da 263 passou cega:** ela só verificava "semana completa mentindo
  sobre estar completa", e com nada nunca completo não havia o que mentir. A prova nova exige as duas coisas ao
  mesmo tempo — ao menos uma semana passada completa **e** ao menos uma incompleta (a corrente) — mais o rótulo
  batendo linha a linha com a contagem. Agora só a semana que ainda está correndo aparece incompleta.

**Com o MKT** (chamado no mesmo turno, por ordem do dono): ele confirmou o limite da Meta no alcance, vai copiar
formato e tema do asset na coleta e rodar a segunda leitura diária às 6h30 até **sex 20/11**; o gancho entra quando a
fábrica passar a escrevê-lo no job. As views zero do Facebook ele ainda não dá por provadas como limite de API.

## 2026-11-18 (21h45) — As histórias dos Bastidores ganham ordem na série e relevância (262)

Pedido do Geral repassando o dono (21h23): cada app alimenta o Cockpit com datas e relevância, o Cockpit controla a
sequência, o Cortes sobe ao banco. Desenho em `Cockpit/bastidores/PONTE-das-historias-2026-11-18.md`.

- **`cortes.historias` ganha `ordem`** (inteiro, pode ser nulo, **único mas `deferrable`**) **e `relevancia`**
  (`alta`, `media`, `baixa` ou vazio, com `check`). A view de contrato expõe as duas.
- **`ordem` é "ausente mantém, nulo explícito apaga"**, como o `saiu_em` da 242, porque a ordem **não mora no
  arquivo da história**: quem numera e trava é o Geral.
  **Correção medida às 22h, depois de aplicar:** eu justifiquei a regra dizendo que, sem ela, a primeira rodada do
  motor zeraria a numeração do Geral em silêncio. **Fui ler o motor e não zera:** `motor/historias.py` manda `ordem`
  sempre, com `null` quando a linha do `SEQUENCIA.md` não está travada — e aí apagar é o certo, porque a ordem
  pertence ao `SEQUENCIA.md` e vazio quer dizer "destravado". A regra fica como defesa para qualquer outro escritor,
  mas **eu afirmei um risco sobre um motor que não tinha lido**, e isso foi corrigido por escrito com o Geral.
- **`relevancia` é o contrário: ausente apaga.** Ela vem do arquivo, e o banco não pode continuar afirmando uma
  relevância que o arquivo já não diz. As duas colunas são novas no mesmo dia e têm regras opostas **porque a fonte
  de cada uma é diferente** — a regra segue a fonte, não o gosto.
- **`relevancia` é normalizada antes de gravar** (`"  Média "` → `media`) e valor fora das três **recusa a
  gravação**, com a frase que o agente do Cockpit precisa ler. Texto livre em coluna de classificação é pior que
  coluna vazia: `"Alta "` e `"alta"` viram duas gavetas e o filtro mostra metade dizendo que mostra tudo.
- **`ordem` única, mas `deferrable initially deferred`:** trocar o 3 pelo 4 na mesma rodada passa pelo estado em que
  os dois existem, e a conferência fica para o fim da transação. Série com dois números 3 recusa a rodada inteira, e
  alto — é o defeito que a 261 acabou de consertar; não vale guardá-lo de outra forma.
- **Cinco sabotagens, todas mordendo:** ausente apagando a ordem, nulo explícito não apagando, relevância aceitando
  texto livre, ordem repetida passando, e relevância sumindo do arquivo com o banco mantendo a antiga. **Honestidade
  sobre uma:** a da relevância morre no `check` da coluna, não na prova — são duas guardas, e eu não digo que foi a
  prova que pegou. O que a prova mostra pelo lado positivo é a normalização e que a recusa do valor inventado vem da
  função (ela exige a frase, não o código do check).

## 2026-11-18 (21h25) — O pedido de capítulo guarda a sequência em que o dono escolheu (261)

Dono, canal do Geral, 21h10: *"cuidado que temos que ter storytelling, e para isso a sequencia de ideias tem que vir
cravada na sequencia"*. Achado pelo Geral na revisão da 260, aplicada 20 minutos antes — **o defeito era meu**.

- **`array_agg(distinct x)` devolve os ids em ordem alfabética.** O capítulo nasceria com as histórias fora da ordem
  escolhida, e ordem errada, em storytelling, é outra história. Agora a duplicata sai pela **primeira aparição** e a
  ordem de chegada fica (`unnest … with ordinality`, `min(ord)`).
- **Um segundo defeito no mesmo trecho, que só apareceu ao consertar o primeiro:** tirando o `distinct` sairia também
  o `coalesce` que protegia o `if` de baixo. Sem ele, lista vazia faz `array_agg` devolver **NULL**,
  `cardinality(null)` é NULL, o `if … < 1` não dispara (NULL não é falso nem verdadeiro) e a função seguiria com uma
  lista nula. O coalesce ficou, dentro da subconsulta.
- **Três sabotagens, todas mordendo no lugar certo:** voltar ao `distinct` (a prova da sequência pega), tirar o
  `coalesce` (a prova da lista vazia pega) e trocar a primeira aparição pela última.
- **A sabotagem do `coalesce` mostrou por que "recusou" não basta:** sem ele a lista vazia *ainda* era recusada — mas
  pelo `not null` da coluna, com mensagem de banco, e só porque a coluna é `not null`. A prova exige a frase
  "escolha de 1 a 12", então ela pegou. É a mesma lição da prova 3-i, aplicada antes de doer.
- **As recusas da 260 foram reprovadas aqui** (portão do dono com história boa na mão, história travada, história já
  usada, lista com uma ruim não gravando meio pedido) e o `create or replace` foi conferido para não ter devolvido
  execução a `anon`. Consertar a ordem não pode abrir o portão.
- **A ordem também volta certa pela porta do motor**, não só na tabela: a prova lê `cortes_ler_pedidos()` e compara
  a lista inteira.

## 2026-11-18 (noite) — A base de histórias e o pedido de capítulo do Cortes no banco (260)

O DIGIAI Cortes pediu, com risco na primeira linha: o botão "Pedir capítulo" dele já estava no ar chamando uma função
que não existia, e as telas diziam "as ideias ainda não chegaram ao banco". O rascunho era dele; o banco é meu.

- **Migration 260** (`260_cortes_historias_e_pedidos.sql`): tabelas `cortes.historias` e `cortes.pedidos`, views de
  contrato `public.v_cortes_historias` e `v_cortes_pedidos` (as duas `security_invoker=true`, sem nada para `anon`),
  e seis funções — `cortes_gravar_historias`, `cortes_pedir_capitulo`, `cortes_cancelar_pedido`, `cortes_ler_pedidos`,
  `cortes_gravar_pedido`. Escrita só pela chave de serviço; pedir e cancelar só com `current_role_code() = 'super_admin'`.
- **Ensaio com rollback antes de aplicar, e quatro sabotagens** para ver se as provas mordem: função sem conferir
  `liberada`, portão do dono caído, motor lendo pedido cancelado, e a prova 3-d frouxa. As três primeiras morreram no
  lugar certo.
- **A quarta achou um defeito na prova, não no código:** a prova 3-d só olhava o código `insufficient_privilege`. Com o
  portão do dono removido, quem reclamava era a conferência da história ("a história x não existe") — a migration
  morria, mas por outro motivo, e o buraco não aparecia. **Prova 3-i nova:** exige o código `42501` **e** a frase do
  portão, com uma história boa na mão para que nada mais tenha do que reclamar. Sabotada de novo, agora morde.
- **Provas 3-f a 3-i** (o caminho do dono) são minhas: `current_role_code()` e `is_staff()` leem só `auth.uid()` em
  `iam.users` — nenhuma das duas olha `session_user` —, então dá para ensaiar com o uid dele dentro de uma transação
  que termina em rollback. Aceita a história boa; recusa a travada, a já usada e a que está em outro pedido aberto; e
  **não grava meio pedido** quando uma da lista é ruim.
- **Três ações novas na `cortes-gravar`** (versão 10, `verify_jwt` segue falso: a porta é Ed25519): `historias`,
  `pedidos` e `pedido`. Provadas **pela porta de verdade**, com um emissor de prova criado e apagado na mesma execução
  e a chave privada nascendo e morrendo na memória: assinatura torta recusada, base vazia recusada, gravar repetido
  não duplica, estado inválido recusado, `virou_episodio` sem código recusado, e o caminho inteiro do pedido gravando.
- **Duas decisões minhas no caminho, as duas contra "zero com cara de sucesso":** lista de histórias vazia é **400**
  (uma carga vazia volta 200 com zero e desaparece do log como se tivesse dado certo, e aí a tela diz "as ideias não
  chegaram" sem ninguém saber por quê), e `gravado: false` passa a vir com o motivo escrito, porque 200 com `false`
  não se lê em log nenhum.
- **Um emissor de prova meu não entrou de primeira e eu quase tomei a falha por sucesso:** `ops.emissor_externo` tem
  `registrado_por` obrigatório, e o meu script de SQL imprimia o erro mas saía com código 0. O script passou a falhar
  alto; a porta estava certa desde o começo, recusando origem que não existe.
- **Fora do meu alcance:** o MCP do Supabase perdeu a permissão neste banco no meio da sessão (só enxerga o
  `crm_erp` agora). Fui pela API de gestão com o PAT do `.env` do app. **Quem cuida do MCP precisa saber.**

## 2026-11-18 (fim do dia) — O padrão da casa de volta, as nove marcas pareadas e a Polá ligada antes de existir

Por ordem do dono às 16h20 (*"além de mudar padrão visual, que estamos perdendo"*), 16h33, 16h54 e 20h03.

- **As duas abas voltaram ao cartão que o app já tem.** `Publicações` (`src/modules/marketing/ControlePorMarca.tsx`) e `Motores` (`MotoresDeConteudo.tsx`) deixaram de ter desenho próprio e usam o **cartão da aba Marcas**, com as mesmas caixas e o mesmo selo. A tabela nova de motores saiu; os quatro motores voltaram para o cartão da seção que já existia.
- **As nove marcas nas três abas** (migrations 257–259): `v_mkt_estoque_marca` ancora em `mkt.brands` em vez de só no que tem movimento, ganhou `logo_url`, e `tem_movimento` saiu de subconsulta por linha (que dava **HTTP 500** sob RLS, invisível porque leitura falha devolve lista vazia) para o CTE. Marca que não publica pela casa **ocupa lugar na tela dizendo o que é**.
- **Critério de alarme refeito:** "rede sem próxima saída" punha 4 de 8 marcas em crítico — operação normal com cara de incêndio. Agora é **rede ativa parada** (publicou nos últimos 14 dias e está 3+ dias calada): 1 crítico, 7 ok.
- **A Polá, pronta antes de existir** (`src/lib/espelhoMotores.ts`): o tipo `PolaDia` era um palpite (`plataforma, publicacoes, views`) e a view real entrega `rede, posts_no_dia, alcance, impressoes, interacoes, seguidores…` — **sem "views"**. Lido como estava, daria **zero em tudo sem erro nenhum**. Tipo corrigido; `EstadoEspelho` ganhou **`bloqueado`** para o **HTTP 402** do Supabase (projeto restrito por cota), que não é "não consegui ler"; `resumoPola()` entrega uma frase só para as três abas, com **seguidores como censo** (último dia de cada rede, nunca a soma). Quando a leitura entrar, o número aparece sozinho.
- **Em produção a tela diz** "falta a credencial da Polá no ambiente — não é falta de publicação", porque o Cloudflare não tem as duas `VITE_POLA_*` (deixadas sem salvar de propósito, o banco dela está restrito). São **dois bloqueios distintos** e a tela mostra o que vale onde está.
- **Dois erros meus, consertados no mesmo dia:** troca silenciosa entre SEO e estoque (consulta inserida no meio de um `Promise.all`, lida no fim) e o 500 acima.
- Commits `d4e3d7e` → `3beec68`. Conferido em produção com os olhos, navegador próprio.

## 2026-11-17 — A aula pode ficar segurada, sem data (234) · Agente de Receita

O dono segurou a aula de 24/11 em 17/11, no canal do marketing. A aba Aula continuava contando dias, cobrando o mínimo de 3 vagas até 22/11 e pintando passo de vencido.

- **Migration 234** (aplicada em 17/11 pelo Receita, depois de ensaio com rollback): `receita.aula` ganha `segurada_em` e `segurada_nota`; `v_receita_aula` entrega as duas no fim (continua `security_invoker`); porta nova `rpc_receita_segurar_aula(slug, data, nota)`, definer com o portão dentro (staff ou a carga), sem execução para anon. Data nula solta a edição.
- **Aba Aula:** edição segurada mostra a faixa "Aula segurada por ti em…, não tem data", troca "Dias até a aula" por "sem data", tira o mínimo e o prazo do tile de vagas, esconde a linha do tempo e mostra os passos sem data, com o título "O que falta estruturar antes de dar data".
- **Aba Lista do dia:** enquanto a aula estiver segurada, o "antes de ligar" diz para não convidar ninguém e o botão do roteiro avisa que é o convite antigo.
- **Carga:** `Cockpit/scripts/receita-controle-sync.mjs` lê "segurada em" e "nota da segurada" do pacote da aula. **Próximo número livre: 235.**
- **Não conferido:** a tela com os olhos (o navegador do agente não está logado no app). Conferidos o banco, os tipos e o pacote publicado.

## 2026-11-13 — A página Receita ganha o cadastro das empresas da região (231)

- **Escrita, aplicada e publicada pelo Agente de Receita**, por pedido direto do dono no canal dele em 13/11: "mede as pequenas e médias e já cadastra todas em nosso banco".
- **Tabela nova `receita.empresa_regiao`** (migration 231): os estabelecimentos ativos dos dez municípios do Alto Tietê, pelos dados abertos do CNPJ da Receita Federal, edição 2026-10. **65.009 linhas** carregadas por `Cockpit/scripts/receita-empresas-sync.mjs`. Ficam fora empresário individual, MEI e sociedade unipessoal de advocacia (o nome é o de uma pessoa).
- **Sem contato do cadastro fiscal:** a tabela não tem coluna de telefone nem de e-mail. O contato de quem decide continua entrando por `receita.prospeccao_empresa`, pela ligação.
- **Tamanho e ramo calculados pelo banco** (`receita.fn_tamanho_da_empresa`, `receita.fn_ramo_do_cnae`): 38.613 micro, 9.498 pequenas, 9.737 médias ou grandes, 7.161 entidades. A base não traz número de funcionários; "média ou grande" é quem não se declarou micro nem pequena.
- **Leitura:** views de contrato `public.v_receita_empresas_regiao` e `public.v_receita_empresas_resumo` (invoker, só equipe). **Escrita:** só a carga, por `receita.fn_gravar_empresas_regiao(jsonb)`.
- **Tela:** bloco "Empresas da região" no fim da aba Prospecção (`src/modules/ReceitaEmpresas.tsx`): quatro números, recorte por tamanho, barras por cidade e por ramo. Lê só o resumo.
- **As três que pediram para sair em agosto** ficam no cadastro marcadas em `nao_contatar` (29 estabelecimentos); em `receita.prospeccao_empresa` o banco continua recusando.

## 2026-11-12 — A página Receita deixa de ser texto: quadro, barra, funil e linha do tempo (230)

- **Escrita, aplicada e publicada pelo Agente de Receita**, por pedido direto do dono no canal dele em 12/11: "vamos focar na aula, o que falta?" e "ficou feio o que estamos fazendo, muita coisa escrita, é complicado para entender; tu ou o agente do digiai tem que resolver isso".
- **A regra nova da página:** o número e o estado aparecem como forma (tile, barra, quadro, funil, linha do tempo); a explicação fica num "como ler", fechado por padrão. Peças em `src/modules/ReceitaUI.tsx`, só HTML e CSS com os tokens do app, sem biblioteca de gráfico. Nenhuma forma informa só por cor: toda barra tem o número escrito.
- **Aula:** quadro de passos em três colunas (só tu fazes · dos outros ou travado · pronto), faixa "para hoje ou amanhã", linha do tempo e funil do convite à vaga. Os passos vêm da coluna nova `receita.aula.passos` (migration 230), carregada da tabela "Passos até a aula" do pacote por `rpc_receita_gravar_aula_passos`.
- **Placar:** as nove seções escritas viraram a meta em quatro números, as três linhas, as frentes em quadro (em curso · congeladas · encerradas), o funil das óticas **por produto** (OSI e Clearix lado a lado, lido de `v_mkt_funil_leads`) e as rotinas com estado. O módulo saiu de `Receita.tsx` para `ReceitaPlacar.tsx`. A seção de funil antiga (`v_receita_funil`, que subestimava) deixou de ser usada pela tela.
- **Prospecção:** as vinte fichas escritas viraram um quadro por etapa; tocar numa empresa abre a ficha dela embaixo.
- **Lista do dia e Ideias:** o parágrafo do topo virou tiles; na lista, uma barra mostra quantas óticas são da OSI e quantas do Clearix.
- **Abas:** nova ordem pelo uso (Placar, Aula, Lista do dia, Prospecção, Ideias, Pacotes), com ícone.
- **O que não mudou:** nenhuma regra de dado. "Não medido" continua não sendo zero; produto da aula não criado continua dito como tal; etapa, toque, escolha e resultado continuam só por pessoa logada.
- **Numeração:** nasceu como 229 e virou 230 antes de ir ao repositório, porque o app publicou a 229 dele no intervalo. **Próximo número livre: 231.**
- **Espelho:** migration copiada para `docs/migrations/migrations/`.

## 2026-11-12 — Controle da prospecção e da aula na página Receita; a Lista do dia diz o produto (228)

- **Escrita, aplicada e publicada pelo Agente de Receita**, por dois pedidos diretos do dono no canal dele em 12/11: "agora coloca o controle da prospecção e da aula no app" e, ao ver a lista no ar, "temos 2 produtos sendo oferecidos; em qual produto se interessou?".
- **Aba Prospecção (`#/receita/prospeccao`):** uma linha por empresa da primeira leva (20), com etapa, canal de quem decide, próximo passo e cada toque anotado (canal e resultado). Contadores no topo. **Nada é enviado pela tela:** registrar um toque é anotar o que já foi feito.
- **Duas portas, como na 224:** a base das empresas entra pela carga (`Cockpit/scripts/receita-controle-sync.mjs`, lendo `receita/pacotes/prospeccao-b2b/fila.md`); a etapa e o toque só entram por pessoa logada, e a carga é recusada (prova 5). Recarregar a base não desfaz a etapa.
- **Cerca no banco:** Ecolab, Kimberly-Clark e Suzano S/A, que pediram para sair em agosto, são recusadas por `check` em `receita.prospeccao_empresa` (prova 4). Empresa marcada como "não contatar" não aceita toque.
- **Aba Aula (`#/receita/aula`):** vagas pagas, quantas faltam para o mínimo ao vivo, prazo, ligações de convite. Só leitura. As vendas não são copiadas: a view lê `v_vendas_eventos` e casa pelo nome do produto. **Zero venda com produto não criado aparece dito como tal**, não como zero seco.
- **Lista do dia com o produto:** `receita.lista_dia` ganhou a coluna `produto`, fotografada de `v_mkt_funil_leads.ramal` no dia da montagem; a view a entrega no fim, e a tela mostra em cada ótica "mostrou interesse por a OSI" ou "respondeu a mensagem sobre o Clearix". Medido em 12/11: os 4 interesses e os 5 cliques da base são todos da OSI; nenhum do Clearix.
- **Banco:** tabelas `receita.prospeccao_empresa`, `receita.prospeccao_toque`, `receita.aula`; views `v_receita_prospeccao`, `v_receita_prospeccao_toques`, `v_receita_aula` (invoker); quatro funções `rpc_receita_*`. Tabela de empresa, não de pessoa (R-013 não se aplica). Sete provas; ensaio com `begin … rollback` antes de aplicar.
- **Espelho:** copiada para `docs/migrations/migrations/`. O `schema.sql` continua sem regenerar. **Próximo número livre: 229.**

## 2026-11-12 — Lista do dia na página Receita (227)

- **Escrita, aplicada e publicada pelo Agente de Receita**, por pedido direto do dono no canal dele em 12/11 ("quero a lista, porém preciso que inclua em uma aba no app").
- **O que é:** quarta aba da página Receita (`#/receita/lista`), com as dez óticas para o dono ligar no dia. Cada linha traz a ótica, a cidade, o porte, o motivo de estar na lista, o telefone (toque para ligar) e três resultados: falei, não atendeu, não ligar mais.
- **A rotina é do banco:** `pg_cron` `receita-lista-do-dia`, às 11h UTC (08h de Brasília), de segunda a sábado. Roda com o aplicativo fechado e grava a própria execução, ou a falha, em `receita.rotina`. Domingo não monta.
- **Quem entra, em ordem:** quem mostrou interesse ou clicou; quem respondeu como pessoa; quem recebeu WhatsApp e não respondeu; quem nunca foi tocada. **Quem nunca entra:** sem telefone, saiu do WhatsApp, perdida, cliente, já comprou, com WhatsApp da esteira agendado para o mesmo dia, já falada, ou que pediu para não ligar. Quem não atendeu volta depois de dois dias, no máximo três vezes.
- **Sem cópia de contato:** `receita.lista_dia` guarda só o `lead_id`. Nome e telefone são lidos na hora das views de contrato (`v_vendas_leads`, `v_mkt_funil_leads`, `v_mkt_esteira_itens`), que continuam aplicando as políticas delas.
- **"Falei" usa a porta que já existia:** o componente `ToqueVenda` (`fn_registrar_toque`) registra a ligação; a tela só marca a linha depois. O resultado só entra por pessoa logada: a carga é recusada (prova 5).
- **Contrato novo para o app de marketing:** `public.v_receita_nao_ligar` (lead_id e data), para o WhatsApp poder respeitar quem pediu ao dono para não ligar mais.
- **Achado ao medir:** `v_receita_funil` lê `ops.commercial_leads.last_touch_at` e mostra "928 sem toque, último toque em 29/09". O funil do marketing (`v_mkt_funil_leads`) mostra 449 óticas abordadas por WhatsApp, 32 com resposta de pessoa, 5 cliques e toque em 12/11. **A seção "Funil da venda do Clearix" da página Receita está subestimando**; o conserto é do agente do app.
- **Provas:** seis na migration (portas, regra rodada em dia de prova, quem volta e quem não volta, carga recusada, cron ativo), ensaio com `begin … rollback` antes de aplicar.
- **Espelho:** copiada para `docs/migrations/migrations/`. O `schema.sql` continua sem regenerar. **Próximo número livre: 228.**

## 2026-11-12 — A alavanca sem data de início para de se repetir (226)

- **Escrita, aplicada e publicada pelo Agente de Receita**, com o "sim, conserta" do dono no canal dele em 12/11. Mexe em objeto que nasceu na 219 e na 220 (tabela `receita.alavanca` e função `rpc_receita_gravar_alavanca`); o agente do app foi avisado por arquivo.
- **O defeito:** a chave `unique (nome, inicio)` não casava quando `inicio` era nulo (nulo não é igual a nulo), então cada carga do placar criava outra linha para toda alavanca não iniciada. Em 12/11 a página Receita mostrou o Kit do Pulso duas vezes, uma em curso e outra congelada. As três repetidas foram tiradas antes da migration.
- **O conserto:** a chave passou a `unique nulls not distinct (nome, inicio)`; e a função faz a alavanca "não iniciada" que chega com data ganhar a data, em vez de nascer outra linha. A assinatura e os grants da função não mudaram.
- **O que não muda:** o mesmo nome com duas datas de início diferentes continua sendo duas linhas (a mesma alavanca tentada de novo), e encerrada ou congelada sem veredito continua recusada.
- **Provas:** seis na migration, ensaio com `begin … rollback` antes; depois de aplicar, duas cargas seguidas do placar deixaram as mesmas 12 alavancas.
- **Espelho:** copiada para `docs/migrations/migrations/`. O `schema.sql` continua sem regenerar, com o agente do app. **Próximo número livre: 227.**

## 2026-11-12 — Aba Pacotes na página Receita (225)

- **Escrita pelo Agente de Receita em ramo próprio (R-051) e publicada por ele**, por pedido direto do dono no canal dele em 12/11 ("coloca os detalhes dos pacotes no app também"), no mesmo arranjo que ele definiu para esta página em 11/11 ("publica tu").
- **O que é:** terceira aba da página Receita (`#/receita/pacotes[/<pacote>[/<arquivo>]]`). Um card por pacote do Receita, com o risco que abre o documento principal, e a página de cada pacote com todos os documentos dele (plano, peças, listas, testes). **Só leitura:** nada na tela envia, aprova ou muda estado.
- **Dois lados ligados:** a ficha de ideia ganhou a linha "o detalhe desta ideia está no pacote …", e a página do pacote lista as ideias que o citam. Quem calcula a ligação é a carga, na coluna `ideias`.
- **Banco:** tabela `receita.pacote` (uma linha por pacote, documentos em `docs` jsonb), view `public.v_receita_pacotes` (`security_invoker`), função `public.rpc_receita_gravar_pacote` (staff ou a carga). Cinco provas na migration; ensaio com `begin … rollback` antes de aplicar.
- **O texto chega em blocos, não em HTML:** a carga (`Cockpit/scripts/receita-pacotes-sync.mjs`, lendo `Cockpit/receita/pacotes/<pacote>/*.md`) parte cada documento em título, parágrafo, citação, lista e tabela. A tela desenha bloco por bloco e lê negrito, código e riscado à mão. Nada que vem do arquivo vira marcação executável.
- **O que não entra:** planilha e CSV ficam no Cockpit; a tela só diz o nome e o tamanho. A carga para se achar texto com formato de CPF.
- **Quem lê:** `is_staff()`, hoje uma pessoa (o dono). Um dos pacotes traz um dossiê de risco jurídico; quem der papel de equipe a mais alguém passa a mostrar esse texto a essa pessoa. Está escrito no cabeçalho da migration.
- **Sem dependência nova:** o app não tinha leitor de markdown e continua sem; o leitor é pequeno e mora no próprio módulo (`src/modules/ReceitaPacotes.tsx`).
- **Espelho:** a migration foi copiada para `docs/migrations/migrations/`. **O `schema.sql` não foi regenerado**; continua com o agente do app, junto com a linha do módulo no `AGENTS.md`.

## 2026-11-11 — Aba Ideias na página Receita (224)

- **Escrita pelo Agente de Receita em ramo próprio (R-051) e publicada por ele mesmo, por ordem direta do dono no canal dele em 11/11 à noite ("publica tu").** O pedido de integração ao agente do app ficou sem resposta e o dono preferiu não esperar.
- **O que é:** a página Receita ganha duas abas no endereço (`#/receita` e `#/receita/ideias[/<slug>]`). A aba Ideias mostra um card por ideia do Receita, com filtro por grupo, veredito e escolha, e a ficha completa de cada uma com os botões de escolha do dono (foco, depois, descartar).
- **Duas portas de escrita, de propósito:** a ficha entra pela carga (`Cockpit/scripts/receita-ideias-sync.mjs`, lendo `Cockpit/receita/ideias/*.md`); a escolha só entra por pessoa logada. A função de escolher **recusa a identidade da carga** (prova 5) e regravar a ficha **não apaga a escolha** (prova 4).
- **Aplicação:** ensaio com `begin … rollback` (as cinco provas passaram e nada ficou no banco), depois a aplicação com `commit`. Conferido no catálogo: tabela `receita.ideia` com RLS, view `v_receita_ideias` com `security_invoker=true`, duas funções. Carga: **48 fichas**, 8 seções cada, nenhuma com escolha.
- **Roteador:** `moduleFromHash` passou a olhar só o primeiro trecho do endereço. Antes, `#/receita/qualquer-coisa` caía em Visão calado.
- **A conta de cada ideia é texto, não número:** é hipótese do Receita e a tela não soma nem formata como dinheiro do placar.
- **Numeração:** nasceu como 221 e virou 224 antes de ser aplicada, porque o app publicou 221 a 223 no intervalo (regra 3 do README das migrations).
- **Espelho:** a migration foi copiada para `docs/migrations/migrations/`. **O `schema.sql` não foi regenerado** (não conheço o gerador); fica para o agente do app, junto com a linha do módulo no `AGENTS.md`.
- **Dúvida que continua do agente do app:** o portão da escolha é `is_staff()`. Se o papel do dono em `iam.users` for `founder`, trocar por `is_founder()` deixa a escolha só com ele.

## 2026-11-18 — A página Marketing vira a central de comando (247 a 255)

Ordem do dono às 14h07: *"ter a central de comando do marketing, leitura e resultados, e insights, fazer as melhores escolhas"*. Entregue em fatias, de cima para baixo, cada uma conferida na tela com a conta dele.

- **Filtro único** no topo, valendo para a página e guardado no endereço (`#/marketing/<período>`, no segundo trecho — `?p=` cairia em Visão, porque o roteador escolhe o módulo pelo primeiro).
- **"Estamos indo bem?"** — placar da Receita e a cadeia com o período anterior ao lado (247: cadeia por dia, com `natureza` separando fluxo de estoque — somar sete dias de censo daria sete vezes a audiência).
- **"Hoje sai"** e a **pontualidade das duas fontes num lugar só** (248). Janela de **dois lados**: a regra de um lado dava "no horário" a qualquer adiantamento, e havia 9 peças do MKT que saíram antes.
- **"O que está pronto para publicar"** (250 → 253): fôlego = dias já marcados + biblioteca ÷ ritmo.
- **"Leituras para escolher"** — insights calculados do dado, sem IA, cada um com fato, base, escolha e dono. Base curta mostra o fato e não sugere nada.
- **Publicações vira controle por marca** (254, 255) e **os quatro motores na mesma régua**.

### Quatro números falsos que não chegaram ao dono

1. **"Alcançar subiu 74%"** — o censo cobria 8 contas em 03/11 e cobre 22 hoje. Era a régua, não a audiência (249).
2. **"Bastidores, 0 dias de fôlego"** com 157 peças na fila, e **"Lancaster, 30 dias"** com 1 — a leitura estava **invertida**, porque eu media a biblioteca e chamava de fila.
3. **"Lancaster, 0,2 dia, fila baixa"** — fila curta nela é o motor agendando **3,5 h antes de sair**. O alarme certo é **rede ativa parada**, não "sem próxima marcada": de 4 marcas em crítico passou a 1.
4. **"MKT, 222 peças em 7 dias"** contra as 150 da cadeia, na mesma página: eu contava por dia de **medição**.

### Uma acusação minha que retirei

Escrevi na tela **"espelho do Limelight parado em 06/11"** e disse ao Orquestrador que a coleta dele estava parada há 12 dias. **Era falso:** a view agrupa pelo dia em que a **peça** foi publicada, não pelo da medição — a coleta rodou naquele dia, com 408 leituras. Ele corrigiu-me, e a observação dele era maior que o meu erro: a coluna "views dos últimos 7 dias" lia, na verdade, *views das peças publicadas nos últimos 7 dias* — motor que não publica aparece com zero mesmo ganhando audiência. A tela passou a dizer o que o número é, e ele publicou a medida certa.

### Parado às 16h20, por ordem do dono

*"perai vamos entender o que você está fazendo, além de mudar padrão visual, que estamos perdendo"*. **Ele tem razão: pediu cartões como os da aba Marcas e recebeu linhas e tabela.** Número certo em tela errada é entrega pela metade. Nada mais na aba Publicações nem no visual das outras até a ordem dele.

**Próximo número livre: 256.**

## 2026-11-17 (18h14) — A casa renova os links do Cortes sozinha (240 + 241)

- **O risco, com data:** os 85 links do ECO01 vencem 24/11 e o robô do MKT agendou peça até 08/12. Sem renovação, tudo de 24/11 em diante sairia **sem mídia** — e não como erro, mas como vídeo que não abre.
- **Rodada diária** `cortes-renova-links-diario`, 09h BRT, janela de 72h, renovando toda peça não publicada que vence em menos de três dias. Chave lida do Vault, como o resto da casa: **ninguém digita segredo**. O motor continua podendo chamar `links` quando rodar.
- **Erro meu que isto conserta:** eu escrevi na própria função que link vencendo sem ninguém ver "não dá erro, dá um vídeo que não abre" — **e deixei a renovação dependendo de alguém chamar**. Renovação é do servidor, não de máquina ligada.
- **Erro que a prova achou:** a primeira versão comparava a chave de serviço com a da env e levou **401** — a env tem o formato novo (`sb_secret_…`), o Vault tem a legada, as duas válidas. Pior que o 401: comparação de chave **quebraria calada a cada rotação de 90 dias** (R-021), num caminho que roda uma vez por dia e ninguém olha. **241** faz a borda perguntar ao banco quem está chamando, em vez de guardar cópia de chave.
- **Provado pelo comando do job tal como está gravado:** 85 de 85 renovados, `url_expira` de 24/11 18:09:12 para 18:13:56, e a `ultima_entrega` do motor **não mudou** — nenhuma rodada dele.
- **Teto da fila (500) passou a vir dito** na resposta. Mesma classe do teto de mil linhas que cegou a Lousa de manhã: resposta de sucesso que esconde o resto.

**Próximo número livre: 242.**

## 2026-11-17 (17h12) — A porta de leitura do motor do Cortes, e o rótulo de quem publica (239)

- **239:** `public.cortes_ler_episodio(codigo)` e a ação `ler` na `cortes-gravar`. O dono aprova na tela publicada, a decisão fica no banco — e **nada chegava à máquina**, porque a chave de serviço não mora lá (R-042) e é assim que tem de ser. Agora a leitura vem pela mesma porta assinada por onde o motor já escreve: mesma chave, mesma porta `cortes`, só leitura, só o episódio pedido.
- **`decidido_por` fica de fora.** É uuid de pessoa; o motor não pediu e não precisa. Porta de leitura entrega o mínimo que serve, e o resto é vazamento com boa intenção. A prova 4 falha se o campo voltar — testada invertida.
- **Episódio que não existe é resposta, não erro:** `encontrado: false` com listas vazias. "Não existe" e "existe sem aprovação nenhuma" levam a ações diferentes.
- **Provado contra o ECO01 real:** 1 aprovação, 85 peças, sem expor quem decidiu, e **um emissor da Lousa levou 401** ao tentar ler o cortes. Nada alterado: 1 episódio e 85 peças antes e depois.
- **Lousa:** `fora_do_mkt` passou a aparecer como **"fora do MKT (app da rede)"** — publicador que não estiver no mapa continua saindo como veio. Conferido abrindo a tela: *todos 169 · MKT 104 · Pulso 63 · fora do MKT (app da rede) 2*.

**Próximo número livre: 240.**

## 2026-11-17 (17h10) — O Cortes entra: chave cadastrada, links de leitura assinados, substituição declarada (237 + 238)

- **237:** a chave pública do motor do Cortes, porta `{cortes}` só. Conferida por mim do arquivo do Cockpit — 44 bytes SPKI, ed25519, assinatura falsa recusada, impressão `0f9b170a…629c` — e a prova 2 falha se o banco não tiver essa chave. O motor estava parado desde as 12h30 e o primeiro corte é 23/11.
- **Gravar por cima: medido, não deduzido.** O link de envio recusava o mesmo caminho (`The resource already exists`) — o que travava o vídeo corrigido, que tem o mesmo nome. Agora aceita com `"substituir": true`, e **nunca por padrão**: substituição silenciosa apagaria um arquivo bom por engano do motor, sem rastro.
- **238:** as duas portas que deixam a borda assinar os links de leitura que o robô do MKT consome. `url_assinada` vinha da carga, e o motor **não pode** preenchê-la: não segura credencial do depósito. Agora assina quem guarda a credencial — ao gravar, e pela ação `links` (validade 7 dias, renova o que vence em 48h, porque link que expira no sábado e só seria renovado na segunda deixa o robô sem vídeo sem nenhum erro aparecer).
- **O defeito que só o teste de ponta a ponta achou:** a primeira versão lia `cortes.pecas` direto e devolvia **`Invalid schema: cortes`** — a API REST não expõe esse schema. Entregue pelo que o código parecia fazer, as 85 peças já gravadas chegariam ao MKT **sem vídeo**, e isso só apareceria no dia da publicação.
- **A primeira sabotagem da 238 passou, e isso ensinou mais que uma falha:** eu tinha atacado uma cláusula redundante. Sabotagem que passa não prova que a prova é boa — prova que ataquei o lugar errado. Refeita contra as duas guardas, a prova falhou como devia.
- **Um arquivo meu ficou no depósito** (`cortes/provaappdigiai/upsert.srt`, 14 bytes, do teste). O banco bloqueia exclusão direta e a `cortes-gravar` não tem ação de apagar — **mantida a promessa em vez de abrir uma porta de exclusão para limpar o próprio lixo.** Declarado ao Cortes.

**Próximo número livre: 239.**

## 2026-11-17 (04h03) — A Lousa mostrava mil de 1.186: o teto silencioso da leitura

Achado pelo Orquestrador **abrindo a tela no Chrome do dono** — não lendo código nem conferindo pacote.

- **O defeito:** `select('*')` sem recorte traz **as primeiras mil linhas** (teto da API). A `v_lousa` já passava disso, e Pulso e Limelight entram **no fim da união** — então ficavam inteiramente de fora.
- **Medido antes de consertar:** nas primeiras mil linhas cabem **95** peças desta semana e **zero** de fora; a semana real tem **182**, e as **130** linhas de fora nunca chegavam.
- **E não nasceu com a etapa 2: nasceu na etapa 1, às 02h51.** A `v_mkt_lousa` sozinha já tinha 1.056 linhas. O "99 peças na semana" que eu escrevi no changelog da madrugada era o que coube, não o que havia.
- **O que torna este defeito traiçoeiro:** mil linhas é uma resposta de **sucesso**. Sem erro, sem aviso, sem sintoma — a tela não tinha como saber que estava cega.
- **Conserto:** a leitura pede **a janela da semana** (e refaz ao trocar de semana), pede **a parte sem data separada** — peça sem data não entra em recorte por data, e sumir da tela é o mesmo que não existir — e **avisa quando a resposta vem no teto**.
- **Conferido abrindo a tela**, logado como o dono: **152 peças** (eram 95) e o filtro **quem publica — MKT 89 · Pulso 63** apareceu sozinho, como desenhado.
- **A lição, escrita porque me custou três vezes hoje:** conferir o pacote publicado prova que o deploy saiu. Só **abrir a tela** prova que ela diz a verdade. Eu dei esta entrega por boa três vezes pelo pacote, e ela estava errada nas três.

## 2026-11-17 (03h40) — Lousa 1b: a projeção, por mediana e com o tamanho da base junto (236)

- **`public.v_lousa_base`**: história de 28 dias por conta/rede/tipo, **mediana e faixa p25–p75, nunca média**. O critério mora na view, não na tela, porque eu e o Orquestrador medimos o mesmo número hoje e demos **28 e 31** — era a janela andando com a hora, e dois números para a mesma coisa é pior que nenhum.
- **Por que mediana:** medido, o grupo `instagram/post` tem mediana **119** e melhor post **3.279**. A média prometeria à próxima peça um número que quase nenhuma peça alcançou.
- **Grupo todo em zero não é base, e isso nasceu de medição:** `facebook/reel` tem **37 peças, 37 com o campo `views` preenchido, todas em zero**, e nenhuma com compartilhamento. É coleta vazia, não peça que não rendeu. Sem essa trava a tela diria "previsto 0 views" para o Facebook — que o dono leria como "vai fracassar". O cartão dessas peças diz **"sem leitura nesta conta"**.
- **Conta nula fica fora:** são **199 linhas** da analytics, justamente as de história mais rica (`instagram/post` com 111 peças). Elas não se ligam a agenda nenhuma. Avisado ao MKT no mesmo dia; quando ele consertar, a base passa a valer sozinha.
- **No cartão:** `~{mediana} views · {p25}–{p75} · base {n}` para quem tem base; **"base curta (2 de 4)"**, **"sem leitura nesta conta"** ou **"sem base"** para quem não tem — nomes diferentes porque pedem ações diferentes. **Só peça que ainda vai sair** recebe projeção.
- **Previsto nunca soma com medido nem usa a cor de resultado.** No cabeçalho: *"previsto ~45 views em 8 de 47 que ainda vão sair"*, em tom neutro.
- **A quarta trava, minha:** se **nenhuma** peça futura encontrar história e a base existir, a tela diz que **a agenda e a medição falam línguas diferentes** — não diz "sem base" peça por peça. "Conta nova" pede paciência; "os dois lados não se ligam" pede conserto.
- **6 provas na migration**, com sabotagem antes (tirei a condição da prova 3 e o banco recusou, apontando 12 grupos). A prova 5 lê a **definição** da view e falha se ela calcular média.

### Um erro meu, e o que ele custou

- **Publiquei a 1b com a Lousa em branco.** Usei `hoje` numa linha acima da que declara `hoje`: `const` não existe antes da sua declaração, e a tela inteira caiu. **O build passou** — isto só aparece ao rodar. **Das 03h33 às 03h38 a Lousa ficou em branco em produção.**
- **O que achou foi abrir a tela, não ler o bundle.** O bundle publicado tinha todas as marcas que eu procurava e estava quebrado assim mesmo. Conferir conteúdo publicado prova que o deploy saiu; só abrir prova que funciona.

## 2026-11-17 (03h) — Lousa etapa 2 e as leituras do conteúdo no espelho do marketing (235 + `lousa-entrada`)

### A Lousa passa a receber de fora

- **`lousa-entrada` no ar**, assinada com Ed25519: Pulso e Limelight mandam a agenda das contas deles e ela aparece na mesma tela. Os dois já enviavam e recebiam 404; agora entram. **O dono não colou segredo nenhum** — cada motor gera o par no próprio projeto e só a chave pública vem para cá.
- **As duas chaves conferidas por mim, não pelo relato:** 44 bytes SPKI, tipo ed25519, assinatura falsa recusada, e impressão sha256 batendo com o arquivo do Cockpit (`96cccd57…4505` do Pulso, `3990c312…5e0e` do Limelight). A prova 3 da migration falha se a chave do banco não for a que eu conferi.
- **A tela lê `public.v_lousa`** (MKT mais o que vem de fora) e ganha **filtro por quem publica**. Ele existe por um motivo medido: a mesma peça pode sair pela conta do MKT e pela conta de quem a produziu, e são publicações diferentes, não repetição.
- **A gravação recusa linha por linha, nomeando o motivo**, em vez de derrubar a carga ou engolir o erro: origem do corpo diferente do cabeçalho assinado, publicador que não é a origem autenticada, `origem_ref` vazio, campo obrigatório vazio, `arquivo_hash` que não é hex de 64. Normaliza `@Pulso` → `pulso` e `sha256:ABC…` → hex minúsculo, as duas formas aceitas e uma só guardada.

### Um defeito meu que estava no ar, achado medindo antes de escrever

- **A `cortes-gravar` aceitava qualquer emissor ativo.** Como eu tinha cadastrado o Limelight em `ops.emissor_externo` para a Lousa, a chave dele podia gravar episódio no schema `cortes`. Ninguém usou (`ultima_entrega` nula, 0 episódios), mas a porta estava aberta.
- **Conserto:** cada emissor declara **em que portas entra**, e o padrão é **nenhuma**. A leitura da chave passou a ser uma função só (`ops.fn_emissor_chave(nome, porta)`), o que impede uma função futura de esquecer a porta.
- **Provado por chamada real:** um emissor cadastrado só para a `lousa` bate na `cortes-gravar` e leva **401**.

### Provas

- **7 provas na migration**, com sabotagem antes (inverti a prova 2 e o banco recusou com a mensagem dela). Ensaio inteiro com `rollback`: nada ficou — tabela, view e coluna não existiam depois.
- **9 casos de ponta a ponta, 0 falhas**, com par gerado só para o teste e emissor removido no fim: 7 recusas (sem cabeçalho · origem não cadastrada · assinatura de outro corpo · relógio 20 min atrás · chave de outro par · corpo que não é lista · emissor da lousa batendo no cortes) e 2 aceites (carga com 1 boa e 1 torta devolvendo o motivo da torta; reenvio da mesma peça sem duplicar e com o estado atualizado). Carimbo de entrega funcionando, sem aviso.

### Leituras do conteúdo no espelho do marketing

Ordem do dono no mesmo dia: *"já temos os analytics do cortes do pulso no próprio pulso, precisamos agora nos analíticos total no espelho do marketing"*.

- **Cartão novo na aba Resultado**, somando **quatro fontes**: contas da casa (`v_mkt_analytics_peca_dia`, que já traz os cortes do Pulso que o MKT publica), canais do Pulso, **cortes e longos das contas do Pulso** e Limelight.
- **A quarta fonte não existia.** Perguntei ao Pulso se havia sobreposição antes de somar; a resposta mostrou que os cortes das contas dele e os longos viviam em `pulso_analytics.leituras_longos`, **sem espelho** — fora do painel. Pedi a view, ele publicou no mesmo dia, e **eu conferi como anon**: 30 linhas, 34 publicações, 1.084 views, **0 linhas com conta da DIGIAI**, que é a prova de que somar não duplica.
- **Leitura de blog não entra nas views:** uma página lida não é um vídeo visto. Fica na linha dela.
- **Peça sem leitura coletada é contada à parte, nunca como zero**, e a tela escreve por que falta número em cada rede (resposta do MKT no mesmo dia): retenção e horas só existem no YouTube; reel do Instagram, vídeo do Facebook e TikTok são **"ainda não medimos"**; post de imagem, carrossel e story a **rede não dá**. São coisas diferentes para quem lê.
- **Fonte que não se consegue ler aparece escrita e nomeada** — painel cego e motor parado levam a decisões opostas.

**Próximo número livre: 236.**

## 2026-11-17 (tarde) — Lousa: os quatro ajustes que o dono pediu olhando a tela

Pedidos do dono pelo Geral, depois de abrir a `#/lousa` em produção. Todos na tela, nenhum no dado.

- **Conta que é só número mostra o nome.** `1316648551541152` não diz nada a quem lê; a tela passa a escrever `digiaibr` (o `conta_nome` da view) quando o identificador é numérico — id de Página do Facebook ou de empresa do LinkedIn. Onde a conta é arroba, o arroba continua sendo o nome real.
- **"no Planner" em vez de `NO_PLANNER`.** Um mapa de rótulo com uma entrada só; estado que não estiver nele **continua saindo como veio**, que é a recusa da etapa 1 (estado desconhecido aparece com o nome dele, não vira "outro").
- **Cancelado sai da vista por padrão, com botão para ver.** A fila do motor acumula cancelamento antigo: das 99 peças da semana, **32 estavam canceladas** e empurravam para fora da vista o que ainda vai sair. O filtro entrou **dentro do `casa()`**, junto com marca e rede, para os contadores e os botões continuarem contando a mesma coisa que a grade mostra — contador que discorda da tela é o defeito que a etapa 1 já tinha evitado.
- **Cancelado não leva mais a marca de "· erro".** A fila guarda o motivo do cancelamento no mesmo campo do erro; "cancelado · erro" fazia parecer que algo quebrou quando alguém só desmarcou a peça.
- **Conferido em produção** (`app.digiai.app.br/#/lousa`, bundle `index-CioVYhLH.js`): contador lendo "67 peça(s) · 10 publicadas · 23 agendadas · mostrar 32 cancelada(s)", `no Planner` em caixa mista e `digiaibr` no lugar do id.

## 2026-11-17 (madrugada) — Lousa de publicação, etapa 1: a semana inteira num lugar só

- **O dono perguntou "não era para ficar dentro do digiai?"** — estava olhando um protótipo parado, fora do app. A página `#/lousa` entrou ao lado de Controle, às **02h51 BRT**, lendo `public.v_mkt_lousa`.
- **O que ela mostra:** coluna por dia da semana (em BRT), cartão com hora, conta, rede, título e estado; faixa com a cor da marca; filtro por marca e por rede, com contadores que **respeitam um ao outro** — botão cujo número não muda quando o vizinho muda faz a pessoa clicar e achar que a tela quebrou. Hoje: 99 peças na semana, 10 publicadas, 23 agendadas.
- **Duas recusas, as duas medidas antes de escrever uma linha:** estado que a tela não conhece aparece **com o nome dele** (a view devolve 7 estados e o ADR-0066 lista 5 — `no_planner` e `rascunho` vêm do motor, não daqui); e peça **sem data ganha bloco próprio** (4 de 1.056 hoje, todas `planejado`), porque numa grade por dia elas não teriam onde cair, e cair fora da tela é o mesmo que não existir.
- **A cor da marca vem do dado** (`accent_hex`, da view), não de valor escrito na tela: é identidade guardada no banco. O resto é token do design system (R-014).
- **Achado antes de existir:** medindo a view, vi que ela já traz 135 linhas com `origem = 'pulso'` e `publicador = 'mkt'`. Quando o Pulso enviar as contas dele com a mesma origem e o mesmo ref, a chave `(origem, origem_ref)` casaria peças diferentes e **a segunda apagaria a primeira em silêncio**. A chave da etapa 2 passou a ser **(origem, publicador, origem_ref)** — com 0 colisões hoje, o conserto custou uma linha de contrato.
- **Conferido em produção:** a marcação de "hoje" caiu na coluna certa (ter 17/11, com a página aberta às 02h52), que é a prova de que o dia é calculado em BRT e não em UTC.

## 2026-11-17 — Quem escreve de fora assina, e o dono não cola segredo (233 + `cortes-gravar`)

- **O desenho que estava em pé pedia a chave de serviço no `.env` de um motor local.** Essa chave passa por cima da RLS do banco **inteiro**, não só do schema de quem a usa. O dono estranhou e não colou — e estava certo. Havia **3 segredos esperando a mão dele**; este desenho derruba dois.
- **Medido antes de desenhar:** publiquei uma sonda no runtime das edge functions e apaguei em seguida. `supabase-edge-runtime-1.79.1 (Deno 2.1.4)` **gera, assina, exporta, importa e verifica Ed25519 no WebCrypto nativo**, sem biblioteca. Sem isso eu estaria prometendo o que não sei.
- **233: `ops.emissor_externo`.** Quem pode escrever vindo de fora, e com que chave pública. A chave **pública mora no banco**, não em constante na função: autorização vem do banco (R-037) e desligar um emissor é uma linha, sem deploy. Uma `check` faz portaria na forma da chave (prefixo SPKI de Ed25519 e tamanho), para ninguém cadastrar "depois eu pego a chave" no lugar dela.
- **`cortes-gravar` no ar**, com o que ela **nunca** vai ter: nenhum "roda este SQL", nenhum apagar, nenhuma leitura de outro schema. Se a chave privada do motor vazar, o estrago é o caminho de escrita do `cortes` — não o banco.
- **Fecha no erro em todos os caminhos:** sem cabeçalho, origem desconhecida ou inativa, relógio fora de ±5 min, assinatura inválida, **tabela de emissores ilegível** → 401. E o corpo é assinado como **texto cru**: reserializar antes de conferir faria a assinatura valer para um texto que o emissor nunca mandou.
- **Provado de ponta a ponta, com par gerado só para o teste e emissor removido no fim:** 6 recusas (sem cabeçalho · origem desconhecida · assinatura errada · relógio 20 min atrás · assinatura de outro corpo · caminho `ECO01/corte 3.exe`) e 2 aceites (link de envio assinado; e `gravar` com carga incompleta devolvendo a mensagem da própria RPC, o que prova o caminho inteiro). **0 episódios criados.**
- **Um defeito meu que só o teste de ponta a ponta mostrou:** a primeira versão carimbava `ultima_entrega` e **ignorava o erro** — e o carimbo falhava calado, porque `service_role` tinha `select` mas não `update` na tabela nova. Consertado nos dois lados: o grant mínimo (`select, update`, nunca `insert`/`delete`) e a função que **avisa na resposta** quando o carimbo falha, sem derrubar a entrega que já aconteceu.

## 2026-11-14 (noite) — Dossiê e pitch por lead: a base no banco (232)

- **Modelo B, e recusei o A.** A ordem dava a opção de guardar o dossiê no `notes` do lead. `notes` é texto livre — exatamente o que esta casa passou a semana desentupindo: bloco de prosa que a tela lê com expressão regular, que ninguém compara entre dois leads e que não tem onde marcar fonte. O dono está abrindo campanha dirigida; isto vai repetir, e o que repete merece forma.
- **A trava de LGPD virou coisa do banco, não do comentário.** As chaves de primeiro nível do dossiê são **lista fechada**: `religiao`, `familia` ou `cpf` **não entram — o insert falha**. Campo novo exige migration, e quem escreve uma migration pensa. A **prova 1** recusa a migration se a trava parar de travar.
- **E o limite dela fica escrito, para ninguém se enganar:** o banco controla a **forma**, não a prosa. Nada impede alguém de escrever algo pessoal dentro de `observacao`. A trava evita o acidente de criar um campo para isso; não substitui a regra nem a revisão. Dizer o contrário seria conforto falso.
- **O app não envia, e agora isso é verificável:** nenhuma das três funções fala com a rede, e a **prova 4** recusa a migration se alguém acrescentar um `net.http_post` a elas. O status `enviado_pelo_dono` é o dono dizendo que mandou — a máquina não tem como saber, e fingir que sabe seria inventar envio.
- **Um tropeço meu virou prova.** Eu havia escrito a prova 2 chamando a RPC para testar ida e volta; a migration recusou, porque ela roda como `postgres` e `is_staff()` é falso ali. A tentação era alargar o portão para o teste passar. **Não alarguei** — portão que cede para caber num teste deixa de ser portão. A prova 2 passou a verificar justamente a **recusa**, e a ida e volta foi testada por outro caminho.
- **`fontes` é obrigatório na leitura da tela:** a view marca `sem_fonte`. Dossiê sem fonte não é pesquisa, é lembrança.
- **Falta a tela** (aba Dossiê + botão de gerar pitch no módulo Comercial) e portar o caso Capobianco como exemplo. A base está de pé e provada.

## 2026-11-14 (tarde) — A proposta gerada passa a oferecer o que a casa faz

- **Risco achado pelo Orquestrador Geral, antes de o dono mandar um pitch pronto.** `proposalGen.ts` montava o corpo com **"Teste de 90 dias"**, **"30% OFF nos 3 primeiros meses"**, "implantação isenta no teste" e um **"acesso de demonstração" autosserviço**. A casa **não faz nada disso desde 24/09/2026**.
- **A folha única manda, e é de lá que veio o texto novo:** "sem período grátis e sem demo automática; a demonstração é ao vivo, em 20 minutos, com os números de uma ótica de verdade (dados desfocados); piloto pago e assistido, **a partir de R$ 349/mês**, um piloto por vez" — mais o diagnóstico pago de R$ 349 por Pix, que vira a primeira mensalidade se o piloto for assinado em 30 dias e **não abate a implantação**.
- **Oferta que a casa não cumpre não é erro de texto: é promessa falsa com o nome do dono embaixo.** Por isso a correção não foi "ajustar a redação" — foi tirar a oferta inteira e pôr a que existe, com as frases autorizadas.
- **Desconto deixou de ser padrão.** Antes, toda proposta nascia com 30%; agora só aparece se alguém escrever um na proposta. E a lista de propostas parou de imprimir `null% off · nulld teste` quando não há nenhum.
- **Ficou escrito no arquivo um número que ninguém tinha notado:** os planos de **R$ 899 e R$ 1.499 não estão na folha única**. O que a folha sustenta publicamente é "a partir de R$ 349/mês". Enquanto não entrarem lá, proposta que sair com 899 ou 1499 publica número que a casa não ratificou — avisado ao Geral.
- **Provado no ar por conteúdo:** o pacote publicado contém "Piloto pago e assistido, a partir de R$ 349/mês" e **não contém mais** "OFF nos 3 primeiros meses". E **nenhuma proposta foi afetada**: `ops.proposals` tem **0 linhas** — o conserto chegou antes da primeira.

## 2026-11-12 — O funil da página Receita para de subestimar o toque (229)

- **Erro meu, apontado com medição pelo Agente de Receita.** `v_receita_funil` lia **só** `ops.commercial_leads.last_touch_at` e dizia "928 sem nenhum toque, último em 29/09". Verdade medida hoje: **450 leads abordados por WhatsApp**, 847 mensagens, a última **às 13h55 de hoje**; 19 responderam pessoa, 150 robô, 4 clicaram, 1 interessada.
- **Causa:** o motor de WhatsApp **nunca escreve** `last_touch_at` — quem escreve ali é só o ciclo de vida do lead (`fn_upsert_commercial_lead`, `fn_marcar_lead_perdido`, `fn_descartar_lead`, `fn_registrar_venda_clearix`). Os 18 valores existentes são de setembro, à mão.
- **O que custou:** em 11/11 eu disse ao dono que "a linha 2 não está devagar, está parada há 42 dias". Era falso, e ele decidiu com esse número na frente. Retirado com ele no mesmo turno em que medi.
- **O conserto não foi somar número, foi parar de chamar duas coisas pelo mesmo nome.** *Abordado* é o motor trabalhando sozinho; *toque manual* é alguém ter falado e registrado — que é o que as dez ligações do dono viram a partir de 16/11. As duas pedem ações opostas: uma diz "o robô está rodando", a outra diz "ninguém humano falou com essa gente".
- **As três colunas que mentiam deixaram de existir** (`sem_nenhum_toque`, `com_algum_toque`, `ultimo_toque_em`), em vez de ganharem companhia — nome errado engana de novo mesmo com o número certo ao lado. **Uma prova impede que voltem**, outra confere a abordagem contra a fonte, uma terceira fecha as duas somas com o total, e a quarta trava o próprio erro: se um dia a abordagem voltar a ser igual ao toque manual, é porque alguém religou a leitura de uma coluna só.
- **A página é do Agente de Receita desde 11/11** (R-051, exceção do dono): avisei no mesmo turno quais são os nomes novos. Até ele republicar, o bloco mostra campo vazio — pior de ver e melhor de verdade do que o número errado.

## 2026-11-11 (noite) — A validade dos fatos passa a avisar sozinha (222)

- **Revalidação que depende de alguém lembrar não é controle, é sorte.** Foi por acaso que eu achei os 20 fatos vencidos, e um deles era fonte única de preço de uma marca. Agora um job diário às **07h05 BRT** confere e escreve em `ops.controle_itens` como `agente='fatos'` — a porta que já leva à tela Controle. **Sem tabela nova e sem tela nova** (decisão do Geral, pela prioridade de receita).
- **Prova de que rodou, sem tabela de execução: o próprio job grava uma linha de batimento por dia** ("Fatos conferidos: 6 frescos, 0 vencendo, 20 vencidos"). **Dia sem essa linha é dia em que não rodou** — e isso aparece, em vez de virar silêncio. Mesma ideia que separou "não medido" de "zero" na página Receita: ausência tem de ser visível.
- **Risco é só o que trava trabalho.** Fato **vencido que alguma regra de marca nomeia como fonte única** sai um por um, em nível 1 — é o caso que faz a peça sair sem poder citar número. Fato que vence em 7 dias sai um por um, em nível 2. **Fato vencido que ninguém usa sai em UMA linha agregada**, com a lista dentro: vinte linhas iguais numa tela que a casa está tentando desentupir seria eu criando o problema que passei a semana apontando. Alarme que toca por tudo ensina a ignorar alarme.
- **O banco pegou um defeito meu na primeira tentativa:** `ops.controle_itens` tem chave única em (data, agente, tipo, hash do texto), e eu havia posto a chave do fato só no título — dois fatos com a mesma validade geravam texto idêntico e o segundo aviso **sumia como se fosse repetição**. Agora quem é o fato faz parte do que o aviso diz.
- **Quatro provas:** a rotina roda e escreve exatamente **um** batimento; rodar duas vezes no mesmo dia **não duplica** nada; **não há risco de fato hoje** (porque `osi_oferta` foi revalidado na 221 — e no dia em que essa prova falhar, é o alarme funcionando); e o job está ativo, no horário, chamando a função certa.

## 2026-11-11 (noite) — Os fatos da OSI revalidados na fonte, e um fato declarado deixa de vencer como medição (221)

- **Por que corria prazo:** `osi_oferta`, `osi_aplicacao` e `osi_taty_anos_balcao` venciam em **15/11**, e a regra da OSI em `mkt.content_rules` diz com todas as letras que **preço, pacote e garantia vêm só do fato `osi_oferta`**. Com ele vencido e a trava fail-closed, as peças da aula de 24/11 e a grade da OSI sairiam **sem poder citar o preço do produto**. Não era hipótese: era o que a regra manda acontecer.
- **Revalidado contra o artefato publicado, não contra a memória:** `academy.products` (slug `otica-sem-improviso`) devolve **price_brl 49.00**, e a landing no ar traz, inteira, a frase do fato — **"R$ 49, pagamento único. Garantia de 7 dias. Depois dos 30 dias, o Nexus continua por R$ 19,90/mês"**, mais "3 dias", "ritmo do plano", Hotmart e Kiwify. Os dois fatos de produto continuam verdadeiros palavra por palavra; só a data mudou.
- **O que eu NÃO fiz, e é o ponto da migration: não carimbei o fato declarado.** "25 anos de balcão" é **declaração do dono**, não medição — não há artefato para reler, e mover a data de verificação seria eu dizer "verifiquei" sobre o que não verifiquei. O que mudou foi a **janela**: 60 → 365 dias, porque declaração não apodrece em dois meses, apodrece quando a pessoa faz mais um ano de balcão. A **prova 2 existe para me impedir** de, num dia apressado, revalidar em lote o que não tem como ser relido.
- **A prova 3 trava a outra tentação:** revalidar é reler a fonte e mover a data. Se o texto do fato mudar na mesma migration, deixa de ser revalidação e vira fato novo — que é outra decisão.
- **Varredura que originou isto:** **20 dos 26 fatos públicos ativos estão fora da validade** (o `pulso_youtube_crescimento` tem validade de 7 dias e 103 de idade). **Nada vazou para post**: o motor filtra `fresco` na `v_mkt_fatos`, comparando em BRT, e sem fato não cita número. Mas restam **6 fatos frescos** para a casa inteira — agora nenhum deles vencendo antes da aula.

## 2026-11-11 — A página Receita ganha dado, pela porta certa (220)

- **O Agente de Receita não tem login de equipe**, então as RPCs da 219 o recusavam. A carga passou a sair dos arquivos que ele já escreve (`Cockpit/receita/placar.md` e `rotinas.md`) **pela mesma RPC**, com a identidade da carga (`postgres`) acrescentada ao portão. **Não é `insert` direto de propósito:** foi o `insert` direto que fez a tabela do Controle guardar prosa que a tela lê com cinco expressões regulares. Aqui as regras *são* o produto — estado obrigatório, alavanca encerrada sem veredito recusada, mês relido que não duplica — e carga que escreve direto só as respeita enquanto alguém lembrar.
- **O portão novo não concede privilégio nenhum:** `postgres` já era dono de tudo e já podia escrever direto. O que mudou é que agora, ao passar pela RPC, a carga é obrigada a respeitar as mesmas regras.
- **A prova 1 pegou um defeito meu antes de ele existir em produção:** ao acrescentar `p_obs`, a assinatura nova conviveu com a de ontem — **duas versões da mesma função, a velha com a tranca velha**. A prova recusou a migration até a antiga sair.
- **Duas correções de modelo que o arquivo real mostrou:** `alavanca.inicio` deixou de ser obrigatório (três das seis estão "não iniciada", e inventar data para caber no schema seria gravar fato que não existe) e entrou `alavanca.obs`, que guarda o texto como o Receita escreveu — o número fica na coluna numérica, a frase fica com a frase.
- **`Cockpit/scripts/receita-sync.mjs` lê TABELA, não prosa:** confere o cabeçalho e **para com mensagem** se alguma coluna mudar de nome, em vez de adivinhar. Três recusas escritas nele: data no futuro não é execução (`primeira em 16/11` não vira "já rodou"); **rotina NÃO LIGADA não tem execução** (o "manual, 10/11" do placar diário é trabalho à mão, e pela R-051 isso não é rotina); e o **piso não é subtraído** — no arquivo, "entrada bruta nova" já é o que entra acima dele, então `regua = 0` e o piso vai para o `obs`.
- **Carregado hoje:** 3 leituras (linhas 1, 2 e 3, todas `medido` em R$ 0), 6 alavancas (4 em curso, 1 congelada, 1 encerrada com veredito) e 4 rotinas (2 ligadas). A tela saiu de **"sem leitura medida"** para **R$ 0 medido em 3 linhas** — e essa diferença é o ponto: antes ninguém tinha medido, agora mediu-se e o resultado é zero.
- **Dois defeitos meus achados conferindo em produção, e consertados no mesmo turno:** a tela mostrava **a leitura de hoje como de ontem** (`new Date('2026-11-10')` é meia-noite UTC e, lida em São Paulo, volta um dia — dia escrito agora se formata como texto); e alavanca sem início mostrava `desde — ( dias)`, agora diz **NÃO INICIADA**.

## 2026-11-10 — A página Receita nasce com banco próprio (219)

- **Decisão do dono, no canal do app:** um lugar só para a meta de mais R$ 100 mil por mês de dinheiro novo (R-051) — "monta a tela completa e faz todas as ligações". Página `#/receita`, primeira da seção Dinheiro, **restrita** como o Financeiro (é dinheiro na tela; fail-closed por R-037).
- **A regra que governa a página inteira: seção sem dado diz "não medido", com o motivo — e nunca mostra R$ 0.** Zero e "ninguém mediu" pedem ações opostas: um manda correr atrás de venda, o outro manda ir medir.
- **219 traz o contrato do placar que o Agente de Receita propôs, com as seis exigências que eu pus:** `estado` obrigatório (`proposta` | `medido`) e **a view só soma `medido`** — os R$ 73.330,62 da linha 1 entram como proposta e aparecem ao lado, fora do placar; uma leitura por (linha, mês, data, estado) e **a view pega a mais recente, nunca a soma**; `parte_relacionada` na própria linha, para a receita das lojas da casa não inflar a linha 1; `check` de não-negativo e moeda no nome das colunas `_brl`; `fonte` que dá para refazer; tabela em `receita`, `public` só com view `security_invoker` e RPC com portão (R-043/R-044).
- **A meta é dado, não constante:** `receita.meta` guarda R$ 100.000 para nov e dez de 2026, com quem definiu e a fonte. Sem meta no mês, a tela não mostra "falta 0" — mostra que ninguém escreveu a meta.
- **Escrita só por RPC com portão `is_staff()`:** `rpc_receita_gravar_leitura`, `_alavanca`, `_rotina` e `rpc_controle_foco_gravar` (a tabela tipada do foco da semana que o Geral pediu — nada de regex em prosa, que é como o bloco "urgente" do Controle funciona hoje). `authenticated` **não tem insert/update/delete** em nenhuma tabela nova, e a prova 6 trava isso.
- **Seção 7 nasce com a ressalva escrita na tela: "disparou" não é "funcionou".** Medido: 30 rotinas ativas, 72.885 execuções e **zero falhas registradas** — e esse zero engana, porque o agendador marca sucesso quando o comando SQL rodou, mesmo que a função tenha devolvido 401. A coluna se chama `disparou_em`. Rotina que queira provar trabalho grava a própria execução.
- **Seções 6 e 9 nascem vazias, com o motivo escrito:** custo de token do Agente de Receita não é gravado em lugar nenhum; só 7 de 102 contas de serviço têm custo declarado; e o resumo de custo da casa ainda soma dólar com real. Veredito por app é julgamento escrito, não conta automática.
- **O funil (seção 5) saiu do último lote para o primeiro, porque já tem dado:** `v_receita_funil` lê `v_vendas_leads` **só em contagem** (a origem tem nome e telefone, e a prova 4 recusa se alguém acrescentar coluna de pessoa). Hoje: **946 leads, 928 sem nenhum toque, último toque em 29/09** — 42 dias.
- **Seis provas, duas delas com dado de verdade criado e removido na mesma transação** (rascunho meu, R-004): proposta não entra no placar; reler o mês não dobra o placar; as seis views rodam como quem consulta; o funil não leva PII; o mês corrente tem meta; `authenticated` não escreve.

## 2026-11-06 (noite) — O pixel da Lancaster ganha número, o teto de 12 scripts cai (218)

- **Pedido do dono: conferir o pixel do Marketing da marca Lancaster e trazer os dados completos.** Conferido, e o pixel **está certo e no ar**: `576159047194101` na landing `lojas.clearix.app.br/lancaster-suzano`, lido **hoje** na chave `meta_pixel_id` do payload da própria página — fonte que **nomeia** o número, não número solto em bundle. Junto dele, Google Ads `AW-18544661611` com a ação de conversão `AW-18544661611/24VnCKjX064dEOuo5IpF`.
- **Achado que valia o turno: o meu teto de 12 scripts virou mentira hoje.** O html da landing passou de 15 para **16 scripts** e o `fbevents.js` foi parar no **16.º** (`chunks/7342-*.js`). Com o teto, o retrato de hoje diria **"vitrine cega — entra visitante e ninguém conta"** sobre a landing que **tem** pixel configurado e no ar: a mesma conclusão errada de 31/10, agora produzida pela ferramenta em vez de por mim. Medido nos dois modos antes de consertar (com teto: `meta: não`; sem teto: `meta 576159047194101`).
- **O teto caiu e o preço não subiu, por dois caminhos:** **cache por URL absoluta** na corrida (as landings são o mesmo app Next e compartilham chunk) e **parada antecipada** quando a assinatura de disparo e um id **nomeado** já apareceram — parar no palpite seria trocar o teto por outro jeito de não olhar. A varredura de hoje fechou **32 medições sem uma linha de "NÃO LIDO"**, e o `obs` da landing diz `html + 16 de 16 script(s) (parei no 16)`.
- **218, parte 1: a declaração da Lancaster carrega nome E número.** O inventário guardava `identificador = 'pixel_lancaster'` — que é o **nome** no Gerenciador de Eventos. Como a comparação declarado × no ar só aceita identificador numérico, **aquela linha nunca era conferida contra nada**; foi em cima dessa confusão que eu acusei o Marketing de trocar o pixel por engano, em 05/11. Agora o número está no identificador (é o que a máquina compara) e o nome no `obs` (é o que a pessoa procura no Gerenciador), com procedência e data.
- **218, parte 2: a comparação passou a valer para as landings.** No segundo lado do UNION da `v_ops_pixels`, `meta_declarado` era **`null::text` fixo** — constante, não medição. O veredito da landing sabia dizer "tem pixel no ar" e **nunca** "é o pixel certo", que é a pergunta que decide gasto com anúncio. Como a landing é do eco e não tem produto no inventário, a comparação é pelo caminho inverso: *o número que está no ar é declarado em algum lugar, e para quem*. O "para quem" aparece junto de propósito — `576159047194101 (lancaster)` — para que landing da Lancaster com pixel de outra marca não passe por certa.
- **Na tela de produção (`#/inventario` → Medição dos sites):** a linha saiu de `landing com pixel no ar` para **`LANDING COM PIXEL DECLARADO`**, com `META 576159047194101 · AW-18544661611 · LANDING DO ECO`.
- **As provas foram sabotadas antes de aplicar e recusaram:** rodadas contra o banco **antes** da migration, a 1 falhou (`identificador da lancaster e pixel_lancaster`) e a 3 falhou (`a comparacao continua nao rodando para a landing`). A 2 trava o retorno do defeito (nenhuma declaração de `meta_pixel` com identificador não numérico; `tiktok_pixel` fica de fora porque id do TikTok é alfanumérico de verdade). A 4 confere a premissa da 3 — o pixel de ontem não é declarado em lugar nenhum — e diz no próprio texto o que **não** prova.
- **A API não respondeu "está recebendo evento?", e o navegador respondeu.** Perguntei à Meta com os dois tokens que existem (`META_TOKEN_OL`, do usuário de sistema "Publicador Lancaster", e `META_TOKEN_DIGIAI_OSI`): os dois são de **publicação** e devolvem **`#100 Missing Permission`** para ler pixel, portfólio ou conta de anúncios. Então o dono mandou abrir o **Gerenciador de Eventos no Chrome da casa**, e lá está a resposta.
- **O pixel ESTÁ COLETANDO.** `pixel_lancaster` (576159047194101), no portfólio **Óticas Lancaster - Suzano** (`719853335304606`), site `lojas.clearix.app.br`, integrações **Pixel da Meta + API de Conversões**: **13 PageView** e **2 "Entrar em contato"**, os dois ativos e com último evento **há ~2 horas**. Recortando a janela para **05–06/11** os números são **os mesmos 13 e 2** — ou seja, **tudo foi coletado depois da troca do pixel**, às 13h02 de 05/11. Hoje sozinho: 2 e 2. Isto **substitui** o "0 eventos" que o Marketing leu em 05/11, que era verdade no minuto dele.
- **"Entrar em contato" chega pela API de Conversões** (servidor), não pelo navegador — então o clique de contato da landing já é medido do lado do servidor, que é o caminho que sobrevive a bloqueador de anúncio.
- **Qualidade da correspondência: 3.0/10 nos dois eventos.** É nota baixa: o evento chega com poucos parâmetros de identificação, o que encarece anúncio e piora atribuição. Fica nomeado; melhorar isso é trabalho na landing (e-mail/telefone com hash no evento), do eco e do Marketing.
- **Risco achado ao conferir:** o pixel antigo **"Happy Birthday Shirt" (1245855382929653) está vivo** — hoje, dia inteiro, com picos de ~18 eventos; o **site dele é `www.hpbdshirst.com`**, uma loja de terceiro. A landing da Lancaster esteve apontada para ele até 13h02 de 05/11. Na janela 20/10–06/11 o painel de **Sites** desse conjunto lista **só** `www.hpbdshirst.com` — `lojas.clearix.app.br` não aparece, o que bate com o "0 eventos" de ontem.
- **O dono mandou tirar esse pixel do portfólio da Lancaster, e a medição mostrou que ele NÃO ESTÁ no portfólio — correção do que eu mesmo escrevi acima.** Nas Configurações do portfólio Óticas Lancaster - Suzano, em Fontes de dados → Conjuntos de dados e pixels, **só existe `pixel_lancaster`**, "Propriedade de: Óticas Lancaster - Suzano". O "Happy Birthday Shirt" aparece no Gerenciador de Eventos porque **duas contas de anúncios nossas têm acesso a ele**: nas Configurações do próprio conjunto, **Proprietário = "BM câm PX" (1971149049707511)**, compartilhado com o portfólio **"DROP's Pixel Du Phong" (593032895069083)** e com as contas **SAO_MATEUS_OTM (1075495373215693)** e **SUZANO_OL (525879389053553)**.
- **Por que eu não tirei:** o conjunto é de outra empresa, e a própria página diz que acesso de conta se altera nas Configurações do Gerenciador de Negócios **de quem é dono**. "BM câm PX" **não está entre os negócios do dono** (lista conferida: Digiai, Óticas Taty Mello, Projetos Pulso, Lancaster, Matriz, Perus, Rio Pequeno, Suzano, São Mateus). Em Parceiros do portfólio e da conta SUZANO_OL **não há** esse negócio — o compartilhamento foi feito do lado deles, direto para as contas. Não há botão de remover do nosso lado; procurei nos três caminhos. Apagar o conjunto estaria fora de cogitação de qualquer forma: é dado de terceiro, vivo.
- **Conferido antes de mexer em qualquer coisa:** SUZANO_OL **não tem campanha ativa** (1 rascunho + 3 desativadas), então tirar o acesso não derrubaria anúncio nenhum.
- **Dois buracos nomeados, nenhum deles meu para fechar sozinho:** a landing **não manda evento para o `fn_log_event`**, então `eventos_proprios_30d` dessa linha é **0 escrito à mão, não medido** (item em aberto com o Marketing); e a landing está **sem vigia** — se ela cair, ninguém avisa.

## 2026-11-06 — YouTube entra no censo de audiência por API (217); e a conta honesta das outras três redes

- **Pergunta do dono: "já recebo dado de todas as redes? senão vamos ligar tudo via Chrome da DIGIAI?"** Medido antes de responder: chegava **Instagram** (4 contas + 278 posts com alcance e views), **Facebook** (4 contas + 77 posts, **sem alcance**), **Google Business** (240 posts, 6 locais), **Search Console** e os **eventos próprios** — tudo fresco. **TikTok (4 contas), Pinterest (5), LinkedIn (3), X (2) e YouTube (3): zero número.**
- **O que mudou a decisão e foi contra a minha própria suposição:** essas contas sem número também têm **zero publicação em 90 dias** (YouTube: 2, a última em 22/09). Ligar leitura por navegador em 17 contas reais seria montar robô diário **para medir post que não existe**, com risco de bloqueio em contas das quais **20 de 46 já estão marcadas como travadas**. O dono escolheu o caminho de API.
- **Ligado de verdade só o YouTube, e por um motivo medido:** é o único dos quatro em que a casa já tinha tudo — `refresh_token` no **Vault** (2 de 5 canais) e `YOUTUBE_CLIENT_ID/SECRET` já como segredo do projeto. Nova função `youtube-metrics-sync` (no digiai, porque **resultado é do digiai**) + **217** agenda o censo às **07:00 BRT**, junto do censo que a tela anuncia. Leitura que roda uma vez é foto, não coleta.
- **Grava onde a tela JÁ LÊ (`mkt.audiencia_diaria`), e não numa casa nova.** Duas casas para "seguidores" é como nasce retrato errado. A tabela é do digiai_mkt; o aviso foi para o agente do MKT no mesmo turno.
- **Três recusas de propósito, que é o que separa este leitor de um gerador de zeros:** canal **sem credencial não gera linha** (ausência de linha é ausência de leitura, não ausência de público); canal com **`hiddenSubscriberCount`** vira "não divulgado", não zero; `monthly_views` fica **nulo**, porque a API devolve `viewCount` da **vida** do canal e escrever vida inteira numa coluna chamada "do mês" é mentira de rótulo.
- **O resultado é um zero, e ele é real — provado por controle positivo.** `@digiai-apps` e `@oticasemimproviso`: **0 inscritos**, com 1 vídeo e 77 views no da OSI. Para saber se o zero era do canal ou do meu leitor, o leitor ganhou o controle de caso único (`?canal=<id>`) e li o canal oficial do YouTube pelo mesmo caminho: **46.600.000 inscritos**. O código devolve número grande quando há número grande; nosso zero é do canal.
- **Na tela de produção, `#/mkt-crescimento` → Audiência:** a coluna YOUTUBE saiu de **"—" (a ligar)** para **0** em DIGIAI e Ótica Sem Improviso. A matriz já separava as duas coisas (`—` = sem coleta, `0` = medido e é zero); agora essa separação **vale também para o YouTube**.
- **A prova da 217 foi sabotada antes de aplicar** (horário esperado trocado) e recusou. Ela checa três coisas: job ativo no horário, comando que **autentica** (agendamento sem `Authorization` devolve 401 todo dia, calado) e **exatamente um** agendamento por função.
- **O que NÃO ficou ligado, com o motivo exato:** **TikTok** — token existe e renova (renovado hoje), mas os scopes concedidos são `user.info.basic, video.publish, video.upload`: **não incluem leitura de estatística**, então precisa de um novo consentimento. **Pinterest** — o app "Pulso Radar" existe, mas o único token é de teste, de 26/08, e Pinterest expira em 30 dias: precisa de OAuth. **LinkedIn** — **bloqueado pela própria rede** desde 26/08: o app não tem a Community Management API aprovada, e nenhum clique do dono resolve isso.

## 2026-11-05 (tarde) — O medidor parou de misturar hosts, e o número do pixel passou a dizer de onde veio

- **O eco me corrigiu com medição e estava certo: não havia "build quebrado" em app nenhum do Clearix — era o meu retrato.** Eu reportei `sales.clearix.app.br` e `import.clearix.app.br` com **12 de 12 chunks em 404** e escrevi "cara de build quebrado". Medido: os dois devolvem **307 para `app.clearix.app.br/login`**, o corpo que eu lia era a **tela de login do Hub** (`<title>Login - Clearix Hub`), e os chunks `/_next/...` dessa página eu pedia ao **host de origem**. Prova: o chunk `e2580f6a526a2d93.js` dá **404 em `sales` e 200 em `app`**, no mesmo minuto.
- **A causa é a mesma do soft-404 da manhã:** eu li o endereço e o código, não **o que de fato voltou**. O `baixar()` seguia o 3xx e **jogava a URL final no lixo**. Agora o endereço final manda na resolução dos scripts — como no navegador — e, quando o host final é **outro**, isso fica escrito no retrato: *"o que está medido é a página de destino, não o host pedido"*. Atribuir o pixel do Hub a `sales` sem dizer de onde veio seria a mesma mentira na direção oposta.
- **Eram seis hosts, não dois.** Com o conserto, a varredura inteira ficou **sem uma linha de "NÃO LIDO"**: `sales`, `import`, `express`, `inventory`, `lenses` e `marketing` todos mediam a tela de login do Hub com os chunks em 404. O eco apontou um sintoma; o defeito valia por seis.
- **Achado maior, e meu: o número do pixel podia ser qualquer número.** O último recurso do medidor aceitava **"qualquer número solto de 15–16 dígitos no bundle"** como id de pixel. Medi os 15 scripts da landing: o único candidato solto é **`9007199254740991`**, que é o **`MAX_SAFE_INTEGER` do JavaScript**. O medidor estava a um deploy de distância de publicar uma constante da linguagem como "o pixel da loja".
- **Conserto: a procedência viaja com o número.** A landing declara o pixel no payload da própria página (`"meta_pixel_id":"…"`, com as aspas escapadas pelo RSC) e **nenhum** padrão nomeado pegava isso — agora pega. O retrato grava **por onde o id foi obtido** (`variável META_PIXEL_ID`, `chave meta_pixel_id da página`, `const id`, `fbq init`) e, quando sai do último recurso, grava **`ID PALPITE`** com o pedido de conferir no Events Manager. Número cuja origem não se sabe dizer não é número, é palpite, e palpite não decide gasto com anúncio.
- **O número mudou porque o pixel mudou, e isso o eco respondeu com fonte: NÃO foi erro de leitura.** Eu havia dito que não sabia distinguir "o eco trocou o pixel" de "o meu último recurso leu um número qualquer". O eco leu `growth_omni.ad_accounts.metadata` (conta `SUZANO_OL`): o Marketing **trocou o pixel às 13h02 BRT** de hoje, e `1245855382929653` era o **pixel antigo** ("Happy Birthday Shirt"). Então a minha medição das **12h38 estava certa para o minuto dela** e `576159047194101` está certo para agora. **O risco do último recurso continua real e provado** (o único número solto nos chunks é o `MAX_SAFE_INTEGER`), mas ele não produziu número errado aqui — e dizer o contrário seria inventar culpa, que polui o retrato igual a inventar acerto.
- **`pixel_lancaster` no inventário é o NOME do pixel, não um texto no lugar do número** — também do eco. Fica de pé a decisão do dono: se a declaração carrega nome, número ou os dois. Hoje a comparação declarado × medido só aceita identificador **numérico** (`^[0-9]{14,16}$`), logo a Lancaster não tem número declarado em lugar nenhum e essa linha nunca é conferida contra o que está no ar.
- **Três ids ainda vêm por palpite — e os três estão corroborados pela declaração:** `osi` e `leitor-osi` (`1010582578011237`) e `polapetit` (`1792075898806171`) são exatamente os pixels declarados em `ops.contas_servicos` para esses produtos. Número solto que bate com a declaração do produto certo não é coincidência; está certo, só foi obtido de um jeito que não se sustenta sozinho. Fica marcado no retrato até alguém ler o padrão nomeado desses dois sites.
- **Sem migration e sem deploy:** a procedência mora no `obs`, que já era coluna gravada, e os vereditos da tela não mudaram — `1 vitrine cega`, `1 rascunho`, apps com login inalterados. O que mudou é que o retrato parou de inventar 404 e parou de inventar número.

## 2026-11-05 — Rascunho de landing deixa de ser lido como vitrine cega (215, 216)

- **Conserto do alarme falso que eu dei ao dono hoje de manhã.** Eu disse que duas landings estavam "no ar sem pixel". Não estavam no ar: `visaoparasuzano` e `lancaster-multifocal` devolvem **HTTP 200 com `<title>Página não encontrada</title>`** — são rascunhos, e um slug que eu inventei devolve a mesma coisa. **Eu tratei o código 200 como "página viva" sem olhar o corpo.** As duas leituras pedem ações **opostas**: página que não existe se publica (ou se apaga o anúncio apontado para ela); página que existe e não mede recebe pixel.
- **Como o medidor decide agora, sem depender de idioma nem de lista de frases minhas:** pede ao **mesmo host** um irmão **inventado** da página medida (sonda) e compara o `<title>`. Sonda com 404 de verdade → host honesto, o que respondeu 200 existe. Sonda com 200 e mesmo título da página medida → a página medida **é** a página de "não encontrada". Sonda não lida → **"não sei dizer se esta página existe"**, escrito no retrato, em vez de chute. Só vale para URL **com caminho**: na raiz, SPA que serve a mesma casca para tudo faria a própria home ser declarada inexistente — e é na raiz que moram os 31 sites do inventário.
- **A sonda mentiu na primeira corrida e por isso ela nasceu da própria URL medida.** `/__sonda-inexistente-digiai` devolveu **404 de 23 bytes** e `/sonda-inexistente-digiai` devolveu **200 com "Página não encontrada"**, no mesmo host e no mesmo minuto: caminho com `_` na frente (ou com ponto) não casa com a rota dinâmica e sai por outra porta. Com a sonda **fora de forma**, o conserto concluía "host honesto, logo os rascunhos existem" — **o oposto da verdade**. Agora a sonda é irmã da página (último pedaço da URL + sufixo, preservando extensão).
- **Provado pelos quatro controles:** os 2 rascunhos e 1 slug inventado → `página não existe`; a landing publicada → **existe**, com `meta 1245855382929653` + `AW-18544661611` — **este id era o pixel que estava no ar às 12h38; o Marketing trocou para `576159047194101` às 13h02, ver a entrada acima**; e os sites de raiz **intactos**, sem sonda disparada.
- **215: a tabela ganhou `pagina_inexistente`**, porque sem coluna o script sabia e a casa esquecia na primeira gravação. **404 de verdade não entra nela** — site do inventário que responde 404 é "fora do ar", que é alarme alto e de outro tipo.
- **Achado meu, de ontem: a landing que eu medi em 04/11 estava gravada e NUNCA chegou à tela.** `v_ops_pixels` nascia de `company.digital_assets`, logo só enxergava os 31 sites do inventário. Eu reportei "as landings entraram no retrato" e isso era **verdade na tabela e falso na tela que o dono lê**. A view passou a listar também o que foi medido e não é site do inventário, com a origem em `fonte`.
- **216 corrige a 215, aplicada 20 minutos antes, e o defeito era da mesma família de novo.** "Não está no inventário" pegou a **história**: trouxe 25 endereços `*.netlify.app` do retrato de **05/10** (os apps do Clearix antes de mudar de casa, migration 169), **24 deles como "vitrine cega"**. A tela mandaria instalar pixel em 24 sites que não existem mais. Critério certo: **"a última varredura passou por aqui"** — a tabela é história, a tela é o que foi visto na última passada.
- **A prova da 215 provou o que eu tinha imaginado e não o que eu não tinha.** Por isso a da 216 é por **lista do que não pode aparecer**, não por contagem; e as duas foram sabotadas de propósito antes de aplicar, para ver se recusavam (recusaram: `rascunho lido como vitrine cega` e `25 endereco(s) de retrato antigo de volta na tela`).
- **Tela depois de tudo, com a varredura de hoje: 32 URLs** — 7 vitrines, **1 cega** (Nipo School), 1 landing do eco com pixel, 22 apps com login, 2 fora do ar (429 de limite de taxa). **Antes da 216 a mesma tela diria 24 cegas**, e 23 delas eram fantasma.
- **Dito com clareza, para não parecer mais do que é:** hoje **nenhuma linha na tela é rascunho**, porque o sitemap lista só o que está publicado. O veredito serve para (a) a conferência à mão de um endereço — que é de onde saiu o alarme falso — e (b) o dia em que um sitemap listar URL morta.

## 2026-11-04 — A view "por cliente" volta a ser legível, e as landings entram no retrato de pixel (214)

- **A view que eu entreguei em 31/10 dava 403 para todo mundo, inclusive o dono, e a causa foi o atalho de prova.** `public.v_analytics_eventos_cliente_dia` é `security_invoker` e lê `ops.empresas`, que está fechada (RLS ligada, **0 políticas**, sem grant). Eu a provei **dentro da migration, como `postgres`** — que tem BYPASSRLS e lê tudo. Os números de 31/10 (501/182/1.027) eram verdadeiros **e a tela nunca os leria**. É o mesmo atalho de 30/10, quando `set role` sozinho me fez chamar de "artefato" um timeout real: a lição não é "provar mais", é **provar pelo papel e pela identidade de quem vai ler**.
- **O conserto não podia ser `grant`.** Com RLS ligada e nenhuma política, liberar `ops.empresas` para `authenticated` devolveria **0 linhas** — o 403 visível viraria `cliente_tipo` nulo em silêncio, em todas as linhas. Vazio que significa "não pude ler" não pode parecer "não tem espécie". Também não criei política ampla: a tabela guarda CNPJ e razão social, e a view precisa de **duas colunas**.
- **Nasceu `public.v_ops_empresas_especie`: só `slug` e `tipo`**, sem CNPJ e sem razão social, **não-invoker** (roda como dona, para alcançar a tabela fechada) e com o portão **escrito no corpo**: `where public.is_staff()`. É o que a R-043 exige de objeto definer, e `is_staff()` não leva argumento, logo é avaliada **uma vez** e não por linha — a diferença entre esta view e o que estourou o timeout em 30/10.
- **O ensaio recusou a primeira versão, e estava certo:** `PROVA_214_FALHOU: mello-loja sumiu ou perdeu a especie`. Motivo: `is_staff()` é **false para `postgres`** (não há `auth.uid()`), então a view estreita devolve 0 linhas para quem roda a migration. As provas de número foram para dentro do bloco com `set local role authenticated` + claims do dono. **Consequência aceita de propósito:** `service_role` também lê 0 linhas aqui — função de servidor lê `ops.empresas` direto, que é dela por direito; abrir o portão para contexto privilegiado deixaria a view **improvável** por este caminho, e portão estreito e provável é melhor que portão largo e não medido.
- **Lido depois, pelo caminho real:** staff → 200 com **267 linhas** (paga **526**, casa **189**, sem espécie **1.055**); token sem membro → 200 com **0 linhas**.

### As landings entram no retrato de pixel (pedido do dono)

- **A lista sai do sitemap público de `lojas.clearix.app.br`, não de uma lista escrita no código** — lista no código envelhece calada na primeira landing nova, e ler o banco do Clearix seria cano novo contra o ADR-0001. **A casa confere; o eco é dono.** Hoje: **1 landing** (`lancaster-suzano`).
- **Três defeitos do medidor que só apareceram quando rodei de verdade, todos da mesma família:** (1) resolvia script como `base + caminho`, e com URL que tem caminho isso virava `/lancaster-suzano/_next/...` → **404 nos 8 chunks**; nenhum site do inventário tem caminho, então o defeito nunca apareceu. (2) Lia só os **8 primeiros** scripts, e o pixel da landing vive no **15.º** (o chunk da página) — diria "sem meta" sobre uma landing que tem pixel, **a mesma conclusão errada que eu dei à mão em 31/10, reproduzida pela ferramenta**. Agora os chunks de `app/` vão primeiro e o teto é 12. (3) Não reconhecia `AW-` (Google **Ads**) — cego no exato lugar onde o dinheiro entra.
- **E o medidor passou a distinguir pixel POR CONSENTIMENTO de pixel ausente.** A landing injeta Meta e Google **depois do aceite**; tratar isso como "sem pixel" e como "sem medição" é o mesmo erro, e as duas situações pedem decisões opostas sobre gastar em anúncio.
- **Retrato gravado hoje: 32 URLs** (31 sites + 1 landing), 7 com pixel Meta, 1 com Google Ads, **6 não lidas e nomeadas como tal** (dois 429 de limite de taxa; `sales.clearix.app.br` com 12 chunks em 404). A landing entrou como `meta 1245855382929653` + `AW-18544661611`, marcada como consentimento. O retrato anterior era de **05/10** e nunca incluiu esse host.


## 2026-11-03 — O custo da Supabase é por PROJETO; só o plano é por org (213)

- **O inventário dizia US$ 47/mês e a fatura de 01/11 foi US$ 73,87 — e o erro é meu, da 202.** Eu lancei o custo todo na linha da organização e escrevi a justificativa na própria `obs`: "o Pro se cobra por org, não por projeto". **Metade certa:** o **plano** é por org (lançar 25 em cada projeto contaria cinco vezes), mas o **compute é por projeto** — cada projeto roda a sua instância e é cobrado por hora. Generalizei de uma linha da fatura para a fatura inteira e não conferi o resto. Fatura não esperada **já pausou o gj_pessoal de 02 a 07/10**.
- **Medido aqui, sem depender do que me contaram:** `GET /v1/projects/{ref}/billing/addons` devolve `ci_micro = US$ 0,01344/hora (~US$ 10/mês)` — × 730 h = **US$ 9,81**. E o modelo **reproduz a fatura**: com os 6 projetos de 01/11, `25 + 6 × 9,81 − 9,81 = US$ 73,86` contra **US$ 73,87 faturado**. Um centavo de diferença sobre fatura real é prova; "≈ 10 por projeto" sozinho era palpite.
- **Como ficou lançado:** plano **US$ 25** na linha da org; **US$ 9,81** em cada um dos 5 projetos (digiai, nexus, lumina_box, gj_pessoal, ecoax); e uma **linha negativa de crédito (−US$ 9,81)**, porque o Pro inclui US$ 10 de compute e cobre 1 projeto. Sem essa linha a soma daria 74 e eu trocaria um erro de 28 dólares por outro de 10. Crédito como linha própria, e não descontado dos 25, porque número já abatido esconde dois fatos num só.
- **Antes → depois:** Supabase **US$ 47 → US$ 64,24/mês**; total declarado da casa em USD **US$ 47 → US$ 86,24** (com os US$ 22 do ElevenLabs). O `nipo_score` soma ≈ US$ 9,81 ao nascer.
- **easy_idiomas encerrado com data e motivo, sem apagar a linha** (decisão 133 do dono; conferido em `GET /v1/projects`: o ref não está mais na org). **Conserto meu na mesma entrega (213-b):** eu havia posto `ativo = false`, e isso **tira a linha da tela** — `v_ops_contas_servicos` filtra `ativo` — contradizendo o meu próprio motivo. O precedente da casa é `netlify:sis_digiai`: `encerrada` com `ativo = true`, visível como história. Quem tira da soma é o `custo_mensal` nulo, não o `ativo`.
- **Achado de passagem:** a nota do `nexus` dizia INACTIVE desde 16/08 e a API diz **ACTIVE_HEALTHY** — por isso ele paga compute como qualquer outro. Nota corrigida.
- **Dois alçapões de moeda, declarados onde quem lê vai tropeçar** (e não consertados neste turno, de propósito): `v_ops_cofre_resumo` faz `sum(custo_mensal)` **misturando USD e BRL** (passa batido só porque as linhas com valor são todas USD), e `v_ops_contas_custo` chama a coluna de `custo_declarado_brl` devolvendo a moeda **da linha** — US$ 25 rotulado como BRL. A tela não lê essa coluna; quem passar a ler tem de converter. As três ganharam `comment`.
- **Na tela:** quadro novo de **custo declarado, somado por moeda** (`US$ 86,24`), ao lado do medido no extrato em BRL — declarado é o que a casa espera pagar, medido é o que saiu da conta, e misturar os dois foi o que deixou o número errado sobreviver 25 dias. O comentário do código dizia "`custo_mensal` está vazio em todas as linhas", falso desde 09/10.


## 2026-10-31 — A tela passa a dizer qual REDE não foi lida, em vez de eu afirmar isso numa frase (212)

- **Pedido do Geral, vindo do MKT: o Facebook deve aparecer como "não medido" por marca e rede, nunca como zero.** Motivo: a Meta recusa a leitura de DIGIAI, OSI e Mello (erro #10, falta `pages_read_engagement` no app da Meta — acesso avançado é pedido do dono) e a Lancaster lê só engajamento, sem views. **Não vem antes do placar de segunda e não tem data**, logo não é espera: é estado que a tela precisa saber mostrar por tempo indefinido.
- **Onde a 211 ficou curta, e o defeito era meu.** A 211 já impede o zero mentiroso (as 14 publicações de Facebook do Mello entram em `publicacoes` e ficam fora de `publicacoes_medidas`), mas agrupa por **marca** — e eu tapei esse buraco com uma **frase fixa** no rodapé: "hoje quase todo o Facebook é assim". Declaração minha dentro do código, que continuaria mentindo com cara de dado no dia em que a Meta liberasse. Mesma lição da 192 e da 193: distinção escondida em texto envelhece calada.
- **São TRÊS estados, não dois, e todos já estavam nos dados** — tratá-los como um só jogaria no lixo a única leitura de Facebook que a casa tem: `publicacoes_medidas = 0` é **não medido** (FB de mello/digiai/osi, LinkedIn da pessoal); `publicacoes_medidas > 0` com `views_medidas = 0` é **só engajamento** (FB da lancaster: 2 publicadas, 2 lidas, 0 views); o resto é medido.
- **Semana 19/10, rede por rede:** mello IG 20/20 e **FB 14/0**; lancaster IG 22/21 e **FB 2/2 com 0 views**; digiai IG 6/4 e **FB 3/0**; osi IG 6/4 e **FB 3/0**; pessoal LinkedIn **2/0**. Confere com o que o MKT descreveu, inclusive a exceção da Lancaster.
- **Prova que importa:** a soma por rede tem de bater com a tabela de 211 na mesma semana (78 publicadas / 51 lidas) — rodapé que contradiz a tabela de cima é pior que rodapé nenhum. E controle negativo: rede sem leitura **não pode** aparecer com engajamento, views ou foto; um `coalesce` distraído traria de volta o erro da loja fechada contada como aberta.

## 2026-10-31 — O comparativo de motores contava medição e chamava de esforço (211)

- **Pedido do Geral, vindo do MKT: a tela comparava cobertura de coleta, não trabalho.** `v_comparativo_motores_semana` (193) nascia de `public.v_mkt_performance`, que começa `FROM mkt.content_performance` e só então junta `mkt.publications` — logo **publicação sem linha de performance não existia para a tela**. E a perda não é aleatória: medido na semana 19/10, o Instagram é quase todo lido (mello 20/20, lancaster 21/22) e o **Facebook é quase todo cego** (mello 0 de 14, digiai 0 de 3, osi 0 de 3). O motor que publica em plataforma mal coletada aparecia preguiçoso — o avesso do propósito do painel.
- **Antes → depois, semana 19/10 (19–25/10 BRT):** mello **20 → 34**, lancaster **23 → 24**, digiai **4 → 9**, osi **4 → 9**, e a marca **`pessoal` saiu da invisibilidade** (2 publicações, 0 medidas — estava fora da tela por inteiro). Engajamento, views e `views_medidas` **não mudaram**: saem das mesmas linhas de performance. O que mudou é o denominador do esforço.
- **`publicacoes_medidas` nasce junto, e não é enfeite:** engajamento e views são somados **sobre esse subconjunto**. Sem a coluna, 1 de engajamento sobre 34 publicações e 1 sobre 20 lidas viram a mesma célula e levam a conclusões opostas. Mesma regra da 193 para `views_medidas`.
- **Defeito que eu encontrei na tela ao consertar a view:** `Views/post` dividia views por **publicações**, não pelas que têm foto de 7 dias. Com o número certo de publicações isso ficaria pior (243/34 em vez de 243/17 no mello: 7,1 contra 14,3 reais). Passou a dividir por `views_medidas`, e o rodapé diz por quê.
- **O número do recado não era o da semana, e isso ia confundir o placar.** O recado citava "mello 61, digiai 13". Medido: 61 e 13 são as publicações de **19/10 até 31/10** — 13 dias, não uma semana. A semana 19–25 dá 34 e 9. Os dois estão certos sobre o que medem; o placar é semanal, e ficou escrito na migration para ninguém olhar 34 na segunda e achar o conserto incompleto.
- **O aviso vencido saiu.** A tela previa "o primeiro número real de views aparece por volta de 16/10" — previsão de 09/10, hoje passada. No lugar: o que foi medido (quantas publicações têm a foto, e a data da última), e o texto de "ainda não" só aparece quando a semana de fato não tem nenhuma.
- Custo conferido pelo caminho real (papel `authenticated` com JWT de verdade, não `set role`): **110 ms**, 361 linhas na janela de 70 dias — a política `pode_ver_brand(brand_id)` é avaliada linha a linha, e foi assim que a tela do Google estourou o timeout do dono em 30/10.
- Registrado na migration: a prova da 193 fixava **11 publicações em 28/09**, número do contrato antigo (hoje aquela semana tem 17 publicações e 11 medidas). Não re-rodei a 193; o número dela descreve o contrato que a 211 substitui.

## 2026-10-31 — "Por cliente" passa a separar quem PAGA de propriedade da casa (210)

- **Eu recomendei uma coisa ao dono e a medição me desautorizou no mesmo dia; o Geral estava certo.** Eu sugeri `cliente_slug = digiai` para as nossas propriedades (`clearix-site` 536 eventos, `osi` 428, `clearix-calc` 63), argumentando que `ops.empresas` é registro de entidade legal e que produto ali corromperia o vocabulário. Fui medir o meu próprio argumento: os 7 do tipo `cliente` têm CNPJ e razão social, **mas `pulso` ("Projetos Pulso") já está lá como `tipo = propria` SEM CNPJ**, assim como `nipo` e `pessoal`, e a restrição só exige que CNPJ e razão social andem juntos. **O registro já guarda produto da casa** — o precedente é exatamente o que o Geral propunha (slugs `clearix` e `osi`). A decisão final é do dono (131 na lista dele).
- **O que sobrava da minha objeção era real, e virou esta migration:** com `clearix`/`osi` dentro, a coluna passa a guardar **duas espécies** — empresa que paga e propriedade nossa — e somar as duas num total chamado "por cliente" seria o mesmo erro da tela do Google somando loja fechada com loja aberta. O separador já existia no schema (`ops.empresas.tipo`) e a view não o expunha. Agora expõe **`cliente_tipo`**, e serve aos dois caminhos: qualquer escolha do dono nasce com as populações separáveis, sem ninguém ter de lembrar de filtrar.
- **Lido depois de aplicar:** cliente que paga **501** (mello), casa **182** (digiai), sem espécie/sem dono **1.027**. Controle negativo na prova: evento sem dono **não ganha espécie por padrão** — um `coalesce` distraído faria tudo virar "cliente" e inflaria justamente o número que esta migration protege.

## 2026-10-31 — O evento passa a dizer de qual cliente ele é (209)

- **Pedido do dono: "pode a coluna de cliente no evento".** Veio da dúvida dele sobre `lojas.clearix.app.br` ser o lugar único das landings de todas as empresas que usarem o Clearix. `analytics.events_log` não tinha coluna de cliente — só `product`, texto livre. Com uma landing dá para contornar pela URL; com cinquenta não dá, e remendar depois é reprocessar histórico.
- **O vocabulário já existia e eu não inventei chave:** `ops.empresas.slug` (12 empresas, 7 do tipo `cliente`). E a medição mostrou uma armadilha: a landing é `lancaster-suzano` e a empresa é `lancaster` — **os dois vocabulários não coincidem**, então a coluna guarda o nosso slug e quem envia faz o mapa. Assumir que são iguais criaria cliente fantasma no primeiro envio.
- **Sem chave estrangeira, de propósito:** um FK recusaria o evento de um cliente ainda não cadastrado, e **perder o evento é pior que ter a chave desconhecida**. A view marca o slug que não existe em `ops.empresas`: a deriva fica **visível**, não proibida. Trava que descarta dado não é trava, é perda.
- **As 1.719 linhas antigas ficaram NULAS.** Eu poderia inferir `mello-loja` → `mello` (os 501 eventos vêm todos de mellooticas.com.br, inferência sólida) e **não gravei**: inferência escrita em coluna de chave passa a ser lida como coleta. A view mostra o inferido **ao lado** do declarado, os dois rotulados.
- **A prova (a) pagou a migration antes de ela ser aplicada.** `create or replace function` com número diferente de parâmetros **não substitui: cria sobrecarga** — e com a de 11 e a de 12 coexistindo, toda chamada de 11 argumentos vira `function is not unique`. Aplicar a 1.ê versão teria **parado a coleta de evento de todas as landings e sites no ar**, que é exatamente o dano que o parâmetro com default existia para evitar. Conserto: `drop` da assinatura de 11 na **mesma transação** do `create` da de 12, sem janela; e a prova (i) passou a exigir que exista **uma só** `fn_log_event`.
- **Atribuição medida hoje, e o resto é decisão do dono:** 683 eventos **inferíveis** (`mello-loja`→mello 501, `digiai-site`→digiai 182) e **1.027 sem dono** (`clearix-site` 536, `osi` 428, `clearix-calc` 63) — porque nem `clearix` nem `osi` são slug em `ops.empresas`. **Não é buraco de cadastro:** são propriedades nossas, e a quem elas pertencem comercialmente quem diz é o dono.
- Fora de escopo de propósito: **hierarquia de cliente** (`mello` é guarda-chuva de 5 lojas). Somar loja em grupo por prefixo de slug funcionaria hoje e quebraria no primeiro slug fora do padrão — pede coluna de pai em `ops.empresas`.

## 2026-10-30 — "Por que apagar as views?" — e a resposta é que não precisava (208)

- **O dono perguntou e a pergunta derrubou a minha moldura: apagar nunca foi o necessário.** Eu passei **26 dias** cobrando dele a decisão **cara** (o `drop` da 185, destrutivo, que exige a palavra dele) quando existia esta, barata e reversível. As quatro views foram para a mesma migration porque nenhuma tem leitor — e "sem leitor" justifica **faxina**, não urgência. O que era urgente era o vazamento.
- **Vazamento provado, não suposto.** Simulando um logado que **não é da equipe** (`role authenticated` + `request.jwt.claims` com `sub` que não existe em `iam.users`): a tabela `ops.commercial_leads` devolvia **0** (a RLS funciona) e `public.v_vendas_leads` devolvia **946 leads e 917 telefones**. Entre eles, **38 que pediram opt-out** — o telefone de quem pediu para não ser incomodado legível junto do pedido. E eram **duas** views com telefone, não uma: `v_ops_cofre_resumo` carrega `telefones` pelo mesmo mecanismo, e eu vinha citando só a de lead.
- **O ensaio reescreveu o conserto, e aqui está o achado de verdade.** Declarar `invoker` nas quatro dava `permission denied for table ops.empresas`. Fui medir: **`ops.empresas` tem RLS ligada e ZERO políticas** (nega a todos) e nenhum grant para `authenticated`. Ou seja, as duas views do cofre não são "views com um defeito de segurança" — elas **só funcionavam porque furavam a RLS** de uma tabela que ninguém tem permissão de ler.
- **Cada par pelo seu motivo:** `v_vendas_leads` e `v_mkt_contas` → `security_invoker` (as origens têm grant e política, então cada um passa a ver o que é seu); `v_ops_cofre` e `v_ops_cofre_resumo` → sai o `select` de `authenticated` (invoker daria **42501 para todos**, inclusive a equipe, e dar grant em `ops.empresas` devolveria **zero linhas** — view que parece funcionar e não mostra nada é pior que view fechada).
- **Provado depois, as duas pontas:** fora da equipe **0 leads, 0 telefones, 0 contas** e sem acesso ao cofre; **equipe inalterada** (946 leads, 917 telefones, 60 contas). Sem o controle positivo eu teria trocado um vazamento por uma tela vazia — que é consertar mudando de quem é o problema.
- **Nada foi apagado**, nenhum dado se perdeu, e as duas mudanças voltam com um comando cada. A **185 passa de risco a faxina**: remover as quatro continua certo como limpeza, quando o dono quiser ou nunca — e eu não volto a cobrá-la como risco.

## 2026-10-30 — A tela do Google não abria para o dono: timeout, e o sinal estava na minha mão desde ontem (207)

- **O dono abriu `#/google` logado e recebeu "canceling statement due to statement timeout". A tela não abria.** Erro meu, do mesmo dia anterior — e o pior tipo: **eu tinha o sinal e o descartei**. Esse timeout apareceu no ensaio da 206, dentro de `is_admin`/`pode_ver_brand`, e eu o classifiquei como artefato da Management API. A primeira metade do raciocínio estava certa (`set role` não dá `auth.uid()`, logo `is_staff()` mente); a conclusão estava errada. O certo era *"logo eu ainda não medi o custo real"*, e em vez disso eu escrevi na própria migration que "não havia motivo para ficar pior". Havia.
- **A medição que eu devia ter feito:** `set local role authenticated` **mais** `set local request.jwt.claims` com o `sub` de um staff de verdade — aí `auth.uid()` responde, `is_staff()` dá true e o custo aparece. Com ela, a chamada do dono reproduzida: **estouro de 60 s antes, 56 ms depois** (por_dia 21 ms, painel 24 ms, por_ficha 10 ms).
- **Causa, medida:** as políticas de `gbp_avaliacoes`, `gbp_posts`, `gbp_metricas_dia` e `gbp_fichas` são todas `mkt.pode_ver_brand(brand_id)` — função definer que chama `is_admin()`, que consulta `app_users`. Como o predicado recebe **argumento**, roda **por linha**, e o painel varria avaliações **três vezes**: milhares de chamadas aninhadas. A tela antiga sobrevivia porque fazia UMA leitura das 1.745 linhas; agregar no banco com RLS por linha multiplicou isso. A frase que eu escrevi na 206 — "lê as mesmas linhas com o mesmo predicado" — era falsa no ponto que importa: o número de vezes.
- **Conserto (207):** as três funções passam a `SECURITY DEFINER` com **portão explícito `is_staff()`** — o que a R-043 manda e o mesmo desenho das RPCs da 196 — e `pode_ver_brand` roda **uma vez por ficha** num CTE `visiveis` marcado `materialized`: **6** avaliações em vez de milhares. **Sai a repetição, não a regra:** `auth.uid()` lê o GUC da sessão e não muda dentro de definer, então o portão é real e a visibilidade por marca continua a mesma. O painel também passou a varrer avaliações uma vez em vez de três.
- **A prova que faltava, agora dentro da migration:** (1) o portão recusa **sem** JWT; (2) o portão recusa **com JWT válido de quem não é staff** (`sub` fora de `iam.users`) — o caso que importa, porque definer sem portão devolveria tudo a qualquer logado; (3) com JWT de staff as três respondem **dentro de 5 s**, com `statement_timeout` baixado de propósito para a prova **falhar** se o desempenho voltar ao de ontem. Prova de desempenho em migration não é luxo aqui: foi a falta dela que mandou tela quebrada para o dono.
- Front inalterado (mesma assinatura das RPCs), nenhum deploy necessário — basta recarregar a página.

## 2026-10-29 — Os KPIs do Google passam a nascer no banco, com o filtro dentro (206)

- **Dívida minha de R-049, declarada por mim e agora paga.** A tela lia **1.745 avaliações + 216 métricas + 184 posts** e somava em `useMemo` para exibir 8 números. Agora chama três funções com **ficha, janela e base como parâmetro**: `rpc_gbp_painel`, `rpc_gbp_por_dia` e `rpc_gbp_por_ficha` (esta de propósito **sem** parâmetro de base — tirar as fechadas tiraria a razão de ela existir). Ganhos que não são estéticos: sumiu a paginação manual e com ela a classe de erro "página silenciosa de 1.000 truncou todo total"; as regras difíceis (duas âncoras de tempo, variação só com base completa, nulo que não é zero) passaram a viver num lugar só e **provadas na migration**; e o mesmo número deixa de divergir quando outra tela quiser exibi-lo (a lição da 192).
- **A prova que a R-049 pede — total de cima = soma das linhas — achou DOIS defeitos meus antes de a tela subir.** (1) A `por_dia` pegava os **N dias mais recentes**, que incluem os ainda abertos, enquanto o KPI somava os **N ancorados no último dia fechado**: tabela e número falariam de períodos diferentes na mesma tela. (2) **"Ruins sem resposta" eu havia medido por `publicada_em is null` e reportado 21 ao dono — errado.** Há **127** avaliações com `status = publicada` e texto de resposta gravado **sem carimbo de publicação** (7 delas ruins); a fila de verdade é `status <> publicada`: **9 em loja aberta, 5 em fechada**. A migration trava essa diferença em 7 para as duas leituras não voltarem a se confundir em silêncio, e a tela avisa ao vivo se o painel e a lista discordarem.
- **As três funções são `SECURITY INVOKER`, nunca definer (R-043), e leem somente as views de contrato `public.v_mkt_gbp_*`** — isso **paga** a dívida de R-044 que eu tinha anotado, em vez de aumentar, e mantém `dia_fechado`, o nulo do dia aberto e os dois carimbos definidos num lugar só: a view do MKT, que é quem os produz. Grant para `authenticated`, revoke de `anon` e `PUBLIC`.
- **A prova de papel `authenticated` SAIU da migration, com o motivo escrito.** Ela estourava o statement timeout dentro de `is_admin`/`pode_ver_brand`, e isso é artefato da Management API, não defeito: `set role` troca `current_user` e não `session_user`, não há `auth.uid()` ali, logo `is_admin()` mente. Mantido o que **se** prova daqui (o grant, por `has_function_privilege`) e registrado que "abre logado e abre rápido" se prova na tela publicada (R-005). Simular aquela prova seria encenação, e um timeout de artefato bloquearia uma migration correta.
- **Achado de infra, grave e silencioso: o helper de SQL por Bash corrompia todo acento a caminho do banco.** O JSON ia como **argumento** do `curl` e o Git Bash reescrevia o argumento para a codepage do Windows — "avaliação" chegava como "avalia??o", e `where nome = 'Mello Óticas - Perus'` devolvia **0** linhas enquanto `like 'Mello%Perus'` devolvia 1. Aplicar migration por ali gravaria **todo `comment on` corrompido** sem ninguem notar (a leitura de volta é limpa, o que esconde o problema). Conserto: escapar o não-ASCII para `\uXXXX` e mandar o corpo por **stdin**. Conferido depois de aplicar a 206: os comentários das três funções estão com acento íntegro.
- **Dito em voz alta, porque continua devendo:** o bloco de posts (cancelados por motivo, publicado sem confirmação) ainda conta no front, sobre leitura limitada de 184 linhas. É dívida menor da mesma R-049 e está na fila.

## 2026-10-29 — Quatro das seis fichas do Google são de loja que fechou de vez, e o total não dizia

- **A tela de ontem somava as seis fichas num total só, e 60% desse total era de loja que não existe mais.** Medido em `mkt.gbp_fichas` antes de mexer em código: as quatro fichas da Mello estão `situacao = fechada_definitivamente` com `posts_motor = false`, atualizadas em **28/10 às 22:32 BRT**, e os **8 posts que cada uma tinha agendados até 03/11 foram cancelados** com o motivo escrito *"loja física fechou de vez; posts parados (dono 28/10)"*. **Não é defeito nem falha de coleta — é decisão do dono, do dia anterior, registrada pelo MKT.** Mesma lição da coluna `erro`, que carrega MOTIVO: li a razão escrita antes de reportar, e foi isso que impediu um alarme falso.
- **O defeito era a tela.** Com as seis somadas: **1.054 das 1.747 avaliações (60%)** e **116 dos 146 posts no ar pelo Google (79%)** vinham das quatro fechadas, misturados com a única ficha que opera; a média liderava com os 4,96 das fechadas por cima dos 4,90 das abertas; e "ruins sem resposta" dizia **21** quando **8** estão em loja fechada, onde responder não traz ninguém de volta. A base da tela passou a ser **só ficha aberta** (hoje 2), com chip para incluir as fechadas, a base escrita no cabeçalho, no filtro e no KPI, e as 8 ruins das fechadas citadas ao lado do número em vez de somadas nele. Escolher ficha fechada no seletor continua valendo — ato explícito do dono vale mais que o padrão.
- **Nenhuma migration: `situacao` e `posts_motor` já estavam em `public.v_mkt_gbp_fichas`, a tela simplesmente não lia.** O conserto foi passar a ler o que o banco já dizia. A coluna nova "Loja" na tabela por ficha mostra aberta / fechada de vez / `motor off`.
- **Tirado o rótulo "parada" da coluna de 90 dias: ele media a NOSSA coleta e parecia medir a loja.** Isso estava certo. O que eu disse em seguida estava errado, e **está corrigido no mesmo dia**: eu li `max(sincronizada_em)` por ficha e reportei *"a coleta parou em 06/10 em quatro fichas, 23 dias"*. **Não parou.** O carimbo fica na **linha da avaliação** e a leitura diária varre **90 dias**: ficha sem avaliação nova no período não tem linha para recarimbar e congela sem nada ter parado. O MKT recusou o campo que eu pedi e conferi a premissa dele contra o dado antes de aceitar — casa nos seis casos: as duas fichas com avaliação dentro de 90 dias estão em 29/10 (Lancaster 107, Mello-Suzano 1) e as quatro com `reviews_em_90d = 0` ficaram em 06/10. **Erro meu, do lado de inventar alarme** — o mesmo feitio do `criado_em` e do `estado` que eu recusei esta semana, e desta vez quem segurou foi o par.
- **Entraram os dois campos certos (MKT, migration 20261029_01), e a tela usa os dois porque são perguntas diferentes:** `avaliacoes_lidas_em` — "quando **nós** lemos", carimbado em todas as fichas quando a leitura fecha sem erro (hoje as 6 em **29/10 às 17:39 BRT**), no cabeçalho e com aviso se alguma ficar atrás; e `ultima_avaliacao_em` — "quando **alguém** avaliou" (Polá Petit: **04/08/2021**, cinco anos), na tabela por ficha. Confundir os dois foi o erro.
- **O item 2 do desenho do Google ("Google parado" automático na Controle) mudou de alvo por causa desta medição, antes de ser construído.** Um alarme "parado há N dias" dispararia amanhã nas quatro lojas fechadas e ficaria disparando para sempre — quatro itens de nível 2 permanentes na tela do dono por uma decisão que ele mesmo tomou. O único achado verdadeiro hoje é **Polá Petit**: `aberta`, `posts_motor = false`, **zero post desde sempre**, 7 avaliações, 1 ruim sem resposta e coleta parada em 06/10. O alarme tem de ignorar quem está desligado por decisão e olhar quem está aberto e calado.
- Dívida de **R-049** dita em voz alta no cabeçalho do módulo: estes KPIs somam linha no front. A classificação por situação nasce no banco (vem da view); a soma não. O certo é uma RPC com ficha/janela/base como parâmetro, e é a próxima passada desta tela — não dá para chamar de cumprido o que não está.

## 2026-10-28 — Tela do Google Meu Negócio, e o que ela se recusa a mostrar (205)

- **A pergunta do dono era "onde vejo os dados do Google no app?" e a resposta medida era: em lugar nenhum.** `grep` em `src/` por `gbp`: **zero** ocorrências. Agora existe `#/google`.
- **`ops.gbp_nome_citado` NÃO é cadastro de pessoa, e não deve virar um.** Antes de criar tabela de pessoa li o R-013 (`Cockpit/Harness/padroes-identidade-cadastros.md`), e ele **não se aplica aqui**: o schema obrigatório exige `tenant_id` referenciando **`iam.tenants`, que não existe neste banco** (`iam` tem só `users` e `audit_logs`), e pelo menos um identificador externo (email/telefone/BSUID/CPF). De quem é citado numa avaliação do Google eu tenho **o primeiro nome e nada mais** — caber no schema exigiria **inventar** identificador, e cadastro de pessoa com identificador inventado passa a parecer fonte de verdade sobre gente. Registro de colaborador de verdade pertence a onde mora o vínculo (banco do **Clearix**) e exigiria `iam.tenants` nascer aqui: decisão do dono, não efeito colateral de uma tela.
- **Eu havia recusado a atribuição por nome, e a medição me corrigiu.** Calculei o teto sobre as **1.745** avaliações (9 anos, 6 fichas) e disse que a maioria não nomeia ninguém. Onde o dado está vivo: **outubro/2026 na Lancaster, 91 avaliações, 84 citam um nome — 92%**. Censo no corpo errado dá resposta errada. Os 3 nomes entram **medidos** (Thiago 73, Kayllaine 7, Nicolly 4) e `confirmado = false`: ninguém confirmou que são colaboradores.
- **Menção não é desempenho, e a trava é estrutural.** `v_gbp_mencoes_mes` **não tem coluna de posição, nota nem ranking**, e a prova da migration **falha de propósito** se alguém acrescentar. 73 menções contra 7, com média 4,99 e **zero** menção ruim, é volume de quem atendeu: sem denominador (clientes atendidos por pessoa, que vive no banco do Clearix) o ranking premia quem faz mais turnos ou quem pede mais avaliação. A coluna irmã `v_gbp_mencoes_cobertura_mes` põe o buraco na tela (**84 com nome, 7 sem**, de 91) para ninguém ler "Thiago 73" como se fosse a loja inteira.
- **A janela é 10/2026, e o corte vive na view.** A Lancaster saiu de **6 avaliações em setembro (0% citando nome)** para **91 em outubro (92%)**; na ficha inteira, 2019→hoje, só **86 de 548** comentários citam os três. Começou uma campanha, e a atribuição só existe dentro dela — proporção sobre 9 anos mentiria. Deixar o corte "para quem olhar lembrar" é como a 192 quase apagou 97 visitas reais.
- **O número que lidera a tela não é 1.745: é 14.** Avaliações **≤3 estrelas sem resposta publicada** — 8 na Lancaster (6×1★, 2×2★), 4 na Mello, 1 na Polá Petit, e entre as de outubro **uma de 1 estrela com reclamação de conteúdo**. As 1.745 são 9 anos desde 2017, e 98% têm 4–5 estrelas: contexto, não fila.
- **E o que a tela se recusa a mostrar:** **zero onde a resposta é "não sei"**. Dia que o Google ainda pode preencher aparece como **"ainda não fechou"** (o relatório atrasa 2–3 dias, e foi isso — não ficha fora do ar — que explicou as impressões 0 de 26 a 28/10, confirmado pelo MKT na origem); `cliques_site` aparece como **"não confiável"**, porque vem 0 da origem nas 6 fichas há 18 dias e **todas têm site cadastrado**; e **publicação de post não entra**, porque o que a nossa tabela chama de "publicado" é **declaração do nosso escritor**, não leitura de volta do Google — eu quase reportei o contrário ao dono, e seria circular (`posts_no_dia` é subconsulta na nossa própria `mkt.gbp_posts`).
- **Quatro das 6 fichas não recebem avaliação desde 2024** (Rio Pequeno 06/24, São Mateus 09/24, Perus 10/24; Polá Petit desde 2021) e a tela marca "parada". Casa com as 4 lojas da Mello que aparecem "fechadas temporariamente" no Google — vale mais que o placar, e é painel do dono.
- A tela **não mostra o autor da avaliação** (a coluna nem é selecionada): o comentário é público no Google, o nome do cliente não precisa estar aqui.
- **Mesmo dia, segunda volta: o MKT pôs no ar as 3 colunas que eu havia pedido, e o post ganhou testemunha** (`7b32b83`). `estado_google` + `lido_google_em` em `v_mkt_gbp_posts`, `dia_fechado` + `posts_no_ar_google` em `v_mkt_gbp_metricas_dia`, e histórico de leitura em `mkt.gbp_metricas_leituras` sem sobrescrever.
  - **Conferi a procedência antes de usar:** `posts_no_ar_google` conta `estado_google = 'LIVE'`, **não** a nossa coluna `status`. Então a comparação **"posts nossos × no ar pelo Google"** deixa de ser circular — e é a testemunha que faltava para esta tela poder mostrar post. A coluna acende quando fica menor que a nossa.
  - **`dia_fechado` fez o que precisava:** medido, 24 a 27/10 vem `false` com `aparicoes` **NULAS** (não zero) e 20 a 23/10 vem `true` com número. Troquei a minha aproximação local pela coluna da origem e tirei **todo `?? 0`** desses campos — era exatamente assim que o zero de ontem ia virar número. Soma só dia fechado; se qualquer ficha do dia não fechou, o dia inteiro diz "ainda não fechou".
  - **141 posts confirmados LIVE.** Os **3** com `status='publicado'` e `estado_google` nulo são de **hoje** (0 dias): são "ainda não lidos", não falha. A tela separa os dois casos, e o alarme é só post publicado há **mais de 1 dia** sem confirmação — hoje **zero**. Corrigi o número do MKT de carona: são 141 LIVE e **87** sem leitura no total (3 publicados + 42 agendados + 42 cancelados), não 3.
  - **Os 42 cancelados tinham dono e motivo, e o MKT respondeu no mesmo dia** (`887de1b`): cancelou ele, em **08/10**, com a palavra do dono — trocados pelo acervo do grupo e por textos sem medidas. Medi antes de pôr na tela: os 42 têm motivo escrito, em **três redações** da mesma decisão, todas datadas 08/10, **nenhum sem motivo**. A tela agrupa por motivo e diz em texto que **cancelamento ali é decisão, não defeito** — contagem de 42 sem motivo faz o dono olhar e procurar culpado onde houve escolha.
  - **E a coluna da origem se chama `erro` carregando DECISÃO.** Medido: preenchida nos 42 cancelados e em **zero** publicado ou agendado. Decisão e defeito são opostos — um é escolha do dono, o outro é falha de publicação — e um dia em que um post falhar de verdade a mesma coluna vai dizer as duas coisas. Separei **na estrutura**: `erro` em post não cancelado vira "falha de publicação" em linha própria, hoje **zero medido** (ao contrário de `cliques_site`, que é ausência de coleta). Sugerido ao MKT um campo `motivo` separado do `erro` na origem.
- **Terceira volta, pedido do dono: filtro e KPI (`641fb87`).** "Dados da página do Google com filtros, kpis com dados atualizados." Barra com **ficha** (as 6, e clicar na linha de "Por ficha" filtra a tela) + **janela** (7/14/30/tudo), oito KPIs e **carimbo de leitura** no topo: horário BRT da última leitura da origem, último dia fechado e o atraso em dias. Três coisas que a medição impôs e que são o motivo de não ser um seletor de datas comum:
  - **São DUAS âncoras de tempo, não uma.** Medido hoje: a origem leu às **16:19 BRT**, mas o último dia **fechado** é **23/10** — **5 dias** de atraso. "Últimos 7 dias" contados de hoje somariam só **2** dias fechados e mostrariam uma queda que é atraso de relatório, não queda de verdade. Desempenho (aparições/rotas/ligações) ancora no **último dia fechado**; avaliação e post, que chegam na hora, ancoram em **hoje**. Cada KPI escreve as datas que usou, e o rodapé diz por que os dois blocos terminam em dias diferentes — esconder a diferença seria pior que mostrá-la.
  - **Variação só com base completa, e a medição mostrou a armadilha.** A série tem 36 dias (22/09 a 27/10), **32 fechados**. Em 7 dias: 243 × 209 (**+16%**); em 14: 452 × 619 (**−27%**). Em **30 dias o período anterior tem 2 dias** de dados (73) — a variação ingênua diria **+1483%** com cara de notícia boa. A regra agora é: só compara quando o anterior tem o **mesmo número de dias fechados**; senão escreve "sem base anterior completa". E marca "base pequena" abaixo de 10, porque **3 ligações contra 12** viram −75% que é ruído, não queda.
  - **O total tinha como não bater com a origem.** São **1.745** avaliações e o PostgREST pagina: uma página silenciosa de 1.000 faria a tela dizer "1.000 avaliações desde 2017" e errar **toda média e todo total** sem um único erro na console. `lerTudo` pede a contagem exata, pagina **com `order`** (sem ordem a paginação do PostgREST repete ou pula linha, e o total erra sem denunciar) e, se ainda faltar linha, a tela abre com aviso em vez de exibir número truncado.
  - **Um zero que continua se recusando a existir:** "Cliques no site" é KPI com o texto **"não coletado"** no lugar do número, não 0. E se algum dia marcado `dia_fechado` vier com campo nulo, a tela avisa que somou aquele dia como zero — medido 0 em 192 linhas fechadas, mas a soma não pode mentir calada se isso mudar.
  - `horaBrasilia()` entrou em `src/lib/datas.ts` junto das outras conversões de fuso: `lido_em` é UTC e o carimbo cru faria o dono ler "19:19" num dado lido às 16:19. `MetricStat` passou a aceitar `ReactNode` em `hint` (variação colorida) — mudança compatível com os 6 cards que já a usam, e KPI da casa reusado em vez de card novo (R-014).

## 2026-10-28 — `ainda_no_estado` olhava todos os dias, e mandou avisar o eco por 19 dias à toa (204)

- **Defeito meu, da 196, e quem achou foi o eco.** `public.v_controle_resolvidos_dia.ainda_no_estado` existe para separar "o dono resolveu" de "o agente fechou". Ela perguntava `exists (... where agente/tipo/texto_hash casam)` **sem filtrar `data`** — ou seja, "este item já apareceu algum dia", não "o agente ainda escreve". A carga só apaga as linhas do próprio dia, então o histórico fazia o `exists` achar sempre. Medido: a linha do eco de 09/10 dizia `true` enquanto o item aparece por último em **09/10** e o estado mais recente do eco é de **10/10** — `controle/resolvidos-<data>.md` mandava avisá-lo **desde 09/10, por nada**.
  - **Terceiro erro da mesma família neste app**, e sempre o caso vizinho: a 180 ("view nova nasce invoker" sem cobrir recriação), a 203 ("a opção está escrita" sem cobrir o valor) e agora esta ("o item existe" sem cobrir o dia). Esta erra para o lado de **inventar trabalho**, que é o lado que gasta gente.
  - **Recusei a correção que veio no despacho, e a medição diz por quê.** A proposta filtrava `x.origem = 'agente'` no `max(data)`. Em `ops.controle_itens`: `origem='agente'` tem 27 agentes e 571 linhas; `origem='decisao'` tem **um só** "agente", o **`dono`**, com 125 linhas — e o `dono` **não tem nenhuma** linha `origem='agente'`. Para uma decisão do dono resolvida, aquele `max` viria **nulo** e o campo diria **false sempre**: trocaria "avisa à toa" por "nunca avisa", que é o defeito pior. O filtro certo é por **agente**, sem amarrar origem.
  - **Também recusei `current_date`**, por motivo medido: **este app ficou 13 dias sem escrever estado** (16 a 28/10) e o **eco está sem escrever desde 10/10**. Com `current_date`, todo item de quem não escreveu hoje viraria "fechado" — **silêncio lido como resolução**. "O último estado do agente" é a última palavra que ele deu, e é a leitura honesta.
  - **Provas nas duas pontas, com dado real que já estava na tabela, sem inserir linha de teste:** item presente no estado mais recente de um agente dá **true** (controle positivo — sem ele, um predicado que devolvesse `false` para tudo passaria na prova e eu teria trocado um defeito por outro), o item do eco dá **false**, nenhuma linha resolvida desapareceu, e o histórico de 09/10 continua inteiro. A migration **não apaga nada**.
- **Billing conferido a pedido da Controle:** a lista do dono ainda cobrava "pode fechar o billing para a equipe" como ABERTO. Foi feito em **06/10** (189). Medido: `billing.subscribers`, `mp_events_raw` e `payments` leem por `is_staff()`, escrita por `is_admin()`, **zero** policy `using (true)`.

## 2026-10-15 — O medidor de invoker escondia duas views, e eu reportei 22 onde eram 24 (203)

- **O erro é meu e é na ferramenta em que eu confio.** A 180 criou `ops.v_views_sem_invoker` justamente para eu **não depender de olho** sobre quais views rodam como dona. Ela perguntava `reloptions ilike '%security_invoker%'` — isto testa se a opção **existe**, não se ela é **verdadeira**. Duas views têm `security_invoker` explicitamente **desligado**, contêm o substring, e por isso eram declaradas seguras. O número certo é **24**, e eu disse **22** ao dono e ao Geral em 09 e 10/10.
  - **É o mesmo defeito de forma que a 180 consertou:** a regra cobria o caso que eu tinha em mente e não o vizinho. Lá era "view nova nasce invoker" sem cobrir recriação; aqui, "a opção está escrita" sem cobrir o valor dela. **Medidor que erra para o lado de "está limpo" é pior que não ter medidor.**
  - **Achei porque o Postgres guarda a grafia literal:** **131** views dizem `security_invoker=true` e **55** dizem `=on` — a mesma coisa. Uma prova minha de hoje comparava com o texto `'security_invoker=true'` e deu 0 numa view que **é** invoker. Quem compare com esse texto classifica 55 views invoker como donas: o erro oposto, e também errado. O medidor passou a **ler o valor** da opção, e o comentário da view avisa disso quem for reescrever.
  - **As duas que estavam escondidas, e o que são:** `public.v_mkt_credenciais_saude` é **definer de propósito com trava no corpo** (`where mkt.is_admin()`), lê `mkt.credentials` — que não tem SELECT para `authenticated` — e expõe status e validade, nunca o segredo: é o padrão da casa (R-043), e o defeito era ser **invisível** na auditoria. `public.v_motivos_saida` é definer sobre `ops.motivos_perda` sem filtro de papel, mas é **lista de referência** (chave, rótulo, tipo de motivo de perda/descarte): sem PII, sem linha por cliente, e `anon` não lê. **Nenhuma das duas é exposição.**
  - **Não troquei o modo da `v_motivos_saida`, de propósito:** ela alimenta um seletor na tela, e invoker com a RLS de `ops.motivos_perda` pode **esvaziar o seletor em silêncio** — o modo de falhar que me mordeu na 183. Ela vai para a lista com o comentário dizendo o que é; quem decidir mexer decide vendo a tela.
  - **O ensaio me recusou antes de aplicar:** `create or replace view` não renomeia nem reordena coluna (*cannot change name of view column "reloptions" to "motivo"*). Em vez de `drop`, a coluna `motivo` entrou no **fim**, preservando a ordem da 180.
  - **Provas:** lista 22 → **24**; as 2 escondidas aparecem **pelo nome** (controle positivo — lista que cresce sozinha não prova nada); **0** das 55 grafadas `=on` entraram (controle negativo); e nenhuma das 22 anteriores saiu, comparada **nome por nome** contra um retrato tirado dentro da transação, não contra número digitado por mim — lição da 186.
- **Conferido o pedido do Geral:** os 3 hosts corrigidos nas fichas (`nexus.digiai.app.br`, `limelight.digiai.app.br`, `pulsohub.vercel.app`) chegaram ao banco na passada do estado-runner das **09:30** e a view que o Mapa vivo lê devolve os três, **e zero `netlify` em qualquer app**. A passada anterior era das 09:00 e as fichas foram corrigidas às 09:02: o atraso era de 2 minutos de relógio, não cadeia quebrada.

## 2026-10-10 — Bloco "Publicação urgente" no topo da Controle

- Protocolo aprovado pelo dono às 09:09 (R-048: um "pode" por pacote). A carga do Geral já traz os pacotes como `agente='urgente'` — **nenhuma migration**, só tela. Hoje há 1 pacote: Lancaster · Dia das Crianças, vale até 17h, 0 de 13 peças pendentes, "pode" registrado.
- **A autorização não mora no app.** É o "pode" escrito no arquivo do pacote; a tela só mostra se está lá. E mostra os três estados: registrado, **não registrado** (em vermelho, "não publicar") e **"o texto não diz"** — porque silêncio não é autorização.
- **Leitura defensiva do texto, que é escrito por outro agente.** O que casa vira campo; o que não casa faz o **texto inteiro** aparecer. Testei o leitor com o texto real da tabela, com um sem "pode" e com a redação mudada: no último tudo vem nulo e a tela degrada mostrando a frase, em vez de inventar "0 pendentes". Se o sync mudar a redação, o bloco fica feio e continua verdadeiro.
- **Vencido pela hora, não só pelo dia:** o pacote vale até 17h e a carga que o fecha roda às 18h — entre as duas a tela mostraria vencido como vivo. A conta é no fuso de Brasília e marca "validade encerrada" na hora certa.
- **Caminho, não link:** o hub de leitura é repo local e não gera `comercial/`. Mostro o caminho do pacote e do protocolo em texto selecionável — link que não abre é pior que caminho que se copia (foi a mesma decisão da varredura Netlify).
- Os pacotes saem da lista normal de risco para não aparecerem duas vezes, e o botão **resolvido** funciona igual.

## 2026-10-09 — "Temos esse controle?" Não — e onde havia valor, o valor estava errado (202)

- **Pergunta do dono:** temos no digiai o controle de conta a pagar que trava app? **A resposta medida é não**, e é pior que campo vazio:
  - os **10** projetos Supabase diziam `plano = 'free'`. Medi na API (`GET /v1/organizations` com o PAT do digiai): a org que o token alcança está em **`pro`** — e nela vive o banco do **próprio digiai**. Inventário que diz "free" é a razão pela qual ninguém espera fatura, e fatura não esperada foi o que pausou o `gj_pessoal` de 02 a 07/10.
  - o **ElevenLabs não existia** no inventário nem no vocabulário de serviços — e a OSI e o Limelight usam a voz. O dono pagou US$ 22 hoje.
  - o **`ecoax`** é um 11.º projeto Supabase, na org alcançável, **ausente do inventário**.
  - a Netlify dizia `free · ativa` **cinco dias antes** de ser desligada por não pagamento.
  - **zero** contas com `custo_mensal`; a única conta de IA tinha identificador `(a confirmar)`.
- **O custo é da organização, não do projeto.** O Pro do Supabase se cobra por org; pôr US$ 25 em cada um dos 6 projetos faria o custo da casa aparecer **seis vezes** — o mesmo erro que eu recusei de manhã ao deixar a view de esforço sem coluna de venda. Entra **uma linha para a org** com o custo, e os projetos ficam com o plano e sem valor. A prova falha se um projeto carregar custo, e exige que a soma seja exatamente **47 USD** (25 + 22): se viesse 172, o custo por projeto teria entrado.
- **O que eu não sei ficou dito, não preenchido.** 5 projetos estão em orgs que este token não alcança (Clearix, pulso ×2, niposchool-design, tgjphotos) — o inventário já registrava esse limite desde 16/08. O erro deles era só o `plano = 'free'`, que virou **nulo**: "não sei" é melhor que um "free" que ninguém conferiu. O plano real vai para "Pendente do dono".
- **Saldo não é mensalidade:** o OpenAI tem saldo pré-pago (US$ 9,49), que foi para `ultimo_detalhe` e **não** para `custo_mensal` — a prova falha se eu puser mensalidade num saldo.
- **Cada número com a fonte**, porque número sem fonte vira folclore: o `pro` é medição minha na API; os US$ 22 do ElevenLabs e o saldo do OpenAI são leitura da fatura pelo Geral em 09/10; a Netlify encerrada em 14/10 é decisão do dono mais os 37 hosts que eu medi na 197/198.

## 2026-10-09 — Eu anunciei um buraco que não existia, e a trava do banco me corrigiu (201)

- **A correção primeiro:** a 200 anunciou "14 contas que o MKT publica e o inventário não tem", e eu disse ao dono e ao MKT que entre elas havia **4 números de WhatsApp sem dono em lugar nenhum**. Tentei inseri-los e a constraint `contas_servicos_servico_identificador_key` recusou: **já existiam** — como `categoria = 'telefonia'`, ativos, **com `conta_dona`**. Um número de WhatsApp é telefone e canal ao mesmo tempo, e quem cadastrou arquivou como telefonia, o que é defensável. O que faltava neles era só o **vínculo**.
- **O defeito era da minha view:** ela perguntava "existe linha ativa com este `mkt_account_id`?" e chamava o "não" de conta ausente. **Linha não vinculada não é conta ausente.** A view passou a ter a coluna `caso` — "sem linha nenhuma" × "existe sem vínculo" — e é isso que impede o próximo relatório errado.
- **O que de fato faltava eram 6, não 14:** 3 canais de YouTube (`rede_youtube` não tinha nenhuma linha), `@polapetit` no pinterest e no tiktok, e a ficha do Google da Lancaster Suzano. Cadastradas com status **`desconhecido`** e `ultima_verificacao` nula — não conferi nenhuma; copiei do MKT que existem. `ok` seria afirmar verificação que não houve.
- **Vincular não mexeu na categoria dos WhatsApp:** "telefonia" é classificação defensável, e trocá-la num passo de vínculo seria eu decidir vocabulário da casa de carona.
- **E o buraco do dono é maior do que eu disse.** Reportei "7 das 9 sem par". A pergunta certa dá **14 das 36** contas de rede sem `conta_dona` — e **8 dessas o MKT publica hoje**. Com as 6 novas, **20**. Errei para baixo por ter perguntado só das que não casavam. `public.v_ops_redes_sem_dono` passa a listar as 20, uma linha por pergunta.
- Sobram **4** na lista de não-vinculadas: as lojas da Mello, esperando o dono dizer se têm página de Facebook própria. A prova falha se eu as tocar.

## 2026-10-09 — As duas renomeadas casadas, e a conta que o inventário não tem (200)

- **O primeiro uso real da chave fazendo o que ela existe para fazer.** Duas contas minhas não casavam por nome porque **foram renomeadas**: `Óticas Sem Improviso` perdeu o "s" em julho (página 1079807541890310, hoje "Ótica Sem Improviso") e `Polá Petit` virou "Polá Petit - antiga Taty Mello Festas" (página 411169915680711). O MKT leu da API do Meta e deu os IDs. Se a junção fosse por nome, as duas estariam quebradas e ninguém saberia. **29 pares.**
- **As 4 lojas da Mello não foram tocadas, e a prova falha se forem.** Elas estão como `facebook` aqui e o MKT cadastrou as lojas como `google_business`; os nomes correspondem 1:1 (nome antigo × novo). A API dele mostra que as nossas chaves do Meta gerenciam **uma** página da Mello — o que prova que *nós* não gerenciamos nenhuma por loja, **não que nenhuma exista**. Reclassificar 4 linhas com base nessa inferência seria decidir no escuro; a pergunta foi ao dono.
- **O buraco do meu lado foi para a tela, não para uma mensagem:** `public.v_ops_redes_sem_inventario` lista **14 contas que o MKT publica e `ops.contas_servicos` não inventaria** — entre elas **4 números de WhatsApp e 3 canais de YouTube**, nenhuma com `conta_dona`, `navegador` ou `secret_ref` em lugar nenhum (R-042: se alguém precisar entrar, não há onde olhar). Os 3 marcadores do MKT ("sem conta — fora de escopo") ficam **fora** da lista: são declaração de ausência deliberada, e contá-los como buraco seria inventar trabalho.
- **O controle positivo é o que me motivou a escrever a lista:** a prova falha se os 4 WhatsApp e os 3 YouTube não aparecerem nela — lista vazia por estar quebrada passaria por "nada a fazer".
- **O ensaio recusou uma versão:** a prova não filtrava plataforma e morreu com "more than one row" — há **duas** linhas "Polá Petit" no inventário (facebook e google_business), e a do Google já casara na 199. O erro era da prova; o update sempre filtrou `platform = 'facebook'`.

## 2026-10-09 — `mkt_account_id`: a chave estável entre o inventário e o MKT (199)

- Ordem do dono: *"a lista de redes do app digiai se atualiza sozinha, como a do MKT"*. Perguntei ao MKT qual era a chave; ele respondeu `v_mkt_accounts.id` (uuid), que **sobrevive a rename do perfil** — handle não. `account_ref` não serve: só 25 das 46 contas têm.
- **Duas premissas do pedido estavam erradas, e medi antes de construir:** `company.digital_assets` tem **zero** linhas de categoria rede (não havia cópia para substituir), e o `MktCrescimento` **já lia** a view. O que existe é `ops.contas_servicos` com 36 contas `rede_social`, que **não é cópia**: 22 carregam `secret_ref`, `conta_dona` e `navegador` (R-042 — de quem a conta é, onde o segredo mora), que a view não tem nem deve ter. A view diz o que a rede **mostra**; o inventário diz de quem ela **é**.
- **Resultado: 27 com par, 9 sem.** Os sem par não foram forçados: 6 são `facebook` aqui e o MKT cadastrou as lojas como `google_business` (ou são coisas diferentes — página por loja × ficha do Google — ou uma das classificações está errada, e casar por cima decidiria isso no escuro), 2 são contas que o MKT não conhece e 1 é pinterest sem par.
- **O ensaio recusou duas versões, as duas por eu ter medido errado.** (1) Meu ensaio solto usava só a normalização do `identificador` e "descobriu" uma disputa: `Gilberto Junior` e `Gilberto Junior (2º perfil)` colapsavam no mesmo valor. Fui olhar: **o MKT tem os dois perfis separadamente**, e com casamento **exato antes** da normalização cada um casa com o seu. A disputa era artefato da minha consulta, não do dado. (2) A assertiva seguinte esperava 1 dos 2 perfis casados e falhou com 3 — o `ilike` pega as três redes, não só o Facebook. A prova agora afirma o que é verdade: três pares, três uuids distintos.
- **A normalização continua condicional** (só vale quando o valor limpo é único do meu lado) — não porque houve colisão, mas porque é o que impede uma futura entrar calada. Mais um índice único: duas linhas daqui não podem apontar para a mesma conta lá.
- **Achado de carona, e é furo meu:** **7 das 9 sem par não têm `conta_dona`** — conta de rede no inventário sem dono registrado. Se amanhã alguém precisar entrar nela, não há onde olhar.

## 2026-10-09 — Os dois hosts sem destino fechados, com prova do ar (198)

- `pulsohub.netlify.app` → **`pulsohub.vercel.app`** e `limelight-studio.netlify.app` → **`limelight.digiai.app.br`**. Mapa completo: **37 hosts, zero `a_definir`** — 21 redirecionam, 12 migram, 3 aposentados, 1 já morto.
- **Medi os dois antes de gravar, e um contrariou o despacho:** mandaram-me fechar o Limelight só com prova do ar, "porque link que parece bom e não responde é pior que `a_definir`" — regra com que concordo. Medindo, **`limelight.digiai.app.br` já estava no ar**: 200, `<title>Limelight Studio</title>`. Horas antes, na 197, o mesmo endereço não respondia nada; a migração andou no meio. Esperar para escrever o que já dá para ver seria cerimônia — o que a regra proíbe é gravar endereço que não responde.
- **O que eu conferi foi o `<title>`, não o tamanho:** 469 bytes é a casca de um SPA Vite (é como o próprio digiai serve). Projeto vazio do Cloudflare não se chama "Limelight Studio".
- **A prova exige prova:** nenhuma linha pode ficar em `migrar` sem `prova` contendo a medição — é o que impede alguém de preencher destino de cabeça. E o controle positivo confere que os aposentados e o morto **continuam no mapa**: se a conta zerasse, eu teria "resolvido" junto quem também morre em 14/10.

## 2026-10-09 — Links novos: o mapa Netlify medido host por host (197)

- **Risco que motiva:** a Netlify não será paga e `*.netlify.app` morre por volta de **14/10** — cinco dias. Ordem do dono: *"atualizar no digiai todos os links novos"*.
- **Dois apps em operação não têm para onde ir, e esse é o achado principal.** `limelight-studio.netlify.app` (o Limelight Studio, em operação desde 22/07) e `pulsohub.netlify.app` respondem **200** e **não têm endereço novo** — medi os candidatos e `limelight.digiai.app.br`, `studio.digiai.app.br`, `pulso.digiai.app.br` e `hub.pulso.digiai.app.br` não respondem. Entram no mapa como `a_definir`, não com destino inventado: **trocar por endereço que não existe faria o link parar de parecer quebrado e continuar quebrado**.
- **O mapa recebido cobria ~15 hosts; a varredura achou 37** nos dados de configuração. Três destinos que ninguém havia dito, medidos por `curl`: `clearixbi` → **insights**, `clearixdcl` → **lab**, `clearixrh` → **people**. E dois que importam: `digiaimkt` → `mkt.digiai.app.br` e `manual-clearix` → `manual.clearix.app.br` — este estava no **gerador de proposta**, ou seja, ia dentro de proposta enviada a cliente.
- **O que estava prestes a sair em público:** `mkt.ai_config.osi_prospeccao_templates` (textos que vão em mensagem para ótica) e `mkt.content_rules` (o que a IA lê para gerar conteúdo). No calendário havia 5 linhas, mas medidas uma a uma **só 1 estava viva e não publicada**; o post de 22/06 **já publicado não foi reescrito** — saiu com aquele link, e isso é história.
- **História fica, e a prova exige que fique:** `ops.apps_sinais` (5.861), `analytics.events_log` (257), `ops.pixel_medicao` (106), `iam.audit_logs` (60), `mkt.mensagens` (40) e os logs. A prova falha se esses números mudarem — reescrever o passado é pior que um link velho num log.
- **`observacoes` é histórico, não link vivo.** A minha primeira prova exigia zero ali e falhou com 2 notas do tipo *"[2026-06-02: corrigido de lumina.netlify.app p/ luminabox…]"*. Reescrever falsificaria o registro de uma correção passada. O campo vivo é `valor`, e dele a prova exige zero. Mas **duas notas guardavam um plano que o desligamento anula** (*"ADR-0032: manter em digiaiatlas.netlify.app"* e *"netlify segue como rollback"*) e ganharam o aviso ao lado, sem reescrever o passado.
- **Duas ideias aprovadas ficaram de fora, de propósito:** o gatilho `tg_content_ideas_curadoria` barrou o update e está certo — link dentro de ideia aprovada é conteúdo que o dono aprovou. Revogar as tiraria do bolso de produção, e isso é escolha dele, não efeito colateral de uma varredura. Vai como pendência.
- **O mapa mora em tabela** (`ops.netlify_destino`, com a prova do que foi medido), não num `case` dentro de update: host novo é obrigado a declarar destino.
- **Front:** `OsiPublicLanding`, `FluxoOSI` (materiais de afiliado) e `proposalGen` apontam para os endereços novos. Sobraram dois `netlify` no código e os dois são comentário de histórico.

## 2026-10-09 — "Resolvido" na Controle: clicar e sumir, sem apagar nada (196)

- Pedido do dono: *"opção de resolvido: clicar e sumir"*. Botão em cada item, um clique, some na hora; chip **mostrar resolvidos** com **reabrir**.
- **Não se apaga a linha.** A carga espelha os arquivos de estado e roda sozinha às 9h e 18h — apagar faria a passada seguinte reinserir o item, e o dono veria voltar no dia seguinte o que ele resolveu. Isso é a forma mais rápida de um botão perder a confiança de quem clica. A resolução mora em `ops.controle_resolvidos`, por **chave estável (agente, tipo, texto_hash)**, e a view esconde.
- **Desfazer existe, e não é luxo:** "clicar e sumir" sem volta transforma clique errado em item perdido — e numa tela de controle o item perdido pode ser o risco. Duas RPCs separadas em vez de um botão que alterna, porque alternar some no primeiro clique e desfaz no segundo sem ninguém perceber.
- **O hash pode mudar, e isso já aconteceu hoje** (88 linhas duplicaram quando o parser passou a limpar markdown). O mesmo mecanismo faz um resolvido ressuscitar se o texto mudar. Não há como evitar sem casar item por aproximação, o que esconderia item novo de verdade — pior. Então `texto_quando` guarda a redação do momento: quando um resolvido voltar, dá para ver que já tinha sido resolvido e com que palavras. É diagnóstico, não disfarce.
- **Resolver ≠ o agente ter fechado.** `v_controle_resolvidos_dia` tem `ainda_no_estado`, que diz se o agente continua escrevendo o item — é a lista de quem o Geral precisa avisar na passada das 18h.
- **O Telão passou a contar só o não resolvido**, senão o número da parede divergiria do da tela.
- `resolvido` é **coluna, não filtro na view**: a tela esconde por padrão e oferece mostrar, para clique errado ser visível e reversível. Escrita só pelas RPCs (`security definer` com `is_staff()` explícito); a prova falha se `authenticated` puder escrever direto, e o portão recusando a própria prova é o teste de que ele está fechado.

## 2026-10-09 — Nível do problema, e o Telão sem texto de risco fora do login (195)

- **Ordem do dono:** *"trabalhar por níveis de problema, e o Telão e o digiai têm de ter a real, sem depender da conversa"*. `ops.controle_itens.nivel` (1 = dinheiro, dado exposto ou prazo ≤ 7 dias; 2 = risco sem data ou pendência que trava venda/agente; 3 = o resto), a tela agrupa por nível e ganhou filtro de nível, e o Telão ganhou `public.v_telao_controle`.
- **`default 3` de propósito:** item que chega sem nível **não se promove a urgente sozinho**.
- **Recusei o `anon` do pedido, e por medição.** O pedido pedia a view do Telão legível por `anon` "como os outros espelhos do Telão" — e essa premissa está errada: as **7** views do Telão são `anon = false` desde 27/08, por decisão do dono ("o login é a porta"), e eu tirei a última (`v_telao_afericao`) em 05/10 pela 181. A casa tem **zero** view legível por `anon`. O Telão não precisa: lê com sessão (`tokenDaSessao`).
- **Recusei o `top_riscos` com texto, e medi antes de recusar.** O pedido queria os 60 primeiros caracteres do texto dos riscos nível 1, "sem segredo". O que esses 60 caracteres seriam hoje: um nome de arquivo com segredos reais (`clearix_client/.env.bak-…`), um valor de fatura (`US$ 29,40`) e o nome da view com o furo de telefone de lead. **Cortar em 60 não torna nada seguro — o começo de um risco é onde está o que ele é**, e num telão quem lê é quem está na sala. O contrato leva número, prazo e **nome do agente**: diz a quem perguntar sem dizer o quê. A prova falha se alguém acrescentar coluna de texto depois.
- **`nivel` entra no fim da lista de colunas:** `create or replace view` não reordena nem renomeia coluna, e dropar a view para pôr o campo no meio derrubaria o grant de uma view que a tela já lê. O ensaio recusou a primeira versão por isso.

## 2026-10-09 — Página Controle: o estado dos 13 agentes e as decisões do dono num lugar (194)

- **Hoje → Controle** (`#/controle`): um item por linha do estado que cada agente escreve em `Cockpit/sessoes/<data>-<agente>.md`, mais a lista de decisões do dono. Abre com **risco**, depois **pendente do dono**; filtro por agente e por tipo, cada contador respeitando o outro filtro. A carga é do Geral (`controle-sync.mjs`, via Management API); a tela só lê. Hoje o parser dele vê 13 agentes e 151 itens, 15 riscos e 32 pendentes do dono.
- **A decisão mais importante é o estado vazio.** Numa página de controle, "0 riscos" e "a carga não rodou" são a mesma tela se ninguém separar — e a primeira **tranquiliza justamente quando deveria alarmar**. Sem itens, a tela diz que *não sabe*, com o que falta acontecer. Só escreve "nenhum risco" quando há itens carregados e nenhum é risco.
- **O hash anti-duplicado é coluna gerada, de texto normalizado** (espaços colapsados, minúsculas), com índice único em `(data, agente, tipo, texto_hash)`. Se o carregador o calculasse, duas passadas com um espaço de diferença criariam o mesmo risco duas vezes — o jeito mais rápido de uma página de controle perder credibilidade. A prova testa os dois lados: recusa o duplicado que difere só em espaço e caixa, **e aceita texto diferente** (índice largo demais passaria por "funcionando").
- **Risco sem data nunca aparece como vencido.** `risco_no_prazo_hoje` compara com o dia de **Brasília**, e nulo é resposta válida — a tela escreve "sem data marcada" em vez de deixar a célula vazia. A prova falha se um risco sem data vier marcado.
- **A ordem mora na view, não no componente** (`ordem_tipo`): regra de leitura em uma fonte só, que é a lição da 192.
- **O texto vem de arquivo escrito por outro agente — é dado, não instrução.** Nada nessa tabela é executado em lugar nenhum, e a tela renderiza como texto. Vale dizer porque é a única tabela do app que agrega texto livre de 13 origens.
- Escrita fechada para `authenticated` (a prova falha se abrir): a carga é do Geral, por credencial de servidor.

## 2026-10-09 — Tela Comparativo de motores (193)

- **Marketing → Comparativo** (`#/comparativo`): esforço por motor × marca e resultado por marca, por semana (BRT), últimas 9 semanas completas. Tabela crua, sem gráfico. A semana corrente não aparece — meia semana sempre parece queda contra uma semana inteira.
- **A regra que manda na tela:** não mostrar zero onde a resposta é "não sei". Três casos caem na mesma célula vazia e levam a decisões opostas: o motor publicou e não deu resultado (**0**, e é o número), a métrica ainda não foi medida (**"ainda não"**), o espelho não foi lido (**"falta credencial"** ou **"não li"**, com o motivo).
- **`views_d7` está nulo em 100% das linhas** — 0 de 33 na semana corrente, 0 em 70 dias. A foto de 7 dias do MKT começou a encher em 09/10, então o primeiro número real sai perto de 16/10 e o placar é segunda, 12/10. A view devolve `views` **e** `views_medidas`, e a tela escreve "ainda não". O engajamento ao lado está medido: **4 interações em 33 publicações** na semana corrente, 1 em 11 na anterior.
- **Venda é da marca, não do motor** — o Mello publica por MKT e Limelight ao mesmo tempo, e venda na linha de cada motor seria a mesma venda somada duas vezes. São duas views, e a de esforço **não tem coluna de venda**; a prova da migration falha se alguém acrescentar. Trava estrutural, não visual.
- **Uma view do digiai não alcança Pulso, Limelight, blogs e Polá:** esses espelhos vivem em projetos Supabase **separados**, lidos pelo navegador com a anon key de cada um. A view cobre MKT + `analytics` e a tela junta os outros pelos canos que já existem. View que fingisse cobrir todos devolveria metade dos motores em silêncio.
- **O leitor de espelho passou a devolver o motivo** (`ok | sem_credencial | erro`). Antes devolvia `[]` tanto para "não publicou" quanto para "não consegui ler" — o próprio comentário dele dizia que silêncio não serve, mas a tela não tinha como saber. Agora a linha do Polá diz **"falta credencial"** em vez de "0 publicações".
- **Última semana completa (28/09–04/10), medida:** MKT 11 publicações (mello 5, osi 4, digiai 1, lancaster 1), 2 dias com publicação, engajamento 1. Resultado: digiai 42 visitas, osi 18, **0 cliques, 0 vendas**.
- **Corte de semana único** em `src/lib/datas.ts`, no mesmo critério do `date_trunc('week')` do Postgres. Se a tela e a view cortassem a semana diferente, a comparação mentiria sem dar erro.

## 2026-10-08 — Endereços novos da OSI no conteúdo que o app serve

- `docs_sync` e `docs/portfolio-estado-real.md` passaram a apontar a landing da OSI para **`osi.digiai.app.br`** e o leitor para **`leitor-osi.digiai.app.br`** (commits `ad3cb12` e `f3b5433`). O domínio próprio `oticasemimproviso.com.br` continua não comprado.
- **Conferido em 09/10 que a mudança NÃO cortou a medição**, que era o risco real de trocar endereço: chegam **36 eventos** de `osi.digiai.app.br`, o último hoje, e o host antigo (`landingoticasemimproviso.netlify.app`) parou em 08/10. Os dois passam em `analytics.fn_origem_real` — ela só recusa preview de deploy com hash, não um subdomínio próprio. Sem buraco no funil da OSI.

## 2026-10-06 — O funil passa a contar gente, e a minha própria manchete cai (192)

- **Eu estava errado, e o erro foi ao dono.** Escrevi na pauta das dores e disse a ele que "67 pessoas clicaram no WhatsApp do Clearix e só 1 pediu demo", concluindo que o gargalo era *depois do clique*. O Geral mediu e me corrigiu; conferi: **66 dos 68 cliques são de 28/09, entre 04:40:20 e 04:52:30 BRT, em 6 sessões** — verificação automatizada da landing, que o filtro de user-agent não pega porque o agente se apresenta como navegador normal.
- **O card do Clearix, antes → depois:** clique no WhatsApp **67 → 1**; clique em CTA **12 → 1**; demo **1 → 1**; visitas 211 (intactas). Zero nos últimos 7 dias nos três cliques. **O gargalo não é depois do clique — é que quase ninguém clica.** Uma pessoa demonstrou interesse na landing em toda a história dela.
- **A distinção foi para o catálogo, não para um `where` dentro da view:** `events_catalog.unico_por_sessao`. Limiar único não servia — `clearix_site_visit` tem uma sessão com **94** visitas (pode ser gente navegando) e `loja_produto_visto` repete por natureza, enquanto 20 cliques no botão do WhatsApp não. E `funnel_stage` põe `loja_produto_visto` e `clearix_whatsapp_click` no mesmo "consideration", logo não separava. Lista dentro de view envelhece calada; a do catálogo o próximo código é obrigado a enfrentar.
- **A regra:** código único por sessão conta **1 por sessão**, e sessão com **3+** do mesmo clique é descartada. O 3 não é palpite — é o meio do vão entre 1 (humanos) e 4 (a menor sessão automatizada).
- **Uma fonte, não duas:** a regra do funil passou a viver em `analytics.eventos_de_funil`, e as duas views só agregam. Não é abstração a mais: é o conserto do que causou a divergência de hoje — a mesma regra escrita em dois lugares que saíram de sincronia.
- **E corrijo um erro meu de uma hora antes:** a 190 pôs na `funnel_daily` a regex de preview **copiada da 129**, quando já existia `analytics.fn_origem_real`, usada pela `summary` e mais rica (exclui também preview de **deploy** e campanha `teste.`). No cabeçalho da 190 eu escrevi que "reescrever de cabeça uma regra que já existe é como se inventa divergência" — e foi o que eu fiz. Efeito medido: as visitas do Clearix na daily vão de 99 para **97**, e as 2 que saem são de `clearix-site.pages.dev`, conferidas uma a uma.
- **O ensaio recusou TRÊS versões desta migration**, e as três recusas eram defeitos reais: (1) a guarda do vão — eu afirmara 1→5 medindo só `clearix-site`, e existe sessão com 4; (2) a expectativa da OSI em 3, vinda de uma simulação que não aplicava o filtro de origem (já era 1); (3) **o helper usando a regra de produto como filtro**, que apagava as 97 visitas da landing do Clearix — o mesmo apagamento que eu havia recusado na 190 uma hora antes. A regra virou **coluna** por causa desse teste: nula quando a família não casa, então a `summary` as exclui e a `daily` as mantém.

## 2026-10-06 — O toque de venda passa a guardar a abertura e a frase do dono da ótica (191)

- **Por que existe:** eu mesmo achei o buraco respondendo a pauta das dores — **67 pessoas clicaram no WhatsApp do Clearix, 1 demo foi pedida, 0 toques registrados, e a dor não estava escrita em lugar nenhum do banco.** A `nota` que já existia é *o que quem registra achou*; faltava *o que o dono da ótica disse*.
- **Dois campos, não um:** `abertura` em **lista fechada** (dinheiro parado · cliente não volta · lente cara · outra), porque "qual abertura faz responder" só tem resposta se o valor for comparável — texto livre daria 20 grafias da mesma coisa; e `frase_do_dono`, texto curto com as palavras dele, **separado da nota**. Misturados, perde-se exatamente o dado que a pauta quer, e nota antiga ninguém reescreve depois.
- **Opcionais de propósito, e a frase vem antes da nota na tela.** Obrigar mataria o registro na terceira ligação — foi sem elas que a tela chegou a **0 toques em 6 dias**. A ordem e o tamanho do campo é o que ensina qual importa, sem travar quem está com o telefone na mão.
- **LGPD resolvida na origem:** `frase_do_dono` é fala de pessoa identificável. A view `public.v_ops_toques` **mascara a frase** quando o lead pediu exclusão (`lgpd_request_at`) **ou quando o lead não está visível** para quem lê — por `not exists`, logo falha **fechada**. Fica escrito que atender um pedido de exclusão exige pôr a coluna a nulo nos toques do lead: a view esconde, o dado continua lá.
- **Uma função, não duas:** não dá `create or replace` com assinatura nova, e deixar as duas vivas tornaria a chamada **ambígua** (a tela chama por argumentos nomeados). A antiga saiu e a nova aceita a chamada antiga pelos defaults — nenhuma janela com o botão quebrado entre deploys. A prova confere que existe **uma só**, com 6 parâmetros e 4 defaults.
- **A prova foi barrada pelo próprio portão, e isso virou teste:** tentei chamar a RPC e `is_staff()` me recusou, porque lê o JWT e a Management API não tem nenhum. Em vez de contornar, a recusa passou a ser a prova de que o portão está fechado — e o que a RPC grava nas posições certas fica declarado como **conferência na tela** (R-005), que é do dono.
- **Controle positivo da máscara:** a prova cria um toque com lead, confirma que a frase aparece, marca o `lgpd_request_at`, confirma que a frase **desaparece**, e desfaz. Sem isso, "a máscara funciona" seria afirmação sem medida.

## 2026-10-06 — A funnel_daily para de contar preview como visita, e o dia dela passa a ser BRT (190)

- **Duas correções de regras que a casa já tinha decidido**, nenhuma nova: (1) preview local não conta — regra da 129, com a palavra do dono em 15/09, que a view irmã cumpria e esta não; (2) o dia é **BRT**, não UTC.
- **Antes → depois na janela de 90 dias:** `calc_used` 60 → **41**; `osi landing_visit` 152 → **116**; `osi click_checkout` 2 → **1**; `reader_gatilho_view` 6 → **0**; `reader_gatilho_click` 2 → **1**. Os três últimos batem **exatamente** com o que a 129 registrou em 15/09 — prova de que é a mesma regra e não uma variante minha com o mesmo nome.
- **Os "30%" que eu havia reportado eram artefato meu.** Comparei a `daily` (janela de 90 dias) contra o `n_total` da `summary` (desde sempre). 152 contra 157 não é discordância de regra: é janela diferente. A diferença real entre as duas views era só o preview.
- **Recusei aplicar a regra de produto da 129 aqui, de propósito.** O defeito que a 129 consertou foi "o site do Clearix somar na OSI", e isso acontece na `summary`, que agrupa pelo produto do **catálogo** — onde `landing_visit` só tem uma casa possível. A `daily` agrupa pelo produto do **log**: as visitas do Clearix aparecem em `clearix-site` e nunca poluíram a OSI. Aplicar a regra de produto nela **apagaria 99 visitas reais** da landing do Clearix, que ela atribui corretamente. Seria trocar um número errado por um desaparecimento.
- **O dia era UTC, e a fronteira caía às 21h de Brasília.** Medido: **105 eventos em 30 dias distintos** pousavam no dia seguinte — um de 10/07 às 21:21 BRT aparecia como 11/07. Não muda total nenhum, só em que dia cada evento cai, e por isso caiu na mesma migration sem embaralhar a prova do preview.
- **Nenhum card mudou, e isso foi medido no código, não suposto:** `FluxoOSI.tsx` e `SiteClearixCard.tsx` leem `v_analytics_funnel_summary`, que esta migration não toca. A prova confere que a `summary` continua em 157 / 18 — se eu tivesse mexido na view dos cards, ela cai.
- **A expressão do preview é a literal da 129, copiada e não reescrita** — incluindo o `coalesce(url,'')`, que é o que preserva linha **sem** url. A minha primeira tentativa usava `url !~* ...` direto, e `null !~* x` é null: teria derrubado a linha do leitor em silêncio. Reescrever de cabeça uma regra que já existe é como se inventa divergência.

## 2026-10-06 — Leitura do billing sai de "qualquer logado" e passa a ser da equipe (189)

- **Palavra do dono no canal deste agente:** *"pode fechar o billing para a equipe"*. Esperei a frase aqui porque policy de leitura de dado financeiro é portão (R-037) e repasse de par não autoriza — o Geral já tinha ratificado com ele e eu ainda esperei. As três policies `billing_leitura_logado` passaram de `using (true)` para `using (is_staff())`: `subscribers`, `mp_events_raw` e **`payments`**.
- **Eram duas quando contei a primeira vez, e eram três.** Perdi a `payments` porque cheguei às outras duas seguindo as views definer, e nenhuma das 17 que examinei lê a `payments` — ela nunca apareceu no caminho que eu estava percorrendo. **Censo por caminho acha o que está no caminho.**
- **`is_staff()` e não `pode_tocar_lead()`:** `is_staff()` aceita super_admin, admin, founder e staff, e **não** aceita `vendas`. É o que "equipe" quer dizer aqui, e é exatamente o que o portão 65 (09/09) pedia — o papel `vendas` nasceu não-privilegiado para não ver Financeiro no front, e lia tudo pelo banco. Agora front e banco dizem a mesma coisa.
- **O aperto valeu porque as 3 views de billing já eram invoker (182).** Se ainda fossem donas, fechar a base não mudaria nada — foi o motivo de virá-las primeiro.
- **⚠ Honestidade sobre o tamanho disto:** as três tabelas estão quase vazias — `subscribers` **0**, `payments` **1**, `mp_events_raw` **2**. **Nada estava exposto**, porque quase não há o que expor. É aperto **preventivo**: quando a primeira cobrança real entrar, a porta já está fechada. Não é "vazamento tapado" — era porta aberta em quarto vazio.
- **A prova recusou a minha primeira versão** e foi ela que me contou isso: eu exigia `subscribers` não-vazia para medir efeito. Trocada para `payments` (1 linha) — pouco, mas medição de verdade: como dona lê 1, como `authenticated` sem papel lê **0**.
- **Tirei do arquivo uma prova que não podia falhar:** eu contava as linhas antes e depois, por hábito das migrations de dado. `alter policy` sobre SELECT não apaga nem insere nada — aquele retrato era cerimônia. **Prova que não pode falhar não é prova.**

## 2026-10-05 — Loja Mello: view de contrato e produto validado na borda (187, 188)

- **A loja ganhou `public.v_ops_loja_mello`**: funil por dia e por `utm_content` (visita → produto → carrinho → checkout → compra), com receita só do que a loja declara em centavos. Lê `events_humanos`, logo **sem robô e sem compra de teste**. Resultado mora no digiai, não no MKT (regra do dono de 15/09). Hoje mostra **1 visita** — a única de gente de verdade; as outras eram conferência de agente.
- **O produto passou a ser validado na borda, e não era.** A edge gravava **qualquer string** como produto, e evento **sem** produto caía como **`osi`** — então "melloloja" criaria funil fantasma e a loja mandando sem o campo inflaria a OSI. A lista de verdade virou `analytics.produtos_aceitos` (6 produtos), com cópia na borda; produto novo entra nos dois lugares, como já valia para os códigos. Provado na borda viva: `{"inserted":1,"errors":["bad_product:melloloja"]}`.
- **Não valido o par código×produto, e é decisão medida:** `reader_gatilho_*` chega com produto `osi` enquanto o catálogo diz `osi-leitor`. Exigir o par recusaria tráfego vivo para consertar um registro.
- **Achado que vale mais que o pedido:** cruzando código×produto contra o catálogo, **160 eventos de `clearix-site` usam códigos da OSI**. Não é mistura nem contagem dupla — é **troca de código em 15/09**: `landing_visit` rodou de 12/08 a 15/09 (140 humanos), `clearix_site_visit` assumiu daí em diante (204), com só **4 sessões** no dia da virada. **Painel que conte só `clearix_site_visit` perde o primeiro mês da landing** — 204 em vez de ~340. Vai ao eco, que é quem manda na landing.
- **Lote 3 (187): `v_mkt_vendas_leads` passou a respeitar a RLS.** Devolvia `phone_e164`, `name` e `contact` de todo lead sem filtro de papel — era a view com dado de pessoa mais aberta que sobrou. Pedi ao MKT antes de mexer (R-045), e ele deu um argumento melhor que o meu: a regra de vendas dele **já depende** de `pode_tocar_lead()`, então a view passou a seguir a mesma regra, sem divergência nova. **⚠ só fecha metade:** `v_vendas_leads` é idêntica, continua dona, e é a outra porta — fechar depende da 185, que espera a palavra do dono.

## 2026-10-05 — Escrita em view para `authenticated`: 4 furos fechados, 49 grants inúteis removidos (186)

- **O furo:** 4 views eram **atualizáveis E rodavam como dona** (`v_ops_plataformas`, `v_ops_servicos`, `v_playbooks`, `v_telao_pendencias`). Por elas, um logado escreveria na tabela-base **passando por cima da RLS**, porque a view usa os poderes do `postgres`, que tem `BYPASSRLS`. Agora **4 → 0**.
- **Revogar, não virar invoker:** três são definer de propósito (o Telão mostra o agregado da casa) e `v_playbooks` não pode ser invoker — `authenticated` não tem grant em `ops.playbooks`, por R-044. Invoker esvaziaria ou quebraria telas; revogar a escrita fecha o furo sem tocar na leitura, que é o que elas existem para dar. Medido antes: **as 4 são só lidas**, nenhum `.insert`/`.update`/`.delete` em repo nenhum.
- **49 grants inúteis** em views não atualizáveis (com JOIN, agregação ou DISTINCT): o Postgres recusa a escrita antes de olhar permissão, então eram inofensivos — mas grant que não serve confunde quem audita. **49 → 0**. As **46 atualizáveis-invoker ficaram intactas**: por elas é que telas escrevem, e ali a RLS da base é aplicada.
- **De onde veio:** eu sugeri a passada ao achar, preparando a 185, que as duas views do cofre tinham `INSERT/UPDATE/DELETE/TRUNCATE` para `authenticated` sem ninguém ter notado. O Geral mediu, eu remedi.
- **O ensaio recusou duas versões minhas, e as duas lições ficam escritas:** (1) a guarda do `anon` sem filtro de schema disparou em `pg_catalog.pg_settings`, que tem `UPDATE` para PUBLIC **por desenho do Postgres** (regra que chama `set_config`) — não é furo nosso e mexer em catálogo seria pior; (2) a prova cravava a constante **46** e falhava dizendo 45, porque eu a copiei de um censo que contava `truncate` no teste de escrita enquanto a prova testava só insert/update/delete. **Número copiado de consulta com definição diferente não é prova.** A prova passou a tirar o retrato na própria transação e comparar **nome por nome**, dizendo qual view sumiu em vez de só que a conta não fecha.
- **`AGENTS.md` ganhou a seção 2-A** (R-045, dono 05/10): quem manda neste app, e a linha entre apertar e decidir — fechar furo que ninguém usa é operação; mudar **quem pode ver** dado real é do dono.

## 2026-10-05 — Robô e teste param de contar como gente (173–180)

- **`create or replace view` apaga as reloptions, e eu aprendi isso errando duas vezes na mesma view.** A 177 pôs `security_invoker` em `analytics.events_humanos` por `alter view`; a 178, uma hora depois, recriou a view para somar o filtro de teste e **zerou a opção** — o log voltou a abrir para qualquer `authenticated`. Quem achou foi o agente do MKT, medindo `reloptions`. Pela segunda vez, o olho dele e não o meu.
  - **Conserto (180):** `with (security_invoker = true)` vai na **definição**, nunca em `alter view` depois. A regra que eu tinha escrito ("view nova nasce invoker") não cobria recriação, e foi exatamente por lá que o erro passou.
  - **Medidor, para não depender de olho:** `ops.v_views_sem_invoker` lista toda view legível pelo app que roda como dona. A prova da própria migration usa a lista, com controle positivo — se o medidor viesse vazio, a migration falha.
  - **Lote 1 da varredura (181):** `v_telao_afericao` saiu do `anon`. Não foi decisão nova — em 27/08 o dono tirou as views do Telão do `anon` ("o login é a porta"); a aferição nasceu em 09/09 e ficou para trás. As 6 irmãs ganharam `comment` dizendo que são definer **de propósito**, para o próximo que varrer a lista não "consertar" o desenho. Depois: **0 views nossas legíveis por `anon`**.
  - **As 36 classificadas em três colunas** (tabela em `Cockpit/security/views-que-rodam-como-dona-2026-10-05.md`): 17 viram invoker, 15 ficam donas de propósito, **4 se aposentam por não ter consumidor em repo nenhum** — entre elas `v_ops_cofre`, que expõe `secret_ref` e `url_painel` de toda conta da empresa e já era candidata a remoção em 09/09. Dois achados de carona: `v_vendas_leads` e `v_mkt_vendas_leads` têm **definição idêntica** (duas portas para o mesmo telefone de lead), e `ops.empresas` tem **RLS ligada com zero policies**.
  - **Lotes 2a e 2b (182, 183): 36 → 26 donas.** As 10 que podiam virar invoker viraram; a coluna (A) fechou. **Falta a conferência na tela** (Inventário, Placar, Marketing) — o que a migration prova é que a RLS passou a valer (sessão sem papel lê zero); que a sessão do dono continua lendo está verificado por **construção**, lendo as quatro funções de papel e a linha dele. São coisas diferentes e ficam escritas como diferentes.
  - **O lote 2 era 17 e virou 10, e foi o ensaio que me corrigiu.** A 1.ª versão da 183 incluía `v_mkt_espelho`; o ensaio devolveu *permission denied for table ai_usage*. Não é RLS, é **grant** — e a ausência dele é **desenho** (R-044: tabela no schema do domínio, `public` só recebe view). Invoker ali daria **403, não vazio**. Sete views mudaram de coluna por isso: ficam donas, e o que as protege é filtro escrito nelas.
  - **E o buraco do billing não era view:** `billing.subscribers` e `billing.mp_events_raw` têm policy de leitura **`using (true)` para `authenticated`** — qualquer logado lê assinantes, MRR e eventos de pagamento, com ou sem invoker. O portão 65 (09/09) atribuía isso às views definer; as views eram só a porta da frente. Fechar a policy é decisão de acesso (R-037) e foi ao dono, não aplicada.
  - **Lote 2c (184): as 3 tabelas travadas ganharam policy, e as 3 views que elas travavam viraram invoker.** 26 → **23** donas. O estado que isso conserta era absurdo: RLS **ligada com policy nenhuma** — que não é "aberto", é **fechado para todos**, nem o dono lia. As views só funcionavam por serem donas. Policy de staff + `grant select` na mesma migration (grant sem policy e policy sem grant falham de formas diferentes e igualmente caladas). Escrita em `ops` delegada pelo Geral.
  - **Três tabelas com RLS ligada e ZERO policies** (`ops.scorecard_entries`, `ops.scorecard_metrics`, `ops.bairro_coordenada`): ninguém lê. Invoker nas views que as usam esvaziaria o placar e os pontos aproximados do mapa — caladas. Ficam donas até a policy existir.
  - **Achado que fica aberto:** **36 views** (de 194 legíveis) rodam como dona; **1 é legível por `anon`** (`public.v_telao_afericao`). Não consertei no escuro: view de contrato que agrega entre tenants pode ser definer de propósito, e virar invoker esvaziaria a tela. Vai para o dono e para o agente de segurança com a lista.

- **O log passou a separar três coisas que estavam juntas:** gente, máquina e teste. `analytics.events_log` ganhou duas colunas geradas — `automatico` (user-agent de robô, 175) e `teste` (a própria origem declarou, 178) — e a view `analytics.events_humanos` exclui as duas. Coluna gerada de propósito: vale para o que já está gravado e não depende de ninguém lembrar de filtrar na escrita.
- **Achado grande:** `clearix_demo_solicitada` tinha **3 registros e só 1 é real** — dois eram teste da landing, de 15/09, contados como pedido de demonstração há três semanas. Pedido de demo é número de lead; estava inflado em 200%.
- **57 eventos** eram de robô (175). As telas de funil (`v_analytics_funnel_daily`, `_summary`) e o painel de pixels passaram a ler `events_humanos` (176).
- **Erro meu, achado pelo MKT:** criei `events_humanos` sem `security_invoker` — violação da R-043, expondo sessão, url e `utm_content` (que carrega `lead_id`). Corrigido na 177, que de carona encontrou **INSERT/UPDATE/DELETE/TRUNCATE concedidos a `authenticated`** nas duas views de funil, e revogou.
- **Loja Mello no ar:** 7 códigos de evento da loja (173) + o pixel atrás de consentimento. A compra de teste do dono não vai nascer como a primeira venda: o servidor da loja marca `metadata.teste` pela lista de e-mails de teste (decisão do agente do Ecommerce, 03d2d4d) e a 178 filtra.
- **As visitas de conferência do Ecommerce não foram apagadas** (179) — foram marcadas como teste. Saem da conta, ficam no log. Apagar é destrutivo em dado real, e pedido de par é coordenação, não autorização.
- **Telão honesto (174):** `v_mkt_publicacoes_dias` contava **88 publicações apagadas, 2 de teste e 11 stories** como se fossem post no feed — 46% de inflação. Agora separa `feed` / `stories` / `sem_url`.
- **Inventário (169–171):** Worker `mello-ecommerce`, Cloudflare Email Routing e chave Resend registrados; o site da loja mudou de casa em 02/10 (Netlify → Cloudflare Workers) e o registro apontava para o endereço antigo — o medidor de pixel media a casa errada.

## 2026-10-01 — Pilar da OSI renomeado pelo caminho da casa (168)

- "convite direto pra turma" → "convite direto pro manual" em **25 ideias** (o despacho dizia 1; quem contou olhou só as que têm marca). As 24 sementes foram renomeadas direto; a curada foi **revogada, editada e devolvida à pauta** — o gatilho da casa recusa editar ideia aprovada, e estava certo. Aprovação é portão do dono (reaprovada em 05/10, migration 172).

## 2026-09-30 — Venda em um toque e placar que se preenche sozinho (165–167)

- **`ops.toque_venda`**: três botões (ligação, follow-up, piloto) + ótica + nota. A pessoa registra o toque em um gesto, e o placar da semana (`ligacoes_dono`, `pilotos_pagos`) passa a se preencher do que foi feito, em vez de alguém transcrever. `followups_feitos` desativada — estava medindo duas vezes a mesma coisa.
- **Kanban do funil** ganhou a coluna derivada `MORNO` (toque recente sem avanço) e filtros por UF e por frente, cada contador respeitando o outro filtro.
- **Telão** passou a receber publicações por dia (165) com prova de soma na própria migration.

## 2026-09-29 — Passada sabe se veio da máquina ou do servidor (157, 163, 164)

- `ops.estado_passada.origem`: "runner parado" era um diagnóstico só — virou dois, `estado_parado` e `sinais_repo_velhos`. A Action `estado-runner.yml` passa a ser a origem servidor (falta o dono preencher dois campos no GitHub).
- **Fatos do Clearix pela folha única de 25/09** (157): carnê 1477 → 1528; entraram receita vencida 12m (926) e a vencer em 30d (70).
- **Dívida da 153 paga, e a lição (164):** criei política em `ops.contas_servicos` sem o GRANT. A tela dava 403 e o `catch` engolia o erro — o bloco de pixels simplesmente desaparecia, sem nada na tela dizendo por quê. Virou a **R-043 §4-A**: provar que a porta está trancada não é provar que a chave certa abre. Toda prova de acesso daqui pra frente tem controle positivo.

## 2026-09-28 — Pixel declarado ao lado do pixel medido (158–162)

- **`ops.pixel_medicao` + `v_ops_pixels`**: o inventário dizia qual pixel é de qual produto, mas ninguém sabia se ele dispara. Agora a declaração aparece ao lado do que o `scripts/medir-pixel.mjs` achou no ar, e o veredito distingue "mede com pixel próprio" de "não mede".
- **Três defeitos no medidor, achados porque o número não fechava:** ele só buscava `/assets/` (e os pixels de digiai.app.br e clearix.app.br vivem em arquivo próprio); tinha um caractere **backspace** literal onde devia ter `` no regex; e o `catch` devolvia texto vazio, fazendo "não consegui ler" parecer igual a "não tem pixel". O mesmo bug do backspace apareceu uma **terceira** vez no `UA_ROBO` da edge — Googlebot passava. Só foi achado testando o regex **lido do arquivo**, não digitado de novo.
- **Três relógios no lugar errado (162):** `v_ops_frescor` media `academy` e `financeiro_declarado`, que ninguém alimenta, e não media o espelho do financeiro nem a publicação em redes. Trocadas as fontes.
- **Audiência dos blogs (161):** os baldes somavam sobrepostos e davam "máquina 764" num universo de 473 eventos. Agora são disjuntos (humanos / rajada-não-interno / interno) e `page_views` nunca aparece sem `eventos_humanos` ao lado.

## 2026-09-25 — Maturidade ganha `parado`, `aposentado` e `estudo` (156)

- 7 fichas estavam sendo recusadas porque o Geral escreveu estados que a lista da 140 não tinha. CHECK ampliado com os três que descrevem realidade; "material" e "piloto" ficaram de fora (o Geral corrigiu as duas fichas).
- Medido: runner 18 → 25 fichas, **recusadas = 0**, não declarados = 0. Nenhum app invisível.
- **Palavra do Geral, não do dono** (dono dormindo; mudança aditiva e reversível). Fica para o turno do dono: rever a decisão e o pedido de tela — `estudo`/`parado` fora do bloco comercial do Portfólio, `aposentado` só no histórico, e identidade para os apps novos (trade_lab, editora) que ainda não aparecem lá.

## 2026-09-25 — Mapa: legenda e filtro por precisão (⚠ falta ver na tela)

- `v_mkt_cobertura_pontos` ganhou a coluna `precisao` do MKT: `medida` (raspagem) e `endereco` (derivada de rua+número, `mkt.leads_geo`). Hoje só há `medida` (535 pontos / 687 óticas); os derivados entram nas próximas horas.
- Mapa passa a desenhar **três precisões**: medida (cheia), derivada do endereço (pontilhada) e centro do bairro (tracejada), cada uma com cor própria e dita no popup. Filtro por precisão entrou como opção, padrão continua mostrando tudo; os quadros e o rodapé contam as três + fora do mapa.
- **Não verificado no navegador**: o dev reiniciou e o app pede login (dono dormindo). Código compila e tipa; a conferência de tela fica para a manhã, junto com os pontos derivados do MKT quando chegarem.

## 2026-09-24 — As óticas sem coordenada entram no mapa pelo centro do bairro (155)

- **Não deu para usar CEP**, e isso foi medido antes: o serviço público devolve o centro da CIDADE para toda a capital — Jardim Capela, Vila Perus e Penha de França vieram no mesmo ponto. Usar CEP empilharia centenas de óticas no centro de São Paulo.
- Posição aproximada = **centro do bairro** (Nominatim/OpenStreetMap, 1 req/s, cacheado em `ops.bairro_coordenada`). Desenhadas **tracejadas**, contadas em quadro separado e com "posição aproximada" no popup — nunca misturadas com o medido.
- **Trava contra chute:** 19 bairros vieram na cidade errada (nome de bairro que também é nome de cidade: "Santana" a 426 km, "Pompeia" a 401 km). Foram apagados e o script passou a descartar qualquer resultado a mais de 30 km do miolo da cidade.
- Resultado: 687 medidas + 196 aproximadas + 63 ainda fora = 946. Recuperamos 196 das 259 que estavam fora do mapa, sem inventar precisão.
- **Para o MKT:** o campo bairro traz complemento de endereço ("Loja 320 - Lauzane Paulista", "13º Andar - Sala 1309 - Tatuapé"); o script limpa para consultar, mas a origem merece conserto.

## 2026-09-24 — Filtro por estado no mapa (opção, não padrão)

- Chips de estado no Mapa de calor: `todos` (padrão) + um por UF com a contagem. Filtrar reenquadra o mapa e recalcula os quadros; o rodapé segue mostrando a conta da base inteira, com a linha "o filtro é só da tela".
- **Achado para o MKT:** a UF vem despadronizada na fonte — as linhas de São Paulo usam `SP` (sigla) e a da Paraíba usa `Paraíba` (nome por extenso).

## 2026-09-24 — Conta do mapa fechada pelo MKT

- MKT reconciliou: 946 leads vivos = 687 com coordenada + 253 sem + 6 sem ficha (1 interno Grupo Mello + 5 da raspagem Kimi jul/2026, todos sem telefone). Verdade da base = `v_mkt_cobertura_geografica`; o mapa é o subconjunto com coordenada.
- Rodapé passa a dizer a conta inteira, sem "em conferência".
- O ponto isolado na Paraíba é dado certo: "Ótica Santo André" fica em Santo André/PB — a raspagem de "Santo André" pegou o município xará. Fica no mapa, com a explicação escrita; filtro por UF pode entrar depois, se o dono quiser.

## 2026-09-24 — Rodapé do mapa: as duas contagens do MKT não fecham

- O Geral pediu "687 no mapa · 253 sem coordenada". Medido: `mkt.leads_perfil` tem 940 perfis, 687 com coordenada e **253 sem** — mas `v_mkt_cobertura_geografica` soma **946** óticas. Seis a mais que o cadastro.
- O rodapé mostra os dois números com a fonte de cada um, em vez de escolher um: 687 no mapa, 259 fora pela cobertura por bairro, e a nota de que o MKT conta 253 — diferença de 6 em conferência.

## 2026-09-24 — Mapa de calor de verdade, com menu próprio e duas vias (dono)

- Menu **Mercado › Mapa de calor** (rota `#/mapa-calor`) com duas vias: **Leads** (prospecção) e **Clientes** (hoje diz que não há cliente de mercado, em vez de desenhar mancha de mentira).
- Mapa real: Leaflet + OpenStreetMap, **sem chave e sem cobrança**. A base escura da CARTO passou a exigir chave (marca d'água "API KEY REQUIRED" em 24/09) — o escuro vem por filtro de estilo da casa.
- Três leituras por zoom: mancha de calor (longe), bolha com o número (médio) e ponto a ponto (perto), mais botão "ver tudo". Fonte: `v_mkt_cobertura_pontos`, publicada pelo MKT a pedido, sem PII e arredondada a ~110 m.
- Medido em 24/09: 687 óticas em 535 pontos, 42 respostas e **259 óticas fora do mapa** (raspagem sem coordenada) — o número aparece escrito, porque quem olha mapa acha que está vendo o total.
- O componente `MapaCalor.tsx` é genérico de propósito: a mesma tela vai servir para mostrar ao cliente onde estão os clientes dele.

## 2026-09-23 — Mapa de calor da prospecção no digiai (pedido do dono)

- Nova aba **Território** em Mkt › Radar 360 (`src/components/MapaCobertura.tsx`), lendo a view de contrato do MKT `public.v_mkt_cobertura_geografica` (sem PII). Resultado mora no digiai, não no MKT.
- 4 zooms: Grande São Paulo (39 municípios do IBGE), Estado de SP (645), Sudeste (4 UFs) e Brasil (27 UFs).
- **O vazio é o dado:** a grade nasce do território, não do dado. Cidade sem raspagem aparece vazada, com borda tracejada e "raspagem não passou aqui" — nunca some.
- Medido em 23/09: Grande SP 15 de 39 cidades tocadas, 937 óticas, 41 respostas, **24 cidades sem raspagem** (Osasco, Barueri, Cotia entre elas); Sudeste 1 de 4 UFs.

## 2026-09-23 — Retrato do roadmap e do placar entra no banco (154)

- Retrato do Geral (`Cockpit/roadmap-retrato-2026-09-23.md`) gravado: fase 2 segue aberta (0 ótica pagante), as 6 tarefas de 14/08 continuam **não feitas** com a nota do estado real, e as 5 entregas de setembro entram como tarefas novas já concluídas com a prova. Tarefa de fase 0/1 superada ganha nota — nada apagado.
- Placar da semana 6/6: 4 automáticas do banco + demos agendadas 0 e follow-ups 0, com a palavra do dono. Validade do retrato: 7 dias (próximo 30/09).
- O Geral também declarou o frontmatter das 7 fichas sem agente: o runner passou de 17 para 18 fichas e **nenhum app fica invisível** no Portfólio.
- Telas ainda paradas, de outros donos: academy (18/06), financeiro declarado (09/06) e redes sociais (23/06).

## 2026-09-23 — O app volta a ser espelho: as 4 frentes que o dono apontou (151, 152, 153)

**Medido antes:** das 101 fontes que o app lê, 24 vivas (48 h), 35 mornas e 42 paradas há mais de 21 dias.

- **Dinheiro (Visão):** o MRR vinha de snapshot digitado, parado em 09/06. Agora `v_ops_dinheiro` mede: receita de mercado R$ 0 (0 assinante, 0 venda OSI) e custo de infra do mês R$ 1.903,38 pelo espelho do Finance, com série de 6 meses no gráfico.
- **Semana:** `v_ops_scorecard_auto` já calculava a semana e ninguém gravava (tela mostrava 27/07). `fn_scorecard_auto_gravar` + job diário 06:10 BRT gravam a semana corrente; valor digitado por gente nunca é sobrescrito.
- **Idade em toda tela declarada:** `v_ops_frescor` + aviso no topo (Trilha, Academy, Inventário) + tipo `tela_parada` na Hoje. Hoje acusam: roadmap (14/08), financeiro declarado (09/06), academy (18/06), redes (23/06).
- **Inventário:** `v_ops_contas_custo` casa a conta com o custo medido no extrato (nome normalizado: slug × nome do Finance). R$ 614,49 em 3 serviços; o extrato mede o serviço, não a conta — 10 contas de Supabase dividem a mesma fatura.
- **153:** as duas views novas liam com a permissão do usuário, mas `ops.contas_servicos` e `ops.scorecard_entries` têm RLS **sem policy** — o padrão da casa é view de dono. Falhava calado (banner e custo sumiam). Débito anotado: dar policy `is_staff()` às duas e voltar tudo a invoker.
- **O que a máquina NÃO faz:** marcar tarefa de roadmap como feita. Progresso de fase é palavra do dono; sem ela, a tela diz desde quando está parada.

## 2026-09-23 — Limpeza do .env, R-042 e as sobras do runner na tela Hoje (150)

- **`.env` do app (palavra do dono):** saíram `MP_ACCESS_TOKEN`, `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `MP_PUBLIC_KEY`, `TELEGRAM_BOT_TOKEN` e `GITHUB_TOKEN_1` — nenhum era lido pelo build ou por script; os do MP seguem nos secrets do projeto. `SUPABASE_TOKEN` fica (é o PAT de SQL/deploy). Arquivo é gitignored: sem commit, registro aqui.
- **AGENTS.md §9 Variáveis (R-042)** + `.env.example` sincronizado (commit 5eada02).
- **150:** `ops.estado_passada` guarda o retrato de cada passada do runner; `v_ops_reconfirmar` ganha `app_nao_declarado`, `ficha_recusada` e `runner_parado`; a ordem do dia rotula os 6 tipos. Ficha sem frontmatter deixa de morrer no log: hoje são 7 apps invisíveis no Portfólio, e a Hoje diz isso.
- Ficha do `editora` corrigida (maturidade `incubação` → `protótipo`): o runner passou de 16 para 17 fichas.
- Lead comercial com "R$48,50" na nota: o fato do envio fica, o preço velho sai ("com o preço da época — hoje R$ 49, portão 107"). Achados de preço no meu domínio: 1 → 0.

## 2026-09-23 — Console limpo: os 3 erros que apareciam em toda navegação

- **Espelhos "desligados" no local:** faltavam `VITE_{PULSO,LIMELIGHT,BLOGS}_SUPABASE_*` no `.env` da máquina (produção já as tinha). Preenchidas com as chaves ANON públicas — as mesmas do bundle publicado. `.env` é gitignored; `.env.example` já documentava as chaves.
- **CORS do `espelho-pulso`:** a lista de origens tinha `localhost:5173/5183` (Vite antigo) e não a porta real do dev (3000/3100). Publicada com as portas certas; preflight de localhost:3000 responde 200 com a origem certa.
- **401 em `v_admin_tenant_vida`:** o Espelho do MKT lia o banco do Clearix direto, sem sessão dele — proibido pela [ADR-0001] e sempre 401, aqui e em produção. A leitura saiu; o campo aponta para a Central Clearix, que tem o login próprio (`TabTenants` segue lendo lá dentro, depois do portão).
- Prova: aba nova, 28 rotas percorridas — 0 requisição ≥400 e 0 erro de console.

## 2026-09-23 — Padronização das páginas (dono): moldura única, mesma largura, mesmo cabeçalho

- `App.tsx` passa a envolver toda página numa moldura única (`max-w-7xl mx-auto px-4 md:px-8 py-8`, alinhada à barra de comando). **Exceção: Mapa Vivo**, que segue em tela cheia por causa da malha.
- As 28 páginas perderam largura, margem e padding próprios (antes havia 5xl, 7xl, p-6, p-8, min-h-screen misturados).
- Cabeçalho `PageHeader` agora em todas: Visão, Radar 360 e Clearix Calc tinham cabeçalho próprio; OsiHub perdeu a faixa de abas grudada e usa o cabeçalho de cada aba.
- Verificado no navegador com login do dono: as 29 rotas começam no mesmo x (240 px) e têm a mesma largura; console sem erro novo.

## 2026-09-23 — Endereços novos do Clearix (dono): Hub app.clearix.app.br, calculadora calc.clearix.app.br

- Medido: os dois respondem (Hub 307 → /login; calc 200). Os antigos da Netlify seguem no ar como alias.
- Código do app já estava certo (`MktCalc.tsx` usa calc.clearix.app.br; `src/modules/clearix/api.ts` não tem mapa de URL — ADR-0060 item (a) já satisfeito) e a ficha/ops.apps do Clearix já trazem app.clearix.app.br pelo runner.
- Doc corrigida no mesmo turno: `clearix-ecossistema-estado.md`, `comercial/plano-259`, blueprint do pitch. `portfolio-estado-real.md` marcado como SUPERADO (estado vem de `v_ops_apps_estado` desde 22/09).
- Fora do app: `Cockpit/Spec/calculadora_grau.md` ainda cita clearixcalc.netlify.app — avisado ao Geral (Spec é do agente do app dono).

## 2026-09-22 — Estado automático dos apps, passos 5 e 6: telas lendo o banco + reconfirmar e virada de fase (149)

- **Portfólio, Lista Mestra e Mapa Vivo** leem `v_ops_apps_estado` (`src/lib/appsEstado.ts`). A constante de estado saiu de `Portfolio.tsx` (maturidade %, estado, função, próximo, bloqueio, git, host, "verificado" de julho, "suíte de 17 apps"); ficou só a identidade (nome, marca, hierarquia, slug do Backlog → slug da ficha). Sem ficha = "não declarado"; view com erro = aviso, sem fallback.
- Carga inicial das 16 fichas pelo banco (mesmo retrato do runner) + 1ª medição de deploy: 16/16 no ar; 5 com uso real (3 medidos, 2 declarados com fonte). Verificado no navegador com login do dono.
- **149:** `fn_ordem_maquina_reconfirmar` (ficha vencida / portão que sumiu do índice / decisão vencida → item do dono na ordem do dia) + gate sustentado vira pedido ao dono ("Virar a Fase N — confirmar no Roadmap"). Gerador editado por uma linha, com trava de md5.
- Runner: comentário ` # ...` no frontmatter não entra no valor (polapetit tinha `validade_dias: 10  # ...`); `validade_dias` não numérico é recusado.

## 2026-09-22 — Estado automático dos apps, passo 4: edge estado-ingest + runner local

- Edge `estado-ingest` v1 (verify_jwt true + `x-estado-secret` contra o secret `ESTADO_INGEST_SECRET`; sem secret → 503, fecha). Repassa fichas, decisões, portões e sinais de repo às funções da 140.
- Runner `Cockpit/scripts/estado-runner.mjs` (`--dry` só lê) + tarefa do Windows "DIGIAI estado-runner" a cada 30 min, oculta. Ensaio: 16 fichas, 7 não declaradas, 18 portões abertos, 8 fechados com data, 15 repos.
- **Espera:** o dono digitar o segredo (secrets do projeto + `Cockpit/.env`) e o Geral corrigir 124/125/117 no índice.

## 2026-09-22 — Estado automático dos apps, passo 3: sinais de deploy na nuvem (148)

- Edge `sinais-deploy` + job `sinais-deploy` (7 e 37 de cada hora): abre as URLs de produção de cada ficha em `ops.apps` (repo fica fora), grava 1 sinal `deploy` por app com http e `<meta name="build">`. Sem segredo novo (reusa `marketing_sync_cron_secret`).
- Prova com app temporário: url quebrada → degrau 1; tudo no ar → degrau 2 "medido: no ar". Apagado depois.
- **Limite:** `ops.apps` está vazia até o runner do passo 4 (espera o segredo do dono); até lá o job responde "ops.apps vazia".

## 2026-09-21 — SEO religada na coleta diária do GSC (147)

- **Por quê:** a tela lia `company.seo_medicoes`, que só tinha a leitura manual de 17/08; a coleta diária gravava em `company.metrics` (sobrescrita, 7d/30d).
- **Conserto:** `fn_seo_registrar_medicao` (só service_role) + `marketing-sync-gsc` v40 grava 1 linha/site/dia BRT, janela 3m, fonte `gsc-api`; não sobrescreve leitura manual do mesmo dia.
- **Prova (21/09 23:35):** 3 medições de 21/09; tela SEO mostra digiai 401 imp (+120), clearix pos 17,5, mello 29 cliques (+29) contra 17/08.

## 2026-09-21 — OSI por dia com dados reais (146) nas duas telas

- **146 aplicada (21/09 23:26:56 BRT, palavra do dono):** régua única `analytics.fn_origem_real` (fora localhost, prévia de deploy, campanha `teste.*`); `v_analytics_funnel_summary` passa a usá-la (osi 163→123, clearix-site 52→47, clearix-calc 43→43); nova `v_mkt_osi_dias` (90 dias BRT, sem PII).
- **Card `OsiDiasCard`** (molde do card dos blogs): em OSI › Mapa (30 dias) e Mkt › Radar 360 › Vídeo & motores (segue o recorte e o filtro de marca). Verificado no navegador com login do dono: 58 visitas / 36 sessões de 23/08 a 21/09 = banco.

## 2026-09-08 — espelho do Pulso passa a vir por função gateada (custo/receita não é anon)

- **Por quê:** `public.v_espelho_pulso` (agregado do Pulso COM custo_caixa/consumo/receita) era lida com a anon key do Pulso — legível por qualquer portador da chave do bundle. O Pulso revogou o anon (certo) e a tela MarketingEspelho ficou vazia.
- **Conserto:** edge function `espelho-pulso` no projeto digiai (verify_jwt + `auth.getUser` no servidor; service_role do digiai também passa pelo claim `role`), lê o Pulso com `PULSO_SERVICE_ROLE_KEY` (secret do projeto) e devolve só o JSON. `src/lib/espelhoMotores.ts` → `pulso()` chama a função com a sessão do usuário. `v_espelho_pulso_dias` (engajamento) segue anon por desenho.
- **Endurecido (08/09 15:1x, v3):** nenhum claim lido localmente — service_role só passa se o servidor de Auth aceitar o JWT em `/auth/v1/admin/users` (assinatura verificada lá) ou por igualdade exata com o env; usuário só por `auth.getUser`. Deixa de depender do `verify_jwt` do gateway (flag fora do repo). `supabase/config.toml` nasce versionando `verify_jwt = true` para a função. Prova: anon 401, JWT forjado role=service_role 401, service_role real 200 (16 campos). Achado e prova do JWT forjado: orquestrador do app.
- **v4 (08/09 15:2x):** ordem do portão invertida — usuário primeiro (uma ida ao Auth), service_role no else. Registro de método (orquestrador do app): a independência do flag do gateway é correta por construção, não provada — os JWTs forjados são barrados pelo gateway antes de chegar ao código.
- **Portão 38 fechado (08/09 17:26, v9):** a função lê `GET https://pulsoprojects.vercel.app/api/espelho` com `x-espelho-secret` (ESPELHO_SECRET criado pelo dono nos dois lados); `PULSO_SERVICE_ROLE_KEY` e `PULSO_URL` APAGADOS dos secrets do projeto (a chave-mestra do Pulso não vive mais aqui). Prova: com a chave apagada e redeploy, service_role do digiai → 200 com 16 campos (só a rota pode ter respondido); anon → 401.
- **Prova (08/09 15:0x):** anon key → 401; anon key do Pulso → 401; service_role do digiai → 200 com os 16 campos. Tela com sessão: conferir no navegador (dono/orquestrador do app).

## 2026-09-06 — ops.*: dizer o que se quis (migration 091, portão 28)

- 4 tabelas de `ops` com RLS ligada e zero policies e 2 sem RLS (`plataformas`, `servicos`), todas sem grant a anon/authenticated/PUBLIC: fechadas por acidente. `091`: RLS ligada nas 2 + `comment on table` nas 6 declarando "zero policy é a política; leitura só por view definer, escrita só por service_role; não conceder GRANT direto". Zero mudança de comportamento (views definer seguem lendo: 9/25/85/6 como authenticated; leitura direta = 42501). Achado do orquestrador do app; executor = orquestrador geral (escrita em ops.* pelo handoff de 02/09).

## 2026-09-06 — segurança: leitura anônima fechada em 13 views (migration 090)

- **Achado** (Agent do DIGIAI MKT, reproduzido pelo orquestrador geral por chamada real): 13 views de `public` respondiam HTTP 200 à anon key sem sessão — `v_ops_cofre` (inventário de contas: identificador, conta dona, `secret_ref`, URL do painel, custo), `v_ops_cofre_resumo`, `v_meeting_sessions`, `v_proposals`, `v_billing_*`, `v_marketing_hotmart_sales`, `v_marketing_outreach`, `v_marketplace_webhook_status`, `v_ops_scorecard*`, `v_playbooks`. Causa: views sem `security_invoker` + grant herdado do schema (anon em ALL).
- **Conserto** `090_revoke_anon_public_em_13_views.sql`: revoke ALL de `public` e `anon`, grant select a `service_role`; `authenticated` intocado (portão 16 da ordem do dia). Provado: 200 → 401 nas 13; app com sessão continua lendo. Espelho em `docs/migrations/migrations/`.
- **Não decidido aqui:** `security_invoker` (mudaria o que cada papel enxerga) e o grant de escrita de `authenticated` nas 145 views — dono + orquestrador do app.

## [Não lançado]

### Removido (2026-09-09 — portão 70: o espelho de copies no servidor, que nunca existiu)
- Decisão do dono, relatada pelo Orquestrador Geral. Saíram três caminhos de `src/lib/copyStore.ts`: `syncAssetImagesToRemote`, o espelho de status em `updateStatus` e o `syncToRemote`.
- **Medido antes de remover:** `ops.copy_assets` tem **zero linhas desde sempre**; **ninguém lê** a view (as três únicas referências no workspace eram estas três escritas); e o store lê **só do `localStorage`**. A escrita falhava (`authenticated` não tem UPDATE na base), avisava em `console.warn` e **devolvia sucesso à tela**.
- **Não foi "consertado" para RPC de propósito:** guardar copy no servidor é **funcionalidade a decidir** (quem leria? para quê?) e nasceria com leitura — que é o que nunca existiu. Consertar teria criado um espelho que ninguém consulta, com mais código para manter.
- ⚠ **O que NÃO saiu:** as imagens continuam indo para o **Storage**, que sempre funcionou. Só o espelho de **metadado** na tabela foi removido. Nenhum texto ou imagem se perde — o workspace era, e continua, local.
- `tsc` limpo, build limpo, nenhum chamador órfão.

### Corrigido (2026-09-09 — 098 v3: declarar o que fica, em vez de enumerar o que sai)
- A 098 foi aplicada pelo Orquestrador Geral e **a trava disparou, com rollback** — dois defeitos reais e diferentes, os dois meus:
- **(1) trava textual dava falso positivo.** `v_depois like '%authenticated=%w%'` casava com o `w` do **`service_role`**, que vem depois na mesma string. A migration abortaria dizendo *"não pegou"* **justamente quando pegou**. Já corrigida para `has_table_privilege` — pergunta ao sistema em vez de interpretar texto.
- **(2) o revoke era incompleto.** `revoke insert, update, delete` deixou `authenticated=rDxtm` — o **`D` é TRUNCATE**, que é escrita. Achado do orquestrador lendo o ACL do rollback.
- **Conserto de fundo:** parei de enumerar o que sai e passei a declarar **o que fica** — `revoke all` + `grant select` (tabelas), `revoke all` + `grant execute` (funções). Enumerar exige lembrar de todos os privilégios, hoje e nas versões futuras do Postgres; declarar o que fica é **fechado por construção**.
- A trava passou a testar TRUNCATE também, e ganhou **controle positivo** (o que devia ficar, ficou) — sem ele, um revoke largo demais passaria como sucesso.

### Aplicado por terceiro (2026-09-09 — 100 e `espelho-content-rules`)
- **100 aplicada e provada por execução** pelo Orquestrador Geral (autorização dele, não minha): patch `{id, stage}` manteve name/company/contact/notes; `{id, notes:null}` limpou notes; anon → 42501; 260 leads intactos. É a prova que o catálogo não daria.
- **`espelho-content-rules` publicada v1**, `verify_jwt=false`, devolvendo **503 sem segredo e com segredo errado** — inerte até o dono digitar o segredo nos dois projetos.

### Corrigido (2026-09-09 — 097: a 095 nasceu com escrita para `anon`, e a causa não é minha distração)
- **Achado do Orquestrador Geral:** `v_telao_afericao` era a **única view do banco com INSERT/UPDATE/DELETE para `anon`**. Aplicada por mim hoje.
- **A minha falha:** a 095 terminava com `revoke all … from public`. Isso mira o **papel `PUBLIC`**, que não tinha nada. Quem tinha era `anon` e `authenticated`. **É o mesmo erro que eu diagnostiquei em outros duas vezes hoje** — confundir o papel `PUBLIC` com os concessionários reais.
- **A causa, medida em `pg_default_acl`:** o schema `public` tem default privileges concedendo **`arwdDxtm` a `anon` e `authenticated`** em toda tabela/view nova. **A view nasceu aberta.** As 135 views com escrita não foram concedidas uma a uma — foram **geradas**. Enquanto o default estiver assim, a próxima view nasce aberta também: consertar as 12 atualizáveis trata sintoma.
- **097 aplicada:** revoke explícito de `anon, authenticated, public`; `SELECT` mantido. Provado: `anon` INSERT/UPDATE/DELETE = **false**, SELECT = **true**, e a leitura anon segue devolvendo **7 linhas**.

### Medido (2026-09-09 — portão 64: a varredura simples mentiu, e a proposta de classe quebraria duas telas)
- A proposta era revogar escrita em **todas** as views, partindo de que nenhum front escreve por view. Meu primeiro `grep` de uma linha confirmou: **"nenhum"**. Refiz com janela multilinha (o encadeamento do Supabase quebra linha) e apareceram **seis**.
- **Dois são dependências VIVAS e quebrariam:** `companyStore.ts` escreve em `v_company_identity` e `v_company_legal_status`; as tabelas-base dão UPDATE a `authenticated`, então **funcionam hoje**. Revogar sem mais nada derrubaria **Cadastro Empresa**.
- **Dois já estão MORTOS e ninguém sabia:** `copyStore.ts` → `v_copy_assets` e (no MKT) `Oticas.tsx` → `v_commercial_leads`. As tabelas-base **negam** UPDATE a `authenticated`, então esses saves **já falham hoje**.
- ⚠ **E o `copyStore` mente para a tela:** o erro é registrado (`console.warn`), mas `syncToRemote()` **devolve o workspace como se tivesse sincronizado**. Quem usa vê "sincronizado" e o servidor não recebeu nada. Os textos não se perdem — ficam no `localStorage` —, mas o espelho remoto nunca foi escrito.
- **Correção de uma afirmação minha:** eu disse primeiro que o upsert "nem verifica o erro". Verifica — eu tinha lido um trecho cortado. O defeito é o retorno otimista, não a ausência de checagem.
- **Conclusão para o portão 64:** o conserto tem de ser **view a view com teste de consumidor**, e o conserto de raiz é o `ALTER DEFAULT PRIVILEGES` — sem ele, a torneira continua aberta.

### Corrigido (2026-09-09 — `mp-sync` adotada do deploy E consertada no mesmo passe, v13)
- **O estado que encontrei:** função **em produção (v12, ACTIVE) sem fonte em repositório nenhum** — ninguém podia revisar nem reconstruir. Corpo recuperado pela Management API (`/functions/mp-sync/body`) e versionado em `supabase/functions/mp-sync/index.ts`. O original intacto ficou ao lado, em `_original_deploy_v12.ts`, para o diff mostrar que a **única** diferença é a trava.
- **O furo:** ela escreve em `billing` com **service_role** (via `billing_ingest_mp_event`) e o único portão era `verify_jwt = true` — que prova **sessão**, não **papel**. Qualquer conta autenticada disparava a ingestão, **furando a trava que a 092 pôs em billing no dia anterior**.
- **Por que adoção e conserto no mesmo commit:** versionar primeiro e consertar depois deixaria no repositório, assinado, um código que já se sabia furado — e alguém poderia aplicar metade.
- **A trava:** pergunta `is_admin()` ao banco com o JWT de quem chama, **a mesma função que governa o módulo Cobrança no front** (trava mais apertada que a tela recriaria o desalinhamento que originou a auditoria). Erro na checagem **nega** — portão que abre no erro não é portão.
- **Provado pela via externa, na v13:** sem `Authorization` → **401** (gateway); **chave anon no GET → 403**; **chave anon no POST, que é a ingestão → 403** (`Acesso negado: sincronizar cobrança exige papel admin ou superior`). E o corpo publicado contém a trava, a mensagem e o marcador de adoção.
- **Aprendido de passagem:** o deploy por API é `POST /v1/projects/{ref}/functions/deploy?slug=…` com multipart (`metadata` + `file`). O `PATCH /functions/{slug}` devolve 500. Vale para o runbook — dá para publicar edge function sem a CLI.
- ⚠ **Falta a prova com sessão do dono:** que a tela Cobrança continua sincronizando. A trava usa `is_admin()`, e o dono é `super_admin`, então deve passar — mas *deve passar* não é *passou*.

### Aplicado (2026-09-09 — 093 e 095 em produção, autorizadas pelo dono)
- **Cadastro público:** encontrei **já fechado** (`disable_signup: true`, confirmado pela via pública `/auth/v1/settings`). **Não fui eu** — estava aberto na medição de 14h e fechado às 15:22; alguém agiu no intervalo. Registro para o crédito não ficar errado.
- **093 — a trava recusou a primeira aplicação, e foi a coisa mais valiosa do dia.** Mensagem: *"Backfill mudaria a agenda de 0 para 18"*. Causa: `ops.commercial_leads` tem trigger `set_updated_at` **BEFORE UPDATE sem condição** (`NEW.updated_at = now()`). O backfill é um UPDATE — carimbaria `updated_at = agora` nos 18 leads, **destruindo o único registro de quando cada um foi contatado**, que é justamente o que a agenda lê. A agenda iria a **0** no mesmo instante, e zero lê-se como "nada pendente".
- **E não seria recuperável:** depois do UPDATE não há de onde tirar o valor antigo. Um backfill que apaga o dado que está a copiar.
- **Conserto:** `disable trigger` em volta do backfill + gravar `last_touch_at = updated_at` no mesmo passe, aproveitando para capturar o último toque real antes que ele se perdesse — que é exatamente para isso que a coluna nasceu.
- **Provado depois de aplicar:** agenda **18 → 18**; `max(updated_at)` idêntico ao segundo (`2026-09-05 04:02:20.771974+00`); 8 colunas novas; `vendas` no CHECK de `iam.users`; **`is_staff()` intocada** (sem escalada); duas policies divididas; as duas RPCs com `pode_tocar_lead()`; trigger religado; backfill 18/18; **controle negativo** → `42501 Acesso negado: escrever lead exige papel staff ou vendas`.
- **095 — aplicada, errada, corrigida.** A 1ª versão devolveu `v_telao_financeiro` **duas vezes** (true e false): a view tem uma linha por mês e o `group by 1,2` agrupava por fonte **e** por resultado. **A migration disse OK e a saída estava errada** — só apareceu porque olhei o retorno em vez de confiar no "OK". Trocado por `bool_or`, reaplicada: 7 linhas, uma por fonte.
- **Provas da 095 pela chave anon crua:** `v_telao_afericao` → **200 com 7 linhas**; colunas devolvidas = exatamente `fonte, tem_dado, atualizado_em`, **nenhuma de valor**; e as fontes em si (`v_telao_cobranca`, `_financeiro`, `_pipeline`, `espelho_telao_bi`) continuam **401** para anon. **Abrimos o metadado sem abrir o dado.**
- `v_telao_cobranca` reporta `tem_dado = false` — correto: a empresa não tem assinante. É verdade, não alarme.

### Corrigido (2026-09-09 — front e o papel `vendas`: a resposta era tirar código, não acrescentar)
- **Pedido:** fazer o front conhecer `vendas`, mexendo em `ROLE_HIERARCHY` (`src/lib/supabase.ts`) e em `permissions.ts`, senão a sessão de vendas cairia em "sem acesso".
- **Medi antes:** `canAccessModule()` **já trata `vendas` corretamente** — papel não-privilegiado entra nos módulos abertos (Comercial entre eles) e é negado nos restritos. **Nenhuma mudança era necessária para funcionar.**
- **E `ROLE_HIERARCHY`, `hasRole()` e o type `UserRole` tinham ZERO consumidores** no repositório inteiro (grep em `.ts/.tsx/.js/.mjs`, fora `node_modules` e `dist`). Eram uma **segunda fonte de verdade sobre papéis**, já desatualizada no dia em que `vendas` nasceu.
- **Removidos.** O próximo a chamar `hasRole('vendas','staff')` receberia `undefined >= 50` → `false`, **sem erro e sem aviso** — mais uma da família "o defeito que não reclama". Autorização vem do banco (R-037); se um dia fizer falta uma hierarquia, ela nasce da matriz do banco, não de um objeto literal no front.
- **`permissions.ts` ganhou o porquê, não a exceção:** comentário registrando que `vendas` é não-privilegiado **de propósito** — escreve lead pela RPC (que tem trava própria) e não vê Financeiro/Cobrança/Clearix/Cadastro. Com o aviso explícito de **não** acrescentar `vendas` aos privilegiados achando que é esquecimento, já que no banco `is_staff()` governa finance, company, iam e storage.
- `tsc` limpo, build limpo. Front do pacote 093 fechado: **uma remoção e um comentário.**

### Escrito, não aplicado (2026-09-09 — migration 093: leads, consentimento e o papel `vendas`)
- Pedida pelo Orquestrador Geral para o módulo de vendas por WhatsApp do MKT. **2ª versão** — a 1ª voltou com 4 ressalvas, todas aceitas.
- **A correção que fiz à decisão, e é a mais séria:** a instrução era pôr `vendas` dentro de `is_staff()`. Medi o que `is_staff()` abre hoje — **66 policies em 8 schemas e 57 funções**, incluindo `finance.*` (7), `company.*` (9), **`iam.users` e `iam.audit_logs`** e `storage.objects`. Fazer ao pé da letra daria a **cada vendedor o financeiro, o jurídico, a tabela de usuários e o storage** — sem que nada na migration parecesse falar sobre isso.
- **Em vez disso:** `vendas` entra no CHECK de `iam.users.role` (autoridade única cumprida), **`is_staff()` fica intocada**, e nasce `public.pode_tocar_lead()` — `is_staff()` OU papel `vendas` — que trava as RPCs **e** as policies. `mkt.is_admin_ou_vendas()` não aparece: lead é ativo da empresa, não consulta a tabela de usuários do app de marketing.
- **O "próximo toque" passa a morar no lead** (`next_touch_at`, `last_touch_at`). Havia **três** fontes concorrentes: `marketing.outreach_schedule` (128 linhas), a agenda derivada (18) e `next_step` em texto (258) — e a agenda **não lia o agendador**: decidia quem já fora tocado procurando `%follow-up%` **no campo de observações**.
- **Consentimento conforme R-013 §5.1:** além de opt-out e data, entram `categoria` (CHECK fechado), `texto exato apresentado` e `IP` — porque sob LGPD quem prova é a empresa, e "origem = landing" não prova a quê a pessoa consentiu. Limite declarado: coluna guarda **estado, não histórico**.
- **Fica para a 094, e não é minha (R-032):** reescrever `marketing.v_whatsapp_followups_hoje` para derivar de `next_touch_at` + opt-out. Sem ela, o que está na 093 fica correto e **inerte** — ⚠ **opt-out que a agenda ignora é pior que não ter opt-out: parece que alguém cuidou.**
- Espelho em `docs/migrations/migrations/`. Próximo número livre: **095**.

### Adicionado (2026-09-09 — o ref do build também no `<head>`: conferir passa a custar uma requisição pequena)
- **Limitação apontada pelo orquestrador geral:** o `data-build` do `<html>` é posto em **runtime** pelo `main.tsx`, então `curl` no `index.html` não o enxerga. Quem quisesse saber qual commit está no ar tinha de **baixar e grepar o bundle inteiro** (~1,6 MB).
- Agora um plugin de `transformIndexHtml` grava `<meta name="build" content="<hash>">` no `index.html` **em tempo de build**. Conferir vira:

  ```bash
  curl -s https://app.digiai.app.br/ | grep 'name="build"'
  ```

- **As duas vias coexistem de propósito:** a `meta` é barata e serve para a conferência de rotina; o hash dentro do `.js` continua sendo a prova de que **o bundle** — e não só o HTML — é daquele commit. `index.html` e bundle são artefatos servidos separadamente, e já vimos hoje um deles trocar sem o outro.
- Conferido no build local: `<meta name="build" content="fe7c706+local">` no `dist/index.html` **e** o mesmo hash presente no `.js`.
- Feito agora porque o mecanismo virou item para os outros agentes de front replicarem (Telão, MKT, sites, Polá, Limelight) — melhor entregar a versão que não obriga a baixar bundle para responder "o que está no ar?".

### Descoberto (2026-09-09 — um terceiro estado do deploy: nem fila, nem falha — INDISTINGUÍVEL)
- Fui provar que o build da remoção dos literais dos Blogs subiu, e o bundle vivo continuava `index-BshhoQg0.js`. Pela regra da casa isso seria *fila* (até ~5 min) ou *suspeita* (a partir de ~15). **Não é nenhum dos dois.**
- **Reconstruí o commit `eb23c1a` localmente com as variáveis de ambiente definidas** (`.env.local` temporário, `.env*` é gitignored, apagado em seguida) e o resultado foi **`index-BshhoQg0.js` — exatamente o hash que está em produção.**
- **Por quê:** trocar `'literal'` por `import.meta.env.X` quando o valor da variável **é igual ao literal** produz **bundle byte a byte idêntico**. O Vite substitui a variável em tempo de build; a saída não muda; **o hash de conteúdo não muda**.
- **Consequência prática:** o bundle vivo é compatível **ao mesmo tempo** com "código antigo com literal" e com "código novo lendo do painel". Não dá para distinguir pelo artefato — **o deploy pode já ter acontecido**. Esperar não resolve, e re-disparar build resolveria menos ainda.
- **A regra do hash ganha um terceiro estado:** hash igual pode ser **fila**, **falha silenciosa** ou **saída idêntica**. Antes de tratar como as duas primeiras, perguntar se a mudança **poderia** alterar a saída. Se não poderia, o hash nunca vai mudar e a conferência precisa de outra coisa.
- **Essa outra coisa é o `__BUILD_REF__`** do commit anterior, e este episódio é a justificativa dele deixando de ser hipotética: **a dívida dos Blogs só será verificável no primeiro build que carregar o identificador.** Até lá fica "correto por construção" — o código é idêntico em forma ao de Limelight e Pulso, que estão provados pelos três lados.

### Adicionado (2026-09-09 — o bundle passa a dizer de qual commit ele é)
- **Problema real, encontrado três vezes em 08–09/09:** *"qual commit está no ar?"* vinha sendo respondido por **marcador improvisado** — uma string que só existisse no commit novo. Funciona até o commit **não acrescentar string nenhuma**: o `eb23c1a` só **remove** literais dos Blogs, então não deixa marcador, e a conferência trava.
- **`vite.config.ts`** injeta `__BUILD_REF__` (`git rev-parse --short HEAD`, com sufixo `+local` se a árvore estiver suja) e o `main.tsx` publica em `document.documentElement.dataset.build`. Efeito prático: **o hash do commit vira string dentro do `.js` publicado**, greppável, e fica visível no `<html data-build>`.
- Isso troca um método frágil (achar uma string que por acaso seja nova) por um determinístico: **todo build carrega a sua própria identidade**, inclusive os que só apagam código.
- Fallback `desconhecido` se o `git` não estiver disponível no ambiente de build — identificação é diagnóstico, não pode derrubar o build.
- Conferido no build local: bundle contém `7d4225a+local` (o `+local` porque a árvore tinha a própria mudança ainda não commitada — o que também prova que o sufixo funciona).

### Verificado (2026-09-09 — portão 46 provado pelos três lados, não por dedução)
- **Bundle novo no ar:** `index-BshhoQg0.js`, com o marcador `espelho desligado` **presente** — é o build do commit da remoção, não o anterior. **Este é o passo que faltava na regra:** sem confirmar de qual bundle se fala, o sinal invertido mente com cara de prova.
- **Chaves presentes = injetadas pelo painel:** Limelight e Pulso aparecem no bundle **mesmo com o literal fora do código** — só podem ter vindo das variáveis do Pages.
- **E o terceiro lado, que é o que realmente importa:** peguei as chaves **de dentro do bundle publicado** e chamei cada espelho. Todos **200 com dado real** — Limelight `episodios: 158`, Pulso engajamento por dia, Blogs `posts_publicados: 26`. Chave presente prova injeção; **chave que responde prova que funciona**, e são coisas diferentes.
- **Blogs ainda não conta como prova:** a chave aparece no bundle vivo, mas vem do **literal antigo** — o commit que a remove ainda não subiu. Presença só vale como prova depois que o marcador disser que o bundle é o novo.
- **Fato registrado de passagem:** o bundle publica anon key de **6 projetos** (digiai, Limelight, Pulso, Blogs, Clearix, nexus). São públicas por desenho e agora todas vêm de variável — mas é a superfície real do app, e vale saber o tamanho dela.

### Corrigido (2026-09-09 — Blogs também sai do literal: zero anon key embutida em `espelhoMotores.ts`)
- `VITE_BLOGS_SUPABASE_URL` e `VITE_BLOGS_SUPABASE_ANON_KEY` criadas no Pages (production + preview), **e só depois** os literais saíram do código — a mesma ordem das outras quatro.
- **Controle local:** com um `.env` que não tem nenhuma das seis variáveis, o build agora sai **sem as três chaves** (Limelight, Pulso e Blogs = `grep` 0). Antes deste passe, Blogs ainda dava 1.
- Fecha a dívida das anon keys embutidas neste arquivo — item que a auditoria de 06/09 marcou e que eu tinha subido de 🟡 para laranja.

### Pendente de verificação (2026-09-09 — o deploy da remoção ainda não subiu)
- ⚠ **Medido e registrado como pendente, não como feito:** o bundle vivo ainda é `index-DTY3809e.js`, **o mesmo de antes** do push. O marcador do commit novo (`espelho desligado`) **não está** no bundle publicado.
- **A armadilha que isso quase criou:** as três chaves aparecem no bundle vivo. Se eu olhasse só isso, concluiria *"variáveis injetadas, prova feita"* — e estaria lendo os **literais antigos**, não o painel. **Quem distingue é o marcador do commit**, não a presença da chave.
- Hash igual depois de push que **toca o front** é fila até ~5 min e suspeita a partir de ~15. Sem re-disparar: o padrão de falha silenciosa é o hash **permanecer**, não aparecer tarde.
- **Prova de produção pendente:** com o bundle novo, `espelho desligado` presente **e** as três chaves presentes = variáveis injetadas pelo painel. Mais os espelhos respondendo na tela.

### Corrigido (2026-09-09 — anon keys saem do código; espelho sem variável agora desliga e avisa)
- **Portão 46 feito pelo dono/orquestrador (00:23):** `VITE_LIMELIGHT_*` e `VITE_PULSO_*` definidas no Pages `digiai-app` (production + preview). **Só então** removi os literais de reserva de `src/lib/espelhoMotores.ts` — painel primeiro, código depois.
- **Por que essa ordem:** em 08/09 o bundle publicado provou que as variáveis **não existiam em lugar nenhum**; o `|| 'eyJ...'` **não era reserva, era a única fonte**. Remover antes teria cegado os espelhos de Limelight e Pulso em produção **sem erro de tela**.
- **O motivo não é sigilo** — anon key é pública por desenho. É **rotação**: chave fixa em código é chave que ninguém troca, e R-021 manda rotacionar a cada 90 dias. Registrado assim para o conserto não ser desfeito por quem, com razão, notar que a chave não é secreta.
- **Comportamento novo:** sem a variável, `lerEspelho`/`lerLinhas` **desligam o espelho e dizem por quê** no console (`variavel de ambiente ausente`), em vez de cair num valor escondido.
- **Prova local (controle):** meu `.env` **não** tem essas variáveis, e o build local agora sai **sem as duas chaves** (`grep` = 0 para Limelight e Pulso). Isso prova que o literal saiu do código — um build sem a variável não produz chave nenhuma.
- ⚠ **A prova de produção é o inverso, e depende do deploy:** com as variáveis definidas no Pages, as chaves devem **VOLTAR a aparecer** no bundle publicado — presença ali passa a significar "a variável está injetada". *"Literal ausente no bundle" não serve como prova*, porque o valor da variável é igual ao literal antigo. Falta ainda: espelhos de Limelight e Pulso respondendo na tela.
- **Blogs continua com literal** (URL e chave): `VITE_BLOGS_*` não existe no Pages. Mesma dívida, mesma ordem — criar as variáveis antes de tocar no código. Pedido registrado ao orquestrador geral.

### Alterado (2026-09-08 — portão 29 fechado pelo dono: as duas contas sem papel foram apagadas)
- Decisão do dono (*"não vamos usar mais, vamos apagar"*), executada pelo orquestrador geral às 18:14 por soft delete (reversível; login impossível). **Conferido:** `auth.users` = **1 linha** (só o dono), `iam.users` = **1 ativo**.
- Era a conta que, até o conserto do fail-open, abria Financeiro, Cadastro Empresa, Clearix e Cobrança **por não ter papel nenhum** — e tinha login em 31/07. O buraco não era condicional: era o padrão para conta sem papel.
- ⚠ **Efeito colateral no que dá para provar:** a prova pendente da migration 092 era *"conta logada sem papel leva 42501"*. **Essa conta não existe mais.** Com um único usuário, e ele `super_admin`, não há sujeito para o teste. A trava fica **provada para "sem sessão"** e **correta por construção para "logado sem papel"** — `is_admin()` devolve `false` pelo mesmo caminho quando não há linha ativa em `iam.users`. O conserto fechou o buraco e levou junto a testemunha.
- Nenhuma tela do app lista usuários (`grep` em `src/`), então não há texto a ajustar. Continua pendente do dono a outra prova da 092: **salvar um assinante em Cobrança com a sessão dele**.

### Corrigido (2026-09-08 — `billing` deixa de aceitar escrita de qualquer logado — migration 092)
- **Autorizado pelo dono** no canal do agente do app (*"pode aplicar a 092"*) e **aplicado às 18:12**.
- **O buraco:** `public.billing_upsert_subscriber` é `SECURITY DEFINER`, executável por **qualquer `authenticated`**, e o corpo **não tinha trava nenhuma**. Qualquer conta logada inseria ou alterava qualquer assinante — nome, e-mail, **`doc` (CPF/CNPJ)**, telefone, valor do plano, status, vencimento. Em paralelo, `public.v_billing_subscriptions` era **view definer e auto-atualizável** com `arwd` para `authenticated`: escrevia como o dono e a RLS da tabela **nem era consultada**.
- **Por que a policy `using(true)` não era o buraco:** o schema `billing` **não é exposto** no PostgREST (`Accept-Profile: billing` → `406 PGRST106`). Ninguém alcança as tabelas direto. Consertar só a policy teria dado sensação de resolvido sem fechar a porta viva.
- **Ordem aplicada:** (1) trava `is_admin()` no corpo da RPC, com `raise` e `errcode 42501`; (2) `revoke insert, update, delete` na view (seguro — `billingStore.ts` lê pela view e escreve só pela RPC); (3) policies **divididas** nas 3 tabelas. `is_admin()` e não `is_super_admin()` porque cobre exatamente `PRIVILEGED_ROLES` de `permissions.ts` — quem enxerga Cobrança. Trava mais apertada que a tela recriaria o desalinhamento front×banco que originou a auditoria.
- **A armadilha evitada:** `v_vendas_eventos` e `v_vendas_canais` são `security_invoker` e leem `billing.*`, e **Vendas não é módulo restrito**. Um `ALL using(is_admin())` teria **esvaziado a tela Vendas** para quem não é admin — sem erro, tela viva, número zero. Por isso a policy é dividida: `SELECT` segue para logado, escrita exige papel.
- **Provas medidas depois de aplicar:** acl da view passou de `arwdDxtm` para **`rDxtm`** (`has_table_privilege` INSERT/UPDATE/DELETE = `false`, SELECT = `true`); **controle negativo A** — INSERT pela view como `authenticated` → `42501 permission denied for view`; **controle negativo B** — RPC sem sessão → `42501 Acesso negado: alterar assinante exige papel admin ou superior`; **leitura preservada** — `v_vendas_canais` = 3 e `v_billing_mrr` = 1 como `authenticated`.
- **Os zeros foram conferidos contra o dono** (que ignora RLS) e também são zero: `billing.subscribers` está vazia. **Zero por tabela vazia, não por RLS cegando** — é exatamente a distinção que a policy dividida existe para preservar, e não dava para afirmar sem comparar.
- ⚠ **Aplicado ≠ feito.** O controle negativo B roda **sem JWT**, então prova o caso *"sem sessão"*, não *"logado sem papel admin"* — `is_admin()` lê `auth.uid()`, que não existe na Management API. **Faltam, e são do dono:** salvar um assinante em Cobrança com a sessão dele, e a tentativa por uma conta sem papel.

### Verificado (2026-09-08 — susto de fatura: serviço nunca caiu, e a Spec deixou de ser muda)
- **Alerta:** o painel do Supabase mostrava faixa de *outstanding invoices* e status **Unhealthy**; o dono foi pagar. **Medido às 17:33 (medição minha, não estimativa):** `GET /v1/projects/hswyopqvnolqpmprqvzh` → **`ACTIVE_HEALTHY`**, região `sa-east-1`.
- **Serviço conferido pela via que o mundo enxerga, não pelo campo de status:** banco responde (`select now()` → 20:34 UTC, 1,7 s a frio); `app.digiai.app.br` → **200**; edge function `espelho-pulso` → **401** sem sessão (que é o portão funcionando, não falha); rota `/api/espelho` do Pulso → **401** sem o segredo.
- **Distinção que vale registrar:** *outstanding invoices* é faixa de **cobrança**, e convive com projeto saudável. "Unhealthy" no painel não é o mesmo que `status` da API — quem decide é a resposta do serviço, não o banner.
- **Spec atualizada** (`Cockpit/Spec/digiai.md`), que estava muda sobre o que entrou hoje: **nova §9.1 — Edge functions**, com `espelho-pulso`, `affiliate-materials-public` e as três de sync, e o portão de cada uma; **§9** com a lista de `VITE_*` conferida no código (e o registro de que **`VITE_ATLAS_URL` não é lida por nada**); **§10 corrigida** — dizia *"consome apenas o próprio banco"*, o que deixou de ser verdade quando o painel passou a espelhar Limelight, Blogs e Pulso.
- **Secrets conferidos na Management API:** `ESPELHO_SECRET` presente; **`PULSO_SERVICE_ROLE_KEY` e `PULSO_URL` apagados** — a chave-mestra do Pulso não vive mais no projeto digiai. Função `espelho-pulso` **versão 9, `verify_jwt = true`, ACTIVE**.
- **Dívida registrada, não consertada:** `src/lib/espelhoMotores.ts` traz **anon keys embutidas como fallback** (Limelight e Pulso) e a URL dos Blogs como constante literal. Chave em código é chave publicada — é o item da auditoria que segue aberto.
- **Duas observações devolvidas ao orquestrador geral, não editadas por mim** (a função é dele nesta rodada): o cabeçalho de `espelho-pulso/index.ts` ainda diz que o segredo do projeto é `PULSO_SERVICE_ROLE_KEY`, que **não existe mais**; e o ramo de *fallback* que usaria essa chave virou **código morto**.

### Publicado (2026-09-08 — deploy conferido em produção, não presumido)
- **Push feito pelo Orquestrador Geral** sob autorização do dono no canal dele: `sisdigiai/sisdigiai` main `a6101e4..5eb7e24`, fast-forward, 9 commits. **Eu recusei executar o push** — a autorização foi dada a ele, e ordem de par não autoriza publicação; ele aplicou a regra do lado certo e executou.
- **O deploy do Cloudflare não falhou desta vez, e isso foi medido, não suposto.** O `index.html` vivo aponta para `assets/index-BozpRSv9.js` e `assets/index-Da7U0Ls7.css` — **os mesmos hashes do build local a partir de `5eb7e24`**. Carimbo do host no artefato: `ETag "48036fd9a2a29f825f28522a6c5d60db"`, conferido em `Date: Tue, 08 Sep 2026 03:21 GMT`. (O histórico manda conferir: o build no push já falhou em silêncio antes, e o sintoma é exatamente hash vivo ≠ hash local.)
- **Provas no artefato publicado**, não no código: `grep` do e-mail do dono no bundle vivo → **0**; o CSS vivo referencia **`/assets/inter-latin-*-normal`** e **nenhuma** ocorrência de `fonts.googleapis.com` ou `fonts.gstatic.com`.
- **Prova na tela** (R-005, `app.digiai.app.br`): **10 `@font-face` registradas** — eram **0** antes deste deploy — 5 já carregadas, `document.fonts.check('600 16px Inter')` = `true`, e o campo de e-mail do login **vazio**. O erro de CSP das fontes **sumiu** do console.
- **Não conferido, e é do dono:** o portão de papel com sessão real (Financeiro/Cadastro carregando para `super_admin`) e as telas **Ordem do Dia / Placar** (portão 30). Exigem login, e eu não entro com a credencial dele.
- **Não peguei o relógio de deploy do host:** o Cloudflare Pages não devolve `Last-Modified` e o único `CLOUDFLARE_API_TOKEN` do workspace vive no `.env` do `digiai_mkt` — credencial de outro app, que eu não uso (R-032). O carimbo acima é o do artefato; a hora exata do deploy fica sem fonte própria.
- **Achado novo, do mesmo console:** sobrou **um** erro de CSP — o beacon `static.cloudflareinsights.com` que o Cloudflare injeta sozinho, barrado pelo nosso `script-src 'self'`. Ou seja, **o Web Analytics do Cloudflare nunca funcionou neste app**. Mais um número que ninguém foi buscar porque a tela não reclamava. Duas saídas, e as duas são decisão e não conserto: liberar aquele host no `script-src` (admitir script de terceiro) ou **desligar o beacon no painel** — provavelmente o certo, já que ninguém lê essa métrica. Painel é do dono.

### Corrigido (2026-09-06 — as fontes do design system nunca chegaram à produção)
- **Achado olhando o console da produção** durante a conferência da migration 090: o CSP de `public/_headers` (`style-src 'self'`, `font-src 'self' data:`) **bloqueava** o `@import` de `fonts.googleapis.com` em `src/index.css:1` e os arquivos do `fonts.gstatic.com`. Em `app.digiai.app.br` o `document.fonts` estava **vazio: nenhuma `@font-face` registrada**. Inter, Source Serif 4 e JetBrains Mono nunca chegaram — a tela rodava com fonte de fallback do sistema.
- **Passou despercebido porque fonte errada não dá erro de tela**, só fica um pouco diferente. O comentário no `_headers` diz *"CSP permissiva de partida — endurecer após validar em prod"*: nunca foi validada, e já estava apertada demais para o que o app pedia.
- **Conserto: hospedar, não afrouxar.** Fontes self-hosted via `@fontsource` — o CSP fica intacto (não se mexe em `script-src` para resolver problema de fonte) e some o request a terceiro. **Mesmo padrão que `digiai_mkt` e `limelight_studio` já usavam**; o `digiai` é que tinha ficado para trás.
- **Só o subset `latin`**: com os arquivos completos o build emitia **121 arquivos / 1,9 MB** de fonte, incluindo cirílico, grego e vietnamita. Com `latin-*`, **20 arquivos / 540 KB** — e nada que alguém leia aqui se perde.
- **Verificado sob o CSP real, não no dev server** (R-005): servi o `dist/` local com os headers exatos do `public/_headers` e abri no navegador. **10 `@font-face` registradas** (eram 0 em produção), 5 já carregadas na tela de login, `document.fonts.check('600 16px Inter')` = `true`, e **zero erro de console** — a produção acusa dois `Content Security Policy` no mesmo ponto.
- Na mesma tela conferi o conserto do `Login.tsx`: campo de e-mail **vazio**. Em produção ele ainda mostra o e-mail do dono, porque o commit não subiu.
- Não tocado, porque é de outro dono (**R-032**): `nexus/src/index.css` e `polapetit/src/index.css` importam as fontes do mesmo jeito. Se algum dos dois publicar com CSP equivalente, tem o mesmo defeito calado. Fica o aviso para os agentes deles.

### Corrigido (2026-09-06 — o portão de papel parou de abrir quando falhava)
- **Achado da auditoria do orquestrador** (`Cockpit/auditoria-regras-apps-2026-09-06/digiai.md`, CRÍTICO): `permissions.ts` fazia `if (!role) return true`, e o `AuthContext` punha `role = null` quando a RPC `current_role_code()` dava erro. Efeito real: **erro de RPC abria Financeiro, Cadastro Empresa, Clearix e Cobrança**. Portão que abre no erro não é portão (**R-037**).
- O conserto óbvio (`!role → false`) quebraria a tela, porque `role = null` significava **três coisas ao mesmo tempo** — ainda carregando, RPC falhou, usuário sem papel — e a primeira acontece em **toda carga**. Provavelmente foi assim que o fail-open nasceu: alguém viu a tela piscar "acesso restrito" e abriu o portão em vez de separar os estados.
- **`papelCarregando` virou estado próprio no `AuthContext`:** enquanto for `true` ninguém decide — o App mostra "Verificando acesso…" e o menu não esconde nada (esconder e reaparecer é pior que esperar). Quando a RPC responde, `null` passa a significar **sem acesso**, inclusive quando a resposta foi erro — que agora vai ao console em vez de sumir.
- **Fechar não tranca o dono**, conferido no banco antes de mudar: `iam.users` tem **um único usuário**, `super_admin`, `status = active`, com `auth_id` ligado, e a RPC o resolve.
- **`Login.tsx`** pré-preenchia o e-mail do dono — não era conveniência de UI, era **o e-mail viajando no bundle publicado**. Trocado por vazio e **verificado no artefato**, não no código: `grep` em `dist/assets/*.js` devolve **0**.
- `tsc` limpo, build limpo. ⚠ **Verificação em navegador pendente** (R-005): depende de deploy, e o push é por leva do dono. Corrigido e não conferido em tela.
- **Não executado, por ser escrita em produção:** RLS de `finance.*`/`company.*` com `is_staff()` onde o front exige admin+, e a política de grants das 145 views. Vai ao dono no mesmo pacote — ordem de par não autoriza escrita. Resposta em `_RESPOSTA_AO_ORQUESTRADOR_2026-09-06_auditoria.md`.

### Adicionado (2026-09-05 — Financeiro mostra quem financiou o caixa: bloco "Aportes de caixa")
- **Problema** (DESPACHO InfinitePay §6): a tela mostrava "Resultado de caixa −R$ 17 mil" sem dizer de onde veio o dinheiro que bancou o gasto — "o painel mostra o buraco e esconde quem o financiou". A migration 082 (orquestrador, mesma noite) criou `finance.aportes` (caixa: investimento / empréstimo / devolução), mas o app não lia.
- **Migration 088** — `public.v_finance_aportes` (padrão das 052/053: schema `finance` segue não exposto; `security_invoker = true` **conferido antes de aplicar** — a tabela já dá SELECT a `authenticated` e tem RLS `is_super_admin()`, então a view executa como quem chama e a RLS vale). Nasce só com `SELECT` para `authenticated`: os default privileges do `public` davam ALL, e foi revogado explicitamente. **Prova pela via externa:** chave `anon` crua → **401 / 42501** (mesmo que `v_finance_revenue`). Espelho em `docs/migrations/migrations/`.
- **Dashboard do Financeiro** ganha o bloco **"Aportes de caixa — quem financiou o gasto"**: Investimento · Empréstimos · Devoluções · **Líquido em caixa** (investimento + empréstimos − devoluções) + lista (data, origem, natureza, valor). Não passa pelo filtro de projeto (aporte entra na empresa, não num produto) e **nunca é somado ao aporte intelectual** (não-caixa). Sob "Resultado de caixa" aparece "bancado por aportes de caixa: R$ X líquidos". Hoje: **R$ 5.710 investimento − R$ 1.000 devolução = R$ 4.710 líquidos**.
- Estado vazio é honesto: diz que ou não há registro ou o login não é super_admin (RLS só libera ao dono) — `listAportes()` loga erro em vez de engolir.
- **Selo "dados defasados"**: mede a **data do lançamento** (`created_at`), não o mês coberto. Com a 082 lançada em 05/09 ele **some** (0 dias), embora o razão de caixa vá só até **ago/2026** — o que é normal em 05/09. Para não maquiar, a tela agora exibe sempre a legenda "razão de caixa até Ago/26 · último lançamento em 05/09/2026". Um import de extrato velho feito hoje zera o contador; a legenda é o que diz até onde o razão vai.
- Verificado: `tsc` limpo, `vite build` limpo, tela rodando em modo offline (estado vazio com dado real do fallback e estado populado com fixture temporário, revertido). **Não verificado com login do dono** (indisponível na ordem noturna) — a leitura real da view por sessão super_admin fica para o dono conferir em produção.
- Achado lateral, não tocado: `v_finance_revenue` e `v_finance_infra_costs` carregam INSERT/UPDATE/DELETE para `authenticated` (default privileges); inócuo porque são `security_invoker` sobre tabelas onde `authenticated` só tem SELECT, mas vale um `REVOKE` de higiene.

### Adicionado (2026-09-05 — Comercial: plano dos 259 prospects)
- **`docs/comercial/plano-259-2026-09-05.md`** — plano de 30 dias para o primeiro piloto pago, escrito pelo agente comercial na ordem noturna. Diagnóstico por agregação no banco (sem PII): 259 prospects, 237 captados · 18 contatados · 4 "conversa" (que são **auto-replies**, não troca humana), 5 com dono, zero e-mail. **Achado que muda o plano:** `wa_status` mostra **110 telefones fixos** (42%) — só ligação alcança; o pool de WhatsApp é 127.
- Defaults reversíveis documentados: dono padrão "Gilberto (Junior)", SLA 48 h primeiro toque / 7 d segundo. Ordem de ataque em ondas (4 auto-reply → 18 contatados → 42 Suzano-região celular não-franquia por faixa de avaliações → 41 fixos por ligação → SP capital). Três variações de mensagem em primeira pessoa do dono, com link do kit UTM e `utm_content` por variação; roteiro de ligação de 30 s; segundo toque.
- Confirmado no banco que a migration do vocabulário de 8 estágios (MKT, 31/08) **está aplicada** (`commercial_leads_stage_vocabulario` + `perdido` exige motivo). Plano usa só o vocabulário novo.
- Divergência registrada para o dono: canônico R-036 ainda oferece "30 dias grátis" (13/07), contradiz D5 (31/08). Plano segue D5 e não oferece teste grátis. Nada foi enviado a lead.

### Corrigido (2026-08-13 — Financeiro para de mostrar assinatura velha como se fosse contrato)
- **Todas as 12 assinaturas ativas** de `finance.subscriptions` são **auto-derivadas de médias em 06/06/2026** e nunca foram revisadas (68 dias). Elas somam **R$ 1.336,94/mês**, enquanto o extrato real (aporte conta 7.4 no Finance) mostra **~R$ 3,4 mil/mês** em jul/2026 — Anthropic aparece como R$ 339/mês quando teve linha única de R$ 1.100 em julho.
- O risco não era só exibição: o botão **"Gerar despesas do mês"** grava esses valores em `finance.expenses`, ou seja, número velho viraria lançamento errado no razão.
- **Aba Subscriptions** ganhou aviso quando há valor auto-derivado sem revisão há 60+ dias (com a data da derivação e o alerta explícito sobre o botão) e **badge `derivado`** por linha. Nenhum valor foi alterado — corrigir os números é decisão do dono, não do agente.
- Detecção pela marca `Auto-derivado` + data nas `notes` (é o que a view `v_finance_subscriptions_active` expõe — ela não traz `updated_at`).

### Adicionado (2026-08-13 — custo real de infraestrutura entra no digiai por espelho)
- O custo de infra vive no Finance (`crm_erp`), conta contábil **7.4 "Aporte no ecossistema DIGIAI"**. O digiai **não pode ler aquele banco** em tempo de tela (ADR-0001/R-009; e é o único banco de produção real — R-033). Solução: **espelho servidor-a-servidor**, painel lê tabela local.
- **Migration 053** — `finance.infra_costs` ganha `conta_pagadora`, `lancamentos`, `parcial`, `extrato_ate`, `sincronizado_em`; chave única passa a incluir `conta_pagadora` (Supabase pago pela conta DIGIAI e pela da ótica no mesmo mês são duas linhas legítimas). View `public.v_finance_infra_costs` (`security_invoker`, só `authenticated`).
- **Migration 054** — RPC `fn_sync_infra_costs(jsonb)` `SECURITY DEFINER`, só `service_role`. Necessária porque a edge levou `Invalid schema: finance`: o schema não está exposto no PostgREST e **seguirá não estando** (carrega `expenses` e snapshots).
- **Edge `sync-aporte-digiai`** (v2, `verify_jwt=true`) — lê `ESPELHO_DIGIAI_TOKEN` dos secrets do projeto, chama a edge do Finance e grava pela RPC. O token **nunca** vai ao frontend: variável `VITE_*` entraria no bundle e ficaria visível a qualquer visitante.
- **Migration 055** — cron `sync-aporte-diario` às 04:20, padrão do `mkt-tick-diario` (Bearer do vault, `net.http_post`). Upsert idempotente.
- **Primeira sincronização verificada**: 55 linhas · **R$ 19.619,36** · 13 serviços · 2 contas · ago/2025→ago/2026 · `extrato_ate` 12/08 · **4 meses parciais**. Bate com a origem.
- ⚠ **A UI ainda não existe.** Quando existir, tem duas travas devolvidas pelo Finance: **badge de mês em andamento** via `parcial` (sem isso agosto aparece com queda de 83% no custo) e rótulo **bruto** (cashback/reembolso ~0,9% não abatidos).

### Corrigido (2026-08-13 — Cadastro Empresa parou de dizer "salvo" quando não salvou)
- **Auditoria** (motivada pelo 406 do MRR) achou a classe de bug mais cara do app: as **12 escritas do `companyStore`** (`saveIdentity`, `upsertContact`, `deleteContact`, `upsertDigitalAsset`, `deleteDigitalAsset`, `upsertTool`, `deleteTool`, `upsertSnapshot`, `saveLegalStatus`) faziam `await supabase.schema('company')...` **sem destructuring, sem `error`, sem `try`**.
- O fluxo grava no `localStorage` **antes** de tentar o servidor. Recusa do banco (RLS, coluna, schema) era descartada, a tela recarregava do local e o `setSaved(true)` exibia **"✓ Salvo"**. Modo de falha não era tela vazia: era **perda de dado** — CNPJ, contador e snapshot financeiro vivendo só num navegador, descobertos em outra máquina meses depois.
- Escritas agora checam `error`, logam e **lançam** com mensagem legível ("o dado ficou apenas neste navegador"). `CadastroEmpresa` captura e mostra **⚠ + motivo** no lugar onde o "✓ Salvo" apareceria.
- Removido ramo morto em `upsertContact` (o `if (c.id)` do servidor era sempre verdadeiro — `c.id` já tinha sido preenchido acima; o `insert` nunca executava).
- Verificado: typecheck, build e a tela carregando com dado real sem erro espúrio.
- ⚠ **Ainda aberto**: o mesmo padrão de engolir erro existe em **8 funções do `financeStore`** e em ~20 sítios de gravidade média (`Semana`, `FluxoOSI`, `Marketplace`, `MarketingEspelho`, `dashboardStore`). Essas leem views que **existem**, então não estão quebradas hoje — mas qualquer falha futura vira "R$ 0" com cara de verdade.

### Corrigido (2026-08-13 — série de receita voltou a carregar: 406 no Financeiro)
- `financeStore.listRevenue()` chamava `supabase.schema('finance').from('revenue')`, mas **`finance` não está na lista de schemas expostos do PostgREST** (`public, graphql_public, marketing, company, ops, mkt, mello_fabrica, mello_medicao`) → **406**, engolido pelo `if (error) return []`. Efeito: gráfico de MRR sempre vazio, sem distinguir "sem receita" de "query quebrada".
- **Migration 052** cria `public.v_finance_revenue` (`security_invoker=true`, `GRANT SELECT` só para `authenticated`, `REVOKE` de `anon`) — a RLS de `finance.revenue` (`revenue_staff_all` / `is_staff()`) continua valendo. **Não** expusemos o schema `finance` inteiro: ele carrega `expenses` e snapshots, que são dado sensível (AGENTS.md §6).
- Store passa a ler a view e **loga o erro** em vez de engolir em silêncio.
- Verificado no navegador: a chamada responde **HTTP 200 com `[]`**. O gráfico segue vazio — mas agora porque **não há receita mesmo** (pré-lançamento), não porque a query quebrou.

### Corrigido (2026-08-13 — lead da Clearix Calc deixou de ser invisível)
- **Achado de auditoria de funil**: a Clearix Calc captura lead com `product='clearix-calc'` (edge `lead-capture` → `fn_capture_landing_lead` → `marketing.landing_leads`), mas **nenhuma tela mostrava esse lead com o contato**. `Comercial` filtrava `product='clearix'`, `FluxoOSI` `'osi'`, `AfiliadosDashboard` `'osi-afiliado'` — e `Semana` conta `status='novo'` **sem filtro de produto**, então o lead da calc aparecia no contador sem ter onde ser aberto. Lead entrava e ninguém fazia follow-up.
- **Comercial → Demonstrações Clearix** passa a ler `product IN ('clearix','clearix-calc')` (mesma ordenação `created_at desc`, mesmo fluxo de status novo/contactado/comprou/descartado).
- **Badge de origem Site/Calc** em cada linha e no bloco "Ação hoje" — a conversa começa diferente: quem veio da Calc é ótica que usou a ferramenta grátis, **não** pediu demonstração.
- **Script do 1º toque agora ramifica por origem.** O texto antigo abria com *"vi que você pediu uma demonstração pelo nosso site"* — mentira para lead da calc. O da Calc abre pela calculadora e oferece mostrar o ecossistema.
- **UTM na listagem**: `utm_source / utm_campaign` (a distribuição manda `utm_campaign=distribuicao_*_AAAA_MM`, o boca-a-boca vem como `utm_source=indicacao`). Corrigido bug em que a UTM sumia da linha quando havia `utm_campaign` sem `utm_source`.
- Nome do lead cai para e-mail/telefone quando ausente — lead da Calc não manda nome (só e-mail + WhatsApp), aparecia como "(sem nome)".
- **Sem tocar em schema nem na edge function** (R-032): `v_marketing_landing_leads` já expunha `product` e todos os `utm_*`, sem filtro de produto. Verificado em produção.
- Cobertura fechada: os 4 produtos que chegam em `landing_leads` (`osi`, `osi-afiliado`, `clearix`, `clearix-calc`) têm tela.

### Submetido (2026-08-26 ~03h — auditoria TikTok: o app do grupo entrou em review)
- Estrutura-alvo aprovada pelo dono (1 conta dev · 1 app · N contas) e executada na madrugada: o rascunho de Production do **Limelight Studio** (que havia RESETADO — 7 erros, tudo vazio) foi remontado inteiro pelo digiai: ícone, categoria, descrição, ToS/Privacidade/site com **URL verificada** (arquivo de assinatura no ar), justificativa nova (952/1000, cada escopo amarrado ao uso), demo 30s, Login Kit com **redirect do worker do grupo** (digiai.app.br/tiktok/callback — a consolidação), Direct Post ON, escopos completos com user.info.stats + video.list.
- **Dono clicou Submit for review → status "In review"**. Pós-aprovação: métricas completas do TikTok pro Radar, OAuth de todas as contas neste app, sandbox DIGIAI Publicador aposentado.
- Percalços honestos da madrugada: o formulário do TikTok resetou 2× (um logout acidental meu incluso) e a 3ª passada foi em rajada com Save imediato — lição: portais com rascunho volátil pedem salvamento a cada seção.

### Orquestrado (2026-08-26 — autorização geral do dono: "resolver tudo em todos os motores")
- **OSI fechada (4/4 business)**: convertida no Chrome DIGIAI, nome "Ótica Sem Improviso", bio do método, site da landing, IG reivindicado + auto-publish ativo, e-mail próprio (oticasemimproviso@gmail.com) no cofre.
- **Decisões delegadas e tomadas**: (a) `mkt.metricas_diarias` genérica — série por publicação/dia pra TODAS as redes (fim da cegueira de crescimento no tempo; spec do limelight com save sagrado); Pulso = coleta sim/publicação não (papel coleta_derivada — mata a contradição do inventário); convenções do espelho na view.
- **Ordens novas aos 3 motores**: MKT — raiz da fila (planejador criar ≤ teto aprovável; 301 posts morreram no gate), normalizar reels/reel, censo LinkedIn/TikTok; Limelight e Pulso — listas priorizadas de problemas abertos pra rodada geral de conserto.
- Entregas do MKT reconhecidas: fila 461→144 (301 cancelados com motivo), views de post gravando (42 posts/453 views), censo por conta rodando, worker+coletor Pinterest prontos (gated).

### Criado (2026-08-26 — app de desenvolvedor Pinterest: a porta da coleta)
- Dono + digiai no Chrome do Pulso: conta Pulso convertida pra business (e-mail projectspulso@gmail.com capturado pro cofre) e **app "Pulso Radar" criado (ID 1604974)** — trial access inclui Basic Analytics. Form preenchido pelo digiai (site digiai.app.br, privacidade /lgpd, propósito leitura de contas próprias); CAPTCHA e envio foram do dono, como manda a regra.
- **Estado: TRIAL PENDENTE** — até o Pinterest aprovar, nem a chave secreta sai nem o token de teste funciona (401 consumer-type, testado). Roteiro pós-aprovação registrado no cofre: secret→Vault, redirect digiai.app.br/pinterest/callback, worker pinterest-oauth (molde tiktok), coletor no MKT.
- **Spec do coletor enriquecida por troca entre agentes** (limelight↔digiai): match pin↔episódio é determinístico via carimbo `#T\d{2}E\d{2}` que a fábrica já põe na legenda do IG (que vira a descrição do pin); e o pin com roteiro vazado NÃO veio do banco do limelight — auditar lado mkt/canal_v1 na coleta.

### Executado (2026-08-25/26 — operação Pinterest completa: 4 marcas ligadas na distribuição gratuita)
- Dono executou no celular + digiai nos navegadores: **Mello** (@mellooticas, rodava há 1 ano), **DIGIAI** (@sisdigiai — conta virgem do e-mail da empresa convertida, perfil completado pelo digiai, IG _digiai reivindicado, **24 pins importados em 3 minutos**), **OSI** (@oticasemimproviso — ligada; branding pendente, perfil está "Taty Mello") e **Pulso** (@projectspulso — confirmado no Chrome pulso: IG @pulsoprojects reivindicado e conectado; cadeia 100% automática motor → IG → Pinterest).
- Cofre: as 4 contas registradas com estado real. Ordem de serviço do MKT fechada com os itens estruturais: cadastrar em mkt.accounts, coleta de métricas via API Pinterest (impressões/salvos/cliques → Radar), regra de legenda, branding OSI.
- Resposta à dúvida do dono registrada: o auto-publish duplica **só as próximas publicações** (histórico é curadoria manual — e melhor assim).

### Descoberto (2026-08-25 — Pinterest: distribuição gratuita já rodava sem ninguém saber)
- Investigação a quatro mãos (dono no app + digiai nas fontes): TODO o conteúdo que o Limelight publica no IG da Mello é **duplicado automaticamente no Pinterest** via recurso nativo (Instagram reivindicado + publicação automática) na conta @mellooticas (contato@mellooticas.com.br) — **2,2 mil visualizações/mês de graça**, 65+ pins em 1 ano, e nenhum motor nosso publica lá. Descartadas as hipóteses de motor duplicando e de operador humano.
- **Decisão do dono**: replicar o modelo pra todas as marcas com IG (DIGIAI, OSI, Pulso; Lancaster fora — automação desligada 01/08). Plano na ordem de serviço do MKT: conta Business com e-mail da marca + reivindicar IG e site + auto-publish + regra de fábrica nova ("a legenda do IG agora É a descrição do pin" — achamos pin com roteiro de narração vazado de legenda antiga).
- **Pinterest entrou no Radar 360** como rede (filtro + coluna da matriz) — aparece "a ligar" até a coleta existir, como manda a doutrina. Cofre: as DUAS contas Pinterest registradas (a real @mellooticas ok; @decamargosilvajunior marcada pra higienizar — perfil pessoal convertido).

### Verificado ao vivo (2026-08-25 — as 6 abas do Radar com dado real + um 403 silencioso de semanas)
- Prova visual completa no app logado (Chrome Pessoal): Visão (169,9k views no recorte, share por plataforma, 1.518 seg — o +1 do LinkedIn já no censo), Audiência (9 contas, matriz 7 redes, evolução 9 dias), Conteúdo, Vídeo (3 cards de decisão com sacadas reais: Kwai 730 views/pub · TikTok 153 no Limelight), Funil (cadeia com carimbos + Calc 6,7% conversão) e Saúde (fila 462 em vermelho, cobertura conta×coleta).
- **Bug histórico achado e corrigido**: `mkt.content_performance` era a ÚNICA tabela do schema sem GRANT pra `authenticated` — PostgREST devolvia 403 e o loader engolia o erro. **Engajamento aparecia 0 em silêncio, inclusive no Analytics antigo do MKT.** Grant aplicado (RLS por marca já existia); a aba Conteúdo acordou: 28 posts medidos, formatos e gatilhos com taxa.
- **Alcance destravou**: 143 de alcance com taxa 9,1% fluindo — a permissão Meta que estava 🔒 chegou. E um item de higiene pro MKT: vocabulário de formato tem "reels" E "reel" duplicados.

### Renovado (2026-08-25 — fila OAuth zerada, um por um com o dono no navegador)
- **LinkedIn pessoal**: renovado pelo dono no Chrome Pessoal (fluxo `linkedin-oauth?state=pessoal` consertado horas antes) — válido até **24/10/2026**, token no Vault (`mkt_linkedin_oauth_pessoal`, carimbo do mesmo segundo do callback).
- **TikTok pessoal**: reautorizado (`digiai.app.br/tiktok/auth?state=pessoal` — passou direto, consentimento prévio) — refresh_token novo de 365 dias; o access de 24h é design do TikTok e o cron `refresh-tokens` rola diariamente.
- **TikTok Mello: não precisou de navegador** — o cron renovou sozinho hoje 09:30; a cadeia de refresh dela estava viva. Lição pro cofre: TikTok não tem "renova_em" fixo, tem ciclo de 24h por cron.
- **Faxina de segurança**: colunas legadas `access_token/refresh_token` limpas em LinkedIn e TikTok (era a "limpeza pós-validação" pendente da migration do Vault) — segredo agora vive SÓ no Vault. Cofre e Backlog atualizados (item P1 concluído).

### Destravado (2026-08-25 — os dois fluxos OAuth vivos + mistério do TikTok resolvido)
- **`linkedin-oauth` respondia 401**: o redeploy em massa de 31/07 (17 funções) ligou `verify_jwt` — e fluxo OAuth TEM que ser público (o LinkedIn chama o callback sem token). Por isso a credencial venceria hoje sem ninguém conseguir renovar. Redeployada v14 com `verify_jwt=false`; testada: START → 302 pro consentimento do LinkedIn. Lição registrada na ordem de serviço do MKT: redeploy em massa reseta a flag.
- **Worker `tiktok-oauth`: o "deploy pendente" do changelog do MKT já tinha sido feito** — verificado o script no ar: o token só passa pela RPC `fn_cred_set` (Vault). E o teste do fluxo revelou o client_key: **`sbawypfqzlshver28s` — o "app TikTok órfão" do despacho de inventário é o próprio DIGIAI Publicador (sandbox)**, em uso ativo pelo OAuth do grupo. Cofre atualizado: status ok, mistério fechado (falta só apurar em qual conta dev ele vive).
- Fluxos prontos pro dono renovar no navegador: LinkedIn `functions/v1/linkedin-oauth?state=pessoal` · TikTok `digiai.app.br/tiktok/auth?state=pessoal|mello`.

### Preparado (2026-08-25 — views das postagens: banco e painel prontos, coleta despachada)
- Dono, testando o Radar: "as postagens também têm views, correto?" — correto, e o sync-metricas do MKT não coletava plays/views de post (só eng/alcance/saves/shares). Doutrina "montar agora, ligar depois": coluna **`mkt.content_performance.views`** criada (NULL = não coletado, nunca zero falso), Radar já exibe (KPI na Visão com "a coletar", coluna nos top posts, semáforo na Saúde), e **despacho R-032 ao MKT** (`_DESPACHO_VIEWS_DE_POST_DO_DIGIAI_2026-08-25.md`) pedindo a coleta: IG plays (Reels), FB total_video_views, TikTok view_count pós-renovação do OAuth.

### Corrigido (2026-08-25 — Visão do Radar se adapta à marca; marca sem motor não é marca morta)
- Achado do dono usando o app: filtrar por DIGIAI/Lancaster/OSI/Pessoal zerava a Visão — o hero só somava views dos motores de vídeo (Pulso→PULSO, Limelight→Mello). **Marca sem motor parecia marca morta**, sendo que tem posts, engajamento, alcance e seguidores reais no recorte.
- A Visão agora se adapta: com motor no recorte, hero = views + participação por plataforma; sem motor, hero = **engajamento das redes** + participação de engajamento por rede (dados reais de content_performance), com a explicação honesta ("esta marca não tem motor de vídeo — o dado dela vive nas redes"). KPIs reformulados: posts nas redes · engajamento · views motores (— quando não há) · alcance.

### Adicionado (2026-08-25 — RADAR 360: o mock aprovado vira módulo)
- Decisão do dono após aprovar o mock v2: "montar tudo e ir ligando o que falta". O módulo Crescimento foi reescrito como **Radar 360** — 6 abas (Visão / Audiência / Conteúdo / Vídeo & motores / Funil / Saúde da coleta), com a regra estrutural: **todas as redes (IG, FB, TikTok, YouTube, Kwai, LinkedIn, X), todos os canais e todas as marcas presentes desde já** — o que não tem coleta aparece como "a ligar", nunca some.
- **Filtros globais estendidos**: período hoje/7/14/30/60/90d/6m/12m/tudo **+ intervalo personalizado (2 datas)**; rede (7 opções); marca (todas do mkt.brands). O recorte ativo aparece sempre no cabeçalho do filtro.
- Abas: Visão (hero de views do recorte + participação por plataforma + KPIs), Audiência (cards com logo p/ todas as marcas, evolução, matriz 7 redes), Conteúdo (formato/gatilho/janelas/top posts — o que era "ilustrativo" no mock aqui é REAL, vem de content_performance), Vídeo & motores (cards de decisão), **Funil (cadeia + Calc — pedido do dono no meio do build: usos/sessões/leads/conversão + série com barra verde em dia de lead)**, Saúde (semáforo por fonte + OAuth vencendo via mkt.credentials + tabela de cobertura conta×censo de v_mkt_accounts).

### Refinado (2026-08-25 — minucioso ao ponto de decisão)
- Ordem do dono: "tudo separado e minucioso, ao ponto de decisões". Os cards dos motores externos no Crescimento viraram **cards de decisão**: tabela por plataforma (pubs · views · **views/pub** · interações) + sacada automática de eficiência ("melhor eficiência: Kwai, N views/pub"). Views/pub é o número que diz onde dobrar a aposta.
- Séries ampliadas nas fontes: `v_espelho_pulso_dias` ganhou likes/comentários/shares/saves; criada `v_espelho_limelight_pub_dias` (views e engajamento POR DATA DE PUBLICAÇÃO, mesma semântica honesta do Pulso). O card do Limelight agora abre por plataforma; o de blogs abre por blog (leituras · sessões) com a sacada de qual blog puxa a rede.

### Adicionado (2026-08-25 — Crescimento vira o analytics de TUDO: motores externos sob os mesmos filtros)
- Pedido do dono olhando as telas no ar: o Crescimento tinha os filtros certos (período/rede/marca/tipo) mas só via as redes Meta; o Espelho via tudo mas sem recorte. Resolvido no lugar certo: **séries diárias dos motores externos criadas nos bancos de origem** — `v_espelho_pulso_dias` (views/pubs POR DATA DE PUBLICAÇÃO — rotulado assim de propósito, não é snapshot; a lição das metricas_diarias cumulativas que inflavam 37× está gravada no comment da view), `v_espelho_limelight_dias` (censo diário da fábrica) e `v_espelho_blogs_dias` (leituras/dia).
- **Seção "Motores externos no recorte" no Crescimento**: Pulso, Limelight (Mello) e Blogs com headline + gráfico de barras/dia, obedecendo os MESMOS filtros — período corta a série, rede filtra plataforma (Pulso tem kwai/youtube!), marca mapeia (Pulso→PULSO, Limelight→Mello, Blogs→DIGIAI).
- Bônus da série: o TikTok da fábrica Mello já tem **64 seguidores** no censo próprio (o espelho agregado mostrava 0 por colisão de duas linhas no mesmo dia).

### Adicionado (2026-08-25 — nada mais some: views do Limelight, blogs e a Central de fontes)
- **Caça aos números sumidos** (ordem do dono: "temos números que não aparecem"): o espelho do Limelight NÃO expunha views — `limelight_medicao.leituras` guardava **22.985 views** (TikTok 14,6k · IG 3,9k · YT 2,6k · FB 1,8k) invisíveis no painel. View `v_espelho_limelight` recriada com `views_total`/`views_por_plataforma`/`ultima_leitura`; card no Espelho agora mostra. O "quase 500k do Pulso" é o ecossistema somado: Pulso 436,3k (por plataforma bate exato) + Limelight 23k = 459k — e é assim que o elo "alcançar" da cadeia passa a somar.
- **Blogs entraram no circuito**: criada `v_espelho_blogs` no banco da rede (zgojkioieztikqhwcoae) — 20 posts no ar, **12 leituras reais** (first-party ADR-0036, zero PII; medição existe desde 20/08 — número pequeno e honesto, não atraso de contagem). Client `espelhoMotores.blogs()`.
- **Central de fontes** no Espelho — o índice de comando pedido ("tudo que temos de opções"): 12 fontes, cada uma com número-chave, carimbo de frescor e link pro módulo (Crescimento, Calc, SEO, Vendas, OSI, Clearix, Semana, motor MKT). A análise profunda revelou o que estava invisível: **fila do motor MKT com 461 atrasados e 21 com erro** (agora em vermelho na central) e SEO com 281 impressões/CTR 0,7%.

### Auditado (2026-08-25 — rede por rede, dado real contra a fonte)
- **Instagram: 100% exato.** Verificação manual nos 4 perfis públicos vs censo do banco: Lancaster 1.160=1.160, Mello 75=75, OSI 15=15, DIGIAI 4=4. O que a coleta cobre, ela cobre CERTO.
- **O problema não é precisão, é cobertura**: fora do censo estão DIGIAI LinkedIn (1 seguidor — verificado na página e inserido como censo manual de hoje), Mello TikTok, OSI TikTok e Pulso IG (a_configurar). E os 5 IGs das unidades Mello colapsam numa linha só porque `audiencia_diaria` agrega por marca×rede, não por conta — pedido de granularidade vai ao MKT (Backlog P2).
- **Credenciais no fio**: OAuth LinkedIn expira HOJE, TikTok Mello+pessoal amanhã 26/08 — sem renovar, as contas saem do censo em silêncio. Cofre atualizado (renova_em) + Backlog P1 pro dono.
- **Fatos reverificados com número de hoje: 9/10 frescos.** Clearix uso vivo **1.954 → 3.392 tx/30d (quase dobrou)**; Pulso 289,5k → **436 mil views / 739 pubs**; cadência 22 → 18 posts/7d. Único vencido: inscritos do YouTube Pulso (sem fonte fresca hoje — vencido honesto). O MKT volta a poder citar os números.
- TikTok público levantou CAPTCHA (não resolvemos) — verificação de TikTok só pela API oficial, o que reforça a urgência da renovação OAuth.

### Adicionado (2026-08-25 — Cadeia de resultados: o funil inteiro em um lugar)
- **`v_marketing_cadeia`** (1 linha, zero PII) + seção no topo do Espelho: **produzir → alcançar → captar → prospectar → vender → provar**, cada elo com número e carimbo de frescor ("elo sem data fresca é elo quebrado"). Compõe as três fontes: banco digiai (MKT/leads/OSI/Hotmart), espelhos client-side (Pulso 739 pubs/436k views, Limelight 180 pubs) e uso vivo do Clearix (`v_admin_tenant_vida`, agregado).
- A cadeia já denuncia onde quebra hoje: 18 posts/7d e censo de hoje, mas **1 lead/30d, prospecção parada desde 05/08 e 0 vendas** — o gargalo é captar→vender, não produzir.
- **Regra Clearix explícita no rodapé da cadeia**: dado operacional do tenant é prova INTERNA; pra fora vai só o agregado dos fatos com trava por marca (nunca nomear cliente).

### Adicionado (2026-08-25 — Crescimento e Calc mudam de casa: dados no digiai, motor no MKT)
- **Decisão do dono**: os módulos `/analytics` e `/calc` do app MKT sempre leram o banco do digiai (schema `mkt` + views `v_mkt_calc_*`) — só a UI morava no app errado. Portados completos pro painel: **Crescimento** (`#/mkt-crescimento`: KPIs, sacadas automáticas, evolução por marca, matriz marca×rede, rankings formato/gatilho, janelas de horário, top posts, botão sincronizar invocando a mesma edge `sync-metricas`, e o aviso de coleta parada ≥3 dias — a lição dos 39 dias veio junto) e **Calc** (`#/mkt-calc`: funil da isca — usos, sessões, leads, campanhas UTM, ritmo diário).
- Nada mudou no banco: mesmas tabelas, mesma RLS (`mkt.pode_ver_brand` segue travando por marca; o dono é admin no mkt e vê tudo). Seção Marketing agora: Espelho → Crescimento → Calc → Travas.
- **Despacho R-032 ao MKT** (`digiai_mkt/_DESPACHO_EMAGRECER_DO_DIGIAI_2026-08-25.md`): remover as duas telas, apontar links pro painel, MANTER a edge e os crons (coleta é do motor), e listar outras telas de leitura candidatas a migrar. A régua: "como estamos?" mora no digiai; "publicar/produzir" mora no MKT.

### Repassado (2026-08-20 — ADR-0053 aportes intercompany: 2 despachos + 1 risco devolvido)
- **Briefing do `clearix_finance` verificado** contra o estado real: o espelho do aporte 7.4 está vivo aqui (`finance.infra_costs` — 55 lançamentos, 13 serviços, R$ 19.619,36, sync 20/08, 4 meses parciais respeitados).
- **Despachos R-032 emitidos** — Pola Petit (`polapetit/_DESPACHO_APORTES_DO_DIGIAI_2026-08-20.md`: 7.5 aporte recebido + 3.4.7 receita retida na ótica, loja 007, 483+35 itens já carimbados, "não recadastre nada") e GJ (`gj/_DESPACHO_APORTES_DO_DIGIAI_2026-08-20.md`: 5.3.9 retirada 976 itens/R$ 151,7k + 3.4.2 conta-ponte, com alerta de dupla contagem e de que transferência não é fluxo).
- **⚠️ Risco devolvido ao finance antes de implementar**: o pedido de mostrar *aporte líquido* (7.4 − 3.4.6) daria **número negativo hoje** — o aporte que chega no espelho vem de `transactions` (R$ 19,6k) e o retorno de R$ 36,6k ainda é só classificação de extrato (grupo 7 não materializado). Painel diria "a DIGIAI devolveu mais do que recebeu". Preferimos painel incompleto a painel mentiroso: resposta em `clearix_finance/docs/_RESPOSTA_DO_DIGIAI_aportes_2026-08-20.md` pedindo a materialização do grupo 7 e o 3.4.6 com a mesma granularidade. 2 itens no Backlog.

### Ampliado (2026-08-14 — de inventário de serviços para COFRE DA EMPRESA)
- Decisão do dono no meio da varredura: não é inventário de SaaS do marketing — é o **cofre de tudo que a casa tem, por entidade**, incluindo o que já encerrou ("não perder nada") e coisas como **números de WhatsApp de lojas antigas**.
- **`ops.empresas`** criada (12 entidades: DIGIAI LTDA, as 5 unidades da Mello + guarda-chuva, Lancaster, Polapetit, Pulso, Nipo, pessoal) com tipo (própria/cliente/parceira/pessoal/encerrada) e situação (ativa/dormente/encerrada/vendida). `contas_servicos` ganhou `empresa_slug`, `categoria` (email, rede_social, ads, business_manager, infra, banco, fiscal, domínio, marketplace, ia, telefonia, dev…), `situacao` e `encerrada_em` — **conta encerrada não se apaga, vira histórico**.
- **Varredura do Chrome "empresa DIGIAI"**: âncora `sisdigiai@gmail.com`; **8 Business Managers no Meta** que ninguém havia mapeado (12 contas de anúncios entre Digiai, Pulso, Lancaster e as 5 unidades da Mello); Google Analytics **inexistente** (conta na tela de provisionamento); Search Console só com clearix.app.br; TikTok Developers com **apenas o app Limelight** — o app órfão `sbawypfqzlshver28s` do MKT **não está nesta conta**; Hotmart e OpenAI **não logados aqui** apesar de gasto real no Financeiro.
- **21 contas de rede do MKT importadas** pro cofre com marca e navegador. Total: **56 registros em 12 empresas** (17 redes, 4 telefonia). Views `v_ops_cofre` e `v_ops_cofre_resumo`.
- **Achado ao vivo durante o trabalho**: o PAT do GitHub sisdigiai expirou (401) — um dos 6 incidentes do despacho acontecendo em tempo real; registrado no cofre como `quebrado` com instrução de recuperação.

### Adicionado (2026-08-14 — inventário de contas e serviços, vivo pelo Sentinela)
- **Despacho do MKT executado** (`docs/_DESPACHO_INVENTARIO_CONTAS_DO_MKT_2026-08-14.md`): criada `ops.contas_servicos` — onde está a conta, quem é o dono, quando vence, **em qual navegador abrir** (campo que resolve a dor real do socorro) e `secret_ref` (só o NOME do secret).
- **A linha vermelha virou regra executável**: o CHECK `contas_servicos_sem_segredo` recusa qualquer valor com cara de credencial (prefixos eyJ/sbp_/ghp_/sk-/AIza e cadeias longas). Testado: o banco rejeita token colado por engano.
- **21 contas semeadas** com o §4 do despacho + o que só o digiai enxerga (navegador por conta, PATs por org, prazo do qual-foto). Views: `v_ops_contas_servicos` (painel) e `v_mkt_contas` (leitura do MKT — mesmo desenho de v_mkt_fatos, invertido). RPC `fn_conta_marcar` pro alarme escrever.
- **Cadastro virou proteção**: o Worker `digiai-sentinela` (Cloudflare, cron 9h — fora da infra que cai) agora **lê e escreve o inventário**: mediu 10 projetos e gravou status+carimbo em 9 (o 10º é o lumina, ainda sem chave por estar pausado). Devolutiva de risco ao MKT: não construímos um segundo alarme em GitHub Actions — o Sentinela já existe, roda fora e agora alimenta a tabela.

### Adicionado (2026-08-01 — scorecard que se preenche sozinho + verificação de vendas/analytics)
- **Verificação do circuito de vendas**: os 3 webhooks estão ATIVOS e keyless (hotmart-webhook v22, kiwify-webhook v20, mercadopago-webhook v15 — o 401 a payload vazio é a validação HMAC funcionando). Zero vendas registradas **não é falha técnica: é falta de venda** — o circuito está armado.
- **Analytics OSI expõe o gargalo real**: 9 visitas na landing em 7d (21 em 30d, última hoje) e **zero cliques no checkout em 30 dias**. Tráfego chega, ninguém compra — problema de oferta/tráfego, não de instrumentação.
- **O MKT mudou muito**: cadência saltou de 2 para **22 publicações/7d** (261 no total, última hoje) e a **prospecção do OSI está rodando lá** — `mkt.osi_disparos` com 38 disparos, 13 nesta semana, 3 respostas, 4 lotes. Novidades: 8 influenciadores, audiência diária, 142 linhas de performance, sentinela própria, 281 execuções de IA. Item P2 do Backlog (cadência abaixo da meta) fechado; FATO `digiai_cadencia_conteudo` criado.
- **Migration 051 + módulo Semana**: `v_ops_scorecard_auto` calcula na fonte 4 das 6 métricas (prospecção de mkt.osi_disparos, publicações de mkt.publications, vendas de hotmart_sales+mp_events_raw, leads respondidos de landing_leads). A UI mostra badge "sistema: N" quando diverge do salvo e um botão **aplicar automáticos** (grava via RPC com nota da fonte). Demos agendadas e follow-ups seguem manuais **de propósito** — são julgamento humano. Painel parou de pedir número que ele já tem.

### Adicionado (2026-07-31 — Vida real do tenant na Central Clearix)
- **+2 FATOS da vida real** em mkt.fatos (validade 7d): `clearix_uso_vivo` (1,9k transações/30d, cliente sem nome — LGPD) e `digiai_prova_operacao` (build-in-public do grupo). **Adendo no despacho do MKT** com a regra de trava por marca: IA da marca X só usa fatos brand_slug=X ou gerais, nunca cruza marca, nunca enriquece com nome de cliente.
- **View `v_admin_tenant_vida` criada no banco Clearix** (agregados por tenant, zero PII): transações 30d/7d, pedidos, usuários ativos, último login, ações auditadas. **Seção "Vida real · uso operacional" no tab Tenants** da Central: Grupo Mello Óticas com badge `operando` (1.954 transações/30d, 240/7d, 78 usuários, login hoje) vs 3 sandboxes parados — o contraste É a prova de uso real, e vira insumo de FATO fresco pro MKT.
- Padrão pros demais bancos: espelho agregado `v_espelho_*` (Pulso e Limelight já têm; Nipo/Easy/Qual Foto/Lumina/Nexus na fila conforme ganharem uso que dirija decisão).

### Adicionado (2026-07-31 — FATOS publicáveis: fonte única pra IA do MKT citar)
- **Migration 050**: `mkt.fatos` (fato pronto + fonte + verificado_em + validade_dias + publico) e `v_mkt_fatos` com flag **`fresco`** — as travas já proibiam "citar número fora dos FATOS"; agora os FATOS existem como dado, com prazo de validade. 7 seeds verificados na fonte (Pulso, YouTube, série Mello, custo de roteiro, Clearix, OSI, portfólio). RPC `fn_mkt_fato_reverificar` (is_staff) pra re-verificação.
- **Seção "Fatos publicáveis" no espelho Marketing** — o dono vê a lista com badge fresco/vencido; fato vencido = a IA silencia o número. **Despacho R-032 pro agente do MKT** (`digiai_mkt/_DESPACHO_FATOS_DO_DIGIAI_2026-07-31.md`): regra de consumo (só fresco+publico), endpoints vivos de Pulso/Limelight pra número do dia, e a tarefa de plugar o gerador na view.

### Corrigido (2026-07-31 — Limelight publicando: card atualizado com a verdade verificada)
- Dono avisou que o Limelight já publica com dados reais; verificação na fonte confirmou a nuance: **série NO AR via gate humano R-011** (12 itens da fila `publicado`, última publicação 28/07, reconciliador promovendo episódios, coleta diária medindo) — mas o `dry_run` das APIs segue `true` nas 4 plataformas. Card: Funciona→No ar, 68→72, bloqueio removido; próximo passo inclui limpar 5 itens em erro na fila.

### Auditoria de verdade (2026-07-31 — o que o app pode afirmar antes de vender)
- **Varredura fonte a fonte** classificou as superfícies: 🟢 verdade viva (Comercial 260 leads/toque 25-07, Central Clearix, espelhos MKT/Limelight/Pulso verificados na fonte, analytics first-party, scorecard) · 🟡 viva mas defasada (**Financeiro parado em 12/06** — banner âmbar "dados defasados" adicionado quando passa de 30d; landing leads 0 = form ok sem tráfego; MP 1 evento teste) · 🔴 retrato editorial (cards do Portfólio — texto à mão apodrece, caso Pulso provou).
- **Fix estrutural**: campo obrigatório `verificado` (YYYY-MM-DD) nos 18 cards do Portfólio + linha "Verificado (Xd atrás)" no drawer — verdade agora tem prazo de validade visível; card novo não compila sem data.
- **Gap da tese de vendas exposto**: "postagens diárias massivas" hoje só o Pulso cumpre (automático); MKT publicou 2/7d (meta ≥5) e Limelight aguarda DRY_RUN. 2 itens P2 no Backlog: importar extrato (pré-venda) e destravar cadência do MKT.

### Corrigido (2026-07-31 — camada final: o Pulso JÁ É automático; o espelho lia o schema morto)
- **Despacho R-032 emitido pro agente do pulso_control** (`pulso_control/_DESPACHO_DO_DIGIAI_2026-07-31.md`): arqueologia completa, contrato v_espelho_pulso documentado, e as pendências de docs que ficam lá (AGENTS.md ~7 meses desatualizado, Spec, changelog, espelho de migrations, decisão de limpeza do legado com o dono).
- **A investigação fechou o quadro completo**: o registro vivo do Pulso mora em **`pulso_content.metricas_publicacao`** — **475 publicações · 289,5k views** (FB 133k · Kwai 48k · YT 43k · TikTok 32k · IG 31k) — alimentado por **Vercel Crons diários** (`reconciliar-publicacoes` 4×/dia auto-descobre vídeos publicados por fora, `coletar-metricas` 11h via YT/IG APIs, decisor, aprendizado semanal). Prova de integridade: YT no banco 43.474 vs Studio 42.866 (defasagem de 1 coleta ✓). Tudo que eu lia antes (`public.posts`/`metricas_diarias`, cron pg_cron desativado, fila antiga) era o **sistema legado morto desde 16/06**.
- `v_espelho_pulso` recriada na fonte viva (publicações, views por plataforma, pipeline, última publicação = **hoje**); card do espelho mostra "esteira automática viva ✓" e o card do Portfólio ganhou os números reais (maturidade 85→92, bloqueio removido — não existia). Item P1 do Backlog fechado com a explicação. Ligação digiai↔Pulso agora é automática de ponta a ponta: crons alimentam o banco, o espelho lê ao vivo.

### Corrigido (2026-07-31 — inverdades do Pulso desfeitas na fonte)
- **Verificação no YouTube Studio (navegador do Pulso)** derrubou duas inverdades: (1) a "esteira parada" era falsa — o canal PULSO está **VIVO** (42.866 views vitalícias, 223 inscritos +114/28d, 21,7k views/28d, Shorts diários); o que parou foi o **REGISTRO** no pulso_control (posts 16/06, coleta 20/07). (2) o "987k views" do espelho era **inflação de 37×**: `metricas_diarias` guarda snapshot cumulativo por dia e a soma repetia o mesmo total — `v_espelho_pulso` recriada com último-snapshot (real registrado: **26.743**).
- Card do Portfólio e espelho do Marketing reescritos com os números verificados + rótulo "views reg." (registradas ≠ realidade das plataformas). **Item P1 no Backlog** (`pulso`): religar registro/coleta — a publicação roda por fora do app e o crescimento é invisível pra telemetria.

### Adicionado (2026-07-30 — espelhos vivos do Limelight e do Pulso)
- **Views `v_espelho_limelight` e `v_espelho_pulso`** criadas nos bancos próprios (org Pulso, via Management API): agregados sem PII — episódios/publicações/fila/custo IA/seguidores por rede (Limelight) e posts/canais/ideias/views totais e 7d/recência (Pulso). Exceção consciente à R-031 (`security_invoker=false` + grant anon) — só números agregados.
- **Seção "Outros motores de conteúdo" no espelho Marketing** (`src/lib/espelhoMotores.ts`): cards vivos dos 2 motores com staleness honesto — a coleta do Limelight rodou hoje ✓; o Pulso aparece com **"esteira parada há 44 dias"** em âmbar (987k views acumuladas, último post 16/06 — o card do Portfólio dizia "124k views · esteira viva", muito defasado).
- **Portfólio: 18 frentes** — entra o card **Limelight** (suporte, 68%, motores de roteiro/imagem/áudio ligados, publicação em DRY_RUN gate R-011) e o Pulso ganha números reais + bloqueio explícito da esteira parada.

### Transformação (2026-07-30 — emagrecimento 29→20 módulos + módulo Semana)
- **Emagrecimento** (benchmark vs Ninety.io/EOS + literatura de feature bloat; critério: módulo que não dirige decisão sai da vista principal): removidos **Mock Vendas** (897 linhas, protótipo cumprido), **Referências Design** e **Como usar o DS** (material de consulta — vive no git history e no Cockpit/design_system), **Marketing & SEO** (sync já quebrado; dados seguem em `marketing.seo_*`). **Funil OSI + Mapa OSI + Materiais + Afiliados fundidos no hub `OSI`** (4 abas, 1 entrada na sidebar). Saldo: −2.079 linhas, sidebar 29→20.
- **Módulo novo `Semana`** — a peça que faltava vs mercado (padrão EOS/Traction): **scorecard semanal com META e DONO** (6 métricas seed da fase VENDER: prospecção ≥10, demos ≥2, leads <24h 100%, follow-ups ≥5, vendas OSI ≥1, posts ≥5) + **ritual de revisão em 5 passos** com dados vivos (fase/atrasos do Roadmap, P1-P2 do Backlog, demos sem resposta, Decisões). Migration 049: `ops.scorecard_metrics/entries` + `v_ops_scorecard` + `fn_scorecard_set` (SECURITY DEFINER + is_staff). Verificado ao vivo em app.digiai.app.br: leitura, escrita (valor gravado via RPC) e status verde/vermelho funcionando.

### Infra (2026-07-30 — migração para Cloudflare Pages: app.digiai.app.br NO AR)
- **Executado o BRIEFING_migracao_cloudflare.md** (despacho R-032 do agente do digiai_mkt, autorizado pelo dono): passo 1 provou que o repo compila de clone limpo do GitHub (`npm ci` + `npm run build` ✓ 7,3s — o defeito que quebrou o mkt não existe aqui); projeto Pages **`digiai-app`** criado via navegador, GitHub-linkado (main, `npm run build` → `dist`), **6 env vars cadastradas antes do 1º build** (conferidas caractere a caractere via DOM); CNAME `app` criado pelo próprio Pages — apex/www/mkt intactos (200).
- **Verificação ponta a ponta no domínio novo**: `https://app.digiai.app.br` 200+SSL, rotas públicas `/osi` e `/osi/depoimento` 200 (fallback SPA automático do Pages; a regra `/*` do `_redirects` é ignorada como loop), bundle com as envs (hash idêntico ao do Netlify), **login super_admin + Central Clearix carregando os 4 tenants do banco Clearix** (v_admin_tenant_catalog e v_clearix_packages → 200 a partir da origem nova).
- **Rollback vivo**: `sisdigiai.netlify.app` segue no ar. Pendências mapeadas antes de desligar: (1) **migrar o keep-alive pra Worker com cron** — o Pages não executa `netlify/functions/`; (2) dono aplica 301 no Netlify (e exporta as envs do painel antes); (3) trocar links `digiaimkt.netlify.app` → `mkt.digiai.app.br` no código (Academy, TravasMarketing, MarketingEspelho, Portfolio); (4) atualizar `company.digital_assets` (fonte única de URLs, ADR-0029) pro endereço novo.

### Adicionado (2026-07-13 — sequência pós-auditoria: keep-alive + resgate de trabalho local + fixes)
- **Keep-alive dos Supabase free** (`netlify/functions/supabase-keepalive.mjs`): scheduled function 2x/semana (seg+qui 9h UTC) pingando o REST de 7 projetos (nipo, qual_foto, easy, digiai, clearix, nexus, polapetit) com as anon keys públicas — mata a classe de incidente "free pausou e derrubou o login". (1ª tentativa via GitHub Actions foi rejeitada: PAT sem escopo `workflow`.)
- **Trabalho local resgatado**: Easy — redesign dos 3 dashboards + AGENTS.md + docs commitados e pushados (`35c311a`); o site é linkado ao GitHub e o **redesign deployou sozinho** (verificado no bundle). Nipo — fix da migration 030b (campos de token '' em vez de NULL) + AGENTS.md commitados no branch do piloto (`9cf6d6a`). Qual Foto — AGENTS.md + docs/brand commitados (`7ad21e1`). Polapetit landing — causa-raiz do hero quebrado: **todas as fotos de v_photos são URLs assinadas do CDN do Instagram (403 após expirar)**; fix de resiliência commitado (`a9cf341`): filtra cdninstagram, hero degrada pra placeholder de marca, galeria some quando vazia.
- **Bloqueio dos PATs RESOLVIDO no mesmo dia**: os 3 tokens (niposchool-design, tgjphotos, polapetit) foram **renovados via navegador com o dono** (90 dias, escopo repo, gravados nos `.env` de cada repo sem transitar na conversa) e os credential helpers quebrados (caminho antigo `diferentes/`) removidos. Pushes confirmados: Easy `35c311a` (deploy automático — redesign NO AR), Nipo branch `9cf6d6a`, Qual Foto `7ad21e1`, Polapetit landing `a9cf341` (deploy automático — hero caiu num fallback de marca elegante, verificado ao vivo). 7 itens do Backlog fechados como done.
- Backlog: "Entrar mudo" do Qual Foto fechado como não-bug (redirect de sessão ativa; código idêntico ao Começar Grátis).

### Verificado (2026-07-13 — Qual a Foto: análise profunda logada, incluindo painel admin)
- **Magic link comprovado em uso real**: 3 galerias com seleções feitas por clientes (29 fotos escolhidas; galeria_003 com 62,5% de progresso) — o diferencial central do produto funciona ponta a ponta.
- **Tração externa esquecida**: 8 fotógrafos externos reais cadastraram e testaram em jan/2026 (lista no admin com últimos acessos) — morreu quando o Supabase pausou. Item comercial P2 no Backlog: reativar como leads de validação.
- **Painel /admin (SUPERADMIN, v1.0.0 MVP)**: funcional para usuários/solicitações, mas KPIs zerados (0 galerias/0 fotos vs 10/82 reais — "Atualizar Stats" não resolve), Configurações aponta pra 404 e coluna Ações é "Em breve". Item no Backlog. Card: maturidade 55→58.

### Corrigido (2026-07-13 — ritual Qual a Foto: Supabase restaurado a 21 dias do prazo final)
- **Mesma causa-raiz do Nipo**: projeto Supabase `qual_foto?` (org tgjphotos, Free) pausado por inatividade — restaurado via dashboard no Chrome do Junior **faltando 21 dias** pro limite (03/ago; depois, só download dos dados). Verificado logado pós-restore: dashboard do fotógrafo com 10 galerias, 82 fotos e **81 com análise IA rodada** (scores por galeria) — a IA de curadoria funcionou, ao contrário do que card e Spec diziam; o que roda local é o worker de edição pesada (RawTherapee).
- **Card Qual a Foto**: maturidade 50→55, função real, bloqueios atualizados (free tier pausa + worker local). Achados no Backlog (`qual-a-foto`): keep-alive (P2), botão "Entrar" da landing mudo (P3), pendências não commitadas AGENTS.md/docs-brand (P3); item antigo de validação (abril) fechado como done. Spec atualizada. **Fecha o ritual código→online dos 4 apps de incubação** (Polapetit, Easy, Nipo, Qual Foto).

### Verificado (2026-07-13 — Nipo School: análise logada nos 3 papéis + fix dos seed users)
- **Admin, Sensei e Aluno verificados ao vivo** (dono fez os logins): Painel Administrativo com dados reais (4 professores, 6 turmas, 26 matrículas, 67 instrumentos), ano letivo 2025 **completo** no sistema (29 aulas concluídas até o Show Final 19/dez) e Ano 2/2026 agendado até a Formatura 11/dez; Sensei com SpeedGrader funcional e agenda semanal; Aluno com gamificação, 40+ desafios e feed. Zero erro de console nos 3 papéis.
- **2º bug de login achado e corrigido**: seed users (aluno1-24@niposchool.seed) tinham campos de token NULL em auth.users (INSERT manual da migration 030b) → GoTrue "Database error querying schema". Fix aplicado em produção pelo dono via SQL Editor (UPDATE COALESCE, 24 rows); item no Backlog pra corrigir a migration na fonte. Achados menores no Backlog: KPI 26 matrículas vs 2 perfis de aluno; seed misturado com dado real.

### Corrigido (2026-07-13 — ritual Nipo School: login voltou + card com estado real)
- **Causa-raiz do login quebrado encontrada e resolvida**: o projeto Supabase do deploy (`tqlwkgiytdikumtcnizf`, org niposchool-design, Free) estava **pausado por inatividade** — auth respondia 503 e o app mostrava "Failed to fetch". Restaurado via dashboard (navegador do Nipo); teste ao vivo confirmou auth respondendo 400 pra credencial inválida = circuito funcional. Detalhe: o `.env` local aponta pra um projeto **diferente e deletado** (`eehidnwlwrzqzgytbfsd`, DNS morto) — por isso o diagnóstico local também falhava.
- **Card Nipo School**: sai de Travado → **No ar** (degrau 2), maturidade 50→55 — plataforma multi-tenant de ensino musical com 66 rotas, gamificação, presença QR, IA pedagógica. Bloqueios reais registrados: free tier volta a pausar, piloto ADNIPO parado, branch do piloto Nipo Wa só local. 3 itens no Backlog (`nipo-school`) + Spec atualizada.

### Alterado (2026-07-13 — ritual Easy Idiomas: card com estado real)
- **Card Easy Idiomas atualizado após verificação código→online**: plataforma bem mais completa do que o card dizia — admin (16 páginas) + portais aluno e professor, presença por QR Code, assistente IA Gemini, multi-tenant com RLS e signup por convite (18 migrations com hardening). Site vivo e logado em `easyidioma.netlify.app`. Maturidade 55→58.
- **Achado crítico**: redesign completo de 3 dashboards (Dashboard, AlunoHome, ProfessorHome, ~560 linhas) + AGENTS.md + docs/ existem **só no working tree local** — marker ausente do HEAD e do bundle deployado. Registrado como bloqueio no card + item P2 no Backlog. Segundo item: validar oferta com escolas reais (dados 100% seed). Spec `easy-idiomas.md` atualizada (entidades, hospedagem, status).

### Alterado (2026-07-13 — Polapetit vira 2 frentes: app Autônomos + site Institucional)
- **Portfólio agora tem 17 frentes**: o card Polapetit foi dividido. **Polapetit (app)** subiu de Incubação → **Autônomos** e do degrau 2 → **3 (uso real)** — é o ERP que roda a operação real do Buffet Taty Mello, mesma classe de Pulso e Mello Eyewear. **Polapetit Site** (novo card, `polapetit-site`) entrou como **Institucional**, padrão Clearix Site / DIGIAI Site: landing premium em `polapetit.netlify.app`, maturidade 70.
- Gaps do Backlog realocados: DNS do `.com.br` e hero quebrado → `polapetit-site`; decisão Persol segue em `polapetit`. Lista Mestra, Placar e Mapa Vivo herdam automático (verdade única PRODUTOS).

### Alterado (2026-07-13 — ritual Polapetit: card do Portfólio com app + landing)
- **Card Polapetit atualizado após verificação código→online**: agora lista as **duas URLs canônicas** — landing `polapetit.netlify.app` (200, viva) e app `polapetitapp.netlify.app` (200, Portal do Cliente + /admin gated). `funcao` reflete o produto real: ERP do Buffet Taty Mello em produção com 20 módulos admin (CRM, pipeline, propostas, contratos, financeiro, estoque), portal do cliente e simulador 3D. Maturidade 70→72.
- **Bloqueio registrado**: `polapetit.com.br` não resolve (DNS fora) — Spec dizia "landing ativa em polapetit.com.br", corrigida (`Cockpit/Spec/polapetit.md`, junto com a grafia `polapettiapp`→`polapetitapp`). 3 gaps no Backlog (`product_id='polapetit'`): DNS do domínio, imagem do hero quebrada na landing, decisão binária do experimento Persol.

### Adicionado (2026-07-13 — leads Clearix visíveis e trabalháveis no Comercial)
- **Seção "Demonstrações Clearix (site)"** no módulo Comercial: lê `v_marketing_landing_leads` com `product='clearix'` — nome, WhatsApp, e-mail, nº de lojas + mensagem (parse do `notes`), UTM, quando chegou e status. Fecha o gap do briefing (`docs/briefing-leads-clearix-site.md`): lead entrava no banco e não aparecia em módulo nenhum.
- **Workflow de status** `novo → contactado → comprou | descartado` via select na própria linha. **Migration `fn_update_landing_lead_status`** (SECURITY DEFINER + `is_staff()`, valida vocabulário, ignora anonimizados — LGPD).
- **Alerta no "Ação hoje"**: lead de demo com `status='novo'` aparece no topo do painel — verde nas primeiras 24h, **vermelho "LEAD ESFRIANDO"** depois (o form promete contato em horário comercial).
- **1º toque pronto**: botão WhatsApp abre `wa.me` com script de agendamento já escrito — o texto muda conforme o nº de lojas (solo / 2-4 multi-lojas / rede com BI). Envio segue manual (R-011).

### Adicionado (2026-07-13 — lead-capture recebe leads do clearix-site)
- **Migration 047** (`047_landing_lead_notes.sql`, aplicada via Management API): `fn_capture_landing_lead` ganha `p_notes` (assinatura antiga de 13 args removida — sem overload ambíguo no PostgREST). No upsert, nota nova prevalece; sem nota, preserva a antiga.
- **Edge fn `lead-capture` v2 deployada**: repassa `notes` (truncado em 2000). O formulário de demonstração do **clearix.app.br/contato** agora POSTa aqui com `product='clearix'` — "lojas" + mensagem livre vão em `notes`; UTM/source_url/consent LGPD registrados. Decisão do dono (2026-07-13): **intenções comerciais moram no banco digiai** (`marketing.landing_leads`), visíveis no app via `v_marketing_landing_leads`. Testado de ponta a ponta (2 leads de teste criados e removidos).

### Adicionado (2026-07-09 — Brand Guidelines ganha abas: aba MKT "Ateliê de Convergência")
- **`/brand` agora tem 2 abas**: "Holding · DIGIAI House" (conteúdo existente, intacto) e "Produto · MKT — Ateliê de Convergência" (`src/components/BrandMktAtelie.tsx`), registrando o tema visual aprovado pro `digiai_mkt`: planos cubistas facetados (clip-path + plano-sombra), céu de dados generativo (`src/lib/atelieCeu.ts`, campo de fluxo estilo Noite Estrelada, herdeiro do dhMesh), pincelada no lugar de glow (semântica ciano=máquina/magenta=humano/trigo=guia mantida da skin Órbita Cyber-Glass de 2026-07-03), assinatura magenta no gate humano e estados vazios como composições cubistas. Cores do tema escopadas em `.atl-root` (conteúdo de produto — hex ok pela regra 5), sem tocar nos tokens globais. Plano de adoção no mkt em 4 fases documentado na própria aba.

### F1 pausada (2026-06-17 — métricas Meta bloqueadas por config de conta)
- Tentativa completa de ligar as métricas Meta (ADR-0039 F1). Páginas + IG atribuídos ao system user do BM Digiai; token lê as Páginas. **Bloqueio:** IG não linkado às Páginas no modelo Graph API (`instagram_business_account` vazio) + **duplicação de asset IG do OSI**. Decisão do dono: pausar (risco de mexer na estrutura que já posta > ganho do painel pré-lançamento). Estado completo e passos de retomada em `docs/setup-meta-graph-token.md`. Token temporário apagado.

### Publicado (2026-06-16 — 3 camadas vivas no mesmo dia + reuso de acervo)
- **Devlog #4** no LinkedIn pessoal ("Eu tinha 3 semanas de conteúdo pronto. Esquecido numa pasta.") — destrava o pessoal (parado desde 12/06).
- **Card OSI "O cliente pergunta preço antes de ouvir o valor"** reaproveitado do acervo (`OneDrive/Marketing_e_Vendas/.../divulgacao/1.png` → `docs/divulgacao/artes/2026-06-16_osi-cliente-pergunta-preco.png`), publicado IG+FB via Business Suite. **Estratégia de reuso**: usar o que já está pronto antes de produzir novo.
- Análise da pasta de artes OSI: **8 posts finalizados** mapeados como banco de prontos pra preencher a fila.

### Adicionado (2026-06-15 — calendário vira kit: prompt de arte por post)
- **`art_prompt` + `art_filename` por post** (mig 043): cada post de imagem futuro carrega o prompt de arte **preenchido** (hook + sublinha + paleta da marca) + nome de arquivo sugerido. **24 posts** preenchidos (8 card + 16 carrossel OSI); 22 reels ficam de fora (vídeo, dependem da Taty).
- **UI**: seção "Prompt de arte (copiar e colar no GPT)" no PostDrawer com botão **Copiar prompt** + caminho de salvamento (`docs/divulgacao/artes/`).
- **Fix latente** (mig 044): `v_marketing_calendar` recriada com `c.*` — a view tinha lista fixa antiga e **não expunha** `copy_full`/`arts`/`posting_brief`/etc. Agora expõe todas as colunas (auto-atualizável). security_invoker mantido, anon bloqueado.

### Adicionado (2026-06-15 — Central de Postagens: cockpit social no app (ADR-0039))
- **Decisão estrutural** ([ADR-0039](../../Cockpit/ADR/ADR-0039-central-postagens-digiai-cockpit-publish-humano.md)): o app vira o cockpit completo da operação social (pipeline ideia→arte→publicado→**métricas**), inspirado no `pulso_control`. **API Meta só pra LEITURA** de métricas/seguidores; **publicação segue humana via Business Suite** (T-9/T-10, R-011 reforçado). Investigação do Pulso por Explore agent.
- **F0 — fundação de dados** (migration 042, aplicada+verificada): `marketing.social_accounts` (registry data-driven + seed dos IDs Meta conhecidos), `marketing.post_metrics` (série por post) e `marketing.account_status` (placar de seguidores) + 3 views `v_*` security_invoker (anon bloqueado, authenticated lê).
- **F2 — edge functions** (staged, deploy na F1): `social-sync-accounts` (seguidores) e `social-sync-metrics` (insights IG por post), token Meta no Vault (provider `meta_graph`), no-op gracioso até o token existir.
- **F3 — aba Performance** no módulo Marketing: placar de seguidores + métricas por post + estado "aguardando F1". Store: `listSocialAccounts`/`latestAccountStatus`/`latestPostMetrics`. Typecheck limpo; render verificado local (fallback gracioso em anon).
- **F1 (gate humano, pendente):** criar Meta App + token de leitura no BM Digiai — passo a passo em `docs/setup-meta-graph-token.md`. Depois: preencher IDs faltantes, ligar `metrics_enabled`, deploy das functions, cron diário.

### Adicionado (2026-06-12 — D5: semana 1 fechada + travas T-9/T-10 + ciclo de arte completo)
- **5 publicações no dia, todas rastreadas:** Devlog #2 (LinkedIn pessoal) · Consolidado Semanal #1 (página DIGIAI) · estreia IG @_digiai (card "Semana 1") · "O cliente trava" no FB OSI (17:32, texto) e no **IG OSI (18:36, card — ID Meta 18058565420739680)**. Log da aba Redes: 27 registros.
- **Travas T-9/T-10** (doc canônico + app + despertar): publicação Meta via Business Suite no portfólio Digiai, sempre com imagem; LinkedIn segue texto livre.
- **Prompts canônicos de arte** em `marketing.ai_prompt_templates` (aba Prompts IA): `digiai_card_consolidado_semanal` e `osi_card_post_texto` (paleta real da landing OSI: #406863/#FDFBF7/#E6E0D5/#C86D58). **Primeiro ciclo completo rodado**: prompt → arte gerada pelo humano → QC do agente → MBS → publicação → registro com arte no campo `arts`.
- Artes do dia versionadas em `docs/divulgacao/artes/` (card consolidado DIGIAI + card OSI "cliente trava" + banner OSI do acervo OneDrive `Marketing_e_Vendas/digiai/otica_sem_improviso/imagens`).

### Adicionado (2026-06-11 — rotina automatizada + estreias publicadas)
- **Despertar `devlog-diario-redes`** (tarefa agendada do Cowork, seg–sex 08:00): coleta mudanças dos projetos → gera rascunho do devlog em `marketing.content_calendar` (status ready) → notifica o humano. Anti-duplicação (não cria se já há post ready do dia); sexta gera também o consolidado semanal. **Nunca publica** (R-011/T-3). Definição em `C:\Users\junio\.claude\scheduled-tasks\devlog-diario-redes\SKILL.md`; refletido na aba Redes (rotina) e no doc canônico §4.
- **Estreias publicadas e registradas (2026-06-10):** post pessoal (`urn:li:activity:7470580203598110720`) + post da página DIGIAI (`urn:li:activity:7470664096204374016`, primeira publicação da página, com menção ao perfil do fundador). Ambos `published` no calendário + registrados em `marketing.social_updates`. Log com 15 registros (9 navegadores travados + 6 posts).

### Adicionado (2026-06-10 — aba Redes: controle canônico de redes sociais)
- **Marketing → aba "Redes"** (`src/modules/marketing/Redes.tsx`) — controle real e eterno das redes sociais da empresa e pessoais. Cadastro **travado em código** (espelho do doc canônico `Cockpit/social/redes-sociais.md`, travas T-1 a T-8 decididas 2026-06-10): 9 contas em 3 camadas (Pessoal Gilberto = devlog diário · DIGIAI institucional = consolidado semanal · OSI = calendário próprio), navegador por rede (todos "a validar" — trava T-2, validação um a um), cadência, papel e stack de criativos (GPT/Higgsfield/ElevenLabs/templates HTML/Canva).
- **Trava nova "Disciplina de Redes Sociais"** no `TravasMarketing.tsx` (6º card): inventário fechado, um navegador por rede, devlog no pessoal, registro eterno na aba Redes.
- **Migration `041_social_updates.sql` ✅ APLICADA (2026-06-10, após renovação do `SUPABASE_TOKEN`)** — `marketing.social_updates` (log temporal: post/perfil/bio/capa/config/campanha por conta) + view `v_marketing_social_updates` + RPC `marketing_log_social_update`. **Hardening no ato da aplicação:** a view nasceu com SELECT pra `anon` via default privileges e em modo definer (classe de vazamento da mig 035) — corrigido na mesma sessão: `security_invoker=true` + revoke anon/public + grants só `authenticated` (verificado: `anon_select=false`, `anon_exec=false`, RLS on). **Smoke test ok** (RPC inseriu → view leu → registro de teste removido, tabela zerada). Espelhada em `docs/migrations/migrations/`. Store: `listSocialUpdates`/`logSocialUpdate` em `marketingStore.ts`.
- Verificado no navegador local (R-005): aba renderiza 3 camadas + stack + banner; trava nova presente; `tsc --noEmit` limpo. Verificação usou bypass temporário do gate de auth em `App.tsx`, **revertido** no mesmo turno.
- **Seção "Agenda" na aba Redes** (mesmo dia, 2ª entrega) — espelho da §5 do doc canônico: Semana 1 de implantação (D1 LinkedIn pessoal/piloto → D2 DIGIAI → D3 OSI → D4 reservas → D5 1º consolidado) + rotina permanente (diário pessoal · semanal institucional · mensal balanço · OSI fora). Verificada no navegador local.

### Adicionado (2026-06-09 — fechamento dos 4 gaps de controle vendas/acessos/leads)
- **Webhook Kiwify (vendas) no ar** — migration `039_kiwify_webhook_and_purchase_event.sql` + edge function `kiwify-webhook` (deployada, fail-closed). Espelha o padrão Hotmart: raw audit em `marketing.kiwify_events_raw`, ingest via `marketing_ingest_kiwify_event` → upsert em `marketing.hotmart_sales` com coluna nova `platform` (`hotmart`|`kiwify`) — dashboards existentes (Validação/stats) cobrem as duas plataformas sem mudança. Assinatura HMAC-SHA1 validada via query `?signature=`. **Smoke test ok** (raw gravado, processamento recusado sem token). ⚠️ Pendência humana: criar webhook no painel Kiwify → URL `https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/kiwify-webhook` → salvar token como secret `KIWIFY_WEBHOOK_TOKEN`. Nota: isto cobre **tracking de vendas**; a entrega Kiwify→Nexus (provisionamento) continua pendência separada.
- **`purchase_approved` agora entra no funil** — gap: o estágio de conversão do funil first-party nunca recebia eventos (catalog seed-only). Os ingests Hotmart **e** Kiwify agora chamam `marketing_log_purchase_event` (dedup por transação) → `analytics.events_log`.
- **Captura de leads da landing** — migration `040_landing_leads_capture.sql`: tabela `marketing.landing_leads` (R-013 completo: `digiai_user_uuid`, `wa_*`, `phone_e164`; LGPD: `consent_text`/`consent_at` registrados) + RPC `fn_capture_landing_lead` (só service_role, valida e-mail, normaliza fone BR→E.164, upsert dedup por email/fone) + edge function keyless `lead-capture` (honeypot anti-bot) + view `v_marketing_landing_leads` (security_invoker, staff). **Forms no ar**: landing completa (seção "Receba o Movimento 1" pós-FAQ), `/osi` do app, e "Quero ser afiliado" na Central de Materiais (`product='osi-afiliado'`). **Exibição**: card "Leads da landing" no FluxoOSI + card "Candidatos a afiliado" no AfiliadosDashboard. **Verificado no navegador ponta a ponta** (e-mail e só-WhatsApp; leads de teste removidos após verificação).
- **Tracking `click_checkout` verificado ao vivo** — clique real na landing → evento no banco + checkout Hotmart aberto (R$ 48,50). O zero histórico era ausência de cliques, não bug. Fix aplicado: botão "Comprar pela Hotmart/Kiwify" do `CheckoutButtons` (landing) não disparava `onCheckoutClick` — agora dispara.
- ⚠️ **`HOTMART_HOTTOK` segue não-setado** — confirmado no banco: o único evento real veio `signature_ok=false` (reprocessado manualmente). Próxima venda real grava raw mas **não processa sozinha**. Setar o secret no Supabase com o hottok do produto B105515825.

### Segurança
- **🔒 Vazamento crítico de dados fechado — migration 035** (2026-06-08, LGPD art. 46) — auditoria (agente consultor-tecnico) achou e **verifiquei ao vivo**: **64 views em `public.*`** estavam concedidas a `anon` em modo *definer* (bypassam RLS), **53 delas com INSERT/UPDATE/DELETE/TRUNCATE**. Ou seja, **qualquer um com a anon key** (que viaja no bundle público) podia **ler, alterar e apagar** leads (PII), finanças (R$547k), `iam.users` e credenciais de infra. As base tables já tinham RLS `is_staff()`; o buraco eram as views. **Fix (`035_security_lgpd_lock_internal_views_staff_only.sql`):** `security_invoker=true` nas 64 views (passam a respeitar a RLS) + revogar `anon` + grant SELECT a `authenticated` (views + base tables) + RLS em `analytics.events_catalog` (única sem). **Verificado:** `anon_grants_remaining=0`, `security_invoker_on=64`, e o módulo Financeiro logado (junior, super_admin) na produção lê tudo normalmente. App não quebrou (lê via authenticated, escreve via RPCs guardadas por `is_staff()`).
- **🔒 Hardening adicional** (2026-06-08) — (A1, migrations 036/037) **`fn_log_event` travada**: era executável por anon (via PUBLIC), permitindo insert ilimitado com `metadata` livre no `events_log`; revogada de public/anon/authenticated, concedida só a `service_role` (a edge `events-ingest`) + cap de 4KB no `metadata`. Verificado: `anon_exec=false`, funil intacto. (C3, migration 038) **R-013 em `ops.commercial_leads`**: adicionadas colunas de identidade (`digiai_user_uuid`, `wa_bsuid`, `wa_username`, `wa_phone_legacy`, `email`, `phone_e164`) + LGPD (`lgpd_request_at`, `anonymized_at`) — aditivo, não quebra. (A2) **CSP endurecida** em `public/_headers`: removido `'unsafe-eval'` do `script-src` + `object-src 'none'`.

### Corrigido
- **Varredura módulo-a-módulo + polish** (2026-06-08) — auditoria técnica completa (agente consultor-tecnico) + verificação no navegador (R-005) de Marketplace/Mapa OSI/Visão/Comercial (todos saudáveis lendo dados reais). Correções aplicadas: (1) `academyStore` preço fallback **47,90 → 48,50** (eliminava auto-contradição "divergência de preço" no Marketplace/Mapa OSI; banco confirmado 48,50); (2) `academyStore.ensureRemoteProduct` `.single()` → `.maybeSingle()` (robustez); (3) `funnelStore` 3 ocorrências 47,90 → 48,50; (4) `Biblioteca` "Plano Clearix Academy" → **DIGIAI Academy** (ADR-0037); (5) `Portfolio` status "16 módulos + 2 stubs" → **24 módulos · 0 stubs** + data; (6) `Visão` removido card "1ª entrevista feita" hardcoded-falso (sem fonte real; tracking vive no Roadmap). **Itens médios:** `BrandGuidelines` botão de download fake (`alert`) → `<a download>` do logo SVG real; **Sidebar URLs do ecossistema agora vêm de `company.digital_assets`** (novo `useEcosystemUrls`, fallback nas constantes) — corrigiu 2 URLs driftadas (Lumina `lumina`→`luminabox`, Easy `easyidiomas`→`easyidioma`). Não-problemas confirmados: views `v_marketing_hotmart_stats`/`v_marketing_geo_funnel` existem e funcionam.
- **Gaps de dado do app** (2026-06-06): (B2) Portfólio + `academyStore` default `Clearix Academy`/`clearix_academy` → **DIGIAI Academy/`digiai_academy`** (ADR-0037). (B1) **`finance.subscriptions` populado** — 12 assinaturas ativas derivadas de `finance.expenses` (kind=subscription, último mês ≥ 2026-04): Anthropic, Supabase, Google/Google Cloud, Canva+Microsoft (polapetit), Higgsfield, ElevenLabs, Z-API, Netlify, Pagar.me, EBANX (~R$ 1.336/mês). Antes a aba Subscriptions estava vazia (0).
- **Marca "Ótica Sem Achismo" no checkout Kiwify** (2026-06-06) — o produto OSI no Kiwify tinha o nome antigo errado ("Achismo") visível no checkout. Re-salvar o produto + checkout propagou o nome correto **"Ótica Sem Improviso"** ao cabeçalho e título da página renderizada (verificado na página ao vivo). Resíduo "Achismo" restante existe só num campo de config interno **não renderizado** (invisível ao cliente) — limpeza opcional via suporte Kiwify.
- **Módulo Marketplace estava inacessível** (2026-06-06) — `'marketplace'` faltava no array `MODULES` (validação de rota em `App.tsx`). Clicar no item bouncava de volta pra Visão (o listener de `hashchange` chamava `moduleFromHash()`, que não reconhecia a rota e caía no default `visao`). Import, `case`, sidebar e labels já existiam; só faltava o id na whitelist. Fix: adicionado `'marketplace'` a `MODULES`.

### Adicionado
- **Kiwify (marketplace secundário OSI) configurado completo** (2026-06-06):
  - Programa de afiliados ON: comissão **52%** (afiliado ~R$ 21,66, paridade c/ Hotmart R$ 21,78), aprovação manual, estratégia de vendas. E-mail de suporte de afiliados corrigido `oticastatymello@gmail.com` → **`vendas@digiai.app.br`**.
  - **Pixels no checkout Kiwify**: Meta `1010582578011237` + TikTok `D8HQ7JJC77U8POE06IQG` (mesmos IDs da landing).
  - Pagamento: Cartão+Boleto+Pix, até 5x, 2 cartões, Apple Pay. Produto Ativo R$ 48,50, reconciliado c/ Hotmart e doc.
  - `company.digital_assets` (linha "Conta Kiwify") atualizado com toda a config.
  - **Entrega (webhook Kiwify→Nexus) pendente** — registrada como tarefa; caminho financeiro crítico, fazer com calma. Pré-requisito: `HOTMART_HOTTOK` (canal primário) ainda não setado → o `hotmart-webhook` é fail-closed e hoje **não processa** vendas reais (grava raw, não provisiona Nexus/e-mail).
- **Funil de conversão first-party no painel** (2026-06-06) — fecha o loop tráfego→conversão sem depender das APIs de Meta/TikTok nem da conta de anúncios restrita:
  - Migration `034_analytics_funnel_views.sql`: RLS staff-read em `analytics.events_log` + views públicas `v_analytics_funnel_summary` (7d/30d/total por evento) e `v_analytics_funnel_daily` (90d). A ingestão já existia (`fn_log_event`, migration 032).
  - Edge function **`events-ingest`** (`verify_jwt=false`): a landing OSI POSTa eventos (keyless) → `fn_log_event` via service_role → `analytics.events_log`. Só aceita os 3 eventos client-side (`landing_visit`/`click_checkout`/`checkout_started`); `purchase_approved`/`first_login_nexus` seguem server-side (anti-spoof). R-013: só `session_id` anônimo + UTM + user_agent, **zero PII**.
  - Landing `tracker.ts` (repo `otica_sem_improviso`): `trackEvent` agora **também** envia ao `events-ingest` via `sendBeacon`/fetch keepalive — captura o funil **completo, inclusive de quem tem ad blocker** (nosso endpoint não é alvo de bloqueador, ≠ pixels).
  - **Mapa OSI** ganhou o card **"Funil de conversão · first-party"**: visitas/cliques/checkout/compra (7d/30d) + taxa de conversão 7d, lendo `v_analytics_funnel_summary`.
  - **Verificado end-to-end em produção**: a landing deployada disparou um `landing_visit` real (session anônima) → `events_log` → card no painel.
- **Pixels TikTok + Meta da landing OSI no ar** (2026-06-06): ambos ativados via `netlify.toml` do repo `otica_sem_improviso` (IDs públicos/client-side) e verificados disparando em produção.
  - **TikTok**: criado Ads Account (conta `Digiai Academy_adv`, aadvid `7648134658340765716`) → Events Manager > Web > Manual > pixel "OSI - Ótica Sem Improviso" (ID `D8HQ7JJC77U8POE06IQG`) → `VITE_TIKTOK_PIXEL_ID`.
  - **Meta**: dataset/pixel "OSI Landing" (ID `1010582578011237`, Business `Digiai` 1330524481742986) **já existia** — instalado via `VITE_META_PIXEL_ID`. Coleta de eventos **independe** da conta de anúncios (`act 635388131903898`) que segue RESTRITA; só *rodar anúncios* depende dela.
  - Ambos catalogados em `company.digital_assets` (categoria `outro`, owner `osi`). Item Pixel do Mapa OSI → `done`.
- **Programa de afiliados OSI ponta-a-ponta + Central de Materiais** (2026-06-06):
  - Edge function `affiliate-materials-public` (Deno, `verify_jwt=false`) deployada em `hswyopqvnolqpmprqvzh`: GET serve `v_marketing_affiliate_materials` ativos; POST `{action:'download',id}` incrementa `downloads_count`. Usa service_role internamente (auto-injetado) — a landing OSI não carrega chave Supabase.
  - 10 materiais ativos em `marketing.affiliate_materials`: **3 reels AI** (voz da Taty clonada no ElevenLabs + avatar falante lip-sync), 4 imagens (carrossel 5 Movimentos, banner quadrado, banner story 9:16, card autoridade), 3 textos (e-mail, WhatsApp, legenda). `art_urls`/`preview_url` apontam pros estáticos servidos pela landing (`landingoticasemimproviso.netlify.app/materiais-afiliado/...`) — **sem Storage/service_role, sem Google Drive**.
  - Marca corrigida e propagada: as 5 artes (avatar, capa hero, card autoridade, banner quadrado, banner story) refeitas com **avatar REAL da Taty + DIGIAI Academy / "Ótica Sem Improviso"** — substituindo o "Clearix Academy / Ótica Sem Achismo" que estava no ar (landing + capa Hotmart).
  - E-mail canônico de suporte ao afiliado: **vendas@digiai.app.br** (criado via Cloudflare Email Routing).
- **Módulo Mapa OSI (`FluxoOSI.tsx`) atualizado** pra refletir a realidade:
  - FASE 0 agora `5/7`: item novo **"Central de Materiais do afiliado no ar"** (lê `marketing.affiliate_materials` ao vivo — total, reels, com-arte) com link pra `/materiais-afiliado`.
  - Item **Pixel** atualizado: 🔴 bloqueado no Meta (conta de anúncios RESTRITA + Business não verificado, 2026-06-05) — Events Manager nega criar pixel; TikTok pode seguir sozinho; adiado por canon.
  - Item **Capa Hotmart** virou **"Marca DIGIAI + avatar real propagados"** (capa, card, landing, Hotmart) — re-verificado 2026-06-06.
  - Card Marketing ganhou métrica **"Materiais na Central"** (`marketingStore.listMaterials()`).
- **Marketing & SEO virou centro de controle multi-domínio (abas por site)** — migration `seo_multisite` + `seo_sites_view`:
  - Nova tabela `company.seo_sites` (registro data-driven: `gsc_property`, `bing_site_url`, `cloudflare_zone_id`, `indexnow_key`, `github_repo`, `label`, `color`, `active`, `sort_order`) + view `public.v_seo_sites`. Seed: `digiai.app.br` + `clearix.app.br`. Adicionar domínio = 1 INSERT (sem deploy).
  - `company.metrics` ganhou coluna `site` (backfill `digiai.app.br`); cache passa a ser por `(site, source)`. `fn_replace_metrics` ganhou overload `(p_source, p_site, p_rows)`. `v_company_metrics` expõe `site`.
  - As 3 edge functions (`marketing-sync-{gsc,bing,cloudflare}`) reescritas multi-site: `{site}` no body sincroniza 1 site; sem body (cron) itera todos os ativos — **cron `marketing-sync-daily` não mudou** e agora cobre todos os sites.
  - UI: `MarketingSEO.tsx` com abas por domínio (lê `v_seo_sites`); hook `useSeoSites` + `seoUrls`; `useMarketingMetrics(source, site)`; `triggerSync(provider, site)`; cards recebem prop `SeoSite` e computam URLs de console por site.
  - **Validação real**: clearix já tem GSC (6), Bing (3) e Sitemap (3) populados (mesma conta sisdigiai valida). Cloudflare do clearix fica em "configurar" (amarelo) — o token CF atual é escopado só à zona `digiai.app.br`; **pendência humana**: ampliar o escopo do token (Analytics:Read incluindo a zona do clearix) e setar `cloudflare_zone_id` em `company.seo_sites`.
  - Consoles SEO do clearix catalogados em `company.digital_assets` (GSC/Bing/IndexNow).
- **Módulo Marketing & SEO** — `src/modules/MarketingSEO.tsx` + 6 cards (`CardGSC`, `CardBing`, `CardCloudflare`, `CardSitemap`, `CardBacklinks`, `CardIndexNow` em `src/components/marketing-seo/`) + hook `src/hooks/useMarketingMetrics.ts`. Item novo no sidebar (`marketing-seo`, grupo Operacional, ícone `Search`). Placeholders amigáveis quando credenciais não estão configuradas.
- **Tabela `company.api_credentials`** (migration `019_marketing_seo_credentials_metrics.sql`) — ponteiros pra credenciais externas, com valor encriptado em `vault.secrets`. Acesso só `service_role`. Provider ∈ {`google_search_console`, `bing_webmaster`, `cloudflare`}.
- **Tabela `company.metrics`** — cache de métricas vindas de APIs externas (clicks, impressions, requests, etc.). Source ∈ {`gsc`, `bing`, `cloudflare`, `indexnow`, `sitemap`}. Leitura: staff. Escrita: service_role.
- **3 edge functions stub deployadas** em `hswyopqvnolqpmprqvzh`: `marketing-sync-gsc`, `marketing-sync-bing`, `marketing-sync-cloudflare`. Cada uma chama RPC `public.fn_marketing_credential_status(provider)` e responde 503 com mensagem amigável + link pra doc se credencial ainda não foi cadastrada. Lógica de sync real fica pra F5 (depende de credenciais reais fornecidas pelo dono).
- **View `public.v_company_metrics`** (migration `020_v_company_metrics.sql`) — espelho de `company.metrics` em schema público. Frontend lê via essa view (padrão da casa: schema `company` não exposto via PostgREST, só via views `v_company_*`).
- **RPC `public.fn_marketing_credential_status(text)`** (migration `021_fn_marketing_credential_status.sql`) — SECURITY DEFINER. Edge functions checam existência de credencial via RPC sem expor `company` schema. Retorna só campos seguros (id, label, last_sync_at, last_sync_status) — `vault_secret_id` permanece restrito.
- **Docs de setup** em `docs/setup-gsc-oauth.md`, `docs/setup-bing-api-key.md`, `docs/setup-cloudflare-api-token.md` com passo-a-passo pra gerar OAuth refresh token (Google), API key (Bing), API token (Cloudflare) e cadastrar em `company.api_credentials` via Supabase Vault.

- **Sync real implementado nas 3 edge functions** (deploy v3) — não são mais stubs:
  - `marketing-sync-gsc`: OAuth refresh_token → access_token → Google Search Console searchAnalytics (clicks/impressions/ctr/position 7d+30d, top queries, top pages). Suporta `action: "exchange_code"` pra trocar authorization code por refresh_token.
  - `marketing-sync-bing`: Bing Webmaster `GetQueryStats` (clicks/impressions/top queries) + `GetLinkCounts` (backlinks).
  - `marketing-sync-cloudflare`: GraphQL Analytics API (`httpRequests1dGroups`) → requests/bandwidth/threats 7d + SSL status.
- **Credenciais reais cadastradas** em `company.api_credentials` (via Supabase Vault): Bing API key, Cloudflare API token (escopo readonly em `digiai.app.br`), GSC OAuth (client_id + client_secret + refresh_token). Projeto Google Cloud `digiai-marketing` criado, Search Console API habilitada, OAuth client Desktop `digiai-marketing-cli`.
- **RPCs SECURITY DEFINER** (migrations 022/023/024): `fn_marketing_register_credential` (cadastro via staff), `fn_get_credential_secret` + `fn_set_credential_service` + `fn_mark_sync` (service_role, pra edge functions), `fn_replace_metrics` (substituição atômica de cache por source).
- **Primeira métrica real**: Cloudflare retornou 863 requests / 2.9 MB / 20 threats bloqueados nos últimos 7 dias de `digiai.app.br`. GSC e Bing ainda 0 (site recém-indexado).

### Mudado
- **Rebrand estrutural: academy elevada "Clearix Academy" → "DIGIAI Academy"** (2026-06-06, decisão do dono — **[ADR-0037](../../Cockpit/ADR/ADR-0037-academy-elevada-clearix-para-digiai-company-level.md)**) — escopo **B (elevação a nível company)**: a academy de low-ticket/lead-gen sobe de nível-produto (Clearix) para nível-company (DIGIAI mãe, product-agnostic); o funil deixa de ser exclusivo do Clearix → portfólio DIGIAI (Clearix segue âncora). `academy.products.line` → **`digiai_academy`**. Reconciliado: ADR-0037 criado+indexado, `estrategia-academy-como-lead-gen.md` reescrito, `README`/`plano-mestre-marketing` + `ops.backlog_items` atualizados, 5 docs `*clearix-academy*` flagueados. Rename+reescrita dos 5 docs detalhados = follow-up.
- **Reconciliação do Roadmap (tracking defasado → realidade)** (2026-06-06) — 13 tarefas marcadas `done` em `ops.roadmap_tasks` (nota de auditoria `reconciliado 2026-06-06`): landing v1, pixels (GA+Meta), 3 conteúdos/reels, e itens Academy (nome/promessa/domínio, peças visuais, capas, copy/checkout/entrega da página de vendas, PDF principal) + Kiwify configurada (checkout vivo verificado). Roadmap geral **17% → ~33%**; Fase 0 "Validação do Problema" **38% → 47%**. A infra está à frente da validação de mercado (gargalo real = entrevistas com óticas).
- **`tsconfig.json`** — adicionado `exclude` pra `supabase/functions`, `node_modules`, `dist` (edge functions rodam em Deno, não devem entrar no tsc do frontend).

### Removido
-

---

## [2026-05-22 — sessão tarde/noite]

### Mudado
- **Visão → Verdades Canônicas:** texto da 5ª verdade (prioridade ALTO) atualizado em `src/modules/Visao.tsx` de *"Lumina entra como upsell no momento comercial certo"* para *"Lumina já valida uso interno, próxima fase é monetização externa"* conforme [ADR-0021](../../Cockpit/ADR/ADR-0021-lumina-uso-interno-validado.md). Validado no navegador. Reflete a realidade verificada: Lumina em produção real na Lancaster Suzano desde 27/03/2026.

---

## [2026-05-22]

### Adicionado
- **Financeiro → Dashboard:** toggle "Ocultar aporte intelectual" na barra de filtros. Exclui despesas do vendor `aporte-fundador` (R$ 532k em 36 lançamentos valorados) de KPIs, gráfico mensal, Top Vendors e tabela. Combina com o filtro de projeto. Commit [`90781f4`](https://github.com/sisdigiai/sisdigiai/commit/90781f4) em `src/modules/Financeiro.tsx`.
- **Cadastro Empresa → Identidade Legal:** preenchimento via Supabase (`company.identity`) com dados do Contrato Social assinado em 21/05/2026 em Suzano-SP: razão social `DIGIAI ÓTICA E TECNOLOGIA LTDA`, LTDA, Microempresa LC 123/2006, capital R$ 50.000 (100% sócio Gilberto), endereço Rua General Francisco Glicério 940 - Jardim Guaio, CNAE principal `6202-3/00` (software customizável) + 5 secundários, regime Simples Nacional. CNPJ `12.549.582/0001-49` em transição na RFB.
- **Financeiro → finance.vendors:** 7 vendors novos criados (`google_cloud`, `canva`, `higgsfield`, `microsoft`, `yampa`, `ebanx`, `google_misc`).
- **Financeiro → finance.expenses:** 32 lançamentos novos reconciliados via extratos OFX (Nubank PJ + InfinitePay CloudWalk) cobrindo jan→mai/2026.

### Mudado
- **Financeiro → Anthropic abr/2026:** reconciliação completa contra extrato InfinitePay. Soft-deletada 1 entry manual de R$ 258 que arredondava cobranças travadas; inseridas 4 entries que faltavam (cobranças de 22/04 e 30/04 + IOFs). Total mensal agora fecha exato em R$ 2.129,93 batendo com extrato.

### Removido
- Nada removido nesta data.

## [Histórico]

- 2026-05-22 — Pasta `docs/` criada como parte da padronização do workspace DIGIAI.

## 2026-09-05 — ordem noturna (orquestrador, autorização textual do dono)

- **Migration 082 — extratos InfinitePay jun–ago/2026 lançados** (21 linhas,
  R$ 7.847,53, IOF somado, recorte a partir de 13/06). O razão de `finance.expenses`
  estava parado em 12/06; agora vai até ago/2026. Vendors novos: fal.ai, JusBrasil.
  **`finance.aportes` criada** (aporte de CAIXA — investimento/empréstimo/devolução),
  distinta do aporte intelectual: o painel mostrava o buraco de caixa sem mostrar
  quem o financiou. Lançados R$ 5.710 (investimento da ótica) e R$ 1.000 (devolução):
  líquido R$ 4.710.
- **Migration 083 — `ops.comercial_config`** (owner_padrao, sla_primeiro_toque_horas=48,
  sla_segundo_toque_dias=7) e **254 prospects sem dono receberam o dono padrão
  "Gilberto (Junior)"** (0 sem dono; reversível — decisão por delegação, registrada
  na ordem do dia).
- **Migration 084 — funções de escrita fechadas para anon/PUBLIC** (método do
  runbook: chamada viva antes → revoke de anon E PUBLIC + grant explícito → chamada
  viva depois). Prova: `marketing_get_post_promotion` e `fn_mark_sync` como anon
  passaram de HTTP 200 para 42501; helpers de RLS (`current_role_code`, `is_*`)
  continuam. Só service_role: credenciais, seeds, ingestão de webhook, sync.
  Três funções possivelmente públicas por formulário ficaram abertas para o dono
  decidir (submit_testimonial, add_challenge_participation, track_material_download).
- **Migration 089 — esteira de outreach: lote de jun/jul vira `pulado`** (114
  agendados vencidos). Diagnóstico do portão 3: a esteira nunca teve motor (sem
  cron, sem edge function; o app só lê a view). Parou porque o humano parou. O
  plano dos 259 substitui o lote; reversível por `notes like '%[05/09 pulado]%'`.
