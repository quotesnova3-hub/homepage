// QuotesNova Homepage Worker - Real SVG Icons + Login Redirect

const SUPABASE_URL = 'https://cdyiropvfbooczxkllqr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yPKnq6TFtOJvvYm9YpFYbQ_rjq7WtF0';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // API: Get current user session from cookie
    if (path === '/api/session') {
      const cookie = request.headers.get('Cookie') || '';
      const accessToken = cookie.match(/sb-access-token=([^;]+)/)?.[1];
      if (accessToken) {
        const user = await getUserFromToken(accessToken);
        return new Response(JSON.stringify({ user }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ user: null }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Like a quote
    if (path === '/api/like') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const cookie = request.headers.get('Cookie') || '';
      const accessToken = cookie.match(/sb-access-token=([^;]+)/)?.[1];
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const user = await getUserFromToken(accessToken);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const { quoteId, action } = await request.json();
      
      if (action === 'like') {
        await addLike(user.id, quoteId);
      } else {
        await removeLike(user.id, quoteId);
      }
      
      const likeCount = await getLikeCount(quoteId);
      return new Response(JSON.stringify({ success: true, likeCount }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Save a quote
    if (path === '/api/save') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const cookie = request.headers.get('Cookie') || '';
      const accessToken = cookie.match(/sb-access-token=([^;]+)/)?.[1];
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const user = await getUserFromToken(accessToken);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const { quoteId, action } = await request.json();
      
      if (action === 'save') {
        await addSave(user.id, quoteId);
      } else {
        await removeSave(user.id, quoteId);
      }
      
      const saveCount = await getSaveCount(quoteId);
      return new Response(JSON.stringify({ success: true, saveCount }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Add comment
    if (path === '/api/comment') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      
      const cookie = request.headers.get('Cookie') || '';
      const accessToken = cookie.match(/sb-access-token=([^;]+)/)?.[1];
      if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const user = await getUserFromToken(accessToken);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Not authenticated', redirect: '/login' }), { status: 401 });
      }
      
      const { quoteId, content } = await request.json();
      const comment = await addComment(user.id, quoteId, content);
      
      return new Response(JSON.stringify({ success: true, comment }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Get comments for a quote
    if (path === '/api/comments') {
      const quoteId = url.searchParams.get('quoteId');
      const comments = await getComments(quoteId);
      return new Response(JSON.stringify(comments), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Infinite scroll quotes
    if (path === '/api/quotes') {
      const page = parseInt(url.searchParams.get('page')) || 1;
      const limit = parseInt(url.searchParams.get('limit')) || 3;
      const quotes = await fetchMoreQuotes(page, limit);
      return new Response(JSON.stringify(quotes), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // API: Search quotes
    if (path === '/api/search') {
      const query = url.searchParams.get('q') || '';
      const results = await searchQuotes(query);
      return new Response(JSON.stringify(results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Homepage
    if (path === '/' || path === '') {
      const cookie = request.headers.get('Cookie') || '';
      const accessToken = cookie.match(/sb-access-token=([^;]+)/)?.[1];
      let user = null;
      let userLikes = new Set();
      let userSaves = new Set();
      
      if (accessToken) {
        user = await getUserFromToken(accessToken);
        if (user) {
          userLikes = await getUserLikes(user.id);
          userSaves = await getUserSaves(user.id);
        }
      }
      
      const [quoteOfDay, categories, featuredAuthors, latestQuotes] = await Promise.all([
        fetchQuoteOfDay(),
        fetchCategories(),
        fetchFeaturedAuthors(),
        fetchLatestQuotes(4)
      ]);

      const html = generateFullHTML(quoteOfDay, categories, featuredAuthors, latestQuotes, userLikes, userSaves, user);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, s-maxage=3600' }
      });
    }
    return new Response('Not Found', { status: 404 });
  }
};

// ========== DATABASE FUNCTIONS ==========

async function getUserFromToken(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return null;
  return res.json();
}

async function getUserLikes(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_likes?select=quote_id&user_id=eq.${userId}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = res.ok ? await res.json() : [];
  return new Set(data.map(item => item.quote_id));
}

async function getUserSaves(userId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_saves?select=quote_id&user_id=eq.${userId}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = res.ok ? await res.json() : [];
  return new Set(data.map(item => item.quote_id));
}

async function addLike(userId, quoteId) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_likes`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quote_id: quoteId })
  });
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_like_count`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote_id: quoteId })
  });
}

async function removeLike(userId, quoteId) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_likes?user_id=eq.${userId}&quote_id=eq.${quoteId}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/decrement_like_count`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote_id: quoteId })
  });
}

async function getLikeCount(quoteId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=likes_count&id=eq.${quoteId}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = res.ok ? await res.json() : [];
  return data[0]?.likes_count || 0;
}

async function addSave(userId, quoteId) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_saves`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quote_id: quoteId })
  });
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_save_count`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote_id: quoteId })
  });
}

async function removeSave(userId, quoteId) {
  await fetch(`${SUPABASE_URL}/rest/v1/user_saves?user_id=eq.${userId}&quote_id=eq.${quoteId}`, {
    method: 'DELETE',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/decrement_save_count`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ quote_id: quoteId })
  });
}

