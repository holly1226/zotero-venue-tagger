# Zotero Venue Tagger

A Zotero plugin, Codex skill, and dependency-free Python CLI for compact venue classification.

Examples:

- `CHI`, `浙大-A`, `CCF-A`
- `DIS`, `浙大-B`, `CCF-C`
- `CHI`, `EA-Poster`
- `DIS`, `Companion-WiP`

The default rules use the Zhejiang University Design 2021 list and the 2022 CCF HCI and Ubiquitous Computing category. Direct Zhejiang grades take precedence; CCF supplies a Zhejiang fallback only when the venue is absent from the Zhejiang list. Rank tags are withheld from non-full tracks by default.

## Requirements

- Zotero Desktop 10 or later
- Python 3.9 or later
- Zotero setting enabled: **Settings → Advanced → Allow other applications on this computer to communicate with Zotero**

No Python packages or cloud API keys are required.

## Zotero badge column

The included Zotero plugin adds a dedicated **榜单** column to the item list. It renders only the existing classification tags as compact badges, for example `CHI`, `浙大-A`, and `CCF-A`. It does not depend on AI4Paper and does not change item fields or attachments.

Build the installable XPI:

```bash
sh scripts/build_plugin.sh
```

Then open **Zotero → Tools → Add-ons**, choose **Install Add-on From File…**, and select the generated file in `dist/`. If the column is hidden, right-click the item-list header and enable **榜单**.

## Install as a Codex skill

Clone this repository into your Codex skills folder:

```bash
git clone https://github.com/holly1226/zotero-venue-tagger.git ~/.codex/skills/zotero-venue-tagger
```

Restart or reload Codex, then invoke `$zotero-venue-tagger`.

## Command-line use

Preview only:

```bash
python3 scripts/zotero_venue_tagger.py status
python3 scripts/zotero_venue_tagger.py preview --limit 20
```

Create a reviewable plan for selected items:

```bash
python3 scripts/zotero_venue_tagger.py preview \
  --item-key ABCD1234 \
  --item-key EFGH5678 \
  --plan-out tag-plan.json
```

After reviewing the plan, apply it:

```bash
python3 scripts/zotero_venue_tagger.py apply --plan tag-plan.json
```

Zotero will show a local authorization dialog. The script never edits `zotero.sqlite`, never removes existing tags, and stops if an item changed after the preview was created.

## Customize

- Edit `references/venue_rules.json` to add or update venues.
- Edit `references/track_overrides.json` when a DOI's EA or Companion subtype is known.
- Add `--rank-non-full` only if your institution explicitly treats non-full tracks as the venue's ranked publication type.

## Test

```bash
python3 -m unittest discover -s tests -v
node zotero-plugin/test.js
python3 /path/to/skill-creator/scripts/quick_validate.py .
```

## Data note

Institutional classifications change. The repository records the rule-set dates and keeps Zhejiang and CCF grades as separate tags so conflicts remain visible.

## License

MIT
