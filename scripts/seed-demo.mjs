// Gera public/data/catalog.json de demonstração — modelos de exemplo, sem preço,
// só para a vitrine ter o que mostrar antes de as fotos e a base chegarem.
// "npm run build-catalog" sobrescreve este arquivo com o catálogo de verdade.
import { writeFile } from 'node:fs/promises';

const grade = (de, ate) => {
  const s = [];
  for (let i = de; i <= ate; i++) s.push(String(i));
  return s;
};

const modelos = [
  ['nike', 'running', 'Pegasus 41', 'Preto / Ouro', 37, 44],
  ['nike', 'running', 'Vomero 18', 'Branco / Cinza', 38, 44],
  ['nike', 'casual', 'Air Max 90', 'Preto / Branco', 36, 43],
  ['on', 'running', 'Cloudmonster 2', 'Grafite / Coral', 38, 44],
  ['on', 'running', 'Cloudsurfer', 'Branco / Azul', 37, 43],
  ['adidas', 'training', 'Dropset 3', 'Preto / Lima', 38, 45],
  ['adidas', 'running', 'Adizero SL2', 'Azul / Branco', 37, 44],
  ['adidas', 'casual', 'Samba OG', 'Preto / Branco', 35, 44],
  ['asics', 'running', 'Gel-Nimbus 27', 'Azul / Prata', 38, 45],
  ['asics', 'running', 'Novablast 5', 'Amarelo / Preto', 37, 44],
  ['new-balance', 'casual', '9060', 'Cinza / Creme', 36, 44],
  ['new-balance', 'running', 'Fresh Foam 1080 v14', 'Preto / Cinza', 38, 45],
  ['puma', 'training', 'Fuse 3.0', 'Preto / Vermelho', 38, 45],
  ['puma', 'casual', 'Suede Classic', 'Bordô / Branco', 35, 43],
  ['mizuno', 'running', 'Wave Rider 28', 'Azul / Laranja', 38, 44],
  ['mizuno', 'running', 'Wave Inspire 21', 'Preto / Prata', 38, 45],
  ['vans', 'casual', 'Old Skool', 'Preto / Branco', 34, 44],
  ['vans', 'casual', 'Knu Skool', 'Bege / Marrom', 35, 43],
];

const sigla = {
  nike: 'NK', on: 'ON', adidas: 'AD', asics: 'AS',
  'new-balance': 'NB', puma: 'PM', mizuno: 'MZ', vans: 'VN',
};

const products = modelos.map(([brand, category, name, colorway, de, ate], i) => ({
  id: `${sigla[brand]}-${String(i + 1).padStart(3, '0')}`,
  name,
  brand,
  category,
  colorway,
  sizes: grade(de, ate),
  photos: 4,
  cover: 0,
  // Preço ainda não definido: a tela mostra "Sob consulta".
  price: null,
}));

const catalogo = {
  generatedAt: new Date().toISOString(),
  demo: true,
  products,
};

await writeFile('public/data/catalog.json', JSON.stringify(catalogo, null, 2) + '\n');
console.log(`catalog.json de demonstração: ${products.length} modelos.`);
