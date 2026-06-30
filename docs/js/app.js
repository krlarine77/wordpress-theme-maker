// app.js — GitHub Pages ブラウザ完結版メインロジック
// JSZip CDN を使ってサーバーなしで ZIP 変換・ダウンロードを行う

const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const fileInfo        = document.getElementById('fileInfo');
const fileNameEl      = document.getElementById('fileName');
const clearBtn        = document.getElementById('clearBtn');
const convertBtn      = document.getElementById('convertBtn');
const progressOverlay = document.getElementById('progressOverlay');
const progressSub     = document.getElementById('progressSub');
const resultCard      = document.getElementById('resultCard');
const errorCard       = document.getElementById('errorCard');
const errorMessage    = document.getElementById('errorMessage');
const resetBtn        = document.getElementById('resetBtn');
const errorResetBtn   = document.getElementById('errorResetBtn');

let selectedFile = null;

// ── ファイル選択 ──────────────────────────────────────────────────────────────

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

clearBtn.addEventListener('click', resetUpload);
resetBtn.addEventListener('click', resetAll);
errorResetBtn.addEventListener('click', resetAll);

// ── ドラッグ&ドロップ ──────────────────────────────────────────────────────────

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showError('ZIPファイル（.zip）のみアップロードできます。');
      return;
    }
    setFile(file);
  }
});

function setFile(file) {
  selectedFile = file;
  fileNameEl.textContent = file.name;
  fileInfo.hidden = false;
  dropZone.classList.add('has-file');
  convertBtn.disabled = false;
  hideResults();
}

function resetUpload() {
  selectedFile = null;
  fileInput.value = '';
  fileInfo.hidden = true;
  dropZone.classList.remove('has-file');
  convertBtn.disabled = true;
}

function resetAll() {
  resetUpload();
  hideResults();
}

function hideResults() {
  resultCard.hidden = true;
  errorCard.hidden = true;
}

// ── 変換実行 ──────────────────────────────────────────────────────────────────

convertBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  showProgress('HTML を解析しています...');

  // プログレスメッセージローテーション
  const messages = [
    'HTML を解析しています...',
    'WordPress PHP ファイルを生成しています...',
    'CF7 変換処理中...',
    '手順書を生成しています...',
    'ZIP をパッケージ化中...'
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % messages.length;
    progressSub.textContent = messages[msgIdx];
  }, 1800);

  try {
    const blob = await convertZip(selectedFile);
    clearInterval(msgInterval);

    // ZIP ダウンロード
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wordpress-theme.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideProgress();
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

  } catch (err) {
    clearInterval(msgInterval);
    hideProgress();
    showError(err.message);
  }
});

function showProgress(msg) {
  progressSub.textContent = msg;
  progressOverlay.hidden = false;
  convertBtn.disabled = true;
}

function hideProgress() {
  progressOverlay.hidden = true;
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorCard.hidden = false;
  errorCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  convertBtn.disabled = !selectedFile;
}

// ── ZIP 変換処理 ───────────────────────────────────────────────────────────────

async function convertZip(zipFile) {
  const buf = await zipFile.arrayBuffer();
  const inputZip = await JSZip.loadAsync(buf);

  // エントリを分類
  const htmlEntries = [], assetEntries = [];
  inputZip.forEach((p, f) => {
    if (f.dir) return;
    if (p.toLowerCase().endsWith('.html')) {
      htmlEntries.push({ path: p, file: f });
    } else {
      assetEntries.push({ path: p, file: f });
    }
  });

  if (htmlEntries.length === 0) {
    throw new Error('ZIP の中に HTML ファイルが見つかりませんでした。');
  }

  // サイトルート検出（単一フォルダにHTMLがある場合はその中）
  const siteRoot = detectSiteRoot([...htmlEntries, ...assetEntries]);

  const htmlInRoot  = htmlEntries.filter(e => e.path.startsWith(siteRoot));
  const assetInRoot = assetEntries.filter(e => e.path.startsWith(siteRoot));

  // HTML 変換
  const converted = [];
  for (const { path: p, file: f } of htmlInRoot) {
    const rel = p.slice(siteRoot.length);
    const filename = rel.replace(/\.html$/i, '').replace(/.*\//, '');
    const html = await f.async('string');
    converted.push({ filename, ...convertHtmlToWordPress(html, filename) });
  }

  // アセット分類
  const cssFiles = [], jsFiles = [];
  for (const { path: p } of assetInRoot) {
    const rel = p.slice(siteRoot.length);
    if (rel.toLowerCase().endsWith('.css')) cssFiles.push(rel);
    if (rel.toLowerCase().endsWith('.js'))  jsFiles.push(rel);
  }

  // 出力 ZIP
  const outZip = new JSZip();
  const theme  = outZip.folder('custom-theme');

  // アセットコピー
  for (const { path: p, file: f } of assetInRoot) {
    const rel = p.slice(siteRoot.length);
    theme.file(rel, await f.async('arraybuffer'));
  }

  // PHP ファイル出力
  const indexData = converted.find(c => c.filename === 'index') || converted[0];
  const pageNames = converted.map(c => c.filename);

  theme.file('header.php',    indexData.headerPhp);
  theme.file('footer.php',    indexData.footerPhp);
  theme.file('index.php',     indexData.indexPhp);

  for (const c of converted) {
    if (c.filename === 'index') continue;
    theme.file(`page-${c.filename}.php`, buildPageTemplate(c.filename, c.contentPart));
  }

  theme.file('functions.php', buildFunctionsPhp(cssFiles, jsFiles, pageNames));
  theme.file('style.css',     buildStyleCss());
  theme.file('single.php',    buildSinglePhp());
  theme.file('page.php',      buildGenericPagePhp());
  theme.file('設定手順書.html', buildGuideHtml());

  return outZip.generateAsync({ type: 'blob' });
}

// ── サイトルート検出 ──────────────────────────────────────────────────────────

function detectSiteRoot(entries) {
  const paths = entries.map(e => e.path);
  const topDirs = new Set();
  const hasTopFile = paths.some(p => !p.includes('/'));

  paths.forEach(p => {
    const i = p.indexOf('/');
    if (i > -1) topDirs.add(p.slice(0, i));
  });

  if (!hasTopFile && topDirs.size === 1) {
    const dir = [...topDirs][0];
    const hasHtmlInDir = entries.some(
      e => e.path.startsWith(dir + '/') && e.path.toLowerCase().endsWith('.html')
    );
    if (hasHtmlInDir) return dir + '/';
  }

  return '';
}
