# A-10 Volleyball Stat Hub

Full team and player statistics for all 10 Atlantic 10 women's volleyball programs, refreshed automatically every night at midnight Eastern during the season (August–December).

Live site: https://nickmata20.github.io/a10-volleyball-stats/

## How it works

1. **Import:** `scripts/scrape.rb` reads each school's official cumulative stats page (for example `gomason.com/sports/womens-volleyball/stats/2026`) and the conference standings page, then saves everything to `data/stats.json`.
2. **Build:** `scripts/build.rb` combines the page design (`src/page.html`), the page code (`src/app.js`), the conference settings and the data into one file, `docs/index.html`.
3. **Publish:** GitHub Pages serves the `docs/` folder as the public website.

The nightly job in `.github/workflows/nightly.yml` runs steps 1–3 on GitHub's servers, so no computer needs to stay on.

If a school's site can't be read one night, that team keeps its last good stats and its page shows a "Not refreshed last night" notice. If no school can be read at all, the site is left unchanged and GitHub emails the repository owner that the run failed.

## Using this for another conference

Everything conference-specific lives in one file, **`config/conference.json`**:

| Setting | What it is |
|---|---|
| `conference.short` | Short name used in labels, e.g. `"A-10"`, `"MAC"` |
| `conference.full` | Full name, e.g. `"Atlantic 10"`, `"Mid-American Conference"` |
| `conference.standingsUrl` | The conference's volleyball standings page |
| `conference.standingsSite` | Site name shown in the footer credit, e.g. `"atlantic10.com"` |
| `statsPath` | Path to each school's stats page; `{season}` becomes the year |
| `teams` | One entry per school: `id` (short, unique, lowercase), `name`, `mascot`, `abbr`, `color1` and `color2` (hex colors), and `site` (the athletics website address) |

Optional per team: `standingsName`, when the standings page spells the school differently from `name` (for example `"Miami (OH)"`).

To start a new conference: copy this project, edit `config/conference.json`, delete `data/stats.json`, then run `ruby scripts/scrape.rb && ruby scripts/build.rb` and check that every school says "players" rather than "FAILED". Schools must use the standard athletics-site stats pages; both the older table layout and the newer layout are supported.

Two settings live in `.github/workflows/nightly.yml` instead: the season months (`8-12` in the schedule line) and the time zone used for the midnight check (`America/New_York`).

## Common tasks

- **Refresh right now:** on GitHub, open the **Actions** tab → **Nightly stats refresh** → **Run workflow**.
- **New season:** nothing to change. The importer uses the current year's stats pages automatically.
- **A school changes its website address:** update its `site` in `config/conference.json`.
- **Test locally:** `ruby scripts/scrape.rb && ruby scripts/build.rb`, then open `docs/index.html` in a browser.

## Where the numbers come from

Stats are copied as published on each school's athletics site. Per-set numbers are calculated from those totals. Standings come from the conference's standings page.
