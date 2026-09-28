#!/usr/bin/env python3
"""Convert a PlantUML class diagram into a Software Ideas Modeler .simp project.

The project layout follows the single-file schema Software Ideas Modeler
15.20 opens (project version 15.1, which skips the older compatibility
rewrites). Model elements live in the project repository, and each diagram
places those shared elements. Diagrams are split by subject so the project
opens as a set of readable views instead of one tangled canvas.
"""

from __future__ import annotations

import argparse
import hashlib
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path
from xml.sax.saxutils import escape

BUILTIN_TYPES = {
    "String": "Uml.String",
    "Integer": "Uml.Integer",
    "Boolean": "Uml.Boolean",
    "UnlimitedNatural": "Uml.UnlimitedNatural",
    "Real": "Uml.Real",
    "DateTime": "Uml.DateTime",
}

# Column order used when these names are present. Anything else is appended
# by kind (enums, stereotyped types, UI, then the remaining domain).
PREFERRED_COLUMNS = [
    (
        "User interface",
        [
            "RegistrationUI",
            "SearchUI",
            "CartUI",
            "CheckoutUI",
            "InventoryUI",
            "ReturnUI",
        ],
    ),
    (
        "Accounts",
        ["Customer", "Account", "ShoppingCart", "EmailValidator"],
    ),
    (
        "Orders",
        ["Order", "OrderLine", "Payment", "PaymentProcessor", "Receipt", "Return"],
    ),
    (
        "Catalog",
        ["Inventory", "Item", "ImageRepository"],
    ),
    (
        "Statuses",
        ["AccountStatus", "OrderStatus", "PaymentStatus"],
    ),
]

# Extra diagrams. None means the full model. A slice is kept only when every
# named element exists, so other PlantUML files still get a single overview.
DIAGRAM_SLICES = [
    ("Class Apocrypha", None),
    (
        "Accounts",
        [
            "Customer",
            "Account",
            "ShoppingCart",
            "EmailValidator",
            "AccountStatus",
        ],
    ),
    (
        "Catalog",
        ["Inventory", "Item", "ImageRepository", "ShoppingCart"],
    ),
    (
        "Orders and Returns",
        [
            "Order",
            "OrderLine",
            "Payment",
            "Receipt",
            "Return",
            "Item",
            "PaymentProcessor",
            "OrderStatus",
            "PaymentStatus",
        ],
    ),
    (
        "User Interface",
        [
            "RegistrationUI",
            "SearchUI",
            "CartUI",
            "CheckoutUI",
            "InventoryUI",
            "ReturnUI",
            "Customer",
            "EmailValidator",
            "Item",
            "ShoppingCart",
            "Order",
            "Inventory",
            "Return",
        ],
    ),
]

VISIBILITY = {"+": "public", "-": "private", "#": "protected", "~": "package"}

CLASS_RE = re.compile(
    r"^(enum|interface|abstract\s+class|class)\s+(\w+)"
    r"(?:\s+<<([^>]+)>>)?\s*(\{)?\s*$"
)
MEMBER_RE = re.compile(
    r"^([+\-#~])\s*(\w+)\s*(?:\((.*?)\))?\s*(?::\s*([^\s<]+))?"
    r"(?:\s+<<([^>]+)>>)?\s*$"
)
REL_RE = re.compile(
    r"^(\w+)\s+"
    r'(?:"([^"]*)"\s+)?'
    r"([<>|*.o-]{2,})\s*"
    r'(?:"([^"]*)"\s+)?'
    r"(\w+)"
    r"(?:\s*:\s*(.*?))?\s*$"
)
NOTE_START_RE = re.compile(
    r"^note\s+(?:bottom|top|left|right)\s+of\s+(\w+)\s*$", re.IGNORECASE
)


@dataclass
class Member:
    kind: str  # attribute or operation
    visibility: str
    name: str
    type_name: str | None = None
    stereotype: str | None = None
    parameters: list[tuple[str, str]] = field(default_factory=list)


@dataclass
class Element:
    kind: str  # class, enum, interface
    name: str
    stereotype: str | None = None
    members: list[Member] = field(default_factory=list)
    literals: list[str] = field(default_factory=list)
    element_id: str = ""


@dataclass
class Relation:
    left: str
    right: str
    left_mult: str | None
    right_mult: str | None
    label: str
    kind: str  # association or dependency
    start_aggregation: str
    end_aggregation: str
    start_navigability: str
    end_navigability: str
    element_id: str = ""


@dataclass
class Note:
    target: str
    text: str
    element_id: str = ""
    connector_id: str = ""


@dataclass
class Model:
    title: str
    description: str
    elements: dict[str, Element]
    relations: list[Relation]
    notes: list[Note]
    order: list[str]


def sid(prefix: str, key: str) -> str:
    digest = hashlib.md5(key.encode("utf-8")).hexdigest()
    if prefix == "iid":
        return digest
    number = int(digest[:16], 16) % (10**18)
    return f"{prefix}{number:018d}"


