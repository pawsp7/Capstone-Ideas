#!/usr/bin/env python3
"""Build the Harmony Garden class diagram as a Software Ideas Modeler project.

The model comes from model/harmony_garden.puml. Boxes, shadows, and the dark
canvas follow the Software Ideas Modeler class diagrams used as the visual
reference: light gray compartments, gray borders, dashed dependencies, and
solid associations on a black diagram background.
"""

from __future__ import annotations

import importlib.util
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUML = ROOT / "model" / "harmony_garden.puml"
SIMP = ROOT / "model" / "HarmonyGarden.simp"
PREVIEW = ROOT / "model" / "HarmonyGarden-preview.png"

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

# Hand-placed origins. Neighbors follow the associations on the source diagram
# so most connectors stay short and run through the gaps.
ANCHORS = {
    "SkillType": (20, 260),
    "Scenario": (230, 64),
    "MindfulnessExercise": (470, 64),
    "TeamworkChallenge": (720, 64),
    "TeacherDashboardUI": (990, 28),
    "StudentAppUI": (1220, 28),
    "Teacher": (1460, 16),
    "SupabaseDB": (1860, 24),
    "ScenarioNode": (241, 250),
    "DashboardReport": (990, 150),
    "Student": (1220, 150),
    "RosterUI": (1460, 190),
    "Role": (1860, 180),
    "Choice": (236, 430),
    "Attempt": (725, 250),
    "EmotionCheckin": (990, 370),
    "Classroom": (1460, 320),
    "SupabaseAuth": (1860, 360),
    "AttemptStatus": (735, 530),
    "Emotion": (990, 580),
    "EmotionType": (990, 770),
}

NOTE_POS = {
    "Student": (1220, 300),
    "Attempt": (500, 470),
    "Classroom": (1460, 452),
}


