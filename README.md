# Pulse Atitude — Catálogo

Site-catálogo da Pulse Atitude: tênis de **running, training e casual** das
marcas de fora. O cliente acha o modelo, escolhe o tamanho e o botão abre o
WhatsApp com o pedido já escrito. Não há carrinho, login nem pagamento — é uma
vitrine que termina numa conversa.

```
npm install
npm run dev        # http://localhost:5173
```

Sai do ar? `npm run build` gera `dist/`, que é o que a Vercel publica.

---

## As decisões que não estão no código

- **A paleta vem da logo, medida na arte.** Preto `#000000` ocupa 80% dela; o
  ouro tem três paradas — `#F8C549` (brilho), `#D7972A` (corpo) e `#8A540B`
  (sombra). Os tokens estão em `src/styles.css`, sob `@theme`: `ouro`,
  `ouro-claro`, `ouro-escuro`, `breu`, `carvao`, `grafite`, `fio`, `nevoa`.
  O site é escuro de propósito — é assim que a marca se apresenta.
  No texto grande o degradê para em `#B7781A` e não no ouro mais escuro:
  sobre preto, o pé das letras sumiria.

- **Preço é campo, não valor.** Nenhum preço está definido ainda. O produto tem
  `price: null`, a tela mostra “Sob consulta” e o filtro de preço aparece
  desligado. No dia em que houver preço, preencha em `PRICES` (por marca, em
  `src/config.ts`) ou no próprio produto do `catalog.json` — o produto vence a
  tabela — e tudo liga sozinho, inclusive o filtro.

- **Marca e tipo de tênis são filtros independentes.** Running, Training e
  Casual valem para todas as marcas: cada produto tem **um** tipo, definido no
  cadastro (`category`, gravado por `scripts/build-catalog.mjs`), e o filtro
  "Tipo de tênis" mostra só os produtos daquele tipo — Nike + Running, Adidas +
  Casual, e assim por diante. O tipo sai do **modelo** (listas `MODELOS_TIPO`
  no topo do script), não da marca nem do código do produto. Tênis no tipo
  errado? Acrescente o modelo na lista certa e rode `npm run build-catalog`.

- **As marcas ficam em `BRANDS`, em `src/config.ts`.** É essa lista que
  alimenta a galeria de marcas da abertura, a página `/marcas`, as faixas por
  marca do catálogo e os chips do filtro. Para acrescentar marca, mexa **só
  ali**. Marca sem nenhum modelo no catálogo não aparece na galeria.

- **Frases comerciais entre os tênis.** As grades intercalam cards com frases
  de preço, economia, estilo e pagamento (`PROMOS` e `PARCELAS` em
  `src/config.ts`). Aparecem com moderação — uma por vitrine curta, em faixas
  alternadas, e 1 a cada 16 posições na grade inteira — e os tipos se alternam
  para o cliente não ver sempre a mesma.

- **As fotos das cartas de marca são de licença livre.** `public/hero/<slug>.webp`
  (660×990, retrato 2:3) saíram do Wikimedia Commons: alguém usando o tênis ou o
  modelo mais conhecido da marca. As CC BY-SA pedem crédito ao autor — ele está
  em `heroCredito`, em `src/config.ts`, e aparece discreto embaixo da galeria
  de marcas, quando a marca está aberta.
  CC0 não pede nada. Foto de campanha da própria marca tem direito autoral: não
  use sem autorização. As logos, em `public/marcas/<slug>.png`, são brancas com
  fundo transparente.

- **Carrinho: vários pares num pedido só.** Fica guardado no navegador
  (`src/lib/cart.tsx`) e termina numa mensagem de WhatsApp (`src/lib/pedido.ts`).
  O WhatsApp só mostra a pré-visualização do **primeiro** link, então a
  mensagem abre com o link do pedido inteiro, `/c?i=id:tamanho:qtd,...`
  (`api/c.js`): a imagem é uma montagem com a foto de cada item
  (`api/colagem.js`, gerada na hora com o sharp), e quem toca abre `/pedido`,
  com foto, tamanho e quantidade de tudo. No celular, "Enviar com as fotos"
  usa o compartilhamento do aparelho para mandar uma foto de verdade por item
  (`api/foto.js` entrega as fotos pelo endereço do site).