def parse_parameters(raw: str) -> list[tuple[str, str]]:
    raw = raw.strip()
    if not raw:
        return []
    params = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" in part:
            name, type_name = part.split(":", 1)
            params.append((name.strip(), type_name.strip()))
        else:
            params.append((part, ""))
    return params


def classify_arrow(arrow: str, label: str) -> tuple[str, str, str, str, str, str]:
    label = (label or "").strip()
    label_right = label.endswith(">")
    label_left = label.startswith("<")
    if label_right:
        label = label[:-1].rstrip()
    if label_left:
        label = label[1:].lstrip()

    start_aggregation = "association"
    end_aggregation = "association"
    if "*" in arrow[:2]:
        start_aggregation = "composition"
    elif "o" in arrow[:2]:
        start_aggregation = "aggregation"
    if arrow.endswith("*"):
        end_aggregation = "composition"
    elif arrow.endswith("o"):
        end_aggregation = "aggregation"

    start_nav = "yes" if arrow.startswith("<") else ""
    end_nav = "yes" if arrow.endswith(">") else ""
    if label_right and not end_nav and not start_nav:
        end_nav = "yes"
    if label_left and not start_nav and not end_nav:
        start_nav = "yes"

    kind = "dependency" if ".." in arrow else "association"
    return label, kind, start_aggregation, end_aggregation, start_nav, end_nav


def parse_puml(text: str) -> Model:
    lines = text.splitlines()
    title = "Class Diagram"
    description_lines: list[str] = []
    elements: dict[str, Element] = {}
    order: list[str] = []
    relations: list[Relation] = []
    notes: list[Note] = []

    index = 0
    while index < len(lines):
        raw = lines[index]
        line = raw.strip()
        index += 1
        if not line or line.startswith("'") or line.startswith("skinparam"):
            if line.startswith("'") and not elements and not relations:
                description_lines.append(line.lstrip("'").strip())
            continue
        if line.startswith("@startuml"):
            parts = line.split(None, 1)
            if len(parts) == 2:
                title = parts[1].replace("_", " ")
            continue
        if line.startswith("@enduml"):
            break
        note_match = NOTE_START_RE.match(line)
        if note_match:
            target = note_match.group(1)
            body: list[str] = []
            while index < len(lines) and lines[index].strip().lower() != "end note":
                body.append(lines[index].strip())
                index += 1
            index += 1  # skip end note
            notes.append(Note(target=target, text="\n".join(body).strip()))
            continue

        class_match = CLASS_RE.match(line)
        if class_match:
            kind_token, name, stereotype, opened = class_match.groups()
            kind = "enum" if kind_token == "enum" else "interface" if kind_token == "interface" else "class"
            element = Element(kind=kind, name=name, stereotype=stereotype)
            if opened:
                while index < len(lines):
                    body = lines[index].strip()
                    index += 1
                    if body.startswith("}"):
                        break
                    if not body or body.startswith("'"):
                        continue
                    if kind == "enum":
                        literal = body.split("{", 1)[0].strip().rstrip(",")
                        if literal:
                            element.literals.append(literal)
                        continue
                    member_match = MEMBER_RE.match(body)
                    if not member_match:
                        continue
                    vis, member_name, params, type_name, member_stereo = member_match.groups()
                    if params is not None:
                        element.members.append(
                            Member(
                                kind="operation",
                                visibility=VISIBILITY[vis],
                                name=member_name,
                                type_name=type_name,
                                stereotype=member_stereo,
                                parameters=parse_parameters(params),
                            )
                        )
                    else:
                        element.members.append(
                            Member(
                                kind="attribute",
                                visibility=VISIBILITY[vis],
                                name=member_name,
                                type_name=type_name,
                                stereotype=member_stereo,
                            )
                        )
            elements[name] = element
            order.append(name)
            continue

        rel_match = REL_RE.match(line)
        if rel_match:
            left, left_mult, arrow, right_mult, right, label = rel_match.groups()
            (
                clean_label,
                kind,
                start_aggregation,
                end_aggregation,
                start_nav,
                end_nav,
            ) = classify_arrow(arrow, label or "")
            relations.append(
                Relation(
                    left=left,
                    right=right,
                    left_mult=left_mult,
                    right_mult=right_mult,
                    label=clean_label,
                    kind=kind,
                    start_aggregation=start_aggregation,
                    end_aggregation=end_aggregation,
                    start_navigability=start_nav,
                    end_navigability=end_nav,
                )
            )
            continue

        raise ValueError(f"Unrecognized PlantUML line {index}: {line}")

    description = " ".join(part for part in description_lines if part)
    return Model(title, description, elements, relations, notes, order)


def type_id_for(type_name: str | None, elements: dict[str, Element]) -> tuple[str, str]:
    if not type_name:
        return "", ""
    if type_name in elements:
        return type_name, f"Class:{elements[type_name].element_id}"
    if type_name in BUILTIN_TYPES:
        return type_name, BUILTIN_TYPES[type_name]
    return type_name, f"custom:{type_name}"


