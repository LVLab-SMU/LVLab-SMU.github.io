(() => {
  const snapshotUrl = new URL('../github-stars.json', document.currentScript.src);
  const REFRESH_INTERVAL = 60 * 60 * 1000;
  let snapshot = window.GitHubStarSnapshot || { repositories: {} };
  let lastCheck = Date.now();
  let pending;
  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function repository(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
      const match = /^\/([\w-]+)\/([\w.-]+)(?:\/|$)/.exec(url.pathname);
      return match ? `${match[1]}/${match[2].replace(/\.git$/, '')}`.toLowerCase() : null;
    } catch { return null; }
  }

  function get(repo) {
    const value = snapshot.repositories?.[repo.toLowerCase()];
    return Number.isSafeInteger(value?.count) && value.count >= 0 && Number.isFinite(Date.parse(value.updatedAt)) ? value : null;
  }

  function paint(root) {
    for (const link of root.querySelectorAll('[data-github-repo]')) {
      const value = get(link.dataset.githubRepo);
      const count = link.querySelector('.github-star-count, .gh-star-wrap');
      if (!count) continue;
      count.hidden = !value;
      if (!value) {
        link.title = 'View code on GitHub';
        continue;
      }
      count.querySelector('.github-star-value').textContent = value.count;
      count.setAttribute('aria-label', `${value.count} GitHub stars`);
      link.title = `${link.dataset.githubRepo}: ${value.count} stars. Updated ${new Date(value.updatedAt).toLocaleString()}`;
    }
  }

  async function refresh(root = document) {
    paint(root);
    // Long-lived tabs can pick up the published snapshot, without contacting GitHub.
    if (Date.now() - lastCheck < REFRESH_INTERVAL) return;
    if (!pending) {
      lastCheck = Date.now();
      pending = (async () => {
        try {
          const response = await fetch(snapshotUrl, { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
          if (!response.ok) return;
          const next = await response.json();
          if (!next.repositories || typeof next.repositories !== 'object') return;
          for (const [repo, value] of Object.entries(next.repositories)) {
            if (Number.isSafeInteger(value?.count) && value.count >= 0 && Number.isFinite(Date.parse(value.updatedAt)) &&
                (!get(repo) || Date.parse(value.updatedAt) >= Date.parse(get(repo).updatedAt))) snapshot.repositories[repo] = value;
          }
        } catch { /* Keep the preloaded snapshot if the site is unreachable. */ }
        finally { pending = null; }
      })();
    }
    await pending;
    paint(document);
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
      const value = get(repo);
      const text = repos.size > 1 ? `${label} code` : 'code';
      return `<a class="news-code-link" href="https://github.com/${escape(repo)}" data-github-repo="${escape(repo)}" target="_blank" rel="noopener noreferrer"><i class="fa fa-github" aria-hidden="true"></i><span>${escape(text)}</span><span class="github-star-count" ${value ? '' : 'hidden'}><i class="fa fa-star" aria-hidden="true"></i><span class="github-star-value">${value?.count ?? ''}</span></span></a>`;
    });
    return `<div class="news-code-links">${links.join('')}</div>`;
  }

  window.GitHubStars = { repository, get, refresh };
  window.NewsCodeLinks = { render, refresh };
  setInterval(() => { if (!document.hidden) refresh(); }, 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
