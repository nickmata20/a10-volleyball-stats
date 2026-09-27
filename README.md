# A-10 Volleyball Stat Hub

Full team and player statistics for all 10 Atlantic 10 women's volleyball programs, refreshed automatically every night at midnight Eastern during the season (August–December).

## How it works

1. **Import:** `scripts/scrape.rb` reads each school's official cumulative stats page (for example `gomason.com/sports/womens-volleyball/stats/2026`) and the A-10 standings page, then saves everything to `data/stats.json`.
2. **Build:** `scripts/build.rb` combines the page design (`src/page.html`), the page code (`src/app.js`) and the data into one file, `docs/index.html`.
3. **Publish:** GitHub Pages serves the `docs/` folder as the public website.

The nightly job in `.github/workflows/nightly.yml` runs steps 1–3 on GitHub's servers, so no computer needs to stay on.

If a school's site can't be read one night, that team keeps its last good stats and its page shows a "Not refreshed last night" notice. If no school can be read at all, the site is left unchanged and GitHub emails the repository owner that the run failed.

## Common tasks

- **Refresh right now:** on GitHub, open the **Actions** tab → **Nightly stats refresh** → **Run workflow**.
- **New season:** nothing to change. The importer uses the current year's stats pages automatically.
- **A school changes its website address:** update its entry in the `SCHOOLS` list near the top of `scripts/scrape.rb`.
- **Test locally:** `ruby scripts/scrape.rb && ruby scripts/build.rb`, then open `docs/index.html` in a browser.

## Where the numbers come from

Stats are copied as published on each school's athletics site. Per-set numbers are calculated from those totals. Standings come from atlantic10.com.
