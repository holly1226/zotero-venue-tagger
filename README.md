# Zotero Venue Tagger

**English** | [中文](#中文)

A Zotero plugin for recognizing HCI journals and conferences and adding compact venue, Zhejiang University (ZJU), CCF, and publication-track tags.

Examples:

- `CHI`, `浙大-A`, `CCF-A`
- `DIS`, `浙大-B`, `CCF-C`
- `CHI`, `EA-Poster`
- `DIS`, `Companion-WiP`

The default rules use the Zhejiang University Design 2021 list and the 2022 CCF HCI and Ubiquitous Computing category. Direct ZJU grades take precedence, while CCF supplies a ZJU fallback only when a venue is absent from the ZJU list. Rank tags are withheld from non-full-paper tracks by default.

## Zotero plugin

The plugin adds a dedicated **榜单** column to Zotero and displays classification tags as compact badges. It does not depend on AI4Paper, a cloud service, or an API key.

### Install

1. Download the latest `.xpi` from [GitHub Releases](https://github.com/holly1226/zotero-venue-tagger/releases/latest).
2. In Zotero, open **Tools → Plugins**.
3. Choose **Install Plugin From File…** and select the downloaded `.xpi`.
4. If the column is hidden, right-click the item-list header and enable **榜单**.

The one-click plugin supports Zotero 8 through Zotero 10.0.x. Zotero 10 is recommended and is the version currently tested.

### One-click scan

Select exactly one collection, then choose **Tools → Scan Current Collection for Venue Tags…**. The same command is available from the collection's context menu.

Zotero shows a preview before writing, including recognized, unmatched, non-full-track, and changed-item counts. Generic `EA` or `Companion` matches are explicitly flagged for review when the metadata does not identify a subtype. Existing tags are preserved, rank tags are not added to non-full-paper records, and Zotero 10 changes can be undone from **Edit → Undo**.

## Codex skill

The included skill teaches Codex to preview classifications, explain uncertain matches, and apply reviewed tag plans safely.

```bash
git clone https://github.com/holly1226/zotero-venue-tagger.git ~/.codex/skills/zotero-venue-tagger
```

Restart or reload Codex, then invoke `$zotero-venue-tagger`.

## Python CLI

The dependency-free CLI is useful for batch processing, automation, and debugging. It communicates with Zotero through the local API and never edits `zotero.sqlite` directly.

Requirements for CLI use:

- Python 3.9 or later
- Zotero setting enabled: **Settings → Advanced → Allow other applications on this computer to communicate with Zotero**

Preview:

```bash
python3 scripts/zotero_venue_tagger.py status
python3 scripts/zotero_venue_tagger.py preview --limit 20
```

Create and apply a reviewable plan:

```bash
python3 scripts/zotero_venue_tagger.py preview \
  --item-key ABCD1234 \
  --item-key EFGH5678 \
  --plan-out tag-plan.json

python3 scripts/zotero_venue_tagger.py apply --plan tag-plan.json
```

Zotero displays a local authorization dialog before an apply operation. The CLI preserves existing tags and stops if an item changed after the preview was created.

## Customize and build

- Edit `references/venue_rules.json` to add or update venues.
- Edit `references/track_overrides.json` when a DOI's EA or Companion subtype is known.
- Use `--rank-non-full` only if your institution explicitly ranks non-full-paper tracks as the main venue.

Build the XPI locally:

```bash
sh scripts/build_plugin.sh
```

Run the tests:

```bash
python3 -m unittest discover -s tests -v
node zotero-plugin/test.js
```

Every push and pull request runs the same classification tests, validates all bundled regular expressions and grades, and verifies that the XPI can be built.

Institutional classifications change over time. The repository records the rule-set dates and keeps ZJU and CCF grades as separate tags so conflicts remain visible.

## License

MIT

---

# 中文

**Zotero Venue Tagger** 是一个用于识别 HCI 期刊与会议，并添加简洁的 venue、浙大认定、CCF 认定和论文类型标签的 Zotero 插件。

标签示例：

- `CHI`, `浙大-A`, `CCF-A`
- `DIS`, `浙大-B`, `CCF-C`
- `CHI`, `EA-Poster`
- `DIS`, `Companion-WiP`

默认规则来自《浙江大学设计学高影响力期刊和会议列表》2021 版，以及 CCF 2022 年人机交互与普适计算类别。如果 venue 在浙大名单中有明确等级，优先使用浙大认定；只有未列入浙大名单时，才使用 CCF 等级作为补充。EA、Companion 等非 full-paper 类型默认不添加等级标签。

## Zotero 插件

插件会在 Zotero 文献列表中增加独立的 **榜单** 列，以紧凑徽标显示分类结果。不依赖 AI4Paper、云端服务或 API Key。

### 安装

1. 从 [GitHub Releases](https://github.com/holly1226/zotero-venue-tagger/releases/latest) 下载最新 `.xpi` 安装包。
2. 在 Zotero 中打开 **工具 → 插件**。
3. 选择**从文件安装插件…**，然后选中下载的 `.xpi`。
4. 如果看不到该列，右键文献列表表头，勾选 **榜单**。

一键扫描插件支持 Zotero 8 至 Zotero 10.0.x。建议使用 Zotero 10，这也是当前已完成实机测试的版本。

### 一键扫描

在左侧只选中一个文件夹，然后选择 **工具 → 扫描当前文件夹（榜单标签）…**。也可以右键文件夹，选择同名菜单。

写入前会显示预览，包括识别、未识别、非全文轨道和待更新数量；如果元数据只能判断为 `EA` 或 `Companion`、无法确认 Poster/WiP 等子类型，也会明确提示复核。只有确认后才新增标签，原有标签会被保留，非 full-paper 记录不会添加会议等级；在 Zotero 10 中还可以通过**编辑 → 撤销**恢复。

## Codex Skill

仓库中的 Skill 用于告诉 Codex 如何预览分类结果、解释不确定项，并在审核后安全写入标签。

```bash
git clone https://github.com/holly1226/zotero-venue-tagger.git ~/.codex/skills/zotero-venue-tagger
```

重启或重新加载 Codex，然后调用 `$zotero-venue-tagger`。

## Python 命令行工具

该工具不依赖第三方 Python 包，适合批量处理、自动化和调试。它通过 Zotero 本地 API 通信，不会直接修改 `zotero.sqlite`。

命令行用法需要：

- Python 3.9 或更高版本
- 在 Zotero 中开启：**设置 → 高级 → 允许这台电脑上的其他应用与 Zotero 通信**

生成预览：

```bash
python3 scripts/zotero_venue_tagger.py status
python3 scripts/zotero_venue_tagger.py preview --limit 20
```

生成可审核计划并在确认后执行：

```bash
python3 scripts/zotero_venue_tagger.py preview \
  --item-key ABCD1234 \
  --item-key EFGH5678 \
  --plan-out tag-plan.json

python3 scripts/zotero_venue_tagger.py apply --plan tag-plan.json
```

执行写入前，Zotero 会显示本地授权窗口。命令行工具会保留原有标签；如果文献在预览后发生了变化，它会停止写入。

## 自定义与构建

- 编辑 `references/venue_rules.json` 可以增加或更新 venue。
- 已知某篇文献的 EA 或 Companion 子类型时，可编辑 `references/track_overrides.json`。
- 只有所在机构明确将非 full-paper 轨道按主会议认定时，才应使用 `--rank-non-full`。

本地构建 XPI：

```bash
sh scripts/build_plugin.sh
```

运行测试：

```bash
python3 -m unittest discover -s tests -v
node zotero-plugin/test.js
```

每次向 GitHub 推送或提交 Pull Request，都会自动运行同一套分类测试、校验规则中的正则表达式和等级，并验证 XPI 是否能够成功构建。

院校认定会随时间变化。本仓库保留规则版本日期，并将浙大和 CCF 等级分别保存为标签，以便显示两套标准之间的差异。

## 许可证

MIT
