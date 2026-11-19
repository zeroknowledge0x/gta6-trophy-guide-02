# Leonida Legends — GTA VI Trophy Guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-02/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/zeroknowledge0x/gta6-trophy-guide-02/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline, single-page guide and tracker for all 55 official GTA VI trophies. Each has the exact PlayStation name and description, an original field guide with a named source, steps, a kind, a missable verdict and a roadmap stage. No build step, no runtime network: the page reads only its own local data file.

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080>. For a fixed output directory instead of `/output`, use `MAKEFUN_OUTPUT_DIR=out node main.ts` (Node 22, standard library only).

## How the tracker works

Tick the box beside any trophy and it is saved to `localStorage` under `gta6trophies`, so progress survives a reload. Search across names, descriptions and guides; filter by kind with the chips; switch **Hide spoilers** on to mask unearned story trophies until you earn them. Click a row for the full guide, source link, steps and missable note. **Export** downloads your progress as JSON and **Import** loads it back; **Reset** clears everything after confirmation. The Roadmap groups all 55 trophies into six stages, and Missables lists every trophy with a limited window and why it can slip away.

Trophy names and descriptions are the official list. Guides, steps and the roadmap are original writing; the citation URLs are reference text only and are never fetched by the app.
