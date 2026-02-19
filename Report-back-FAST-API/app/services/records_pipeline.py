from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.models.remote_source import RemoteSource
from app.services.computed_fields import (
    build_computed_fields_engine_from_entries,
    extract_computed_fields,
    split_computed_fields_by_join_dependency,
)
from app.services.data_source_client import async_load_records
from app.services.join_service import apply_joins, resolve_joins


@dataclass(frozen=True)
class RecordsPipelineResult:
    records: List[Dict[str, Any]]
    joins: List[Dict[str, Any]]
    join_debug: Dict[str, Any]
    warnings: List[Dict[str, Any]]
    loaded_count: int
    joined_count: int


def _collect_join_prefixes(joins: List[Dict[str, Any]]) -> List[str]:
    prefixes: List[str] = []
    for join in joins or []:
        prefix = str((join or {}).get("resultPrefix") or "").strip()
        if prefix:
            prefixes.append(prefix)
    return prefixes


def _has_unprefixed_join(joins: List[Dict[str, Any]]) -> bool:
    for join in joins or []:
        prefix = str((join or {}).get("resultPrefix") or "").strip()
        if not prefix:
            return True
    return False


def _collect_warnings(*engines: Any) -> List[Dict[str, Any]]:
    warnings: List[Dict[str, Any]] = []
    for engine in engines:
        if not engine:
            continue
        engine_warnings = getattr(engine, "warnings", None) or []
        if not isinstance(engine_warnings, list):
            continue
        warnings.extend(engine_warnings)
    return warnings


def _collect_join_warnings(join_debug: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(join_debug, dict):
        return []
    warnings = join_debug.get("computedWarnings")
    if not isinstance(warnings, list):
        return []
    return [warning for warning in warnings if isinstance(warning, dict)]


async def build_records_pipeline(
    remote_source: RemoteSource,
    *,
    payload_filters: Any = None,
    pushdown_enabled: bool | None = None,
    max_records: Optional[int] = None,
    joins_override: Optional[List[Dict[str, Any]]] = None,
) -> RecordsPipelineResult:
    joins = joins_override if joins_override is not None else await resolve_joins(remote_source)
    join_prefixes = _collect_join_prefixes(joins)
    if _has_unprefixed_join(joins):
        computed_entries = extract_computed_fields(remote_source)
        pre_entries = computed_entries
        post_entries = computed_entries
    else:
        pre_entries, post_entries = split_computed_fields_by_join_dependency(remote_source, join_prefixes)
    pre_engine = build_computed_fields_engine_from_entries(pre_entries)
    post_engine = build_computed_fields_engine_from_entries(post_entries)

    records = await async_load_records(
        remote_source,
        payload_filters=payload_filters,
        pushdown_enabled=pushdown_enabled,
    )
    if max_records is not None and len(records) > max_records:
        raise ValueError(f"Records limit exceeded: {len(records)} > {max_records}")

    if pre_engine:
        pre_engine.apply(records)

    joined_records, join_debug = await apply_joins(
        records,
        remote_source,
        joins_override=joins,
        max_records=max_records,
    )

    if post_engine:
        post_engine.apply(joined_records)

    warnings = _collect_warnings(pre_engine, post_engine)
    warnings.extend(_collect_join_warnings(join_debug))
    return RecordsPipelineResult(
        records=joined_records,
        joins=joins,
        join_debug=join_debug,
        warnings=warnings,
        loaded_count=len(records),
        joined_count=len(joined_records),
    )
