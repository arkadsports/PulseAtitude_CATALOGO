// /api/foto?id=<id> — a foto de um tênis (og/<id>.jpg do R2), servida pelo
// próprio endereço do site. É o que "Enviar com as fotos", no carrinho, baixa
// para anexar no compartilhamento do celular: direto do R2 o navegador
// bloquearia a leitura, por ser outro domínio.
import { FOTOS } from './_lib.js';

export default async function handler(req, res) {
  const id = String(req.query.id || '').replace(/[^\w-]/g, '');
  const r = id ? await fetch(`${FOTOS}/og/${id}.jpg`) : null;
  if (!r || !r.ok) {
    res.status(404).send('Foto não encontrada.');
    return;
  }
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, s-maxage=31536000, immutable');
  res.status(200).send(Buffer.from(await r.arrayBuffer()));
}
