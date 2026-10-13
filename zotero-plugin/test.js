const assert = require("node:assert/strict");
const tagger = require("./bootstrap.js");

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
  global.Zotero = {
    initializationPromise: Promise.resolve(),
    debug() {},
    ItemTreeManager: {
      async registerColumn(config) {
        columnConfig = config;
        return "registered-venue-rank-badges";
      },
      async unregisterColumn(key) {
        unregisteredKey = key;
      }
    }
  };

  await tagger.startup({ id: "zotero-venue-tagger@holly1226.github.io" });
  assert.equal(columnConfig.label, "榜单");
  assert.equal(columnConfig.defaultVisible, true);
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
  console.log("Zotero plugin badge tests passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
