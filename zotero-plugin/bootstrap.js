var ZoteroVenueTagger = (() => {
  const PLUGIN_ID = "zotero-venue-tagger@holly1226.github.io";
  const COLUMN_KEY = "venue-rank-badges";
  const PREF_PREFIX = "extensions.zotero-venue-tagger.";
  const PREF_CUSTOM_RULES = `${PREF_PREFIX}customRules`;
  const PREF_SCAN_SOURCE = `${PREF_PREFIX}scanSource`;
  const PREF_DISPLAY_SOURCE = `${PREF_PREFIX}displaySource`;
  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  const MAX_BADGES = 5;
  const NON_FULL_PREFIXES = [
    "EA", "Companion", "Poster", "Workshop", "Demo", "WiP", "LBW",
    "Doctoral-Consortium", "SRC"
  ];

  const FALLBACK_VENUE_TAGS = new Set([
    "ASSETS", "AVI", "BIT", "C&C", "CHB", "CHI", "CSCW",
    "CSCW-Journal", "CSCWD", "CollaborateCom", "CoopIS", "DIS",
    "Design Studies", "Design Issues", "Design Science",
    "Design and Culture", "Digital Creativity", "ECSCW", "GI", "GROUP",
    "HCI", "Human Factors", "ICMI", "ICWSM", "IDC", "IJD", "IJHCI",
    "IJHCS", "INTERACT", "ITS", "IUI", "IWC", "MobiQuitous",
    "MobileHCI", "PACMHCI", "PERCOM", "PMC", "PUC", "She Ji", "TEI",
    "THMS", "TOCHI", "TSMC", "The Design Journal", "UbiComp", "UIC",
    "UIST", "UMUAI", "World Haptics", "Applied Ergonomics"
  ]);

  const RANK_PATTERN = /^(?:浙大|CCF)-[ABC]$/;
  const TRACK_PATTERN = /^(?:(?:EA|Companion)(?:-.+)?|Poster|Workshop|Demo|WiP|LBW|Doctoral-Consortium|SRC)$/i;
  const STRINGS = {
    zh: {
      title: "HCI Venue Tagger",
      columnLabel: "HCI 榜单",
      scanLabel: "识别 HCI 榜单",
      importLabel: "导入榜单 CSV",
      scanSourceLabel: "识别来源：{mode}",
      displaySourceLabel: "列显示：{mode}",
      modeBuiltin: "内置",
      modeBoth: "全部",
      modeCustom: "自定义",
      modeCustomSource: "自定义 · {name}",
      sourcePickerTitle: "选择榜单来源",
      scanSourcePrompt: "扫描时使用哪些规则？",
      displaySourcePrompt: "HCI 榜单列显示哪些来源的标签？",
      importTitle: "导入自定义榜单",
      importPreview: "文件：{name}\n有效规则 {count} 条，来源 {sources} 个。{warnings}\n\n{lines}{more}\n\n导入会替换当前自定义榜单，但不会扫描文献，也不会改动任何 Zotero 标签。继续吗？",
      importWarnings: "\n已跳过 {count} 行无效或重复数据。",
      importDone: "已导入 {count} 条自定义规则。\n\n目前识别来源：{scan}\n目前列显示：{display}\n\n导入本身没有扫描文献或写入标签。",
      importEmpty: "没有找到有效规则。CSV 前两列必须是期刊/会议名和期望标签。{details}",
      importFailed: "导入失败：{message}",
      selectOne: "请先在左侧只选中一个文件夹。",
      noItems: "当前文件夹没有可扫描的文献。",
      noMatch: "未识别到榜单中的 venue。\n\n不会修改任何标签。",
      noChanges: "识别 {matched} 篇，未识别 {unmatched} 篇；相关标签都已存在，无需更新。{review}",
      preview: "文件夹：{name}\n共 {total} 篇：识别 {matched} 篇（非全文轨道 {nonFull} 篇），未识别 {unmatched} 篇，将更新 {changed} 篇。{review}\n\n{lines}{more}\n\n只会新增上述标签，不会删除或替换原标签；未识别文献保持不变。现在写入吗？",
      review: "\n其中 {count} 篇只能识别为 EA/Companion，无法从现有元数据判断 Poster、WiP 等子类型，请写入后复核。",
      more: "\n…另有 {count} 篇",
      done: "已为 {count} 篇文献新增榜单标签。",
      doneWithSkipped: "已为 {count} 篇文献新增榜单标签；另有 {skipped} 篇因文库只读而跳过。",
      failed: "扫描失败：{message}"
    },
    en: {
      title: "HCI Venue Tagger",
      columnLabel: "HCI Lists",
      scanLabel: "Identify HCI Venues",
      importLabel: "Import List CSV",
      scanSourceLabel: "Scan source: {mode}",
      displaySourceLabel: "Column display: {mode}",
      modeBuiltin: "Built-in",
      modeBoth: "All",
      modeCustom: "Custom",
      modeCustomSource: "Custom · {name}",
      sourcePickerTitle: "Choose list sources",
      scanSourcePrompt: "Which rules should scans use?",
      displaySourcePrompt: "Which sources should the HCI Lists column display?",
      importTitle: "Import Custom List",
      importPreview: "File: {name}\n{count} valid rules from {sources} source(s).{warnings}\n\n{lines}{more}\n\nImporting replaces the current custom list, but does not scan items or change any Zotero tags. Continue?",
      importWarnings: "\nSkipped {count} invalid or duplicate row(s).",
      importDone: "Imported {count} custom rules.\n\nCurrent scan source: {scan}\nCurrent column display: {display}\n\nThe import itself did not scan items or write tags.",
      importEmpty: "No valid rules were found. The first two CSV columns must contain a journal/conference name and desired tag.{details}",
      importFailed: "Import failed: {message}",
      selectOne: "Select exactly one collection in the left pane first.",
      noItems: "The current collection has no scannable items.",
      noMatch: "No supported venues were recognized.\n\nNo tags were changed.",
      noChanges: "Recognized {matched} items and left {unmatched} unmatched; all recognized classification tags already exist.{review}",
      preview: "Collection: {name}\n{total} items: {matched} recognized ({nonFull} non-full tracks), {unmatched} unmatched, {changed} to update.{review}\n\n{lines}{more}\n\nOnly the tags shown above will be added. Existing tags will not be removed or replaced, and unmatched items remain unchanged. Apply now?",
      review: "\n{count} item(s) could only be classified as EA/Companion; the available metadata does not identify a Poster, WiP, or other subtype. Review these after applying.",
      more: "\n…and {count} more",
      done: "Added classification tags to {count} items.",
      doneWithSkipped: "Added classification tags to {count} items; skipped {skipped} item(s) because the library is read-only.",
      failed: "Scan failed: {message}"
    }
  };

  let registeredDataKey = null;
  let registeredMenuIDs = [];
  let ruleData = { rules: { venues: [] }, overrides: { overrides: {} } };
  let customRuleData = { schema_version: 1, venues: [] };
  let builtinVenueTags = new Set(FALLBACK_VENUE_TAGS);
  let customTags = new Set();
  let customTagsBySource = new Map();
  let customTagOrder = new Map();
  let scanSourceMode = "both";
  let displaySourceMode = "both";
  let scanning = false;

  function language() {
    return String(globalThis.Zotero?.locale || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
  }

  function text(key, values = {}) {
    let value = STRINGS[language()][key] || STRINGS.en[key] || key;
    for (const [name, replacement] of Object.entries(values)) {
      value = value.replaceAll(`{${name}}`, String(replacement));
    }
    return value;
  }

  function includesBuiltin(mode) {
    return mode === "builtin" || mode === "both";
  }

  function includesCustom(mode) {
    return mode === "custom" || mode === "both" || mode.startsWith("source:");
  }

  function sourceNameFromMode(mode) {
    return mode.startsWith("source:") ? mode.slice("source:".length) : null;
  }

  function sourceModeLabel(mode) {
    const sourceName = sourceNameFromMode(mode);
    if (sourceName) return text("modeCustomSource", { name: sourceName });
    return text(mode === "builtin" ? "modeBuiltin" : mode === "custom" ? "modeCustom" : "modeBoth");
  }

  function tagKind(tag) {
    const builtinAllowed = includesBuiltin(displaySourceMode);
    const selectedCustomTags = sourceNameFromMode(displaySourceMode)
      ? (customTagsBySource.get(sourceNameFromMode(displaySourceMode)) || new Set())
      : customTags;
    const customAllowed = includesCustom(displaySourceMode) && selectedCustomTags.has(tag);
    if (builtinAllowed && builtinVenueTags.has(tag)) return "venue";
    if (/^浙大-[ABC]$/.test(tag) && (builtinAllowed || customAllowed)) return "zju";
    if (/^CCF-[ABC]$/.test(tag) && (builtinAllowed || customAllowed)) return "ccf";
    if (TRACK_PATTERN.test(tag) && (builtinAllowed || includesCustom(displaySourceMode))) return "track";
    if (customAllowed) return "custom";
    return null;
  }

  function rankValue(tag) {
    const grade = tag.slice(-1);
    return { A: 0, B: 1, C: 2 }[grade] ?? 9;
  }

  function compareTags(left, right) {
    const kindOrder = { venue: 0, custom: 0, zju: 1, ccf: 2, track: 3 };
    const leftKind = tagKind(left);
    const rightKind = tagKind(right);
    const kindDifference = kindOrder[leftKind] - kindOrder[rightKind];
    if (kindDifference) return kindDifference;
    if (leftKind === "custom" && rightKind === "custom") {
      const customDifference = (customTagOrder.get(left) ?? 9999) - (customTagOrder.get(right) ?? 9999);
      if (customDifference) return customDifference;
    }
    if (RANK_PATTERN.test(left) && RANK_PATTERN.test(right)) {
      const rankDifference = rankValue(left) - rankValue(right);
      if (rankDifference) return rankDifference;
    }
    return left.localeCompare(right, "zh-CN");
  }

  function selectDisplayTags(tags) {
    const normalized = (tags || [])
      .map(entry => typeof entry === "string" ? entry : entry?.tag)
      .map(tag => String(tag || "").trim())
      .filter(tag => tag && tagKind(tag));
    return [...new Set(normalized)].sort(compareTags);
  }

  function cleanText(value) {
    return String(value ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseDelimitedText(input, delimiter = null) {
    const source = String(input ?? "").replace(/^\uFEFF/, "");
    const firstLine = source.split(/\r?\n/, 1)[0] || "";
    const separator = delimiter || ((firstLine.match(/\t/g) || []).length > (firstLine.match(/,/g) || []).length ? "\t" : ",");
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        }
        else if (char === '"') quoted = false;
        else field += char;
      }
      else if (char === '"') quoted = true;
      else if (char === separator) {
        row.push(field);
        field = "";
      }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && source[index + 1] === "\n") index += 1;
        row.push(field);
        if (row.some(value => cleanText(value))) rows.push(row);
        row = [];
        field = "";
      }
      else field += char;
    }
    row.push(field);
    if (row.some(value => cleanText(value))) rows.push(row);
    return rows;
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function customVenuePattern(value) {
    const escaped = escapeRegExp(cleanText(value));
    if (/^[A-Za-z][A-Za-z0-9&+.-]{1,15}$/.test(value)) return `(?i)\\b${escaped}\\b`;
    return `(?i)${escaped}`;
  }

  function splitList(value) {
    return cleanText(value).split(/[|;；]/).map(cleanText).filter(Boolean);
  }

  function customItemTypes(value) {
    const normalized = cleanText(value).toLowerCase();
    if (!normalized || ["all", "both", "全部", "通用"].includes(normalized)) {
      return ["conferencePaper", "journalArticle"];
    }
    const result = [];
    if (/conference|meeting|会议/.test(normalized)) result.push("conferencePaper");
    if (/journal|期刊/.test(normalized)) result.push("journalArticle");
    return result.length ? result : ["conferencePaper", "journalArticle"];
  }

  function looksLikeHeader(row) {
    const first = cleanText(row[0]).toLowerCase();
    const second = cleanText(row[1]).toLowerCase();
    return /venue|journal|conference|期刊|会议/.test(first) && /tag|label|标签/.test(second);
  }

  function parseCustomVenueList(input) {
    const rows = parseDelimitedText(input);
    const dataRows = rows.slice(looksLikeHeader(rows[0] || []) ? 1 : 0);
    const venues = [];
    const errors = [];
    const seen = new Set();
    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index];
      const venue = cleanText(row[0]);
      const tags = splitList(row[1]);
      if (!venue || !tags.length) {
        errors.push({ row: index + 1, reason: "missing venue or tag" });
        continue;
      }
      const aliases = splitList(row[2]);
      const source = cleanText(row[3]) || (language() === "zh" ? "自定义榜单" : "Custom list");
      const duplicateKey = `${source}\u0000${venue}`.toLowerCase();
      if (seen.has(duplicateKey)) {
        errors.push({ row: index + 1, reason: "duplicate venue" });
        continue;
      }
      seen.add(duplicateKey);
      venues.push({
        id: `custom-${venues.length + 1}`,
        name: venue,
        acronym: tags[0],
        custom_tags: [...new Set(tags)],
        source,
        priority: 200,
        item_types: customItemTypes(row[4]),
        patterns: [...new Set([venue, ...aliases])].map(customVenuePattern)
      });
    }
    return {
      schema_version: 1,
      venues,
      errors,
      sources: [...new Set(venues.map(rule => rule.source))]
    };
  }

  function normalizeDOI(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "")
      .replace(/^doi:\s*/, "")
      .replace(/\.$/, "")
      .trim();
  }

  function itemTypeName(item) {
    if (item.itemType) return item.itemType;
    try {
      return Zotero.ItemTypes.getName(item.itemTypeID);
    }
    catch (error) {
      return "";
    }
  }

  function itemField(item, name) {
    if (typeof item.getField === "function") {
      try {
        return item.getField(name) || "";
      }
      catch (error) {
        return "";
      }
    }
    return item[name] || "";
  }

  function venueText(item) {
    return [
      "publicationTitle", "proceedingsTitle", "conferenceName", "series",
      "seriesTitle", "bookTitle", "pages"
    ].map(name => cleanText(itemField(item, name))).filter(Boolean).join(" | ");
  }

  function compilePattern(source) {
    let pattern = source;
    let flags = "";
    if (pattern.startsWith("(?i)")) {
      pattern = pattern.slice(4);
      flags = "i";
    }
    return new RegExp(pattern, flags);
  }

  function activeRules(mode = scanSourceMode) {
    const venues = [];
    if (includesCustom(mode)) {
      const sourceName = sourceNameFromMode(mode);
      venues.push(...(customRuleData.venues || []).filter(rule => !sourceName || rule.source === sourceName));
    }
    if (includesBuiltin(mode)) venues.push(...(ruleData.rules?.venues || []));
    return { venues };
  }

  function matchesPattern(source, pattern) {
    try {
      return compilePattern(pattern).test(source);
    }
    catch (error) {
      globalThis.Zotero?.debug?.(`[Zotero Venue Tagger] Invalid pattern ${pattern}: ${error}`);
      return false;
    }
  }

  function matchRule(item, rules = activeRules()) {
    const source = venueText(item);
    const itemType = itemTypeName(item);
    const ordered = [...(rules?.venues || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    for (const rule of ordered) {
      if (rule.item_types?.length && !rule.item_types.includes(itemType)) continue;
      if (rule.all_patterns?.length && !rule.all_patterns.every(pattern => matchesPattern(source, pattern))) continue;
      if (rule.patterns?.length && !rule.patterns.some(pattern => matchesPattern(source, pattern))) continue;
      if (rule.all_patterns?.length || rule.patterns?.length) return rule;
    }
    return null;
  }

  function inferTrack(item, overrides = ruleData.overrides) {
    const doi = normalizeDOI(itemField(item, "DOI"));
    const explicit = overrides?.overrides?.[doi];
    if (explicit) return explicit;

    const source = venueText(item);
    const extra = cleanText(itemField(item, "extra"));
    const combined = `${source} | ${extra}`;
    const checks = [
      [/late[- ]breaking work|\bLBW\b/i, "EA-LBW"],
      [/works? in progress|\bWiP\b/i, "Companion-WiP"],
      [/doctoral consortium/i, "Doctoral-Consortium"],
      [/student research competition|\bSRC\b/i, "SRC"],
      [/workshop/i, "Workshop"],
      [/interactive demo|demonstration|\bdemo\b/i, "Demo"],
      [/poster/i, "Poster"]
    ];
    for (const [pattern, baseTag] of checks) {
      if (!pattern.test(combined)) continue;
      if (/extended abstracts?|\bEA\s*['’]?\d{2,4}\b/i.test(source) && !baseTag.startsWith("EA-")) {
        return `EA-${baseTag}`;
      }
      if (/companion/i.test(source) && !baseTag.startsWith("Companion-")) {
        return `Companion-${baseTag}`;
      }
      return baseTag;
    }
    if (/extended abstracts?|\bEA\s*['’]?\d{2,4}\b/i.test(source)) return "EA";
    if (/companion/i.test(source)) return "Companion";
    return null;
  }

  function isNonFull(track) {
    return Boolean(track) && NON_FULL_PREFIXES.some(prefix => track === prefix || track.startsWith(`${prefix}-`));
  }

  function trackNeedsReview(track) {
    return track === "EA" || track === "Companion";
  }

  function classifyItem(item, rules = activeRules(), overrides = ruleData.overrides) {
    const rule = matchRule(item, rules);
    if (!rule) return null;

    const track = inferTrack(item, overrides);
    const proposedTags = Array.isArray(rule.custom_tags) && rule.custom_tags.length
      ? [...rule.custom_tags]
      : [rule.acronym];
    if (track) proposedTags.push(track);

    if (!rule.custom_tags) {
      let zju = rule.zju || null;
      if (!zju && rule.ccf) zju = rule.ccf;
      if (!isNonFull(track)) {
        if (zju) proposedTags.push(`浙大-${zju}`);
        if (rule.ccf) proposedTags.push(`CCF-${rule.ccf}`);
      }
    }

    const currentTags = typeof item.getTags === "function" ? item.getTags() : (item.tags || []);
    const currentSet = new Set(currentTags.map(entry => cleanText(typeof entry === "string" ? entry : entry.tag).toLowerCase()));
    const addTags = proposedTags.filter(tag => !currentSet.has(tag.toLowerCase()));
    return {
      item,
      key: item.key || "",
      title: cleanText(itemField(item, "title")),
      venue: rule.acronym || proposedTags[0],
      track,
      nonFull: isNonFull(track),
      trackNeedsReview: trackNeedsReview(track),
      proposedTags,
      addTags
    };
  }

  function itemDisplayValue(item) {
    try {
      return JSON.stringify(selectDisplayTags(item.getTags()));
    }
    catch (error) {
      Zotero.debug(`[Zotero Venue Tagger] Could not read tags: ${error}`);
      return "";
    }
  }

  function parseDisplayValue(value) {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    }
    catch (error) {
      return [];
    }
  }

  function badgeStyle(kind) {
    const palette = {
      venue: ["#dbeafe", "#1d4ed8", "#93c5fd"],
      zju: ["#fee2e2", "#b91c1c", "#fca5a5"],
      ccf: ["#dcfce7", "#15803d", "#86efac"],
      track: ["#f3e8ff", "#7e22ce", "#d8b4fe"],
      custom: ["#ffedd5", "#c2410c", "#fdba74"]
    };
    const [background, color, border] = palette[kind] || palette.venue;
    return [
      "display:inline-flex", "align-items:center", "height:18px", "padding:0 5px",
      "border-radius:4px", `border:1px solid ${border}`, `background:${background}`,
      `color:${color}`, "font-size:11px", "font-weight:600", "line-height:18px",
      "white-space:nowrap", "box-sizing:border-box"
    ].join(";");
  }

  function renderCell(index, value, column, isFirstColumn, doc) {
    const container = doc.createElementNS(XHTML_NS, "span");
    container.className = `cell ${column.className || ""}`;
    container.style.cssText = "display:flex;align-items:center;gap:3px;overflow:hidden;padding-inline:4px";
    const tags = parseDisplayValue(value);
    container.title = tags.join(" · ");

    for (const tag of tags.slice(0, MAX_BADGES)) {
      const badge = doc.createElementNS(XHTML_NS, "span");
      badge.textContent = tag;
      badge.title = tag;
      badge.style.cssText = badgeStyle(tagKind(tag));
      container.appendChild(badge);
    }
    if (tags.length > MAX_BADGES) {
      const overflow = doc.createElementNS(XHTML_NS, "span");
      overflow.textContent = `+${tags.length - MAX_BADGES}`;
      overflow.title = tags.slice(MAX_BADGES).join(" · ");
      overflow.style.cssText = "color:#6b7280;font-size:11px;white-space:nowrap";
      container.appendChild(overflow);
    }
    return container;
  }

  function promptAlert(message, win = null) {
    Services.prompt.alert(win, text("title"), message);
  }

  function getPreference(name, fallback) {
    try {
      const value = globalThis.Zotero?.Prefs?.get?.(name, true);
      return value === undefined ? fallback : value;
    }
    catch (error) {
      globalThis.Zotero?.debug?.(`[Zotero Venue Tagger] Could not read ${name}: ${error}`);
      return fallback;
    }
  }

  function setPreference(name, value) {
    globalThis.Zotero?.Prefs?.set?.(name, value, true);
  }

  function validSourceMode(value) {
    if (["both", "builtin", "custom"].includes(value)) return value;
    return typeof value === "string" && value.startsWith("source:") ? value : "both";
  }

  function loadPreferences() {
    scanSourceMode = validSourceMode(getPreference(PREF_SCAN_SOURCE, "both"));
    displaySourceMode = validSourceMode(getPreference(PREF_DISPLAY_SOURCE, "both"));
    try {
      const stored = JSON.parse(getPreference(PREF_CUSTOM_RULES, '{"schema_version":1,"venues":[]}'));
      customRuleData = Array.isArray(stored?.venues) ? stored : { schema_version: 1, venues: [] };
    }
    catch (error) {
      customRuleData = { schema_version: 1, venues: [] };
      globalThis.Zotero?.debug?.(`[Zotero Venue Tagger] Ignoring invalid custom rules: ${error}`);
    }
    refreshVenueTags();
  }

  async function refreshItemsView() {
    try {
      const pane = Zotero.getActiveZoteroPane?.();
      if (pane?.itemsView?.refresh) await pane.itemsView.refresh();
    }
    catch (error) {
      Zotero.debug?.(`[Zotero Venue Tagger] Could not refresh item view: ${error}`);
    }
  }

  async function chooseSourceMode(kind) {
    const win = Zotero.getMainWindow?.() || null;
    const current = kind === "scan" ? scanSourceMode : displaySourceMode;
    const sourceModes = [...new Set((customRuleData.venues || []).map(rule => rule.source))]
      .map(source => `source:${source}`);
    const modes = ["both", "builtin", "custom", ...sourceModes];
    const labels = modes.map(mode => sourceModeLabel(mode));
    const selected = { value: Math.max(0, modes.indexOf(current)) };
    const accepted = Services.prompt.select(
      win,
      text("sourcePickerTitle"),
      text(kind === "scan" ? "scanSourcePrompt" : "displaySourcePrompt"),
      labels,
      selected
    );
    if (!accepted) return;
    const mode = modes[selected.value] || "both";
    if (kind === "scan") {
      scanSourceMode = mode;
      setPreference(PREF_SCAN_SOURCE, mode);
    }
    else {
      displaySourceMode = mode;
      setPreference(PREF_DISPLAY_SOURCE, mode);
      await refreshItemsView();
    }
  }

  function importPreviewMessage(fileName, parsed) {
    const lines = parsed.venues.slice(0, 12).map(rule =>
      `• ${rule.name} → ${rule.custom_tags.join(" · ")}  [${rule.source}]`
    ).join("\n");
    return text("importPreview", {
      name: fileName,
      count: parsed.venues.length,
      sources: parsed.sources.length,
      warnings: parsed.errors.length ? text("importWarnings", { count: parsed.errors.length }) : "",
      lines,
      more: parsed.venues.length > 12 ? text("more", { count: parsed.venues.length - 12 }) : ""
    });
  }

  async function importCustomList() {
    const win = Zotero.getMainWindow?.() || null;
    try {
      const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      const picker = new FilePicker();
      picker.init(win, text("importTitle"), picker.modeOpen);
      picker.appendFilter("CSV / TSV", "*.csv; *.tsv; *.txt");
      picker.appendFilters(picker.filterAll);
      if ((await picker.show()) !== picker.returnOK) return;

      const contents = await Zotero.File.getContentsAsync(picker.file);
      const parsed = parseCustomVenueList(contents);
      if (!parsed.venues.length) {
        const details = parsed.errors.length ? `\n${parsed.errors.length} row(s) skipped.` : "";
        promptAlert(text("importEmpty", { details }), win);
        return;
      }
      const fileName = String(picker.file).split(/[\\/]/).pop();
      if (!Services.prompt.confirm(win, text("title"), importPreviewMessage(fileName, parsed))) return;

      customRuleData = { schema_version: 1, venues: parsed.venues };
      for (const kind of ["scan", "display"]) {
        const mode = kind === "scan" ? scanSourceMode : displaySourceMode;
        const selectedSource = sourceNameFromMode(mode);
        if (selectedSource && !parsed.sources.includes(selectedSource)) {
          if (kind === "scan") scanSourceMode = "custom";
          else displaySourceMode = "custom";
        }
      }
      setPreference(PREF_CUSTOM_RULES, JSON.stringify(customRuleData));
      setPreference(PREF_SCAN_SOURCE, scanSourceMode);
      setPreference(PREF_DISPLAY_SOURCE, displaySourceMode);
      refreshVenueTags();
      await refreshItemsView();
      promptAlert(text("importDone", {
        count: parsed.venues.length,
        scan: sourceModeLabel(scanSourceMode),
        display: sourceModeLabel(displaySourceMode)
      }), win);
    }
    catch (error) {
      Zotero.logError?.(error);
      promptAlert(text("importFailed", { message: error.message || error }), win);
    }
  }

  function selectedCollection(pane) {
    if (typeof pane.getSelectedCollections === "function") {
      const selected = pane.getSelectedCollections();
      return selected.length === 1 ? selected[0] : null;
    }
    return pane.getSelectedCollection?.() || null;
  }

  function collectionFromMenuContext(context) {
    const rows = context?.collectionTreeRows;
    if (!Array.isArray(rows) || rows.length !== 1) return null;
    const collection = rows[0]?.ref;
    return collection && typeof collection.getChildItems === "function" ? collection : null;
  }

  function previewMessage(collection, rows, total) {
    const changed = rows.filter(row => row.addTags.length);
    const nonFull = rows.filter(row => row.nonFull).length;
    const needsReview = rows.filter(row => row.trackNeedsReview).length;
    const visible = changed.slice(0, 12).map(row => {
      const title = row.title.length > 42 ? `${row.title.slice(0, 41).trim()}…` : row.title;
      return `• ${title}\n  ${row.addTags.join(" · ")}`;
    }).join("\n");
    const more = changed.length > 12 ? text("more", { count: changed.length - 12 }) : "";
    return text("preview", {
      name: collection.name,
      total,
      matched: rows.length,
      unmatched: total - rows.length,
      nonFull,
      changed: changed.length,
      review: needsReview ? text("review", { count: needsReview }) : "",
      lines: visible,
      more
    });
  }

  function undoSaveOptions() {
    const major = Number.parseInt(String(globalThis.Zotero?.version || "0").split(".")[0], 10);
    if (major < 10) return null;
    return {
      undoAction: "undo-action-edit-metadata",
      undoActionArgs: { count: 1 }
    };
  }

  async function scanCurrentCollection(preferredCollection = null) {
    if (scanning) return;
    scanning = true;
    const win = Zotero.getMainWindow?.() || null;
    try {
      const pane = Zotero.getActiveZoteroPane();
      const collection = preferredCollection || (pane && selectedCollection(pane));
      if (!collection) {
        promptAlert(text("selectOne"), win);
        return;
      }

      const items = (collection.getChildItems() || []).filter(item => {
        if (typeof item.isRegularItem === "function") return item.isRegularItem();
        return !["attachment", "note", "annotation"].includes(itemTypeName(item));
      });
      if (!items.length) {
        promptAlert(text("noItems"), win);
        return;
      }

      const rows = items.map(item => classifyItem(item)).filter(Boolean);
      if (!rows.length) {
        promptAlert(text("noMatch"), win);
        return;
      }
      const changed = rows.filter(row => row.addTags.length);
      if (!changed.length) {
        const needsReview = rows.filter(row => row.trackNeedsReview).length;
        promptAlert(text("noChanges", {
          matched: rows.length,
          unmatched: items.length - rows.length,
          review: needsReview ? text("review", { count: needsReview }) : ""
        }), win);
        return;
      }

      const approved = Services.prompt.confirm(win, text("title"), previewMessage(collection, rows, items.length));
      if (!approved) return;

      let applied = 0;
      let skipped = 0;
      for (const row of changed) {
        const library = Zotero.Libraries.get(row.item.libraryID);
        if (library && library.editable === false) {
          skipped += 1;
          continue;
        }
        for (const tag of row.addTags) row.item.addTag(tag);
        const options = undoSaveOptions();
        if (options) await row.item.saveTx(options);
        else await row.item.saveTx();
        applied += 1;
      }
      if (pane.itemsView?.refresh) await pane.itemsView.refresh();
      const doneKey = skipped ? "doneWithSkipped" : "done";
      promptAlert(text(doneKey, { count: applied, skipped }), win);
    }
    catch (error) {
      Zotero.logError(error);
      promptAlert(text("failed", { message: error.message || error }), win);
    }
    finally {
      scanning = false;
    }
  }

  function loadRuleData(rootURI) {
    if (!rootURI || typeof Services === "undefined") return;
    const scope = {};
    Services.scriptloader.loadSubScript(`${rootURI}rules.js`, scope);
    if (!scope.ZoteroVenueTaggerRuleData) throw new Error("Bundled venue rules are missing");
    ruleData = scope.ZoteroVenueTaggerRuleData;
    refreshVenueTags();
  }

  function refreshVenueTags() {
    const configured = (ruleData.rules?.venues || [])
      .map(rule => cleanText(rule.acronym))
      .filter(Boolean);
    builtinVenueTags = configured.length ? new Set(configured) : new Set(FALLBACK_VENUE_TAGS);
    const configuredCustomTags = (customRuleData.venues || []).flatMap(rule => rule.custom_tags || []).map(cleanText).filter(Boolean);
    customTags = new Set(configuredCustomTags);
    customTagsBySource = new Map();
    for (const rule of customRuleData.venues || []) {
      if (!customTagsBySource.has(rule.source)) customTagsBySource.set(rule.source, new Set());
      for (const tag of rule.custom_tags || []) customTagsBySource.get(rule.source).add(cleanText(tag));
    }
    customTagOrder = new Map([...customTags].map((tag, index) => [tag, index]));
  }

  function loadLocalization(win) {
    win?.MozXULElement?.insertFTLIfNeeded("zotero-venue-tagger.ftl");
  }

  function registerMenus(id, rootURI) {
    if (!Zotero.MenuManager?.registerMenu) return;
    const icon = rootURI ? `${rootURI}icons/menu-icon.svg` : null;
    const scanMenuItem = {
      menuType: "menuitem",
      ...(icon ? { icon } : {}),
      onShowing: (_event, context) => {
        context.menuElem?.setAttribute("label", text("scanLabel"));
        // Zotero's MenuManager exposes the icon through list-style-image, but
        // native macOS menus only paint the XUL image child when the explicit
        // image attribute is present. Keep the official API property above
        // and mirror it here for the native-menu compatibility path.
        if (icon) context.menuElem?.setAttribute("image", icon);
      },
      onCommand: (_event, context) => scanCurrentCollection(collectionFromMenuContext(context))
    };
    const toolsMenu = Zotero.MenuManager.registerMenu({
      menuID: `${PLUGIN_ID}-main-menubar-tools`,
      pluginID: id || PLUGIN_ID,
      target: "main/menubar/tools",
      menus: [scanMenuItem, {
        menuType: "separator"
      }, {
        menuType: "menuitem",
        onShowing: (_event, context) => {
          context.menuElem?.setAttribute("label", text("importLabel"));
        },
        onCommand: () => importCustomList()
      }, {
        menuType: "menuitem",
        onShowing: (_event, context) => {
          context.menuElem?.setAttribute("label", text("scanSourceLabel", { mode: sourceModeLabel(scanSourceMode) }));
        },
        onCommand: () => chooseSourceMode("scan")
      }, {
        menuType: "menuitem",
        onShowing: (_event, context) => {
          context.menuElem?.setAttribute("label", text("displaySourceLabel", { mode: sourceModeLabel(displaySourceMode) }));
        },
        onCommand: () => chooseSourceMode("display")
      }]
    });
    const collectionMenu = Zotero.MenuManager.registerMenu({
      menuID: `${PLUGIN_ID}-main-library-collection`,
      pluginID: id || PLUGIN_ID,
      target: "main/library/collection",
      menus: [{ ...scanMenuItem }]
    });
    registeredMenuIDs = [toolsMenu, collectionMenu];
  }

  async function startup({ id, rootURI } = {}) {
    await Zotero.initializationPromise;
    loadRuleData(rootURI);
    loadPreferences();
    for (const win of Zotero.getMainWindows?.() || []) loadLocalization(win);
    registeredDataKey = await Zotero.ItemTreeManager.registerColumn({
      dataKey: COLUMN_KEY,
      label: text("columnLabel"),
      pluginID: id || PLUGIN_ID,
      showInColumnPicker: true,
      defaultVisible: true,
      width: "230",
      zoteroPersist: ["width", "hidden", "sortDirection", "ordinal"],
      dataProvider: itemDisplayValue,
      renderCell
    });
    registerMenus(id, rootURI);
    Zotero.debug("[Zotero Venue Tagger] Badge column and scan menus registered");
  }

  async function shutdown(reason) {
    if (typeof APP_SHUTDOWN !== "undefined" && reason === APP_SHUTDOWN) return;
    for (const menuID of registeredMenuIDs) Zotero.MenuManager?.unregisterMenu?.(menuID);
    registeredMenuIDs = [];
    if (registeredDataKey) {
      await Zotero.ItemTreeManager.unregisterColumn(registeredDataKey);
      registeredDataKey = null;
    }
  }

  function onMainWindowLoad(win) {
    loadLocalization(win);
  }

  function setRuleDataForTests(data) {
    ruleData = data;
    refreshVenueTags();
  }

  function setCustomRulesForTests(data, modes = {}) {
    customRuleData = data;
    scanSourceMode = validSourceMode(modes.scan || "both");
    displaySourceMode = validSourceMode(modes.display || "both");
    refreshVenueTags();
  }

  return {
    startup,
    shutdown,
    onMainWindowLoad,
    scanCurrentCollection,
    importCustomList,
    selectDisplayTags,
    parseDisplayValue,
    parseDelimitedText,
    parseCustomVenueList,
    tagKind,
    classifyItem,
    inferTrack,
    matchRule,
    previewMessage,
    importPreviewMessage,
    setRuleDataForTests,
    setCustomRulesForTests
  };
})();

function install() {}

async function startup(data, reason) {
  await ZoteroVenueTagger.startup(data, reason);
}

async function shutdown(data, reason) {
  await ZoteroVenueTagger.shutdown(reason);
}

function uninstall() {}

function onMainWindowLoad({ window }) {
  ZoteroVenueTagger.onMainWindowLoad(window);
}

function onMainWindowUnload() {}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ZoteroVenueTagger;
}