def load_converter():
    import sys

    path = ROOT / "tools" / "puml_to_simp.py"
    spec = importlib.util.spec_from_file_location("puml_to_simp", path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["puml_to_simp"] = module
    spec.loader.exec_module(module)
    return module


def fonts():
    regular = ImageFont.truetype(FONT_PATH, 13)
    bold = ImageFont.truetype(BOLD_PATH, 14)
    small = ImageFont.truetype(FONT_PATH, 12)
    return regular, bold, small


def text_width(font: ImageFont.ImageFont, text: str) -> int:
    return int(font.getlength(text))


def element_lines(element, p2s) -> tuple[list[str], list[str], list[str]]:
    header = []
    if element.stereotype:
        header.append(f"«{element.stereotype}»")
    elif element.kind == "enum":
        header.append("«enumeration»")
    header.append(element.name)
    attrs = []
    ops = []
    if element.kind == "enum":
        attrs = list(element.literals)
    else:
        for member in element.members:
            line = member.name
            if member.kind == "operation":
                rendered = member.name + "()"
                if member.type_name:
                    rendered += " : " + member.type_name
                ops.append("+ " + rendered)
            else:
                rendered = member.name
                if member.type_name:
                    rendered += " : " + member.type_name
                if member.stereotype:
                    rendered += f" «{member.stereotype}»"
                attrs.append("+ " + rendered)
    return header, attrs, ops


def measure(element, note_text: str | None, regular, bold) -> tuple[int, int]:
    header, attrs, ops = element_lines(element, None)
    widths = [text_width(bold, header[-1]) + 28]
    for line in header[:-1]:
        widths.append(text_width(regular, line) + 20)
    for line in attrs + ops:
        widths.append(text_width(regular, line) + 22)
    if note_text:
        for line in note_text.splitlines():
            widths.append(text_width(regular, line) + 18)
    width = max(168, min(320, max(widths)))
    height = 16
    height += 18 * len(header)
    if element.kind == "enum":
        height += 8 + 16 * max(1, len(attrs))
    else:
        height += 8 + 16 * max(1, len(attrs))
        height += 8 + 16 * max(1, len(ops))
    return width, height


def note_box(text: str, regular) -> tuple[int, int]:
    lines = text.splitlines() or [""]
    width = max(180, min(280, max(text_width(regular, line) for line in lines) + 22))
    height = 14 + 16 * len(lines)
    return width, height


def layout(model, regular, bold):
    notes = {note.target: note for note in model.notes}
    positions = {}
    for name, element in model.elements.items():
        width, height = measure(element, None, regular, bold)
        x, y = ANCHORS[name]
        positions[name] = (x, y, width, height)
    for target, note in notes.items():
        note_w, note_h = note_box(note.text, regular)
        x, y = NOTE_POS[target]
        positions[note.element_id] = (x, y, note_w, note_h)
    overlaps = []
    keys = list(positions)
    for i, left in enumerate(keys):
        ax, ay, aw, ah = positions[left]
        for right in keys[i + 1 :]:
            bx, by, bw, bh = positions[right]
            if ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by:
                overlaps.append((left, right))
    if overlaps:
        raise SystemExit(f"Overlapping diagram shapes: {overlaps}")
    return positions


def style_element(
    fill: str,
    border: str,
    name_color: str,
    text_color: str,
    dash: str,
    name_align: str = "center",
    shadow: str = "true",
) -> ET.Element:
    style = ET.Element(
        "style",
        {
            "style-name": "Custom Style",
            "shadow-type": "flat",
            "shadow-offset": "5,5",
            "shadow-visible": shadow,
            "shadow-color": "#66000000",
            "wrap-name-text": "true",
            "wrap-other-text": "true",
            "padding": "2",
            "margin": "1",
        },
    )
    for type_name, font, color, align in (
        ("name", "Arial;10;B", name_color, name_align),
        ("part-header", "Arial;9;I", text_color, "center"),
        ("text", "Arial;9;", text_color, "left"),
        ("tagged-value", "Arial;9;I", text_color, "center"),
        ("stereotype", "Arial;9;I", text_color, "center"),
    ):
        ET.SubElement(
            style,
            "text-style",
            {
                "type": type_name,
                "use-defaults": "false",
                "color": color,
                "font": font,
                "horizontal-alignment": align,
                "vertical-alignment": "center",
                "shadow": "false",
            },
        )
    ET.SubElement(style, "background", {"type": "solid", "color": fill, "color2": fill})
    ET.SubElement(style, "border", {"color": border, "width": "1", "dash-style": dash})
    ET.SubElement(style, "label-connector", {"color": "#FFD0D0D0", "width": "1", "dash-style": "Dash"})
    return style


CLASS_STYLE = None
LINE_STYLE = None
NOTE_STYLE = None


def apply_styles(root: ET.Element) -> None:
    class_style = style_element("#FFF0F0F0", "#FF5C5C5C", "#FF000000", "#FF1A1A1A", "Solid")
    line_style = style_element("#00000000", "#FFF2F2F2", "#FFF2F2F2", "#FFF2F2F2", "Solid", shadow="false")
    dash_style = style_element("#00000000", "#FFF2F2F2", "#FFF2F2F2", "#FFF2F2F2", "Dash", shadow="false")
    note_style = style_element("#FFFFF4C4", "#FFB7A35A", "#FF000000", "#FF1A1A1A", "Solid", name_align="left")
    for item in root.find("items"):
        kind = item.get("type")
        old = item.find("style")
        if kind in {"class", "enumeration"}:
            replacement = class_style
        elif kind == "comment":
            replacement = note_style
        elif kind == "relationship":
            replacement = line_style
        elif kind in {"dependency", "comment-connector"}:
            replacement = dash_style
        else:
            continue
        clone = ET.fromstring(ET.tostring(replacement))
        if old is None:
            item.insert(0, clone)
        else:
            index = list(item).index(old)
            item.remove(old)
            item.insert(index, clone)

    diagram = root.find("models/model/diagram")
    diagram.set("name", "Harmony Garden")
    diagram.set("view-location", "0,0")
    diagram.set("zoom", "0.62")
    diagram_meta = diagram.find("meta/description")
    if diagram_meta is not None:
        diagram_meta.text = "Harmony Garden class diagram"
    style = diagram.find("style")
    for node in style.findall("background-color"):
        node.set("color", "#FF000000")
    size = ET.Element("size", {"width": "2200", "height": "1500", "unit": "px", "type": "ExpandableAllDirections"})
    diagram.insert(0, size)
    meta = root.find("meta")
    meta.find("name").text = "Harmony Garden"
    description = meta.find("description")
    description.text = (
        "Class diagram for The Harmony Garden. Domain classes, screens, "
        "and external services are arranged in the Software Ideas Modeler class-diagram style."
    )


def connector_points(left: str, right: str, label: str, positions, slot: int, slots: int, p2s):
    """Prefer the shared elbow router, with a few gutters for long spans."""
    sx, sy, sw, sh = positions[left]
    tx, ty, tw, th = positions[right]
    scx, scy = sx + sw / 2, sy + sh / 2
    tcx = tx + tw / 2
    if label == "contains" and right == "ScenarioNode":
        rail = sx + sw + 16
        return [(sx + sw, sy + sh - 24), (rail, sy + sh - 24), (rail, ty + 18), (tx + tw, ty + 18)]
    if label == "plays" and right == "Scenario":
        channel = 18 if left == "MindfulnessExercise" else 42
        return [(scx, sy), (scx, channel), (tcx, channel), (tcx, ty)]
    if label == "attempted by" and left == "Scenario":
        gutter = sx + sw + 42
        return [(sx + sw - 28, sy + sh), (sx + sw - 28, sy + sh + 24), (gutter, sy + sh + 24), (gutter, ty + 50), (tx, ty + 50)]
    if label == "attempted by" and left == "MindfulnessExercise":
        entry = ty + 72
        return [(scx, sy + sh), (scx, entry), (tx, entry)]
    if label == "captures":
        rail = sx - 32
        return [(sx, sy + 90), (rail, sy + 90), (rail, ty + 80), (tx + tw, ty + 80)]
    if label == "makes":
        rail = tx - 50
        return [(sx + sw, sy + 90), (rail, sy + 90), (rail, ty + 24), (tx, ty + 24)]
    if label == "aggregates" and right == "Attempt":
        rail = sx - 24
        return [(sx, sy + 56), (rail, sy + 56), (rail, ty + 130), (tx + tw, ty + 130)]
    if label == "enrolls":
        rail = sx + sw + 34
        return [(sx + sw, sy + 90), (rail, sy + 90), (rail, ty + 30), (tx, ty + 30)]
    if label == "owns":
        rail = tx - 16
        return [(sx, sy + 94), (rail, sy + 94), (rail, ty + 70), (tx, ty + 70)]
    if label == "" and left == "Teacher" and right == "Student":
        rail = sx - 60
        return [(sx, sy + 44), (rail, sy + 44), (rail, ty + 40), (tx + tw, ty + 40)]
    if label == "manages" and left == "RosterUI":
        rail = max(sx + sw, tx + tw) + 18
        return [(sx + sw, sy + sh / 2), (rail, sy + sh / 2), (rail, ty + 24), (tx + tw, ty + 24)]
    if label == "authenticated by" and left == "Teacher":
        rail = sx + sw + 90
        return [(sx + sw, scy), (rail, scy), (rail, ty - 16), (tx + tw / 2, ty - 16), (tx + tw / 2, ty)]
    if label == "authenticated by" and left == "Classroom":
        return [(sx + sw, sy + 48), (tx, sy + 48)]
    return p2s.route(positions[left], positions[right], slot, slots)


def label_offset(source: str, target: str, label: str, slot: int) -> str:
    """Keep relationship names in the gutter beside the connector."""
    if label == "plays" and source == "MindfulnessExercise":
        return "-8,-16"
    if label == "plays":
        return "8,14"
    if label == "contains":
        return "14,-8"
    if label == "makes":
        return "12,-14"
    if label == "aggregates" and target == "Attempt":
        return "-70,8"
    if label == "authenticated by" and source == "Teacher":
        return "8,-16"
    if label == "authenticated by":
        return "8,-14"
    return f"8,{-18 - slot * 14}"


def apply_layout(root: ET.Element, model, positions, p2s) -> None:
    id_to_name = {element.element_id: name for name, element in model.elements.items()}
    id_to_name.update({note.element_id: note.element_id for note in model.notes})
    diagram = root.find("models/model/diagram")
    layer = diagram.find("layer")
    for shape in layer:
        if shape.get("type") != "entity":
            continue
        key = id_to_name.get(shape.get("id"))
        if key not in positions:
            continue
        x, y, width, height = positions[key]
        layout = shape.find("layout")
        for attr, value in (
            ("ax", x),
            ("ay", y),
            ("awidth", width),
            ("aheight", height),
            ("x", x),
            ("y", y),
            ("width", width),
            ("height", height),
        ):
            layout.set(attr, str(value))

    pair_counts: dict[tuple[str, str], int] = {}
    connectors = []
    for shape in layer:
        if shape.get("type") not in {"relation", "comment-connector"}:
            continue
        relation = shape.find("relation")
        connectors.append((shape, relation.get("from"), relation.get("to")))
        pair_counts[(relation.get("from"), relation.get("to"))] = pair_counts.get((relation.get("from"), relation.get("to")), 0) + 1
    seen: dict[tuple[str, str], int] = {}
    for shape, source_id, target_id in connectors:
        pair = (source_id, target_id)
        slot = seen.get(pair, 0)
        seen[pair] = slot + 1
        source_key = id_to_name[source_id]
        target_key = id_to_name[target_id]
        label = ""
        if shape.get("type") == "relation":
            relation_shapes = [item for item in connectors if item[0].get("type") == "relation"]
            index = relation_shapes.index((shape, source_id, target_id))
            label = model.relations[index].label
        points = [
            (int(x), int(y))
            for x, y in connector_points(source_key, target_key, label, positions, slot, pair_counts[pair], p2s)
        ]
        layout = shape.find("layout")
        layout.set("x1", str(points[0][0]))
        layout.set("y1", str(points[0][1]))
        layout.set("x2", str(points[-1][0]))
        layout.set("y2", str(points[-1][1]))
        layout.set("line-style", "oblique" if len(points) <= 2 else "perpendicular")
        layout.set("name-position", label_offset(source_key, target_key, label, slot))
        point_parent = layout.find("points")
        for child in list(point_parent):
            point_parent.remove(child)
        for x, y in points:
            ET.SubElement(point_parent, "point", {"x": str(x), "y": str(y)})


def draw_dashed(draw: ImageDraw.ImageDraw, start, end, color: str) -> None:
    import math

    x1, y1 = start
    x2, y2 = end
    length = math.hypot(x2 - x1, y2 - y1) or 1
    step = 8
    pos = 0
    while pos < length:
        t0 = pos / length
        t1 = min(1, (pos + step) / length)
        draw.line(
            [(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0), (x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1)],
            fill=color,
            width=2,
        )
        pos += step * 2


def render_preview(model, positions, path: Path, regular, bold, p2s) -> None:
    max_x = max(x + w for x, y, w, h in positions.values()) + 80
    max_y = max(y + h for x, y, w, h in positions.values()) + 80
    image = Image.new("RGB", (max_x, max_y), "#000000")
    draw = ImageDraw.Draw(image)
    notes = {note.element_id: note for note in model.notes}
    id_to_pos = {}
    for name, element in model.elements.items():
        id_to_pos[element.element_id] = positions[name]
    for note in model.notes:
        id_to_pos[note.element_id] = positions[note.element_id]

    def center(box):
        x, y, w, h = box
        return x + w / 2, y + h / 2

    def border_point(box, toward):
        x, y, w, h = box
        cx, cy = center(box)
        tx, ty = toward
        dx, dy = tx - cx, ty - cy
        if dx == 0 and dy == 0:
            return cx, cy
        scales = []
        if dx != 0:
            scales.append((w / 2) / abs(dx))
        if dy != 0:
            scales.append((h / 2) / abs(dy))
        scale = min(scales)
        return cx + dx * scale, cy + dy * scale

    pair_counts: dict[tuple[str, str], int] = {}
    for relation in model.relations:
        pair_counts[(relation.left, relation.right)] = pair_counts.get((relation.left, relation.right), 0) + 1
    seen: dict[tuple[str, str], int] = {}
    for relation in model.relations:
        pair = (relation.left, relation.right)
        slot = seen.get(pair, 0)
        seen[pair] = slot + 1
        points = connector_points(
            relation.left, relation.right, relation.label, positions, slot, pair_counts[pair], p2s
        )
        color = "#E6E6E6"
        if relation.kind == "dependency":
            for (x1, y1), (x2, y2) in zip(points, points[1:]):
                draw_dashed(draw, (x1, y1), (x2, y2), color)
        else:
            draw.line(points, fill=color, width=2)
        end = points[-1]
        prev = points[-2]
        import math

        angle = math.atan2(end[1] - prev[1], end[0] - prev[0])
        length = 11
        left = (end[0] - length * math.cos(angle - 0.45), end[1] - length * math.sin(angle - 0.45))
        right = (end[0] - length * math.cos(angle + 0.45), end[1] - length * math.sin(angle + 0.45))
        draw.line([end, left], fill=color, width=2)
        draw.line([end, right], fill=color, width=2)
        if relation.label:
            mid = points[len(points) // 2]
            draw.text((mid[0] + 4, mid[1] - 16), relation.label, fill="#F2F2F2", font=regular)
        if relation.left_mult:
            draw.text((points[0][0] + 4, points[0][1] - 16), relation.left_mult, fill="#F2F2F2", font=regular)
        if relation.right_mult:
            draw.text((end[0] + 4, end[1] + 2), relation.right_mult, fill="#F2F2F2", font=regular)

    for name, element in model.elements.items():
        x, y, w, h = positions[name]
        draw.rectangle((x + 5, y + 5, x + w + 5, y + h + 5), fill="#141414")
        draw.rectangle((x, y, x + w, y + h), fill="#F0F0F0", outline="#5C5C5C", width=2)
        header, attrs, ops = element_lines(element, None)
        cursor = y + 6
        if len(header) > 1:
            draw.text((x + 8, cursor), header[0], fill="#333333", font=regular)
            cursor += 16
        name_w = text_width(bold, header[-1])
        draw.text((x + (w - name_w) / 2, cursor), header[-1], fill="#000000", font=bold)
        cursor += 20
        draw.line((x, cursor, x + w, cursor), fill="#8A8A8A", width=1)
        cursor += 4
        body = attrs if element.kind == "enum" else attrs
        if not body:
            cursor += 14
        for line in body:
            draw.text((x + 8, cursor), line, fill="#111111", font=regular)
            cursor += 16
        if element.kind != "enum":
            draw.line((x, cursor, x + w, cursor), fill="#8A8A8A", width=1)
            cursor += 4
            if not ops:
                cursor += 12
            for line in ops:
                draw.text((x + 8, cursor), line, fill="#111111", font=regular)
                cursor += 16

    for note in model.notes:
        x, y, w, h = positions[note.element_id]
        draw.rectangle((x + 4, y + 4, x + w + 4, y + h + 4), fill="#141414")
        draw.rectangle((x, y, x + w, y + h), fill="#FFF4C4", outline="#B7A35A", width=1)
        cursor = y + 6
        for line in note.text.splitlines():
            draw.text((x + 8, cursor), line, fill="#111111", font=regular)
            cursor += 16

    image.save(path)
    print(f"preview {path} {image.size}")


def main() -> None:
    p2s = load_converter()
    model = p2s.parse_puml(PUML.read_text(encoding="utf-8"))
    regular, bold, _small = fonts()
    # Element ids are assigned inside build_project. Layout needs them first.
    for name, element in model.elements.items():
        element.element_id = p2s.sid("di", f"element:{name}")
    for index, note in enumerate(model.notes):
        note.element_id = p2s.sid("di", f"note:{index}:{note.target}")
    positions = layout(model, regular, bold)
    creator = p2s.sid("P", "creator:harmony-garden")
    root = p2s.build_project(model, "10/16/2026 18:50:00", creator)
    apply_styles(root)
    apply_layout(root, model, positions, p2s)
    p2s.write_simp(SIMP, root)
    render_preview(model, positions, PREVIEW, regular, bold, p2s)
    print(
        f"{SIMP}: {len(model.elements)} elements, "
        f"{len(model.relations)} relationships, {len(model.notes)} notes"
    )


if __name__ == "__main__":
    main()
