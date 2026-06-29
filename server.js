const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { processZip } = require('./src/zipProcessor');

const app = express();
const PORT = 3000;
const TEMP_DIR = path.join(__dirname, 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: TEMP_DIR,
  filename: (req, file, cb) => cb(null, `${uuidv4()}.zip`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('ZIPファイル(.zip)のみアップロードできます'));
    }
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.post('/convert', upload.single('zipfile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'ファイルがアップロードされていません' });
  }

  const sessionId = uuidv4();
  const workDir = path.join(TEMP_DIR, sessionId);

  try {
    fs.mkdirSync(workDir, { recursive: true });
    const outputZipPath = await processZip(req.file.path, workDir);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="wordpress-theme.zip"');

    const stream = fs.createReadStream(outputZipPath);
    stream.pipe(res);
    stream.on('end', () => cleanup(workDir, req.file.path));
    stream.on('error', () => cleanup(workDir, req.file.path));
  } catch (err) {
    cleanup(workDir, req.file.path);
    console.error('=== 変換エラー ===');
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

function cleanup(...paths) {
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const stat = fs.statSync(p);
        if (stat.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
        else fs.unlinkSync(p);
      }
    } catch (_) {}
  }
}

app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('  Dynamic Site Maker v3 起動中');
  console.log('  puppeteer: 無効 / HTML手順書モード');
  console.log('========================================');
  console.log(`  http://localhost:${PORT} をブラウザで開いてください`);
  console.log('========================================\n');
});
