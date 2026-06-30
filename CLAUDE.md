# CLAUDE.md

## GitHubリポジトリ

https://github.com/krlarine77/wordpress-theme-maker.git

## プロジェクト概要

wordpress-theme-maker — ユーザーの静的サイトを自動で動的サイト（PHP）に変換し、Wordpressテーマとして使えるデータをダウンロードできるツール。

## デプロイ先

https://krlarine77.github.io/wordpress-theme-maker/

GitHub Pages（`docs/` フォルダを Source に設定）。`main` ブランチへのプッシュで自動更新。

## 技術スタック

### GitHub Pages 版（docs/ ― 本番・ブラウザ完結）

| 役割 | 技術 |
|---|---|
| UI | Vanilla HTML / CSS / JS（フレームワークなし） |
| ZIP 読み書き | [JSZip 3.10.1](https://stuk.github.io/jszip/)（CDN） |
| HTML → PHP 変換 | 正規表現ベース（`docs/js/converter.js`） |
| 手順書生成 | テンプレートリテラル（`docs/js/guide.js`） |
| UI ロジック | `docs/js/app.js` |

### ローカル開発版（server.js ― 開発・テスト用）

| 役割 | ライブラリ |
|---|---|
| HTTP サーバー | Express 4 |
| ファイルアップロード | multer |
| ZIP 読み書き | adm-zip |
| HTML 解析 | cheerio |
| PDF 生成 | puppeteer |

### 出力される WordPress テーマファイル

```
custom-theme/
  header.php        共通ヘッダー
  footer.php        共通フッター
  index.php         トップページ
  page-{slug}.php   各固定ページ（slug はHTMLファイル名から生成）
  functions.php     CSS/JS の wp_enqueue 登録
  style.css         テーマ宣言（WordPress 必須）
  single.php        ブログ投稿用汎用テンプレート
  page.php          固定ページ汎用テンプレート
  設定手順書.html    セットアップ手順書
```

## 命名規約

### ファイル名
- WordPress テーマ: `page-{slug}.php`（例: `page-about.php`, `page-contact.php`）
- GitHub Pages JS: 役割を表す単語のみ（`converter.js`, `guide.js`, `app.js`）

### JavaScript 関数
- HTML → PHP 変換: `convert` プレフィックス（例: `convertHtmlToWordPress()`）
- PHP テンプレート生成: `build` プレフィックス（例: `buildHeaderPhp()`, `buildFunctionsPhp()`）
- 内部マーカー文字列: `___ALL_CAPS___` 形式（例: `___CF7_FORM_PLACEHOLDER___`）

### CSS クラス（出力テーマ）
- BEM 準拠: `block__element--modifier`（例: `.header__nav`, `.footer__logo-mark`）

### PHP ヘルパー関数（出力テーマ）
- `ct_` プレフィックスで名前衝突を防ぐ（例: `ct_esc()`, `ct_old()`, `ct_err_class()`）

## 開発ルール

### コードスタイル
- コメントは「なぜ」が自明でない場合のみ記述する
- 不要な抽象化を避け、現在の要件に必要な実装のみ行う
- セキュリティ脆弱性（XSS、SQLインジェクション等）を絶対に導入しない

### テスト
- 変更後は必ずテストを実行して通過を確認する

## Git 運用ルール

**コードを変更するたびに、必ず以下の手順でGitHubにプッシュすること。**

1. 変更内容を確認する
   ```bash
   git status
   git diff
   ```

2. 関連ファイルをステージングする（`git add -A` は使わない）
   ```bash
   git add <変更したファイル>
   ```

3. 意味のあるコミットメッセージでコミットする
   ```bash
   git commit -m "変更内容を簡潔に説明するメッセージ"
   ```

4. GitHubにプッシュする
   ```bash
   git push origin main
   ```

### コミットメッセージの指針
- 「何を」ではなく「なぜ」を中心に書く
- 1〜2文で簡潔にまとめる
- 例: `fix: ログイン後のリダイレクト先が誤っていたバグを修正`

### 注意事項
- `.env` や認証情報を含むファイルは絶対にコミットしない
- `main` ブランチへの force push は行わない
- 破壊的な操作（`git reset --hard` 等）の前にユーザーへ確認する
