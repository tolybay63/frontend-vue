import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from app.models.remote_source import RemoteSource
from app.services.join_service import apply_prepared_joins, prepare_joins
from app.services.source_registry import SourceConfig


class JoinFiltersTests(unittest.TestCase):
    def test_join_filters_between(self) -> None:
        join_rows = [
            {"object_id": 1, "PlanDateEnd": "2024-01-05"},
            {"object_id": 1, "PlanDateEnd": "2024-02-01"},
            {"object_id": 2, "PlanDateEnd": "2024-01-10"},
        ]
        join = {
            "id": "plans_by_object",
            "targetSourceId": "plans",
            "primaryKey": "object_id",
            "foreignKey": "object_id",
            "joinType": "left",
            "resultPrefix": "plan",
            "fields": ["PlanDateEnd"],
            "filters": [
                {
                    "field": "PlanDateEnd",
                    "op": "between",
                    "value": ["2024-01-01", "2024-01-31"],
                }
            ],
        }
        remote_source = RemoteSource(
            url="https://example.com/base",
            method="POST",
            body={},
            joins=[join],
        )
        config = SourceConfig(
            source_id="plans",
            url="https://example.com/plans",
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

        base_rows = [{"object_id": 1}, {"object_id": 2}, {"object_id": 3}]
        merged_rows, _ = apply_prepared_joins(base_rows, prepared)

        self.assertEqual(len(merged_rows), 3)
        self.assertTrue(
            all(row.get("plan.PlanDateEnd") != "2024-02-01" for row in merged_rows)
        )
        row3 = next(row for row in merged_rows if row["object_id"] == 3)
        self.assertNotIn("plan.PlanDateEnd", row3)


if __name__ == "__main__":
    unittest.main()