async function getSaveCount(quoteId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=saves_count&id=eq.${quoteId}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = res.ok ? await res.json() : [];
  return data[0]?.saves_count || 0;
}

async function addComment(userId, quoteId, content) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_comments`, {
    method: 'POST',
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, quote_id: quoteId, content })
  });
  const data = await res.json();
  
  // Get user info for the comment
  const userRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=name,profile_image_url&id=eq.${userId}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const userData = userRes.ok ? await userRes.json() : [];
  const user = userData[0] || {};
  
  return {
    id: data[0]?.id,
    content,
    created_at: new Date().toISOString(),
    user: { name: user.name || 'Anonymous', profile_image_url: user.profile_image_url }
  };
}

async function getComments(quoteId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_comments?select=id,content,created_at,user_id&quote_id=eq.${quoteId}&order=created_at.desc`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const comments = res.ok ? await res.json() : [];
  
  // Get user info for each comment
  const userIds = [...new Set(comments.map(c => c.user_id))];
  if (userIds.length === 0) return [];
  
  const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,name,profile_image_url&id=in.(${userIds.join(',')})`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const users = usersRes.ok ? await usersRes.json() : [];
  const userMap = new Map(users.map(u => [u.id, u]));
  
  return comments.map(c => ({
    ...c,
    user: userMap.get(c.user_id) || { name: 'Anonymous', profile_image_url: null }
  }));
}

async function fetchQuoteOfDay() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url,likes_count,saves_count&order=random&limit=1`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  const data = res.ok ? await res.json() : [];
  return data[0] || null;
}