- **Grade compacta no celular.** Três tênis por linha (`src/lib/grade.tsx`,
  carta pequena em `ProductCardMini.tsx`); o botão ao lado da contagem troca
  para as cartas grandes, e a escolha fica guardada.

- **O pedido vai com a foto do tênis.** O link do WhatsApp (`wa.me`) só aceita
  texto, então "Concluir pedido" manda nome, cor, tamanho, código e preço, e
  termina com o link `/p/<id>?t=<tamanho>`. Esse endereço é uma função da
  Vercel (`api/p.js`) que entrega ao WhatsApp a pré-visualização do produto —
  a foto aparece na conversa com a loja — e leva quem clica para a página do
  produto. A foto é a capa em JPEG (`npm run og-imagens`, no R2 em `og/`).
  Produto novo no catálogo precisa rodar essa etapa, ou a conversa vai sem foto.
  Sem tamanho escolhido, o botão não abre o WhatsApp: leva ao seletor.

- **Os filtros moram na URL.** `?q=&marca=&eixo=&cor=&min=&max=`. O cliente manda o
  link do que achou e o outro lado abre exatamente a mesma lista. É também o
  que faz `/marca/nike` e `/categoria/running` serem a mesma tela com um
  filtro travado.

- **O tamanho escolhido viaja no botão.** A página do produto só oferece os
  tamanhos que aquele par tem, e o link do WhatsApp já vai com “Tamanho: 41”.
  Sem escolher, o campo vai em branco para o cliente completar — nunca
  chutamos um número.

- **O endereço do fornecedor nunca entra no Git.** Ele vive em `YUPOO_BASE`,
  no `.env` local, e `data/raw/` está no `.gitignore`. Os scripts param com
  erro se a variável faltar, de propósito: de quem a Pulse compra é informação
  do negócio, e num repositório público o GitHub indexa — fork e cache
  sobrevivem mesmo depois de apagar.

- **As fotos não ficam na Vercel.** O catálogo inteiro passa de alguns GB. Elas
  vão para um bucket do Cloudflare R2 (10 GB grátis, sem cobrança de tráfego) e
  o site aponta para lá por `VITE_IMAGE_BASE`. Vazio = pasta `public/img`, que
  é o modo de desenvolvimento.

- **O catálogo de hoje é semente.** `public/data/catalog.json` traz 18 modelos
  de exemplo, sem preço, e o site mostra um aviso de demonstração enquanto o
  arquivo tiver `"demo": true`. `npm run build-catalog` sobrescreve tudo com o
  catálogo de verdade e o aviso some.

---

## O caminho dos dados

```
npm run sync            # 1. lê o fornecedor  -> data/raw/
npm run build-catalog   # 2. vira catálogo    -> public/data/catalog.json
npm run images          # 3. baixa as fotos   -> public/img/  (webp, 2 tamanhos)
npm run capas           # 3b. escolhe a capa (nunca a sola) -> data/capas.json
npm run cores           # 3c. tira as cores da capa        -> data/cores.json
npm run upload-images   # 4. sobe para o R2
npm run build-catalog   # de novo, para gravar capa e cores no catálogo
npm run og-imagens      # 5. foto do pedido no WhatsApp -> R2 og/<id>.jpg
```

As etapas 3b e 3c usam um modelo de visão que roda no computador (instale uma
vez com `npm i --no-save @huggingface/transformers`); o cabeçalho de cada
script explica a regra. As fotos ficam em `IMG_DIR` (no `.env`), fora do
OneDrive.

O site lê **um arquivo só**: `public/data/catalog.json`. Se a base vier de
outro lugar que não o Yupoo — planilha, banco, exportação do fornecedor —
basta gerar esse arquivo no mesmo formato e os passos 1 e 2 ficam de fora.

### Formato do `catalog.json`

