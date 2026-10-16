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

# Neighbors that share a relationship sit on the same row or column so the
# connector can be a straight segment. The remaining links use one elbow.
ANCHORS = {
    "SkillType": (16, 214),
    "Scenario": (250, 180),
    "MindfulnessExercise": (530, 180),
    "Attempt": (810, 170),
    "TeamworkChallenge": (1090, 180),
    "AttemptStatus": (1106, 316),
    "ScenarioNode": (261, 390),
    "Choice": (256, 580),
    # Dropped below Attempt so "practiced by" can cross above these boxes
    # with room for its label, instead of riding their top borders.
    "DashboardReport": (821, 478),
    "TeacherDashboardUI": (560, 478),
    "StudentAppUI": (1100, 478),
    "EmotionCheckin": (812, 600),
    "Student": (1100, 590),
    "Emotion": (810, 800),
    "EmotionType": (821, 980),
    "Teacher": (1360, 590),
    "Role": (1620, 596),
    "RosterUI": (1109, 836),
    "Classroom": (1352, 820),
    "SupabaseDB": (1620, 760),
    "SupabaseAuth": (1880, 820),
}

NOTE_POS = {
    # Beside Attempt's lower left, under the Scenario association and clear of
    # TeacherDashboardUI. The association label sits further left.
    "Attempt": (548, 372),
    "Student": (1100, 740),
    "Classroom": (1352, 960),
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


def right(box, y: float) -> tuple[float, float]:
    return (box[0] + box[2], y)


def left(box, y: float) -> tuple[float, float]:
    return (box[0], y)


def top(box, x: float) -> tuple[float, float]:
    return (x, box[1])


def bottom(box, x: float) -> tuple[float, float]:
    return (x, box[1] + box[3])


def mid_x(box) -> float:
    return box[0] + box[2] / 2


def mid_y(box) -> float:
    return box[1] + box[3] / 2


def connector_points(left_name: str, right_name: str, label: str, positions, slot: int, slots: int, p2s):
    """Straight segments between neighbors, one elbow everywhere else."""
    if left_name not in ANCHORS or right_name not in ANCHORS:
        if right_name == "Attempt":
            note = positions[left_name]
            att = positions["Attempt"]
            # Meet both borders. The note hangs below Attempt, so the stub
            # uses the short overlap of their right and left edges.
            y = min(note[1] + 12, att[1] + att[3] - 4)
            return [(note[0] + note[2], y), (att[0], y)]
        return note_points(positions[left_name], positions[right_name])
    a = positions[left_name]
    b = positions[right_name]
    key = (left_name, label, right_name)
    routes = {
        # Facing edges only. The previous route ran from the far sides, so the
        # stroke traveled through both classes and the arrowhead landed on the
        # outside of Scenario.
        ("MindfulnessExercise", "plays", "Scenario"): [left(a, 226), right(b, 226)],
        ("TeamworkChallenge", "plays", "Scenario"): [
            top(a, mid_x(a)),
            (mid_x(a), 140),
            (mid_x(b), 140),
            top(b, mid_x(b)),
        ],
        ("Scenario", "contains", "ScenarioNode"): [bottom(a, 346), top(b, 346)],
        ("Scenario", "", "SkillType"): [left(a, 250), right(b, 250)],
        ("ScenarioNode", "offers", "Choice"): [bottom(a, 346), top(b, 346)],
        ("Scenario", "attempted by", "Attempt"): [bottom(a, 400), (400, 348), left(b, 348)],
        ("MindfulnessExercise", "attempted by", "Attempt"): [right(a, 240), left(b, 240)],
        ("TeamworkChallenge", "attempted by", "Attempt"): [left(a, 230), right(b, 230)],
        ("ScenarioNode", "practiced by", "Attempt"): [right(a, 448), (850, 448), bottom(b, 850)],
        ("Teacher", "", "Student"): [left(a, 650), right(b, 650)],
        ("Teacher", "", "Role"): [right(a, 650), left(b, 650)],
        # One rail in the gap between the student note and Teacher, into Classroom's
        # left side. Entering the top made the last segment ride the border.
        ("Student", "enrolls", "Classroom"): [right(a, 660), (1328, 660), (1328, 850), left(b, 850)],
        ("Teacher", "owns", "Classroom"): [bottom(a, mid_x(a)), top(b, mid_x(a))],
        ("RosterUI", "manages", "Classroom"): [right(a, 880), left(b, 880)],
        ("Teacher", "authenticated by", "SupabaseAuth"): [
            top(a, mid_x(a)),
            (mid_x(a), 560),
            (mid_x(b), 560),
            top(b, mid_x(b)),
        ],
        ("Classroom", "authenticated by", "SupabaseAuth"): [right(a, 900), left(b, 900)],
        ("Teacher", "", "SupabaseDB"): [right(a, 700), (1584, 700), (1584, 820), left(b, 820)],
        ("Student", "captures", "Attempt"): [right(a, 640), (1320, 640), (1320, 308), right(b, 308)],
        ("Student", "records", "EmotionCheckin"): [left(a, 660), right(b, 660)],
        ("Attempt", "makes", "DashboardReport"): [bottom(a, 880), top(b, 880)],
        ("DashboardReport", "aggregates", "Attempt"): [top(a, 940), bottom(b, 940)],
        ("DashboardReport", "aggregates", "EmotionCheckin"): [bottom(a, mid_x(a)), top(b, mid_x(a))],
        ("Attempt", "", "AttemptStatus"): [right(a, 360), left(b, 360)],
        ("EmotionCheckin", "refers to", "Emotion"): [bottom(a, mid_x(a)), top(b, mid_x(a))],
        ("Emotion", "", "EmotionType"): [bottom(a, mid_x(a)), top(b, mid_x(a))],
        ("TeacherDashboardUI", "views", "DashboardReport"): [right(a, 508), left(b, 508)],
        ("StudentAppUI", "views", "DashboardReport"): [left(a, 538), right(b, 538)],
        ("StudentAppUI", "manages", "Student"): [bottom(a, mid_x(a)), top(b, mid_x(b))],
    }
    if key not in routes:
        return p2s.route(a, b, slot, slots)
    return _dedupe(routes[key])


def note_points(note_box, class_box) -> list[tuple[float, float]]:
    """A short straight stub when the note sits under its class, otherwise one elbow."""
    nx, ny, nw, nh = note_box
    cx, cy, cw, ch = class_box
    ncx = nx + nw / 2
    if ny >= cy + ch - 4 and nx < cx + cw and nx + nw > cx:
        x = min(max(ncx, cx + 18), cx + cw - 18)
        return [(x, ny), (x, cy + ch)]
    if ny + nh <= cy + 4 and nx < cx + cw and nx + nw > cx:
        x = min(max(ncx, cx + 18), cx + cw - 18)
        return [(x, ny + nh), (x, cy)]
    ncy = ny + nh / 2
    if ncx <= cx:
        target_y = min(max(ncy, cy + 16), cy + ch - 16)
        return [(nx + nw, ncy), (cx, ncy), (cx, target_y)] if abs(ncy - target_y) > 4 else [(nx + nw, ncy), (cx, target_y)]
    if ncx >= cx + cw:
        target_y = min(max(ncy, cy + 16), cy + ch - 16)
        return [(nx, ncy), (cx + cw, target_y)]
    target_x = min(max(ncx, cx + 16), cx + cw - 16)
    if ny > cy:
        return [(ncx, ny), (target_x, cy + ch)]
    return [(ncx, ny + nh), (target_x, cy)]


def _dedupe(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    cleaned = [points[0]]
    for point in points[1:]:
        if abs(point[0] - cleaned[-1][0]) > 0.5 or abs(point[1] - cleaned[-1][1]) > 0.5:
            cleaned.append(point)
    return cleaned


def border_pos(box, point, toward) -> str:
    """Perimeter fraction SIM uses to lock a connector onto a rectangle side.

    Sides run clockwise from the top-left: top, right, bottom, left. The value is
    (side index + distance along that side) / 4. A constant 0.5 is the bottom-right
    corner, which pulls the stroke through the class.
    """
    x, y, w, h = box
    px, py = point
    tx, ty = toward
    candidates = (
        (0, abs(py - y), (px - x) / w if w else 0),
        (1, abs(px - (x + w)), (py - y) / h if h else 0),
        (2, abs(py - (y + h)), ((x + w) - px) / w if w else 0),
        (3, abs(px - x), ((y + h) - py) / h if h else 0),
    )
    nearest = min(distance for _side, distance, _t in candidates)
    tied = [item for item in candidates if abs(item[1] - nearest) <= 1.5]
    if len(tied) > 1:
        dx, dy = tx - px, ty - py
        prefer = 0 if abs(dy) >= abs(dx) and dy < 0 else 2 if abs(dy) >= abs(dx) else 1 if dx > 0 else 3
        chosen = next((item for item in tied if item[0] == prefer), tied[0])
    else:
        chosen = tied[0]
    side, _distance, along = chosen
    along = min(1.0, max(0.0, along))
    return f"{(side + along) / 4:.6f}"


def polyline_anchor(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Point halfway along the polyline, which is where the modeler anchors a name."""
    import math

    total = 0.0
    spans = []
    for start, end in zip(points, points[1:]):
        length = math.hypot(end[0] - start[0], end[1] - start[1])
        spans.append((start, end, length))
        total += length
    if total == 0:
        return points[0]
    walked = 0.0
    target = total / 2
    for start, end, length in spans:
        if walked + length >= target - 0.01:
            t = 0 if length == 0 else (target - walked) / length
            return (start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t)
        walked += length
    return points[-1]


def parse_offset(value: str) -> tuple[float, float]:
    x_text, y_text = value.split(",")
    return float(x_text), float(y_text)


def label_offset(source: str, target: str, label: str, slot: int) -> str:
    """Place the name just off the connector, on the open side of the line."""
    if label == "plays" and source == "TeamworkChallenge":
        return "0,-14"
    if label == "plays":
        return "0,-14"
    if label == "attempted by" and source == "Scenario":
        # Left of the Attempt note, in the open band under Scenario.
        return "-150,16"
    if label == "practiced by":
        # On the open side of the line, between the note and TeacherDashboardUI.
        return "0,4"
    if label == "views" and source == "StudentAppUI":
        return "0,14"
    if label == "views":
        return "0,-14"
    if label == "makes":
        return "-36,-4"
    if label == "aggregates" and target == "Attempt":
        return "28,-4"
    if label == "aggregates" and target == "EmotionCheckin":
        return "0,0"
    if label == "enrolls":
        # Up the rail, above the student note.
        return "0,-40"
    if label == "manages" and target == "Classroom":
        return "0,-14"
    if label == "manages":
        # Centered in the short gap under StudentAppUI.
        return "0,0"
    if label in {"contains", "offers", "owns"} and target in {"ScenarioNode", "Choice", "Classroom"}:
        return "16,-6"
    if label == "authenticated by" and source == "Teacher":
        return "14,-8"
    if label == "authenticated by" and source == "Classroom":
        # Under the line, clear of SupabaseDB.
        return "0,14"
    return "0,-16"


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
        layout.set("start-border-pos", border_pos(positions[source_key], points[0], points[1]))
        layout.set("end-border-pos", border_pos(positions[target_key], points[-1], points[-2]))
        layout.set("line-style", "oblique" if len(points) <= 2 else "perpendicular")
        layout.set("name-position", label_offset(source_key, target_key, label, slot))
        max_x = max(x + w for x, y, w, h in positions.values())
        max_y = max(y + h for x, y, w, h in positions.values())
        size = diagram.find("size")
        if size is not None:
            size.set("width", str(int(max_x + 80)))
            size.set("height", str(int(max_y + 80)))
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
            anchor = polyline_anchor(points)
            dx, dy = parse_offset(label_offset(relation.left, relation.right, relation.label, slot))
            label_w = text_width(regular, relation.label)
            draw.text(
                (anchor[0] + dx - label_w / 2, anchor[1] + dy - 7),
                relation.label,
                fill="#F2F2F2",
                font=regular,
            )
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


def _inside(box, x: float, y: float, pad: float = 1) -> bool:
    bx, by, bw, bh = box
    return bx + pad < x < bx + bw - pad and by + pad < y < by + bh - pad


def _orient(a, b, c) -> float:
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _crosses(a, b, c, d) -> bool:
    return _orient(a, b, c) * _orient(a, b, d) < 0 and _orient(c, d, a) * _orient(c, d, b) < 0


def validate_geometry(model, positions, regular, p2s) -> None:
    """Reject routes that cut through a shape, cross, or drop a label on a shape."""
    import math

    problems = []
    pair_counts: dict[tuple[str, str], int] = {}
    for relation in model.relations:
        pair_counts[(relation.left, relation.right)] = pair_counts.get((relation.left, relation.right), 0) + 1
    seen: dict[tuple[str, str], int] = {}
    routed = []
    for relation in model.relations:
        pair = (relation.left, relation.right)
        slot = seen.get(pair, 0)
        seen[pair] = slot + 1
        points = connector_points(relation.left, relation.right, relation.label, positions, slot, pair_counts[pair], p2s)
        routed.append((relation.left, relation.label, relation.right, points, slot))
    for note in model.notes:
        points = connector_points(note.element_id, note.target, "", positions, 0, 1, p2s)
        routed.append((note.element_id, "", note.target, points, 0))

    def owners_of(source, target):
        return {source, target}

    for source, label, target, points, _slot in routed:
        title = f"{source} -{label or 'note'}-> {target}"
        owners = owners_of(source, target)
        for start, end in zip(points, points[1:]):
            length = math.hypot(end[0] - start[0], end[1] - start[1]) or 1
            steps = max(8, int(length / 4))
            for step in range(1, steps):
                t = step / steps
                x = start[0] + (end[0] - start[0]) * t
                y = start[1] + (end[1] - start[1]) * t
                if math.hypot(x - start[0], y - start[1]) < 8 or math.hypot(x - end[0], y - end[1]) < 8:
                    continue
                for name, box in positions.items():
                    if _inside(box, x, y):
                        problems.append(f"{title} cuts through {name}")
                        break
        # Endpoints sit on the source and target borders.
        for point, name, which in ((points[0], source, "start"), (points[-1], target, "end")):
            box = positions[name]
            on_border = (
                abs(point[0] - box[0]) <= 2
                or abs(point[0] - (box[0] + box[2])) <= 2
                or abs(point[1] - box[1]) <= 2
                or abs(point[1] - (box[1] + box[3])) <= 2
            )
            within = box[0] - 2 <= point[0] <= box[0] + box[2] + 2 and box[1] - 2 <= point[1] <= box[1] + box[3] + 2
            if not (on_border and within):
                problems.append(f"{title} {which} {point} is off {name}")

    segments = []
    for source, label, target, points, _slot in routed:
        title = f"{source} -{label or 'note'}-> {target}"
        for index, (start, end) in enumerate(zip(points, points[1:])):
            segments.append((title, start, end))
    for index, (left_title, a, b) in enumerate(segments):
        for right_title, c, d in segments[index + 1 :]:
            if left_title == right_title:
                continue
            if _crosses(a, b, c, d):
                problems.append(f"cross {left_title} x {right_title}")

    for source, label, target, points, slot in routed:
        if not label:
            continue
        anchor = polyline_anchor(points)
        dx, dy = parse_offset(label_offset(source, target, label, slot))
        width = text_width(regular, label)
        height = 14
        rect = (anchor[0] + dx - width / 2, anchor[1] + dy - 2, width, height)
        title = f"{source} -{label}-> {target}"
        for name, box in positions.items():
            if rect[0] < box[0] + box[2] and rect[0] + rect[2] > box[0] and rect[1] < box[1] + box[3] and rect[1] + rect[3] > box[1]:
                problems.append(f"label {label!r} on {title} overlaps {name} at {tuple(round(v) for v in rect)}")

    if problems:
        # Duplicate hits from sampling collapse to one line each.
        unique = list(dict.fromkeys(problems))
        raise SystemExit("Diagram routes are not clean:\n  " + "\n  ".join(unique))


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
    validate_geometry(model, positions, regular, p2s)
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
