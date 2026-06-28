import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const projectRoot = process.cwd();
const sourcePath = path.join(projectRoot, 'src/main.tsx');
const outputRoot = path.join(projectRoot, 'public/audio/kokoro-82m/af_heart/en-us/24k');
const outputPath = path.join(outputRoot, 'script.json');

const fnv1a = text => {
  let hash = 0x811c9dc5;
  for (const char of text.trim()) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `tts-${hash.toString(16).padStart(8, '0')}`;
};

const sourceText = fs.readFileSync(sourcePath, 'utf8');
const source = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const skipExact = new Set([
  'none', 'hint', 'slow', 'home', 'intro', 'practice', 'review', 'focus', 'complete', 'report',
  'school', 'stationery', 'lunch', 'day-', 'en-us', 'normal', 'mp3', 'aac', 'wav',
]);
const looksLikeSpokenEnglish = value => {
  const text = value.trim();
  if (skipExact.has(text) || text.length < 3) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (/[\\/]/.test(text)) return false;
  if (!/^[A-Z"']/u.test(text)) return false;
  if (/^M[\d\s.,a-zA-Z-]+$/.test(text)) return false;
  if (/^[a-z0-9_-]+$/i.test(text)) return false;
  if (/[\u4e00-\u9fff]/.test(text)) return false;
  return /[\s,.?!'’]/.test(text);
};

const phrases = new Map();
const visit = node => {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const text = node.text.trim();
    if (looksLikeSpokenEnglish(text)) phrases.set(text, { id: fnv1a(text), text });
  }
  ts.forEachChild(node, visit);
};
visit(source);

const items = [...phrases.values()].sort((a, b) => a.text.localeCompare(b.text));
const script = {
  ttsModel: 'Kokoro-82M',
  language: 'American English',
  voice: 'af_heart',
  sampleRateHz: 24000,
  output: {
    wavMaster: 'master/*.wav',
    normal: ['normal/*.mp3', 'normal/*.aac'],
    slow: ['slow/*.mp3', 'slow/*.aac'],
  },
  speed: {
    normal: 1.0,
    slow: 0.72,
  },
  items,
};

for (const folder of ['', 'master', 'normal', 'slow']) {
  fs.mkdirSync(path.join(outputRoot, folder), { recursive: true });
}
fs.writeFileSync(outputPath, `${JSON.stringify(script, null, 2)}\n`);
console.log(`Exported ${items.length} fixed TTS lines to ${path.relative(projectRoot, outputPath)}`);