```jsonc
{
  "generatedAt": "2026-09-26T01:46:08.237Z",
  "demo": true,                  // tire quando for catálogo de verdade
  "products": [
    {
      "id": "NK-001",            // código; é ele que vai no pedido
      "name": "Pegasus 41",
      "brand": "nike",           // slug de BRANDS, em src/config.ts
      "category": "running",     // running | training | casual
      "colorway": "Preto / Ouro",
      "sizes": ["37", "38", "39", "40"],
      "photos": 4,               // quantas fotos existem no bucket
      "cover": 0,                // índice da foto de capa
      "price": null              // null = "Sob consulta"
    }
  ]
}
```

As fotos são procuradas em `<VITE_IMAGE_BASE>/<id>/<n>-thumb.webp` e
`<n>-full.webp`. O que não existir cai no desenho `/sem-foto.svg` — o catálogo
entra no ar antes de todas as fotos subirem.

### Reconhecimento no `build-catalog`

O fornecedor escreve o título como quer (“Nike Air Zoom Pegasus 41 size 36-45”),
então marca, uso e tamanhos saem por padrão de texto. As listas `MARCAS` e
`USOS` ficam no topo de `scripts/build-catalog.mjs`. O que não for reconhecido
não vira produto: sai listado no fim da execução, para você acrescentar o
apelido que faltou.

---

## Publicar

### Vercel

Projeto estático, sem variável obrigatória.

| Campo | Valor |
| --- | --- |
| Framework | Vite |
| Build | `npm run build` |
| Saída | `dist` |

`vercel.json` já manda qualquer rota para o `index.html` (é uma SPA), menos
`/data/`, `/img/`, `/hero/`, `/marcas/` e `/assets/`, que são arquivos de
verdade.

Depois que o bucket existir, cadastre em **Settings → Environment Variables**:

```
VITE_IMAGE_BASE = https://pub-xxxxxxxx.r2.dev
```

### Cloudflare R2

1. Crie o bucket (sugestão: `pulse-catalogo`) e ligue o **acesso público**.
2. Gere um token S3 e preencha `R2_*` no `.env`.
3. `npm run upload-images` — `-- --apagar` libera o disco de cada arquivo já
   confirmado no bucket.
4. Ponha a URL pública em `VITE_IMAGE_BASE`, no `.env` e na Vercel.

---

## O que falta preencher

- `STORE.whatsapp` em `src/config.ts` está **vazio**. Sem ele o botão abre o
  WhatsApp sem destinatário: a mensagem vai pronta, mas o cliente escolhe para
  quem mandar. Ponha o número com DDI e DDD, só dígitos (`5584999999999`).
- `STORE.instagram` está como `pulseatitude` — confira.
- Preços, quando houver.

## Como está organizado

```
src/
  config.ts                 loja, marcas, eixos, textos da campanha, preço
  lib/catalog.tsx           carrega o catalog.json e entrega às telas
  components/
    Layout.tsx              faixa, cabeçalho com busca, rodapé
    Hero.tsx                abertura compacta + galeria de marcas + eixos
    BrandGallery.tsx        "Escolha a marca": a sanfona e os modelos da marca aberta
    CatalogView.tsx         separada por marca, com filtros (marca, tipo, cor, preço)
    ProductGrid.tsx         a grade de tênis, com as frases comerciais intercaladas
    PromoCard.tsx           o card de frase comercial (e a faixa, na grade compacta)
    ProductCardMini.tsx     a carta pequena da grade compacta
    GradeToggle.tsx         o botão grade compacta / cartas grandes
    ProductCard.tsx         a carta ligada à página do produto
    ui/card-7.tsx                    carta 3D
    ui/elastic-gallery.tsx           galeria sanfona (a mesma do catálogo da Arkad)
  pages/
    Home.tsx                início
    Lists.tsx               /catalogo, /marca/:slug, /categoria/:slug, /marcas, /busca
    ProductPage.tsx         galeria, tamanhos, carrinho e pedido
    Cart.tsx                /carrinho e /pedido
```

Os dois componentes de `ui/` vieram prontos de fora. O cabeçalho de cada um
lista o que foi mudado em relação ao original — a principal é a saída do
`"use client"`, que é do Next e aqui vira aviso do empacotador.

## Verificação

Não há teste automatizado. Antes de publicar:

```
npx tsc -b        # tipos
npm run lint      # oxlint
npm run build     # o build que a Vercel vai rodar
```
