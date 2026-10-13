import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("tagger", ROOT / "scripts" / "zotero_venue_tagger.py")
tagger = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(tagger)
RULES = tagger.load_json(ROOT / "references" / "venue_rules.json")
OVERRIDES = tagger.load_json(ROOT / "references" / "track_overrides.json")


def item(key, item_type, title, venue, doi="", pages="", tags=None, version=1):
    field = "publicationTitle" if item_type == "journalArticle" else "proceedingsTitle"
    return {
        "data": {
            "key": key,
            "version": version,
            "itemType": item_type,
            "title": title,
            field: venue,
            "DOI": doi,
            "pages": pages,
            "date": "2025",
            "tags": tags or [],
        }
    }


class ClassificationTests(unittest.TestCase):
    def test_chi_full_gets_both_ranks(self):
        result = tagger.classify_item(
            item("CHI00001", "conferencePaper", "Full paper", "Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["proposed_tags"], ["CHI", "浙大-A", "CCF-A"])

    def test_chi_poster_withholds_ranks(self):
        result = tagger.classify_item(
            item("CHI00002", "conferencePaper", "Poster", "Proceedings of the Extended Abstracts of the 2026 CHI Conference on Human Factors in Computing Systems", "10.1145/3772363.3798404"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["proposed_tags"], ["CHI", "EA-Poster"])

    def test_dis_direct_zju_grade_wins(self):
        result = tagger.classify_item(
            item("DIS00001", "conferencePaper", "Main paper", "Proceedings of the 2025 ACM Designing Interactive Systems Conference"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["proposed_tags"], ["DIS", "浙大-B", "CCF-C"])
        self.assertEqual(result["zju_basis"], "direct")

    def test_ccf_fallback_supplies_zju_grade(self):
        result = tagger.classify_item(
            item("UIST0001", "conferencePaper", "Main paper", "Proceedings of the 2025 ACM Symposium on User Interface Software and Technology"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["proposed_tags"], ["UIST", "浙大-A", "CCF-A"])
        self.assertEqual(result["zju_basis"], "ccf-fallback")

    def test_ijhci(self):
        result = tagger.classify_item(
            item("IJHCI001", "journalArticle", "Article", "International Journal of Human-Computer Interaction"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["proposed_tags"], ["IJHCI", "浙大-B", "CCF-B"])

    def test_pacmhci_cscw_issue_is_cscw(self):
        result = tagger.classify_item(
            item("CSCW0001", "journalArticle", "Article", "Proceedings of the ACM on Human-Computer Interaction", pages="CSCW465:1-39"),
            RULES,
            OVERRIDES,
        )
        self.assertEqual(result["venue"], "CSCW")
        self.assertEqual(result["proposed_tags"], ["CSCW", "浙大-A", "CCF-A"])

    def test_existing_tags_are_preserved_and_deduplicated(self):
        source = item(
            "CHI00003",
            "conferencePaper",
            "Full paper",
            "Proceedings of the 2025 CHI Conference on Human Factors in Computing Systems",
            tags=[{"tag": "reading"}, {"tag": "CHI"}],
        )
        result = tagger.classify_item(source, RULES, OVERRIDES)
        self.assertEqual(result["add_tags"], ["浙大-A", "CCF-A"])
        merged = tagger.merge_tag_objects(source["data"]["tags"], result["add_tags"])
        self.assertEqual([row["tag"] for row in merged], ["reading", "CHI", "浙大-A", "CCF-A"])

    def test_plan_round_trip(self):
        rows = tagger.build_plan(
            [item("DIS00002", "conferencePaper", "Paper", "Proceedings of the 2025 ACM Designing Interactive Systems Conference")],
            RULES,
            OVERRIDES,
        )
        document = tagger.plan_document(rows, "server-1", RULES)
        with tempfile.TemporaryDirectory() as tmp:
            path = tagger.save_plan(Path(tmp) / "plan.json", document)
            loaded = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(loaded["server_id"], "server-1")
        self.assertEqual(loaded["items"][0]["add_tags"], ["DIS", "浙大-B", "CCF-C"])


if __name__ == "__main__":
    unittest.main()
