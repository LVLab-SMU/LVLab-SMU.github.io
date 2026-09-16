# Saved GitHub star counts

News and Publications render a saved snapshot before any network refresh. Visitors never contact the GitHub API for counts. Both NUS and SMU use the same snapshot and the existing inline code link styling.

`scripts/update-github-stars.mjs` discovers repository links in publication and news data, fetches counts with the workflow's GitHub token, and writes `assets/github-stars.json` plus its preloaded script `assets/js/github-stars-data.js`. Failed requests preserve each repository's last successful count and timestamp; unavailable repositories do not display a fabricated zero. A complete fetch outage fails the workflow and leaves the deployed snapshot in place.

The `Refresh GitHub stars` workflow runs every six hours at minute 23 UTC, when publication/news sources change, or on manual dispatch. Scheduled runs can be delayed by GitHub. It commits the snapshot and explicitly deploys Pages, because commits made with `GITHUB_TOKEN` do not trigger a Pages build. The existing branch-based publishing source remains supported. Active tabs check the same-origin JSON hourly and retain saved counts if that fetch fails.

To refresh locally, set `GITHUB_TOKEN` in the environment and run `node scripts/update-github-stars.mjs`. Never put a token in a public asset. Run `npm run validate` and `node --test scripts/github-stars.test.mjs` before publishing.
