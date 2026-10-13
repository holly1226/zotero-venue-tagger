# Classification policy

## Tag shape

- Main conference or journal item: `VENUE`, `浙大-X`, `CCF-X` when available.
- Non-full track: `VENUE`, a compact track tag such as `EA-Poster`, `EA-LBW`, `Companion-WiP`, or `Workshop`.
- Existing Zotero tags are preserved.

## Ranking precedence

1. A grade explicitly listed in the Zhejiang University Design 2021 list is used for the `浙大-X` tag.
2. If the venue is absent from that list but appears in the CCF HCI and Ubiquitous Computing list, its CCF grade is used as the Zhejiang fallback.
3. The CCF grade is always shown separately when available.

This means a main-track DIS or IDC item receives `浙大-B` and `CCF-C`.

## Non-full tracks

EA, posters, demos, workshops, doctoral consortium papers, late-breaking work, works in progress, and companion-only records do not receive rank tags by default. Venue lists usually name the venue but do not guarantee that every companion track receives the same institutional recognition as a full paper.

Use `--rank-non-full` only when the user explicitly chooses venue-level ranking regardless of track.

## Sources and dates

- Zhejiang University Design high-impact journal and conference list: 2021 edition, with January 2022 note revision.
- CCF recommended international journals and conferences: 2022 HCI and Ubiquitous Computing category.

These rules are intentionally versioned. Update the data files when a newer institutional list is adopted.
