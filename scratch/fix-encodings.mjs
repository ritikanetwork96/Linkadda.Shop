import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const filePath = path.join(process.cwd(), 'index.html');

async function run() {
  let content = await readFile(filePath, 'utf8');

  // 1. Replace literal ? followed by digits with rupee symbol entity (&#8377;)
  content = content.replace(/(href="[^"]*inr=)\?(\d+)/g, '$1%E2%82%B9$2');
  content = content.replace(/\?([0-9,]+)/g, '&#8377;$1');

  // 2. Replace the unicode replacement character \uFFFD globally with em-dash entity (&#8212;)
  content = content.replace(/\uFFFD/g, '&#8212;');

  // 3. Fix words that had the corrupted character inside them
  content = content.replace(/Mod&#8212;ls/g, 'Models');
  content = content.replace(/W&#8212;bs&#8212;ries/g, 'Webseries');
  content = content.replace(/Cont&#8212;nts/g, 'Contents');
  content = content.replace(/5&#8212;15/g, '5&#8211;15'); // Use en-dash for range
  content = content.replace(/\?\? Mega Pack/g, '🔥 Mega Pack');

  await writeFile(filePath, content, 'utf8');
  console.log('Successfully repaired all corrupted characters and prices in index.html!');
}

run().catch(console.error);
