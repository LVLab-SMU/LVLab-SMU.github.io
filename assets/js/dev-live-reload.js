(function () {
  const localHosts = new Set(['127.0.0.1', 'localhost']);

  function enableJsonLiveReload(assetPath, intervalMs) {
    if (!localHosts.has(window.location.hostname) || !assetPath || typeof fetch !== 'function') {
      return;
    }

    let lastStamp = null;

    const poll = async () => {
      try {
        const separator = assetPath.includes('?') ? '&' : '?';
        const response = await fetch(`${assetPath}${separator}t=${Date.now()}`, {
          method: 'HEAD',
          cache: 'no-store'
        });
        const nextStamp = response.headers.get('last-modified') || response.headers.get('etag');
        if (!nextStamp) return;
        if (lastStamp && nextStamp !== lastStamp) {
          window.location.reload();
          return;
        }
        lastStamp = nextStamp;
      } catch (error) {
        console.debug('JSON live reload check failed:', error);
      }
    };

    poll();
    window.setInterval(poll, intervalMs || 2000);
  }

  window.enableJsonLiveReload = enableJsonLiveReload;
})();
