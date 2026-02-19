import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from app.models.remote_source import RemoteSource
from app.services.join_service import (
    apply_prepared_join_lookups,
    apply_prepared_joins,
    prepare_joins,
    prepare_joins_streaming,
    resolve_joins,
)
from app.services.source_registry import SourceConfig


class JoinAggregateTests(unittest.TestCase):
    def test_resolve_joins_respects_explicit_empty_in_body(self) -> None:
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={"__joins": []},
            rawBody='{"__joins":[{"id":"stale"}]}',
        )
        joins = asyncio.run(resolve_joins(remote_source))
        self.assertEqual(joins, [])

    def test_prepare_joins_invalid_group_by(self) -> None:
        join = {
            "id": "bad-aggregate",
            "targetSourceId": "defects",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "def",
            "aggregate": {
                "groupBy": ["object_id", "extra"],
                "metrics": [
                    {"key": "defect_cnt", "sourceKey": "defect_id", "op": "count"}
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="defects",
            url="https://example.com/defects",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=[]),
        ):
            with self.assertRaises(ValueError):
                asyncio.run(prepare_joins(remote_source))

    def test_prepare_joins_aggregates(self) -> None:
        join_rows = [
            {"object_id": 1, "defect_id": "d1", "is_repeat": 1},
            {"object_id": 1, "defect_id": "d2", "is_repeat": 0},
            {"object_id": 2, "defect_id": "d3", "is_repeat": 1},
            {"object_id": 2, "defect_id": "d3", "is_repeat": 1},
        ]
        join = {
            "id": "defects_by_object",
            "targetSourceId": "defects",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "def",
            "fields": ["defect_cnt"],
            "aggregate": {
                "groupBy": ["object_id"],
                "metrics": [
                    {"key": "defect_cnt", "sourceKey": "defect_id", "op": "count"},
                    {
                        "key": "defect_cnt_distinct",
                        "sourceKey": "defect_id",
                        "op": "count_distinct",
                    },
                    {"key": "repeat_cnt", "sourceKey": "is_repeat", "op": "sum"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="defects",
            url="https://example.com/defects",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=join_rows),
        ):
            prepared = asyncio.run(prepare_joins(remote_source))

        self.assertEqual(len(prepared), 1)
        aggregated = sorted(prepared[0].rows, key=lambda row: row["object_id"])
        self.assertEqual(aggregated[0]["defect_cnt"], 2)
        self.assertEqual(aggregated[0]["defect_cnt_distinct"], 2)
        self.assertEqual(aggregated[0]["repeat_cnt"], 1)
        self.assertEqual(aggregated[1]["defect_cnt"], 2)
        self.assertEqual(aggregated[1]["defect_cnt_distinct"], 1)
        self.assertEqual(aggregated[1]["repeat_cnt"], 2)

        base_rows = [{"object_id": 1}, {"object_id": 2}, {"object_id": 3}]
        merged_rows, _ = apply_prepared_joins(base_rows, prepared)
        row1 = next(row for row in merged_rows if row["object_id"] == 1)
        row2 = next(row for row in merged_rows if row["object_id"] == 2)
        row3 = next(row for row in merged_rows if row["object_id"] == 3)

        self.assertEqual(row1["def.defect_cnt"], 2)
        self.assertEqual(row1["def.defect_cnt_distinct"], 2)
        self.assertEqual(row1["def.repeat_cnt"], 1)
        self.assertEqual(row2["def.defect_cnt"], 2)
        self.assertEqual(row2["def.defect_cnt_distinct"], 1)
        self.assertEqual(row2["def.repeat_cnt"], 2)
        self.assertNotIn("def.defect_cnt", row3)

    def test_prepare_joins_streaming_aggregates(self) -> None:
        join_rows = [
            {"object_id": 1, "defect_id": "d1", "is_repeat": 1},
            {"object_id": 1, "defect_id": "d2", "is_repeat": 0},
            {"object_id": 2, "defect_id": "d3", "is_repeat": 1},
            {"object_id": 2, "defect_id": "d3", "is_repeat": 1},
        ]
        join = {
            "id": "defects_by_object",
            "targetSourceId": "defects",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "def",
            "fields": ["defect_cnt"],
            "aggregate": {
                "groupBy": ["object_id"],
                "metrics": [
                    {"key": "defect_cnt", "sourceKey": "defect_id", "op": "count"},
                    {
                        "key": "defect_cnt_distinct",
                        "sourceKey": "defect_id",
                        "op": "distinct",
                    },
                    {"key": "repeat_cnt", "sourceKey": "is_repeat", "op": "sum"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="defects",
            url="https://example.com/defects",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        async def fake_iter_records(*_args, **_kwargs):
            yield join_rows[:2]
            yield join_rows[2:]

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_iter_records",
            new=fake_iter_records,
        ):
            prepared = asyncio.run(prepare_joins_streaming(remote_source, chunk_size=2))

        base_rows = [{"object_id": 1}, {"object_id": 2}, {"object_id": 3}]
        merged_rows, _ = apply_prepared_join_lookups(base_rows, prepared)
        row1 = next(row for row in merged_rows if row["object_id"] == 1)
        row2 = next(row for row in merged_rows if row["object_id"] == 2)
        row3 = next(row for row in merged_rows if row["object_id"] == 3)

        self.assertEqual(row1["def.defect_cnt"], 2)
        self.assertEqual(row1["def.defect_cnt_distinct"], 2)
        self.assertEqual(row1["def.repeat_cnt"], 1)
        self.assertEqual(row2["def.defect_cnt"], 2)
        self.assertEqual(row2["def.defect_cnt_distinct"], 1)
        self.assertEqual(row2["def.repeat_cnt"], 2)
        self.assertNotIn("def.defect_cnt", row3)

    def test_prepare_joins_value_aggregate_returns_none_when_ambiguous(self) -> None:
        join_rows = [
            {"object_id": 1, "status": "open"},
            {"object_id": 1, "status": "open"},
            {"object_id": 2, "status": "open"},
            {"object_id": 2, "status": "closed"},
        ]
        join = {
            "id": "status_by_object",
            "targetSourceId": "defects",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "def",
            "aggregate": {
                "groupBy": "object_id",
                "metrics": [
                    {"key": "last_status", "sourceKey": "status", "op": "value"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="defects",
            url="https://example.com/defects",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=join_rows),
        ):
            prepared = asyncio.run(prepare_joins(remote_source))

        aggregated = sorted(prepared[0].rows, key=lambda row: row["object_id"])
        self.assertEqual(aggregated[0]["last_status"], "open")
        self.assertIsNone(aggregated[1]["last_status"])

    def test_prepare_joins_applies_join_computed_fields_before_aggregate(self) -> None:
        join_rows = [
            {"object_id": 1, "start": "2025-01-01T00:00:00Z", "end": "2025-01-01T01:00:00Z"},
            {"object_id": 1, "start": "2025-01-01T01:00:00Z", "end": "2025-01-01T02:30:00Z"},
        ]
        join = {
            "id": "duration_by_object",
            "targetSourceId": "events",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "ev",
            "aggregate": {
                "groupBy": ["object_id"],
                "metrics": [
                    {"key": "duration_hours", "sourceKey": "duration", "op": "sum"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="events",
            url="https://example.com/events",
            method="POST",
            body={
                "__computedFields": [
                    {
                        "fieldKey": "duration",
                        "expression": "hours_between({{start}}, {{end}})",
                        "resultType": "number",
                    }
                ]
            },
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=join_rows),
        ):
            prepared = asyncio.run(prepare_joins(remote_source))

        self.assertEqual(prepared[0].rows[0]["duration_hours"], 2.5)

    def test_prepare_joins_preagg_count_distinct_with_computed_month_field(self) -> None:
        join_rows = [
            {"objObject": 1, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-01-10"},
            {"objObject": 1, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-01-20"},
            {"objObject": 1, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-02-01"},
            {"objObject": 2, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-01-05"},
            {"objObject": 3, "nameClsWork": "Не осмотры", "FactDateEnd": "2026-01-07"},
        ]
        join = {
            "id": "plan_by_object",
            "targetSourceId": "plan",
            "primaryKey": "id",
            "foreignKey": "objObject",
            "joinType": "left",
            "resultPrefix": "PLAN",
            "aggregate": {
                "groupBy": ["objObject"],
                "metrics": [
                    {"key": "plan_2026_01", "sourceKey": "inspect_obj_2026_01", "op": "count_distinct"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="plan",
            url="https://example.com/plan",
            method="POST",
            body={
                "__computedFields": [
                    {
                        "fieldKey": "is_inspection",
                        "expression": '({{nameClsWork}} == "Осмотры и проверки") ? 1 : 0',
                        "resultType": "number",
                    },
                    {
                        "fieldKey": "inspect_obj_2026_01",
                        "expression": '({{is_inspection}} == 1 && date({{FactDateEnd}}) >= date("2026-01-01") && date({{FactDateEnd}}) <= date("2026-01-31")) ? {{objObject}} : null',
                        "resultType": "number",
                    },
                ]
            },
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=join_rows),
        ):
            prepared = asyncio.run(prepare_joins(remote_source))

        aggregated = sorted(prepared[0].rows, key=lambda row: row["objObject"])
        by_object = {row["objObject"]: row for row in aggregated}
        self.assertEqual(by_object[1]["plan_2026_01"], 1)
        self.assertEqual(by_object[2]["plan_2026_01"], 1)
        self.assertEqual(by_object[3]["plan_2026_01"], 0)

    def test_prepare_joins_count_distinct_ignores_empty_and_none(self) -> None:
        join_rows = [
            {"object_id": 1, "defect_id": "d1"},
            {"object_id": 1, "defect_id": ""},
            {"object_id": 1, "defect_id": None},
        ]
        join = {
            "id": "defects_by_object",
            "targetSourceId": "defects",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "def",
            "aggregate": {
                "groupBy": ["object_id"],
                "metrics": [
                    {"key": "defect_cnt_distinct", "sourceKey": "defect_id", "op": "count_distinct"},
                ],
            },
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="defects",
            url="https://example.com/defects",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )

        with patch(
            "app.services.join_service.get_source_config",
            new=AsyncMock(return_value=config),
        ), patch(
            "app.services.join_service.async_load_records",
            new=AsyncMock(return_value=join_rows),
        ):
            prepared = asyncio.run(prepare_joins(remote_source))

        self.assertEqual(prepared[0].rows[0]["defect_cnt_distinct"], 1)


if __name__ == "__main__":
    unittest.main()