async function fetchCategories() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=name,slug&is_active=eq.true&limit=6`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function fetchFeaturedAuthors() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/authors?select=id,name,slug,profile_image_url&is_featured=eq.true&limit=6`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function fetchLatestQuotes(limit = 4) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url,likes_count,saves_count&order=created_at.desc&limit=${limit}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function fetchMoreQuotes(page = 1, limit = 3) {
  const offset = (page - 1) * limit;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url,likes_count,saves_count&order=created_at.desc&limit=${limit}&offset=${offset}`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function searchQuotes(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/quotes?select=id,slug,quote_text,author_name,media_url&quote_text=ilike.%${encodeURIComponent(query)}%&limit=10`, {
    headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

function generateFullHTML(quoteOfDay, categories, featuredAuthors, latestQuotes, userLikes, userSaves, user) {
  const currentYear = new Date().getFullYear();
  const siteUrl = 'https://quotesnova.com/';
  const siteTitle = 'QuotesNova — The Future of Quotes';
  const siteDesc = 'Discover the most inspiring quotes from great minds. Browse thousands of quotes about life, love, success, motivation, and wisdom.';
  const ogImage = 'https://quotesnova.com/og-image.jpg';
  const keywords = 'quotes, inspiration, motivation, wisdom, life quotes, love quotes, success quotes, daily quotes';
  const isLoggedIn = !!user;

  const defaultCategories = [
    { name: 'Life', slug: 'life' }, { name: 'Love', slug: 'love' },
    { name: 'Success', slug: 'success' }, { name: 'Motivation', slug: 'motivation' },
    { name: 'Wisdom', slug: 'wisdom' }, { name: 'Happiness', slug: 'happiness' }
  ];
  
  const displayCategories = categories.length > 0 ? categories : defaultCategories;
  const displayQuote = quoteOfDay;
  const displayAuthors = featuredAuthors;

  // SVG Icons
  const svgHome = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>';
  const svgQuotes = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>';
  const svgCategories = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>';
  const svgAuthors = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>';
  const svgSearch = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>';
  const svgMenu = '<svg xmlns="http://www.w3.org/2000/svg" class="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>';
  const svgProfile = '<svg xmlns="http://www.w3.org/2000/svg" class="icon-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
  const svgCalendar = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
  const svgBox = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>';
  const svgStar = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>';
  const svgHeart = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>';
  const svgHeartFilled = '<svg class="icon" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>';
  const svgBookmark = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>';
  const svgBookmarkFilled = '<svg class="icon" fill="currentColor" stroke="none" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>';
  const svgCopy = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>';
  const svgShare = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>';
  const svgComment = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>';
  const svgSun = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>';
  const svgMoon = '<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>';

  // JSON-LD Structured Data
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "QuotesNova",
    "alternateName": "QuotesNova — The Future of Quotes",
    "url": siteUrl,
    "description": siteDesc,
    "inLanguage": "en-US",
    "potentialAction": {
      "@type": "SearchAction",
      "target": siteUrl + "search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "QuotesNova",
    "url": siteUrl,
    "logo": "https://quotesnova.com/logo.png",
    "sameAs": ["https://x.com/quotesnovas", "https://www.instagram.com/quotesnovas"],
    "foundingDate": "2024",
    "description": siteDesc
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [{
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": siteUrl
    }]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${escapeHTML(siteTitle)}</title>
<meta name="title" content="${escapeHTML(siteTitle)}">
<meta name="description" content="${escapeHTML(siteDesc)}">
<meta name="keywords" content="${escapeHTML(keywords)}">
<meta name="author" content="QuotesNova">
<meta name="robots" content="index, follow">
<meta name="googlebot" content="index, follow">
<link rel="canonical" href="${siteUrl}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:url" content="${siteUrl}">
<meta property="og:title" content="${escapeHTML(siteTitle)}">
<meta property="og:description" content="${escapeHTML(siteDesc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:site_name" content="QuotesNova">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:url" content="${siteUrl}">
<meta name="twitter:title" content="${escapeHTML(siteTitle)}">
<meta name="twitter:description" content="${escapeHTML(siteDesc)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:site" content="@quotesnovas">
<script type="application/ld+json">${JSON.stringify(webSiteSchema)}</script>
<script type="application/ld+json">${JSON.stringify(organizationSchema)}</script>
<script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --bg-body: #f9fafb;
  --bg-card: #ffffff;
  --bg-header: #ffffff;
  --bg-sidebar: #ffffff;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --border: #e5e7eb;
  --accent: #9333ea;
  --accent-hover: #7e22ce;
  --shadow: 0 1px 2px rgba(0,0,0,0.05);
}
body.dark {
  --bg-body: #111827;
  --bg-card: #1f2937;
  --bg-header: #1f2937;
  --bg-sidebar: #1f2937;
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --border: #374151;
  --accent: #a855f7;
  --accent-hover: #c084fc;
  --shadow: 0 1px 2px rgba(0,0,0,0.3);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg-body);
  color: var(--text-primary);
  padding-bottom: 80px;
  transition: background 0.3s, color 0.3s;
}
.icon { width: 20px; height: 20px; display: inline-block; vertical-align: middle; }
.icon-md { width: 24px; height: 24px; }
.sidebar {
  position: fixed;
  top: 0;
  left: -300px;
  width: 300px;
  height: 100%;
  background: var(--bg-sidebar);
  z-index: 1000;
  transition: left 0.3s ease;
  box-shadow: 2px 0 10px rgba(0,0,0,0.1);
  overflow-y: auto;
}
.sidebar.open { left: 0; }
.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sidebar-header h3 { font-size: 18px; font-weight: 600; color: var(--accent); }
.close-sidebar {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
}
.sidebar a {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: var(--text-primary);
  text-decoration: none;
  border-bottom: 1px solid var(--border);
  transition: all 0.2s;
}
.sidebar a:hover { background: var(--bg-body); color: var(--accent); }
.sidebar-divider { border-top: 1px solid var(--border); margin: 8px 0; }
.theme-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  width: 100%;
  background: none;
  border: none;
  border-bottom: 1px solid var(--border);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}
.theme-btn:hover { background: var(--bg-body); color: var(--accent); }
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-header);
  border-bottom: 1px solid var(--border);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-primary);
  padding: 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.menu-btn:hover { background: var(--bg-body); color: var(--accent); }
.logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text-primary);
  text-decoration: none;
}
.logo span { color: var(--accent); }
.search-header {
  flex: 1;
  max-width: 300px;
  position: relative;
}
.search-header input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--border);
  border-radius: 40px;
  background: var(--bg-body);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.search-header input:focus { border-color: var(--accent); }
.search-header .icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  stroke: var(--text-secondary);
}
.profile-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-body);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}
.profile-btn:hover { background: var(--border); }
.main-container {
  max-width: 672px;
  margin: 0 auto;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.quote-card {
  background: var(--bg-card);
  border-radius: 24px;
  padding: 20px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.quote-flex { display: flex; flex-wrap: wrap; gap: 20px; }
.quote-flex > div:first-child { flex: 1; }
.quote-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 8px 0;
  line-height: 1.3;
}
.quote-author {
  color: var(--accent);
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 16px;
}
.quote-actions { display: flex; gap: 12px; margin-top: 12px; }
.btn-share, .btn-copy {
  background: var(--bg-body);
  color: var(--accent);
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}
.btn-share:hover, .btn-copy:hover { background: var(--border); }
.quote-image {
  width: 112px;
  height: 112px;
  border-radius: 12px;
  object-fit: cover;
}
.categories-header, .authors-header, .latest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.categories-title, .authors-title, .latest-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-all {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.view-all:hover { text-decoration: underline; }
.categories-scroll, .authors-scroll {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 8px;
}
.categories-scroll::-webkit-scrollbar, .authors-scroll::-webkit-scrollbar { display: none; }
.category-item {
  min-width: 90px;
  background: var(--bg-card);
  border-radius: 16px;
  padding: 12px;
  text-align: center;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  text-decoration: none;
  transition: all 0.2s;
}
.category-item:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}
.category-item .icon { stroke: var(--text-secondary); margin-bottom: 6px; }
.category-item:hover .icon { stroke: var(--accent); }
.category-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 8px;
}
.author-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 70px;
  text-decoration: none;
}
.author-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  transition: transform 0.2s;
}
.author-item:hover .author-avatar {
  transform: scale(1.05);
  border-color: var(--accent);
}
.author-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
  margin-top: 6px;
  text-align: center;
}
.quote-list-item {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 12px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}
.quote-list-img {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
}
.quote-list-img-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: var(--bg-body);
  display: flex;
  align-items: center;
  justify-content: center;
}
.quote-list-content { flex: 1; }
.quote-list-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
}
.quote-list-author {
  font-size: 11px;
  color: var(--accent);
  margin-top: 6px;
  font-weight: 500;
}
.quote-list-stats {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}
.quote-list-actions {
  display: flex;
  gap: 12px;
  margin-top: 10px;
}
.quote-action-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
}
.quote-action-btn:hover { color: var(--accent); background: var(--bg-body); }
.like-btn.liked { color: #ef4444; }
.save-btn.saved { color: var(--accent); }
.loading-spinner { text-align: center; padding: 20px; display: none; }
.spinner {
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-card);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 9999;
  white-space: nowrap;
  border: 1px solid var(--border);
  animation: fadeOut 2s forwards;
}
@keyframes fadeOut {
  0% { opacity: 1; }
  70% { opacity: 1; }
  100% { opacity: 0; visibility: hidden; }
}
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  z-index: 999;
  display: none;
}
.overlay.show { display: block; }
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-around;
  padding: 10px 16px;
  z-index: 50;
  max-width: 500px;
  margin: 0 auto;
  border-radius: 20px 20px 0 0;
}
.bottom-nav a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 10px;
  transition: color 0.2s;
}
.bottom-nav a:hover, .bottom-nav a.active { color: var(--accent); }
.bottom-nav a .icon { stroke: currentColor; }
.footer {
  text-align: center;
  padding: 24px 16px;
  border-top: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 32px;
}
.search-results {
  position: absolute;
  top: 45px;
  left: 0;
  right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 100;
  display: none;
}
.search-results a {
  display: block;
  padding: 10px 12px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 13px;
  border-bottom: 1px solid var(--border);
}
.search-results a:hover { background: var(--bg-body); color: var(--accent); }
.comments-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.comments-list { margin-bottom: 12px; }
.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--bg-body);
  border-radius: 12px;
}
.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
.comment-content { flex: 1; }
.comment-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.comment-text {
  font-size: 13px;
  color: var(--text-primary);
  margin-top: 2px;
}
.comment-time {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 4px;
}
.comment-input-area {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.comment-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-body);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  resize: none;
}
.comment-input:focus { border-color: var(--accent); }
.comment-submit {
  background: var(--accent);
  color: white;
  border: none;
  border-radius: 20px;
  padding: 0 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.comment-submit:hover { background: var(--accent-hover); }
@media (max-width: 640px) {
  .quote-text { font-size: 18px; }
  .quote-image { width: 80px; height: 80px; }
  .search-header { max-width: 180px; }
  .btn-share span, .btn-copy span { display: none; }
}
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
      ${displayCategories.map(cat => `
        <a href="/category/${escapeHTML(cat.slug)}" class="category-item">
          ${svgStar}
          <div class="category-name">${escapeHTML(cat.name)}</div>
        </a>
      `).join('')}
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
        const isLiked = userLikes.has(q.id);
        const isSaved = userSaves.has(q.id);
        return `
        <div class="quote-list-item" data-quote-id="${q.id}">
          ${q.media_url ? `<img src="${escapeHTML(q.media_url)}" class="quote-list-img" alt="Quote image">` : `<div class="quote-list-img-placeholder">${svgQuotes}</div>`}
          <div class="quote-list-content">
            <p class="quote-list-text" id="quote-${i}">${escapeHTML(q.quote_text)}</p>
            <p class="quote-list-author">— ${escapeHTML(q.author_name || 'Anonymous')}</p>
            <div class="quote-list-stats">
              <span>❤️ ${q.likes_count || 0} likes</span>
              <span>🔖 ${q.saves_count || 0} saves</span>
            </div>
            <div class="quote-list-actions">
              <button class="quote-action-btn like-btn ${isLiked ? 'liked' : ''}" data-quote-id="${q.id}" onclick="toggleLike(this, '${q.id}')">${isLiked ? svgHeartFilled : svgHeart} <span>Like</span></button>
              <button class="quote-action-btn save-btn ${isSaved ? 'saved' : ''}" data-quote-id="${q.id}" onclick="toggleSave(this, '${q.id}')">${isSaved ? svgBookmarkFilled : svgBookmark} <span>Save</span></button>
              <button class="quote-action-btn" onclick="copyQuoteText('quote-${i}')">${svgCopy} <span>Copy</span></button>
              <button class="quote-action-btn" onclick="shareQuoteText('${escapeJS(q.quote_text)}','${escapeJS(q.author_name || 'Anonymous')}','${escapeJS(q.slug)}')">${svgShare} <span>Share</span></button>
              <button class="quote-action-btn" onclick="toggleComments(this, '${q.id}')">${svgComment} <span>Comment</span></button>
            </div>
            <div class="comments-section" id="comments-${q.id}" style="display: none;">
              <div class="comments-list" id="comments-list-${q.id}"></div>
              <div class="comment-input-area">
                <input type="text" class="comment-input" id="comment-input-${q.id}" placeholder="Write a comment..." maxlength="500">
                <button class="comment-submit" onclick="addComment('${q.id}')">Post</button>
              </div>
            </div>
          </div>
        </div>
      `}).join('')}
    </div>
    <div id="loadingTrigger" style="height: 20px;"></div>
    <div id="loadingSpinner" class="loading-spinner">
      <div class="spinner"></div>
      <p style="margin-top: 8px;">Loading more quotes...</p>
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
const isLoggedIn = ${isLoggedIn};

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const themeText = document.getElementById('themeText');
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
  themeText.textContent = 'Light Mode';
}
themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  themeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
});

