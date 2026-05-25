(() => {
  const script = document.currentScript;
  const eventsSrc = script?.dataset.eventsSrc;
  const listId = script?.dataset.listId || "eventsList";
  const timelineId = script?.dataset.timelineId || "timelineYears";
  const yearFilterId = script?.dataset.yearFilterId || "yearFilter";
  const searchInputId = script?.dataset.searchInputId || "searchInput";
  const earlierLabel = script?.dataset.earlierLabel || "Before 2024";
  const cutoffMode = script?.dataset.cutoffMode || "fixed";
  const fixedCutoffYear = Number(script?.dataset.cutoffYear || 2024);
  const recentWindowYears = Number(script?.dataset.recentWindowYears || 2);

  let events = [];

  const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));

  const byDateDesc = (a, b) => b.sortDate.localeCompare(a.sortDate);

  const cutoffYear = () => (
    cutoffMode === "recent-window"
      ? new Date().getFullYear() - recentWindowYears + 1
      : fixedCutoffYear
  );

  const groupEvent = (event) => event.year < cutoffYear() ? earlierLabel : String(event.year);

  const formatDate = (raw) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (!match) return raw;
    return new Date(`${match[1]}-${match[2]}-${match[3]}`)
      .toLocaleDateString("en-SG", { year: "numeric", month: "short", day: "numeric" });
  };

  const renderLoadError = (message) => {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = `
      <article class="pub-card event-load-error">
        <h3>News could not be loaded</h3>
        <p>${escapeHtml(message)}</p>
      </article>
    `;
  };

  const renderTimeline = (years) => {
    const timeline = document.getElementById(timelineId);
    if (!timeline) return;
    timeline.innerHTML = "";

    years.forEach((year) => {
      const item = document.createElement("li");
      item.textContent = year;
      item.addEventListener("click", () => {
        document.querySelector(`[data-anchor="${year}"]`)?.scrollIntoView({ behavior: "smooth" });
      });
      timeline.appendChild(item);
    });
  };

  const renderEvents = (data) => {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = "";

    let currentYear = null;
    data.sort(byDateDesc).forEach((event) => {
      const group = groupEvent(event);
      if (group !== currentYear) {
        currentYear = group;
        const heading = document.createElement("h2");
        heading.textContent = group;
        heading.dataset.anchor = group;
        heading.className = "text-xl font-bold mt-0 first:mt-0 text-[color:var(--lv-orange)] mb-4 mt-4";
        list.appendChild(heading);
      }

      const article = document.createElement("article");
      article.className = "pub-card";

      const summaryHtml = event.summary
        ? `<p class="${event.multilineSummary ? "multiline-summary multi-line-summary" : ""}">${escapeHtml(event.summary)}</p>`
        : "";
      const linkHtml = event.link
        ? `<a class="more" href="${escapeHtml(event.link)}" target="_blank" rel="noopener noreferrer">Read more →</a>`
        : "";

      article.innerHTML = `
        <time>${escapeHtml(formatDate(event.displayDate))}</time>
        <h3>${escapeHtml(event.title)}</h3>
        ${summaryHtml}
        ${linkHtml}
      `;
      list.appendChild(article);
    });
  };

  const bindControls = (years) => {
    const yearFilter = document.getElementById(yearFilterId);
    const searchInput = document.getElementById(searchInputId);
    if (!yearFilter || !searchInput) return;

    yearFilter.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
    years.forEach((year) => yearFilter.add(new Option(year, year)));

    const filter = () => {
      let data = [...events];

      if (yearFilter.value !== "all") {
        data = data.filter((event) => (
          yearFilter.value === earlierLabel
            ? event.year < cutoffYear()
            : String(event.year) === yearFilter.value
        ));
      }

      const keyword = searchInput.value.trim().toLowerCase();
      if (keyword) {
        data = data.filter((event) => `${event.title}${event.summary || ""}`.toLowerCase().includes(keyword));
      }

      renderEvents(data);
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

  (async () => {
    if (!eventsSrc) {
      renderLoadError("Missing news data source.");
      return;
    }

    try {
      const response = await fetch(eventsSrc, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      events = await response.json();
    } catch (error) {
      const fileHint = window.location.protocol === "file:"
        ? "Open this page through the local preview server so the browser can load JSON data."
        : `Failed to load ${eventsSrc}.`;
      renderLoadError(fileHint);
      console.error("Failed to load events", error);
      return;
    }

    const years = [...new Set(events.map(groupEvent))].sort((a, b) => {
      if (a === earlierLabel) return 1;
      if (b === earlierLabel) return -1;
      return Number(b) - Number(a);
    });

    renderTimeline(years);
    bindControls(years);
    window.enableJsonLiveReload?.(eventsSrc);
  })();
})();
