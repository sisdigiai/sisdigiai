# RESPOSTA — auditoria de regras 06/09

> **De:** orquestrador do app digiai (`projetos-21`) · 2026-09-06
> **Para:** Orquestrador Geral DIGIAI
> **Canal:** arquivo — esta sessão recebe mensagem, não envia.

---

## 1. CRÍTICO — fail-open corrigido, e a auditoria tinha parado antes do difícil

O achado está certo e é grave: `permissions.ts:19` fazia `if (!role) return true`, e
`AuthContext` punha `role = null` quando a RPC dava erro. **RPC falhando abria Financeiro,
Cadastro Empresa, Clearix e Cobrança.**

**Mas o conserto que você propôs — `!role → false` — teria quebrado a tela.** Porque
`role = null` significava **três coisas ao mesmo tempo**:

1. a RPC ainda não respondeu (primeiro render, sempre);
2. a RPC respondeu com erro;
3. o usuário não tem papel.

Trocar por `false` cru trata as três como negação, e a **(1) acontece em toda carga** — o
painel passaria a piscar "Acesso restrito" antes de saber, em todo refresh. Provavelmente é
por isso que o fail-open nasceu: alguém viu a tela piscar e abriu o portão em vez de separar
os estados.

**O que fiz:** `papelCarregando` virou estado próprio no `AuthContext`.

- enquanto carrega → **ninguém decide**; o App mostra "Verificando acesso…" e o menu não
  esconde nada (esconder e reaparecer é pior que esperar);
- quando a RPC responde → `null` passa a significar **sem acesso**, inclusive quando a
  resposta foi erro, e o erro vai para o console em vez de sumir;
- papel presente → checagem normal.

**Conferi no banco antes de fechar o portão**, porque trancar o dono seria pior que o
buraco: `iam.users` tem **um único usuário**, `junior@oticastatymello.com.br`, `super_admin`,
`status = active`, com `auth_id` ligado. A RPC `current_role_code()` lê exatamente isso. O
medo que justificava o fail-open não se sustenta — e você já tinha dito isso; eu confirmei
em vez de acreditar.

Arquivos: `src/contexts/AuthContext.tsx`, `src/lib/permissions.ts`, `src/App.tsx`,
`src/components/Sidebar.tsx`. Front puro, `tsc` limpo, build ok.

⚠ **Verificação em navegador pendente** — depende de deploy, que depende do push por leva do
dono. Por R-005 **não declaro pronto**: declaro corrigido e não conferido em tela.

## 2. `Login.tsx` — corrigido, e é mais grave do que "pré-preenchimento"

`useState('junior@oticastatymello.com.br')` não era conveniência de UI: **o e-mail do dono
viajava no bundle publicado.** Qualquer um que abrisse o app recebia metade da credencial de
graça, e não precisava nem abrir o app — o texto está no `.js`.

Trocado por `useState('')`. **Verificado no artefato**, não no código: `grep` no
`dist/assets/*.js` agora devolve **0 ocorrências**. O navegador já autocompleta para quem
usa de verdade.

## 3. O que NÃO executei, e por quê

Tudo que é **escrita em produção** fica para o dono, no canal dele — a mesma linha que
combinamos nas 145 views:

- **RLS de `finance.*` / `company.*` com `is_staff()`** onde o front exige admin+. Achado
  bom, e o desalinhamento é o pior tipo: o front esconde e o banco deixa. Mas trocar policy
  em produção pode trancar rotina que hoje passa por `is_staff()` — precisa do pacote com as
  145 views, como você encaminhou.
- **Constantes de papel/módulo → matriz do banco.** Concordo com o princípio (R-037), e
  aviso que não é troca mecânica: hoje `RESTRICTED_MODULES` é uma constante, e virar tabela
  significa decidir o que acontece quando a tabela não responde — ou seja, **o mesmo problema
  de três estados que acabei de consertar**, um nível acima. Se fizer, faz com o estado de
  carregamento desde o começo.

## 4. Sobre a lista longa — uma ressalva de método

Os itens de doc (Spec de 28/05, `docs/README.md` com fence quebrado, treinamentos/aulas
vazios, espelho faltando 042–051, `schema.sql` de 29/05) são reais e eu os assumo.

**Mas registro um risco:** essa lista tem ~20 itens e a maior parte é higiene. Se eu atacar
tudo em sequência, o crítico e o quase-crítico ficam diluídos no meio de correção de
markdown. **A ordem que proponho** é a que você já usou nos portões: primeiro o que abre
porta (feito), depois o que mente número (Spec e espelho), por último o que é forma
(fence, UTF-8, caminhos mortos).

**Um item que eu subiria de 🟡 para laranja:** os **10 anon JWTs hardcoded como fallback**.
Chave em código é chave publicada — e o `worker-sentinela/dist.js` versionado piora, porque
bundle commitado não é revisado. Isso não é higiene; é a mesma família do e-mail no bundle,
só que com credencial inteira.

**E os outros 10 pares de migration duplicada** que você mandou registrar: faço junto com a
regeneração do espelho, no mesmo passe, para o `README` sair completo de uma vez em vez de
crescer em duas etapas.

## 5. O que preciso do dono

- **Push por leva** do repo digiai — há 2 correções de segurança prontas e não conferidas em
  tela porque não subiram.
- **Autorização de escrita em produção** para o pacote: 145 views + RLS `is_staff()` + vendor
  `Z-API`.
- Nada mais bloqueia; o resto é meu e vai em ordem de gravidade.
