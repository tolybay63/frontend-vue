import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.models.remote_source import RemoteSource
from app.services import pivot_core
from app.services.computed_fields import build_computed_fields_engine
from app.services.date_utils import parse_date_input, parse_date_part_key, resolve_date_part_value
from app.services.data_source_client import async_iter_records, async_load_records
from app.services.source_registry import get_source_config

_MISSING = object()


def _normalize_join_fields(value: Any) -> Optional[List[str]]:
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return None


def _extract_key(record: Dict[str, Any], key: str | None, default: Any = _MISSING) -> Any:
    if not record or not key:
        return default
    if key in record:
        return record.get(key)
    if "." in key:
        current: Any = record
        for part in key.split("."):
            if not isinstance(current, dict) or part not in current:
                current = _MISSING
                break
            current = current.get(part)
        if current is not _MISSING:
            return current
        last_part = key.split(".")[-1]
        if last_part in record:
            return record.get(last_part)
        return default
    return record.get(key, default)


def _normalize_join_filters(value: Any) -> List[Dict[str, Any]]:
    if not isinstance(value, list):
        return []
    normalized: List[Dict[str, Any]] = []
    for item in value:
        if hasattr(item, "model_dump"):
            payload = item.model_dump()
        elif hasattr(item, "dict"):
            payload = item.dict()
        elif isinstance(item, dict):
            payload = item
        else:
            continue
        if isinstance(payload, dict):
            normalized.append(payload)
    return normalized


def _resolve_join_filter_value(record: Dict[str, Any], key: str | None) -> Any:
    if not record or not key:
        return None
    direct = _extract_key(record, key)
    if direct is not _MISSING:
        return direct
    meta = parse_date_part_key(key)
    if meta:
        base_value = _extract_key(record, meta["field_key"], None)
        return resolve_date_part_value(base_value, meta["part"])
    return None


