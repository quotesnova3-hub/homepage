// QuotesNova Homepage - COMPLETE with Everything

const SUPABASE_URL = 'https://cdyiropvfbooczxkllqr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yPKnq6TFtOJvvYm9YpFYbQ_rjq7WtF0';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/quotes') {
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 3;
      const quotes = await fetchQuotes(page, limit);
      return new Response(JSON.stringify(quotes), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/search') {
      const query = url.searchParams.get('q') || '';
      const results = await searchQuotes(query);
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (path === '/' || path === '') {
      const [quoteOfDay, categories, authors, latestQuotes] = await Promise.all([
        fetchQuoteOfDay(),
        fetchCategories(),
        fetchAuthors(),
        fetchQuotes(1, 4)
      ]);
      const html = generateHTML(quoteOfDay, categories, authors, latestQuotes);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, s-maxage=3600' }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
};

async function fetchQuoteOfDay() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url&order=random&limit=1`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = await res.json();
  return data[0] || null;
}

async function fetchCategories() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=name,slug&is_active=eq.true&limit=6`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function fetchAuthors() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/authors?select=name,slug,profile_image_url&is_featured=eq.true&limit=6`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function fetchQuotes(page = 1, limit = 4) {
  const offset = (page - 1) * limit;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url&order=created_at.desc&limit=${limit}&offset=${offset}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function searchQuotes(query) {
  const encoded = encodeURIComponent(query);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url&quote_text=ilike.%25${encoded}%25&limit=10`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

function generateHTML(quoteOfDay, categories, authors, latestQuotes) {
  const defaultCategories = [
    { name: 'Life', slug: 'life' }, { name: 'Love', slug: 'love' },
    { name: 'Success', slug: 'success' }, { name: 'Motivation', slug: 'motivation' },
    { name: 'Wisdom', slug: 'wisdom' }, { name: 'Happiness', slug: 'happiness' }
  ];
  const displayCategories = categories.length > 0 ? categories : defaultCategories;
  const displayQuote = quoteOfDay;
  const displayAuthors = authors;
  const currentYear = new Date().getFullYear();

  // Full JSON-LD Structured Data
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "QuotesNova",
    "alternateName": "QuotesNova — The Future of Quotes",
    "url": "https://quotesnova.com/",
    "description": "Discover the most inspiring quotes from great minds. Browse thousands of quotes about life, love, success, motivation, and wisdom.",
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://quotesnova.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "QuotesNova",
    "url": "https://quotesnova.com/",
    "logo": "https://quotesnova.com/logo.png",
    "sameAs": ["https://x.com/quotesnovas", "https://www.instagram.com/quotesnovas"],
    "foundingDate": "2024",
    "description": "Discover the most inspiring quotes from great minds."
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://quotesnova.com/"
    }]
  };

  // SVG Icons
  const svgHome = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>';
  const svgQuotes = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>';
  const svgCategories = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>';
  const svgAuthors = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
  const svgSearch = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="10" cy="10" r="7"/><line x1="21" y1="21" x2="15" y2="15"/></svg>';
  const svgMenu = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>';
  const svgProfile = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>';
  const svgCalendar = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
  const svgBox = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>';
  const svgStar = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
  const svgCopy = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const svgShare = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  const svgSun = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  const svgMoon = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>QuotesNova — The Future of Quotes</title>
