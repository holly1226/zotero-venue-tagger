# Changelog

All notable changes to Zotero Venue Tagger are documented here.

## 0.5.2 — 2026-10-17

- Fix the list picker opening as an empty window in packaged XPI installs by using a runtime-registered `chrome://` content URL.

## 0.5.1 — 2026-10-17

- Use Zotero's native XUL dialog controls for the list picker so it renders correctly in Zotero 10.

## 0.5.0 — 2026-10-17

- Replace the ambiguous source controls with a multi-select list picker shown before every scan.
- Let users import a custom CSV list or download a ready-to-edit example from the same picker.
- Validate required headers, missing fields, duplicate venues, and invalid item types before importing anything.
- Keep each imported file as a named custom list that can be selected independently.
- Add four consistently branded commands to both the Tools menu and collection context menu.
- Export the current collection's recognition results as an Excel-friendly UTF-8 CSV.
- Keep scan and column-display source choices independent.

## 0.4.1 — 2026-10-17

- Fix the list-source chooser for Zotero 10's current prompt API.

## 0.4.0 — 2026-10-17

- Import custom venue rules from CSV or TSV with a review step before saving.
- Keep the minimal two-column format (`venue`, `tag`) while supporting optional aliases, named sources, and item types.
- Let users independently choose the rule source used for scanning and the sources shown in the HCI Lists column.
- Preserve the existing ZJU/CCF rules and continue requiring a second confirmation before any item tags are written.

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
