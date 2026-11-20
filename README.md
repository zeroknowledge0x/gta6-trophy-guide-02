# Leonida Legends - GTA VI Trophy Guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-02/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-02/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01)

An offline trophy guide and tracker for all 55 official GTA VI PlayStation trophies. Every entry keeps the official name, description and grade, adds an original how-to guide with a named source, and is tagged with a kind, a missable flag, short steps and a roadmap stage. The six-stage roadmap and the missables watchlist are generated from that data.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. There is no build step and no network access: the page loads only its own files from `app/`.

## How the tracker works

- Tick a trophy with its check button, or open a row to read the guide and tick it there. Progress is saved in `localStorage` under `gta6trophies`.
- Search matches names, official descriptions, guides and steps. The kind chips filter to Story, Missable, Collectibles, Activities or Online.
- **Hide story spoilers** blanks the names and descriptions of unearned story trophies until you earn them.
- **Export** downloads a small JSON progress file; **Import** reads one back. **Reset** clears everything after confirmation.
- The Roadmap and Missables panels are built from the same data, so flags and stages stay in sync with the checklist.

Citation links are display text only; the app never fetches them.

## Hand-off

`main.ts` copies `app/` and `screenshots/` to `MAKEFUN_OUTPUT_DIR` (default `/output`) and writes `dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
