const dropZone     = document.getElementById('dropZone');
const fileInput    = document.getElementById('fileInput');
const fileInfo     = document.getElementById('fileInfo');
const fileNameEl   = document.getElementById('fileName');
const clearBtn     = document.getElementById('clearBtn');
const convertBtn   = document.getElementById('convertBtn');
const progressOverlay = document.getElementById('progressOverlay');
const progressSub  = document.getElementById('progressSub');
const resultCard   = document.getElementById('resultCard');
const errorCard    = document.getElementById('errorCard');
const errorMessage = document.getElementById('errorMessage');
const resetBtn     = document.getElementById('resetBtn');
const errorResetBtn = document.getElementById('errorResetBtn');

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

  const formData = new FormData();
  formData.append('zipfile', selectedFile);

  // プログレスメッセージをローテーション
  const messages = [
    'HTML を解析しています...',
    'WordPress PHP ファイルを生成しています...',
    'PHP コメントを追記しています...',
    'PDF 手順書を生成しています...',
    '変換ファイルをパッケージ化しています...'
  ];
  let msgIdx = 0;
  const msgInterval = setInterval(() => {
    msgIdx = (msgIdx + 1) % messages.length;
    progressSub.textContent = messages[msgIdx];
  }, 2200);

  try {
    const res = await fetch('/convert', {
      method: 'POST',
      body: formData
    });

    clearInterval(msgInterval);

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: '不明なエラーが発生しました' }));
      throw new Error(data.error || `サーバーエラー (${res.status})`);
    }

    // ZIP ダウンロード
    const blob = await res.blob();
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
