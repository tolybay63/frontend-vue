import unittest

from app.services.pivot_core import build_pivot_view


class PivotCountDistinctTests(unittest.TestCase):
    def test_count_distinct(self) -> None:
        records = [
            {"group": "A", "item": "x"},
            {"group": "A", "item": "x"},
            {"group": "A", "item": "y"},
            {"group": "A", "item": None},
            {"group": "A", "item": ""},
            {"group": "A", "item": 1},
            {"group": "A", "item": True},
            {"group": "A", "item": {"k": 1, "b": 2}},
            {"group": "A", "item": {"b": 2, "k": 1}},
            {"group": "B", "item": "x"},
            {"group": "B", "item": ["a", 1]},
            {"group": "B", "item": ["a", 1]},
        ]
        snapshot = {
            "pivot": {"rows": ["group"], "columns": [], "filters": []},
            "metrics": [
                {
                    "key": "item__count_distinct",
                    "sourceKey": "item",
                    "op": "count_distinct",
                },
                {
                    "key": "item__distinct",
                    "sourceKey": "item",
                    "op": "distinct",
                },
            ],
        }

        result = build_pivot_view(records, snapshot)
        rows_by_group = {row["values"][0]: row for row in result["rows"]}

        self.assertEqual(rows_by_group["A"]["cells"][0]["value"], 5)
        self.assertEqual(rows_by_group["B"]["cells"][0]["value"], 2)
        self.assertEqual(rows_by_group["A"]["cells"][1]["value"], 5)
        self.assertEqual(rows_by_group["B"]["cells"][1]["value"], 2)
        self.assertEqual(result["totals"]["item__count_distinct"], 6)
        self.assertEqual(result["totals"]["item__distinct"], 6)

    def test_sum_for_dotted_join_keys(self) -> None:
        records = [
            {"group": "A", "PLAN.plan_evt_2026_01": 5, "PLAN.plan_obj_2026_01": 1},
            {"group": "A", "PLAN.plan_evt_2026_01": 2, "PLAN.plan_obj_2026_01": 1},
            {"group": "B", "PLAN.plan_evt_2026_01": 3, "PLAN.plan_obj_2026_01": 0},
        ]
        snapshot = {
            "pivot": {"rows": ["group"], "columns": [], "filters": []},
            "metrics": [
                {
                    "fieldKey": "PLAN.plan_evt_2026_01",
                    "aggregator": "sum",
                },
                {
                    "fieldKey": "PLAN.plan_obj_2026_01",
                    "aggregator": "sum",
                },
            ],
        }

        result = build_pivot_view(records, snapshot)
        rows_by_group = {row["values"][0]: row for row in result["rows"]}

        self.assertEqual(rows_by_group["A"]["cells"][0]["value"], 7.0)
        self.assertEqual(rows_by_group["A"]["cells"][1]["value"], 2.0)
        self.assertEqual(rows_by_group["B"]["cells"][0]["value"], 3.0)
        self.assertEqual(rows_by_group["B"]["cells"][1]["value"], 0.0)
        self.assertEqual(result["totals"]["PLAN.plan_evt_2026_01__sum"], 10.0)
        self.assertEqual(result["totals"]["PLAN.plan_obj_2026_01__sum"], 2.0)


if __name__ == "__main__":
    unittest.main()
