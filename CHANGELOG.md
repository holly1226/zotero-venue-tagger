# Changelog

All notable changes to Zotero Venue Tagger are documented here.

## 0.3.4 — 2026-10-17

- Remove the trailing ellipsis from the scan command for a cleaner, non-truncated appearance.

## 0.3.3 — 2026-10-17

- Mirror the MenuManager icon onto the native XUL `image` attribute so the project logo is rendered in macOS menus.

## 0.3.2 — 2026-10-17

- Shorten the scan action to “Identify HCI Venues…” / “识别 HCI 榜单…” so it fits compact menus.
- Add a tightly framed, high-contrast SVG menu icon derived from the full project logo.

## 0.3.1 — 2026-10-17

- Add a distinctive multi-list logo to the plugin manifest and Zotero scan menus.
- Rename the scan action to “Identify HCI Venues in Current Collection…” / “识别当前文件夹的 HCI 榜单…”.
- Rename the item-list column to “HCI Lists” / “HCI 榜单”.
- Refresh the GitHub project presentation while keeping all classification rules unchanged.

## 0.3.0 — 2026-10-16

- Report recognized, unmatched, non-full-track, and changed-item counts before writing.
- Flag generic EA and Companion matches that need subtype review.
- Use the exact collection from Zotero's collection context menu when available.
- Add Zotero 10 undo metadata for tag writes and report read-only items that were skipped.
- Build the badge vocabulary from the bundled rule file so custom venues display correctly.
- Validate rule IDs, grades, regular expressions, DOI overrides, and XPI builds in CI.
- Declare the supported one-click-plugin range as Zotero 8 through Zotero 10.0.x.

## 0.2.0 — 2026-10-12

- Add one-click scanning from the Tools menu and collection context menu.
- Preview proposed tags before writing and preserve existing tags.

## 0.1.0 — 2026-10-12

- Add the compact Zotero badge column, versioned venue rules, Codex skill, and Python CLI.
