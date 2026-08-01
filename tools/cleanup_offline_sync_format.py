#!/usr/bin/env python3
"""整理离线同步注释与 Lombok 自动改造后的纯格式问题。"""

from pathlib import Path
import re

TARGET_ROOTS = (
    Path(
        "yak-ops-business/yak-ops-business-sync/"
        "yak-ops-business-sync-offline/src/main/java"
    ),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/dto/sync/offline"),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/po/sync/offline"),
    Path("yak-ops-common/src/main/java/io/yak/ops/common/bean/vo/sync/offline"),
)

LOMBOK_IMPORT = "import lombok.RequiredArgsConstructor;"


def normalize_lombok_import(text: str) -> str:
    if "@RequiredArgsConstructor" not in text:
        return text

    text = re.sub(
        r"(?m)^import lombok\.RequiredArgsConstructor;[ \t]*\r?\n?",
        "",
        text,
    )
    org_import = re.search(r"(?m)^import org\.", text)
    if org_import:
        position = org_import.start()
        return text[:position] + LOMBOK_IMPORT + "\n" + text[position:]

    imports = list(re.finditer(r"(?m)^import\s+[^;]+;[ \t]*$", text))
    if imports:
        position = imports[-1].end()
        return text[:position] + "\n" + LOMBOK_IMPORT + text[position:]
    return text


def normalize_spacing(text: str) -> str:
    text = re.sub(
        r"(?m)(^import\s+[^;]+;[ \t]*)\r?\n(?=/\*\*)",
        r"\1\n\n",
        text,
    )
    text = re.sub(
        r"\n(?:[ \t]*\n){2,}(?=  (?:public|protected|private|@))",
        "\n\n",
        text,
    )
    return text


def main() -> None:
    checked = 0
    changed = 0
    for root in TARGET_ROOTS:
        if not root.exists():
            continue
        for path in sorted(root.rglob("*.java")):
            checked += 1
            original = path.read_text(encoding="utf-8")
            updated = normalize_spacing(normalize_lombok_import(original))
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed += 1
    if checked == 0:
        raise RuntimeError("未找到离线同步 Java 源码")
    print(f"checked={checked} changed={changed}")


if __name__ == "__main__":
    main()