// Search
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  const query = searchInput.value.trim();
  if (query.length < 2) {
    searchResults.style.display = 'none';
    return;
  }
  searchTimeout = setTimeout(async () => {
    const res = await fetch('/api/search?q=' + encodeURIComponent(query));
    const data = await res.json();
    if (data.length === 0) {
      searchResults.style.display = 'none';
      return;
    }
    searchResults.innerHTML = data.map(item => '<a href="/quote/' + item.slug + '">' + escapeHtml(item.quote_text.substring(0, 80)) + ' — ' + escapeHtml(item.author_name || 'Anonymous') + '</a>').join('');
    searchResults.style.display = 'block';
  }, 300);
});
document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
    searchResults.style.display = 'none';
  }
});

// Copy Functions
function copyToClipboard() {
  const text = document.getElementById('qotd-text').innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
}
function copyQuoteText(id) {
  const text = document.getElementById(id).innerText;
  navigator.clipboard.writeText(text).then(() => showToast('Quote copied!'));
}

// Share Functions
function shareQuote() {
  const text = document.getElementById('qotd-text').innerText;
  if (navigator.share) navigator.share({ title: 'QuotesNova', text: text });
  else copyToClipboard();
}
function shareQuoteText(text, author, slug) {
  const url = 'https://quotesnova.com/quote/' + slug;
  const shareText = '"' + text + '" — ' + author;
  if (navigator.share) navigator.share({ title: 'QuotesNova', text: shareText, url: url });
  else navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
}

