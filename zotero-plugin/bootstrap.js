var ZoteroVenueTagger = (() => {
  const PLUGIN_ID = "zotero-venue-tagger@holly1226.github.io";
  const COLUMN_KEY = "venue-rank-badges";
  const XHTML_NS = "http://www.w3.org/1999/xhtml";
  const MAX_BADGES = 5;

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
  const TRACK_PATTERN = /^(?:(?:EA|Companion)-.+|Poster|Workshop|Demo|WiP)$/i;

  let registeredDataKey = null;

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
      "display:inline-flex",
      "align-items:center",
      "height:18px",
      "padding:0 5px",
      "border-radius:4px",
      `border:1px solid ${border}`,
      `background:${background}`,
      `color:${color}`,
      "font-size:11px",
      "font-weight:600",
      "line-height:18px",
      "white-space:nowrap",
      "box-sizing:border-box"
    ].join(";");
  }

  function renderCell(index, value, column, isFirstColumn, doc) {
    const container = doc.createElementNS(XHTML_NS, "span");
    container.className = `cell ${column.className || ""}`;
    container.style.cssText = [
      "display:flex",
      "align-items:center",
      "gap:3px",
      "overflow:hidden",
      "padding-inline:4px"
    ].join(";");

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

  async function startup({ id }) {
    await Zotero.initializationPromise;
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
    Zotero.debug("[Zotero Venue Tagger] Badge column registered");
  }

  async function shutdown(reason) {
    if (typeof APP_SHUTDOWN !== "undefined" && reason === APP_SHUTDOWN) return;
    if (registeredDataKey) {
      await Zotero.ItemTreeManager.unregisterColumn(registeredDataKey);
      registeredDataKey = null;
    }
  }

  return {
    startup,
    shutdown,
    selectDisplayTags,
    parseDisplayValue,
    tagKind
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = ZoteroVenueTagger;
}
