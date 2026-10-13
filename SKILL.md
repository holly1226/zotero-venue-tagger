---
name: zotero-venue-tagger
description: Preview and safely add compact venue, Zhejiang University design-list, CCF, and non-full-paper track tags to Zotero items. Use when a user wants to classify Zotero literature by venues such as CHI, UIST, DIS, IDC, CSCW, or HCI journals. Do not use for citation insertion or general bibliography cleanup.
---

# Zotero Venue Tagger

Use the bundled script to classify Zotero items without directly editing the Zotero database.

## Workflow

1. Ensure Zotero Desktop is running and its local API is enabled.
2. Always preview first. The default policy adds venue and track tags to EA, poster, companion, workshop, demo, and WiP records, but withholds rank tags from non-full-paper tracks.
3. Show the user the proposed additions and any ambiguity notes.
4. Only run `apply` after the user explicitly asks to write the reviewed plan. Zotero must display its own write-authorization dialog.
5. Never remove or replace existing tags. Stop if an item's version changed after the plan was created.

## Commands

From this skill directory:

```bash
python3 scripts/zotero_venue_tagger.py status
python3 scripts/zotero_venue_tagger.py preview --limit 20
python3 scripts/zotero_venue_tagger.py preview --item-key ABCD1234 --plan-out tag-plan.json
python3 scripts/zotero_venue_tagger.py apply --plan tag-plan.json --yes
```

Use repeated `--item-key` options for a controlled sample. Use `--rank-non-full` only when the user explicitly wants venue grades attached to non-full tracks.

The default rules are in [references/venue_rules.json](references/venue_rules.json). DOI-level track corrections are in [references/track_overrides.json](references/track_overrides.json). Read [references/policy.md](references/policy.md) when explaining conflicts or changing the ranking policy.

## Output

Keep previews compact: item key, year, shortened title, proposed tags, and one warning when needed. Distinguish the Zotero item key from a BibTeX citation key if both appear.