// Like Function
async function toggleLike(btn, quoteId) {
  if (!isLoggedIn) {
    showToast('Please login to like quotes');
    setTimeout(() => { window.location.href = '/login'; }, 1500);
    return;
  }
  const isLiked = btn.classList.contains('liked');
  try {
    const res = await fetch('/api/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, action: isLiked ? 'unlike' : 'like' })
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    if (data.success) {
      btn.classList.toggle('liked');
      btn.innerHTML = (btn.classList.contains('liked') ? '${svgHeartFilled}' : '${svgHeart}') + ' <span>Like</span>';
      const statsDiv = btn.closest('.quote-list-content').querySelector('.quote-list-stats span:first-child');
      if (statsDiv) statsDiv.innerHTML = '❤️ ' + data.likeCount + ' likes';
      showToast(isLiked ? 'Like removed' : 'Liked!');
    }
  } catch(e) { console.error(e); }
}

// Save Function
async function toggleSave(btn, quoteId) {
  if (!isLoggedIn) {
    showToast('Please login to save quotes');
    setTimeout(() => { window.location.href = '/login'; }, 1500);
    return;
  }
  const isSaved = btn.classList.contains('saved');
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, action: isSaved ? 'unsave' : 'save' })
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    if (data.success) {
      btn.classList.toggle('saved');
      btn.innerHTML = (btn.classList.contains('saved') ? '${svgBookmarkFilled}' : '${svgBookmark}') + ' <span>Save</span>';
      const statsSpan = btn.closest('.quote-list-content').querySelector('.quote-list-stats span:last-child');
      if (statsSpan) statsSpan.innerHTML = '🔖 ' + data.saveCount + ' saves';
      showToast(isSaved ? 'Removed from saves' : 'Saved!');
    }
  } catch(e) { console.error(e); }
}

