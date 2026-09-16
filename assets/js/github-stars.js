(() => {
  const TTL = 60 * 60 * 1000;
  const RETRY_DELAY = 5 * 60 * 1000;
  const cache = new Map();
  const pending = new Map();
  const retryAt = new Map();
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function repository(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
      const match = /^\/([\w-]+)\/([\w.-]+)\/?$/.exec(url.pathname);
      if (!match) return null;
      return `${match[1]}/${match[2].replace(/\.git$/, '')}`;
    } catch {
      return null;
    }
  }

  function readCache(repo) {
    if (cache.has(repo)) return cache.get(repo);
    try {
      const value = JSON.parse(localStorage.getItem(`lv-github-stars:${repo}`));
      if (Number.isSafeInteger(value?.count) && value.count >= 0 &&
          Number.isFinite(value.updatedAt) && value.updatedAt > 0 && value.updatedAt <= Date.now()) {
        cache.set(repo, value);
        return value;
      }
    } catch { /* Storage may be unavailable in private browsing. */ }
    return null;
  }

  function paint(link, value) {
    const count = link.querySelector('.github-star-count');
    if (!value) {
      count.hidden = true;
      link.title = 'View code on GitHub; star count is currently unavailable';
      return;
    }
    const formatted = value.count.toLocaleString('en-US');
    count.textContent = `★ ${formatted}`;
    count.hidden = false;
    count.setAttribute('aria-label', `${formatted} GitHub stars`);
    const stale = Date.now() - value.updatedAt >= TTL;
    link.title = `${link.dataset.githubRepo}: ${formatted} stars${stale ? ' (cached)' : ''}. Updated ${new Date(value.updatedAt).toLocaleString()}`;
  }

  async function getStars(repo) {
    if (pending.has(repo)) return pending.get(repo);
    const value = readCache(repo);
    if (value && Date.now() - value.updatedAt < TTL) return value;
    if (Date.now() < (retryAt.get(repo) || 0)) return value;

    const request = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://api.github.com/repos/${repo}`, {
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-cache'
        });
        if (!response.ok) {
          const resetAt = Number(response.headers.get('x-ratelimit-reset')) * 1000;
          retryAt.set(repo, Math.max(Date.now() + RETRY_DELAY, Number.isFinite(resetAt) ? resetAt : 0));
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (!Number.isSafeInteger(data.stargazers_count) || data.stargazers_count < 0) {
          throw new Error('Invalid star count');
        }
        const next = { count: data.stargazers_count, updatedAt: Date.now() };
        cache.set(repo, next);
        retryAt.delete(repo);
        try { localStorage.setItem(`lv-github-stars:${repo}`, JSON.stringify(next)); } catch { /* Optional cache. */ }
        return next;
      } catch {
        if (!retryAt.has(repo) || retryAt.get(repo) <= Date.now()) retryAt.set(repo, Date.now() + RETRY_DELAY);
        return value;
      } finally {
        clearTimeout(timeout);
      }
    })();
    pending.set(repo, request);
    try { return await request; } finally { pending.delete(repo); }
  }

  function render(event) {
    const repos = new Map();
    const candidates = [
      ...Object.entries(event.codeLinks || {}),
      ...Object.entries(event.titleLinks || {}),
      ['Code', event.link]
    ];
    for (const [label, url] of candidates) {
      const repo = repository(url);
      if (repo && !repos.has(repo.toLowerCase())) repos.set(repo.toLowerCase(), { repo, label });
    }
    if (!repos.size) return '';
    const links = [...repos.values()].map(({ repo, label }) => {
      const text = repos.size > 1 ? `${label} · Code` : 'Code';
      return `<a class="news-code-link" href="https://github.com/${escape(repo)}" data-github-repo="${escape(repo)}" target="_blank" rel="noopener noreferrer"><span>${escape(text)}</span><span class="github-star-count" hidden></span></a>`;
    });
    return `<div class="news-code-links">${links.join('')}</div>`;
  }

  async function refresh(root = document) {
    await Promise.all([...root.querySelectorAll('[data-github-repo]')].map(async (link) => {
      const repo = link.dataset.githubRepo;
      paint(link, readCache(repo));
      paint(link, await getStars(repo));
    }));
  }

  window.NewsCodeLinks = { render, refresh };
  // Refresh long-lived tabs as well as new visits, without polling hidden tabs.
  setInterval(() => { if (!document.hidden) refresh(); }, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