<meta name="title" content="QuotesNova — The Future of Quotes">
<meta name="description" content="Discover the most inspiring quotes from great minds. Browse thousands of quotes about life, love, success, motivation, and wisdom.">
<meta name="keywords" content="quotes, inspiration, motivation, wisdom, life quotes, love quotes, success quotes, daily quotes, famous quotes">
<meta name="author" content="QuotesNova">
<meta name="robots" content="index, follow">
<meta name="googlebot" content="index, follow">
<link rel="canonical" href="https://quotesnova.com/">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:url" content="https://quotesnova.com/">
<meta property="og:title" content="QuotesNova — The Future of Quotes">
<meta property="og:description" content="Discover the most inspiring quotes from great minds. Browse thousands of quotes about life, love, success, motivation, and wisdom.">
<meta property="og:image" content="https://quotesnova.com/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="QuotesNova">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="https://quotesnova.com/">
<meta name="twitter:title" content="QuotesNova — The Future of Quotes">
<meta name="twitter:description" content="Discover the most inspiring quotes from great minds.">
<meta name="twitter:image" content="https://quotesnova.com/og-image.jpg">
<meta name="twitter:site" content="@quotesnovas">
<script type="application/ld+json">${JSON.stringify(webSiteSchema)}</script>
<script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#f9fafb;padding-bottom:80px}
.sidebar{position:fixed;top:0;left:-280px;width:280px;height:100%;background:white;z-index:1000;transition:left 0.3s;box-shadow:2px 0 10px rgba(0,0,0,0.1)}
.sidebar.open{left:0}
.sidebar-header{padding:16px 20px;border-bottom:1px solid #e5e5e5;display:flex;justify-content:space-between;align-items:center}
.sidebar-header h3{font-size:18px;font-weight:600;color:#9333ea}
.close-sidebar{background:none;border:none;font-size:24px;cursor:pointer;color:#666}
.sidebar a{display:flex;align-items:center;gap:12px;padding:12px 20px;color:#1f2937;text-decoration:none;border-bottom:1px solid #f0f0f0}
.sidebar a:hover{background:#f3f4f6;color:#9333ea}
.sidebar-divider{border-top:1px solid #e5e5e5;margin:8px 0}
.theme-btn{display:flex;align-items:center;gap:12px;padding:12px 20px;width:100%;background:none;border:none;border-bottom:1px solid #f0f0f0;color:#1f2937;cursor:pointer;font-size:16px}
.theme-btn:hover{background:#f3f4f6;color:#9333ea}
.overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:999;display:none}
.overlay.show{display:block}
.sticky-header{position:sticky;top:0;background:white;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.menu-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:8px}
.menu-btn:hover{background:#f3f4f6;border-radius:8px}
.logo{font-size:20px;font-weight:700;color:#111827;text-decoration:none}
.logo span{color:#9333ea}
.search-header{flex:1;max-width:300px;position:relative}
.search-header input{width:100%;padding:8px 12px 8px 36px;border:1px solid #e5e7eb;border-radius:40px;background:#f9fafb;font-size:14px;outline:none}
.search-header input:focus{border-color:#9333ea}
.search-header svg{position:absolute;left:12px;top:50%;transform:translateY(-50%)}
.profile-btn{width:36px;height:36px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;cursor:pointer}
.profile-btn:hover{background:#e5e7eb}
.main-container{max-width:672px;margin:0 auto;padding:24px 16px;display:flex;flex-direction:column;gap:32px}
.section-title{font-size:14px;font-weight:600;color:#9333ea;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.quote-card{background:white;border-radius:24px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #f3f4f6}
.quote-flex{display:flex;flex-wrap:wrap;gap:20px}
.quote-flex > div:first-child{flex:1}
.quote-text{font-size:20px;font-weight:700;color:#1f2937;margin:8px 0;line-height:1.3}
.quote-author{color:#9333ea;font-weight:500;font-size:14px;margin-bottom:16px}
.quote-actions{display:flex;gap:12px;margin-top:12px}
.btn-share,.btn-copy{background:#f9fafb;color:#9333ea;padding:8px 16px;border-radius:12px;font-size:13px;font-weight:500;border:none;cursor:pointer;display:flex;align-items:center;gap:6px}
.btn-share:hover,.btn-copy:hover{background:#f3f4f6}
.quote-image{width:112px;height:112px;border-radius:12px;object-fit:cover}
.categories-header,.authors-header,.latest-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.categories-title,.authors-title,.latest-title{font-size:18px;font-weight:700;color:#1f2937;display:flex;align-items:center;gap:8px}
.view-all{color:#9333ea;font-size:13px;font-weight:600;text-decoration:none}
.view-all:hover{text-decoration:underline}
.categories-scroll,.authors-scroll{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px}
.categories-scroll::-webkit-scrollbar,.authors-scroll::-webkit-scrollbar{display:none}
.category-item{min-width:90px;background:white;border-radius:16px;padding:12px;text-align:center;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #f3f4f6;text-decoration:none;transition:all 0.2s}
.category-item:hover{border-color:#9333ea;transform:translateY(-2px)}
.category-name{font-size:12px;font-weight:600;color:#374151;margin-top:8px}
.author-item{display:flex;flex-direction:column;align-items:center;min-width:70px;text-decoration:none}
.author-avatar{width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #e9d5ff}
.author-item:hover .author-avatar{transform:scale(1.05);border-color:#9333ea}
.author-name{font-size:11px;font-weight:500;color:#374151;margin-top:6px}
.quote-list-item{background:white;border-radius:16px;padding:16px;margin-bottom:16px;display:flex;gap:12px;box-shadow:0 1px 2px rgba(0,0,0,0.05);border:1px solid #f3f4f6}
.quote-list-img{width:64px;height:64px;border-radius:12px;object-fit:cover}
.quote-list-img-placeholder{width:64px;height:64px;border-radius:12px;background:#faf5ff;display:flex;align-items:center;justify-content:center;font-size:24px}
.quote-list-content{flex:1}
.quote-list-text{font-size:14px;font-weight:600;color:#1f2937;line-height:1.4}
.quote-list-author{font-size:11px;color:#9333ea;margin-top:6px;font-weight:500}
.quote-list-actions{display:flex;gap:16px;margin-top:10px}
.quote-action-btn{background:none;border:none;font-size:13px;color:#6b7280;cursor:pointer;display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px}
.quote-action-btn:hover{color:#9333ea;background:#f9fafb}
.loading-spinner{text-align:center;padding:20px;display:none}
.spinner{display:inline-block;width:24px;height:24px;border:2px solid #e5e7eb;border-top-color:#9333ea;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.toast{position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#1f2937;color:white;padding:8px 16px;border-radius:8px;font-size:13px;z-index:9999;animation:fadeOut 2s forwards}
@keyframes fadeOut{0%{opacity:1}70%{opacity:1}100%{opacity:0;visibility:hidden}}
.search-results{position:absolute;top:45px;left:0;right:0;background:white;border:1px solid #e5e7eb;border-radius:12px;max-height:300px;overflow-y:auto;z-index:100;display:none}
.search-results a{display:block;padding:10px 12px;text-decoration:none;color:#1f2937;font-size:13px;border-bottom:1px solid #f0f0f0}
.search-results a:hover{background:#f9fafb;color:#9333ea}
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #e5e7eb;display:flex;justify-content:space-around;padding:10px 16px;z-index:50;max-width:500px;margin:0 auto}
.bottom-nav a{display:flex;flex-direction:column;align-items:center;gap:4px;color:#6b7280;text-decoration:none;font-size:10px}
.bottom-nav a:hover,.bottom-nav a.active{color:#9333ea}
.footer{text-align:center;padding:24px 16px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;margin-top:32px}
</style>
</head>
<body>

<div class="overlay" id="overlay" onclick="closeSidebar()"></div>

<div class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <h3>MENU</h3>
    <button class="close-sidebar" onclick="closeSidebar()">✕</button>
  </div>
  <a href="/">${svgHome} Home</a>
  <a href="/quotes">${svgQuotes} Quotes</a>
  <a href="/categories">${svgCategories} Categories</a>
  <a href="/authors">${svgAuthors} Authors</a>
  <button class="theme-btn" id="themeToggle">${svgSun} <span id="themeText">Dark Mode</span></button>
  <div class="sidebar-divider"></div>
  <a href="/about">${svgStar} About</a>
  <a href="/contact">${svgStar} Contact</a>
  <a href="/privacy">${svgStar} Privacy</a>
  <a href="/terms">${svgStar} Terms</a>
</div>

<header class="sticky-header">
  <button class="menu-btn" onclick="openSidebar()">${svgMenu}</button>
  <a href="/" class="logo">Quotes<span>Nova</span></a>
  <div class="search-header">
    ${svgSearch}
    <input type="text" id="searchInput" placeholder="Search quotes..." autocomplete="off">
    <div class="search-results" id="searchResults"></div>
  </div>
  <div class="profile-btn" onclick="window.location.href='/profile'">${svgProfile}</div>
</header>

<main class="main-container">
  <section>
    <div class="section-title">${svgCalendar} Quote of the Day</div>
    <div class="quote-card">
      <div class="quote-flex">
        <div>
          <p class="quote-text" id="qotd-text">${displayQuote ? escapeHTML(displayQuote.quote_text) : 'The best way to predict your future is to create it.'}</p>
          <p class="quote-author">— ${displayQuote ? escapeHTML(displayQuote.author_name || 'Anonymous') : 'Peter Drucker'}</p>
          <div class="quote-actions">
            <button class="btn-share" onclick="shareQuote()">${svgShare} <span>Share</span></button>
            <button class="btn-copy" onclick="copyToClipboard()">${svgCopy} <span>Copy</span></button>
          </div>
        </div>
        ${displayQuote && displayQuote.media_url ? `<img src="${escapeHTML(displayQuote.media_url)}" class="quote-image" alt="Quote image">` : ''}
      </div>
    </div>
  </section>

  <section>
    <div class="categories-header">
      <div class="categories-title">${svgBox} Browse Categories</div>
      <a href="/categories" class="view-all">View All</a>
    </div>
    <div class="categories-scroll">
      ${displayCategories.map(cat => `<a href="/category/${escapeHTML(cat.slug)}" class="category-item"><div class="category-name">${escapeHTML(cat.name)}</div></a>`).join('')}
    </div>
  </section>

  <section>
    <div class="authors-header">
      <div class="authors-title">${svgStar} Featured Authors</div>
      <a href="/authors" class="view-all">View All</a>
    </div>
    <div class="authors-scroll">
      ${displayAuthors.map(author => `
        <a href="/author/${escapeHTML(author.slug)}" class="author-item">
          <img src="${author.profile_image_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(author.name) + '&background=9333ea&color=fff'}" class="author-avatar" alt="${escapeHTML(author.name)}">
          <span class="author-name">${escapeHTML(author.name)}</span>
        </a>
      `).join('')}
    </div>
  </section>

  <section>
    <div class="latest-header">
      <div class="latest-title">${svgQuotes} Latest Quotes</div>
      <a href="/quotes" class="view-all">View All</a>
    </div>
    <div id="quotesList">
      ${latestQuotes.map((q, i) => {
        const imgHtml = q.media_url ? '<img src="' + escapeHTML(q.media_url) + '" class="quote-list-img" alt="Quote image">' : '<div class="quote-list-img-placeholder">“</div>';
        return `
        <div class="quote-list-item">
          ${imgHtml}
          <div class="quote-list-content">
            <p class="quote-list-text" id="quote-${i}">${escapeHTML(q.quote_text)}</p>
            <p class="quote-list-author">— ${escapeHTML(q.author_name || 'Anonymous')}</p>
            <div class="quote-list-actions">
              <button class="quote-action-btn" onclick="copyQuoteText('quote-${i}')">${svgCopy} Copy</button>
              <button class="quote-action-btn" onclick="shareQuoteText('${escapeJS(q.quote_text)}','${escapeJS(q.author_name || 'Anonymous')}','${escapeJS(q.slug)}')">${svgShare} Share</button>
            </div>
          </div>
        </div>
      `}).join('')}
    </div>
    <div id="loadingTrigger" style="height:20px"></div>
    <div id="loadingSpinner" class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading more quotes...</p>
    </div>
  </section>
</main>

<nav class="bottom-nav">
  <a href="/" class="active">${svgHome}<span>Home</span></a>
  <a href="/quotes">${svgQuotes}<span>Quotes</span></a>
  <a href="/categories">${svgCategories}<span>Categories</span></a>
  <a href="/authors">${svgAuthors}<span>Authors</span></a>
  <a href="/search">${svgSearch}<span>Search</span></a>
</nav>

<footer class="footer">
  <p>© ${currentYear} QuotesNova — The Future of Quotes</p>
</footer>

<script>
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

const themeToggle = document.getElementById('themeToggle');
const themeText = document.getElementById('themeText');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeText.textContent = 'Light Mode';
}
themeToggle.addEventListener('click', function() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  themeToggle.innerHTML = isDark ? '${svgSun} <span id="themeText">Light Mode</span>' : '${svgMoon} <span id="themeText">Dark Mode</span>';
});

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchTimeout;
searchInput.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();
  if (query.length < 2) {
    searchResults.style.display = 'none';
    return;
  }
  searchTimeout = setTimeout(async function() {
    const res = await fetch('/api/search?q=' + encodeURIComponent(query));
    const data = await res.json();
    if (data.length === 0) {
      searchResults.style.display = 'none';
      return;
    }
    let html = '';
    for (let i = 0; i < data.length; i++) {
      html += '<a href="/quote/' + data[i].slug + '">' + escapeHtml(data[i].quote_text.substring(0, 80)) + ' — ' + escapeHtml(data[i].author_name || 'Anonymous') + '</a>';
    }
    searchResults.innerHTML = html;
    searchResults.style.display = 'block';
  }, 300);
});
document.addEventListener('click', function(e) {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.style.display = 'none';
  }
});

function copyToClipboard() {
  const text = document.getElementById('qotd-text').innerText;
  navigator.clipboard.writeText(text).then(function() { showToast('Copied!'); });
}
function copyQuoteText(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(function() { showToast('Quote copied!'); });
}
function shareQuote() {
  const text = document.getElementById('qotd-text').innerText;
  if (navigator.share) {
    navigator.share({ title: 'QuotesNova', text: text });
  } else {
    copyToClipboard();
  }
}
function shareQuoteText(text, author, slug) {
  const url = 'https://quotesnova.com/quote/' + slug;
  const shareText = '"' + text + '" — ' + author;
  if (navigator.share) {
    navigator.share({ title: 'QuotesNova', text: shareText, url: url });
  } else {
    navigator.clipboard.writeText(url).then(function() { showToast('Link copied!'); });
  }
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2000);
}

let currentPage = 1;
let isLoading = false;
let hasMore = true;

async function loadMoreQuotes() {
  if (isLoading || !hasMore) return;
  isLoading = true;
  const spinner = document.getElementById('loadingSpinner');
  spinner.style.display = 'block';
  try {
    const res = await fetch('/api/quotes?page=' + (currentPage + 1) + '&limit=3');
    const quotes = await res.json();
    if (quotes.length === 0) {
      hasMore = false;
      document.getElementById('loadingTrigger').style.display = 'none';
    } else {
      const container = document.getElementById('quotesList');
      const count = document.querySelectorAll('#quotesList .quote-list-item').length;
      for (let idx = 0; idx < quotes.length; idx++) {
        const q = quotes[idx];
        const newIdx = count + idx;
        const div = document.createElement('div');
        div.className = 'quote-list-item';
        const imgHtml = q.media_url ? '<img src="' + escapeHtml(q.media_url) + '" class="quote-list-img" alt="Quote image">' : '<div class="quote-list-img-placeholder">“</div>';
        div.innerHTML = imgHtml + '<div class="quote-list-content"><p class="quote-list-text" id="quote-' + newIdx + '">' + escapeHtml(q.quote_text) + '</p><p class="quote-list-author">— ' + escapeHtml(q.author_name || 'Anonymous') + '</p><div class="quote-list-actions"><button class="quote-action-btn" onclick="copyQuoteText(\'quote-' + newIdx + '\')">${svgCopy} Copy</button><button class="quote-action-btn" onclick="shareQuoteText(\'' + escapeJs(q.quote_text) + '\',\'' + escapeJs(q.author_name || 'Anonymous') + '\',\'' + escapeJs(q.slug) + '\')">${svgShare} Share</button></div></div>';
        container.appendChild(div);
      }
      currentPage++;
    }
  } catch(e) { console.error(e); }
  finally {
    isLoading = false;
    spinner.style.display = 'none';
  }
}

function escapeHtml(s) { if(!s) return ''; return s.replace(/[&<>]/g, function(m) { if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
function escapeJs(s) { if(!s) return ''; return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }

const observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      loadMoreQuotes();
    }
  });
}, { threshold: 0.1 });
observer.observe(document.getElementById('loadingTrigger'));
</script>
</body>
</html>`;
}

function escapeHTML(s) { if(!s) return ''; return s.replace(/[&<>]/g, function(m) { if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m; }); }
function escapeJS(s) { if(!s) return ''; return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }