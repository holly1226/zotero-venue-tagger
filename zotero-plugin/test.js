const assert = require("node:assert/strict");
const tagger = require("./bootstrap.js");
const rules = require("../references/venue_rules.json");
const overrides = require("../references/track_overrides.json");

tagger.setRuleDataForTests({ rules, overrides });

function makeItem(fields, tags = []) {
  return {
    itemType: fields.itemType,
    key: fields.key || "TESTKEY1",
    libraryID: 1,
    getField(name) {
      return fields[name] || "";
    },
    getTags() {
      return tags.map(tag => ({ tag }));
    }
  };
}

assert.deepEqual(
  tagger.selectDisplayTags([
    { tag: "read-later" },
    { tag: "CCF-A" },
    { tag: "CHI" },
    { tag: "浙大-A" },
    { tag: "CHI" }
  ]),
  ["CHI", "浙大-A", "CCF-A"]
);

assert.deepEqual(
  tagger.selectDisplayTags(["Companion-WiP", "DIS", "CCF-C", "浙大-B"]),
  ["DIS", "浙大-B", "CCF-C", "Companion-WiP"]
);

assert.deepEqual(
  tagger.selectDisplayTags(["EA-Poster", "workshop", "unknown"]),
  ["EA-Poster", "workshop"]
);

assert.deepEqual(tagger.parseDisplayValue('["CHI","浙大-A","CCF-A"]'), ["CHI", "浙大-A", "CCF-A"]);
assert.deepEqual(tagger.parseDisplayValue("not-json"), []);

assert.deepEqual(
  tagger.classifyItem(makeItem({
    itemType: "conferencePaper",
    title: "A Full Paper",
    proceedingsTitle: "Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems"
  })).proposedTags,
  ["CHI", "浙大-A", "CCF-A"]
);

assert.deepEqual(
  tagger.classifyItem(makeItem({
    itemType: "conferencePaper",
    title: "A Poster",
    proceedingsTitle: "Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems",
    extra: "Poster"
  })).proposedTags,
  ["CHI", "EA-Poster"]
);

assert.deepEqual(
  tagger.classifyItem(makeItem({
    itemType: "conferencePaper",
    title: "A DIS Paper",
    proceedingsTitle: "Designing Interactive Systems Conference 2025"
  }, ["DIS"])).addTags,
  ["浙大-B", "CCF-C"]
);

const genericEA = tagger.classifyItem(makeItem({
  itemType: "conferencePaper",
  title: "An Extended Abstract",
  proceedingsTitle: "Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems"
}));
assert.equal(genericEA.nonFull, true);
assert.equal(genericEA.trackNeedsReview, true);
assert.deepEqual(genericEA.proposedTags, ["CHI", "EA"]);

global.Zotero = { locale: "zh-CN" };
const preview = tagger.previewMessage(
  { name: "Social Interaction" },
  [genericEA],
  3
);
assert.match(preview, /识别 1 篇（非全文轨道 1 篇），未识别 2 篇/);
assert.match(preview, /无法从现有元数据判断/);

const customRules = {
  schema_version: 1,
  rule_set: "test",
  venues: [{
    id: "custom-venue",
    acronym: "MYVENUE",
    priority: 1,
    item_types: ["conferencePaper"],
    patterns: ["My Custom Conference"],
    zju: null,
    ccf: null
  }]
};
tagger.setRuleDataForTests({ rules: customRules, overrides: { overrides: {} } });
assert.deepEqual(tagger.selectDisplayTags(["MYVENUE", "unknown"]), ["MYVENUE"]);
tagger.setRuleDataForTests({ rules, overrides });

class FakeElement {
  constructor() {
    this.children = [];
    this.style = {};
    this.className = "";
    this.textContent = "";
    this.title = "";
  }

  appendChild(child) {
    this.children.push(child);
  }
}

(async () => {
  let columnConfig;
  let unregisteredKey;
  const registeredMenus = [];
  const unregisteredMenus = [];
  global.Zotero = {
    locale: "zh-CN",
    initializationPromise: Promise.resolve(),
    debug() {},
    getMainWindows: () => [],
    ItemTreeManager: {
      async registerColumn(config) {
        columnConfig = config;
        return "registered-venue-rank-badges";
      },
      async unregisterColumn(key) {
        unregisteredKey = key;
      }
    },
    MenuManager: {
      registerMenu(config) {
        registeredMenus.push(config);
        return config.menuID;
      },
      unregisterMenu(id) {
        unregisteredMenus.push(id);
      }
    }
  };

  await tagger.startup({
    id: "zotero-venue-tagger@holly1226.github.io",
    rootURI: "file:///plugin/"
  });
  assert.equal(columnConfig.label, "HCI 榜单");
  assert.equal(columnConfig.defaultVisible, true);
  assert.deepEqual(registeredMenus.map(menu => menu.target), ["main/menubar/tools", "main/library/collection"]);
  let menuLabel = "";
  registeredMenus[0].menus[0].onShowing(null, {
    menuElem: { setAttribute: (_name, value) => { menuLabel = value; } }
  });
  assert.equal(menuLabel, "识别 HCI 榜单…");
  assert.equal(registeredMenus[0].menus[0].icon, "file:///plugin/icons/menu-icon.svg");
  assert.equal(
    columnConfig.dataProvider({
      getTags: () => [{ tag: "CHI" }, { tag: "浙大-A" }, { tag: "CCF-A" }]
    }),
    '["CHI","浙大-A","CCF-A"]'
  );

  const fakeDocument = { createElementNS: () => new FakeElement() };
  const cell = columnConfig.renderCell(
    0,
    '["CHI","浙大-A","CCF-A"]',
    { className: "test-column" },
    false,
    fakeDocument
  );
  assert.deepEqual(cell.children.map(child => child.textContent), ["CHI", "浙大-A", "CCF-A"]);

  await tagger.shutdown(0);
  assert.equal(unregisteredKey, "registered-venue-rank-badges");
  assert.equal(unregisteredMenus.length, 2);

  let confirmCalls = 0;
  let saveCalls = 0;
  let saveOptions;
  const scanItem = makeItem({
    itemType: "conferencePaper",
    title: "One-click Scan Test",
    proceedingsTitle: "CHI Conference on Human Factors in Computing Systems"
  });
  scanItem.isRegularItem = () => true;
  scanItem.addTag = tag => scanItem.getTags = () => [{ tag }];
  scanItem.saveTx = async options => {
    saveCalls += 1;
    saveOptions = options;
  };
  global.Services = {
    prompt: {
      alert() {},
      confirm() {
        confirmCalls += 1;
        return true;
      }
    }
  };
  global.Zotero = {
    version: "10.0.7",
    locale: "zh-CN",
    getMainWindow: () => null,
    getActiveZoteroPane: () => ({
      getSelectedCollections: () => [],
      itemsView: { refresh: async () => {} }
    }),
    Libraries: { get: () => ({ editable: true }) },
    logError(error) { throw error; },
    debug() {}
  };
  const contextCollection = { name: "Test Collection", getChildItems: () => [scanItem] };
  await registeredMenus[1].menus[0].onCommand(null, {
    collectionTreeRows: [{ ref: contextCollection }]
  });
  assert.equal(confirmCalls, 1);
  assert.equal(saveCalls, 1);
  assert.deepEqual(saveOptions, {
    undoAction: "undo-action-edit-metadata",
    undoActionArgs: { count: 1 }
  });
  console.log("Zotero plugin badge tests passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
