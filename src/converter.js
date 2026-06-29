const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

async function convertSite(siteRoot, themeDir) {
  const allFiles = getAllFiles(siteRoot);
  const htmlFiles = allFiles.filter(f => f.toLowerCase().endsWith('.html'));
  const assetFiles = allFiles.filter(f => !f.toLowerCase().endsWith('.html'));

  if (htmlFiles.length === 0) {
    throw new Error('ZIPの中にHTMLファイルが見つかりませんでした。index.htmlが含まれているか確認してください。');
  }

  // アセットファイルをテーマフォルダへコピー
  for (const file of assetFiles) {
    const rel = path.relative(siteRoot, file);
    const dest = path.join(themeDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  }

  // CSSとJSのパスを収集（functions.phpで wp_enqueue_ に使用）
  const cssFiles = assetFiles
    .filter(f => f.toLowerCase().endsWith('.css'))
    .map(f => path.relative(siteRoot, f).replace(/\\/g, '/'));
  const jsFiles = assetFiles
    .filter(f => f.toLowerCase().endsWith('.js'))
    .map(f => path.relative(siteRoot, f).replace(/\\/g, '/'));

  // 各HTMLファイルを変換
  const convertedFiles = htmlFiles.map(file => {
    const filename = path.basename(file, '.html');
    const html = fs.readFileSync(file, 'utf-8');
    return { filename, ...convertHtmlToWordPress(html, filename) };
  });

  // index.html を基準にheader/footerを生成
  const indexData = convertedFiles.find(f => f.filename === 'index') || convertedFiles[0];

  fs.writeFileSync(path.join(themeDir, 'header.php'), indexData.headerPhp, 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'footer.php'), indexData.footerPhp, 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'index.php'), indexData.indexPhp, 'utf-8');

  // index以外のHTMLはpage-{name}.phpとして出力
  for (const file of convertedFiles) {
    if (file.filename === 'index') continue;
    fs.writeFileSync(
      path.join(themeDir, `page-${file.filename}.php`),
      buildPageTemplate(file.filename, file.contentPart),
      'utf-8'
    );
  }

  const pageNames = htmlFiles.map(file => path.basename(file, '.html'));
  fs.writeFileSync(path.join(themeDir, 'functions.php'), buildFunctionsPhp(cssFiles, jsFiles, pageNames), 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'style.css'), buildStyleCss(), 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'single.php'), buildSinglePhp(), 'utf-8');
  fs.writeFileSync(path.join(themeDir, 'page.php'), buildGenericPagePhp(), 'utf-8');
}

// ─── HTML → WordPress PHP 変換 ────────────────────────────────────────────────

