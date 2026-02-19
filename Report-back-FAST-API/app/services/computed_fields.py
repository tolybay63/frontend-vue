from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


DATE_PART_MARKER = "__date_part__"
ALLOWED_FUNCTIONS = {
    "date",
    "number",
    "text",
    "len",
    "empty",
    "ts",
    "datediff",
    "hours_between",
    "days_between",
}
ALLOWED_RESULT_TYPES = {"number", "text", "date"}
FIELD_TOKEN_REGEX = re.compile(r"\{\{\s*([^}]+?)\s*\}\}")


class FormulaParseError(ValueError):
    def __init__(self, message: str, position: int | None = None) -> None:
        super().__init__(message)
        self.position = position


@dataclass(frozen=True)
class Token:
    type: str
    value: Any
    pos: int


def normalize_computed_fields(value: Any) -> List[Dict[str, Any]]:
    if not value:
        return []
    normalized: List[Dict[str, Any]] = []
    for entry in value:
        if hasattr(entry, "model_dump"):
            payload = entry.model_dump()
        elif hasattr(entry, "dict"):
            payload = entry.dict()
        elif isinstance(entry, dict):
            payload = entry
        else:
            continue
        if isinstance(payload, dict):
            normalized.append(payload)
    return normalized


def _extract_computed_fields_from_payload(payload: Any) -> List[Dict[str, Any]]:
    fields, _ = _extract_computed_fields_from_payload_with_presence(payload)
    return fields


def _extract_computed_fields_from_payload_with_presence(payload: Any) -> tuple[List[Dict[str, Any]], bool]:
    if not isinstance(payload, dict):
        return [], False
    explicit = False
    fields: List[Dict[str, Any]] = []
    if "computedFields" in payload:
        explicit = True
        fields.extend(normalize_computed_fields(payload.get("computedFields") or []))
    if "__computedFields" in payload:
        explicit = True
        fields.extend(normalize_computed_fields(payload.get("__computedFields") or []))
    return fields, explicit


def _computed_field_identity(entry: Dict[str, Any]) -> str:
    field_key = entry.get("fieldKey") or entry.get("field_key")
    if field_key:
        return f"field:{field_key}"
    field_id = entry.get("id")
    if field_id:
        return f"id:{field_id}"
    expression = entry.get("expression")
    result_type = entry.get("resultType") or entry.get("result_type")
    return f"anon:{expression}|{result_type}"


def _dedupe_computed_fields(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not entries:
        return []
    deduped: List[Dict[str, Any]] = []
    seen: set[str] = set()
    for entry in entries:
        identity = _computed_field_identity(entry)
        if identity in seen:
            continue
        seen.add(identity)
        deduped.append(entry)
    return deduped


def extract_computed_fields(remote_source: Any) -> List[Dict[str, Any]]:
    if not remote_source:
        return []
    fields: List[Dict[str, Any]] = []
    if isinstance(remote_source, dict):
        top_fields, top_explicit = _extract_computed_fields_from_payload_with_presence(remote_source)
        body_fields, body_explicit = _extract_computed_fields_from_payload_with_presence(remote_source.get("body"))
        fields.extend(top_fields)
        fields.extend(body_fields)
        explicit_present = top_explicit or body_explicit
        raw_body = remote_source.get("rawBody") or remote_source.get("raw_body")
        if isinstance(raw_body, str) and not explicit_present:
            try:
                parsed = json.loads(raw_body)
            except (TypeError, ValueError):
                parsed = None
            fields.extend(_extract_computed_fields_from_payload(parsed))
        return _dedupe_computed_fields(fields)

    explicit_present = False
    top_entries = getattr(remote_source, "computedFields", None)
    if top_entries is not None:
        explicit_present = True
    fields.extend(normalize_computed_fields(top_entries or []))
    body_fields, body_explicit = _extract_computed_fields_from_payload_with_presence(getattr(remote_source, "body", None))
    fields.extend(body_fields)
    explicit_present = explicit_present or body_explicit
    raw_body = getattr(remote_source, "rawBody", None) or getattr(remote_source, "raw_body", None)
    if isinstance(raw_body, str) and not explicit_present:
        try:
            parsed = json.loads(raw_body)
        except (TypeError, ValueError):
            parsed = None
        fields.extend(_extract_computed_fields_from_payload(parsed))
    return _dedupe_computed_fields(fields)


def build_computed_fields_engine(remote_source: Any) -> "ComputedFieldsEngine | None":
    computed_fields = extract_computed_fields(remote_source)
    if not computed_fields:
        return None
    return ComputedFieldsEngine(computed_fields)


def extract_expression_field_refs(expression: Any) -> List[str]:
    if not isinstance(expression, str) or not expression:
        return []
    refs: List[str] = []
    for match in FIELD_TOKEN_REGEX.findall(expression):
        key = str(match or "").strip()
        if key:
            refs.append(key)
    return refs


def split_computed_fields_by_join_dependency(
    remote_source: Any,
    join_prefixes: List[str] | None = None,
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    computed_fields = extract_computed_fields(remote_source)
    if not computed_fields:
        return [], []
    prefixes = {str(prefix).strip() for prefix in (join_prefixes or []) if str(prefix).strip()}
    if not prefixes:
        return computed_fields, []

    pre_join: List[Dict[str, Any]] = []
    post_join: List[Dict[str, Any]] = []
    for entry in computed_fields:
        refs = extract_expression_field_refs(entry.get("expression"))
        depends_on_join = False
        for ref in refs:
            if "." not in ref:
                continue
            prefix = ref.split(".", 1)[0]
            if prefix in prefixes:
                depends_on_join = True
                break
        if depends_on_join:
            post_join.append(entry)
        else:
            pre_join.append(entry)
    return pre_join, post_join


def build_computed_fields_engine_from_entries(
    entries: List[Dict[str, Any]],
) -> "ComputedFieldsEngine | None":
    normalized = normalize_computed_fields(entries)
    if not normalized:
        return None
    return ComputedFieldsEngine(normalized)


def _tokenize(expression: str) -> List[Token]:
    tokens: List[Token] = []
    length = len(expression)
    index = 0

    def add_token(token_type: str, value: Any, pos: int) -> None:
        tokens.append(Token(token_type, value, pos))

    while index < length:
        ch = expression[index]
        if ch.isspace():
            index += 1
            continue

        if ch == "{" and index + 1 < length and expression[index + 1] == "{":
            end = expression.find("}}", index + 2)
            if end == -1:
                raise FormulaParseError("Unclosed field token", index)
            key = expression[index + 2 : end].strip()
            if not key:
                raise FormulaParseError("Empty field token", index)
            add_token("FIELD", key, index)
            index = end + 2
            continue

        if ch in ('"', "'"):
            quote = ch
            pos = index
            index += 1
            value_chars: List[str] = []
            while index < length:
                current = expression[index]
                if current == "\\":
                    if index + 1 >= length:
                        raise FormulaParseError("Unterminated string literal", pos)
                    escaped = expression[index + 1]
                    if escaped == "n":
                        value_chars.append("\n")
                    elif escaped == "r":
                        value_chars.append("\r")
                    elif escaped == "t":
                        value_chars.append("\t")
                    else:
                        value_chars.append(escaped)
                    index += 2
                    continue
                if current == quote:
                    index += 1
                    break
                value_chars.append(current)
                index += 1
            else:
                raise FormulaParseError("Unterminated string literal", pos)
            add_token("STRING", "".join(value_chars), pos)
            continue

        if ch.isdigit() or (ch == "." and index + 1 < length and expression[index + 1].isdigit()):
            start = index
            has_dot = False
            while index < length:
                current = expression[index]
                if current.isdigit():
                    index += 1
                    continue
                if current == "." and not has_dot:
                    has_dot = True
                    index += 1
                    continue
                break
            text = expression[start:index]
            if text == ".":
                raise FormulaParseError("Invalid number literal", start)
            add_token("NUMBER", float(text), start)
            continue

        if ch.isalpha() or ch == "_":
            start = index
            while index < length:
                current = expression[index]
                if current.isalnum() or current == "_":
                    index += 1
                    continue
                break
            add_token("IDENT", expression[start:index], start)
            continue

        two_char = expression[index : index + 2]
        if two_char in {"&&", "||", "==", "!=", ">=", "<="}:
            add_token("OP", two_char, index)
            index += 2
            continue

        if ch in {"+", "-", "*", "/", "%", "<", ">", "!"}:
            add_token("OP", ch, index)
            index += 1
            continue
        if ch == "(":
            add_token("LPAREN", ch, index)
            index += 1
            continue
        if ch == ")":
            add_token("RPAREN", ch, index)
            index += 1
            continue
        if ch == ",":
            add_token("COMMA", ch, index)
            index += 1
            continue
        if ch == "?":
            add_token("QUESTION", ch, index)
            index += 1
            continue
        if ch == ":":
            add_token("COLON", ch, index)
            index += 1
            continue

        raise FormulaParseError(f"Unexpected character '{ch}'", index)

    add_token("EOF", None, length)
    return tokens


@dataclass
class LiteralNode:
    value: Any

    def eval(self, record: Dict[str, Any]) -> Any:
        return self.value


@dataclass
class FieldNode:
    field_key: str

    def eval(self, record: Dict[str, Any]) -> Any:
        return _resolve_record_value(record, self.field_key)


@dataclass
class UnaryOpNode:
    op: str
    operand: Any

    def eval(self, record: Dict[str, Any]) -> Any:
        value = self.operand.eval(record)
        if self.op == "!":
            return not _to_bool(value)
        if self.op == "+":
            return _apply_unary_number(value)
        if self.op == "-":
            num = _apply_unary_number(value)
            return None if num is None else -num
        raise ValueError("Unsupported unary operator")


@dataclass
class BinaryOpNode:
    op: str
    left: Any
    right: Any

    def eval(self, record: Dict[str, Any]) -> Any:
        if self.op == "&&":
            left_value = self.left.eval(record)
            if not _to_bool(left_value):
                return False
            return _to_bool(self.right.eval(record))
        if self.op == "||":
            left_value = self.left.eval(record)
            if _to_bool(left_value):
                return True
            return _to_bool(self.right.eval(record))

        left_value = self.left.eval(record)
        right_value = self.right.eval(record)

        if self.op in {"+", "-", "*", "/", "%"}:
            return _apply_numeric_op(self.op, left_value, right_value)
        if self.op in {"==", "!=", ">", ">=", "<", "<="}:
            return _apply_comparison(self.op, left_value, right_value)
        raise ValueError("Unsupported operator")


@dataclass
class TernaryNode:
    condition: Any
    if_true: Any
    if_false: Any

    def eval(self, record: Dict[str, Any]) -> Any:
        if _to_bool(self.condition.eval(record)):
            return self.if_true.eval(record)
        return self.if_false.eval(record)


@dataclass
class FunctionNode:
    name: str
    args: List[Any]

    def eval(self, record: Dict[str, Any]) -> Any:
        if self.name in {"date", "number", "text", "len", "empty", "ts"}:
            if len(self.args) != 1:
                raise ValueError("Function expects one argument")
            value = self.args[0].eval(record)
            if self.name == "date":
                return _func_date(value)
            if self.name == "number":
                return _func_number(value)
            if self.name == "text":
                return _func_text(value)
            if self.name == "len":
                return _func_len(value)
            if self.name == "empty":
                return _func_empty(value)
            if self.name == "ts":
                return _func_ts(value)
        if self.name == "datediff":
            if len(self.args) not in {2, 3}:
                raise ValueError("Function expects two or three arguments")
            left = self.args[0].eval(record)
            right = self.args[1].eval(record)
            unit = self.args[2].eval(record) if len(self.args) == 3 else "ms"
            return _func_datediff(left, right, unit)
        if self.name == "hours_between":
            if len(self.args) != 2:
                raise ValueError("Function expects two arguments")
            left = self.args[0].eval(record)
            right = self.args[1].eval(record)
            return _func_hours_between(left, right)
        if self.name == "days_between":
            if len(self.args) != 2:
                raise ValueError("Function expects two arguments")
            left = self.args[0].eval(record)
            right = self.args[1].eval(record)
            return _func_days_between(left, right)
        raise ValueError("Unsupported function")


class Parser:
    def __init__(self, tokens: List[Token]) -> None:
        self._tokens = tokens
        self._index = 0

    def parse(self) -> Any:
        expr = self._parse_expression()
        if self._current().type != "EOF":
            raise FormulaParseError("Unexpected token", self._current().pos)
        return expr

    def _current(self) -> Token:
        return self._tokens[self._index]

    def _advance(self) -> Token:
        token = self._tokens[self._index]
        self._index += 1
        return token

    def _match_type(self, token_type: str) -> Token | None:
        if self._current().type == token_type:
            return self._advance()
        return None

    def _match_op(self, value: str) -> Token | None:
        token = self._current()
        if token.type == "OP" and token.value == value:
            return self._advance()
        return None

    def _expect_type(self, token_type: str) -> Token:
        token = self._match_type(token_type)
        if token is None:
            raise FormulaParseError(f"Expected {token_type}", self._current().pos)
        return token

    def _parse_expression(self) -> Any:
        expr = self._parse_or()
        if self._match_type("QUESTION"):
            true_expr = self._parse_expression()
            self._expect_type("COLON")
            false_expr = self._parse_expression()
            return TernaryNode(expr, true_expr, false_expr)
        return expr

    def _parse_or(self) -> Any:
        expr = self._parse_and()
        while self._match_op("||"):
            right = self._parse_and()
            expr = BinaryOpNode("||", expr, right)
        return expr

    def _parse_and(self) -> Any:
        expr = self._parse_comparison()
        while self._match_op("&&"):
            right = self._parse_comparison()
            expr = BinaryOpNode("&&", expr, right)
        return expr

    def _parse_comparison(self) -> Any:
        expr = self._parse_additive()
        while True:
            token = self._current()
            if token.type == "OP" and token.value in {"==", "!=", ">", ">=", "<", "<="}:
                op = token.value
                self._advance()
                right = self._parse_additive()
                expr = BinaryOpNode(op, expr, right)
                continue
            break
        return expr

    def _parse_additive(self) -> Any:
        expr = self._parse_multiplicative()
        while True:
            token = self._current()
            if token.type == "OP" and token.value in {"+", "-"}:
                op = token.value
                self._advance()
                right = self._parse_multiplicative()
                expr = BinaryOpNode(op, expr, right)
                continue
            break
        return expr

    def _parse_multiplicative(self) -> Any:
        expr = self._parse_unary()
        while True:
            token = self._current()
            if token.type == "OP" and token.value in {"*", "/", "%"}:
                op = token.value
                self._advance()
                right = self._parse_unary()
                expr = BinaryOpNode(op, expr, right)
                continue
            break
        return expr

    def _parse_unary(self) -> Any:
        token = self._current()
        if token.type == "OP" and token.value in {"!", "+", "-"}:
            op = token.value
            self._advance()
            operand = self._parse_unary()
            return UnaryOpNode(op, operand)
        return self._parse_primary()

    def _parse_primary(self) -> Any:
        token = self._current()
        if token.type == "NUMBER":
            self._advance()
            return LiteralNode(token.value)
        if token.type == "STRING":
            self._advance()
            return LiteralNode(token.value)
        if token.type == "FIELD":
            self._advance()
            return FieldNode(token.value)
        if token.type == "IDENT":
            self._advance()
            name = token.value
            if name in {"true", "false", "null"}:
                if name == "true":
                    return LiteralNode(True)
                if name == "false":
                    return LiteralNode(False)
                return LiteralNode(None)
            if self._match_type("LPAREN"):
                args: List[Any] = []
                if self._current().type != "RPAREN":
                    while True:
                        args.append(self._parse_expression())
                        if not self._match_type("COMMA"):
                            break
                self._expect_type("RPAREN")
                if name not in ALLOWED_FUNCTIONS:
                    raise FormulaParseError(f"Unknown function '{name}'", token.pos)
                return FunctionNode(name, args)
            raise FormulaParseError(f"Unknown identifier '{name}'", token.pos)
        if token.type == "LPAREN":
            self._advance()
            expr = self._parse_expression()
            self._expect_type("RPAREN")
            return expr
        raise FormulaParseError("Unexpected token", token.pos)


@dataclass
class ComputedFieldSpec:
    field_key: str
    expression: str
    result_type: str
    field_id: str | None = None


@dataclass
class CompiledComputedField:
    spec: ComputedFieldSpec
    ast: Any | None
    error: str | None = None
    warning_emitted: bool = False

    def evaluate(self, record: Dict[str, Any], warnings: List[Dict[str, Any]]) -> Any:
        if self.error or not self.ast:
            return None
        try:
            value = self.ast.eval(record)
        except Exception as exc:
            if not self.warning_emitted:
                warnings.append(_make_warning(self.spec, f"Runtime error: {exc}", "runtime"))
                self.warning_emitted = True
            return None
        return _coerce_result(value, self.spec.result_type)


class ComputedFieldsEngine:
    def __init__(self, computed_fields: List[Dict[str, Any]]) -> None:
        self._warnings: List[Dict[str, Any]] = []
        self._fields: List[CompiledComputedField] = []
        for entry in computed_fields:
            compiled = _compile_computed_field(entry, self._warnings)
            if compiled:
                self._fields.append(compiled)

    @property
    def warnings(self) -> List[Dict[str, Any]]:
        return list(self._warnings)

    def apply(self, records: List[Dict[str, Any]]) -> None:
        if not records or not self._fields:
            return
        fields = self._fields
        warnings = self._warnings
        for record in records:
            if not isinstance(record, dict):
                continue
            for field in fields:
                record[field.spec.field_key] = field.evaluate(record, warnings)


def _compile_computed_field(entry: Dict[str, Any], warnings: List[Dict[str, Any]]) -> CompiledComputedField | None:
    field_key = entry.get("fieldKey") or entry.get("field_key")
    expression = entry.get("expression")
    result_type = entry.get("resultType") or entry.get("result_type") or "number"
    field_id = entry.get("id")

    if not field_key or not isinstance(field_key, str):
        warnings.append(
            {
                "id": field_id,
                "fieldKey": field_key or "",
                "message": "Missing fieldKey",
                "stage": "compile",
            }
        )
        return None
    if not expression or not isinstance(expression, str):
        warnings.append(
            {
                "id": field_id,
                "fieldKey": field_key,
                "message": "Missing expression",
                "stage": "compile",
            }
        )
        return CompiledComputedField(
            spec=ComputedFieldSpec(field_key, "", result_type, field_id),
            ast=None,
            error="Missing expression",
        )
    if not isinstance(result_type, str) or result_type.lower() not in ALLOWED_RESULT_TYPES:
        warnings.append(
            {
                "id": field_id,
                "fieldKey": field_key,
                "message": f"Invalid resultType '{result_type}'",
                "stage": "compile",
            }
        )
        return CompiledComputedField(
            spec=ComputedFieldSpec(field_key, expression, str(result_type), field_id),
            ast=None,
            error="Invalid resultType",
        )

    result_type = result_type.lower()
    spec = ComputedFieldSpec(field_key, expression, result_type, field_id)
    try:
        tokens = _tokenize(expression)
        ast = Parser(tokens).parse()
    except FormulaParseError as exc:
        warnings.append(_make_warning(spec, f"Parse error: {exc}", "compile"))
        return CompiledComputedField(spec=spec, ast=None, error=str(exc))
    return CompiledComputedField(spec=spec, ast=ast)


def _make_warning(spec: ComputedFieldSpec, message: str, stage: str) -> Dict[str, Any]:
    return {
        "id": spec.field_id,
        "fieldKey": spec.field_key,
        "message": message,
        "stage": stage,
    }


def _apply_unary_number(value: Any) -> float | None:
    return _coerce_number(value)


def _apply_numeric_op(op: str, left: Any, right: Any) -> Any:
    left_num = _coerce_number(left)
    right_num = _coerce_number(right)
    if left_num is None or right_num is None:
        return None
    if op == "+":
        return left_num + right_num
    if op == "-":
        return left_num - right_num
    if op == "*":
        return left_num * right_num
    if op == "/":
        return left_num / right_num
    if op == "%":
        return left_num % right_num
    raise ValueError("Unsupported operator")


def _apply_comparison(op: str, left: Any, right: Any) -> bool:
    if op in {"==", "!="}:
        if left is None and right is None:
            equal = True
        elif left is None or right is None:
            equal = False
        else:
            left_num = _to_number_lenient(left)
            right_num = _to_number_lenient(right)
            if left_num is not None and right_num is not None:
                equal = left_num == right_num
            else:
                equal = left == right
        return equal if op == "==" else not equal

    left_num = _to_number_lenient(left)
    right_num = _to_number_lenient(right)
    if left_num is not None and right_num is not None:
        return _compare_numbers(op, left_num, right_num)
    if left is None or right is None:
        return False
    return _compare_strings(op, str(left), str(right))


def _compare_numbers(op: str, left: float, right: float) -> bool:
    if op == ">":
        return left > right
    if op == ">=":
        return left >= right
    if op == "<":
        return left < right
    if op == "<=":
        return left <= right
    raise ValueError("Unsupported operator")


def _compare_strings(op: str, left: str, right: str) -> bool:
    if op == ">":
        return left > right
    if op == ">=":
        return left >= right
    if op == "<":
        return left < right
    if op == "<=":
        return left <= right
    raise ValueError("Unsupported operator")


def _to_bool(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value != ""
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) > 0
    return True


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


def _coerce_number(value: Any) -> float | None:
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
        except ValueError as exc:
            raise ValueError("Non-numeric value") from exc
    raise ValueError("Non-numeric value")


def _func_number(value: Any) -> float | None:
    return _to_number_lenient(value)


def _func_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (dict, list)):
        try:
            return json.dumps(value, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            return ""
    return str(value)


def _func_len(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (str, list, tuple, dict, set)):
        return float(len(value))
    return None


def _func_empty(value: Any) -> bool:
    if value is None:
        return True
    if value == "":
        return True
    if isinstance(value, (list, tuple)) and len(value) == 0:
        return True
    return False


def _func_date(value: Any) -> str | None:
    parsed = _parse_date_input(value)
    if not parsed:
        return None
    return parsed.date().isoformat()


def _func_ts(value: Any) -> float | None:
    parsed = _parse_date_input(value)
    if not parsed:
        return None
    return parsed.timestamp() * 1000.0


def _normalize_time_unit(unit: Any) -> float | None:
    if unit is None:
        return 1.0
    if not isinstance(unit, str):
        return None
    text = unit.strip().lower()
    if not text:
        return 1.0
    if text == "ms":
        return 1.0
    if text in {"s", "sec", "seconds"}:
        return 1000.0
    if text in {"m", "min", "minutes"}:
        return 60000.0
    if text in {"h", "hour", "hours"}:
        return 3600000.0
    if text in {"d", "day", "days"}:
        return 86400000.0
    return None


def _func_datediff(left: Any, right: Any, unit: Any) -> float | None:
    left_ts = _func_ts(left)
    right_ts = _func_ts(right)
    if left_ts is None or right_ts is None:
        return None
    divisor = _normalize_time_unit(unit)
    if divisor is None:
        return None
    return (right_ts - left_ts) / divisor


def _func_hours_between(left: Any, right: Any) -> float | None:
    return _func_datediff(left, right, "hours")


def _func_days_between(left: Any, right: Any) -> float | None:
    return _func_datediff(left, right, "days")


def _coerce_result(value: Any, result_type: str) -> Any:
    if result_type == "number":
        return _to_number_lenient(value)
    if result_type == "text":
        return _func_text(value)
    if result_type == "date":
        return _func_date(value)
    return None


def _parse_date_part_key(key: str | None) -> Dict[str, str] | None:
    if not key or not isinstance(key, str):
        return None
    index = key.rfind(DATE_PART_MARKER)
    if index == -1:
        return None
    field_key = key[:index]
    part = key[index + len(DATE_PART_MARKER) :]
    if not field_key or part not in {"year", "month", "day"}:
        return None
    return {"field_key": field_key, "part": part}


def _parse_date_input(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value) / 1000.0, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) == 10 and text[4] == "-" and text[7] == "-":
        try:
            return datetime.fromisoformat(f"{text}T00:00:00+00:00")
        except ValueError:
            return None
    if "." in text:
        try:
            day, month, year = text.split(".")
            iso_string = f"{year}-{month}-{day}T00:00:00+00:00"
            return datetime.fromisoformat(iso_string)
        except ValueError:
            pass
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def _resolve_date_part_value(value: Any, part: str) -> str | None:
    parsed = _parse_date_input(value)
    if not parsed:
        return None
    if part == "year":
        return str(parsed.year)
    if part == "month":
        return f"{parsed.month:02d}"
    if part == "day":
        return f"{parsed.day:02d}"
    return None


def _resolve_record_value(record: Dict[str, Any], key: str | None) -> Any:
    if not record or not key:
        return None
    if key in record:
        return record.get(key)
    meta = _parse_date_part_key(key)
    if meta:
        base_value = record.get(meta["field_key"])
        return _resolve_date_part_value(base_value, meta["part"])
    if "." in key:
        current: Any = record
        for part in key.split("."):
            if isinstance(current, dict):
                if part not in current:
                    current = None
                    break
                current = current.get(part)
                continue
            current = None
            break
        if current is not None:
            return current
        last_part = key.split(".")[-1]
        if last_part in record:
            return record.get(last_part)
        return None
    return None
