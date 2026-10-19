// QA stills for generated shots: bundle once, then render one still per requested frame with a single browser.
// usage: node scripts/stills.mjs <props.json> <compId> <outDir> <frame,frame,...>
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition, openBrowser} from '@remotion/renderer';
import fs from 'fs';
import path from 'path';
const [, , propsPath, compId, outDir, framesArg] = process.argv;
const inputProps = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER || null;
const puppeteerInstance = await openBrowser('chrome', {browserExecutable});
const composition = await selectComposition({serveUrl, id: compId, inputProps, puppeteerInstance});
fs.mkdirSync(outDir, {recursive: true});
const errors = [];
for (const fr of framesArg.split(',').map(Number)) {
  try {
    await renderStill({composition, serveUrl, inputProps, frame: fr, output: path.join(outDir, `f_${fr}.jpg`), imageFormat: 'jpeg', jpegQuality: 70,
      scale: 0.5, puppeteerInstance, onBrowserLog: (l) => { if (String(l.text).includes('GEN_SHOT_ERROR')) errors.push({frame: fr, error: l.text}); }});
  } catch (e) { errors.push({frame: fr, error: String(e).slice(0, 400)}); }
}
fs.writeFileSync(path.join(outDir, 'errors.json'), JSON.stringify(errors));
await puppeteerInstance.close({silent: true});
