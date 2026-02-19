import json
import os
import unittest

import asyncio
from unittest.mock import AsyncMock, patch

import httpx
import respx

from app.main import app
from app.models.view_request import ViewRequest
from app.services.filter_service import apply_filters
from app.services import record_cache
from app.services.records_pipeline import build_records_pipeline
from app.services.source_registry import SourceConfig
from app.services.view_service import build_view
from app.storage.job_store import get_job_store


class ApiIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self._allowlist = os.environ.get("REPORT_REMOTE_ALLOWLIST")
        self._redis_url = os.environ.get("REDIS_URL")
        self._upstream_base = os.environ.get("UPSTREAM_BASE_URL")
        self._max_records = os.environ.get("REPORT_MAX_RECORDS")
        self._async_reports = os.environ.get("ASYNC_REPORTS")
        self._report_streaming = os.environ.get("REPORT_STREAMING")
        self._report_chunk_size = os.environ.get("REPORT_CHUNK_SIZE")
        self._report_streaming_max_groups = os.environ.get("REPORT_STREAMING_MAX_GROUPS")
        self._report_streaming_max_unique = os.environ.get("REPORT_STREAMING_MAX_UNIQUE_VALUES_PER_DIM")
        self._report_join_lookup_max_keys = os.environ.get("REPORT_JOIN_LOOKUP_MAX_KEYS")
        self._report_paging_allowlist = os.environ.get("REPORT_PAGING_ALLOWLIST")
        self._report_paging_max_pages = os.environ.get("REPORT_PAGING_MAX_PAGES")
        self._report_upstream_paging = os.environ.get("REPORT_UPSTREAM_PAGING")
        self._pushdown_enabled = os.environ.get("REPORT_UPSTREAM_PUSHDOWN")
        self._pushdown_allowlist = os.environ.get("REPORT_PUSHDOWN_ALLOWLIST")
        self._pushdown_max_filters = os.environ.get("REPORT_PUSHDOWN_MAX_FILTERS")
        self._pushdown_max_in_values = os.environ.get("REPORT_PUSHDOWN_MAX_IN_VALUES")
        self._pushdown_safe_only = os.environ.get("REPORT_PUSHDOWN_SAFE_ONLY")
        self._pushdown_override = os.environ.get("REPORT_PUSHDOWN_OVERRIDE")
        self._pivot_parity_joins = os.environ.get("PIVOT_PARITY_JOINS")
        os.environ["REPORT_REMOTE_ALLOWLIST"] = "example.com"
        os.environ.pop("REDIS_URL", None)
        os.environ["UPSTREAM_BASE_URL"] = "http://example.com"
        os.environ.pop("REPORT_MAX_RECORDS", None)
        os.environ["ASYNC_REPORTS"] = "0"
        os.environ["REPORT_STREAMING"] = "0"
        os.environ["REPORT_STREAMING_MAX_GROUPS"] = "200000"
        os.environ["REPORT_STREAMING_MAX_UNIQUE_VALUES_PER_DIM"] = "0"
        os.environ["REPORT_JOIN_LOOKUP_MAX_KEYS"] = "2000000"
        os.environ.pop("REPORT_PAGING_ALLOWLIST", None)
        os.environ.pop("REPORT_PAGING_MAX_PAGES", None)
        os.environ.pop("REPORT_UPSTREAM_PAGING", None)
        os.environ["REPORT_UPSTREAM_PUSHDOWN"] = "0"
        os.environ.pop("REPORT_PUSHDOWN_ALLOWLIST", None)
        os.environ.pop("REPORT_PUSHDOWN_MAX_FILTERS", None)
        os.environ.pop("REPORT_PUSHDOWN_MAX_IN_VALUES", None)
        os.environ.pop("REPORT_PUSHDOWN_SAFE_ONLY", None)
        os.environ.pop("REPORT_PUSHDOWN_OVERRIDE", None)
        os.environ["PIVOT_PARITY_JOINS"] = "0"
        record_cache._STORE.clear()

    def tearDown(self) -> None:
        if self._allowlist is None:
            os.environ.pop("REPORT_REMOTE_ALLOWLIST", None)
        else:
            os.environ["REPORT_REMOTE_ALLOWLIST"] = self._allowlist
        if self._redis_url is None:
            os.environ.pop("REDIS_URL", None)
        else:
            os.environ["REDIS_URL"] = self._redis_url
        if self._upstream_base is None:
            os.environ.pop("UPSTREAM_BASE_URL", None)
        else:
            os.environ["UPSTREAM_BASE_URL"] = self._upstream_base
        if self._max_records is None:
            os.environ.pop("REPORT_MAX_RECORDS", None)
        else:
            os.environ["REPORT_MAX_RECORDS"] = self._max_records
        if self._async_reports is None:
            os.environ.pop("ASYNC_REPORTS", None)
        else:
            os.environ["ASYNC_REPORTS"] = self._async_reports
        if self._report_streaming is None:
            os.environ.pop("REPORT_STREAMING", None)
        else:
            os.environ["REPORT_STREAMING"] = self._report_streaming
        if self._report_chunk_size is None:
            os.environ.pop("REPORT_CHUNK_SIZE", None)
        else:
            os.environ["REPORT_CHUNK_SIZE"] = self._report_chunk_size
        if self._report_streaming_max_groups is None:
            os.environ.pop("REPORT_STREAMING_MAX_GROUPS", None)
        else:
            os.environ["REPORT_STREAMING_MAX_GROUPS"] = self._report_streaming_max_groups
        if self._report_streaming_max_unique is None:
            os.environ.pop("REPORT_STREAMING_MAX_UNIQUE_VALUES_PER_DIM", None)
        else:
            os.environ["REPORT_STREAMING_MAX_UNIQUE_VALUES_PER_DIM"] = self._report_streaming_max_unique
        if self._report_join_lookup_max_keys is None:
            os.environ.pop("REPORT_JOIN_LOOKUP_MAX_KEYS", None)
        else:
            os.environ["REPORT_JOIN_LOOKUP_MAX_KEYS"] = self._report_join_lookup_max_keys
        if self._report_paging_allowlist is None:
            os.environ.pop("REPORT_PAGING_ALLOWLIST", None)
        else:
            os.environ["REPORT_PAGING_ALLOWLIST"] = self._report_paging_allowlist
        if self._report_paging_max_pages is None:
            os.environ.pop("REPORT_PAGING_MAX_PAGES", None)
        else:
            os.environ["REPORT_PAGING_MAX_PAGES"] = self._report_paging_max_pages
        if self._report_upstream_paging is None:
            os.environ.pop("REPORT_UPSTREAM_PAGING", None)
        else:
            os.environ["REPORT_UPSTREAM_PAGING"] = self._report_upstream_paging
        if self._pushdown_enabled is None:
            os.environ.pop("REPORT_UPSTREAM_PUSHDOWN", None)
        else:
            os.environ["REPORT_UPSTREAM_PUSHDOWN"] = self._pushdown_enabled
        if self._pushdown_allowlist is None:
            os.environ.pop("REPORT_PUSHDOWN_ALLOWLIST", None)
        else:
            os.environ["REPORT_PUSHDOWN_ALLOWLIST"] = self._pushdown_allowlist
        if self._pushdown_max_filters is None:
            os.environ.pop("REPORT_PUSHDOWN_MAX_FILTERS", None)
        else:
            os.environ["REPORT_PUSHDOWN_MAX_FILTERS"] = self._pushdown_max_filters
        if self._pushdown_max_in_values is None:
            os.environ.pop("REPORT_PUSHDOWN_MAX_IN_VALUES", None)
        else:
            os.environ["REPORT_PUSHDOWN_MAX_IN_VALUES"] = self._pushdown_max_in_values
        if self._pushdown_safe_only is None:
            os.environ.pop("REPORT_PUSHDOWN_SAFE_ONLY", None)
        else:
            os.environ["REPORT_PUSHDOWN_SAFE_ONLY"] = self._pushdown_safe_only
        if self._pushdown_override is None:
            os.environ.pop("REPORT_PUSHDOWN_OVERRIDE", None)
        else:
            os.environ["REPORT_PUSHDOWN_OVERRIDE"] = self._pushdown_override
        if self._pivot_parity_joins is None:
            os.environ.pop("PIVOT_PARITY_JOINS", None)
        else:
            os.environ["PIVOT_PARITY_JOINS"] = self._pivot_parity_joins

    def _base_payload(self) -> dict:
        return {
            "templateId": "test-template",
            "remoteSource": {
                "url": "https://example.com/dtj/api/report",
                "method": "POST",
                "body": {"params": {"from": "test"}},
            },
            "snapshot": {
                "pivot": {
                    "rows": ["cls"],
                    "columns": ["year"],
                    "filters": ["cls"],
                },
                "metrics": [
                    {"key": "value__sum", "sourceKey": "value", "op": "sum"},
                ],
                "fieldMeta": {},
            },
            "filters": {"globalFilters": {}, "containerFilters": {}},
        }

    def _mock_upstream(self) -> respx.MockRouter:
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(
                200,
                json={
                    "result": {
                        "records": [
                            {"cls": "A", "year": 2024, "value": 10, "count": 1},
                            {"cls": "B", "year": 2024, "value": 20, "count": 2},
                        ]
                    }
                },
            )
        )
        return router

    async def _post(self, path: str, payload: dict) -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.post(path, json=payload)

    async def _get(self, path: str) -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            return await client.get(path)

    def test_report_view_shape(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("view", data)
            self.assertIn("chart", data)
            self.assertIsInstance(data["view"], dict)
            self.assertIsInstance(data["chart"], dict)
            self.assertIn("type", data["chart"])
            self.assertIn("data", data["chart"])
        finally:
            router.__exit__(None, None, None)

    def test_report_view_without_joins_is_unchanged_with_parity_flag(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            os.environ["PIVOT_PARITY_JOINS"] = "0"
            baseline = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(baseline.status_code, 200)
            baseline_json = baseline.json()

            os.environ["PIVOT_PARITY_JOINS"] = "1"
            parity = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(parity.status_code, 200)
            parity_json = parity.json()

            self.assertEqual(baseline_json["view"], parity_json["view"])
            self.assertEqual(baseline_json["chart"], parity_json["chart"])
        finally:
            router.__exit__(None, None, None)

    def test_report_view_parity_fallback_to_legacy_on_failure(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload["remoteSource"] = dict(payload["remoteSource"])
            payload["remoteSource"]["computedFields"] = [
                {
                    "fieldKey": "computed_value",
                    "expression": "number({{value}})",
                    "resultType": "number",
                }
            ]
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.report_view_builder.build_records_pipeline",
                side_effect=RuntimeError("parity failed"),
            ):
                response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("view", data)
            self.assertIn("totals", data["view"])
            self.assertEqual(data["view"]["totals"]["value__sum"], 30.0)
        finally:
            router.__exit__(None, None, None)

    def test_report_view_parity_computes_fields_after_join(self) -> None:
        base_records = [
            {"id": 1, "value": 10},
            {"id": 2, "value": 20},
        ]
        join_records = [
            {"id": 1, "plan": 10},
            {"id": 1, "plan": 20},
            {"id": 2, "plan": 7},
        ]
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(200, json={"result": {"records": base_records}})
        )
        router.post("https://example.com/dtj/api/join-plan").mock(
            return_value=httpx.Response(200, json={"result": {"records": join_records}})
        )
        payload = self._base_payload()
        payload["snapshot"]["pivot"] = {"rows": [], "columns": [], "filters": []}
        payload["snapshot"]["metrics"] = [
            {"key": "ratio__sum", "sourceKey": "ratio", "op": "sum"},
            {"key": "PLAN.plan_sum__sum", "sourceKey": "PLAN.plan_sum", "op": "sum"},
        ]
        payload["remoteSource"] = dict(payload["remoteSource"])
        payload["remoteSource"]["computedFields"] = [
            {
                "fieldKey": "ratio",
                "expression": "number({{PLAN.plan_sum}}) / number({{value}})",
                "resultType": "number",
            }
        ]
        payload["remoteSource"]["joins"] = [
            {
                "id": "join-plan",
                "targetSourceId": "join-plan-source",
                "primaryKey": "id",
                "foreignKey": "id",
                "joinType": "left",
                "resultPrefix": "PLAN",
                "aggregate": {
                    "groupBy": ["id"],
                    "metrics": [
                        {"key": "plan_sum", "sourceKey": "plan", "op": "sum"},
                    ],
                },
            }
        ]
        source_config = SourceConfig(
            source_id="join-plan-source",
            url="https://example.com/dtj/api/join-plan",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )
        try:
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                parity_response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(parity_response.status_code, 200)
            parity_json = parity_response.json()
            self.assertAlmostEqual(parity_json["view"]["totals"]["PLAN.plan_sum__sum"], 37.0)
            self.assertAlmostEqual(parity_json["view"]["totals"]["ratio__sum"], 3.35)

            os.environ["PIVOT_PARITY_JOINS"] = "0"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                legacy_response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(legacy_response.status_code, 200)
            legacy_json = legacy_response.json()
            self.assertIsNone(legacy_json["view"]["totals"]["ratio__sum"])
        finally:
            router.__exit__(None, None, None)

    def test_report_view_parity_matches_constructor_preview_with_join_preagg(self) -> None:
        base_records = [
            {"id": 1, "nameObjectType": "A", "nameSection": "S1", "fullName": "A-1"},
            {"id": 2, "nameObjectType": "A", "nameSection": "S1", "fullName": "A-2"},
            {"id": 3, "nameObjectType": "B", "nameSection": "S2", "fullName": "B-1"},
        ]
        plan_records = [
            {"objObject": 1, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-01-10"},
            {"objObject": 1, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-02-05"},
            {"objObject": 2, "nameClsWork": "Осмотры и проверки", "FactDateEnd": "2026-01-15"},
            {"objObject": 2, "nameClsWork": "Прочее", "FactDateEnd": "2026-02-10"},
            {"objObject": 3, "nameClsWork": "Прочее", "FactDateEnd": "2026-01-12"},
        ]
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(200, json={"result": {"records": base_records}})
        )
        router.post("https://example.com/dtj/api/plan").mock(
            return_value=httpx.Response(200, json={"result": {"records": plan_records}})
        )
        payload = {
            "templateId": "kpi-preview-parity",
            "remoteSource": {
                "url": "https://example.com/dtj/api/report",
                "method": "POST",
                "body": {"params": {"from": "test"}},
                "computedFields": [
                    {
                        "fieldKey": "has_jan_plan",
                        "expression": "(number({{PLAN.plan_2026_01}}) > 0) ? 1 : 0",
                        "resultType": "number",
                    }
                ],
                "joins": [
                    {
                        "id": "join-plan",
                        "targetSourceId": "plan-source",
                        "primaryKey": "id",
                        "foreignKey": "objObject",
                        "joinType": "left",
                        "resultPrefix": "PLAN",
                        "aggregate": {
                            "groupBy": ["objObject"],
                            "metrics": [
                                {"key": "plan_2026_01", "sourceKey": "inspect_obj_2026_01", "op": "count_distinct"},
                                {"key": "plan_2026_02", "sourceKey": "inspect_obj_2026_02", "op": "count_distinct"},
                            ],
                        },
                    }
                ],
            },
            "snapshot": {
                "pivot": {"rows": ["nameObjectType"], "columns": [], "filters": []},
                "metrics": [
                    {"id": "metric-objects", "fieldKey": "id", "aggregator": "count_distinct"},
                    {"id": "metric-jan", "fieldKey": "PLAN.plan_2026_01", "aggregator": "sum"},
                    {"id": "metric-feb", "fieldKey": "PLAN.plan_2026_02", "aggregator": "sum"},
                    {"id": "metric-has-jan", "fieldKey": "has_jan_plan", "aggregator": "sum"},
                ],
                "fieldMeta": {},
            },
            "filters": {"globalFilters": {}, "containerFilters": {}},
        }
        source_config = SourceConfig(
            source_id="plan-source",
            url="https://example.com/dtj/api/plan",
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
                    {
                        "fieldKey": "inspect_obj_2026_02",
                        "expression": '({{is_inspection}} == 1 && date({{FactDateEnd}}) >= date("2026-02-01") && date({{FactDateEnd}}) <= date("2026-02-29")) ? {{objObject}} : null',
                        "resultType": "number",
                    },
                ]
            },
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )
        try:
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                response = asyncio.run(self._post("/api/report/view", payload))
                self.assertEqual(response.status_code, 200)
                api_view = response.json()["view"]

                preview_payload = ViewRequest(**payload)
                pipeline = asyncio.run(
                    build_records_pipeline(
                        preview_payload.remoteSource,
                        payload_filters=preview_payload.filters,
                        joins_override=preview_payload.remoteSource.joins,
                    )
                )
                preview_records, _ = apply_filters(
                    pipeline.records,
                    preview_payload.snapshot,
                    preview_payload.filters,
                )
                preview_view = build_view(preview_records, preview_payload.snapshot)

            def normalize_view(view: dict) -> dict:
                return {
                    "columns": [
                        {
                            "key": column.get("key"),
                            "label": column.get("label"),
                            "values": column.get("values"),
                        }
                        for column in view.get("columns", [])
                    ],
                    "rows": [
                        {
                            "key": row.get("key"),
                            "values": row.get("values"),
                            "cells": [
                                {"key": cell.get("key"), "value": cell.get("value")}
                                for cell in row.get("cells", [])
                            ],
                        }
                        for row in view.get("rows", [])
                    ],
                    "totals": view.get("totals"),
                }

            self.assertEqual(normalize_view(api_view), normalize_view(preview_view))
            self.assertGreater(api_view["totals"]["PLAN.plan_2026_01__sum"], 0)
        finally:
            router.__exit__(None, None, None)

    def test_report_view_join_metrics_evt_and_obj_are_not_lost(self) -> None:
        base_records = [
            {"id": 1, "nameSection": "S1"},
            {"id": 2, "nameSection": "S1"},
            {"id": 3, "nameSection": "S2"},
        ]
        plan_records = [
            {"objObject": 1, "evt_2026_01": 5, "evt_2026_02": 4, "obj_2026_01": 1, "obj_2026_02": 1},
            {"objObject": 2, "evt_2026_01": 2, "evt_2026_02": 3, "obj_2026_01": 1, "obj_2026_02": 1},
            {"objObject": 3, "evt_2026_01": 0, "evt_2026_02": 1, "obj_2026_01": None, "obj_2026_02": 1},
        ]
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(200, json={"result": {"records": base_records}})
        )
        router.post("https://example.com/dtj/api/plan").mock(
            return_value=httpx.Response(200, json={"result": {"records": plan_records}})
        )
        payload = {
            "templateId": "kpi-evt-obj",
            "remoteSource": {
                "url": "https://example.com/dtj/api/report",
                "method": "POST",
                "body": {"params": {"from": "test"}},
                "joins": [
                    {
                        "id": "join-plan",
                        "targetSourceId": "plan-source",
                        "primaryKey": "id",
                        "foreignKey": "objObject",
                        "joinType": "left",
                        "resultPrefix": "PLAN",
                        "aggregate": {
                            "groupBy": ["objObject"],
                            "metrics": [
                                {"key": "plan_evt_2026_01", "sourceKey": "evt_2026_01", "op": "sum"},
                                {"key": "plan_evt_2026_02", "sourceKey": "evt_2026_02", "op": "sum"},
                                {"key": "plan_obj_2026_01", "sourceKey": "obj_2026_01", "op": "count_distinct"},
                                {"key": "plan_obj_2026_02", "sourceKey": "obj_2026_02", "op": "count_distinct"},
                            ],
                        },
                    }
                ],
            },
            "snapshot": {
                "pivot": {"rows": ["nameSection"], "columns": [], "filters": []},
                "metrics": [
                    {"fieldKey": "PLAN.plan_evt_2026_01", "aggregator": "sum"},
                    {"fieldKey": "PLAN.plan_evt_2026_02", "aggregator": "sum"},
                    {"fieldKey": "PLAN.plan_obj_2026_01", "aggregator": "sum"},
                    {"fieldKey": "PLAN.plan_obj_2026_02", "aggregator": "sum"},
                ],
                "fieldMeta": {},
            },
            "filters": {"globalFilters": {}, "containerFilters": {}},
        }
        source_config = SourceConfig(
            source_id="plan-source",
            url="https://example.com/dtj/api/plan",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )
        try:
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()["view"]
            totals = data["totals"]
            self.assertGreater(totals["PLAN.plan_evt_2026_01__sum"], 0)
            self.assertGreater(totals["PLAN.plan_evt_2026_02__sum"], 0)
            self.assertGreater(totals["PLAN.plan_obj_2026_01__sum"], 0)
            self.assertGreater(totals["PLAN.plan_obj_2026_02__sum"], 0)
            row_by_section = {row["values"][0]: row for row in data["rows"]}
            s1_values = [cell["value"] for cell in row_by_section["S1"]["cells"]]
            self.assertIsNotNone(s1_values[0])
            self.assertIsNotNone(s1_values[1])
            self.assertGreater(s1_values[2], 0)
            self.assertGreater(s1_values[3], 0)
        finally:
            router.__exit__(None, None, None)

    def test_report_view_parity_exposes_join_computed_warnings(self) -> None:
        base_records = [{"id": 1, "nameSection": "S1"}]
        plan_records = [{"objObject": 1, "nameClsWork": "Осмотры и проверки"}]
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(200, json={"result": {"records": base_records}})
        )
        router.post("https://example.com/dtj/api/plan").mock(
            return_value=httpx.Response(200, json={"result": {"records": plan_records}})
        )
        payload = {
            "templateId": "kpi-join-warning",
            "remoteSource": {
                "url": "https://example.com/dtj/api/report",
                "method": "POST",
                "body": {"params": {"from": "test"}},
                "joins": [
                    {
                        "id": "join-plan",
                        "targetSourceId": "plan-source",
                        "primaryKey": "id",
                        "foreignKey": "objObject",
                        "joinType": "left",
                        "resultPrefix": "PLAN",
                        "aggregate": {
                            "groupBy": ["objObject"],
                            "metrics": [
                                {"key": "plan", "sourceKey": "inspect_obj_2026_01", "op": "count_distinct"},
                            ],
                        },
                    }
                ],
            },
            "snapshot": {
                "pivot": {"rows": ["nameSection"], "columns": [], "filters": []},
                "metrics": [{"fieldKey": "PLAN.plan", "aggregator": "sum"}],
                "fieldMeta": {},
            },
            "filters": {"globalFilters": {}, "containerFilters": {}},
        }
        source_config = SourceConfig(
            source_id="plan-source",
            url="https://example.com/dtj/api/plan",
            method="POST",
            body={
                "__computedFields": [
                    {
                        "fieldKey": "inspect_obj_2026_01",
                        "expression": '{{nameClsWork}} == "Осмотры и проверки") ? {{objObject}} : null',
                        "resultType": "number",
                    }
                ]
            },
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )
        try:
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()["view"]
            warnings = (data.get("meta") or {}).get("computedWarnings") or []
            self.assertTrue(warnings)
            self.assertEqual(warnings[0].get("joinId"), "join-plan")
        finally:
            router.__exit__(None, None, None)

    def test_report_view_parity_exposes_missing_join_aggregate_source_warning(self) -> None:
        base_records = [{"id": 1, "nameSection": "S1"}]
        plan_records = [{"objObject": 1, "present_field": 5}]
        router = respx.mock(assert_all_called=True)
        router.__enter__()
        router.post("https://example.com/dtj/api/report").mock(
            return_value=httpx.Response(200, json={"result": {"records": base_records}})
        )
        router.post("https://example.com/dtj/api/plan").mock(
            return_value=httpx.Response(200, json={"result": {"records": plan_records}})
        )
        payload = {
            "templateId": "kpi-missing-join-source",
            "remoteSource": {
                "url": "https://example.com/dtj/api/report",
                "method": "POST",
                "body": {"params": {"from": "test"}},
                "joins": [
                    {
                        "id": "join-plan",
                        "targetSourceId": "plan-source",
                        "primaryKey": "id",
                        "foreignKey": "objObject",
                        "joinType": "left",
                        "resultPrefix": "PLAN",
                        "aggregate": {
                            "groupBy": ["objObject"],
                            "metrics": [
                                {"key": "plan_evt_2026_01", "sourceKey": "evt_2026_01", "op": "sum"},
                            ],
                        },
                    }
                ],
            },
            "snapshot": {
                "pivot": {"rows": ["nameSection"], "columns": [], "filters": []},
                "metrics": [{"fieldKey": "PLAN.plan_evt_2026_01", "aggregator": "sum"}],
                "fieldMeta": {},
            },
            "filters": {"globalFilters": {}, "containerFilters": {}},
        }
        source_config = SourceConfig(
            source_id="plan-source",
            url="https://example.com/dtj/api/plan",
            method="POST",
            body={},
            raw_body=None,
            headers={"Content-Type": "application/json"},
        )
        try:
            os.environ["PIVOT_PARITY_JOINS"] = "1"
            with patch(
                "app.services.join_service.get_source_config",
                new=AsyncMock(return_value=source_config),
            ):
                response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()["view"]
            warnings = (data.get("meta") or {}).get("computedWarnings") or []
            self.assertTrue(warnings)
            warning = warnings[0]
            self.assertEqual(warning.get("joinId"), "join-plan")
            self.assertEqual(warning.get("stage"), "join-aggregate")
            self.assertIn("evt_2026_01", warning.get("message", ""))
        finally:
            router.__exit__(None, None, None)

    def test_report_view_streaming_matches_sync(self) -> None:
        records = [
            {"cls": "A", "year": 2024, "value": 10, "count": 1},
            {"cls": "B", "year": 2024, "value": 20, "count": 2},
            {"cls": "B", "year": 2023, "value": 5, "count": 1},
        ]
        router = respx.mock(assert_all_called=True)
        router.__enter__()

        def handler(request: httpx.Request) -> httpx.Response:
            payload = json.loads(request.content.decode("utf-8")) if request.content else {}
            paging = payload.get("paging")
            if not paging:
                return httpx.Response(200, json={"result": {"records": records}})
            offset = int(paging.get("offset", 0))
            limit = int(paging.get("limit", len(records)))
            page = records[offset : offset + limit]
            return httpx.Response(200, json={"result": {"records": page}})

        router.post("https://example.com/dtj/api/report").mock(side_effect=handler)
        try:
            payload = self._base_payload()
            os.environ["REPORT_STREAMING"] = "0"
            sync_response = asyncio.run(self._post("/api/report/view", payload))
            self.assertEqual(sync_response.status_code, 200)
            os.environ["REPORT_STREAMING"] = "1"
            os.environ["REPORT_CHUNK_SIZE"] = "1"
            os.environ["REPORT_PAGING_ALLOWLIST"] = "example.com"
            paged_payload = dict(payload)
            paged_payload["remoteSource"] = dict(payload["remoteSource"])
            paged_payload["remoteSource"]["body"] = dict(payload["remoteSource"]["body"])
            paged_payload["remoteSource"]["body"]["paging"] = {"limit": 1, "offset": 0}
            streaming_response = asyncio.run(self._post("/api/report/view", paged_payload))
            self.assertEqual(streaming_response.status_code, 200)
            self.assertEqual(sync_response.json(), streaming_response.json())
        finally:
            router.__exit__(None, None, None)

    def test_report_filters_shape(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            response = asyncio.run(self._post("/api/report/filters", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("options", data)
            self.assertIn("meta", data)
            self.assertIn("truncated", data)
            self.assertIsInstance(data["options"], dict)
            self.assertIsInstance(data["meta"], dict)
            self.assertIsInstance(data["truncated"], dict)
        finally:
            router.__exit__(None, None, None)

    def test_report_filters_without_joins_is_unchanged_with_parity_flag(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            os.environ["PIVOT_PARITY_JOINS"] = "0"
            baseline = asyncio.run(self._post("/api/report/filters", payload))
            self.assertEqual(baseline.status_code, 200)
            baseline_json = baseline.json()

            os.environ["PIVOT_PARITY_JOINS"] = "1"
            parity = asyncio.run(self._post("/api/report/filters", payload))
            self.assertEqual(parity.status_code, 200)
            parity_json = parity.json()

            self.assertEqual(baseline_json["options"], parity_json["options"])
            self.assertEqual(baseline_json["meta"], parity_json["meta"])
            self.assertEqual(baseline_json["truncated"], parity_json["truncated"])
        finally:
            router.__exit__(None, None, None)

    def test_report_filters_computed_warnings(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload["remoteSource"] = dict(payload["remoteSource"])
            payload["remoteSource"]["computedFields"] = [
                {
                    "id": "bad",
                    "fieldKey": "bad_field",
                    "expression": "{{value}} +",
                    "resultType": "number",
                }
            ]
            response = asyncio.run(self._post("/api/report/filters", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("computedWarnings", data)
            self.assertIsInstance(data["computedWarnings"], list)
            self.assertTrue(data["computedWarnings"])
            self.assertEqual(data["computedWarnings"][0].get("fieldKey"), "bad_field")
        finally:
            router.__exit__(None, None, None)

    def test_report_details_paging(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload.update(
                {
                    "detailFields": ["cls", "year", "value"],
                    "limit": 1,
                    "offset": 1,
                }
            )
            response = asyncio.run(self._post("/api/report/details", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("entries", data)
            self.assertIn("total", data)
            self.assertEqual(data["limit"], 1)
            self.assertEqual(data["offset"], 1)
            self.assertIsInstance(data["entries"], list)
            self.assertIsInstance(data["total"], int)
            self.assertEqual(len(data["entries"]), 1)
        finally:
            router.__exit__(None, None, None)

    def test_report_details_without_joins_is_unchanged_with_parity_flag(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload.update({"detailFields": ["cls", "year", "value"]})

            os.environ["PIVOT_PARITY_JOINS"] = "0"
            baseline = asyncio.run(self._post("/api/report/details", payload))
            self.assertEqual(baseline.status_code, 200)
            baseline_json = baseline.json()

            os.environ["PIVOT_PARITY_JOINS"] = "1"
            parity = asyncio.run(self._post("/api/report/details", payload))
            self.assertEqual(parity.status_code, 200)
            parity_json = parity.json()

            self.assertEqual(baseline_json["entries"], parity_json["entries"])
            self.assertEqual(baseline_json["total"], parity_json["total"])
        finally:
            router.__exit__(None, None, None)

    def test_report_details_metric_filter(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload.update(
                {
                    "detailFields": ["cls", "year", "value"],
                    "detailMetricFilter": {"fieldKey": "value", "op": "lte", "value": "10"},
                }
            )
            response = asyncio.run(self._post("/api/report/details", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["total"], 1)
            self.assertEqual(len(data["entries"]), 1)
            self.assertEqual(data["entries"][0]["value"], 10)
        finally:
            router.__exit__(None, None, None)

    def test_report_details_computed_warnings(self) -> None:
        router = self._mock_upstream()
        try:
            payload = self._base_payload()
            payload["remoteSource"] = dict(payload["remoteSource"])
            payload["remoteSource"]["computedFields"] = [
                {
                    "id": "bad",
                    "fieldKey": "bad_field",
                    "expression": "{{value}} +",
                    "resultType": "number",
                }
            ]
            payload.update(
                {
                    "detailFields": ["cls", "year", "value"],
                }
            )
            response = asyncio.run(self._post("/api/report/details", payload))
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("computedWarnings", data)
            self.assertIsInstance(data["computedWarnings"], list)
            self.assertTrue(data["computedWarnings"])
            self.assertEqual(data["computedWarnings"][0].get("fieldKey"), "bad_field")
        finally:
            router.__exit__(None, None, None)

    def test_batch_smoke(self) -> None:
        response = asyncio.run(
            self._post(
                "/batch",
                {
                    "endpoint": "/dtj/api/plan",
                    "method": "POST",
                    "params": [{"date": "2025-01-01", "periodType": 11}],
                },
            )
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("job_id", data)
        status = asyncio.run(self._get(f"/batch/{data['job_id']}"))
        self.assertEqual(status.status_code, 200)
        status_payload = status.json()
        self.assertIn("status", status_payload)
        self.assertIn("progress", status_payload)

    def test_batch_results_paged_inline(self) -> None:
        store = get_job_store()
        job_id = "job-inline"
        job = {
            "job_id": job_id,
            "status": "done",
            "total": 3,
            "done": 3,
            "results": [
                {"ok": True, "data": {"id": 1}},
                {"ok": True, "data": {"id": 2}},
                {"ok": True, "data": {"id": 3}},
            ],
            "resultsSummary": {"ok": 3, "failed": 0, "total": 3},
            "resultsFileRef": None,
        }
        asyncio.run(store.set_job(job_id, job))
        response = asyncio.run(self._get(f"/batch/{job_id}/results?offset=1&limit=1"))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 3)
        self.assertEqual(payload["offset"], 1)
        self.assertEqual(payload["limit"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["data"]["id"], 2)

    def test_batch_results_paged_file(self) -> None:
        store = get_job_store()
        job_id = "job-file"
        results_dir = os.path.join(os.getcwd(), "batch_results")
        os.makedirs(results_dir, exist_ok=True)
        results_path = os.path.join(results_dir, f"{job_id}.json")
        results_payload = [
            {"ok": True, "data": {"id": 1}},
            {"ok": True, "data": {"id": 2}},
            {"ok": True, "data": {"id": 3}},
        ]
        with open(results_path, "w", encoding="utf-8") as handle:
            json.dump(results_payload, handle)
        try:
            job = {
                "job_id": job_id,
                "status": "done",
                "total": 3,
                "done": 3,
                "results": None,
                "resultsSummary": {"ok": 3, "failed": 0, "total": 3},
                "resultsFileRef": results_path,
            }
            asyncio.run(store.set_job(job_id, job))
            response = asyncio.run(self._get(f"/batch/{job_id}/results?offset=1&limit=2"))
            self.assertEqual(response.status_code, 200)
            payload = response.json()
            self.assertEqual(payload["total"], 3)
            self.assertEqual(len(payload["results"]), 2)
            self.assertEqual(payload["results"][0]["data"]["id"], 2)
        finally:
            try:
                os.remove(results_path)
            except OSError:
                pass

    def test_batch_results_available_via(self) -> None:
        store = get_job_store()
        job_id = "job-paged"
        job = {
            "job_id": job_id,
            "status": "done",
            "createdAt": "2025-01-01T00:00:00Z",
            "total": 1,
            "done": 1,
            "results": [{"ok": True, "params": {}}],
            "resultsSummary": {"ok": 1, "failed": 0, "total": 1},
            "resultsFileRef": None,
        }
        asyncio.run(store.set_job(job_id, job))
        response = asyncio.run(self._get(f"/batch/{job_id}"))
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload.get("resultsAvailableVia"), "paged")


if __name__ == "__main__":
    unittest.main()