def box_size(element: Element) -> tuple[int, int]:
    lines = [element.name]
    if element.kind == "enum":
        lines.extend(element.literals)
        height = 36 + 18 * max(1, len(element.literals))
    else:
        attrs = [m for m in element.members if m.kind == "attribute"]
        ops = [m for m in element.members if m.kind == "operation"]
        for member in element.members:
            rendered = member.name
            if member.parameters:
                rendered += "(" + ", ".join(name for name, _ in member.parameters) + ")"
            if member.type_name:
                rendered += " : " + member.type_name
            lines.append(rendered)
        height = 42
        if attrs:
            height += 10 + 18 * len(attrs)
        if ops:
            height += 10 + 18 * len(ops)
        if not attrs and not ops:
            height = 52
    width = int(28 + 7.4 * max(len(line) for line in lines))
    return max(160, min(340, width)), height


def note_size(text: str) -> tuple[int, int]:
    lines = text.splitlines() or [""]
    width = int(24 + 6.6 * max(len(line) for line in lines))
    height = 18 + 16 * len(lines)
    return max(180, min(280, width)), height


def layout_columns(
    columns: list[tuple[str, list[str]]],
    elements: dict[str, Element],
    notes: list[Note],
) -> dict[str, tuple[int, int, int, int]]:
    notes_by_target = {note.target: note for note in notes}
    positions: dict[str, tuple[int, int, int, int]] = {}
    x = 48
    for _title, names in columns:
        y = 48
        column_width = 0
        for name in names:
            element = elements[name]
            width, height = box_size(element)
            positions[name] = (x, y, width, height)
            y += height + 36
            column_width = max(column_width, width)
            note = notes_by_target.get(name)
            if note is not None:
                note_width, note_height = note_size(note.text)
                positions[note.element_id] = (x, y, note_width, note_height)
                y += note_height + 36
                column_width = max(column_width, note_width)
        x += column_width + 110
    return positions


def columns_for(names: list[str], elements: dict[str, Element]) -> list[tuple[str, list[str]]]:
    remaining = set(names)
    columns: list[tuple[str, list[str]]] = []
    for title, preferred in PREFERRED_COLUMNS:
        present = [name for name in preferred if name in remaining]
        if present:
            columns.append((title, present))
            remaining.difference_update(present)
    if remaining:
        enums = [name for name in names if name in remaining and elements[name].kind == "enum"]
        stereotyped = [
            name
            for name in names
            if name in remaining and elements[name].stereotype and name not in enums
        ]
        ui = [name for name in names if name in remaining and name.endswith("UI")]
        rest = [
            name
            for name in names
            if name in remaining and name not in enums and name not in stereotyped and name not in ui
        ]
        for title, group in (
            ("User interface", ui),
            ("Stereotypes", stereotyped),
            ("Domain", rest),
            ("Enumerations", enums),
        ):
            if group:
                columns.append((title, group))
    return columns


