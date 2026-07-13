# Channel Category Catalog

Catalog of all channel categories available in the [iptv-org API](https://iptv-org.github.io/api/channels.json).

Source: `channels.json` (**40,608** channels total) cross-referenced with the canonical [`categories.json`](https://iptv-org.github.io/api/categories.json) (**30** defined categories). A channel can carry **multiple** categories, so percentages sum to more than 100%. `%` is share of all 40,608 channels.

| # | Category (id) | Name | Channels | % | What it covers |
|--:|---|---|--:|--:|---|
| 1 | `general` | General | 8,379 | 20.6% | Mixed/broad programming, no single focus |
| 2 | `entertainment` | Entertainment | 4,053 | 10.0% | General entertainment, variety, reality |
| 3 | `sports` | Sports | 2,448 | 6.0% | Live sports, highlights, sports news |
| 4 | `religious` | Religious | 2,365 | 5.8% | Faith-based / spiritual broadcasting |
| 5 | `news` | News | 2,240 | 5.5% | News & current affairs |
| 6 | `music` | Music | 1,883 | 4.6% | Music videos, concerts, radio-on-TV |
| 7 | `movies` | Movies | 1,797 | 4.4% | Feature films |
| 8 | `education` | Education | 1,412 | 3.5% | Educational / instructional |
| 9 | `kids` | Kids | 1,124 | 2.8% | Children's programming |
| 10 | `documentary` | Documentary | 891 | 2.2% | Factual / documentaries |
| 11 | `series` | Series | 850 | 2.1% | TV series / episodic drama |
| 12 | `shop` | Shop | 729 | 1.8% | Teleshopping / home shopping |
| 13 | `legislative` | Legislative | 684 | 1.7% | Parliament / government proceedings |
| 14 | `culture` | Culture | 604 | 1.5% | Arts & culture |
| 15 | `lifestyle` | Lifestyle | 518 | 1.3% | Fashion, home, general lifestyle |
| 16 | `comedy` | Comedy | 414 | 1.0% | Comedy programming |
| 17 | `xxx` | XXX | 352 | 0.9% | Adult content (NSFW) |
| 18 | `animation` | Animation | 333 | 0.8% | Animated (not necessarily kids) |
| 19 | `travel` | Travel | 205 | 0.5% | Travel & destinations |
| 20 | `business` | Business | 201 | 0.5% | Business & finance |
| 21 | `classic` | Classic | 153 | 0.4% | Classic/retro films & TV |
| 22 | `outdoor` | Outdoor | 145 | 0.4% | Hunting, fishing, nature, outdoors |
| 23 | `family` | Family | 120 | 0.3% | Family-oriented |
| 24 | `cooking` | Cooking | 115 | 0.3% | Food & cooking |
| 25 | `science` | Science | 93 | 0.2% | Science & technology |
| 26 | `auto` | Auto | 91 | 0.2% | Cars & motoring |
| 27 | `weather` | Weather | 67 | 0.2% | Weather forecasting |
| 28 | `public` | Public | 60 | 0.1% | Public-access / community |
| 29 | `relax` | Relax | 59 | 0.1% | Ambient / relaxation |
| 30 | `interactive` | Interactive | 4 | 0.0% | Interactive services |

## Key observations

- **30 categories, all in use** — the dataset uses every category defined in the official taxonomy; there are no orphan/undocumented category tags.
- **Uncategorized: 9,670 channels (23.8%)** carry an empty `categories` array — the single largest bucket after `general`. Nearly a quarter of channels won't match *any* category filter.
- **Most channels have 0 or 1 category:**
  - 0 categories: 9,670 channels
  - 1 category: 29,601
  - 2 categories: 1,245
  - 3+ categories: 92 (max observed is 6 categories on a single channel)
- **Heavy skew:** the top 5 categories (`general`, `entertainment`, `sports`, `religious`, `news`) account for the large majority of all category tags; the bottom 10 combined are under 3% of channels.
- **NSFW note:** `xxx` (352 channels) is the category-level adult marker, but channels also have a separate boolean `is_nsfw` flag — the two are related but distinct fields.

## Scope caveat

These counts are at the **channel** level (the iptv-org database), not the **stream/playlist** level in this repo. One channel can have many stream links, and many channels here have no working stream at all — so category distribution among the actual playable streams in `streams/` will differ.

---

_Generated from the iptv-org API. Channel counts reflect the data at the time of analysis and will drift as the upstream database changes._
