const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const { convertSite } = require('./converter');
const { generatePdf } = require('./pdfGenerator');

async function processZip(inputZipPath, workDir) {
  const extractDir = path.join(workDir, 'input');
  const themeDir = path.join(workDir, 'output', 'custom-theme');

  fs.mkdirSync(extractDir, { recursive: true });
  fs.mkdirSync(themeDir, { recursive: true });

  const inputZip = new AdmZip(inputZipPath);
  inputZip.extractAllTo(extractDir, true);

  const siteRoot = findSiteRoot(extractDir);

  console.log('[1/4] ZIP展開完了');

  try {
    await convertSite(siteRoot, themeDir);
  } catch (err) {
    throw new Error(`[convertSite失敗] ${err.message}\n${err.stack}`);
  }
  console.log('[2/4] PHP変換完了');

  try {
    const guidePath = path.join(themeDir, '設定手順書.pdf');
    await generatePdf(guidePath);
  } catch (err) {
    throw new Error(`[generatePdf失敗] ${err.message}\n${err.stack}`);
  }
  console.log('[3/4] 手順書生成完了');

  const outputZipPath = path.join(workDir, 'wordpress-theme.zip');
  try {
    const outputZip = new AdmZip();
    outputZip.addLocalFolder(path.join(workDir, 'output'));
    outputZip.writeZip(outputZipPath);
  } catch (err) {
    throw new Error(`[ZIP生成失敗] ${err.message}\n${err.stack}`);
  }
  console.log('[4/4] 出力ZIP生成完了');

  return outputZipPath;
}

function findSiteRoot(extractDir) {
  const entries = fs.readdirSync(extractDir);

  // ZIPが単一フォルダを含む場合はその中に降りる
  if (entries.length === 1) {
    const single = path.join(extractDir, entries[0]);
    if (fs.statSync(single).isDirectory()) {
      const subEntries = fs.readdirSync(single);
      if (subEntries.some(e => e.toLowerCase().endsWith('.html'))) {
        return single;
      }
    }
  }

  // ルートにHTMLがあればそのまま使う
  if (entries.some(e => e.toLowerCase().endsWith('.html'))) {
    return extractDir;
  }

  // サブフォルダを探索
  for (const entry of entries) {
    const entryPath = path.join(extractDir, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      const sub = fs.readdirSync(entryPath);
      if (sub.some(e => e.toLowerCase().endsWith('.html'))) {
        return entryPath;
      }
    }
  }

  return extractDir;
}

module.exports = { processZip };
