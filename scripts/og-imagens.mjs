// ETAPA 5 — A foto que aparece no WhatsApp junto com o pedido.
//
// O link do WhatsApp (wa.me) só leva texto; um site não consegue anexar foto.
// O pedido leva então um link do produto (/p/<id>), e o WhatsApp mostra a
// pré-visualização dele — a foto do tênis — na conversa com a Pulse. Quem
// entrega essa pré-visualização é api/p.js; a foto sai daqui.
//
// Para cada produto: a capa (a mesma da grade, nunca a sola) em JPEG 600×600,
// que é o formato que a pré-visualização do WhatsApp aceita sem surpresa
// (WebP nem sempre aparece). Sobe para o R2 em og/<id>.jpg.
//
//   npm run og-imagens       (depois de "npm run build-catalog"; pula o que já subiu)
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pLimit from 'p-limit';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error('Faltam variáveis R2_* no .env. Veja o README, seção "Cloudflare R2".');
  process.exit(1);
}
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});
const IMG = path.resolve(process.env.IMG_DIR || 'public/img');
const LADO = 600;

const catalogo = JSON.parse(await fs.readFile('public/data/catalog.json', 'utf8'));
const produtos = catalogo.products.filter((p) => (p.photos ?? 0) > 0);
console.log(`${produtos.length} produtos para conferir/enviar a foto do WhatsApp...`);

const limit = pLimit(16);
let enviados = 0;
let pulados = 0;
let falhas = 0;
await Promise.all(
  produtos.map((p) =>
    limit(async () => {
      const Key = `og/${p.id}.jpg`;
      try {
        await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key }));
        pulados++;
        return;
      } catch {
        // não está no bucket: gera e envia
      }
      try {
        const origem = path.join(IMG, p.id, `${p.cover ?? 0}-full.webp`);
        const Body = await sharp(origem)
          .resize(LADO, LADO, { fit: 'contain', background: '#e6e7e9' }) // o cinza do estúdio
          .flatten({ background: '#e6e7e9' })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        await s3.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key,
            Body,
            ContentType: 'image/jpeg',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        if (++enviados % 500 === 0) console.log(`  ${enviados} enviados`);
      } catch (e) {
        falhas++;
        if (falhas <= 10) console.warn(`  falhou ${p.id}: ${e.message}`);
      }
    }),
  ),
);
console.log(`Pronto: ${enviados} enviados, ${pulados} já estavam no bucket, ${falhas} falhas.`);
if (falhas) process.exitCode = 1;