def route(source: tuple[int, int, int, int], target: tuple[int, int, int, int], slot: int, slots: int) -> list[tuple[int, int]]:
    sx, sy, sw, sh = source
    tx, ty, tw, th = target
    spread = (slot - (slots - 1) / 2) * 14

    def clamp(value: float, low: int, high: int) -> int:
        return int(max(low + 12, min(high - 12, value)))

    if tx >= sx + sw - 8:
        y1 = clamp(sy + sh / 2 + spread, sy, sy + sh)
        y2 = clamp(ty + th / 2 + spread, ty, ty + th)
        x1, x2 = sx + sw, tx
        if abs(y1 - y2) < 10:
            return [(x1, y1), (x2, y2)]
        mid = (x1 + x2) // 2
        return [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    if sx >= tx + tw - 8:
        y1 = clamp(sy + sh / 2 + spread, sy, sy + sh)
        y2 = clamp(ty + th / 2 + spread, ty, ty + th)
        x1, x2 = sx, tx + tw
        if abs(y1 - y2) < 10:
            return [(x1, y1), (x2, y2)]
        mid = (x1 + x2) // 2
        return [(x1, y1), (mid, y1), (mid, y2), (x2, y2)]
    if ty >= sy + sh - 8:
        x1 = clamp(sx + sw / 2 + spread, sx, sx + sw)
        x2 = clamp(tx + tw / 2 + spread, tx, tx + tw)
        y1, y2 = sy + sh, ty
        if abs(x1 - x2) < 10:
            return [(x1, y1), (x2, y2)]
        mid = (y1 + y2) // 2
        return [(x1, y1), (x1, mid), (x2, mid), (x2, y2)]
    x1 = clamp(sx + sw / 2 + spread, sx, sx + sw)
    x2 = clamp(tx + tw / 2 + spread, tx, tx + tw)
    y1, y2 = sy, ty + th
    if abs(x1 - x2) < 10:
        return [(x1, y1), (x2, y2)]
    mid = (y1 + y2) // 2
    return [(x1, y1), (x1, mid), (x2, mid), (x2, y2)]


def sub_element(parent: ET.Element, tag: str, text: str | None = None, **attrs: str) -> ET.Element:
    node = ET.SubElement(parent, tag, {key: value for key, value in attrs.items() if value is not None})
    if text is not None:
        node.text = text
    return node


def add_role(
    parent: ET.Element,
    tag: str,
    multiplicity: str | None,
    navigability: str,
    aggregation: str,
    key: str,
) -> None:
    # 15.20 saves the role id as "id" and loads it from "uid".
    role_uid = "umlar-" + hashlib.md5(key.encode("utf-8")).hexdigest()
    attrs = {
        "id": role_uid,
        "uid": role_uid,
        "name": "",
        "navigability": navigability,
        "association-type": aggregation,
        "visibility": "public",
    }
    if multiplicity:
        attrs["multiplicity"] = multiplicity
    sub_element(parent, tag, **attrs)


def build_project(model: Model, stamp: str, creator: str) -> ET.Element:
    for name, element in model.elements.items():
        element.element_id = sid("di", f"element:{name}")
    for index, relation in enumerate(model.relations):
        relation.element_id = sid("di", f"relation:{index}:{relation.left}:{relation.right}:{relation.label}")
    for index, note in enumerate(model.notes):
        note.element_id = sid("di", f"note:{index}:{note.target}")
        note.connector_id = sid("di", f"note-link:{index}:{note.target}")

    root = ET.Element("sim-project", {"version": "15.1", "multi-file": "no"})
    meta = sub_element(root, "meta")
    sub_element(meta, "name", model.title)
    sub_element(meta, "authors", "")
    description = model.description or f"Converted from a PlantUML class diagram ({model.title})."
    sub_element(meta, "description", description)

    add_counters(root, model)
    sub_element(root, "alias-groups")
    add_management(root, creator)
    sub_element(root, "glossary")
    add_style_set(root)
    add_types(root, model)
    sub_element(root, "filters")
    sub_element(root, "macros")
    add_items(root, model, stamp, creator)
    add_models(root, model, stamp, creator)
    sub_element(root, "documents")
    sub_element(root, "document-templates")
    return root


def counter(parent: ET.Element, type_id: str, type_name: str, value: int, stereotype: str | None = None) -> None:
    node = sub_element(parent, "counter")
    attrs = {"type-id": type_id, "type": type_name}
    if stereotype:
        attrs["stereotype"] = stereotype
    sub_element(node, "item-type", **attrs)
    sub_element(node, "value", str(value))


def add_counters(root: ET.Element, model: Model) -> None:
    classes = sum(1 for element in model.elements.values() if element.kind == "class")
    enums = sum(1 for element in model.elements.values() if element.kind == "enum")
    associations = sum(1 for relation in model.relations if relation.kind == "association")
    dependencies = sum(1 for relation in model.relations if relation.kind == "dependency")
    attributes = sum(
        1
        for element in model.elements.values()
        for member in element.members
        if member.kind == "attribute"
    )
    operations = sum(
        1
        for element in model.elements.values()
        for member in element.members
        if member.kind == "operation"
    )
    parameters = sum(
        len(member.parameters)
        for element in model.elements.values()
        for member in element.members
        if member.kind == "operation"
    )
    literals = sum(len(element.literals) for element in model.elements.values())
    diagrams = len(diagram_plan(model))

    counters = sub_element(root, "counters", models="1")
    names = sub_element(counters, "entity-names")
    counter(names, "class", "UmlClass", classes)
    counter(names, "enumeration", "UmlEnumeration", enums, stereotype="enumeration")
    ids = sub_element(counters, "entity-ids")
    counter(ids, "class", "UmlClass", classes + 1)
    counter(ids, "enumeration", "UmlEnumeration", enums + 1)
    counter(ids, "relationship", "UmlAssociation", associations + 1)
    counter(ids, "dependency", "UmlDependency", dependencies + 1)
    counter(ids, "comment", "UmlComment", len(model.notes) + 1)
    counter(ids, "comment-connector", "UmlCommentConnector", len(model.notes) + 1)
    diagram_counters = sub_element(counters, "diagrams")
    node = sub_element(diagram_counters, "counter")
    sub_element(
        node,
        "type",
        "SoftwareIdeasModeler.Core.Diagrams.UmlDiagrams.UmlClassDiagram",
    )
    sub_element(node, "value", str(diagrams))
    fields = sub_element(counters, "fields")
    for type_name, value in (
        ("SoftwareIdeasModeler.Core.DiagramItems.Fields.AttributeField", attributes),
        ("SoftwareIdeasModeler.Core.DiagramItems.Fields.OperationField", operations),
        ("SoftwareIdeasModeler.Core.DiagramItems.Fields.ParameterField", parameters),
        ("SoftwareIdeasModeler.Core.DiagramItems.Fields.EnumerationItemField", literals),
    ):
        field_counter = sub_element(fields, "counter")
        sub_element(field_counter, "type", type_name)
        sub_element(field_counter, "value", str(value))


def add_management(root: ET.Element, creator: str) -> None:
    management = sub_element(root, "management")
    persons = sub_element(management, "persons")
    person = sub_element(persons, "person", id=creator)
    for tag, text in (
        ("first-name", ""),
        ("last-name", ""),
        ("role", ""),
        ("e-mail", ""),
        ("phone-number", ""),
        ("description", ""),
        ("color", "#00000000"),
    ):
        sub_element(person, tag, text)
    sub_element(management, "tasks")
    sub_element(management, "requirements")
    sub_element(management, "issues")
    sub_element(management, "to-dos")


def add_style_set(root: ET.Element) -> None:
    """Solid default style. The built-in set uses smooth shadows, which the
    15.20 GDI renderer can kill the process on while painting the overview."""
    style_set = sub_element(root, "style-set", version="4.0", name="Solid")
    definition = sub_element(sub_element(style_set, "default-style"), "style-definition")
    definition.set("style-name", "Default")
    definition.set("shadow-type", "flat")
    definition.set("shadow-visible", "false")
    definition.set("wrap-name-text", "true")
    definition.set("wrap-other-text", "true")
    definition.set("padding", "2")
    definition.set("margin", "0")
    for kind, font, align in (
        ("name", "Segoe UI;11.25;B", None),
        ("part-header", "Verdana;9;I", None),
        ("text", "Segoe UI;9.75;", "left"),
        ("tagged-value", "Segoe UI;9.75;", None),
        ("stereotype", "Segoe UI;9;I", None),
    ):
        attrs = {"type": kind, "use-defaults": "false", "color": "#FF555555", "font": font}
        if align:
            attrs["horizontal-alignment"] = align
        sub_element(definition, "text-style", **attrs)
    sub_element(definition, "background", type="solid", colors="#FFF2F2F2,#FFF2F2F2")
    sub_element(definition, "border", color="#FF555555", width="2", **{"dash-style": "Solid"})
    sub_element(definition, "label-connector", color="#80000000", width="1", **{"dash-style": "Dash"})


def add_types(root: ET.Element, model: Model) -> None:
    types = sub_element(root, "types")
    type_sets = sub_element(types, "type-sets")
    sub_element(type_sets, "type-set", file="UmlTypes.xml")
    custom = sub_element(types, "custom-types")
    referenced: set[str] = set()
    extras: set[str] = set()
    for element in model.elements.values():
        for member in element.members:
            if member.type_name:
                (referenced if member.type_name in model.elements else extras).add(member.type_name)
            for _name, param_type in member.parameters:
                if param_type:
                    (referenced if param_type in model.elements else extras).add(param_type)
    for name in model.order:
        if name not in referenced:
            continue
        element = model.elements[name]
        sub_element(
            custom,
            "type",
            id=f"Class:{element.element_id}",
            tid="",
            name=element.name,
            description="",
            nullable="false",
            **{"class-ref": element.element_id},
        )
    for type_name in sorted(extras):
        if type_name in BUILTIN_TYPES:
            continue
        sub_element(
            custom,
            "type",
            id=f"custom:{type_name}",
            tid="",
            name=type_name,
            description="",
            nullable="false",
        )


def add_items(root: ET.Element, model: Model, stamp: str, creator: str) -> None:
    items = sub_element(root, "items")
    class_no = enum_no = rel_no = dep_no = 0
    for name in model.order:
        element = model.elements[name]
        if element.kind == "enum":
            enum_no += 1
            add_enum_item(items, element, f"E{enum_no:03d}", stamp, creator)
        else:
            class_no += 1
            add_class_item(items, element, model, f"C{class_no:03d}", stamp, creator)
    for relation in model.relations:
        if relation.kind == "dependency":
            dep_no += 1
            add_dependency_item(items, relation, model, f"DEP{dep_no:03d}", stamp, creator)
        else:
            rel_no += 1
            add_association_item(items, relation, model, f"REL{rel_no:03d}", stamp, creator)
    for index, note in enumerate(model.notes, start=1):
        add_note_item(items, note, model, f"CMT{index:03d}", f"CN{index:03d}", stamp, creator)


def item_shell(
    parent: ET.Element,
    element_id: str,
    cid: str,
    type_name: str,
    name: str,
    stamp: str,
    creator: str,
    **extra: str,
) -> ET.Element:
    attrs = {
        "id": element_id,
        "cid": cid,
        "type": type_name,
        "name": name,
        "style-class": "",
        "visibility": "package",
        "change-tracking-state": "added",
        "creator": creator,
        "creation-date": stamp,
    }
    attrs.update(extra)
    node = sub_element(parent, "item", **attrs)
    sub_element(node, "style", **{"class": "default"})
    return node


def add_class_item(parent: ET.Element, element: Element, model: Model, cid: str, stamp: str, creator: str) -> None:
    node = item_shell(parent, element.element_id, cid, "class", element.name, stamp, creator)
    if element.stereotype:
        stereotypes = sub_element(node, "stereotypes")
        sub_element(stereotypes, "stereotype", name=element.stereotype)
    attributes = [member for member in element.members if member.kind == "attribute"]
    operations = [member for member in element.members if member.kind == "operation"]
    if attributes:
        attr_parent = sub_element(node, "attributes")
        for number, member in enumerate(attributes, start=1):
            type_label, type_ref = type_id_for(member.type_name, model.elements)
            attr = sub_element(
                attr_parent,
                "attribute",
                id=sid("a", f"attr:{element.name}:{member.name}"),
                cid=f"ELEM{number:03d}",
                name=member.name,
                type=type_label,
                **{"type-id": type_ref},
                visibility=member.visibility,
                **({"is-id": "true"} if member.stereotype == "PK" else {}),
            )
            sub_element(attr, "style", **{"class": "default"})
    if operations:
        op_parent = sub_element(node, "operations")
        for member in operations:
            type_label, type_ref = type_id_for(member.type_name, model.elements)
            op_attrs = {
                "id": sid("o", f"op:{element.name}:{member.name}"),
                "name": member.name,
                "visibility": member.visibility,
                "abstract": "false",
                "virtual": "false",
                "static": "false",
            }
            if type_label:
                op_attrs["type"] = type_label
                op_attrs["type-id"] = type_ref
            operation = sub_element(op_parent, "operation", **op_attrs)
            if member.parameters:
                params = sub_element(operation, "parameters")
                for param_name, param_type in member.parameters:
                    param_label, param_ref = type_id_for(param_type, model.elements)
                    sub_element(
                        params,
                        "parameter",
                        id=sid("pm", f"param:{element.name}:{member.name}:{param_name}"),
                        name=param_name,
                        type=param_label,
                        **{"type-id": param_ref},
                        direction="in",
                    )
            sub_element(operation, "source-codes")


def add_enum_item(parent: ET.Element, element: Element, cid: str, stamp: str, creator: str) -> None:
    node = item_shell(parent, element.element_id, cid, "enumeration", element.name, stamp, creator)
    stereotypes = sub_element(node, "stereotypes")
    sub_element(stereotypes, "stereotype", name="enumeration")
    literals = sub_element(node, "enumeration-items")
    for number, literal in enumerate(element.literals, start=1):
        item = sub_element(
            literals,
            "enumeration-item",
            id=sid("a", f"literal:{element.name}:{literal}"),
            cid=f"ELEM{number:03d}",
            name=literal,
        )
        sub_element(item, "style", **{"class": "default"})


def add_association_item(
    parent: ET.Element, relation: Relation, model: Model, cid: str, stamp: str, creator: str
) -> None:
    node = item_shell(
        parent,
        relation.element_id,
        cid,
        "relationship",
        relation.label,
        stamp,
        creator,
        **{"from": model.elements[relation.left].element_id, "to": model.elements[relation.right].element_id},
    )
    link = sub_element(
        node,
        "relation",
        **{
            "from": model.elements[relation.left].element_id,
            "to": model.elements[relation.right].element_id,
        },
    )
    add_role(
        link,
        "start-role",
        relation.left_mult,
        relation.start_navigability,
        relation.start_aggregation,
        f"{relation.element_id}:start",
    )
    add_role(
        link,
        "end-role",
        relation.right_mult,
        relation.end_navigability,
        relation.end_aggregation,
        f"{relation.element_id}:end",
    )


def add_dependency_item(
    parent: ET.Element, relation: Relation, model: Model, cid: str, stamp: str, creator: str
) -> None:
    item_shell(
        parent,
        relation.element_id,
        cid,
        "dependency",
        relation.label,
        stamp,
        creator,
        **{"from": model.elements[relation.left].element_id, "to": model.elements[relation.right].element_id},
    )


def add_note_item(
    parent: ET.Element, note: Note, model: Model, cid: str, connector_cid: str, stamp: str, creator: str
) -> None:
    node = item_shell(parent, note.element_id, cid, "comment", f"{note.target} note", stamp, creator)
    sub_element(node, "comment", note.text)
    item_shell(
        parent,
        note.connector_id,
        connector_cid,
        "comment-connector",
        "",
        stamp,
        creator,
        **{"from": note.element_id, "to": model.elements[note.target].element_id},
    )


def diagram_plan(model: Model) -> list[tuple[str, list[str] | None]]:
    names = set(model.elements)
    plan = []
    for title, members in DIAGRAM_SLICES:
        if members is None or set(members).issubset(names):
            plan.append((title, members))
    if not plan:
        plan.append((model.title, None))
    return plan


def add_models(root: ET.Element, model: Model, stamp: str, creator: str) -> None:
    models = sub_element(root, "models")
    project_model = sub_element(
        models,
        "model",
        id=sid("p", f"model:{model.title}"),
        name=model.title.replace(" ", ""),
        namespace="",
        **{"order-index": "1", "expanded": "true"},
    )
    meta = sub_element(project_model, "meta")
    authors = sub_element(meta, "authors")
    sub_element(authors, "author", " ")
    sub_element(meta, "description", model.description)
    sub_element(meta, "creation-date", stamp)
    sub_element(meta, "change-date", stamp)
    sub_element(meta, "revision-count", "0")
    sub_element(meta, "version", "")
    sub_element(project_model, "abstract-items")
    sub_element(project_model, "sub-models")

    for index, (title, members) in enumerate(diagram_plan(model), start=1):
        selected = model.order if members is None else [name for name in members if name in model.elements]
        add_diagram(project_model, model, title, selected, index, stamp, creator)


DIAGRAM_FLAGS = {
    "show-id": "false",
    "show-name": "true",
    "show-parent-name": "false",
    "show-stereotypes": "true",
    "show-tagged-values": "false",
    "show-template-parameters": "true",
    "show-fields": "true",
    "show-empty-compartments": "true",
    "show-special-indicators": "false",
    "show-attributes": "true",
    "show-attribute-visibility": "true",
    "show-operations": "true",
    "show-operation-parameters": "true",
    "show-operation-visibility": "true",
    "show-nullability": "true",
    "show-sequence-number": "false",
    "show-extension-points": "false",
    "show-relationship-texts": "true",
    "show-description": "false",
    "show-field-description": "false",
    "auto-routed-paths": "false",
    "view-location": "-40,-40",
}


def add_diagram(
    parent: ET.Element,
    model: Model,
    title: str,
    names: list[str],
    order_index: int,
    stamp: str,
    creator: str,
) -> None:
    selected = set(names)
    notes = [note for note in model.notes if note.target in selected]
    relations = [
        relation
        for relation in model.relations
        if relation.left in selected and relation.right in selected
    ]
    columns = columns_for(names, model.elements)
    positions = layout_columns(columns, model.elements, notes)
    diagram = sub_element(
        parent,
        "diagram",
        type="uml-class",
        id=sid("p", f"diagram:{title}"),
        name=title,
        **{
            "order-index": str(order_index),
            "overview-order-index": str(order_index - 1),
            **DIAGRAM_FLAGS,
        },
    )
    style = sub_element(diagram, "style")
    sub_element(style, "background-color", index="1", color="#FFFFFFFF")
    sub_element(style, "background-color", index="2", color="#FFFFFFFF")
    sub_element(style, "background-type", type="solid")
    sub_element(diagram, "size", width="1", height="1", unit="px", type="ExpandableAllDirections")
    meta = sub_element(diagram, "meta")
    authors = sub_element(meta, "authors")
    sub_element(authors, "author", " ")
    sub_element(meta, "description", f"{title} class diagram")
    sub_element(meta, "creation-date", stamp)
    sub_element(meta, "change-date", stamp)
    sub_element(meta, "revision-count", "0")
    sub_element(meta, "version", "")
    sub_element(diagram, "abstract-items")
    layer = sub_element(diagram, "layer", name="Default", visible="true", enabled="true", locked="false")

    shape_iids: dict[str, str] = {}
    order = 0
    for name in names:
        element = model.elements[name]
        shape_iid = sid("iid", f"shape:{title}:{name}")
        shape_iids[name] = shape_iid
        x, y, width, height = positions[name]
        shape = sub_element(
            layer,
            "item",
            id=element.element_id,
            iid=shape_iid,
            **{"creation-date": stamp, "order-index": str(order), "type": "entity"},
        )
        sub_element(
            shape,
            "layout",
            ax=str(x),
            ay=str(y),
            awidth=str(width),
            aheight=str(height),
            x=str(x),
            y=str(y),
            width=str(width),
            height=str(height),
        )
        sub_element(shape, "enumeration" if element.kind == "enum" else "class")
        order += 1

    for note in notes:
        shape_iid = sid("iid", f"shape:{title}:{note.element_id}")
        shape_iids[note.element_id] = shape_iid
        x, y, width, height = positions[note.element_id]
        shape = sub_element(
            layer,
            "item",
            id=note.element_id,
            iid=shape_iid,
            **{"creation-date": stamp, "order-index": str(order), "type": "entity"},
        )
        sub_element(
            shape,
            "layout",
            ax=str(x),
            ay=str(y),
            awidth=str(width),
            aheight=str(height),
            x=str(x),
            y=str(y),
            width=str(width),
            height=str(height),
        )
        order += 1
        points = route(positions[note.element_id], positions[note.target], 0, 1)
        add_connector(
            layer,
            note.connector_id,
            sid("iid", f"shape:{title}:{note.connector_id}"),
            stamp,
            order,
            "comment-connector",
            points,
            note.element_id,
            shape_iid,
            model.elements[note.target].element_id,
            shape_iids[note.target],
        )
        order += 1

    pair_slots: dict[tuple[str, str], list[Relation]] = {}
    for relation in relations:
        pair_slots.setdefault((relation.left, relation.right), []).append(relation)
    for relation in relations:
        group = pair_slots[(relation.left, relation.right)]
        slot = group.index(relation)
        points = route(positions[relation.left], positions[relation.right], slot, len(group))
        add_connector(
            layer,
            relation.element_id,
            sid("iid", f"shape:{title}:{relation.element_id}"),
            stamp,
            order,
            "relation",
            points,
            model.elements[relation.left].element_id,
            shape_iids[relation.left],
            model.elements[relation.right].element_id,
            shape_iids[relation.right],
        )
        order += 1


def add_connector(
    layer: ET.Element,
    element_id: str,
    shape_iid: str,
    stamp: str,
    order_index: int,
    type_name: str,
    points: list[tuple[int, int]],
    from_id: str,
    from_iid: str,
    to_id: str,
    to_iid: str,
) -> None:
    shape = sub_element(
        layer,
        "item",
        id=element_id,
        iid=shape_iid,
        **{"creation-date": stamp, "order-index": str(order_index), "type": type_name},
    )
    x1, y1 = points[0]
    x2, y2 = points[-1]
    # Keep every connector oblique. 15.20 repairs "perpendicular" lines on
    # open, and a non-orthogonal polyline in that style takes down the viewer.
    layout = sub_element(
        shape,
        "layout",
        **{
            "start-role-position": "18,14",
            "end-role-position": "18,-14",
            "start-multiplicity-position": "16,-16",
            "end-multiplicity-position": "16,16",
            "line-style": "oblique",
            "lock-start-point": "false",
            "lock-end-point": "false",
            "lock-to-fields": "false",
            "auto-path": "",
            "x1": str(x1),
            "y1": str(y1),
            "x2": str(x2),
            "y2": str(y2),
            "start-border-pos": "0.5",
            "end-border-pos": "0.5",
            "name-position": "0,0",
        },
    )
    point_parent = sub_element(layout, "points")
    for x, y in points:
        sub_element(point_parent, "point", x=str(x), y=str(y))
    sub_element(
        shape,
        "relation",
        **{"from": from_id, "from-iid": from_iid, "to": to_id, "to-iid": to_iid},
    )


def write_simp(path: Path, root: ET.Element) -> None:
    ET.indent(root, space="  ")
    body = ET.tostring(root, encoding="unicode")
    document = '<?xml version="1.0" encoding="utf-8" standalone="yes"?>\r\n' + body.replace("\n", "\r\n") + "\r\n"
    path.write_bytes(b"\xef\xbb\xbf" + document.encode("utf-8"))


def render_preview(model: Model, root: ET.Element, path: Path) -> None:
    from PIL import Image, ImageDraw, ImageFont

    font = ImageFont.load_default()
    diagrams = list(root.find("models/model").findall("diagram"))
    width = 1400
    padding = 24
    blocks = []
    for diagram in diagrams:
        shapes = []
        for item in diagram.find("layer"):
            layout = item.find("layout")
            if item.get("type") == "entity" and layout.get("width"):
                shapes.append(
                    (
                        int(layout.get("x")),
                        int(layout.get("y")),
                        int(layout.get("width")),
                        int(layout.get("height")),
                        item.get("id"),
                    )
                )
        if not shapes:
            continue
        max_x = max(x + w for x, y, w, h, _ in shapes)
        max_y = max(y + h for x, y, w, h, _ in shapes)
        blocks.append((diagram.get("name"), shapes, max_x + 80, max_y + 80))
    height = padding + sum(block_height + 48 for _name, _shapes, _w, block_height in blocks)
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    y_offset = padding
    id_names = {element.element_id: element.name for element in model.elements.values()}
    id_names.update({note.element_id: "note" for note in model.notes})
    for name, shapes, _block_w, block_h in blocks:
        draw.text((padding, y_offset), name, fill="black", font=font)
        y_offset += 18
        for x, y, w, h, element_id in shapes:
            box = (x + padding, y + y_offset, x + w + padding, y + h + y_offset)
            draw.rectangle(box, outline="#234", fill="#f7f4ea" if id_names.get(element_id) != "note" else "#fff8d6")
            draw.text((box[0] + 6, box[1] + 6), id_names.get(element_id, ""), fill="#234", font=font)
        y_offset += block_h
    image.save(path)


def convert(source: Path, destination: Path, preview: Path | None = None) -> Model:
    model = parse_puml(source.read_text(encoding="utf-8"))
    referenced = (
        {relation.left for relation in model.relations}
        | {relation.right for relation in model.relations}
        | {note.target for note in model.notes}
    )
    missing = sorted(referenced - set(model.elements))
    if missing:
        raise SystemExit(f"Relationships refer to unknown elements: {', '.join(missing)}")
    creator = sid("P", "creator:puml-to-simp")
    root = build_project(model, "09/28/2026 16:20:00", creator)
    destination.parent.mkdir(parents=True, exist_ok=True)
    write_simp(destination, root)
    if preview is not None:
        render_preview(model, root, preview)
    return model


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--preview", type=Path)
    args = parser.parse_args()
    model = convert(args.source, args.destination, args.preview)
    print(
        f"{args.destination}: {len(model.elements)} elements, "
        f"{len(model.relations)} relationships, {len(model.notes)} notes, "
        f"{len(diagram_plan(model))} diagrams"
    )


if __name__ == "__main__":
    main()
