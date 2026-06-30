const fs = require('fs');

// HTML ファイルとして手順書を生成する（外部バイナリ不要）
// ブラウザで開いて Cmd+P → 「PDFに保存」でPDF化できます
async function generatePdf(outputPath) {
  const htmlPath = outputPath.replace(/\.pdf$/, '.html');
  fs.writeFileSync(htmlPath, buildGuideHtml(), 'utf-8');
  console.log('手順書（HTML）を生成しました:', htmlPath);
}

function buildGuideHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>WordPress セットアップ手順書</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Meiryo', 'MS PGothic', sans-serif;
    font-size: 11pt;
    line-height: 1.85;
    color: #222;
    background: #fff;
  }

  /* 表紙 */
  .cover {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #1a237e 0%, #0d47a1 60%, #1565c0 100%);
    color: #fff;
    text-align: center;
    padding: 60px 40px;
    page-break-after: always;
  }
  .cover-logo { font-size: 48pt; margin-bottom: 20px; }
  .cover h1 { font-size: 24pt; font-weight: bold; margin-bottom: 12px; letter-spacing: 2px; }
  .cover h2 { font-size: 14pt; font-weight: normal; opacity: 0.85; margin-bottom: 40px; }
  .cover-divider { width: 80px; height: 3px; background: rgba(255,255,255,0.5); margin: 30px auto; }
  .cover-meta { font-size: 10pt; opacity: 0.7; line-height: 2; }
  .cover-tag {
    display: inline-block;
    background: rgba(255,255,255,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 20px;
    padding: 6px 20px;
    font-size: 10pt;
    margin-top: 30px;
  }

  /* 目次 */
  .toc {
    padding: 40px 20px;
    page-break-after: always;
  }
  .toc h2 { font-size: 18pt; color: #1a237e; border-bottom: 3px solid #1a237e; padding-bottom: 10px; margin-bottom: 25px; }
  .toc-item {
    display: flex;
    align-items: baseline;
    padding: 8px 0;
    border-bottom: 1px dotted #ccc;
    font-size: 11pt;
  }
  .toc-num { color: #1a237e; font-weight: bold; min-width: 30px; font-size: 12pt; }
  .toc-title { flex: 1; }
  .toc-sub { padding: 4px 0 4px 30px; font-size: 10pt; color: #555; }

  /* セクション共通 */
  .section {
    padding: 30px 20px;
    page-break-inside: avoid;
  }
  .section + .section { border-top: 2px solid #e8eaf6; }
  .section:last-child { padding: 30px 20px 0; }

  .section-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .section-num {
    background: #1a237e;
    color: #fff;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16pt;
    font-weight: bold;
    flex-shrink: 0;
  }
  .section h2 { font-size: 16pt; color: #1a237e; }
  .section h3 { font-size: 12pt; color: #0d47a1; margin: 18px 0 10px; padding-left: 12px; border-left: 4px solid #1565c0; }

  p { margin: 10px 0; }
  ul, ol { margin: 10px 0 10px 22px; }
  li { margin: 5px 0; }

  /* ノートボックス */
  .note {
    background: #e8f4fd;
    border-left: 4px solid #1565c0;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
    font-size: 10pt;
  }
  .note strong { color: #0d47a1; }
  .warn {
    background: #fff8e1;
    border-left: 4px solid #f9a825;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
    font-size: 10pt;
  }
  .warn strong { color: #e65100; }

  /* 手順ステップ */
  .steps { margin: 15px 0; }
  .step {
    display: flex;
    gap: 14px;
    margin-bottom: 14px;
    align-items: flex-start;
  }
  .step-num {
    background: #1565c0;
    color: #fff;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11pt;
    font-weight: bold;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .step-body { flex: 1; }
  .step-body strong { color: #1a237e; display: block; margin-bottom: 3px; }

  /* スクリーンモックアップ */
  .mockup {
    border: 2px solid #90a4ae;
    border-radius: 8px;
    overflow: hidden;
    margin: 16px 0;
    font-size: 9.5pt;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  .mockup-bar {
    background: #263238;
    color: #eceff1;
    padding: 7px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9pt;
  }
  .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
  .mockup-dot.red { background: #ef5350; }
  .mockup-dot.yellow { background: #ffca28; }
  .mockup-dot.green { background: #66bb6a; }
  .mockup-url { background: #37474f; padding: 3px 12px; border-radius: 4px; font-size: 9pt; color: #b0bec5; flex: 1; }

  .wp-admin {
    background: #f0f0f1;
    display: flex;
    min-height: 180px;
  }
  .wp-sidebar {
    background: #1d2327;
    color: #a7aaad;
    width: 130px;
    padding: 10px 0;
    flex-shrink: 0;
    font-size: 9pt;
  }
  .wp-sidebar-logo {
    padding: 8px 14px 14px;
    color: #fff;
    font-weight: bold;
    font-size: 10pt;
    border-bottom: 1px solid #2c3338;
    margin-bottom: 6px;
  }
  .wp-menu-item {
    padding: 7px 14px;
    cursor: pointer;
  }
  .wp-menu-item:hover, .wp-menu-item.active { background: #2271b1; color: #fff; }
  .wp-menu-item.active { color: #fff; }

  .wp-content { flex: 1; padding: 14px 18px; }
  .wp-content h4 { font-size: 18pt; color: #1d2327; margin-bottom: 14px; font-weight: 400; }
  .wp-form-row { margin-bottom: 12px; }
  .wp-form-label { font-size: 9pt; color: #50575e; margin-bottom: 4px; display: block; }
  .wp-form-input {
    width: 100%;
    padding: 5px 10px;
    border: 1px solid #8c8f94;
    border-radius: 3px;
    font-size: 10pt;
    background: #fff;
    color: #50575e;
  }
  .wp-form-input.highlight { border-color: #2271b1; box-shadow: 0 0 0 2px rgba(34,113,177,0.2); }
  .wp-btn {
    background: #2271b1;
    color: #fff;
    border: none;
    padding: 6px 16px;
    border-radius: 3px;
    font-size: 10pt;
    cursor: pointer;
  }
  .wp-btn-secondary {
    background: #f6f7f7;
    color: #50575e;
    border: 1px solid #dcdcde;
    padding: 6px 16px;
    border-radius: 3px;
    font-size: 10pt;
    cursor: pointer;
    margin-right: 8px;
  }
  .wp-notice {
    background: #fff;
    border-left: 4px solid #72aee6;
    padding: 8px 14px;
    margin-bottom: 12px;
    font-size: 9.5pt;
  }

  /* Localアプリモックアップ */
  .local-app {
    background: #1a1a2e;
    color: #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    margin: 16px 0;
    font-size: 9.5pt;
  }
  .local-titlebar {
    background: #16213e;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 9pt;
    color: #a0a0b0;
  }
  .local-body { display: flex; min-height: 160px; }
  .local-sidebar {
    background: #0f3460;
    width: 120px;
    padding: 12px 0;
    flex-shrink: 0;
  }
  .local-site-item {
    padding: 8px 14px;
    font-size: 9pt;
    cursor: pointer;
    border-left: 3px solid transparent;
  }
  .local-site-item.active { border-left-color: #e94560; background: rgba(233,69,96,0.1); color: #fff; }
  .local-main { flex: 1; padding: 14px 18px; }
  .local-site-name { font-size: 14pt; font-weight: bold; color: #fff; margin-bottom: 6px; }
  .local-badge {
    display: inline-block;
    background: #4caf50;
    color: #fff;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 9pt;
    margin-bottom: 14px;
  }
  .local-info-row { display: flex; gap: 20px; margin-bottom: 8px; font-size: 9.5pt; color: #b0b0c0; }
  .local-info-label { color: #808090; min-width: 80px; }
  .local-btn {
    background: #e94560;
    color: #fff;
    border: none;
    padding: 7px 20px;
    border-radius: 4px;
    font-size: 10pt;
    margin-right: 10px;
    cursor: pointer;
  }
  .local-btn-ghost {
    background: transparent;
    color: #a0a0b0;
    border: 1px solid #333360;
    padding: 7px 20px;
    border-radius: 4px;
    font-size: 10pt;
    cursor: pointer;
  }

  /* ファイルツリー */
  .file-tree {
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 6px;
    padding: 14px 18px;
    font-family: 'Courier New', 'Menlo', monospace;
    font-size: 9.5pt;
    line-height: 1.7;
    margin: 14px 0;
  }
  .file-tree .folder { color: #89b4fa; }
  .file-tree .php { color: #a6e3a1; }
  .file-tree .css { color: #f38ba8; }
  .file-tree .pdf { color: #fab387; }
  .file-tree .highlight-line { background: rgba(166,227,161,0.15); display: block; padding: 0 8px; margin: 0 -18px; }

  /* テーマカード */
  .theme-card {
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    display: inline-block;
    width: 160px;
    margin: 8px;
    vertical-align: top;
    font-size: 9pt;
  }
  .theme-card.active { border-color: #2271b1; }
  .theme-preview { background: linear-gradient(135deg, #667eea, #764ba2); height: 90px; }
  .theme-info { padding: 8px 10px; background: #fff; }
  .theme-name { font-weight: bold; color: #1d2327; }
  .theme-active-badge { background: #2271b1; color: #fff; padding: 1px 8px; border-radius: 3px; font-size: 8pt; margin-top: 5px; display: inline-block; }

  /* コードブロック */
  code {
    background: #f4f4f8;
    border: 1px solid #e0e0e8;
    padding: 1px 6px;
    border-radius: 3px;
    font-family: 'Courier New', 'Menlo', monospace;
    font-size: 9.5pt;
    color: #d63031;
  }
  .code-block {
    background: #1e1e2e;
    color: #cdd6f4;
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'Courier New', 'Menlo', monospace;
    font-size: 9.5pt;
    line-height: 1.7;
    margin: 12px 0;
    overflow: hidden;
  }
  .code-block .kw { color: #cba6f7; }
  .code-block .str { color: #a6e3a1; }
  .code-block .cm { color: #6c7086; }

  /* チェックリスト */
  .checklist { list-style: none; margin: 12px 0; }
  .checklist li {
    padding: 6px 0 6px 30px;
    position: relative;
    border-bottom: 1px solid #f0f0f0;
    font-size: 10.5pt;
  }
  .checklist li::before {
    content: '☐';
    position: absolute;
    left: 4px;
    color: #1565c0;
    font-size: 13pt;
  }

  /* フォルダパス強調 */
  .path {
    background: #f4f4f8;
    border: 1px solid #ddd;
    padding: 6px 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 10pt;
    display: inline-block;
    margin: 6px 0;
    color: #333;
  }

  @media print {
    .cover { page-break-after: always; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- ===================== 表紙 ===================== -->
<div class="cover">
  <div class="cover-logo"></div>
  <h1>WordPress セットアップ手順書</h1>
  <h2></h2>
  <div class="cover-divider"></div>
  <div class="cover-meta">
    WordPressテーマ自動変換ツールが自動生成したWordPressテーマをLocal（ローカル開発環境）で動かし、サイト公開するまでの完全ガイドです。
  </div>
  <div class="cover-tag"></div>
</div>

<!-- ===================== 目次 ===================== -->
<div class="toc">
  <h2>目次</h2>
  <div class="toc-item"><span class="toc-num">1</span><span class="toc-title">変換されたファイルの構成を理解する</span></div>
  <div class="toc-item"><span class="toc-num">2</span><span class="toc-title">Local をインストールする</span></div>
  <div class="toc-item"><span class="toc-num">3</span><span class="toc-title">Local で WordPress サイトを作成する</span></div>
  <div class="toc-item"><span class="toc-num">4</span><span class="toc-title">テーマファイルを WordPress に配置する</span></div>
  <div class="toc-item"><span class="toc-num">5</span><span class="toc-title">WordPress 管理画面の基本設定</span></div>
  <div class="toc-item"><span class="toc-num">6</span><span class="toc-title">テーマを有効化する</span></div>
  <div class="toc-item"><span class="toc-num">7</span><span class="toc-title">固定ページを作成する</span></div>
  <div class="toc-item"><span class="toc-num">8</span><span class="toc-title">お問い合わせフォームを設定する（Contact Form 7）</span></div>
  <div class="toc-item"><span class="toc-num">9</span><span class="toc-title">ナビゲーションメニューを設定する</span></div>
  <div class="toc-item"><span class="toc-num">10</span><span class="toc-title">サイトを確認・調整する</span></div>
  <div class="toc-item"><span class="toc-num">11</span><span class="toc-title">本番サーバーへの移行（参考）</span></div>
</div>

<!-- ===================== STEP 1 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">1</div>
    <h2>変換されたファイルの構成を理解する</h2>
  </div>

  <p>生成された ZIP ファイルを解凍すると、以下フォルダ構成になっています。</p>

  <div class="file-tree">
<span class="folder">custom-theme/</span>
├── <span class="css">style.css</span>          ← テーマ宣言ファイル（WordPress必須）
├── <span class="php">functions.php</span>     ← CSS・JS読込み、テーマ機能設定
├── <span class="php">header.php</span>        ← 共通ヘッダー（&lt;!DOCTYPE&gt;〜&lt;/header&gt;）
├── <span class="php">footer.php</span>        ← 共通フッター（&lt;footer&gt;〜&lt;/html&gt;）
├── <span class="php highlight-line">index.php</span>         ← トップページテンプレート
├── <span class="php">page.php</span>          ← 固定ページ汎用テンプレート
├── <span class="php">single.php</span>        ← ブログ投稿記事テンプレート
├── <span class="php">page-about.php</span>    ← about.html から変換（あれば）
├── <span class="css">css/</span>              ← 元サイトのCSSファイル
├── <span class="folder">js/</span>               ← 元サイトのJavaScriptファイル
├── <span class="folder">images/</span>           ← 元サイトの画像ファイル
└── <span class="pdf">設定手順書.html</span>    ← この手順書（ブラウザで開けます）
  </div>

  <h3>各ファイルの役割</h3>
  <table style="width:100%; border-collapse:collapse; font-size:10pt; margin: 10px 0;">
    <tr style="background:#1a237e; color:#fff;">
      <th style="padding:8px 12px; text-align:left; width:35%;">ファイル名</th>
      <th style="padding:8px 12px; text-align:left;">役割</th>
    </tr>
    <tr style="background:#e8eaf6;">
      <td style="padding:8px 12px;"><code>style.css</code></td>
      <td style="padding:8px 12px;">WordPress がテーマとして認識するための必須ファイル。先頭のコメントにテーマ名・作者などを記述します。</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;"><code>functions.php</code></td>
      <td style="padding:8px 12px;">テーマの設定ファイル。CSS・JS の読み込み登録、WordPress の機能有効化を行います。</td>
    </tr>
    <tr style="background:#e8eaf6;">
      <td style="padding:8px 12px;"><code>header.php</code></td>
      <td style="padding:8px 12px;">すべてのページで共通のヘッダー部分。<code>get_header()</code> で呼び出されます。</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;"><code>footer.php</code></td>
      <td style="padding:8px 12px;">すべてのページで共通のフッター部分。<code>get_footer()</code> で呼び出されます。</td>
    </tr>
    <tr style="background:#e8eaf6;">
      <td style="padding:8px 12px;"><code>index.php</code></td>
      <td style="padding:8px 12px;">トップページのテンプレート。元の <code>index.html</code> から変換されました。</td>
    </tr>
  </table>

  <div class="note">
    <strong>📌 ポイント:</strong> すべての <code>.php</code> ファイルには、変更された箇所ごとに
    日本語のコメントが追記されています。コードを読みながら WordPress の仕組みを学べます。
  </div>
</div>

<!-- ===================== STEP 2 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">2</div>
    <h2>Local をインストールする</h2>
  </div>

  <p>
    <strong>Local</strong>（旧称: Local by Flywheel）は、PC 上に WordPress の開発環境を
    簡単に作れる無料ツールです。インターネットなしでも WordPress サイトを動かせます。
  </p>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>Local の公式サイトからインストーラーをダウンロードする</strong>
        ブラウザで <strong>localwp.com</strong> を開き、「Download」ボタンをクリックします。<br>
        お使いの OS（Mac / Windows）に合ったインストーラーが自動判定されます。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>インストーラーを実行する</strong>
        ダウンロードした <code>.dmg</code>（Mac）または <code>.exe</code>（Windows）を
        ダブルクリックし、画面の指示に従ってインストールします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>Local を起動する</strong>
        インストール完了後、Local アプリを起動します。
        初回起動時にアカウント登録（無料）を求められます。
        メールアドレスを登録してログインしてください。
      </div>
    </div>
  </div>

  <div class="warn">
    <strong>⚠️ Mac の場合:</strong> セキュリティの警告が表示されたら
    「システム環境設定 → セキュリティとプライバシー → このまま開く」を選択してください。
  </div>
</div>

<!-- ===================== STEP 3 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">3</div>
    <h2>Local で WordPress サイトを作成する</h2>
  </div>

  <p>Local アプリで新しい WordPress サイトを作成します。</p>

  <div class="local-app">
    <div class="local-titlebar">
      <div class="mockup-dot red"></div>
      <div class="mockup-dot yellow"></div>
      <div class="mockup-dot green"></div>
      <span style="margin-left:10px;">Local</span>
    </div>
    <div class="local-body">
      <div class="local-sidebar">
        <div style="padding: 10px 14px; font-size:9pt; color:#8090a0; border-bottom:1px solid #0a2040; margin-bottom:8px;">MY SITES</div>
        <div class="local-site-item active">my-website</div>
      </div>
      <div class="local-main">
        <div class="local-site-name">my-website</div>
        <div class="local-badge">● RUNNING</div>
        <div class="local-info-row">
          <span><span class="local-info-label">URL:</span> http://my-website.local</span>
        </div>
        <div class="local-info-row">
          <span><span class="local-info-label">PHP:</span> 8.1.0</span>
          <span><span class="local-info-label">MySQL:</span> 8.0.16</span>
        </div>
        <div style="margin-top:14px;">
          <button class="local-btn">WP Admin を開く</button>
          <button class="local-btn-ghost">サイトを開く</button>
        </div>
      </div>
    </div>
  </div>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>「＋」ボタンをクリックして新規サイトを追加する</strong>
        Local の左下にある <code>＋</code> ボタンをクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>サイト名を入力する</strong>
        「What's your site's name?」という画面が表示されます。<br>
        任意のサイト名（例: <code>my-website</code>）を入力して「Continue」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>環境設定を選ぶ（Preferred を選択 → Continue）</strong>
        「Choose your environment」では <strong>Preferred</strong> を選択します。<br>
        PHP のバージョンは <strong>8.1 以上</strong> が推奨です。
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <strong>WordPress のログイン情報を設定する</strong>
        ユーザー名・パスワード・メールアドレスを設定します。<br>
        これが WordPress 管理画面のログイン情報になります。メモしておいてください。
      </div>
    </div>
    <div class="step">
      <div class="step-num">5</div>
      <div class="step-body">
        <strong>「Add Site」をクリックしてサイトを作成する</strong>
        数分待つと WordPress サイトが作成されます。<br>
        Local の画面にサイトが表示されたら完了です。
      </div>
    </div>
  </div>

  <div class="note">
    <strong>📌 作成されるローカル URL:</strong> サイト名が <code>my-website</code> なら
    <code>http://my-website.local</code> でアクセスできます（PC 内のみ）。
  </div>
</div>

<!-- ===================== STEP 4 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">4</div>
    <h2>テーマファイルを WordPress に配置する</h2>
  </div>

  <p>
    生成された <code>custom-theme</code> フォルダを WordPress のテーマフォルダにコピーします。
  </p>

  <h3>テーマフォルダの場所を開く</h3>

  <p>WordPress テーマを配置するフォルダは以下の場所にあります:</p>

  <div class="path">（Local サイトのフォルダ）/ app / public / wp-content / themes /</div>

  <p>Local アプリで作成したサイトを選択し、右クリック →「Reveal in Finder（Mac）/
  Show in Explorer（Windows）」でサイトのルートフォルダを開けます。</p>

  <div class="file-tree">
<span class="folder">my-website/</span>           ← Local のサイトルート
└── <span class="folder">app/</span>
    └── <span class="folder">public/</span>
        └── <span class="folder">wp-content/</span>
            └── <span class="folder">themes/</span>      ← ここにテーマを入れる
                ├── <span class="folder">twentytwentyfour/</span>
                └── <span class="folder highlight-line">custom-theme/</span>    ← ここにコピーする ✅
  </div>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>ダウンロードした ZIP を解凍する</strong>
        <code>wordpress-theme.zip</code> を解凍すると <code>custom-theme</code> フォルダが出てきます。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong><code>themes</code> フォルダを開く</strong>
        Local でサイトを右クリックし、「Reveal in Finder」→
        <code>app / public / wp-content / themes</code> フォルダを開きます。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong><code>custom-theme</code> フォルダをコピーする</strong>
        解凍した <code>custom-theme</code> フォルダを <code>themes</code> フォルダ内にドラッグ＆ドロップします。
      </div>
    </div>
  </div>

  <div class="warn">
    <strong>⚠️ 注意:</strong> <code>themes</code> の中に <code>custom-theme</code> フォルダが入るように配置してください。
    フォルダの中にさらにフォルダが入る二重構造にならないよう注意します。
  </div>
</div>

<!-- ===================== STEP 5 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">5</div>
    <h2>WordPress 管理画面の基本設定</h2>
  </div>

  <p>WordPress 管理画面（WP Admin）にログインして基本設定を行います。</p>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>管理画面にログインする</strong>
        Local で「WP Admin を開く」ボタンをクリックします。<br>
        または <code>http://（サイト名）.local/wp-admin</code> にアクセスします。
      </div>
    </div>
  </div>

  <div class="mockup">
    <div class="mockup-bar">
      <div class="mockup-dot red"></div>
      <div class="mockup-dot yellow"></div>
      <div class="mockup-dot green"></div>
      <div class="mockup-url">http://my-website.local/wp-admin</div>
    </div>
    <div style="background:#f0f0f1; padding:30px; text-align:center;">
      <div style="background:#fff; max-width:300px; margin:0 auto; padding:30px; border-radius:4px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
        <div style="font-size:22pt; margin-bottom:10px;">🔷</div>
        <div style="font-size:13pt; color:#1d2327; margin-bottom:20px; font-weight:bold;">WordPress</div>
        <div class="wp-form-row">
          <input class="wp-form-input" value="admin" readonly>
        </div>
        <div class="wp-form-row">
          <input class="wp-form-input" type="password" value="••••••••" readonly>
        </div>
        <button class="wp-btn" style="width:100%;">ログイン</button>
      </div>
    </div>
  </div>

  <h3>サイト基本情報の設定</h3>

  <div class="wp-admin" style="border-radius:4px; overflow:hidden;">
    <div class="wp-sidebar">
      <div class="wp-sidebar-logo">🔷 WP管理</div>
      <div class="wp-menu-item">ダッシュボード</div>
      <div class="wp-menu-item active">設定</div>
      <div class="wp-menu-item" style="padding-left:24px; font-size:8.5pt;">　一般</div>
      <div class="wp-menu-item">外観</div>
      <div class="wp-menu-item">固定ページ</div>
    </div>
    <div class="wp-content">
      <h4>一般設定</h4>
      <div class="wp-form-row">
        <label class="wp-form-label">サイトのタイトル</label>
        <input class="wp-form-input highlight" value="My WordPress Site" readonly>
        <div style="font-size:8.5pt; color:#50575e; margin-top:3px;">← ここにサイト名を入力してください</div>
      </div>
      <div class="wp-form-row">
        <label class="wp-form-label">キャッチフレーズ</label>
        <input class="wp-form-input" value="Just another WordPress site" readonly>
      </div>
      <div class="wp-form-row">
        <label class="wp-form-label">サイトの言語</label>
        <input class="wp-form-input highlight" value="日本語" readonly>
        <div style="font-size:8.5pt; color:#50575e; margin-top:3px;">← 日本語に変更してください</div>
      </div>
      <button class="wp-btn">変更を保存</button>
    </div>
  </div>

  <div class="steps" style="margin-top:16px;">
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>設定 → 一般 でサイト情報を設定する</strong>
        「サイトのタイトル」に実際のサイト名を入力し、
        「サイトの言語」を <strong>日本語</strong> に変更して「変更を保存」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>設定 → パーマリンク設定 を「投稿名」に変更する</strong>
        「設定 → パーマリンク設定」を開き、<strong>「投稿名」</strong> を選択して保存します。<br>
        これにより URL が <code>/about/</code> のような読みやすい形式になります。
      </div>
    </div>
  </div>

  <div class="note">
    <strong>📌 パーマリンクについて:</strong> パーマリンクは各ページの URL の形式です。
    「投稿名」に設定すると <code>http://my-website.local/about/</code> のように
    ページ名が URL に含まれて SEO に有利です。
  </div>
</div>

<!-- ===================== STEP 6 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">6</div>
    <h2>テーマを有効化する</h2>
  </div>

  <p>配置した <code>custom-theme</code> を WordPress の有効テーマとして設定します。</p>

  <div class="wp-admin" style="border-radius:4px; overflow:hidden;">
    <div class="wp-sidebar">
      <div class="wp-sidebar-logo">🔷 WP管理</div>
      <div class="wp-menu-item">ダッシュボード</div>
      <div class="wp-menu-item active">外観</div>
      <div class="wp-menu-item" style="padding-left:24px; font-size:8.5pt;">　テーマ</div>
      <div class="wp-menu-item">設定</div>
    </div>
    <div class="wp-content">
      <h4>テーマ</h4>
      <div class="wp-notice">現在のテーマ: Twenty Twenty-Four</div>
      <div style="display:flex; flex-wrap:wrap;">
        <div class="theme-card">
          <div class="theme-preview" style="background:linear-gradient(135deg,#ccc,#999);"></div>
          <div class="theme-info">
            <div class="theme-name">Twenty Twenty-Four</div>
            <div style="font-size:8pt; color:#50575e;">現在のテーマ</div>
          </div>
        </div>
        <div class="theme-card active">
          <div class="theme-preview"></div>
          <div class="theme-info">
            <div class="theme-name">Custom WordPress Theme</div>
            <div class="theme-active-badge">有効化</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="steps" style="margin-top:16px;">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>外観 → テーマ を開く</strong>
        管理画面の左メニューから「外観」→「テーマ」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>「Custom WordPress Theme」を見つける</strong>
        テーマ一覧に「Custom WordPress Theme」が表示されていることを確認します。<br>
        表示されない場合はファイルの配置場所（STEP 4）を再確認してください。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>テーマにカーソルを合わせ「有効化」をクリックする</strong>
        テーマのサムネイルにマウスを乗せると「有効化」ボタンが表示されます。クリックして有効化します。
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <strong>サイトを確認する</strong>
        「サイトを表示」リンクをクリックしてサイトのデザインが適用されているか確認します。
      </div>
    </div>
  </div>
</div>

<!-- ===================== STEP 7 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">7</div>
    <h2>固定ページを作成する</h2>
  </div>

  <p>
    元の静的サイトに複数のページ（About、お問い合わせ等）がある場合、
    WordPress の「固定ページ」として作成します。
  </p>

  <div class="wp-admin" style="border-radius:4px; overflow:hidden;">
    <div class="wp-sidebar">
      <div class="wp-sidebar-logo">🔷 WP管理</div>
      <div class="wp-menu-item">外観</div>
      <div class="wp-menu-item active">固定ページ</div>
      <div class="wp-menu-item" style="padding-left:24px; font-size:8.5pt;">　新規追加</div>
      <div class="wp-menu-item">設定</div>
    </div>
    <div class="wp-content">
      <h4>新規固定ページを追加</h4>
      <div class="wp-form-row">
        <input class="wp-form-input highlight" value="About" style="font-size:14pt; padding:8px 12px;" readonly>
        <div style="font-size:8.5pt; color:#50575e; margin-top:3px;">← ページタイトルを入力</div>
      </div>
      <div style="background:#f9f9f9; border:1px solid #ddd; border-radius:3px; padding:12px; margin-bottom:12px; font-size:9.5pt; color:#50575e; min-height:60px;">
        ページの本文（エディターで入力またはショートコードで対応）
      </div>
      <div style="background:#f0f0f1; border:1px solid #ddd; border-radius:3px; padding:10px; font-size:9pt;">
        <div style="margin-bottom:6px;"><strong>パーマリンク</strong></div>
        <div>URL: http://my-website.local/<span style="background:#fff; border:1px solid #2271b1; padding:2px 8px; border-radius:3px; color:#2271b1;">about</span>/
        <div style="font-size:8.5pt; color:#777; margin-top:3px;">← スラッグを「about」に設定（page-about.php と対応）</div>
        </div>
      </div>
    </div>
  </div>

  <div class="steps" style="margin-top:16px;">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>固定ページ → 新規追加 を開く</strong>
        管理画面の「固定ページ」→「新規追加」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>タイトルを入力し、スラッグを設定する</strong>
        ページタイトルを入力します（例: <code>About</code>）。<br>
        右側のパネルまたはタイトル下の「パーマリンク」でスラッグを設定します。<br>
        <strong>スラッグは元の HTML ファイル名と合わせてください</strong>（例: <code>about</code>）。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>公開する</strong>
        右上の「公開」ボタンをクリックしてページを公開します。<br>
        スラッグを正しく設定すると、<code>page-about.php</code> テンプレートが自動適用されます。
      </div>
    </div>
  </div>

  <div class="note">
    <strong>📌 スラッグとテンプレートの対応:</strong><br>
    スラッグ <code>about</code> → <code>page-about.php</code> テンプレートが使われます。<br>
    スラッグ <code>contact</code> → <code>page-contact.php</code> テンプレートが使われます。<br>
    この仕組みを「テンプレート階層」と呼びます。
  </div>
</div>

<!-- ===================== STEP 8 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">8</div>
    <h2>お問い合わせフォームを設定する（Contact Form 7）</h2>
  </div>

  <p>
    お問い合わせページ（<code>page-contact.php</code>）のフォームは、
    プラグイン「<strong>Contact Form 7</strong>」と連携しています。
    以下の手順でインストール・設定してください。
  </p>

  <div class="note">
    <strong>📌 なぜプラグインが必要？</strong><br>
    WordPress はフォームの送信・メール送信機能を標準搭載していません。
    Contact Form 7 をインストールすることで、フォームが自動的に表示・機能するようになります。
  </div>

  <h3>Contact Form 7 のインストール</h3>

  <div class="wp-admin" style="border-radius:4px; overflow:hidden;">
    <div class="wp-sidebar">
      <div class="wp-sidebar-logo">🔷 WP管理</div>
      <div class="wp-menu-item">ダッシュボード</div>
      <div class="wp-menu-item active">プラグイン</div>
      <div class="wp-menu-item" style="padding-left:24px; font-size:8.5pt;">　新規追加</div>
      <div class="wp-menu-item">設定</div>
    </div>
    <div class="wp-content">
      <h4>プラグインを追加</h4>
      <div class="wp-form-row">
        <input class="wp-form-input highlight" value="Contact Form 7" style="max-width:280px;" readonly>
        <div style="font-size:8.5pt; color:#50575e; margin-top:3px;">← ここで検索する</div>
      </div>
      <div style="margin-top:10px; background:#fff; border:1px solid #ddd; border-radius:4px; padding:12px; display:inline-block;">
        <div style="font-weight:bold; font-size:10pt; margin-bottom:4px;">Contact Form 7</div>
        <div style="font-size:9pt; color:#50575e; margin-bottom:8px;">作成者: Takayuki Miyoshi</div>
        <button class="wp-btn">今すぐインストール</button>
      </div>
    </div>
  </div>

  <div class="steps" style="margin-top:16px;">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>プラグイン → 新規追加 を開く</strong>
        管理画面の「プラグイン」→「新規追加」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>「Contact Form 7」を検索してインストールする</strong>
        右上の検索欄に「Contact Form 7」と入力します。<br>
        表示されたプラグインの「今すぐインストール」→「有効化」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>送信先メールアドレスを設定する</strong>
        管理画面に「お問い合わせ」メニューが追加されます。<br>
        「お問い合わせ」→「フォーム」→「コンタクトフォーム 1」を開き、<br>
        「メール」タブで <code>To:</code> 欄を実際のメールアドレスに変更して保存します。
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <strong>お問い合わせページを確認する</strong>
        スラッグ <code>contact</code> の固定ページを開くと、フォームが自動的に表示されます。<br>
        テスト送信して実際にメールが届くか確認してください。
      </div>
    </div>
  </div>

  <h3>CF7 フォームのカスタマイズ（任意）</h3>

  <p>
    「お問い合わせ」→「フォーム」→「フォーム」タブで、フォームのフィールドを編集できます。
    以下は元のサイトのフォームを再現するサンプルです：
  </p>

  <div class="code-block" style="font-size:9pt;">
<span class="cm">&lt;!-- CF7 フォームタブの内容（例） --&gt;</span>
&lt;p&gt;お名前 [text* your-name placeholder "山田 太郎"]&lt;/p&gt;
&lt;p&gt;メールアドレス [email* your-email placeholder "example@email.com"]&lt;/p&gt;
&lt;p&gt;会社名・団体名 [text your-company placeholder "◯◯株式会社（任意）"]&lt;/p&gt;
&lt;p&gt;件名 [text* your-subject placeholder "例：Webサイトリニューアルのご相談"]&lt;/p&gt;
&lt;p&gt;メッセージ [textarea* your-message placeholder "ご依頼内容をご記入ください"]&lt;/p&gt;
&lt;p&gt;[submit "送信する"]&lt;/p&gt;
  </div>

  <div class="warn">
    <strong>⚠️ 迷惑メール対策:</strong> reCAPTCHA や Flamingo（送信ログ保存）との併用を推奨します。
    どちらも無料で Contact Form 7 と連携できます。
  </div>
</div>

<!-- ===================== STEP 9 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">9</div>
    <h2>ナビゲーションメニューを設定する</h2>
  </div>

  <p>
    元の静的サイトのナビゲーションリンクを WordPress のメニュー機能で動的に管理します。
  </p>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>外観 → メニュー を開く</strong>
        管理画面の「外観」→「メニュー」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>新しいメニューを作成する</strong>
        「新しいメニューを作成しましょう」リンクをクリックし、
        メニュー名（例: <code>メインメニュー</code>）を入力して「メニューを作成」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>メニューに固定ページを追加する</strong>
        左側の「固定ページ」ボックスからトップページや各固定ページにチェックを入れ、
        「メニューに追加」をクリックします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <strong>メニューの位置を設定する</strong>
        「メニューの位置」で「メインメニュー」にチェックを入れます。<br>
        （<code>functions.php</code> で <code>primary-menu</code> として登録したメニュー位置です）
      </div>
    </div>
    <div class="step">
      <div class="step-num">5</div>
      <div class="step-body">
        <strong>メニューを保存する</strong>
        「メニューを保存」ボタンをクリックして設定を保存します。
      </div>
    </div>
  </div>

  <h3>テンプレートでメニューを表示する（上級）</h3>

  <p>
    現在の <code>header.php</code> には元の HTML の静的な <code>&lt;ul&gt;&lt;li&gt;</code> リストが含まれています。
    WordPress のメニュー機能を使って動的に切り替えるには、該当箇所を以下のコードに置き換えます:
  </p>

  <div class="code-block">
<span class="cm">&lt;!-- header.php のナビゲーション部分を以下に置き換える --&gt;</span>
&lt;nav class="main-navigation"&gt;
  <span class="kw">&lt;?php</span>
  wp_nav_menu( <span class="kw">array</span>(
      <span class="str">'theme_location'</span> =&gt; <span class="str">'primary-menu'</span>, <span class="cm">// functions.phpの登録名</span>
      <span class="str">'menu_class'</span>      =&gt; <span class="str">'nav-menu'</span>,      <span class="cm">// &lt;ul&gt;のCSSクラス</span>
      <span class="str">'container'</span>       =&gt; <span class="str">false</span>,           <span class="cm">// &lt;div&gt;で囲まない</span>
  ) );
  <span class="kw">?&gt;</span>
&lt;/nav&gt;
  </div>
</div>

<!-- ===================== STEP 10 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">10</div>
    <h2>サイトを確認・調整する</h2>
  </div>

  <p>Local のサイト URL を開いてデザインや表示を確認します。</p>

  <h3>確認チェックリスト</h3>
  <ul class="checklist">
    <li>トップページが正しく表示されている</li>
    <li>ヘッダーとフッターが全ページで共通して表示されている</li>
    <li>CSSのスタイルが元のサイトと同じように適用されている</li>
    <li>画像がすべて表示されている（壊れたアイコンがない）</li>
    <li>ナビゲーションリンクが正しく遷移する</li>
    <li>固定ページ（About等）が正しく表示されている</li>
    <li>JavaScript の動作に問題がない</li>
    <li>ブラウザのデベロッパーツール（F12）でエラーが出ていない</li>
  </ul>

  <h3>よくある問題と解決方法</h3>

  <table style="width:100%; border-collapse:collapse; font-size:10pt; margin: 10px 0;">
    <tr style="background:#1a237e; color:#fff;">
      <th style="padding:8px 12px; text-align:left; width:35%;">症状</th>
      <th style="padding:8px 12px; text-align:left;">解決方法</th>
    </tr>
    <tr style="background:#fce4ec;">
      <td style="padding:8px 12px;">CSS が適用されていない</td>
      <td style="padding:8px 12px;"><code>functions.php</code> の <code>wp_enqueue_style()</code> でファイルパスが正しいか確認する</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;">画像が表示されない</td>
      <td style="padding:8px 12px;">画像ファイルがテーマフォルダの <code>images/</code> に存在するか確認する</td>
    </tr>
    <tr style="background:#fce4ec;">
      <td style="padding:8px 12px;">テーマが一覧に表示されない</td>
      <td style="padding:8px 12px;"><code>style.css</code> 先頭の <code>Theme Name:</code> コメントが正しく書かれているか確認する</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;">固定ページが 404 になる</td>
      <td style="padding:8px 12px;">「設定 → パーマリンク設定」を「投稿名」にして保存する（キャッシュリセット）</td>
    </tr>
    <tr style="background:#fce4ec;">
      <td style="padding:8px 12px;">PHP エラーが表示される</td>
      <td style="padding:8px 12px;">該当の <code>.php</code> ファイルをテキストエディタで開き、エラー行を確認する</td>
    </tr>
  </table>
</div>

<!-- ===================== STEP 11 ===================== -->
<div class="section">
  <div class="section-header">
    <div class="section-num">11</div>
    <h2>本番サーバーへの移行（参考）</h2>
  </div>

  <p>
    ローカルで確認が完了したら、レンタルサーバーへ移行して公開できます。
  </p>

  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div class="step-body">
        <strong>レンタルサーバーに WordPress をインストールする</strong>
        多くのレンタルサーバー（さくらインターネット、エックスサーバー等）は
        WordPress の「簡単インストール」機能を提供しています。
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div class="step-body">
        <strong>テーマファイルを FTP でアップロードする</strong>
        FTP クライアント（FileZilla 等）を使って <code>custom-theme</code> フォルダを
        サーバーの <code>wp-content/themes/</code> フォルダにアップロードします。
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div class="step-body">
        <strong>サーバーの WordPress 管理画面でテーマを有効化する</strong>
        STEP 6 と同様の手順でサーバー上の WordPress でテーマを有効化します。
      </div>
    </div>
    <div class="step">
      <div class="step-num">4</div>
      <div class="step-body">
        <strong>コンテンツを移行する（必要な場合）</strong>
        ローカルで作成した固定ページ・メニュー設定を本番サーバーでも再設定します。
        プラグイン「All-in-One WP Migration」を使うと、データベースごと簡単に移行できます。
      </div>
    </div>
  </div>

  <div class="note">
    <strong>📌 おすすめプラグイン（導入すると便利）:</strong><br>
    • <strong>Contact Form 7</strong> — お問い合わせフォームを簡単作成<br>
    • <strong>Yoast SEO</strong> — SEO 対策（タイトルタグ・メタ記述の管理）<br>
    • <strong>All-in-One WP Migration</strong> — バックアップ・サイト移行<br>
    • <strong>Site Kit by Google</strong> — Google Analytics・Search Console 連携
  </div>

  <div style="margin-top:30px; padding:20px; background:#e8f5e9; border-radius:8px; text-align:center;">
    <div style="font-size:24pt; margin-bottom:8px;"></div>
    <div style="font-size:14pt; font-weight:bold; color:#2e7d32; margin-bottom:8px;">
      WordPress テーマの設定完了おめでとうございます！
    </div>
    <div style="font-size:10.5pt; color:#388e3c;">
      変換された PHP ファイルのコメントを参考に、<br>
      少しずつコードを編集して WordPress をカスタマイズしていきましょう。
    </div>
  </div>
</div>

</body>
</html>`;
}

module.exports = { generatePdf };
