import unittest
from datetime import datetime, timezone

from app.services.computed_fields import ComputedFieldsEngine, build_computed_fields_engine


class ComputedFieldsTests(unittest.TestCase):
    def test_computed_field_expression(self) -> None:
        engine = ComputedFieldsEngine(
            [
                {
                    "id": "field-1",
                    "fieldKey": "is_equal",
                    "expression": "(date({{FactDateEnd}}) == date({{UpdatedAt}})) ? 1 : 0",
                    "resultType": "number",
                }
            ]
        )
        records = [
            {"FactDateEnd": "2024-01-01", "UpdatedAt": "2024-01-01T12:00:00Z"},
            {"FactDateEnd": "2024-01-02", "UpdatedAt": "2024-01-01T12:00:00Z"},
        ]
        engine.apply(records)
        self.assertEqual(records[0]["is_equal"], 1.0)
        self.assertEqual(records[1]["is_equal"], 0.0)
        self.assertEqual(engine.warnings, [])

    def test_computed_field_parse_error(self) -> None:
        engine = ComputedFieldsEngine(
            [
                {
                    "id": "bad",
                    "fieldKey": "bad_field",
                    "expression": "{{value}} +",
                    "resultType": "number",
                }
            ]
        )
        records = [{"value": 1}]
        engine.apply(records)
        self.assertIsNone(records[0]["bad_field"])
        self.assertTrue(engine.warnings)


class ComputedFieldsTimeFunctionsTests(unittest.TestCase):
    def test_time_functions(self) -> None:
        engine = ComputedFieldsEngine(
            [
                {
                    "id": "ts-start",
                    "fieldKey": "start_ts",
                    "expression": "ts({{start}})",
                    "resultType": "number",
                },
                {
                    "id": "ts-start-ms",
                    "fieldKey": "start_ts_ms",
                    "expression": "ts({{start_ms}})",
                    "resultType": "number",
                },
                {
                    "id": "diff-hours",
                    "fieldKey": "diff_hours",
                    "expression": "datediff({{start}}, {{end}}, \"hours\")",
                    "resultType": "number",
                },
                {
                    "id": "diff-days",
                    "fieldKey": "diff_days",
                    "expression": "days_between({{start}}, {{end}})",
                    "resultType": "number",
                },
                {
                    "id": "diff-ms",
                    "fieldKey": "diff_ms",
                    "expression": "datediff({{start_ms}}, {{end_ms}}, \"ms\")",
                    "resultType": "number",
                },
                {
                    "id": "diff-hours-between",
                    "fieldKey": "diff_hours_between",
                    "expression": "hours_between({{start_ms}}, {{end_ms}})",
                    "resultType": "number",
                },
            ]
        )
        records = [
            {
                "start": "2024-01-01T00:00:00Z",
                "end": "2024-01-02T12:00:00Z",
                "start_ms": 0,
                "end_ms": 3600000,
            }
        ]
        engine.apply(records)
        record = records[0]
        expected_ts = datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp() * 1000.0
        self.assertAlmostEqual(record["start_ts"], expected_ts)
        self.assertEqual(record["start_ts_ms"], 0.0)
        self.assertEqual(record["diff_hours"], 36.0)
        self.assertEqual(record["diff_days"], 1.5)
        self.assertEqual(record["diff_ms"], 3600000.0)
        self.assertEqual(record["diff_hours_between"], 1.0)


class ComputedFieldsExtractionTests(unittest.TestCase):
    def test_extracts_from_body(self) -> None:
        remote_source = {
            "body": {
                "__computedFields": [
                    {
                        "id": "field-2",
                        "fieldKey": "sum_value",
                        "expression": "{{a}} + {{b}}",
                        "resultType": "number",
                    }
                ]
            }
        }
        engine = build_computed_fields_engine(remote_source)
        self.assertIsNotNone(engine)
        records = [{"a": 1, "b": 2}]
        engine.apply(records)
        self.assertEqual(records[0]["sum_value"], 3.0)

    def test_explicit_computed_fields_override_raw_body_duplicates(self) -> None:
        remote_source = {
            "computedFields": [
                {
                    "fieldKey": "score",
                    "expression": "1",
                    "resultType": "number",
                }
            ],
            "rawBody": '{"__computedFields":[{"fieldKey":"score","expression":"0","resultType":"number"}]}',
        }
        engine = build_computed_fields_engine(remote_source)
        self.assertIsNotNone(engine)
        records = [{}]
        engine.apply(records)
        self.assertEqual(records[0]["score"], 1.0)

    def test_explicit_empty_computed_fields_do_not_fallback_to_raw_body(self) -> None:
        remote_source = {
            "computedFields": [],
            "rawBody": '{"__computedFields":[{"fieldKey":"score","expression":"1","resultType":"number"}]}',
        }
        engine = build_computed_fields_engine(remote_source)
        self.assertIsNone(engine)


if __name__ == "__main__":
    unittest.main()
