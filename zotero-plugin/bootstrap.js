var ZoteroVenueTagger = (() => {
  const PLUGIN_ID = "zotero-venue-tagger@holly1226.github.io";
  const CHROME_PACKAGE = "zotero-venue-tagger";
  const COLUMN_KEY = "venue-rank-badges";
  const PREF_PREFIX = "extensions.zotero-venue-tagger.";
  const PREF_CUSTOM_RULES = `${PREF_PREFIX}customRules`;
  const PREF_SCAN_SOURCE = `${PREF_PREFIX}scanSource`;
  const PREF_DISPLAY_SOURCE = `${PREF_PREFIX}displaySource`;
  const PREF_SCAN_SOURCES = `${PREF_PREFIX}scanSources`;
  const PREF_DISPLAY_SOURCES = `${PREF_PREFIX}displaySources`;
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
      scanLabel: "识别当前文件夹…",
      exportLabel: "导出识别结果…",
      importLabel: "导入自定义榜单…",
      displaySourceLabel: "设置榜单列显示…",
      modeBuiltin: "内置",
      modeBoth: "全部",
      modeCustom: "自定义",
      modeCustomSource: "自定义 · {name}",
      sourcePickerTitle: "选择用于识别的榜单",
      displayPickerTitle: "设置 HCI 榜单列显示",
      scanSourcePrompt: "可以单选或多选；预览后才会写入标签。",
      displaySourcePrompt: "选择 HCI 榜单列中要显示的标签来源（不删除 Zotero 标签）。",
      builtinZju: "浙大设计学榜单（2021）",
      builtinCcf: "CCF HCI 与普适计算榜单（2022）",
      customSource: "自定义·{name}（{count} 条）",
      importInPicker: "＋ 导入 CSV 榜单",
      downloadTemplate: "下载 CSV 范例",
      previewScan: "预览识别",
      saveDisplay: "保存显示设置",
      chooseAtLeastOne: "请至少选择一个榜单。",
      importTitle: "导入自定义榜单",
      importPreview: "榜单：{name}\n通过格式校验，共 {count} 条。\n\n{lines}{more}\n\n导入只会保存识别规则，不会扫描文献或改动 Zotero 标签。继续吗？",
      importDone: "已导入“{name}”，共 {count} 条。\n\n导入本身没有扫描文献或写入标签。",
      importEmpty: "没有找到可导入的数据行。请下载范例并按指定格式填写。",
      importInvalid: "CSV 格式校验未通过，未导入任何内容：\n\n{details}\n\n请修改后重新导入，或在榜单选择窗口下载 CSV 范例。",
      listNamePrompt: "请确认这份自定义榜单的名称：",
      replaceSource: "已存在名为“{name}”的榜单。\n\n要用新文件替换这份榜单吗？",
      templateSaved: "CSV 范例已保存。",
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
      exportDone: "已导出 {count} 篇文献的识别结果。",
      exportFailed: "导出失败：{message}",
      failed: "扫描失败：{message}"
    },
    en: {
      title: "HCI Venue Tagger",
      columnLabel: "HCI Lists",
      scanLabel: "Identify Current Collection…",
      exportLabel: "Export Recognition Results…",
      importLabel: "Import Custom List…",
      displaySourceLabel: "Configure HCI Lists Column…",
      modeBuiltin: "Built-in",
      modeBoth: "All",
      modeCustom: "Custom",
      modeCustomSource: "Custom · {name}",
      sourcePickerTitle: "Choose Lists for Recognition",
      displayPickerTitle: "Configure HCI Lists Column",
      scanSourcePrompt: "Select one or more lists. Tags are written only after a separate preview.",
      displaySourcePrompt: "Choose which sources appear in the HCI Lists column. Zotero tags are not deleted.",
      builtinZju: "ZJU Design List (2021)",
      builtinCcf: "CCF HCI & Ubiquitous Computing (2022)",
      customSource: "Custom · {name} ({count} rules)",
      importInPicker: "+ Import CSV List",
      downloadTemplate: "Download CSV Example",
      previewScan: "Preview Recognition",
      saveDisplay: "Save Display Settings",
      chooseAtLeastOne: "Select at least one list.",
      importTitle: "Import Custom List",
      importPreview: "List: {name}\nFormat validation passed with {count} rules.\n\n{lines}{more}\n\nImporting saves recognition rules only; it does not scan items or change Zotero tags. Continue?",
      importDone: "Imported \"{name}\" with {count} rules.\n\nThe import itself did not scan items or write tags.",
      importEmpty: "No data rows were found. Download the example and follow its format.",
      importInvalid: "CSV validation failed. Nothing was imported:\n\n{details}\n\nCorrect the file and import it again, or download the CSV example from the list picker.",
      listNamePrompt: "Confirm a name for this custom list:",
      replaceSource: "A list named \"{name}\" already exists.\n\nReplace that list with the new file?",
      templateSaved: "The CSV example was saved.",
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
      exportDone: "Exported recognition results for {count} items.",
      exportFailed: "Export failed: {message}",
      failed: "Scan failed: {message}"
    }
  };

  let registeredDataKey = null;
  let registeredMenuIDs = [];
  let chromeHandle = null;
  let ruleData = { rules: { venues: [] }, overrides: { overrides: {} } };
  let customRuleData = { schema_version: 1, venues: [] };
  let builtinVenueTags = new Set(FALLBACK_VENUE_TAGS);
  let customTags = new Set();
  let customTagsBySource = new Map();
  let customTagOrder = new Map();
  let scanSourceMode = "both";
  let displaySourceMode = "both";
  let scanSourceIDs = ["builtin:zju", "builtin:ccf"];
  let displaySourceIDs = ["builtin:zju", "builtin:ccf"];
  let pluginRootURI = null;
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

  function customSourceID(name) {
    return `custom:${name}`;
  }

  function customSourceName(id) {
    return String(id || "").startsWith("custom:") ? String(id).slice(7) : null;
  }

  function availableSources() {
    const sources = [
      { id: "builtin:zju", label: text("builtinZju"), kind: "builtin" },
      { id: "builtin:ccf", label: text("builtinCcf"), kind: "builtin" }
    ];
    const counts = new Map();
    for (const rule of customRuleData.venues || []) {
      const name = cleanText(rule.source);
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    for (const [name, count] of counts) {
      sources.push({
        id: customSourceID(name),
        label: text("customSource", { name, count }),
        kind: "custom",
        count
      });
    }
    return sources;
  }

  function allSourceIDs() {
    return availableSources().map(source => source.id);
  }

  function normalizeSourceIDs(value, fallback = ["builtin:zju", "builtin:ccf"]) {
    const allowed = new Set(allSourceIDs());
    const candidates = Array.isArray(value) ? value : [];
    const result = [...new Set(candidates.map(String).filter(id => allowed.has(id)))];
    return result.length ? result : fallback.filter(id => allowed.has(id));
  }

  function sourceIDsFromLegacyMode(mode) {
    if (mode === "builtin") return ["builtin:zju", "builtin:ccf"];
    if (mode === "custom") return allSourceIDs().filter(id => id.startsWith("custom:"));
    const name = sourceNameFromMode(mode || "");
    if (name) return [customSourceID(name)];
    return allSourceIDs();
  }

  function tagKind(tag) {
    const zjuAllowed = displaySourceIDs.includes("builtin:zju");
    const ccfAllowed = displaySourceIDs.includes("builtin:ccf");
    const selectedCustomTags = new Set();
    for (const id of displaySourceIDs) {
      const name = customSourceName(id);
      if (!name) continue;
      for (const value of customTagsBySource.get(name) || []) selectedCustomTags.add(value);
    }
    const customAllowed = selectedCustomTags.has(tag);
    if ((zjuAllowed || ccfAllowed) && builtinVenueTags.has(tag)) return "venue";
    if (/^浙大-[ABC]$/.test(tag) && (zjuAllowed || customAllowed)) return "zju";
    if (/^CCF-[ABC]$/.test(tag) && (ccfAllowed || customAllowed)) return "ccf";
    if (TRACK_PATTERN.test(tag) && displaySourceIDs.length) return "track";
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
    return result.length ? result : null;
  }

  function normalizedHeader(value) {
    return cleanText(value).toLowerCase().replace(/[\s_\-/]/g, "");
  }

  function headerIndexes(row) {
    const aliases = {
      venue: new Set(["venue", "journal", "conference", "journalorconference", "期刊或会议名称", "期刊会议名称", "期刊", "会议"]),
      tags: new Set(["tag", "tags", "label", "labels", "标签"]),
      aliases: new Set(["alias", "aliases", "alternativenames", "别名"]),
      type: new Set(["type", "itemtype", "文献类型", "类型"]),
      source: new Set(["source", "listname", "榜单名称", "来源"])
    };
    const result = {};
    row.forEach((value, index) => {
      const normalized = normalizedHeader(value);
      for (const [key, values] of Object.entries(aliases)) {
        if (values.has(normalized) && result[key] === undefined) result[key] = index;
      }
    });
    return result;
  }

  function parseCustomVenueList(input, options = {}) {
    const rows = parseDelimitedText(input);
    const indexes = headerIndexes(rows[0] || []);
    const venues = [];
    const errors = [];
    const seen = new Set();
    if (indexes.venue === undefined || indexes.tags === undefined) {
      errors.push({ row: 1, reason: language() === "zh"
        ? "缺少必需列：期刊或会议名称、标签"
        : "missing required headers: venue and tag" });
      return { schema_version: 1, venues, errors, sources: [], valid: false };
    }
    for (let index = 1; index < rows.length; index += 1) {
      const row = rows[index];
      const firstValue = cleanText(row[indexes.venue]);
      if (firstValue.startsWith("#")) continue;
      const venue = firstValue;
      const tags = splitList(row[indexes.tags]);
      if (!venue || !tags.length) {
        errors.push({ row: index + 1, reason: language() === "zh" ? "期刊/会议名或标签为空" : "venue or tag is empty" });
        continue;
      }
      const aliases = indexes.aliases === undefined ? [] : splitList(row[indexes.aliases]);
      const source = cleanText(options.sourceName)
        || (indexes.source === undefined ? "" : cleanText(row[indexes.source]))
        || (language() === "zh" ? "自定义榜单" : "Custom list");
      const duplicateKey = `${source}\u0000${venue}`.toLowerCase();
      if (seen.has(duplicateKey)) {
        errors.push({ row: index + 1, reason: language() === "zh" ? "期刊/会议名重复" : "duplicate venue" });
        continue;
      }
      const typeValue = indexes.type === undefined ? "" : row[indexes.type];
      const itemTypes = customItemTypes(typeValue);
      if (!itemTypes) {
        errors.push({ row: index + 1, reason: language() === "zh"
          ? `文献类型“${cleanText(typeValue)}”无效，请填“会议”、“期刊”或留空`
          : `invalid item type \"${cleanText(typeValue)}\"; use conference, journal, or blank` });
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
        item_types: itemTypes,
        patterns: [...new Set([venue, ...aliases])].map(customVenuePattern)
      });
    }
    return {
      schema_version: 1,
      venues,
      errors,
      sources: [...new Set(venues.map(rule => rule.source))],
      valid: errors.length === 0 && venues.length > 0
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

  function classificationResult(item, proposedTags, matches, track) {
    proposedTags = [...new Set(proposedTags.filter(Boolean))];
    const currentTags = typeof item.getTags === "function" ? item.getTags() : (item.tags || []);
    const currentSet = new Set(currentTags.map(entry => cleanText(typeof entry === "string" ? entry : entry.tag).toLowerCase()));
    const addTags = proposedTags.filter(tag => !currentSet.has(tag.toLowerCase()));
    const primary = matches[0];
    return {
      item,
      key: item.key || "",
      title: cleanText(itemField(item, "title")),
      venue: primary?.acronym || proposedTags[0],
      track,
      nonFull: isNonFull(track),
      trackNeedsReview: trackNeedsReview(track),
      proposedTags,
      addTags,
      sources: matches.map(match => match.sourceLabel).filter(Boolean),
      matches
    };
  }

  function classifyItemForSources(item, sourceIDs = scanSourceIDs, overrides = ruleData.overrides) {
    const selected = new Set(normalizeSourceIDs(sourceIDs));
    const zjuSelected = selected.has("builtin:zju");
    const ccfSelected = selected.has("builtin:ccf");
    const matches = [];
    const proposedTags = [];
    const track = inferTrack(item, overrides);

    if (zjuSelected || ccfSelected) {
      const rule = matchRule(item, ruleData.rules);
      if (rule) {
        matches.push({ ...rule, sourceLabel: [zjuSelected ? text("builtinZju") : null, ccfSelected ? text("builtinCcf") : null].filter(Boolean).join(" + ") });
        proposedTags.push(rule.acronym);
        if (!isNonFull(track)) {
          if (zjuSelected) {
            const zju = rule.zju || (ccfSelected ? rule.ccf : null);
            if (zju) proposedTags.push(`浙大-${zju}`);
          }
          if (ccfSelected && rule.ccf) proposedTags.push(`CCF-${rule.ccf}`);
        }
      }
    }

    for (const id of selected) {
      const sourceName = customSourceName(id);
      if (!sourceName) continue;
      const rule = matchRule(item, {
        venues: (customRuleData.venues || []).filter(value => value.source === sourceName)
      });
      if (!rule) continue;
      matches.push({ ...rule, sourceLabel: sourceName });
      proposedTags.push(...(rule.custom_tags || [rule.acronym]));
    }

    if (!matches.length) return null;
    if (track) proposedTags.push(track);
    return classificationResult(item, proposedTags, matches, track);
  }

  function classifyItem(item, rules = null, overrides = ruleData.overrides) {
    if (!rules) return classifyItemForSources(item, scanSourceIDs, overrides);
    const rule = matchRule(item, rules);
    if (!rule) return null;
    const track = inferTrack(item, overrides);
    const proposedTags = Array.isArray(rule.custom_tags) && rule.custom_tags.length
      ? [...rule.custom_tags]
      : [rule.acronym];
    if (track) proposedTags.push(track);
    if (!rule.custom_tags && !isNonFull(track)) {
      const zju = rule.zju || rule.ccf || null;
      if (zju) proposedTags.push(`浙大-${zju}`);
      if (rule.ccf) proposedTags.push(`CCF-${rule.ccf}`);
    }
    return classificationResult(item, proposedTags, [{ ...rule, sourceLabel: "" }], track);
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
    try {
      const storedScan = JSON.parse(getPreference(PREF_SCAN_SOURCES, "null"));
      scanSourceIDs = normalizeSourceIDs(storedScan, sourceIDsFromLegacyMode(scanSourceMode));
    }
    catch (error) {
      scanSourceIDs = normalizeSourceIDs(sourceIDsFromLegacyMode(scanSourceMode));
    }
    try {
      const storedDisplay = JSON.parse(getPreference(PREF_DISPLAY_SOURCES, "null"));
      displaySourceIDs = normalizeSourceIDs(storedDisplay, sourceIDsFromLegacyMode(displaySourceMode));
    }
    catch (error) {
      displaySourceIDs = normalizeSourceIDs(sourceIDsFromLegacyMode(displaySourceMode));
    }
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

  function saveSourceIDs(kind, ids) {
    const normalized = normalizeSourceIDs(ids);
    if (kind === "scan") {
      scanSourceIDs = normalized;
      setPreference(PREF_SCAN_SOURCES, JSON.stringify(normalized));
    }
    else {
      displaySourceIDs = normalized;
      setPreference(PREF_DISPLAY_SOURCES, JSON.stringify(normalized));
    }
    return normalized;
  }

  function openSourcePicker(kind, selectedIDs) {
    const win = Zotero.getMainWindow?.() || null;
    if (!win?.openDialog || !pluginRootURI) return { action: "accept", selected: selectedIDs };
    const data = {
      title: text(kind === "scan" ? "sourcePickerTitle" : "displayPickerTitle"),
      description: text(kind === "scan" ? "scanSourcePrompt" : "displaySourcePrompt"),
      sources: availableSources(),
      selected: [...selectedIDs],
      acceptLabel: text(kind === "scan" ? "previewScan" : "saveDisplay"),
      importLabel: text("importInPicker"),
      templateLabel: text("downloadTemplate"),
      validationMessage: text("chooseAtLeastOne"),
      result: null
    };
    const pickerURL = chromeHandle
      ? `chrome://${CHROME_PACKAGE}/content/dialogs/source-picker.xhtml`
      : `${pluginRootURI}dialogs/source-picker.xhtml`;
    win.openDialog(
      pickerURL,
      "zotero-venue-tagger-source-picker",
      "chrome,dialog,modal,centerscreen,resizable=no",
      data
    );
    return data.result || { action: "cancel", selected: selectedIDs };
  }

  async function chooseSourceIDs(kind) {
    let selected = normalizeSourceIDs(kind === "scan" ? scanSourceIDs : displaySourceIDs);
    while (true) {
      const result = openSourcePicker(kind, selected);
      selected = normalizeSourceIDs(result.selected, selected);
      if (result.action === "cancel") return null;
      if (result.action === "template") {
        await downloadCSVTemplate();
        continue;
      }
      if (result.action === "import") {
        const importedSource = await importCustomList({ quiet: true });
        if (importedSource) selected = [...new Set([...selected, customSourceID(importedSource)])];
        continue;
      }
      const saved = saveSourceIDs(kind, selected);
      if (kind === "display") await refreshItemsView();
      return saved;
    }
  }

  function importPreviewMessage(fileName, parsed) {
    const lines = parsed.venues.slice(0, 12).map(rule =>
      `• ${rule.name} → ${rule.custom_tags.join(" · ")}`
    ).join("\n");
    return text("importPreview", {
      name: fileName,
      count: parsed.venues.length,
      lines,
      more: parsed.venues.length > 12 ? text("more", { count: parsed.venues.length - 12 }) : ""
    });
  }

  function pathFileName(file) {
    const value = file?.path || String(file || "");
    return value.split(/[\\/]/).pop() || "custom-list.csv";
  }

  function baseFileName(file) {
    return pathFileName(file).replace(/\.(?:csv|tsv|txt)$/i, "") || (language() === "zh" ? "自定义榜单" : "Custom list");
  }

  function formatImportErrors(errors) {
    return errors.slice(0, 12).map(error => `${language() === "zh" ? "第" : "Row "}${error.row}${language() === "zh" ? " 行" : ""}：${error.reason}`).join("\n")
      + (errors.length > 12 ? text("more", { count: errors.length - 12 }) : "");
  }

  async function importCustomList(options = {}) {
    const win = Zotero.getMainWindow?.() || null;
    try {
      const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      const picker = new FilePicker();
      picker.init(win, text("importTitle"), picker.modeOpen);
      picker.appendFilter("CSV / TSV", "*.csv; *.tsv; *.txt");
      picker.appendFilters(picker.filterAll);
      if ((await picker.show()) !== picker.returnOK) return;

      const contents = await Zotero.File.getContentsAsync(picker.file);
      const listName = { value: baseFileName(picker.file) };
      if (!Services.prompt.prompt(win, text("importTitle"), text("listNamePrompt"), listName, null, {})) return;
      listName.value = cleanText(listName.value);
      if (!listName.value) {
        promptAlert(text("importInvalid", { details: language() === "zh" ? "榜单名称不能为空。" : "The list name cannot be empty." }), win);
        return;
      }
      const parsed = parseCustomVenueList(contents, { sourceName: listName.value });
      if (parsed.errors.length) {
        promptAlert(text("importInvalid", { details: formatImportErrors(parsed.errors) }), win);
        return;
      }
      if (!parsed.venues.length) {
        promptAlert(text("importEmpty"), win);
        return;
      }
      if (!Services.prompt.confirm(win, text("title"), importPreviewMessage(listName.value, parsed))) return;

      const existing = (customRuleData.venues || []).some(rule => rule.source === listName.value);
      if (existing && !Services.prompt.confirm(win, text("title"), text("replaceSource", { name: listName.value }))) {
        return;
      }
      const preserved = (customRuleData.venues || []).filter(rule => rule.source !== listName.value);
      customRuleData = { schema_version: 1, venues: [...preserved, ...parsed.venues] };
      setPreference(PREF_CUSTOM_RULES, JSON.stringify(customRuleData));
      refreshVenueTags();
      scanSourceIDs = saveSourceIDs("scan", [...scanSourceIDs, customSourceID(listName.value)]);
      displaySourceIDs = saveSourceIDs("display", [...displaySourceIDs, customSourceID(listName.value)]);
      await refreshItemsView();
      if (!options.quiet) promptAlert(text("importDone", { name: listName.value, count: parsed.venues.length }), win);
      return listName.value;
    }
    catch (error) {
      Zotero.logError?.(error);
      promptAlert(text("importFailed", { message: error.message || error }), win);
      return null;
    }
  }

  async function downloadCSVTemplate() {
    const win = Zotero.getMainWindow?.() || null;
    try {
      const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      const picker = new FilePicker();
      picker.init(win, text("downloadTemplate"), picker.modeSave);
      picker.defaultString = language() === "zh" ? "HCI榜单导入范例.csv" : "HCI-list-import-example.csv";
      picker.defaultExtension = "csv";
      picker.appendFilter("CSV", "*.csv");
      const result = await picker.show();
      if (result !== picker.returnOK && result !== picker.returnReplace) return false;
      const content = language() === "zh"
        ? "\uFEFF期刊或会议名称,标签,别名,文献类型\n# 示例会议名称（请替换）,示例标签,Example Conference|EC,会议\n# 示例期刊名称（请替换）,示例标签,Example Journal,期刊\n"
        : "\uFEFFvenue,tag,aliases,type\n# Example Conference (replace this row),Example-Tag,Example Conference|EC,conference\n# Example Journal (replace this row),Example-Tag,Example Journal,journal\n";
      await Zotero.File.putContentsAsync(picker.file, content);
      promptAlert(text("templateSaved"), win);
      return true;
    }
    catch (error) {
      Zotero.logError?.(error);
      promptAlert(text("importFailed", { message: error.message || error }), win);
      return false;
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

  function regularCollectionItems(collection) {
    return (collection?.getChildItems?.() || []).filter(item => {
      if (typeof item.isRegularItem === "function") return item.isRegularItem();
      return !["attachment", "note", "annotation"].includes(itemTypeName(item));
    });
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

      const selectedSources = await chooseSourceIDs("scan");
      if (!selectedSources) return;

      const items = regularCollectionItems(collection);
      if (!items.length) {
        promptAlert(text("noItems"), win);
        return;
      }

      const rows = items.map(item => classifyItemForSources(item, selectedSources)).filter(Boolean);
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

  function csvValue(value) {
    const normalized = String(value ?? "").replace(/\r?\n/g, " ");
    return /[",\r\n]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
  }

  function itemCreators(item) {
    try {
      return (item.getCreators?.() || []).map(creator => {
        if (creator.name) return cleanText(creator.name);
        return cleanText([creator.firstName, creator.lastName].filter(Boolean).join(" "));
      }).filter(Boolean).join("; ");
    }
    catch (error) {
      return "";
    }
  }

  function itemVenueName(item) {
    for (const field of ["publicationTitle", "proceedingsTitle", "conferenceName", "seriesTitle", "bookTitle"]) {
      const value = cleanText(itemField(item, field));
      if (value) return value;
    }
    return "";
  }

  function recognitionExportRows(items, sourceIDs = scanSourceIDs) {
    return items.map(item => {
      const result = classifyItemForSources(item, sourceIDs);
      const tags = result?.proposedTags || [];
      const currentTags = (item.getTags?.() || []).map(value => cleanText(typeof value === "string" ? value : value.tag)).filter(Boolean);
      const year = (cleanText(itemField(item, "date")).match(/\b(?:18|19|20|21)\d{2}\b/) || [""])[0];
      return [
        cleanText(itemField(item, "title")),
        itemCreators(item),
        year,
        itemTypeName(item),
        itemVenueName(item),
        result?.venue || "",
        tags.find(tag => /^浙大-[ABC]$/.test(tag)) || "",
        tags.find(tag => /^CCF-[ABC]$/.test(tag)) || "",
        result?.track || "",
        tags.filter(tag => customTags.has(tag)).join(" | "),
        tags.join(" | "),
        (result?.sources || []).join(" | "),
        result ? (result.addTags.length ? (language() === "zh" ? "待写入" : "Not applied") : (language() === "zh" ? "已写入" : "Applied")) : (language() === "zh" ? "未识别" : "Unrecognized"),
        normalizeDOI(itemField(item, "DOI")),
        currentTags.join(" | "),
        item.key || ""
      ];
    });
  }

  async function exportRecognitionResults(preferredCollection = null) {
    const win = Zotero.getMainWindow?.() || null;
    try {
      const pane = Zotero.getActiveZoteroPane();
      const collection = preferredCollection || (pane && selectedCollection(pane));
      if (!collection) {
        promptAlert(text("selectOne"), win);
        return;
      }
      const items = regularCollectionItems(collection);
      if (!items.length) {
        promptAlert(text("noItems"), win);
        return;
      }
      const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
      const picker = new FilePicker();
      picker.init(win, text("exportLabel"), picker.modeSave);
      const safeName = cleanText(collection.name).replace(/[\\/:*?"<>|]/g, "-") || "HCI-recognition-results";
      picker.defaultString = `${safeName}-HCI榜单结果.csv`;
      picker.defaultExtension = "csv";
      picker.appendFilter("CSV (Excel)", "*.csv");
      const pickerResult = await picker.show();
      if (pickerResult !== picker.returnOK && pickerResult !== picker.returnReplace) return;
      const headers = language() === "zh"
        ? ["论文名", "作者", "年份", "文献类型", "期刊/会议名", "Venue 标签", "浙大认定", "CCF 认定", "论文轨道", "自定义标签", "全部识别标签", "榜单来源", "识别状态", "DOI", "Zotero 现有标签", "Zotero Key"]
        : ["Title", "Authors", "Year", "Item Type", "Journal/Conference", "Venue Tag", "ZJU Rank", "CCF Rank", "Track", "Custom Tags", "All Recognized Tags", "List Sources", "Status", "DOI", "Current Zotero Tags", "Zotero Key"];
      const csv = [headers, ...recognitionExportRows(items)].map(row => row.map(csvValue).join(",")).join("\r\n");
      await Zotero.File.putContentsAsync(picker.file, `\uFEFF${csv}\r\n`);
      promptAlert(text("exportDone", { count: items.length }), win);
    }
    catch (error) {
      Zotero.logError?.(error);
      promptAlert(text("exportFailed", { message: error.message || error }), win);
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
    const menuItem = (labelKey, onCommand) => ({
      menuType: "menuitem",
      ...(icon ? { icon } : {}),
      onShowing: (_event, context) => {
        context.menuElem?.setAttribute("label", text(labelKey));
        if (icon) context.menuElem?.setAttribute("image", icon);
      },
      onCommand
    });
    const menuItems = () => [
      menuItem("scanLabel", (_event, context) => scanCurrentCollection(collectionFromMenuContext(context))),
      menuItem("exportLabel", (_event, context) => exportRecognitionResults(collectionFromMenuContext(context))),
      { menuType: "separator" },
      menuItem("importLabel", () => importCustomList()),
      menuItem("displaySourceLabel", () => chooseSourceIDs("display"))
    ];
    const toolsMenu = Zotero.MenuManager.registerMenu({
      menuID: `${PLUGIN_ID}-main-menubar-tools`,
      pluginID: id || PLUGIN_ID,
      target: "main/menubar/tools",
      menus: menuItems()
    });
    const collectionMenu = Zotero.MenuManager.registerMenu({
      menuID: `${PLUGIN_ID}-main-library-collection`,
      pluginID: id || PLUGIN_ID,
      target: "main/library/collection",
      menus: menuItems()
    });
    registeredMenuIDs = [toolsMenu, collectionMenu];
  }

  async function startup({ id, rootURI } = {}) {
    await Zotero.initializationPromise;
    pluginRootURI = rootURI || null;
    if (pluginRootURI && typeof Cc !== "undefined" && typeof Ci !== "undefined") {
      const addonManagerStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"]
        .getService(Ci.amIAddonManagerStartup);
      const manifestURI = Services.io.newURI(`${pluginRootURI}manifest.json`);
      chromeHandle = addonManagerStartup.registerChrome(manifestURI, [
        ["content", CHROME_PACKAGE, ""]
      ]);
    }
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
    chromeHandle?.destruct?.();
    chromeHandle = null;
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
    scanSourceIDs = normalizeSourceIDs(modes.scanIDs || sourceIDsFromLegacyMode(scanSourceMode));
    displaySourceIDs = normalizeSourceIDs(modes.displayIDs || sourceIDsFromLegacyMode(displaySourceMode));
  }

  return {
    startup,
    shutdown,
    onMainWindowLoad,
    scanCurrentCollection,
    importCustomList,
    downloadCSVTemplate,
    exportRecognitionResults,
    chooseSourceIDs,
    availableSources,
    recognitionExportRows,
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