// Comments
async function toggleComments(btn, quoteId) {
  const section = document.getElementById('comments-' + quoteId);
  if (section.style.display === 'block') {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  await loadComments(quoteId);
}
async function loadComments(quoteId) {
  const container = document.getElementById('comments-list-' + quoteId);
  try {
    const res = await fetch('/api/comments?quoteId=' + quoteId);
    const comments = await res.json();
    if (comments.length === 0) {
      container.innerHTML = '<div style="padding: 8px; color: var(--text-secondary); font-size: 12px;">No comments yet. Be the first!</div>';
      return;
    }
    container.innerHTML = comments.map(c => `
      <div class="comment-item">
        <img src="${c.user?.profile_image_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(c.user?.name || 'A') + '&background=9333ea&color=fff'}" class="comment-avatar">
        <div class="comment-content">
          <div class="comment-name">${escapeHtml(c.user?.name || 'Anonymous')}</div>
          <div class="comment-text">${escapeHtml(c.content)}</div>
          <div class="comment-time">${new Date(c.created_at).toLocaleDateString()}</div>
        </div>
      </div>
    `).join('');
  } catch(e) { console.error(e); }
}
async function addComment(quoteId) {
  if (!isLoggedIn) {
    showToast('Please login to comment');
    setTimeout(() => { window.location.href = '/login'; }, 1500);
    return;
  }
  const input = document.getElementById('comment-input-' + quoteId);
  const content = input.value.trim();
  if (!content) {
    showToast('Please enter a comment');
    return;
  }
  try {
    const res = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId, content })
    });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
      return;
    }
    if (data.success) {
      input.value = '';
      await loadComments(quoteId);
      showToast('Comment added!');
    }
  } catch(e) { console.error(e); }
}

// Toast
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// Infinite Scroll
let currentPage = 1, isLoading = false, hasMore = true;
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
      quotes.forEach((q, idx) => {
        const newIdx = count + idx;
        const isLiked = false;
        const isSaved = false;
        const div = document.createElement('div');
        div.className = 'quote-list-item';
        div.setAttribute('data-quote-id', q.id);
        const imgHtml = q.media_url ? `<img src="${escapeHtml(q.media_url)}" class="quote-list-img" alt="Quote image">` : `<div class="quote-list-img-placeholder">${svgQuotes}</div>`;
        div.innerHTML = \`
          \${imgHtml}
          <div class="quote-list-content">
            <p class="quote-list-text" id="quote-\${newIdx}">\${escapeHtml(q.quote_text)}</p>
            <p class="quote-list-author">— \${escapeHtml(q.author_name || 'Anonymous')}</p>
            <div class="quote-list-stats">
              <span>❤️ \${q.likes_count || 0} likes</span>
              <span>🔖 \${q.saves_count || 0} saves</span>
            </div>
            <div class="quote-list-actions">
              <button class="quote-action-btn like-btn" data-quote-id="\${q.id}" onclick="toggleLike(this, '\${q.id}')">${svgHeart} <span>Like</span></button>
              <button class="quote-action-btn save-btn" data-quote-id="\${q.id}" onclick="toggleSave(this, '\${q.id}')">${svgBookmark} <span>Save</span></button>
              <button class="quote-action-btn" onclick="copyQuoteText('quote-\${newIdx}')">${svgCopy} <span>Copy</span></button>
              <button class="quote-action-btn" onclick="shareQuoteText('\${escapeJs(q.quote_text)}','\${escapeJs(q.author_name || 'Anonymous')}','\${escapeJs(q.slug)}')">${svgShare} <span>Share</span></button>
              <button class="quote-action-btn" onclick="toggleComments(this, '\${q.id}')">${svgComment} <span>Comment</span></button>
            </div>
            <div class="comments-section" id="comments-\${q.id}" style="display: none;">
              <div class="comments-list" id="comments-list-\${q.id}"></div>
              <div class="comment-input-area">
                <input type="text" class="comment-input" id="comment-input-\${q.id}" placeholder="Write a comment..." maxlength="500">
                <button class="comment-submit" onclick="addComment('\${q.id}')">Post</button>
              </div>
            </div>
          </div>
        \`;
        container.appendChild(div);
      });
      currentPage++;
    }
  } catch(e) { console.error(e); }
  finally {
    isLoading = false;
    spinner.style.display = 'none';
  }
}
function escapeHtml(s) { if(!s) return ''; return s.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }
function escapeJs(s) { if(!s) return ''; return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }
new IntersectionObserver(e => e.forEach(e => e.isIntersecting && loadMoreQuotes()), { threshold: 0.1 }).observe(document.getElementById('loadingTrigger'));
</script>
</body>
</html>`;
}

function escapeHTML(s) { if(!s) return ''; return s.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }
function escapeJS(s) { if(!s) return ''; return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }