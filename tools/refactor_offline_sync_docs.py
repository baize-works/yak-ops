#!/usr/bin/env python3
"""为离线同步 Java 源码补充中文类注释，并安全收敛纯构造器注入。"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Iterable

AUTHOR = "weifuwan"
MAX_STABILIZE_PASSES = 5

TARGET_ROOTS = (
    Path(
        "yak-ops-business/yak-ops-business-sync/"
        "yak-ops-business-sync-offline/src/main/java"
    ),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/dto/sync/offline"),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/po/sync/offline"),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/vo/sync/offline"),
)

DESCRIPTIONS = {
    "ConditionalOnOfflineSyncEnabled": "离线同步功能启用条件注解。",
    "ConnectorSchemaProperties": "Connector Schema 同步与缓存配置属性。",
    "OfflineSyncConfiguration": "离线同步模块基础配置。",
    "OfflineSyncProperties": "离线同步模块配置属性。",
    "OfflineConnectorFormController": "离线同步 Connector 动态表单接口。",
    "OfflineControlPlaneController": "离线同步控制面管理接口。",
    "OfflineJobDefinitionController": "离线同步任务定义接口。",
    "OfflineJobExecutionController": "离线同步任务执行与实例查询接口。",
    "OfflineExecutionStatus": "离线同步任务执行状态枚举。",
    "ConnectorIdResolver": "数据源类型与 Link-Up Connector 标识转换工具。",
    "LinkUpClient": "Link-Up 离线 Worker HTTP 客户端。",
    "LinkUpConnectorSchemaClient": "Link-Up Connector Schema 查询客户端。",
    "LinkUpJobSpecFactory": "离线同步编辑模型与 Link-Up JobSpec 转换工厂。",
    "ConnectorConditionEvaluator": "Connector 表单条件表达式计算器。",
    "ConnectorFormActionService": "Connector 动态表单受控动作服务。",
    "ConnectorFormSchema": "Yak Ops 前端可消费的 Connector 表单模型。",
    "ConnectorFormSchemaComposer": "Connector Schema 与展示配置合成器。",
    "ConnectorFormSchemaService": "Connector 表单模型查询与刷新服务。",
    "ConnectorFormValidationService": "Connector 表单参数服务端校验服务。",
    "ConnectorInteractionNormalizer": "Connector 规则与表单交互模型转换器。",
    "ConnectorPresentationProfile": "Connector 表单展示配置模型。",
    "ConnectorPresentationRegistry": "Connector 表单展示配置注册中心。",
    "ConnectorSchemaRegistry": "Connector Schema 内存与持久化注册中心。",
    "ConnectorSchemaSnapshot": "Connector Schema 缓存快照。",
    "OfflineConnectorSchemaRepository": "Connector Schema 快照持久化仓储。",
    "OfflineDefinitionCatalogRepository": "离线同步不可变任务版本仓储。",
    "OfflineExecutionControlRepository": "离线同步执行控制与事件仓储。",
    "OfflineNodeRepository": "Link-Up Worker 节点信息仓储。",
    "OfflineScheduleRepository": "离线同步调度与重试策略仓储。",
    "OfflineAlertPublisher": "离线同步执行告警发布服务。",
    "OfflineDefinitionSupport": "离线同步任务定义序列化与转换支持组件。",
    "OfflineExecutionClaimService": "离线同步执行实例原子领取服务。",
    "OfflineExecutionOrchestrator": "离线同步执行命令与状态持久化编排器。",
    "OfflineExecutionReadService": "离线同步执行历史、指标与日志查询服务。",
    "OfflineExecutionReconciler": "离线同步执行状态后台对账服务。",
    "OfflineJobDefinitionService": "离线同步任务定义与版本管理服务。",
    "OfflineJobExecutionService": "离线同步任务执行应用服务。",
    "OfflineScheduleDispatcher": "离线同步持久化调度派发器。",
    "OfflineWorkerRegistry": "Link-Up Worker 注册、心跳与选择服务。",
    "OfflineJobDefinitionDao": "离线同步任务定义数据访问接口。",
    "OfflineJobExecutionDao": "离线同步任务实例数据访问接口。",
    "OfflineJobDefinitionDaoImpl": "离线同步任务定义数据访问实现。",
    "OfflineJobExecutionDaoImpl": "离线同步任务实例数据访问实现。",
    "OfflineJobDefinitionMapper": "离线同步任务定义 MyBatis 映射接口。",
    "OfflineJobExecutionMapper": "离线同步任务实例 MyBatis 映射接口。",
    "OfflineBatchOperationDTO": "离线同步批量操作请求对象。",
    "OfflineJobBasicDTO": "离线同步任务基础信息请求对象。",
    "OfflineJobDefinitionDTO": "离线同步任务定义请求对象。",
    "OfflineJobDefinitionQueryDTO": "离线同步任务定义分页查询对象。",
    "OfflineJobExecutionQueryDTO": "离线同步任务实例分页查询对象。",
    "OfflineJobDefinitionPO": "离线同步任务定义持久化对象。",
    "OfflineJobExecutionPO": "离线同步任务实例持久化对象。",
    "OfflineBatchOperationVO": "离线同步批量操作结果视图。",
    "OfflineJobDefinitionVO": "离线同步任务定义视图。",
    "OfflineJobExecutionDetailVO": "离线同步任务实例详情视图。",
    "OfflineJobExecutionVO": "离线同步任务实例视图。",
}

TYPE_PATTERN = re.compile(
    r"(?m)^(?P<indent>[ \t]*)(?P<mods>(?:(?:public|protected|private|abstract|final|"
    r"sealed|non-sealed|static|strictfp)\s+)*)"
    r"(?P<kind>@interface|class|interface|enum)\s+(?P<name>[A-Za-z_$][\w$]*)\b"
)
CHINESE_PATTERN = re.compile(r"[\u4e00-\u9fff]")


def java_files() -> Iterable[Path]:
    for root in TARGET_ROOTS:
        if root.exists():
            yield from sorted(root.rglob("*.java"))


def description_for(name: str, kind: str) -> str:
    if name in DESCRIPTIONS:
        return DESCRIPTIONS[name]
    suffixes = (
        ("Controller", "离线同步接口控制器。"),
        ("Service", "离线同步业务服务。"),
        ("Repository", "离线同步数据仓储。"),
        ("DaoImpl", "离线同步数据访问实现。"),
        ("Dao", "离线同步数据访问接口。"),
        ("Mapper", "离线同步 MyBatis 映射接口。"),
        ("Configuration", "离线同步配置类。"),
        ("Properties", "离线同步配置属性。"),
        ("DTO", "离线同步请求数据对象。"),
        ("PO", "离线同步持久化对象。"),
        ("VO", "离线同步响应视图对象。"),
        ("Event", "离线同步领域事件。"),
        ("Status", "离线同步状态模型。"),
        ("Client", "离线同步外部服务客户端。"),
        ("Registry", "离线同步注册中心。"),
        ("Factory", "离线同步对象构建工厂。"),
    )
    for suffix, description in suffixes:
        if name.endswith(suffix):
            return description
    if kind == "interface":
        return f"离线同步模块的 {name} 接口。"
    if kind == "enum":
        return f"离线同步模块的 {name} 枚举。"
    if kind == "@interface":
        return f"离线同步模块的 {name} 注解。"
    return f"离线同步模块的 {name} 组件。"


def line_start(text: str, offset: int) -> int:
    return text.rfind("\n", 0, offset) + 1


def annotation_block_start(text: str, declaration_start: int) -> int:
    """找到紧邻类型声明之前的注解块起点。"""
    current = line_start(text, declaration_start)
    cursor = current
    while cursor > 0:
        previous_end = cursor - 1
        previous_start = text.rfind("\n", 0, previous_end) + 1
        line = text[previous_start:previous_end].strip()
        if not line:
            cursor = previous_start
            continue
        if line.startswith("@"):
            cursor = previous_start
            continue
        if line.endswith(")") or line.endswith("}") or line.endswith(","):
            probe = previous_start
            found = None
            depth = 0
            for _ in range(40):
                if probe <= 0:
                    break
                end = probe - 1
                start = text.rfind("\n", 0, end) + 1
                candidate = text[start:end].strip()
                depth += candidate.count(")") - candidate.count("(")
                if candidate.startswith("@") and depth >= 0:
                    found = start
                    break
                if not candidate:
                    break
                probe = start
            if found is not None:
                cursor = found
                continue
        break
    return cursor


def preceding_javadoc(text: str, before: int) -> tuple[int, int] | None:
    prefix = text[:before]
    match = re.search(r"/\*\*[\s\S]*?\*/[ \t\r\n]*$", prefix)
    if not match:
        return None
    end = match.start() + match.group(0).rfind("*/") + 2
    return match.start(), end


def normalize_javadoc(block: str, description: str) -> str:
    content = block.strip()
    if content.startswith("/**") and content.endswith("*/"):
        inner = content[3:-2].strip()
    else:
        inner = ""

    cleaned: list[str] = []
    for raw in inner.splitlines():
        line = re.sub(r"^\s*\*?\s?", "", raw).rstrip()
        if line.startswith("@author"):
            continue
        cleaned.append(line)

    while cleaned and not cleaned[0]:
        cleaned.pop(0)
    while cleaned and not cleaned[-1]:
        cleaned.pop()

    body_text = "\n".join(line for line in cleaned if not line.startswith("@"))
    if not CHINESE_PATTERN.search(body_text):
        cleaned = [description, ""] + cleaned
    elif description not in cleaned and cleaned and cleaned[0].startswith("TODO"):
        cleaned.insert(0, description)
        cleaned.insert(1, "")

    while cleaned and not cleaned[-1]:
        cleaned.pop()
    if cleaned:
        cleaned.append("")
    cleaned.append(f"@author {AUTHOR}")

    result = ["/**"]
    for line in cleaned:
        result.append(" *" if not line else f" * {line}")
    result.append(" */")
    return "\n".join(result)


def add_class_javadoc(text: str) -> tuple[str, str | None]:
    top_level = next(
        (match for match in TYPE_PATTERN.finditer(text) if not match.group("indent")),
        None,
    )
    if top_level is None:
        return text, None

    name = top_level.group("name")
    description = description_for(name, top_level.group("kind"))
    annotations_start = annotation_block_start(text, top_level.start())
    existing = preceding_javadoc(text, annotations_start)

    if existing is None:
        javadoc = normalize_javadoc("/** */", description)
        return text[:annotations_start] + javadoc + "\n" + text[annotations_start:], name

    start, end = existing
    updated_block = normalize_javadoc(text[start:end], description)
    return text[:start] + updated_block + text[end:], name


def matching_index(text: str, start: int, opening: str, closing: str) -> int:
    depth = 0
    in_string = False
    in_char = False
    escaped = False
    index = start
    while index < len(text):
        char = text[index]
        if escaped:
            escaped = False
        elif char == "\\" and (in_string or in_char):
            escaped = True
        elif char == '"' and not in_char:
            in_string = not in_string
        elif char == "'" and not in_string:
            in_char = not in_char
        elif not in_string and not in_char:
            if char == opening:
                depth += 1
            elif char == closing:
                depth -= 1
                if depth == 0:
                    return index
        index += 1
    return -1


def ensure_lombok_import(text: str) -> str:
    if "import lombok.RequiredArgsConstructor;" in text:
        return text
    imports = list(re.finditer(r"(?m)^import\s+[^;]+;\s*$", text))
    if imports:
        position = imports[-1].end()
        return text[:position] + "\nimport lombok.RequiredArgsConstructor;" + text[position:]
    package = re.search(r"(?m)^package\s+[^;]+;\s*$", text)
    if package:
        position = package.end()
        return text[:position] + "\n\nimport lombok.RequiredArgsConstructor;" + text[position:]
    return text


def add_required_args_constructor(text: str, class_name: str | None) -> tuple[str, bool]:
    if not class_name or "@RequiredArgsConstructor" in text:
        return text, False

    final_fields = re.findall(
        r"(?m)^\s*private\s+final\s+[A-Za-z_$][\w$<>,.?\[\] ]*\s+"
        r"([A-Za-z_$][\w$]*)\s*;\s*$",
        text,
    )
    if not final_fields:
        return text, False

    constructors = list(
        re.compile(rf"(?m)^[ \t]*public\s+{re.escape(class_name)}\s*\(").finditer(text)
    )
    if len(constructors) != 1:
        return text, False

    constructor = constructors[0]
    open_paren = text.find("(", constructor.start())
    close_paren = matching_index(text, open_paren, "(", ")")
    if close_paren < 0:
        return text, False
    parameters = text[open_paren + 1:close_paren]
    if "@" in parameters:
        return text, False

    body_start = close_paren + 1
    while body_start < len(text) and text[body_start].isspace():
        body_start += 1
    if body_start >= len(text) or text[body_start] != "{":
        return text, False
    body_end = matching_index(text, body_start, "{", "}")
    if body_end < 0:
        return text, False

    body = text[body_start + 1:body_end]
    if "//" in body or "/*" in body:
        return text, False
    assignments = re.findall(
        r"this\.([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;",
        body,
    )
    remainder = re.sub(
        r"this\.[A-Za-z_$][\w$]*\s*=\s*[A-Za-z_$][\w$]*\s*;",
        "",
        body,
    )
    if remainder.strip():
        return text, False
    if not assignments or any(left != right for left, right in assignments):
        return text, False
    if set(left for left, _ in assignments) != set(final_fields):
        return text, False

    start = line_start(text, constructor.start())
    end = body_end + 1
    while end < len(text) and text[end] in " \t":
        end += 1
    if end < len(text) and text[end] == "\r":
        end += 1
    if end < len(text) and text[end] == "\n":
        end += 1
    updated = ensure_lombok_import(text[:start] + text[end:])

    declaration = next(
        (
            match
            for match in TYPE_PATTERN.finditer(updated)
            if not match.group("indent") and match.group("name") == class_name
        ),
        None,
    )
    if declaration is None:
        raise RuntimeError(f"未找到 {class_name} 类型声明")
    updated = (
        updated[:declaration.start()]
        + "@RequiredArgsConstructor\n"
        + updated[declaration.start():]
    )
    return updated, True


def verify_file(path: Path, text: str) -> None:
    top_level = next(
        (match for match in TYPE_PATTERN.finditer(text) if not match.group("indent")),
        None,
    )
    if top_level is None:
        return
    annotations_start = annotation_block_start(text, top_level.start())
    existing = preceding_javadoc(text, annotations_start)
    if existing is None:
        raise RuntimeError(f"{path}: 缺少类注释")
    block = text[existing[0]:existing[1]]
    if not CHINESE_PATTERN.search(block):
        raise RuntimeError(f"{path}: 类注释缺少中文说明")
    if block.count(f"@author {AUTHOR}") != 1:
        raise RuntimeError(f"{path}: 作者标记数量不正确")
    if text.count("@RequiredArgsConstructor") > 1:
        raise RuntimeError(f"{path}: 重复使用 @RequiredArgsConstructor")


def stabilize(text: str) -> tuple[str, bool]:
    current = text
    converted_any = False
    for _ in range(MAX_STABILIZE_PASSES):
        updated, class_name = add_class_javadoc(current)
        updated, converted = add_required_args_constructor(updated, class_name)
        converted_any = converted_any or converted
        if updated == current:
            return updated, converted_any
        current = updated
    raise RuntimeError("源码规范化在限定次数内未达到稳定状态")


def main() -> None:
    changed = 0
    lombok_converted = 0
    checked = 0
    for path in java_files():
        checked += 1
        original = path.read_text(encoding="utf-8")
        updated, converted = stabilize(original)
        verify_file(path, updated)
        verify_again, _ = stabilize(updated)
        if verify_again != updated:
            raise RuntimeError(f"{path}: 源码规范化不满足幂等性")
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
        if converted:
            lombok_converted += 1
    if checked == 0:
        raise RuntimeError("未找到离线同步 Java 源码")
    print(
        f"checked={checked} changed={changed} "
        f"lombok_required_args_constructor={lombok_converted}"
    )


if __name__ == "__main__":
    main()
