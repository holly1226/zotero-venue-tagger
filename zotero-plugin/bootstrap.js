var ZoteroVenueTagger = (() => {
  const PLUGIN_ID = "zotero-venue-tagger@holly1226.github.io";
  const COLUMN_KEY = "venue-rank-badges";
  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  const MAX_BADGES = 5;
  const NON_FULL_PREFIXES = [
    "EA", "Companion", "Poster", "Workshop", "Demo", "WiP", "LBW",
    "Doctoral-Consortium", "SRC"
  ];

  const VENUE_TAGS = new Set([
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
      title: "Zotero Venue Tagger",
      scanLabel: "扫描当前文件夹（榜单标签）…",
      selectOne: "请先在左侧只选中一个文件夹。",
      noItems: "当前文件夹没有可扫描的文献。",
      noMatch: "未识别到榜单中的 venue。\n\n不会修改任何标签。",
      noChanges: "已识别 {matched} 篇，相关标签都已存在，无需更新。",
      preview: "文件夹：{name}\n共 {total} 篇，识别 {matched} 篇，将更新 {changed} 篇。\n\n{lines}{more}\n\n只会新增上述标签，不会删除或替换原标签。现在写入吗？",
      more: "\n…另有 {count} 篇",
      done: "已为 {count} 篇文献新增榜单标签。",
      failed: "扫描失败：{message}"
    },
    en: {
      title: "Zotero Venue Tagger",
      scanLabel: "Scan Current Collection for Venue Tags…",
      selectOne: "Select exactly one collection in the left pane first.",
      noItems: "The current collection has no scannable items.",
      noMatch: "No supported venues were recognized.\n\nNo tags were changed.",
      noChanges: "Recognized {matched} items; all classification tags already exist.",
      preview: "Collection: {name}\n{total} items, {matched} recognized, {changed} to update.\n\n{lines}{more}\n\nOnly the tags shown above will be added. Existing tags will not be removed or replaced. Apply now?",
      more: "\n…and {count} more",
      done: "Added classification tags to {count} items.",
      failed: "Scan failed: {message}"
    }
  };

  let registeredDataKey = null;
  let registeredMenuIDs = [];
  let ruleData = { rules: { venues: [] }, overrides: { overrides: {} } };
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

  function tagKind(tag) {
    if (VENUE_TAGS.has(tag)) return "venue";
    if (/^浙大-[ABC]$/.test(tag)) return "zju";
    if (/^CCF-[ABC]$/.test(tag)) return "ccf";
    if (TRACK_PATTERN.test(tag)) return "track";
    return null;
  }

  function rankValue(tag) {
    const grade = tag.slice(-1);
    return { A: 0, B: 1, C: 2 }[grade] ?? 9;
  }

  function compareTags(left, right) {
    const kindOrder = { venue: 0, zju: 1, ccf: 2, track: 3 };
    const leftKind = tagKind(left);
    const rightKind = tagKind(right);
    const kindDifference = kindOrder[leftKind] - kindOrder[rightKind];
    if (kindDifference) return kindDifference;
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

  function matchesPattern(source, pattern) {
    try {
      return compilePattern(pattern).test(source);
    }
    catch (error) {
      globalThis.Zotero?.debug?.(`[Zotero Venue Tagger] Invalid pattern ${pattern}: ${error}`);
      return false;
    }
  }

  function matchRule(item, rules = ruleData.rules) {
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

  function classifyItem(item, rules = ruleData.rules, overrides = ruleData.overrides) {
    const rule = matchRule(item, rules);
    if (!rule) return null;

    const track = inferTrack(item, overrides);
    const proposedTags = [rule.acronym];
    if (track) proposedTags.push(track);

    let zju = rule.zju || null;
    if (!zju && rule.ccf) zju = rule.ccf;
    if (!isNonFull(track)) {
      if (zju) proposedTags.push(`浙大-${zju}`);
      if (rule.ccf) proposedTags.push(`CCF-${rule.ccf}`);
    }

    const currentTags = typeof item.getTags === "function" ? item.getTags() : (item.tags || []);
    const currentSet = new Set(currentTags.map(entry => cleanText(typeof entry === "string" ? entry : entry.tag).toLowerCase()));
    const addTags = proposedTags.filter(tag => !currentSet.has(tag.toLowerCase()));
    return {
      item,
      key: item.key || "",
      title: cleanText(itemField(item, "title")),
      venue: rule.acronym,
      track,
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
      track: ["#f3e8ff", "#7e22ce", "#d8b4fe"]
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

  function selectedCollection(pane) {
    if (typeof pane.getSelectedCollections === "function") {
      const selected = pane.getSelectedCollections();
      return selected.length === 1 ? selected[0] : null;
    }
    return pane.getSelectedCollection?.() || null;
  }

  function previewMessage(collection, rows, total) {
    const changed = rows.filter(row => row.addTags.length);
    const visible = changed.slice(0, 12).map(row => {
      const title = row.title.length > 42 ? `${row.title.slice(0, 41).trim()}…` : row.title;
      return `• ${title}\n  ${row.addTags.join(" · ")}`;
    }).join("\n");
    const more = changed.length > 12 ? text("more", { count: changed.length - 12 }) : "";
    return text("preview", {
      name: collection.name,
      total,
      matched: rows.length,
      changed: changed.length,
      lines: visible,
      more
    });
  }

  async function scanCurrentCollection() {
    if (scanning) return;
    scanning = true;
    const win = Zotero.getMainWindow?.() || null;
    try {
      const pane = Zotero.getActiveZoteroPane();
      const collection = pane && selectedCollection(pane);
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
        promptAlert(text("noChanges", { matched: rows.length }), win);
        return;
      }

      const approved = Services.prompt.confirm(win, text("title"), previewMessage(collection, rows, items.length));
      if (!approved) return;

      let applied = 0;
      for (const row of changed) {
        const library = Zotero.Libraries.get(row.item.libraryID);
        if (library && library.editable === false) continue;
        for (const tag of row.addTags) row.item.addTag(tag);
        await row.item.saveTx();
        applied += 1;
      }
      if (pane.itemsView?.refresh) await pane.itemsView.refresh();
      promptAlert(text("done", { count: applied }), win);
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
  }

  function loadLocalization(win) {
    win?.MozXULElement?.insertFTLIfNeeded("zotero-venue-tagger.ftl");
  }

  function registerMenus(id) {
    if (!Zotero.MenuManager?.registerMenu) return;
    const menu = target => Zotero.MenuManager.registerMenu({
      menuID: `${PLUGIN_ID}-${target.replaceAll("/", "-")}`,
      pluginID: id || PLUGIN_ID,
      target,
      menus: [{
        menuType: "menuitem",
        onShowing: (_event, context) => {
          context.menuElem?.setAttribute("label", text("scanLabel"));
        },
        onCommand: () => scanCurrentCollection()
      }]
    });
    registeredMenuIDs = [menu("main/menubar/tools"), menu("main/library/collection")];
  }

  async function startup({ id, rootURI } = {}) {
    await Zotero.initializationPromise;
    loadRuleData(rootURI);
    for (const win of Zotero.getMainWindows?.() || []) loadLocalization(win);
    registeredDataKey = await Zotero.ItemTreeManager.registerColumn({
      dataKey: COLUMN_KEY,
      label: "榜单",
      pluginID: id || PLUGIN_ID,
      showInColumnPicker: true,
      defaultVisible: true,
      width: "230",
      zoteroPersist: ["width", "hidden", "sortDirection", "ordinal"],
      dataProvider: itemDisplayValue,
      renderCell
    });
    registerMenus(id);
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
  }

  return {
    startup,
    shutdown,
    onMainWindowLoad,
    scanCurrentCollection,
    selectDisplayTags,
    parseDisplayValue,
    tagKind,
    classifyItem,
    inferTrack,
    matchRule,
    previewMessage,
    setRuleDataForTests
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
