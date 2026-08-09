import { readFile } from 'node:fs/promises';

async function main() {
  const filePath = 'C:\\Users\\babul\\.gemini\\antigravity-ide\\brain\\34e7b106-3d06-470d-9de3-a856ea518abb\\.system_generated\\logs\\transcript_full.jsonl';
  const text = await readFile(filePath, 'utf8');
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes('capture_browser_console_logs')) {
      console.log(`=== Line length: ${line.length} ===`);
      const idx = line.indexOf('capture_browser_console_logs');
      console.log(line.slice(Math.max(0, idx - 200), idx + 2000));
    }
  }
}

main().catch(console.error);