function convertHtmlToWordPress(htmlContent, filename) {
  const $ = cheerio.load(htmlContent, { decodeEntities: false });

  // ローカルCSSの<link>タグを説明コメントに置き換える
  $('link[rel="stylesheet"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (!href.startsWith('http') && !href.startsWith('//')) {
      $(el).replaceWith(
        `<!-- [変更] このCSSはfunctions.phpのwp_enqueue_style()で読み込まれます。\n` +
        `     WordPressの推奨方法に従い、プラグインとの競合を防ぐためここには書きません。\n` +
        `     元のタグ: <link rel="stylesheet" href="${href}"> -->`
      );
    }
  });

  // ローカルJSの<script>タグを説明コメントに置き換える
  $('script[src]').each((_, el) => {
    const src = $(el).attr('src') || '';
    if (!src.startsWith('http') && !src.startsWith('//')) {
      $(el).replaceWith(
        `<!-- [変更] このJSはfunctions.phpのwp_enqueue_script()で読み込まれます。\n` +
        `     </body>直前で読み込むことでページ表示速度が向上します。\n` +
        `     元のタグ: <script src="${src}"></script> -->`
      );
    }
  });

  let html = $.html();

  // ── 画像パスをWordPressテーマURLに変換 ──────────────────────────────
  html = html.replace(
    /(<img[^>]+src=["'])(?!https?:\/\/|\/\/|data:)(\.\/)?([^"']+)(["'][^>]*>)/gi,
    (match, before, _dot, src, ending) =>
      `${before}<?php echo esc_url( get_template_directory_uri() ); ?>/${src}${ending}\n` +
      `<!-- ↑ [変更] 画像パスをWordPressテーマフォルダのURLに変換しました。\n` +
      `     get_template_directory_uri() はこのテーマフォルダのURLを返すWordPress関数です。\n` +
      `     esc_url() はURLをサニタイズ(安全な文字列に変換)するセキュリティ対策です。 -->`
  );

  // ── 内部リンク(.html)をWordPress URLに変換 ──────────────────────────
  html = html.replace(
    /(<a[^>]+href=["'])index\.html(["'][^>]*>)/gi,
    (match, before, ending) =>
      `${before}<?php echo esc_url( home_url( '/' ) ); ?>${ending}\n` +
      `<!-- ↑ [変更] トップページのリンクをWordPressのホームURLに変換しました。\n` +
      `     home_url('/') はWordPressのサイトURLを返します。 -->`
  );
  html = html.replace(
    /(<a[^>]+href=["'])(?!https?:\/\/|\/\/|#|mailto:|tel:|index\.html)([^"']+)\.html(["'][^>]*>)/gi,
    (match, before, pageName, ending) =>
      `${before}<?php echo esc_url( home_url( '/${pageName}/' ) ); ?>${ending}\n` +
      `<!-- ↑ [変更] 内部リンクをWordPressのページURLに変換しました。\n` +
      `     WordPress管理画面でページスラッグを「${pageName}」に設定してください。 -->`
  );

  // ── <html> タグに language_attributes() を追加 ─────────────────────
  html = html.replace(
    /<html([^>]*)>/i,
    (match, attrs) => {
      const clean = attrs.replace(/lang=["'][^"']*["']/gi, '').trim();
      return (
        `<html ${clean} <?php language_attributes(); ?>>\n` +
        `<!-- ↑ [変更] language_attributes() はWordPressの言語設定(例: lang="ja")を自動出力します。\n` +
        `     WordPress管理画面 > 設定 > 一般 > サイトの言語 で設定した値が反映されます。 -->`
      );
    }
  );

  // ── <meta charset> をWordPressの設定から取得 ─────────────────────────
  html = html.replace(
    /<meta[^>]+charset=["']?[^"'\s>]+["']?[^>]*>/i,
    `<meta charset="<?php bloginfo( 'charset' ); ?>">\n` +
    `<!-- ↑ [変更] 文字コードをWordPressの設定から自動取得します。\n` +
    `     bloginfo('charset') はWordPress管理画面で設定した文字エンコーディングを出力します。 -->`
  );

  // ── <title> をWordPressが動的に生成 ──────────────────────────────────
  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title><?php wp_title( '|', true, 'right' ); ?><?php bloginfo( 'name' ); ?></title>\n` +
    `<!-- ↑ [変更] ページタイトルをWordPressが動的に生成するようにしました。\n` +
    `     wp_title() は各ページのタイトルを出力します(例: お問い合わせ | サイト名)。\n` +
    `     bloginfo('name') はWordPress管理画面 > 設定 > 一般 で設定したサイト名を出力します。 -->`
  );

  // ── </head> 直前に wp_head() を追加 ──────────────────────────────────
  html = html.replace(
    /<\/head>/i,
    `<?php wp_head(); ?>\n` +
    `<!-- ↑ [追加] wp_head() はWordPressとプラグインが必要なCSSやメタタグを<head>内に出力します。\n` +
    `     SEOプラグイン(Yoast SEO等)やGoogle Analyticsの設定もここで出力されます。必須です。 -->\n` +
    `</head>`
  );

  // ── <body> タグに body_class() を追加 ────────────────────────────────
  html = html.replace(
    /<body([^>]*)>/i,
    (match, attrs) => {
      const classMatch = attrs.match(/class=["']([^"']*)["']/i);
      const existingClasses = classMatch ? classMatch[1].trim() : '';
      const cleanAttrs = attrs.replace(/class=["'][^"']*["']/gi, '').trim();
      const bodyClassCall = existingClasses
        ? `<?php body_class( '${existingClasses}' ); ?>`
        : `<?php body_class(); ?>`;
      return (
        `<body ${bodyClassCall}${cleanAttrs ? ' ' + cleanAttrs : ''}>\n` +
        `<!-- ↑ [変更] body_class() はWordPressがページの種類に応じてCSSクラスを自動付与します。\n` +
        `     例: トップページは「home」、固定ページは「page」、投稿は「single」など。\n` +
        `     CSSでページ別のスタイルを当てるときに活用できます。 -->`
      );
    }
  );

  // ── </body> 直前に wp_footer() を追加 ────────────────────────────────
  html = html.replace(
    /<\/body>/i,
    `<?php wp_footer(); ?>\n` +
    `<!-- ↑ [追加] wp_footer() はWordPressとプラグインが必要なJavaScriptをフッターに出力します。\n` +
    `     管理バー(ログイン時に上部に表示されるメニュー)もここで出力されます。必須です。 -->\n` +
    `</body>`
  );

  const { headerPart, contentPart, footerPart } = splitHtml(html);

  return {
    headerPhp: buildHeaderPhp(headerPart),
    footerPhp: buildFooterPhp(footerPart),
    indexPhp: buildIndexPhp(contentPart, filename),
    contentPart
  };
}

// ─── HTML分割 ─────────────────────────────────────────────────────────────────

function splitHtml(html) {
  let headerEndIdx = -1;
  let footerStartIdx = -1;

  // </header> を探す
  const headerClose = html.match(/<\/header>/i);
  if (headerClose) {
    headerEndIdx = headerClose.index + headerClose[0].length;
  } else {
    // <main> の手前で分割
    const mainOpen = html.match(/<main[\s>]/i);
    if (mainOpen) {
      headerEndIdx = mainOpen.index;
    } else {
      // <body> 直後で分割（フォールバック）
      const bodyOpen = html.match(/<body[^>]*>/i);
      if (bodyOpen) headerEndIdx = bodyOpen.index + bodyOpen[0].length;
    }
  }

  // <footer> を探す
  const footerOpen = html.match(/<footer[\s>]/i);
  if (footerOpen) {
    footerStartIdx = footerOpen.index;
  } else {
    // </main> の後で分割
    const mainClose = html.match(/<\/main>/i);
    if (mainClose) {
      footerStartIdx = mainClose.index + mainClose[0].length;
    } else {
      // </body> の手前で分割（フォールバック）
      const bodyClose = html.match(/<\/body>/i);
      if (bodyClose) footerStartIdx = bodyClose.index;
    }
  }

  if (headerEndIdx === -1) headerEndIdx = 0;
  if (footerStartIdx === -1 || footerStartIdx <= headerEndIdx) {
    footerStartIdx = html.length;
  }

  return {
    headerPart: html.substring(0, headerEndIdx),
    contentPart: html.substring(headerEndIdx, footerStartIdx),
    footerPart: html.substring(footerStartIdx)
  };
}

// ─── WordPress PHPファイル生成 ─────────────────────────────────────────────────

function buildHeaderPhp(headerHtml) {
  return `<?php
/*
 * ============================================================
 * header.php - ヘッダーテンプレートファイル
 * ============================================================
 *
 * このファイルはすべてのページで共通して使われるヘッダー部分です。
 * <!DOCTYPE html> から <header>タグの終わりまでを担当します。
 *
 * 【呼び出し方】
 * 各テンプレートファイル(index.php, page.php等)の先頭で
 *   <?php get_header(); ?>
 * と書くことで、このファイルの内容が読み込まれます。
 *
 * 【編集時の注意】
 * - ナビゲーションメニューを動的にしたい場合は wp_nav_menu() を使ってください
 * - サイトロゴを変更したい場合は WordPress管理画面 > 外観 > カスタマイズ で設定できます
 * ============================================================
 */
?>
${headerHtml}`;
}

function buildFooterPhp(footerHtml) {
  return `<?php
/*
 * ============================================================
 * footer.php - フッターテンプレートファイル
 * ============================================================
 *
 * このファイルはすべてのページで共通して使われるフッター部分です。
 * <footer>タグから </html> までを担当します。
 *
 * 【呼び出し方】
 * 各テンプレートファイルの末尾で
 *   <?php get_footer(); ?>
 * と書くことで、このファイルの内容が読み込まれます。
 *
 * 【wp_footer() について】
 * 下記の <?php wp_footer(); ?> は必ず </body> の直前に必要です。
 * プラグインやWordPressの管理バーがここで出力されます。
 * ============================================================
 */
?>
${footerHtml}`;
}

function buildIndexPhp(contentHtml, filename) {
  return `<?php
/*
 * ============================================================
 * index.php - メインテンプレートファイル
 * ============================================================
 *
 * WordPressがページを表示するときに最初に探すテンプレートです。
 * 他の条件に合うテンプレートがない場合にこのファイルが使われます。
 *
 * 【処理の流れ】
 * 1. get_header() → header.php を読み込む
 * 2. メインコンテンツ(下記のHTML)を出力する
 * 3. get_footer() → footer.php を読み込む
 *
 * 【WordPressループについて】
 * WordPressには「ザ・ループ」という仕組みがあります。
 * have_posts() で投稿があるかチェックし、the_post() で取得します。
 * ブログ一覧などを作るときはループを使って投稿を繰り返し表示します。
 *
 * 【元ファイル】 ${filename}.html から変換
 * ============================================================
 */

get_header(); // header.php を読み込みます
?>

<?php
/*
 * ここからメインコンテンツです。
 * 元の ${filename}.html の <header> と <footer> の間の部分です。
 */
?>

${contentHtml}

<?php get_footer(); // footer.php を読み込みます ?>`;
}

function buildPageTemplate(filename, contentPart) {
  return `<?php
/*
 * ============================================================
 * page-${filename}.php - 「${filename}」ページのテンプレート
 * ============================================================
 *
 * WordPress管理画面 > 固定ページ でスラッグを「${filename}」に設定した
 * ページを表示するときに、このテンプレートが自動的に使われます。
 *
 * 【固定ページとは】
 * WordPress の「固定ページ」は About・お問い合わせ等、
 * 定期的に更新しない独立したページです。ブログ投稿とは別管理です。
 *
 * 【設定手順】
 * 1. WordPress管理画面 > 固定ページ > 新規追加
 * 2. タイトルを入力
 * 3. 右側の「パーマリンク」で スラッグを「${filename}」に設定
 * 4. 公開する
 *
 * 【元ファイル】 ${filename}.html から変換
 * ============================================================
 */

get_header(); // header.php を読み込みます
?>

<?php /* ${filename} ページのコンテンツ */ ?>

${contentPart}

<?php get_footer(); // footer.php を読み込みます ?>`;
}

function buildFunctionsPhp(cssFiles, jsFiles, pageNames = []) {
  const cssEnqueues = cssFiles.length > 0
    ? cssFiles.map(file => {
        const handle = 'theme-' + file.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return (
          `    // 「${file}」を読み込みます\n` +
          `    // get_template_directory_uri() はこのテーマフォルダのURLを返します\n` +
          `    wp_enqueue_style( '${handle}', get_template_directory_uri() . '/${file}', array(), '1.0.0' );`
        );
      }).join('\n\n')
    : '    // 読み込むCSSファイルがありません';

  const jsEnqueues = jsFiles.length > 0
    ? jsFiles.map(file => {
        const handle = 'theme-' + file.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        return (
          `    // 「${file}」を読み込みます\n` +
          `    // 第3引数 array() は依存ライブラリ。jQueryが必要な場合は array('jquery') と書きます\n` +
          `    // 第5引数 true は </body> 直前で読み込む設定(パフォーマンス向上)\n` +
          `    wp_enqueue_script( '${handle}', get_template_directory_uri() . '/${file}', array(), '1.0.0', true );`
        );
      }).join('\n\n')
    : '    // 読み込むJSファイルがありません';

  const nonIndexPages = pageNames.filter(name => name !== 'index');
  const pagesPhpEntries = nonIndexPages.length > 0
    ? nonIndexPages.map(name => {
        const title = name
          .split('-')
          .map(w => /^\d+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        return `        '${name}' => '${title}',`;
      }).join('\n')
    : '        // 変換するページがありませんでした';

  return `<?php
/*
 * ============================================================
 * functions.php - テーマ機能設定ファイル
 * ============================================================
 *
 * このファイルはWordPressテーマの「設定ファイル」です。
 * テーマが持つ機能の宣言、CSSやJavaScriptの読み込み設定などを行います。
 *
 * 【なぜCSSをここで読み込むのか】
 * WordPressでは <link> タグをHTMLに直接書くのではなく、
 * wp_enqueue_style() 関数で読み込みを登録することが推奨されています。
 *
 * 理由:
 * - プラグインとのCSS/JS競合を防げる
 * - 読み込み順序をWordPressが管理できる
 * - 重複読み込みを自動で防止できる
 *
 * 【PHPの「関数」と「フック」について】
 * function 関数名() { ... } で関数を定義します。
 * add_action('フック名', '関数名') でWordPressの特定タイミングに関数を登録します。
 * ============================================================
 */


/* ================================================================
   1. テーマの基本機能設定
   ================================================================ */

/**
 * テーマが使用するWordPress機能を宣言します。
 * 'after_setup_theme' フックはテーマ読み込み直後に実行されます。
 */
function custom_theme_setup() {

    /*
     * add_theme_support() でWordPressの各機能を「このテーマで使います」と宣言します。
     * 宣言しないと、その機能はWordPressが無効化したままになります。
     */

    // <title> タグをWordPressが自動生成・管理できるようにします
    // これにより header.php の <title> が動的に変わります
    add_theme_support( 'title-tag' );

    // 投稿・固定ページにアイキャッチ画像(サムネイル)機能を追加します
    // 管理画面の投稿編集画面に「アイキャッチ画像」ボックスが表示されます
    add_theme_support( 'post-thumbnails' );

    // HTML5形式でWordPressの出力(検索フォーム等)を生成します
    add_theme_support( 'html5', array(
        'search-form', 'comment-form', 'comment-list', 'gallery', 'caption'
    ) );

    /*
     * ナビゲーションメニューを登録します。
     * 登録後、WordPress管理画面 > 外観 > メニュー で
     * どのページをメニューに入れるか設定できます。
     *
     * テンプレートでメニューを表示するには:
     * <?php wp_nav_menu( array( 'theme_location' => 'primary-menu' ) ); ?>
     */
    register_nav_menus( array(
        'primary-menu' => 'メインメニュー',
        'footer-menu'  => 'フッターメニュー',
    ) );
}
add_action( 'after_setup_theme', 'custom_theme_setup' );
/*
 * ↑ add_action() はWordPressの「フック」機能です。
 *   'after_setup_theme' のタイミングで custom_theme_setup 関数を実行します。
 *   第1引数: フック名(実行タイミング)
 *   第2引数: 実行する関数名
 */


/* ================================================================
   2. CSSとJavaScriptの読み込み設定
   ================================================================ */

/**
 * テーマのCSSとJavaScriptをWordPressの推奨方法で読み込みます。
 * 'wp_enqueue_scripts' フックはフロントエンドページ表示時に実行されます。
 */
function custom_theme_scripts() {

    /* --- CSS の読み込み --- */
    /*
     * wp_enqueue_style( ハンドル名, URL, 依存CSS, バージョン ) の形式で書きます。
     * ハンドル名: このCSSを識別する一意の名前(英数字とハイフン)
     * URL: CSSファイルのURL
     * 依存CSS: このCSSの前に読み込むべきCSSのハンドル名(通常は空の array())
     * バージョン: キャッシュ対策のバージョン番号
     */

    // WordPressテーマの必須ファイル style.css を読み込みます
    // get_stylesheet_uri() はこのテーマの style.css のURLを返します
    wp_enqueue_style( 'custom-theme-style', get_stylesheet_uri(), array(), '1.0.0' );

${cssEnqueues}

    /* --- JavaScript の読み込み --- */
    /*
     * wp_enqueue_script( ハンドル名, URL, 依存JS, バージョン, フッターで読む ) の形式です。
     * 最後の true は </body> 直前で読み込む設定です(パフォーマンス向上のため推奨)。
     */

${jsEnqueues}
}
add_action( 'wp_enqueue_scripts', 'custom_theme_scripts' );


/* ================================================================
   3. ウィジェットエリア(サイドバー等)の設定
   ================================================================ */

/**
 * ウィジェットエリアを登録します。
 * 登録後、WordPress管理画面 > 外観 > ウィジェット でパーツを配置できます。
 */
function custom_theme_widgets_init() {
    register_sidebar( array(
        'name'          => 'サイドバー',           // 管理画面に表示される名前
        'id'            => 'sidebar-1',             // テンプレート内で使うID
        'description'   => 'サイドバーにウィジェットを追加できます',
        'before_widget' => '<div id="%1$s" class="widget %2$s">',
        'after_widget'  => '</div>',
        'before_title'  => '<h3 class="widget-title">',
        'after_title'   => '</h3>',
    ) );
}
add_action( 'widgets_init', 'custom_theme_widgets_init' );
/*
 * ウィジェットをテンプレートで表示するには:
 * <?php if ( is_active_sidebar( 'sidebar-1' ) ) : ?>
 *     <aside><?php dynamic_sidebar( 'sidebar-1' ); ?></aside>
 * <?php endif; ?>
 */


/* ================================================================
   4. フェードインアニメーションのフォールバック
   ================================================================ */

/**
 * 元サイトのフェードインアニメーション（.js-fade-in { opacity: 0 }）が
 * WordPress環境で正しく動作しない場合でも、コンテンツが確実に表示されるように
 * フォールバックCSSをヘッダーに追加します。
 *
 * 【仕組み】
 * 元サイトでは JavaScript の IntersectionObserver が画面内に入った要素に
 * .is-visible クラスを付与し、opacity: 0 → 1 でフェードインさせています。
 * WordPress 環境でこのJSが正常に動作しない場合、すべての .js-fade-in 要素が
 * 非表示になってしまいます。このフォールバックはその問題を防ぎます。
 */
function custom_theme_animation_fallback() {
    ?>
    <style>
    /* WordPress変換フォールバックCSS
     * 元サイトの .js-fade-in { opacity: 0 } を上書きして
     * コンテンツを常に表示します。 */
    .js-fade-in {
        opacity: 1 !important;
        transform: none !important;
        transition: none !important;
    }
    </style>
    <?php
}
add_action( 'wp_head', 'custom_theme_animation_fallback', 9999 );
/*
 * ↑ priority 9999 で登録することで、他のすべてのCSSが出力された後に
 *   このスタイルが追加されます。!important で確実に opacity:0 を上書きします。
 */


/* ================================================================
   5. テーマ有効化時に固定ページを自動作成
   ================================================================ */

/**
 * このテーマを WordPress管理画面 > 外観 > テーマ で有効化したときに
 * 各ページテンプレート（page-{スラッグ}.php）に対応する固定ページを
 * 自動的に作成します。
 *
 * 【なぜページが必要なのか】
 * WordPress では URL /about/ を表示するには、スラッグ「about」の
 * 固定ページが存在する必要があります。
 * このテーマには page-about.php 等のテンプレートが含まれており、
 * 対応するページが作成されると自動的にそのテンプレートが使われます。
 *
 * 【ページのコンテンツについて】
 * 固定ページ自体の本文は空でも問題ありません。
 * コンテンツはすべて page-{スラッグ}.php テンプレートに含まれています。
 */
function custom_theme_create_pages_on_activation() {
    // 変換されたHTMLファイルに対応するページスラッグとタイトルのリスト
    $pages = [
${pagesPhpEntries}
    ];

    foreach ( $pages as $slug => $title ) {
        // 同じスラッグのページが既に存在する場合はスキップします
        if ( get_page_by_path( $slug, OBJECT, 'page' ) ) {
            continue;
        }

        // 固定ページを公開状態で作成します
        wp_insert_post( [
            'post_title'     => $title,
            'post_name'      => $slug,
            'post_status'    => 'publish',
            'post_type'      => 'page',
            'post_content'   => '',
            'comment_status' => 'closed',
        ] );
    }
}
add_action( 'after_switch_theme', 'custom_theme_create_pages_on_activation' );
/*
 * ↑ after_switch_theme フックはテーマを有効化した直後に実行されます。
 *   テーマを有効化するだけで、必要なWordPressページが自動作成されます。
 *   既存のページは上書きされません（スラッグが重複する場合はスキップ）。
 */
`;
}

function buildStyleCss() {
  return `/*
Theme Name: Custom WordPress Theme
Theme URI:
Author:
Author URI:
Description: 静的サイトから変換されたWordPressオリジナルテーマ。Dynamic Site Makerで生成。
Version: 1.0.0
Requires at least: 5.0
Tested up to: 6.4
Requires PHP: 7.4
License: GNU General Public License v2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html
Text Domain: custom-theme

============================================================
【このファイルについて】
style.css は WordPress テーマに必須のファイルです。
ファイル先頭のコメントブロック(上記)がWordPressに
テーマ名・作者・バージョン等の情報を伝えます。
このコメントが正しく書かれていないとテーマとして認識されません。

【CSSの管理について】
元サイトのCSSファイルはそのままテーマフォルダにコピーされており、
functions.php の wp_enqueue_style() で読み込まれます。

追加・上書きしたいスタイルはこのファイルの末尾に追記してください。
============================================================
*/

/* ここに追加のスタイルを記述できます */
`;
}

function buildSinglePhp() {
  return `<?php
/*
 * ============================================================
 * single.php - 投稿記事テンプレートファイル
 * ============================================================
 *
 * WordPress管理画面 > 投稿 で作成したブログ記事を表示するときに
 * このテンプレートが使われます。
 *
 * 【「投稿」と「固定ページ」の違い】
 * 投稿(post)  : ブログ記事。カテゴリー・タグで分類。日付順に並ぶ。
 * 固定ページ   : About、お問い合わせ等。カテゴリーなし。独立したページ。
 *
 * 【WordPressループ】
 * have_posts() → 表示する投稿があるかチェック
 * the_post()   → 現在の投稿データをセットアップ
 * the_title()  → 投稿タイトルを出力
 * the_content() → 投稿本文を出力
 * ============================================================
 */

get_header(); // header.php を読み込みます
?>

<main class="site-main">
    <div class="container">

        <?php
        // WordPressループ開始
        // 投稿が存在する間、ループを繰り返します(通常は1記事のみ)
        while ( have_posts() ) :
            the_post(); // 現在の投稿データをセットアップします
        ?>

            <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <!-- ↑ the_ID() は投稿のID番号を出力します -->
            <!-- ↑ post_class() はWordPressが投稿種別のCSSクラスを自動付与します -->

                <header class="entry-header">
                    <h1 class="entry-title"><?php the_title(); ?></h1>
                    <!-- ↑ the_title() は投稿のタイトルを出力します -->

                    <div class="entry-meta">
                        <time datetime="<?php echo get_the_date( 'c' ); ?>">
                            投稿日: <?php echo get_the_date(); ?>
                            <!-- ↑ get_the_date() は投稿日を出力します -->
                        </time>
                        <span class="author">
                            著者: <?php the_author(); ?>
                            <!-- ↑ the_author() は投稿者名を出力します -->
                        </span>
                    </div>
                </header>

                <?php if ( has_post_thumbnail() ) : ?>
                <!-- ↑ has_post_thumbnail() はアイキャッチ画像が設定されているかチェックします -->
                    <div class="post-thumbnail">
                        <?php the_post_thumbnail( 'large' ); ?>
                        <!-- ↑ the_post_thumbnail() はアイキャッチ画像を'large'サイズで出力します -->
                    </div>
                <?php endif; ?>

                <div class="entry-content">
                    <?php the_content(); ?>
                    <!-- ↑ the_content() は投稿の本文を出力します -->
                    <!-- <!--more--> タグで「続きを読む」リンクを挿入できます -->
                </div>

                <footer class="entry-footer">
                    <div class="entry-categories">
                        カテゴリー: <?php the_category( ', ' ); ?>
                        <!-- ↑ the_category() は投稿のカテゴリーを出力します -->
                    </div>
                    <div class="entry-tags">
                        <?php the_tags( 'タグ: ', ', ' ); ?>
                        <!-- ↑ the_tags() は投稿のタグを出力します -->
                    </div>
                </footer>

            </article>

        <?php endwhile; // WordPressループ終了 ?>

    </div>
</main>

<?php get_footer(); // footer.php を読み込みます ?>`;
}

function buildGenericPagePhp() {
  return `<?php
/*
 * ============================================================
 * page.php - 固定ページ汎用テンプレートファイル
 * ============================================================
 *
 * page-{スラッグ}.php が存在しない固定ページを表示するときに
 * このテンプレートが使われます。
 *
 * 【テンプレート優先順位(高い順)】
 * 1. page-{id}.php     (例: page-42.php)
 * 2. page-{slug}.php   (例: page-about.php)
 * 3. page.php          ← このファイル
 * 4. index.php
 * ============================================================
 */

get_header(); // header.php を読み込みます
?>

<main class="site-main">
    <div class="container">

        <?php while ( have_posts() ) : the_post(); ?>
        <!-- ↑ WordPressループ: 固定ページのコンテンツを取得します -->

            <article id="page-<?php the_ID(); ?>" <?php post_class(); ?>>

                <header class="entry-header">
                    <h1 class="entry-title"><?php the_title(); ?></h1>
                    <!-- ↑ 固定ページのタイトルを出力します -->
                </header>

                <div class="entry-content">
                    <?php the_content(); ?>
                    <!-- ↑ 固定ページの本文を出力します -->
                </div>

            </article>

        <?php endwhile; ?>

    </div>
</main>

<?php get_footer(); // footer.php を読み込みます ?>`;
}

function getAllFiles(dir, list = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) getAllFiles(full, list);
    else list.push(full);
  }
  return list;
}

module.exports = { convertSite };
