(() => {
  const script = document.currentScript;
  const dataSrc = script?.dataset.publicationsSrc;
  const listId = script?.dataset.listId || "pubList";
  const yearFilterId = script?.dataset.yearFilterId || "yearFilter";
  const searchInputId = script?.dataset.searchInputId || "searchInput";
  const highlightAuthors = (script?.dataset.highlightAuthors || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  let publications = [];
  const starCache = new Map();

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));

  const hasSpecificDate = (item) => {
    const raw = String(item.date ?? item.displayDate ?? "").trim();
    return raw && raw !== String(item.year);
  };

  const formatTitle = (title) => escapeHtml(title)
    .replace(/\$\\underline\{([^}]*)\}\$/g, "$1")
    .replace(/\$\^([^$]+)\$/g, "<sup>$1</sup>");

  const formatAuthors = (authors) => {
    let html = escapeHtml(authors);
    for (const name of highlightAuthors) {
      const escapedName = escapeHtml(name);
      html = html.replaceAll(escapedName, `<strong>${escapedName}</strong>`);
    }
    return html;
  };

  const groupYear = (year) => year < 2024 ? "Before 2024" : year;

  const byDateDesc = (a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const aSpecific = hasSpecificDate(a);
    const bSpecific = hasSpecificDate(b);
    if (aSpecific !== bSpecific) return aSpecific ? -1 : 1;
    if (aSpecific && bSpecific && a.sortDate !== b.sortDate) {
      return b.sortDate.localeCompare(a.sortDate);
    }
    return 0;
  };

  const renderLoadError = (message) => {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = `
      <article class="pub-card pub-load-error">
        <h3>Publications could not be loaded</h3>
        <div class="authors">${escapeHtml(message)}</div>
      </article>
    `;
  };

  const renderList = (data) => {
    const list = document.getElementById(listId);
    if (!list) return;

    list.innerHTML = "";
    let currentYear = null;

    data.sort(byDateDesc).forEach((publication) => {
      const yearGroup = groupYear(publication.year);
      if (yearGroup !== currentYear) {
        currentYear = yearGroup;
        const heading = document.createElement("h2");
        heading.textContent = yearGroup;
        heading.dataset.anchor = yearGroup;
        heading.className = "text-xl font-bold mt-2 first:mt-0 text-[color:var(--lv-orange)]";
        list.appendChild(heading);
      }

      let badgeHtml = "";
      if (publication.presentation === "oral" || publication.presentation === "spotlight") {
        const label = publication.presentation === "oral" ? "Oral" : "Spotlight";
        badgeHtml = `<span class="pres-badge ${publication.presentation}">${label}</span>`;
      }

      const linksHtml = Object.entries(publication.links || {}).map(([key, value]) => {
        if (!value) return "";

        const iconClass = key === "code" ? "fa-brands fa-github" : "fa-solid fa-file-lines";
        if (key === "code" && value.includes("github.com")) {
          const repoId = btoa(value);
          return `
            <a class="link-icon gh-code" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer" data-url="${escapeHtml(value)}" data-id="${repoId}">
              <i class="${iconClass}"></i> ${escapeHtml(key)}
              <span class="gh-star-wrap">
                <i class="fa-solid fa-star"></i> <span id="star-count-${repoId}">...</span>
              </span>
            </a>`;
        }

        return `
          <a class="link-icon" href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">
            <i class="${iconClass}"></i> ${escapeHtml(key)}
          </a>`;
      }).join("");

      list.insertAdjacentHTML("beforeend", `
        <article class="pub-card">
          <h3>${formatTitle(publication.title)} ${badgeHtml}</h3>
          <div class="authors">${formatAuthors(publication.authors)}</div>
          <div class="venue">${escapeHtml(publication.venue)}</div>
          ${linksHtml}
        </article>
      `);
    });

    fetchGitHubStars();
  };

  const bindControls = (years) => {
    const yearFilter = document.getElementById(yearFilterId);
    const searchInput = document.getElementById(searchInputId);
    if (!yearFilter || !searchInput) return;

    yearFilter.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
    years.forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    });

    const filter = () => {
      let data = [...publications];
      if (yearFilter.value !== "all") {
        data = data.filter((publication) => (
          yearFilter.value === "Before 2024"
            ? publication.year < 2024
            : publication.year === Number(yearFilter.value)
        ));
      }

      const keyword = searchInput.value.trim().toLowerCase();
      if (keyword) {
        data = data.filter((publication) => (
          `${publication.title}${publication.authors}${publication.venue}`.toLowerCase().includes(keyword)
        ));
      }

      renderList(data);
    };

    yearFilter.addEventListener("change", filter);
    searchInput.addEventListener("input", filter);
    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchInput.focus();
      }
    });

    filter();
  };

  async function fetchGitHubStars() {
    const items = document.querySelectorAll(".gh-code");
    for (const element of items) {
      const url = element.dataset.url;
      const id = element.dataset.id;
      const starSpan = document.getElementById(`star-count-${id}`);
      if (!url || !starSpan) continue;

      if (starCache.has(url)) {
        starSpan.textContent = starCache.get(url);
        continue;
      }

      try {
        const parts = new URL(url).pathname.split("/").filter(Boolean);
        if (parts.length < 2) continue;

        const [owner, repo] = parts;
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!response.ok) throw new Error("GitHub API request failed");

        const data = await response.json();
        starCache.set(url, data.stargazers_count);
        starSpan.textContent = data.stargazers_count;
      } catch {
        starSpan.textContent = "—";
      }
    }
  }

  (async () => {
    if (!dataSrc) {
      renderLoadError("Missing publications data source.");
      return;
    }

    try {
      const response = await fetch(dataSrc, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      publications = await response.json();
    } catch (error) {
      const fileHint = window.location.protocol === "file:"
        ? "Open this page through the local preview server so the browser can load JSON data."
        : `Failed to load ${dataSrc}.`;
      renderLoadError(fileHint);
      console.error("load publications failed", error);
      return;
    }

    const years = [...new Set(publications.map((publication) => groupYear(publication.year)))].sort((a, b) => {
      if (a === "Before 2024") return 1;
      if (b === "Before 2024") return -1;
      return b - a;
    });

    bindControls(years);
    window.enableJsonLiveReload?.(dataSrc);
  })();
})();