def _to_number_lenient(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            return float(text)
        except ValueError:
            return None
    return None


def _extract_range(value: Any) -> Tuple[Any, Any]:
    if isinstance(value, dict):
        start = value.get("from")
        end = value.get("to")
        if "start" in value or "end" in value:
            start = value.get("start")
            end = value.get("end")
        if "gte" in value or "lte" in value:
            start = value.get("gte")
            end = value.get("lte")
        return start, end
    if isinstance(value, (list, tuple)) and len(value) == 2:
        return value[0], value[1]
    return None, None


def _match_equal(left: Any, right: Any) -> bool:
    if left is None and right is None:
        return True
    if left is None or right is None:
        return False
    left_date = parse_date_input(left)
    right_date = parse_date_input(right)
    if left_date and right_date:
        return left_date == right_date
    left_num = _to_number_lenient(left)
    right_num = _to_number_lenient(right)
    if left_num is not None and right_num is not None:
        return left_num == right_num
    return left == right


def _match_between(value: Any, start: Any, end: Any) -> bool:
    if value is None:
        return False
    if start is None and end is None:
        return True
    value_date = parse_date_input(value)
    start_date = parse_date_input(start) if start is not None else None
    end_date = parse_date_input(end) if end is not None else None
    if value_date and (start_date or end_date):
        if start_date and value_date < start_date:
            return False
        if end_date and value_date > end_date:
            return False
        return True

    value_num = _to_number_lenient(value)
    start_num = _to_number_lenient(start) if start is not None else None
    end_num = _to_number_lenient(end) if end is not None else None
    if value_num is not None and (start_num is not None or end_num is not None):
        if start_num is not None and value_num < start_num:
            return False
        if end_num is not None and value_num > end_num:
            return False
        return True

    value_text = "" if value is None else str(value)
    start_text = None if start is None else str(start)
    end_text = None if end is None else str(end)
    if start_text is not None and value_text < start_text:
        return False
    if end_text is not None and value_text > end_text:
        return False
    return True


def _match_compare(value: Any, target: Any, op: str) -> bool:
    if value is None:
        return False
    value_date = parse_date_input(value)
    target_date = parse_date_input(target)
    if value_date and target_date:
        if op == "gt":
            return value_date > target_date
        if op == "gte":
            return value_date >= target_date
        if op == "lt":
            return value_date < target_date
        if op == "lte":
            return value_date <= target_date
    value_num = _to_number_lenient(value)
    target_num = _to_number_lenient(target)
    if value_num is not None and target_num is not None:
        if op == "gt":
            return value_num > target_num
        if op == "gte":
            return value_num >= target_num
        if op == "lt":
            return value_num < target_num
        if op == "lte":
            return value_num <= target_num
    value_text = str(value)
    target_text = "" if target is None else str(target)
    if op == "gt":
        return value_text > target_text
    if op == "gte":
        return value_text >= target_text
    if op == "lt":
        return value_text < target_text
    if op == "lte":
        return value_text <= target_text
    return False


def _apply_join_filters(rows: List[Dict[str, Any]], filters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not rows or not filters:
        return rows
    normalized = _normalize_join_filters(filters)
    if not normalized:
        return rows

    def match_filter(row: Dict[str, Any], rule: Dict[str, Any]) -> bool:
        field_key = rule.get("field") or rule.get("fieldKey") or rule.get("key")
        if not field_key:
            raise ValueError("Join filter missing field")
        op_raw = rule.get("op") or "eq"
        op = str(op_raw).lower()
        target = rule.get("value")
        value = _resolve_join_filter_value(row, str(field_key))

        if op in {"eq", "=", "=="}:
            return _match_equal(value, target)
        if op in {"neq", "!=", "not_eq"}:
            return not _match_equal(value, target)
        if op in {"in"}:
            values = target if isinstance(target, list) else [target]
            return any(_match_equal(value, item) for item in values)
        if op in {"nin", "not_in"}:
            values = target if isinstance(target, list) else [target]
            return not any(_match_equal(value, item) for item in values)
        if op in {"between", "range"}:
            start, end = _extract_range(target)
            return _match_between(value, start, end)
        if op in {"gt", ">"}:
            return _match_compare(value, target, "gt")
        if op in {"gte", ">="}:
            return _match_compare(value, target, "gte")
        if op in {"lt", "<"}:
            return _match_compare(value, target, "lt")
        if op in {"lte", "<="}:
            return _match_compare(value, target, "lte")
        if op == "contains":
            if value is None:
                return False
            if isinstance(value, (list, tuple, set)):
                return target in value
            return str(target) in str(value)
        if op in {"not_contains", "notcontains"}:
            if value is None:
                return True
            if isinstance(value, (list, tuple, set)):
                return target not in value
            return str(target) not in str(value)
        if op in {"is_empty", "empty"}:
            return value is None or value == "" or value == [] or value == {}
        if op in {"not_empty"}:
            return not (value is None or value == "" or value == [] or value == {})
        raise ValueError(f"Unsupported join filter op '{op}'")

    return [row for row in rows if all(match_filter(row, rule) for rule in normalized)]


def _extract_join_aggregate(join: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    aggregate = join.get("aggregate") if isinstance(join, dict) else None
    if not aggregate:
        aggregate = join.get("aggregation") if isinstance(join, dict) else None
    if isinstance(aggregate, dict):
        return aggregate
    return None


def _prepare_join_aggregate(join: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    aggregate = _extract_join_aggregate(join)
    if not aggregate:
        return None

    group_by = _normalize_join_fields(aggregate.get("groupBy"))
    if not group_by:
        raise ValueError("Join aggregate requires groupBy")
    if len(group_by) != 1:
        raise ValueError("Join aggregate groupBy must contain exactly one key")

    foreign_key = join.get("foreignKey") or join.get("foreign_key")
    if not foreign_key:
        raise ValueError("Join aggregate requires foreignKey")
    if group_by[0] != str(foreign_key):
        raise ValueError("Join aggregate groupBy must match foreignKey")

    metrics_raw = aggregate.get("metrics")
    if not isinstance(metrics_raw, list) or not metrics_raw:
        raise ValueError("Join aggregate requires metrics")

    metrics: List[Dict[str, Any]] = []
    seen_keys: set[str] = set()
    for entry in metrics_raw:
        if hasattr(entry, "model_dump"):
            entry = entry.model_dump()
        elif hasattr(entry, "dict"):
            entry = entry.dict()
        if not isinstance(entry, dict):
            raise ValueError("Join aggregate metric must be an object")
        metric_key = (
            entry.get("key")
            or entry.get("id")
            or entry.get("field")
            or entry.get("sourceKey")
        )
        if not metric_key:
            raise ValueError("Join aggregate metric missing key")
        metric_key = str(metric_key)
        if metric_key in seen_keys:
            raise ValueError(f"Join aggregate metric key '{metric_key}' is duplicated")
        seen_keys.add(metric_key)
        source_key = (
            entry.get("sourceKey")
            or entry.get("fieldKey")
            or entry.get("field")
            or entry.get("source_key")
        )
        if not source_key:
            raise ValueError(f"Join aggregate metric '{metric_key}' missing sourceKey")
        op = entry.get("op") or entry.get("aggregator") or entry.get("agg") or "sum"
        op = pivot_core._normalize_aggregator(op)
        if op not in {"count", "count_distinct", "sum", "avg", "value"}:
            raise ValueError(f"Join aggregate metric '{metric_key}' has unsupported op '{op}'")
        metrics.append(
            {
                "key": metric_key,
                "source_key": str(source_key),
                "op": op,
            }
        )

    return {"group_by": group_by, "metrics": metrics}


def _update_aggregate_buckets(
    buckets: Dict[Tuple[Any, ...], Dict[str, Dict[str, Any]]],
    group_by: List[str],
    metrics: List[Dict[str, Any]],
    rows: List[Dict[str, Any]],
) -> None:
    for row in rows:
        if not isinstance(row, dict):
            continue
        group_values = []
        for field in group_by:
            value = _extract_key(row, field, None)
            group_values.append(None if value is _MISSING else value)
        group_key = tuple(group_values)
        metric_buckets = buckets.get(group_key)
        if metric_buckets is None:
            metric_buckets = {}
            buckets[group_key] = metric_buckets
        for metric in metrics:
            metric_key = metric["key"]
            state = metric_buckets.get(metric_key)
            if state is None:
                state = _create_join_aggregate_state(metric["op"])
                metric_buckets[metric_key] = state
            source_value = _extract_key(row, metric["source_key"], _MISSING)
            _update_join_aggregate_state(state, metric["op"], source_value)


def _collect_aggregate_source_presence(
    rows: List[Dict[str, Any]],
    metrics: List[Dict[str, Any]],
) -> Dict[str, bool]:
    presence: Dict[str, bool] = {metric["key"]: False for metric in metrics}
    if not rows:
        return presence
    for row in rows:
        if not isinstance(row, dict):
            continue
        for metric in metrics:
            if presence.get(metric["key"]):
                continue
            value = _extract_key(row, metric["source_key"], _MISSING)
            if value is not _MISSING:
                presence[metric["key"]] = True
    return presence


def _finalize_aggregate_buckets(
    buckets: Dict[Tuple[Any, ...], Dict[str, Dict[str, Any]]],
    group_by: List[str],
    metrics: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    aggregated_rows: List[Dict[str, Any]] = []
    for group_key, metric_buckets in buckets.items():
        aggregated_row: Dict[str, Any] = {
            field: value for field, value in zip(group_by, group_key)
        }
        for metric in metrics:
            aggregated_row[metric["key"]] = _finalize_join_aggregate_state(
                metric_buckets.get(metric["key"]),
                metric["op"],
            )
        aggregated_rows.append(aggregated_row)
    return aggregated_rows


def _normalize_distinct_value(value: Any) -> str:
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            return str(value)
    return str(value)


def _normalize_value_signature(value: Any) -> str:
    if value is None:
        return "null:"
    if isinstance(value, bool):
        return f"bool:{value}"
    if isinstance(value, (int, float)):
        return f"number:{value}"
    if isinstance(value, str):
        return f"string:{value}"
    if isinstance(value, (dict, list)):
        return f"object:{_normalize_distinct_value(value)}"
    return f"{type(value).__name__}:{value}"


def _create_join_aggregate_state(op: str) -> Dict[str, Any]:
    if op == "count":
        return {"count": 0}
    if op == "sum":
        return {"sum": 0.0, "count": 0}
    if op == "avg":
        return {"sum": 0.0, "count": 0}
    if op == "count_distinct":
        return {"values": set()}
    if op == "value":
        return {"seen": False, "value": None, "signature": None, "ambiguous": False}
    return {"count": 0}


def _update_join_aggregate_state(state: Dict[str, Any], op: str, value: Any) -> None:
    if op == "count":
        state["count"] = int(state.get("count", 0)) + 1
        return
    if op == "count_distinct":
        if value is _MISSING or value is None or value == "":
            return
        values = state.setdefault("values", set())
        values.add(_normalize_distinct_value(value))
        return
    if op == "value":
        if value is _MISSING:
            return
        signature = _normalize_value_signature(value)
        if not state.get("seen"):
            state["seen"] = True
            state["value"] = value
            state["signature"] = signature
            return
        if signature != state.get("signature"):
            state["ambiguous"] = True
        return

    # sum/avg: only numeric values
    if value is _MISSING:
        return
    numeric = _to_number_lenient(value)
    if numeric is None:
        return
    state["sum"] = float(state.get("sum", 0.0)) + numeric
    state["count"] = int(state.get("count", 0)) + 1


def _finalize_join_aggregate_state(state: Dict[str, Any] | None, op: str) -> Any:
    if not state:
        return None
    if op == "count":
        return int(state.get("count", 0))
    if op == "count_distinct":
        return len(state.get("values") or set())
    if op == "sum":
        count = int(state.get("count", 0))
        return state.get("sum") if count > 0 else None
    if op == "avg":
        count = int(state.get("count", 0))
        if count <= 0:
            return None
        return float(state.get("sum", 0.0)) / count
    if op == "value":
        if state.get("ambiguous"):
            return None
        if not state.get("seen"):
            return None
        return state.get("value")
    return None


def _project_join_fields(
    record: Dict[str, Any],
    fields: Optional[List[str]],
    prefix: str,
) -> Dict[str, Any]:
    entries = fields if fields else list(record.keys())
    projected: Dict[str, Any] = {}
    for key in entries:
        target_key = f"{prefix}.{key}" if prefix else key
        projected[target_key] = record.get(key)
    return projected


def _apply_join(
    base_rows: List[Dict[str, Any]],
    join_rows: List[Dict[str, Any]],
    join: Dict[str, Any],
) -> Tuple[List[Dict[str, Any]], int]:
    primary_key = join.get("primaryKey") or join.get("primary_key")
    foreign_key = join.get("foreignKey") or join.get("foreign_key")
    if not primary_key or not foreign_key:
        return base_rows, 0

    lookup: Dict[Any, List[Dict[str, Any]]] = {}
    for row in join_rows:
        key = _extract_key(row, str(foreign_key))
        if key is _MISSING:
            continue
        lookup.setdefault(key, []).append(row)

    join_type = "inner" if str(join.get("joinType")).lower() == "inner" else "left"
    prefix = str(join.get("resultPrefix") or "").strip()
    fields = None if _extract_join_aggregate(join) else _normalize_join_fields(join.get("fields"))

    merged: List[Dict[str, Any]] = []
    matched_rows = 0
    for row in base_rows:
        key = _extract_key(row, str(primary_key))
        if key is _MISSING:
            key = None
        matches = lookup.get(key)
        if not matches:
            if join_type == "inner":
                continue
            merged.append({**row})
            continue
        matched_rows += len(matches)
        for match in matches:
            merged.append({**row, **_project_join_fields(match, fields, prefix)})
    return merged, matched_rows


def _apply_join_with_lookup(
    base_rows: List[Dict[str, Any]],
    lookup: Dict[Any, List[Dict[str, Any]]],
    join: Dict[str, Any],
) -> Tuple[List[Dict[str, Any]], int]:
    primary_key = join.get("primaryKey") or join.get("primary_key")
    foreign_key = join.get("foreignKey") or join.get("foreign_key")
    if not primary_key or not foreign_key:
        return base_rows, 0

    join_type = "inner" if str(join.get("joinType")).lower() == "inner" else "left"
    merged: List[Dict[str, Any]] = []
    matched_rows = 0
    for row in base_rows:
        key = _extract_key(row, str(primary_key))
        if key is _MISSING:
            key = None
        matches = lookup.get(key)
        if not matches:
            if join_type == "inner":
                continue
            merged.append({**row})
            continue
        matched_rows += len(matches)
        for match in matches:
            merged.append({**row, **match})
    return merged, matched_rows


def _extract_joins_from_payload(payload: Any) -> List[Dict[str, Any]]:
    joins, _ = _extract_joins_from_payload_with_presence(payload)
    return joins


def _extract_joins_from_payload_with_presence(payload: Any) -> tuple[List[Dict[str, Any]], bool]:
    if not isinstance(payload, dict):
        return [], False
    explicit = False
    joins = payload.get("__joins")
    if "__joins" in payload:
        explicit = True
    if isinstance(joins, list):
        return joins, explicit
    join_config = payload.get("joinConfig")
    if "joinConfig" in payload:
        explicit = True
    if isinstance(join_config, list):
        return join_config, explicit
    if isinstance(join_config, str):
        try:
            parsed = json.loads(join_config)
        except (TypeError, ValueError):
            return [], explicit
        if isinstance(parsed, list):
            return parsed, explicit
    return [], explicit


def _update_join_lookup(
    lookup: Dict[Any, List[Dict[str, Any]]],
    join: Dict[str, Any],
    join_rows: List[Dict[str, Any]],
    max_keys: Optional[int] = None,
) -> None:
    foreign_key = join.get("foreignKey") or join.get("foreign_key")
    if not foreign_key:
        return
    prefix = str(join.get("resultPrefix") or "").strip()
    fields = None if _extract_join_aggregate(join) else _normalize_join_fields(join.get("fields"))

    for row in join_rows:
        key = _extract_key(row, str(foreign_key))
        if key is _MISSING:
            continue
        if key not in lookup:
            if max_keys and len(lookup) + 1 > max_keys:
                raise ValueError(f"Join lookup max keys exceeded: {len(lookup) + 1} > {max_keys}")
            lookup[key] = []
        lookup[key].append(_project_join_fields(row, fields, prefix))


def _resolve_source_id(remote_source: RemoteSource) -> Optional[str]:
    if remote_source.id:
        return str(remote_source.id)
    if remote_source.remoteId:
        return str(remote_source.remoteId)
    if isinstance(remote_source.remoteMeta, dict) and remote_source.remoteMeta.get("id"):
        return str(remote_source.remoteMeta.get("id"))
    return None


async def _resolve_joins(remote_source: RemoteSource) -> List[Dict[str, Any]]:
    if isinstance(remote_source.joins, list) and remote_source.joins:
        return list(remote_source.joins)
    joins, explicit = _extract_joins_from_payload_with_presence(remote_source.body)
    if not joins and remote_source.rawBody and not explicit:
        try:
            parsed = json.loads(remote_source.rawBody)
        except (TypeError, ValueError):
            parsed = None
        joins = _extract_joins_from_payload(parsed)
    if joins:
        return joins

    source_id = _resolve_source_id(remote_source)
    if not source_id:
        return []
    config = await get_source_config(source_id)
    if not config:
        return []
    joins, explicit = _extract_joins_from_payload_with_presence(config.body)
    if joins:
        return joins
    if config.raw_body and not explicit:
        try:
            parsed = json.loads(config.raw_body)
        except (TypeError, ValueError):
            parsed = None
        joins = _extract_joins_from_payload(parsed)
    return joins


@dataclass(frozen=True)
class PreparedJoin:
    join: Dict[str, Any]
    rows: List[Dict[str, Any]]
    target_source_id: Optional[str]


@dataclass(frozen=True)
class PreparedJoinLookup:
    join: Dict[str, Any]
    lookup: Dict[Any, List[Dict[str, Any]]]
    target_source_id: Optional[str]


def _build_join_source(target_source_id: Any, config: Any) -> RemoteSource:
    return RemoteSource(
        id=str(target_source_id),
        method=config.method,
        url=config.url,
        body=config.body,
        headers=config.headers,
        rawBody=config.raw_body,
    )


async def resolve_joins(remote_source: RemoteSource) -> List[Dict[str, Any]]:
    return await _resolve_joins(remote_source)


async def apply_joins(
    base_rows: List[Dict[str, Any]],
    remote_source: RemoteSource,
    joins_override: Optional[List[Dict[str, Any]]] = None,
    max_records: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    settings = get_settings()
    join_max_records = settings.report_join_max_records or None
    join_source_max_records = settings.report_join_source_max_records or None
    joins = joins_override if joins_override is not None else await _resolve_joins(remote_source)
    debug: Dict[str, Any] = {
        "joinsApplied": [],
        "sampleKeys": {
            "beforeJoin": list(base_rows[0].keys()) if base_rows else [],
            "afterJoin": [],
        },
        "computedWarnings": [],
    }
    if not joins:
        return base_rows, debug

    rows = base_rows
    for join in joins:
        target_source_id = join.get("targetSourceId")
        join_rows: List[Dict[str, Any]] = []
        join_computed_engine = None
        if target_source_id:
            config = await get_source_config(target_source_id)
            if config:
                join_source = _build_join_source(target_source_id, config)
                join_computed_engine = build_computed_fields_engine(join_source)
                join_rows = await async_load_records(join_source)
                if join_source_max_records and len(join_rows) > join_source_max_records:
                    raise ValueError(
                        f"Join source records limit exceeded: {len(join_rows)} > {join_source_max_records}"
                    )
                if max_records and len(join_rows) > max_records:
                    raise ValueError(f"Records limit exceeded: {len(join_rows)} > {max_records}")
                if join_computed_engine:
                    join_computed_engine.apply(join_rows)
                    warnings = list(getattr(join_computed_engine, "warnings", []) or [])
                    if warnings:
                        debug["computedWarnings"].extend(
                            {
                                **warning,
                                "joinId": join.get("id"),
                                "targetSourceId": target_source_id,
                            }
                            for warning in warnings
                        )

        join_rows = _apply_join_filters(join_rows, join.get("filters"))
        aggregate_spec = _prepare_join_aggregate(join)
        if aggregate_spec:
            source_presence = _collect_aggregate_source_presence(join_rows, aggregate_spec["metrics"])
            for metric in aggregate_spec["metrics"]:
                if source_presence.get(metric["key"]):
                    continue
                debug["computedWarnings"].append(
                    {
                        "joinId": join.get("id"),
                        "targetSourceId": target_source_id,
                        "fieldKey": metric["source_key"],
                        "message": (
                            "Join aggregate source field not found in join records: "
                            f"{metric['source_key']}"
                        ),
                        "stage": "join-aggregate",
                    }
                )
            buckets: Dict[Tuple[Any, ...], Dict[str, Dict[str, Any]]] = {}
            _update_aggregate_buckets(
                buckets,
                aggregate_spec["group_by"],
                aggregate_spec["metrics"],
                join_rows,
            )
            join_rows = _finalize_aggregate_buckets(
                buckets,
                aggregate_spec["group_by"],
                aggregate_spec["metrics"],
            )

        base_before = len(rows)
        rows, matched_rows = _apply_join(rows, join_rows, join)
        if max_records and len(rows) > max_records:
            raise ValueError(f"Records limit exceeded: {len(rows)} > {max_records}")
        if join_max_records and len(rows) > join_max_records:
            raise ValueError(f"Join records limit exceeded: {len(rows)} > {join_max_records}")
        debug["joinsApplied"].append(
            {
                "joinId": join.get("id"),
                "targetSourceId": target_source_id,
                "baseBefore": base_before,
                "baseAfter": len(rows),
                "matchedRows": matched_rows,
            }
        )

    debug["sampleKeys"]["afterJoin"] = list(rows[0].keys()) if rows else []
    return rows, debug


async def prepare_joins(
    remote_source: RemoteSource,
    joins_override: Optional[List[Dict[str, Any]]] = None,
    max_records: Optional[int] = None,
) -> List[PreparedJoin]:
    settings = get_settings()
    join_source_max_records = settings.report_join_source_max_records or None
    joins = joins_override if joins_override is not None else await _resolve_joins(remote_source)
    prepared: List[PreparedJoin] = []
    for join in joins:
        target_source_id = join.get("targetSourceId")
        join_rows: List[Dict[str, Any]] = []
        join_computed_engine = None
        if target_source_id:
            config = await get_source_config(target_source_id)
            if config:
                join_source = _build_join_source(target_source_id, config)
                join_computed_engine = build_computed_fields_engine(join_source)
                join_rows = await async_load_records(join_source)
                if join_source_max_records and len(join_rows) > join_source_max_records:
                    raise ValueError(
                        f"Join source records limit exceeded: {len(join_rows)} > {join_source_max_records}"
                    )
                if max_records and len(join_rows) > max_records:
                    raise ValueError(f"Records limit exceeded: {len(join_rows)} > {max_records}")
                if join_computed_engine:
                    join_computed_engine.apply(join_rows)
        join_rows = _apply_join_filters(join_rows, join.get("filters"))
        aggregate_spec = _prepare_join_aggregate(join)
        if aggregate_spec:
            buckets: Dict[Tuple[Any, ...], Dict[str, Dict[str, Any]]] = {}
            _update_aggregate_buckets(
                buckets,
                aggregate_spec["group_by"],
                aggregate_spec["metrics"],
                join_rows,
            )
            join_rows = _finalize_aggregate_buckets(
                buckets,
                aggregate_spec["group_by"],
                aggregate_spec["metrics"],
            )
        prepared.append(
            PreparedJoin(
                join=join,
                rows=join_rows,
                target_source_id=target_source_id,
            )
        )
    return prepared


async def prepare_joins_streaming(
    remote_source: RemoteSource,
    chunk_size: int,
    *,
    joins_override: Optional[List[Dict[str, Any]]] = None,
    max_records: Optional[int] = None,
    lookup_max_keys: Optional[int] = None,
    paging_allowlist: Optional[str] = None,
    paging_max_pages: Optional[int] = None,
    paging_force: bool = False,
) -> List[PreparedJoinLookup]:
    settings = get_settings()
    join_source_max_records = settings.report_join_source_max_records or None
    joins = joins_override if joins_override is not None else await _resolve_joins(remote_source)
    prepared: List[PreparedJoinLookup] = []
    for join in joins:
        target_source_id = join.get("targetSourceId")
        lookup: Dict[Any, List[Dict[str, Any]]] = {}
        join_filters = join.get("filters")
        aggregate_spec = _prepare_join_aggregate(join)
        aggregate_buckets: Dict[Tuple[Any, ...], Dict[str, Dict[str, Any]]] = {}
        if target_source_id:
            config = await get_source_config(target_source_id)
            if config:
                join_source = _build_join_source(target_source_id, config)
                join_computed_engine = build_computed_fields_engine(join_source)
                total_rows = 0
                async for chunk in async_iter_records(
                    join_source,
                    chunk_size,
                    paging_allowlist=paging_allowlist,
                    paging_max_pages=paging_max_pages,
                    paging_force=paging_force,
                ):
                    if not chunk:
                        continue
                    total_rows += len(chunk)
                    if join_source_max_records and total_rows > join_source_max_records:
                        raise ValueError(
                            f"Join source records limit exceeded: {total_rows} > {join_source_max_records}"
                        )
                    if max_records and total_rows > max_records:
                        raise ValueError(f"Records limit exceeded: {total_rows} > {max_records}")
                    if join_computed_engine:
                        join_computed_engine.apply(chunk)
                    chunk = _apply_join_filters(chunk, join_filters)
                    if not chunk:
                        continue
                    if aggregate_spec:
                        _update_aggregate_buckets(
                            aggregate_buckets,
                            aggregate_spec["group_by"],
                            aggregate_spec["metrics"],
                            chunk,
                        )
                    else:
                        _update_join_lookup(lookup, join, chunk, lookup_max_keys)
                if aggregate_spec:
                    aggregated_rows = _finalize_aggregate_buckets(
                        aggregate_buckets,
                        aggregate_spec["group_by"],
                        aggregate_spec["metrics"],
                    )
                    _update_join_lookup(lookup, join, aggregated_rows, lookup_max_keys)
        prepared.append(
            PreparedJoinLookup(
                join=join,
                lookup=lookup,
                target_source_id=target_source_id,
            )
        )
    return prepared


def apply_prepared_joins(
    base_rows: List[Dict[str, Any]],
    prepared_joins: List[PreparedJoin],
    max_records: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    debug: Dict[str, Any] = {
        "joinsApplied": [],
        "sampleKeys": {
            "beforeJoin": list(base_rows[0].keys()) if base_rows else [],
            "afterJoin": [],
        },
    }
    if not prepared_joins:
        debug["sampleKeys"]["afterJoin"] = list(base_rows[0].keys()) if base_rows else []
        return base_rows, debug

    rows = base_rows
    for prepared in prepared_joins:
        base_before = len(rows)
        rows, matched_rows = _apply_join(rows, prepared.rows, prepared.join)
        if max_records and len(rows) > max_records:
            raise ValueError(f"Records limit exceeded: {len(rows)} > {max_records}")
        debug["joinsApplied"].append(
            {
                "joinId": prepared.join.get("id"),
                "targetSourceId": prepared.target_source_id,
                "baseBefore": base_before,
                "baseAfter": len(rows),
                "matchedRows": matched_rows,
            }
        )

    debug["sampleKeys"]["afterJoin"] = list(rows[0].keys()) if rows else []
    return rows, debug


def apply_prepared_join_lookups(
    base_rows: List[Dict[str, Any]],
    prepared_joins: List[PreparedJoinLookup],
    max_records: Optional[int] = None,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    debug: Dict[str, Any] = {
        "joinsApplied": [],
        "sampleKeys": {
            "beforeJoin": list(base_rows[0].keys()) if base_rows else [],
            "afterJoin": [],
        },
    }
    if not prepared_joins:
        debug["sampleKeys"]["afterJoin"] = list(base_rows[0].keys()) if base_rows else []
        return base_rows, debug

    rows = base_rows
    for prepared in prepared_joins:
        base_before = len(rows)
        rows, matched_rows = _apply_join_with_lookup(rows, prepared.lookup, prepared.join)
        if max_records and len(rows) > max_records:
            raise ValueError(f"Records limit exceeded: {len(rows)} > {max_records}")
        debug["joinsApplied"].append(
            {
                "joinId": prepared.join.get("id"),
                "targetSourceId": prepared.target_source_id,
                "baseBefore": base_before,
                "baseAfter": len(rows),
                "matchedRows": matched_rows,
            }
        )

    debug["sampleKeys"]["afterJoin"] = list(rows[0].keys()) if rows else []
    return rows, debug
