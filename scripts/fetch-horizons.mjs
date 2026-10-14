import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { horizons } from '../data/horizons.js';

const outputDirectory = resolve(import.meta.dirname, '../assets/horizons');
await mkdir(outputDirectory, { recursive: true });

for (const horizon of horizons) {
  const manifestResponse = await fetch(`https://images-api.nasa.gov/asset/${encodeURIComponent(horizon.nasaId)}`);
  if (!manifestResponse.ok) throw new Error(`NASA manifest failed for ${horizon.nasaId}: ${manifestResponse.status}`);
  const manifest = await manifestResponse.json();
  const urls = manifest.collection.items.map(({ href }) => href.replace(/^http:/, 'https:'));
  const source = urls.find((url) => /~large\.jpg$/i.test(url)) || urls.find((url) => /~orig\.jpg$/i.test(url));
  if (!source) throw new Error(`No JPEG source found for ${horizon.nasaId}`);

  const imageResponse = await fetch(source);
  if (!imageResponse.ok) throw new Error(`NASA image failed for ${horizon.nasaId}: ${imageResponse.status}`);
  const input = Buffer.from(await imageResponse.arrayBuffer());
  const destination = resolve(outputDirectory, horizon.image);
  await sharp(input)
    .resize(1920, 1080, { fit: 'cover', position: 'centre', withoutEnlargement: false })
    .webp({ quality: 78, effort: 5 })
    .toFile(destination);
  console.log(`${horizon.id} <- ${source}`);
}

