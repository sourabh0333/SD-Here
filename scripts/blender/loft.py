"""
Night Studio Loft — procedural Blender scene for the portfolio.

Builds the whole loft in code, then either:
  preview  → renders Cycles stills from every camera station (look-dev)
  bake     → bakes lighting into texture atlases and exports glTF for the web

Run with the `bpy` module (pip install bpy):
  python scripts/blender/loft.py preview <out_dir> [samples]
  python scripts/blender/loft.py bake    <out_dir> [samples] [atlas_size]

Coordinates are Blender's (Z up, metres). glTF export converts to Y up.
"""

import json
import math
import os
import random
import sys

import bpy  # noqa: I001  (bpy must be imported before its helper modules)
import addon_utils
from mathutils import Vector

MODE = sys.argv[1] if len(sys.argv) > 1 else "preview"
OUT = sys.argv[2] if len(sys.argv) > 2 else "out"
SAMPLES = int(sys.argv[3]) if len(sys.argv) > 3 else 48
ATLAS = int(sys.argv[4]) if len(sys.argv) > 4 else 2048
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable("cycles", default_set=True)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast" if MODE == "preview" else "None"
scene.view_settings.exposure = 0.0

# ── collections: what gets baked vs. what stays real-time on the web ─────────
GROUPS = ["shell", "furniture", "props"]
COLS = {}
for name in GROUPS + ["rt", "helpers"]:
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    COLS[name] = c


def put(obj, group):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    COLS[group].objects.link(obj)
    return obj


# ── materials ─────────────────────────────────────────────────────────────────
MATS = {}


def principled(name, color, rough=0.7, metal=0.0, emit=None, strength=0.0, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
    MATS[name] = m
    return m


def srgb(h):
    """Hex → linear RGB tuple."""
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


def node_mat(name, build):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    build(nt, bsdf)
    MATS[name] = m
    return m


def _coord(nt, scale=(1, 1, 1)):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = scale
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    return mp.outputs["Vector"]


def brick_mat():
    def b(nt, bsdf):
        v = _coord(nt)
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.inputs["Color1"].default_value = (*srgb("#8a4a3a"), 1)
        br.inputs["Color2"].default_value = (*srgb("#6b3529"), 1)
        br.inputs["Mortar"].default_value = (*srgb("#b9aea2"), 1)
        br.inputs["Scale"].default_value = 4.2
        br.inputs["Mortar Size"].default_value = 0.012
        br.inputs["Brick Width"].default_value = 0.5
        br.inputs["Row Height"].default_value = 0.22
        nt.links.new(v, br.inputs["Vector"])
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 14
        nt.links.new(v, noise.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 0.35
        nt.links.new(br.outputs["Color"], mix.inputs[6])
        nt.links.new(noise.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.35
        nt.links.new(br.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.92

    return node_mat("brick", b)


def wood_floor_mat():
    def b(nt, bsdf):
        v = _coord(nt)
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.inputs["Color1"].default_value = (*srgb("#7a5233"), 1)
        br.inputs["Color2"].default_value = (*srgb("#5e3c24"), 1)
        br.inputs["Mortar"].default_value = (*srgb("#2e1d12"), 1)
        br.inputs["Scale"].default_value = 1.0
        br.inputs["Mortar Size"].default_value = 0.004
        br.inputs["Brick Width"].default_value = 1.6
        br.inputs["Row Height"].default_value = 0.16
        br.offset = 0.37
        nt.links.new(v, br.inputs["Vector"])
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.inputs["Scale"].default_value = 3.0
        wave.inputs["Distortion"].default_value = 6.0
        wave.inputs["Detail"].default_value = 3.0
        sep = nt.nodes.new("ShaderNodeMapping")
        sep.inputs["Scale"].default_value = (0.15, 2.4, 1)
        nt.links.new(v, sep.inputs["Vector"])
        nt.links.new(sep.outputs["Vector"], wave.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 0.45
        nt.links.new(br.outputs["Color"], mix.inputs[6])
        nt.links.new(wave.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.15
        nt.links.new(br.outputs["Fac"], bump.inputs["Height"])
        nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = 0.42

    return node_mat("wood_floor", b)


def noisy_mat(name, hex_a, hex_b, scale=6.0, rough=0.85, detail=6.0, bump=0.08):
    def b(nt, bsdf):
        v = _coord(nt)
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = scale
        noise.inputs["Detail"].default_value = detail
        nt.links.new(v, noise.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*srgb(hex_a), 1)
        ramp.color_ramp.elements[1].color = (*srgb(hex_b), 1)
        nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        if bump:
            bp = nt.nodes.new("ShaderNodeBump")
            bp.inputs["Strength"].default_value = bump
            nt.links.new(noise.outputs["Fac"], bp.inputs["Height"])
            nt.links.new(bp.outputs["Normal"], bsdf.inputs["Normal"])
        bsdf.inputs["Roughness"].default_value = rough

    return node_mat(name, b)


def wood_mat(name="wood", hex_a="#8a5a36", hex_b="#5a3720"):
    def b(nt, bsdf):
        v = _coord(nt, (1, 1, 1))
        wave = nt.nodes.new("ShaderNodeTexWave")
        wave.inputs["Scale"].default_value = 2.5
        wave.inputs["Distortion"].default_value = 8
        wave.inputs["Detail"].default_value = 4
        mp = nt.nodes.new("ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (0.3, 4, 1)
        nt.links.new(v, mp.inputs["Vector"])
        nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].color = (*srgb(hex_b), 1)
        ramp.color_ramp.elements[1].color = (*srgb(hex_a), 1)
        nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
        nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.5

    return node_mat(name, b)


# Common flat materials
def M(name, hexc, rough=0.7, metal=0.0):
    return principled(name, srgb(hexc), rough, metal)


def EM(name, hexc, strength):
    return principled(name, srgb(hexc), 0.5, 0, srgb(hexc), strength)


# ── geometry helpers ──────────────────────────────────────────────────────────
def _finish(obj, mat, group, bevel):
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
    put(obj, group)
    return obj


def box(name, size, loc, mat=None, group="props", rot=(0, 0, 0), bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, mat, group, bevel)


def span(name, x0, x1, y0, y1, z0, z1, mat=None, group="shell", bevel=0.0):
    return box(name, (x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), mat, group, bevel=bevel)


def cyl(name, r, depth, loc, mat=None, group="props", rot=(0, 0, 0), verts=24, r2=None, bevel=0.0):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth, location=loc, rotation=rot, vertices=verts)
    else:
        bpy.ops.mesh.primitive_cone_add(radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot, vertices=verts)
    o = bpy.context.active_object
    o.name = name
    return _finish(o, mat, group, bevel)


def sphere(name, r, loc, mat=None, group="props", seg=24, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    return _finish(o, mat, group, 0)


def soft_box(name, size, loc, mat, group="furniture", rot=(0, 0, 0), bevel=0.06, segs=4):
    """Upholstery: rounded box."""
    o = box(name, size, loc, mat, group, rot)
    mod = o.modifiers.new("round", "BEVEL")
    mod.width = bevel
    mod.segments = segs
    bpy.ops.object.shade_smooth()
    return o


def text(name, body, loc, size, mat, group="props", rot=(math.pi / 2, 0, 0), extrude=0.004, align="CENTER"):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.data.body = body
    o.data.size = size
    o.data.extrude = extrude
    o.data.align_x = align
    o.data.align_y = "CENTER"
    o.data.materials.append(mat)
    bpy.ops.object.convert(target="MESH")
    return put(o, group)


def plane(name, w, h, loc, rot, mat=None, group="rt"):
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        o.data.materials.append(mat)
    return put(o, group)


# ═════════════════════════════════════════════════════════════════════════════
# THE ROOM
# Interior: x ∈ [-8, 8], y ∈ [-5, 5], z ∈ [0, 4.6]
# Window wall at y = +5 (city view), balcony door on the right wall (x = +8)
# ═════════════════════════════════════════════════════════════════════════════
X0, X1, Y0, Y1, H = -8.0, 8.0, -5.0, 5.0, 4.6
T = 0.3  # wall thickness

brick = brick_mat()
plaster = noisy_mat("plaster", "#a89a88", "#b3a693", scale=3, rough=0.9, bump=0.03)
concrete = noisy_mat("concrete", "#7d7b78", "#9a9894", scale=4, rough=0.9, detail=8, bump=0.06)
ceiling_c = noisy_mat("ceiling", "#5b5a58", "#6d6c69", scale=3, rough=0.95, bump=0.02)
steel = M("steel_black", "#1c1c1f", 0.45, 0.0)
floor = wood_floor_mat()

# floor & ceiling
span("floor", X0 - T, X1 + T, Y0 - T, Y1 + T, -0.3, 0, floor)
span("ceiling", X0 - T, X1 + T, Y0 - T, Y1 + T, H, H + 0.3, ceiling_c)
# exposed concrete beams + duct
for x in (-5.5, -1.5, 2.5, 6.5):
    span(f"beam{x}", x - 0.18, x + 0.18, Y0, Y1, H - 0.45, H, concrete)
duct = cyl("duct", 0.22, X1 - X0, (0, Y0 + 0.75, H - 0.6), M("duct", "#9ea3a8", 0.35, 0.0), "shell", rot=(0, math.pi / 2, 0), verts=32)
for x in range(-7, 8, 2):
    cyl(f"ductring{x}", 0.235, 0.05, (x, Y0 + 0.75, H - 0.6), M("duct", "#9ea3a8"), "shell", rot=(0, math.pi / 2, 0), verts=32)

# left wall (brick)
span("wall_left", X0 - T, X0, Y0 - T, Y1 + T, 0, H, brick)
# front wall (painted)
span("wall_front", X0, X1, Y0 - T, Y0, 0, H, plaster)
# right wall with balcony door opening (y 1.2..3.6, z 0..2.7)
DOOR = (1.2, 3.6, 2.7)
span("wall_right_a", X1, X1 + T, Y0 - T, DOOR[0], 0, H, plaster)
span("wall_right_b", X1, X1 + T, DOOR[1], Y1 + T, 0, H, plaster)
span("wall_right_c", X1, X1 + T, DOOR[0], DOOR[1], DOOR[2], H, plaster)
# skirting
span("skirt_front", X0, X1, Y0, Y0 + 0.02, 0, 0.12, M("skirt", "#2a302d", 0.6), "shell")

# window wall (y = +5) with an industrial steel grid
WX0, WX1, WZ0, WZ1 = -7.4, 7.4, 0.55, 4.25
span("win_sill_wall", X0 - T, X1 + T, Y1, Y1 + T, 0, WZ0, brick)
span("win_header", X0 - T, X1 + T, Y1, Y1 + T, WZ1, H, brick)
span("win_jamb_l", X0 - T, WX0, Y1, Y1 + T, WZ0, WZ1, brick)
span("win_jamb_r", WX1, X1 + T, Y1, Y1 + T, WZ0, WZ1, brick)
span("win_ledge_in", WX0, WX1, Y1 - 0.22, Y1 + 0.05, WZ0 - 0.06, WZ0, concrete)
cols = 10
for i in range(cols + 1):
    x = WX0 + (WX1 - WX0) * i / cols
    span(f"mullion{i}", x - 0.035, x + 0.035, Y1 + 0.08, Y1 + 0.2, WZ0, WZ1, steel)
for z in (WZ0, 1.45, 2.35, 3.25, WZ1):
    span(f"transom{z}", WX0, WX1, Y1 + 0.08, Y1 + 0.2, z - 0.03, z + 0.03, steel)

# building facade outside (seen in the hero shot)
facade = brick
span("facade_below", -16, X1 + T, Y1, Y1 + T, -9, 0, facade)
span("facade_above", -16, X1 + T, Y1, Y1 + T, H, 9, facade)
span("facade_left", -16, X0 - T, Y1, Y1 + T, 0, H, facade)
span("facade_ledge", WX0 - 0.3, WX1 + 0.3, Y1 + T, Y1 + 0.55, WZ0 - 0.12, WZ0 - 0.02, concrete)
span("facade_cornice", -16, X1 + T, Y1 + T, Y1 + 0.5, H + 0.15, H + 0.4, concrete)
span("facade_side", X1, X1 + T, -6, Y1 + T, -9, 0, facade)
span("facade_side_up", X1, X1 + T, -6, Y1 + T, H, 9, facade)

# ── balcony (outside the right wall) ─────────────────────────────────────────
BX1 = 11.8
span("balcony_slab", X1 + T, BX1, -0.8, Y1 + T, -0.25, 0, concrete)
deck = wood_mat("deck", "#8a6a4a", "#5c4430")
for i, x in enumerate([X1 + T + 0.15 + k * 0.24 for k in range(14)]):
    span(f"deck{i}", x - 0.11, x + 0.11, -0.7, Y1 + 0.2, 0, 0.03, deck, "shell")
rail = M("rail", "#222226", 0.35)
for y in (-0.75, Y1 + 0.25):
    pass
span("rail_top_x", X1 + T, BX1, -0.8, -0.74, 1.05, 1.1, rail)
span("rail_top_y", BX1 - 0.06, BX1, -0.8, Y1 + T, 1.05, 1.1, rail)
for k in range(7):
    y = -0.77 + k * (Y1 + T + 0.77) / 6
    span(f"rail_post{k}", BX1 - 0.05, BX1, y - 0.025, y + 0.025, 0, 1.05, rail)
for k in range(4):
    x = X1 + T + k * (BX1 - X1 - T) / 3
    span(f"rail_postx{k}", x - 0.025, x + 0.025, -0.8, -0.75, 0, 1.05, rail)
# door frame
span("door_frame_t", X1 - 0.02, X1 + T + 0.02, DOOR[0], DOOR[1], DOOR[2] - 0.08, DOOR[2], steel)
span("door_frame_l", X1 - 0.02, X1 + T + 0.02, DOOR[0], DOOR[0] + 0.08, 0, DOOR[2], steel)
span("door_frame_r", X1 - 0.02, X1 + T + 0.02, DOOR[1] - 0.08, DOOR[1], 0, DOOR[2], steel)
span("door_frame_m", X1 + 0.1, X1 + 0.18, (DOOR[0] + DOOR[1]) / 2 - 0.04, (DOOR[0] + DOOR[1]) / 2 + 0.04, 0, DOOR[2], steel)

# ═════════════════════════════════════════════════════════════════════════════
# FURNITURE & PROPS
# ═════════════════════════════════════════════════════════════════════════════
oak = wood_mat("oak", "#a87a4f", "#7a5234")
walnut = wood_mat("walnut", "#6b4429", "#3f2616")
black = M("black_matte", "#1a1a1c", 0.6)
white = M("white", "#e8e4dc", 0.6)
fabric_sofa = noisy_mat("fabric_sofa", "#53606b", "#5e6b76", scale=40, rough=1.0, detail=4, bump=0.04)
fabric_chair = noisy_mat("fabric_chair", "#a0523a", "#b4613f", scale=40, rough=1.0, detail=4, bump=0.04)
leather = noisy_mat("leather", "#6e3b22", "#82492b", scale=12, rough=0.55, detail=3, bump=0.03)
rug_mat = noisy_mat("rug", "#b7a48f", "#a8927d", scale=60, rough=1.0, detail=2, bump=0.05)
rug2 = noisy_mat("rug2", "#2f3e4d", "#3b4c5d", scale=60, rough=1.0, detail=2, bump=0.05)
ceramic = M("ceramic", "#e9e2d6", 0.35)
terracotta = M("terracotta", "#b5653f", 0.85)
leaf = noisy_mat("leaf", "#2f5b2b", "#4b7a35", scale=8, rough=0.6, detail=3, bump=0.0)
cork = noisy_mat("cork", "#b08a5a", "#c39a68", scale=90, rough=1.0, detail=3, bump=0.06)
paper = M("paper", "#efe9df", 0.9)
brass = M("brass", "#b08d57", 0.35, 0.0)

warm = srgb("#ffb46b")
bulb_mat = principled("bulb", warm, 0.3, 0, warm, 16.0)
led_mat = principled("led", srgb("#ffc98a"), 0.3, 0, srgb("#ffc98a"), 12.0)
screen_mat = principled("screen", srgb("#2a4870"), 0.2, 0, srgb("#5e8fd6"), 1.4)

# ── living area: rug, sofa, coffee table ─────────────────────────────────────
span("rug_living", -2.0, 2.0, -2.6, 0.6, 0, 0.015, rug_mat, "furniture")
sofa_y = -2.2
soft_box("sofa_base", (2.8, 0.95, 0.42), (0, sofa_y, 0.21 + 0.06), fabric_sofa)
soft_box("sofa_back", (2.8, 0.22, 0.55), (0, sofa_y - 0.42, 0.72), fabric_sofa)
for sx in (-1.0, 1.0):
    soft_box(f"sofa_arm{sx}", (0.22, 0.95, 0.62), (sx * 1.5, sofa_y, 0.37), fabric_sofa)
for k, x in enumerate((-0.68, 0.68)):
    soft_box(f"sofa_cushion{k}", (1.3, 0.8, 0.16), (x, sofa_y + 0.05, 0.57), fabric_sofa, bevel=0.07)
    soft_box(f"sofa_pillow{k}", (0.45, 0.16, 0.42), (x * 1.6, sofa_y - 0.22, 0.85), fabric_chair if k else rug2, rot=(0.15, 0, 0.2 * (1 - 2 * k)), bevel=0.08)
for sx in (-1.3, 1.3):
    for sy in (sofa_y - 0.35, sofa_y + 0.35):
        cyl(f"sofa_leg{sx}{sy}", 0.025, 0.08, (sx, sy, 0.04), walnut, "furniture")
# coffee table
cyl("coffee_top", 0.55, 0.05, (0, -0.6, 0.42), walnut, "furniture", verts=48, bevel=0.01)
cyl("coffee_base", 0.18, 0.4, (0, -0.6, 0.2), black, "furniture", verts=32)
for k in range(3):
    box(f"coffee_book{k}", (0.3, 0.22, 0.03), (0.15, -0.55, 0.46 + k * 0.03), M(f"book_c{k}", ["#c8553d", "#2d6a8f", "#e8c547"][k], 0.8), rot=(0, 0, 0.3 * k))
cyl("coffee_cup", 0.045, 0.09, (-0.2, -0.75, 0.49), ceramic, verts=20)

# ── desk station (against the window, left) ──────────────────────────────────
DX, DY = -4.6, 4.15
box("desk_top", (2.4, 0.8, 0.05), (DX, DY, 0.75), oak, "furniture", bevel=0.008)
for sx in (-1.12, 1.12):
    box(f"desk_leg{sx}", (0.05, 0.7, 0.05), (DX + sx, DY, 0.4), steel, "furniture")
    box(f"desk_legv{sx}a", (0.05, 0.05, 0.72), (DX + sx, DY - 0.3, 0.37), steel, "furniture")
    box(f"desk_legv{sx}b", (0.05, 0.05, 0.72), (DX + sx, DY + 0.3, 0.37), steel, "furniture")
# monitors: frames baked, screen faces real-time
for k, (ox, rz) in enumerate(((-0.72, 0.32), (0.0, 0.0), (0.72, -0.32))):
    mx = DX + ox
    my = DY + 0.18 - abs(ox) * 0.12
    box(f"monitor{k}", (0.66, 0.035, 0.4), (mx, my, 1.17), black, "props", rot=(0, 0, rz), bevel=0.006)
    box(f"monitor_neck{k}", (0.05, 0.05, 0.3), (mx + math.sin(rz) * 0.08, my + 0.08, 0.92), black, "props", rot=(0, 0, rz))
    box(f"monitor_foot{k}", (0.24, 0.18, 0.015), (mx + math.sin(rz) * 0.08, my + 0.08, 0.785), black, "props", rot=(0, 0, rz))
    scr = plane(f"screen_{k}", 0.62, 0.36, (mx - math.sin(rz) * 0.019, my - math.cos(rz) * 0.019, 1.17), (math.pi / 2, 0, rz), screen_mat, "rt")
    # emissive stand-in for the bake so the desk picks up screen light
    sc = plane(f"screenbake_{k}", 0.62, 0.36, (mx - math.sin(rz) * 0.0185, my - math.cos(rz) * 0.0185, 1.17), (math.pi / 2, 0, rz), screen_mat, "helpers")
box("keyboard", (0.44, 0.14, 0.02), (DX, DY - 0.18, 0.785), M("kb", "#d9d6cf", 0.5), bevel=0.004)
for r in range(4):
    for c in range(14):
        box(f"key{r}_{c}", (0.022, 0.022, 0.008), (DX - 0.195 + c * 0.03, DY - 0.225 + r * 0.03, 0.797), M("key", "#f2efe8", 0.5))
box("mousepad", (0.32, 0.26, 0.004), (DX + 0.42, DY - 0.15, 0.776), rug2)
sphere("mouse", 0.035, (DX + 0.42, DY - 0.15, 0.785), M("kb", "#d9d6cf"), scale=(0.9, 1.4, 0.5))
cyl("mug", 0.045, 0.1, (DX - 0.9, DY - 0.2, 0.825), terracotta, verts=24)
# desk lamp
cyl("lamp_base", 0.09, 0.025, (DX - 1.0, DY + 0.15, 0.79), black, verts=24)
box("lamp_arm1", (0.02, 0.02, 0.45), (DX - 1.0, DY + 0.15, 1.0), black, rot=(0.35, 0, 0))
box("lamp_arm2", (0.02, 0.02, 0.38), (DX - 1.0, DY + 0.0, 1.32), black, rot=(-0.9, 0, 0))
cyl("lamp_head", 0.08, 0.14, (DX - 1.0, DY - 0.16, 1.38), black, rot=(-2.3, 0, 0), r2=0.035, verts=24)
sphere("lamp_bulb", 0.03, (DX - 1.0, DY - 0.2, 1.33), bulb_mat)
# plant on desk
cyl("desk_pot", 0.08, 0.14, (DX + 1.0, DY + 0.2, 0.845), ceramic, verts=24)
for k in range(9):
    a = k / 9 * math.tau
    box(f"desk_leaf{k}", (0.025, 0.012, 0.22), (DX + 1.0 + math.cos(a) * 0.05, DY + 0.2 + math.sin(a) * 0.05, 1.0), leaf, rot=(math.cos(a) * 0.4, math.sin(a) * 0.4, a))
# speakers
for sx in (-1.0, 1.0):
    box(f"speaker{sx}", (0.13, 0.15, 0.22), (DX + sx * 0.6, DY + 0.33, 0.885), walnut, bevel=0.005)
    cyl(f"speaker_cone{sx}", 0.04, 0.005, (DX + sx * 0.6, DY + 0.255, 0.86), black, rot=(math.pi / 2, 0, 0))
# office chair
CH = (DX, DY - 0.85)
soft_box("chair_seat", (0.52, 0.5, 0.08), (CH[0], CH[1], 0.5), leather, bevel=0.03)
soft_box("chair_back", (0.5, 0.08, 0.6), (CH[0], CH[1] - 0.26, 0.92), leather, rot=(-0.12, 0, 0), bevel=0.035)
cyl("chair_stem", 0.03, 0.36, (CH[0], CH[1], 0.28), black, "furniture")
for k in range(5):
    a = k / 5 * math.tau
    box(f"chair_star{k}", (0.32, 0.04, 0.03), (CH[0] + math.cos(a) * 0.16, CH[1] + math.sin(a) * 0.16, 0.08), black, "furniture", rot=(0, 0, a))
    sphere(f"chair_wheel{k}", 0.025, (CH[0] + math.cos(a) * 0.31, CH[1] + math.sin(a) * 0.31, 0.03), black)
span("rug_desk", DX - 1.4, DX + 1.4, DY - 1.9, DY + 0.4, 0, 0.012, rug2, "furniture")

# ── poster wall (left wall, case studies) ─────────────────────────────────────
span("corkboard", X0, X0 + 0.04, 0.4, 4.4, 1.0, 3.3, cork, "furniture")
POSTERS = []
for r, z in enumerate((2.75, 1.6)):
    for c in range(3):
        y = 1.05 + c * 1.35
        box(f"poster_frame{r}{c}", (0.03, 0.82, 1.0), (X0 + 0.06, y, z), black, "furniture", bevel=0.004)
        p = plane(f"poster_{r * 3 + c}", 0.74, 0.92, (X0 + 0.078, y, z), (math.pi / 2, 0, -math.pi / 2), paper, "rt")
        POSTERS.append(p.name)
        plane(f"posterbake_{r}{c}", 0.74, 0.92, (X0 + 0.077, y, z), (math.pi / 2, 0, -math.pi / 2), paper, "props")
# gallery light bar
box("gallery_bar", (0.1, 4.0, 0.06), (X0 + 0.35, 2.4, 3.6), black, "furniture")
box("gallery_led", (0.04, 3.9, 0.012), (X0 + 0.35, 2.4, 3.565), led_mat, "props")

# ── reading nook (About) ──────────────────────────────────────────────────────
# bookshelf on the left wall
BS = dict(x0=X0, x1=X0 + 0.38, y0=-4.85, y1=-1.4)
for k, z in enumerate((0.0, 0.55, 1.1, 1.65, 2.2, 2.75, 3.3)):
    span(f"shelf_board{k}", BS["x0"], BS["x1"], BS["y0"], BS["y1"], z, z + 0.03, walnut, "furniture")
for y in (BS["y0"], (BS["y0"] + BS["y1"]) / 2, BS["y1"]):
    span(f"shelf_side{y}", BS["x0"], BS["x1"], y - 0.015, y + 0.015, 0, 3.33, walnut, "furniture")
BOOK_COLORS = ["#c8553d", "#2d6a8f", "#e8c547", "#3c5a40", "#d9cbb3", "#5c3d5e", "#1f2a36", "#b86b4b", "#8aa1a8", "#f2e6d0"]
for k, z in enumerate((0.03, 0.58, 1.13, 1.68, 2.23, 2.78)):
    y = BS["y0"] + 0.04
    while y < BS["y1"] - 0.08:
        if abs(y - (BS["y0"] + BS["y1"]) / 2) < 0.04:
            y += 0.05
            continue
        if random.random() < 0.12:
            y += 0.18  # gap / decor
            continue
        w = random.uniform(0.025, 0.055)
        h = random.uniform(0.32, 0.48) if k else random.uniform(0.25, 0.3)
        d = random.uniform(0.2, 0.28)
        lean = random.uniform(-0.12, 0.0) if random.random() < 0.1 else 0
        box(f"book{k}_{y:.2f}", (d, w, h), (BS["x0"] + 0.04 + d / 2, y + w / 2, z + h / 2), M(f"book{random.randint(0, 9)}", random.choice(BOOK_COLORS), 0.8), rot=(lean, 0, 0))
        y += w + 0.004
# armchair
AC = (-6.15, -3.5)
rz = math.radians(-35)
def rot2(dx, dy):
    return (AC[0] + dx * math.cos(rz) - dy * math.sin(rz), AC[1] + dx * math.sin(rz) + dy * math.cos(rz))
soft_box("arm_seat", (0.85, 0.8, 0.22), (*rot2(0, 0.05), 0.36), fabric_chair, rot=(0, 0, rz))
soft_box("arm_back", (0.9, 0.2, 0.65), (*rot2(0, -0.38), 0.75), fabric_chair, rot=(-0.1, 0, rz))
for s in (-1, 1):
    soft_box(f"arm_side{s}", (0.16, 0.85, 0.5), (*rot2(s * 0.48, 0), 0.45), fabric_chair, rot=(0, 0, rz))
for s in (-1, 1):
    for t in (-1, 1):
        cyl(f"arm_leg{s}{t}", 0.022, 0.2, (*rot2(s * 0.38, t * 0.33), 0.1), walnut, "furniture")
soft_box("arm_throw", (0.5, 0.06, 0.55), (*rot2(0.2, -0.3), 0.75), rug2, rot=(-0.1, 0.2, rz), bevel=0.03)
# floor lamp (arc)
FL = (-7.3, -2.3)
cyl("floorlamp_base", 0.17, 0.04, (FL[0], FL[1], 0.02), brass, "furniture", verts=32)
cyl("floorlamp_pole", 0.015, 1.7, (FL[0], FL[1], 0.87), brass, "furniture")
cyl("floorlamp_shade", 0.22, 0.28, (FL[0], FL[1], 1.82), M("shade", "#f1e3c8", 0.9), "furniture", r2=0.15, verts=32)
sphere("floorlamp_bulb", 0.05, (FL[0], FL[1], 1.76), bulb_mat)
# side table + candle + stack
cyl("side_table", 0.25, 0.04, (-5.2, -4.4, 0.55), oak, "furniture", verts=32)
cyl("side_table_leg", 0.03, 0.53, (-5.2, -4.4, 0.27), black, "furniture")
cyl("candle", 0.04, 0.1, (-5.15, -4.35, 0.62), M("wax", "#f3ead8", 0.6), verts=16)
sphere("candle_flame", 0.012, (-5.15, -4.35, 0.685), bulb_mat, scale=(1, 1, 2))
# round rug
cyl("rug_nook", 1.4, 0.012, (-6.0, -3.3, 0.006), rug_mat, "furniture", verts=64)
# record player on a low cabinet near the nook (front wall)
span("cabinet", -4.6, -2.6, Y0, Y0 + 0.45, 0, 0.6, walnut, "furniture", bevel=0.01)
box("turntable", (0.42, 0.34, 0.08), (-3.9, Y0 + 0.25, 0.64), walnut, bevel=0.01)
cyl("platter", 0.15, 0.01, (-3.95, Y0 + 0.25, 0.685), black, verts=48)
cyl("vinyl_label", 0.04, 0.012, (-3.95, Y0 + 0.25, 0.687), M("label", "#c8553d"), verts=24)
for k in range(5):
    box(f"vinyl{k}", (0.012, 0.31, 0.31), (-3.2 + k * 0.03, Y0 + 0.24, 0.76), M(f"vin{k}", ["#c8553d", "#e8c547", "#2d6a8f", "#1a1a1c", "#d9cbb3"][k], 0.6), rot=(0, 0.06 * k, 0))

# ── skills pegboard (front wall) ─────────────────────────────────────────────
PB = dict(x0=-0.2, x1=3.0, z0=1.0, z1=2.6)
pegboard = noisy_mat("pegboard", "#c9a77c", "#d4b48a", scale=50, rough=0.9, bump=0.02)
span("pegboard", PB["x0"], PB["x1"], Y0, Y0 + 0.03, PB["z0"], PB["z1"], pegboard, "furniture")
hole = M("hole", "#3a2a1c", 0.9)
for i in range(30):
    for j in range(15):
        x = PB["x0"] + 0.06 + i * 0.105
        z = PB["z0"] + 0.06 + j * 0.105
        cyl(f"hole{i}_{j}", 0.009, 0.004, (x, Y0 + 0.031, z), hole, "furniture", rot=(math.pi / 2, 0, 0), verts=8)
# workbench under the pegboard
box("bench_top", (3.3, 0.6, 0.05), (1.4, Y0 + 0.32, 0.9), oak, "furniture", bevel=0.006)
for sx in (-1.55, 1.55):
    box(f"bench_leg{sx}", (0.05, 0.5, 0.88), (1.4 + sx, Y0 + 0.32, 0.44), steel, "furniture")
# skill tags: coloured plates with tech names
SKILLS = ["React", "Next.js", "TypeScript", "Three.js", "Node", "CSS", "Figma", "Git"]
TAG_COLORS = ["#61dafb", "#f2efe8", "#3178c6", "#f2a7b5", "#6cc24a", "#e8c547", "#a259ff", "#f05033"]
for k, (s, col) in enumerate(zip(SKILLS, TAG_COLORS)):
    cx = PB["x0"] + 0.45 + (3 - k % 4) * 0.75
    cz = 2.25 - (k // 4) * 0.55
    soft_box(f"tag{k}", (0.6, 0.02, 0.2), (cx, Y0 + 0.055, cz), M(f"tagc{k}", col, 0.5), "props", bevel=0.02, segs=3)
    text(f"tagtext{k}", s, (cx, Y0 + 0.068, cz), 0.085, M("tagink", "#141414", 0.5) if col not in ("#3178c6", "#a259ff", "#f05033", "#6cc24a") else white, rot=(math.pi / 2, 0, math.pi), extrude=0.002)
# tools on the board
tool = M("tool_handle", "#c8553d", 0.6)
metal_t = M("tool_metal", "#8f9399", 0.4)
box("hammer_handle", (0.03, 0.03, 0.32), (0.05, Y0 + 0.07, 1.35), oak)
box("hammer_head", (0.14, 0.035, 0.04), (0.05, Y0 + 0.07, 1.52), metal_t)
for k in range(3):
    cyl(f"screwdriver{k}", 0.014, 0.12, (0.32 + k * 0.08, Y0 + 0.07, 1.42), tool if k != 1 else M("tool2", "#e8c547"), verts=12)
    cyl(f"screwdriver_shaft{k}", 0.004, 0.13, (0.32 + k * 0.08, Y0 + 0.07, 1.29), metal_t, verts=8)
cyl("tape_roll", 0.06, 0.03, (0.95, Y0 + 0.07, 1.38), M("tape", "#e8c547"), rot=(math.pi / 2, 0, 0), verts=32)
cyl("headphones", 0.11, 0.04, (1.5, Y0 + 0.08, 1.4), black, rot=(math.pi / 2, 0, 0), verts=32)
box("ruler", (0.6, 0.008, 0.035), (2.25, Y0 + 0.06, 1.25), M("ruler", "#d9cbb3"), rot=(0, 0.1, 0))
box("sketchbook", (0.3, 0.02, 0.42), (2.55, Y0 + 0.07, 1.45), M("sketch", "#2d6a8f"), rot=(0, -0.05, 0))
# bench props
box("laptop_base", (0.34, 0.24, 0.015), (0.6, Y0 + 0.3, 0.935), M("alu", "#b8bcc2", 0.4))
box("laptop_lid", (0.34, 0.015, 0.23), (0.6, Y0 + 0.19, 1.05), M("alu", "#b8bcc2", 0.4), rot=(-0.25, 0, 0))
cyl("bench_lamp_base", 0.07, 0.02, (2.6, Y0 + 0.3, 0.935), black)
cyl("bench_lamp_pole", 0.012, 0.5, (2.6, Y0 + 0.3, 1.18), black)
cyl("bench_lamp_head", 0.07, 0.1, (2.48, Y0 + 0.33, 1.4), black, rot=(0, -1.1, 0), r2=0.03)
sphere("bench_bulb", 0.025, (2.45, Y0 + 0.34, 1.37), bulb_mat)
for k in range(4):
    cyl(f"jar{k}", 0.05, 0.12, (1.4 + k * 0.14, Y0 + 0.25, 0.985), M("jar", "#d6e2e0", 0.2), verts=20)

# ── experience shelves (front wall right) with LED strips ────────────────────
for k, z in enumerate((1.05, 1.65, 2.25)):
    box(f"exp_shelf{k}", (3.4, 0.28, 0.04), (5.6, Y0 + 0.14, z), oak, "furniture", bevel=0.004)
    box(f"exp_led{k}", (3.3, 0.012, 0.008), (5.6, Y0 + 0.26, z - 0.024), led_mat, "props")
YEARS = ["2020", "2022", "2024"]
for k, z in enumerate((1.05, 1.65, 2.25)):
    text(f"year{k}", YEARS[k], (4.15, Y0 + 0.24, z + 0.07), 0.1, brass, rot=(math.pi / 2, 0, math.pi), extrude=0.008)
    for j in range(5):
        x = 4.6 + j * 0.6
        kind = (j + k) % 5
        if kind == 0:
            for b in range(4):
                box(f"exp_book{k}{j}{b}", (0.04, 0.2, 0.26 - b * 0.02), (x + b * 0.045, Y0 + 0.14, z + 0.15 - b * 0.01), M(f"book{b + k}", BOOK_COLORS[(b + k * 3) % 10], 0.8))
        elif kind == 1:
            cyl(f"exp_trophy{k}{j}", 0.05, 0.16, (x, Y0 + 0.14, z + 0.1), brass, r2=0.03)
            sphere(f"exp_trophy_cup{k}{j}", 0.06, (x, Y0 + 0.14, z + 0.22), brass, scale=(1, 1, 0.8))
        elif kind == 2:
            box(f"exp_frame{k}{j}", (0.22, 0.02, 0.28), (x, Y0 + 0.05, z + 0.16), black, rot=(-0.12, 0, 0))
            box(f"exp_frame_art{k}{j}", (0.18, 0.005, 0.24), (x, Y0 + 0.062, z + 0.16), M(f"art{k}", ["#e8c547", "#2d6a8f", "#c8553d"][k], 0.8), rot=(-0.12, 0, 0))
        elif kind == 3:
            cyl(f"exp_pot{k}{j}", 0.06, 0.1, (x, Y0 + 0.14, z + 0.07), terracotta)
            sphere(f"exp_succ{k}{j}", 0.07, (x, Y0 + 0.14, z + 0.15), leaf, scale=(1, 1, 0.6))
        else:
            box(f"exp_device{k}{j}", (0.18, 0.1, 0.12), (x, Y0 + 0.14, z + 0.08), M("device", "#3a3d42", 0.4), bevel=0.01)
            cyl(f"exp_lens{k}{j}", 0.035, 0.04, (x, Y0 + 0.2, z + 0.08), black, rot=(math.pi / 2, 0, 0))

# ── kitchen (right wall) ─────────────────────────────────────────────────────
span("kitchen_base", X1 - 0.65, X1, -4.9, 0.4, 0, 0.88, M("cabinet", "#2f3b36", 0.6), "furniture", bevel=0.005)
span("kitchen_top", X1 - 0.68, X1, -4.92, 0.42, 0.88, 0.92, M("stone", "#d9d4cb", 0.35), "furniture")
for k in range(5):
    y = -4.4 + k * 1.0
    box(f"kitchen_handle{k}", (0.02, 0.3, 0.02), (X1 - 0.66, y, 0.8), brass)
for z in (1.6, 2.2):
    span(f"kitchen_shelf{z}", X1 - 0.3, X1, -4.9, 0.4, z, z + 0.04, oak, "furniture")
for k in range(9):
    y = -4.6 + k * 0.55
    cyl(f"kitchen_jar{k}", 0.06, random.uniform(0.12, 0.22), (X1 - 0.15, y, 1.72), M("jar", "#d6e2e0", 0.2), verts=20)
    if k % 2:
        cyl(f"kitchen_bowl{k}", 0.1, 0.06, (X1 - 0.15, y, 2.27), ceramic, r2=0.07, verts=24)
cyl("faucet", 0.015, 0.3, (X1 - 0.12, -2.5, 1.07), metal_t)
box("faucet_spout", (0.2, 0.02, 0.02), (X1 - 0.2, -2.5, 1.22), metal_t)
# island + stools
span("island", 4.3, 6.3, -1.9, -0.9, 0, 0.9, M("cabinet", "#2f3b36", 0.6), "furniture", bevel=0.01)
span("island_top", 4.25, 6.35, -1.95, -0.85, 0.9, 0.95, M("stone", "#d9d4cb", 0.35), "furniture")
for k in range(3):
    x = 4.7 + k * 0.6
    cyl(f"stool_seat{k}", 0.17, 0.05, (x, -0.55, 0.7), leather, "furniture", verts=32, bevel=0.01)
    cyl(f"stool_leg{k}", 0.02, 0.68, (x, -0.55, 0.34), black, "furniture")
    cyl(f"stool_ring{k}", 0.15, 0.015, (x, -0.55, 0.25), black, "furniture", verts=24)
cyl("fruit_bowl", 0.18, 0.08, (5.0, -1.4, 0.99), ceramic, r2=0.12, verts=32)
for k in range(4):
    sphere(f"fruit{k}", 0.045, (4.95 + (k % 2) * 0.08, -1.42 + (k // 2) * 0.08, 1.05), M(f"fruit{k % 2}", ["#e8a33d", "#c8553d"][k % 2], 0.5))

# ── pendant lights (living + island) ─────────────────────────────────────────
PENDANTS = [(-0.9, -0.6), (0.0, -0.3), (0.9, -0.6), (4.8, -1.4), (5.8, -1.4)]
for k, (x, y) in enumerate(PENDANTS):
    drop = 1.9 if k < 3 else 2.1
    cyl(f"cord{k}", 0.005, H - drop, (x, y, (H + drop) / 2), black, "props", verts=6)
    cyl(f"socket{k}", 0.025, 0.06, (x, y, drop + 0.03), brass, "props")
    sphere(f"bulb{k}", 0.06, (x, y, drop - 0.06), bulb_mat, scale=(1, 1, 1.25))

# ── plants ────────────────────────────────────────────────────────────────────
def plant(name, x, y, height, pot_r=0.22):
    cyl(f"{name}_pot", pot_r, pot_r * 1.4, (x, y, pot_r * 0.7), terracotta, "furniture", r2=pot_r * 0.8, verts=32)
    cyl(f"{name}_soil", pot_r * 0.95, 0.02, (x, y, pot_r * 1.38), M("soil", "#2b1f16", 1.0), "props")
    cyl(f"{name}_stem", 0.02, height, (x, y, pot_r * 1.4 + height / 2), walnut, "props")
    for k in range(int(height * 18)):
        a = k * 2.4
        h = pot_r * 1.4 + height * (0.25 + 0.75 * (k / (height * 18)))
        r = 0.08 + random.random() * 0.25
        sphere(f"{name}_leaf{k}", 0.09, (x + math.cos(a) * r, y + math.sin(a) * r, h), leaf, scale=(1.4, 0.4, 0.9))


plant("fig", -7.2, 4.4, 1.6, 0.25)
plant("monstera", -2.4, -4.5, 1.0, 0.2)
plant("corner", 7.4, 4.5, 1.4, 0.24)
plant("island_plant", 3.4, -4.6, 0.9, 0.18)

# ── balcony furniture & string lights ────────────────────────────────────────
for k, y in enumerate((0.6, 2.4)):
    soft_box(f"lounger{k}", (0.7, 0.75, 0.25), (10.6, y + 1.0, 0.3), fabric_sofa, rot=(0, 0, 0))
    soft_box(f"lounger_back{k}", (0.7, 0.18, 0.5), (10.6, y + 0.65, 0.6), fabric_sofa, rot=(-0.25, 0, 0))
cyl("balcony_table", 0.3, 0.04, (10.6, 2.6, 0.45), oak, "furniture", verts=32)
cyl("balcony_table_leg", 0.03, 0.43, (10.6, 2.6, 0.22), black, "furniture")
cyl("lantern", 0.07, 0.18, (10.55, 2.6, 0.56), M("lantern", "#222222", 0.4), verts=6)
sphere("lantern_light", 0.04, (10.55, 2.6, 0.56), bulb_mat)
plant("balcony_plant1", 11.4, -0.4, 1.2, 0.26)
plant("balcony_plant2", 11.4, 4.9, 1.0, 0.24)
for k in range(12):
    t = k / 11
    x = X1 + T + 0.2 + (BX1 - X1 - T - 0.4) * t
    sag = math.sin(t * math.pi) * 0.25
    sphere(f"string_bulb{k}", 0.035, (x, -0.65, 2.3 - sag), bulb_mat)
    sphere(f"string_bulb_b{k}", 0.035, (BX1 - 0.15, -0.6 + (Y1 + 0.6) * t, 2.3 - sag), bulb_mat)

# ═════════════════════════════════════════════════════════════════════════════
# LIGHTING
# ═════════════════════════════════════════════════════════════════════════════
world = bpy.data.worlds.new("night")
scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (*srgb("#0d1526"), 1)
bg.inputs["Strength"].default_value = 1.2


def point(name, loc, watts, color=warm, radius=0.05):
    d = bpy.data.lights.new(name, "POINT")
    d.energy = watts
    d.color = color
    d.shadow_soft_size = radius
    o = bpy.data.objects.new(name, d)
    o.location = loc
    COLS["helpers"].objects.link(o)
    return o


def area(name, loc, rot, size, watts, color):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = "RECTANGLE"
    d.size, d.size_y = size
    d.energy = watts
    d.color = color
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = rot
    COLS["helpers"].objects.link(o)
    return o


# cool city/moon glow through the windows and balcony door
area("window_glow", (0, Y1 + 0.9, 2.4), (math.radians(90), 0, math.radians(180)), (15, 3.6), 420, srgb("#7d9cff"))
area("door_glow", (X1 + 4, 2.4, 1.6), (math.radians(90), 0, math.radians(90)), (3, 3), 160, srgb("#7d9cff"))
area("balcony_sky", (10, 2.2, 6), (0, 0, 0), (5, 6), 260, srgb("#5f7fd8"))
# warm practicals
for k, (x, y) in enumerate(PENDANTS):
    point(f"pendant_light{k}", (x, y, (1.9 if k < 3 else 2.1) - 0.08), 85)
point("desk_lamp_light", (DX - 1.0, DY - 0.22, 1.3), 35)
point("floor_lamp_light", (FL[0], FL[1], 1.72), 110)
point("bench_lamp_light", (2.45, Y0 + 0.36, 1.33), 25)
point("candle_light", (-5.15, -4.35, 0.7), 4, radius=0.02)
point("lantern_light_p", (10.55, 2.6, 0.6), 30)
area("balcony_warm", (10.0, 2.2, 2.6), (0, 0, 0), (3.2, 5.5), 140, srgb("#ffc890"))
for k in range(0, 12, 3):
    t = k / 11
    point(f"string_light{k}", (X1 + T + 0.2 + (BX1 - X1 - T - 0.4) * t, -0.65, 2.2), 14)
# ceiling spots that pool light on each station
def spot(name, loc, target, watts, angle=40, color=warm):
    d = bpy.data.lights.new(name, "SPOT")
    d.energy = watts
    d.color = color
    d.spot_size = math.radians(angle)
    d.spot_blend = 0.6
    d.shadow_soft_size = 0.15
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    COLS["helpers"].objects.link(o)
    return o


spot("spot_pegboard", (1.4, -3.4, H - 0.5), (1.4, Y0, 1.6), 260, 55)
spot("spot_shelves", (5.6, -3.5, H - 0.5), (5.6, Y0, 1.6), 240, 55)
spot("spot_posters", (-6.2, 2.4, H - 0.5), (X0, 2.4, 2.1), 280, 60)
spot("spot_books", (-6.0, -3.0, H - 0.5), (X0, -3.0, 1.6), 200, 50)
spot("spot_kitchen", (6.6, -2.5, H - 0.5), (X1, -2.5, 1.2), 160, 60)
spot("spot_desk", (-4.6, 3.0, H - 0.5), (-4.6, 4.2, 0.75), 90, 45)

# screens cast a soft blue light on the desk
area("screen_glow", (DX, DY + 0.05, 1.17), (math.radians(90), 0, 0), (1.9, 0.4), 30, srgb("#7aa6ff"))
# soft fill so nothing is pitch black
area("fill", (0, 0, H - 0.2), (0, 0, 0), (12, 8), 260, srgb("#ffd2a6"))

# ═════════════════════════════════════════════════════════════════════════════
# CAMERA STATIONS (Blender coords) — exported for the web as Y-up
# ═════════════════════════════════════════════════════════════════════════════
STATIONS = [
    ("hero", (-0.5, 11.5, 2.6), (-1.5, 0.0, 1.6), 38),
    ("about", (-3.2, -0.5, 1.6), (-6.6, -3.6, 1.0), 52),
    ("skills", (1.4, -1.2, 1.65), (1.4, -5.0, 1.55), 50),
    ("experience", (5.4, -0.9, 1.8), (5.6, -5.0, 1.55), 55),
    ("work", (-4.6, 2.55, 1.72), (-4.6, 4.6, 1.1), 50),
    ("cases", (-3.4, 2.45, 2.05), (-8.0, 2.45, 2.15), 58),
    ("contact", (9.0, -0.35, 1.7), (11.6, 3.6, 1.2), 60),
    ("overview", (7.0, -3.3, 3.3), (-2.0, 1.6, 0.6), 60),
]


def look_cam(name, loc, target, fov):
    cam = bpy.data.cameras.new(name)
    cam.angle = math.radians(fov)
    o = bpy.data.objects.new(name, cam)
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    COLS["helpers"].objects.link(o)
    return o


cams = {n: look_cam(f"cam_{n}", l, t, f) for n, l, t, f in STATIONS}


def to_three(v):
    return [round(v[0], 3), round(v[2], 3), round(-v[1], 3)]


with open(os.path.join(OUT, "stations.json"), "w") as f:
    json.dump(
        {n: {"pos": to_three(l), "target": to_three(t), "fov": fv} for n, l, t, fv in STATIONS}
        | {
            "posters": POSTERS,
            "room": {"x": [X0, X1], "z": [-Y1, -Y0], "h": H},
        },
        f,
        indent=2,
    )


# ═════════════════════════════════════════════════════════════════════════════
# PREVIEW: render stills from each station
# ═════════════════════════════════════════════════════════════════════════════
def apply_all_modifiers():
    for o in list(bpy.data.objects):
        if o.type == "MESH" and o.modifiers:
            bpy.context.view_layer.objects.active = o
            for m in list(o.modifiers):
                try:
                    bpy.ops.object.modifier_apply(modifier=m.name)
                except RuntimeError:
                    o.modifiers.remove(m)


bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(os.path.join(OUT, "loft.blend")))

if MODE == "preview":
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 6
    scale = float(os.environ.get("PREVIEW_SCALE", "1"))
    scene.render.resolution_x = int(960 * scale)
    scene.render.resolution_y = int(540 * scale)
    only = sys.argv[5].split(",") if len(sys.argv) > 5 else None
    # rt objects get their bake stand-ins hidden; keep both visible except duplicates
    for o in COLS["helpers"].objects:
        if o.type == "MESH":
            o.hide_render = True
    for n, cam in cams.items():
        if only and n not in only:
            continue
        scene.camera = cam
        scene.render.filepath = os.path.join(OUT, f"preview_{n}.png")
        bpy.ops.render.render(write_still=True)
        print("rendered", n, flush=True)
    sys.exit(0)


# ═════════════════════════════════════════════════════════════════════════════
# BAKE: join each group, unwrap, bake combined lighting, export glTF
# ═════════════════════════════════════════════════════════════════════════════
import numpy as np  # noqa: E402

apply_all_modifiers()
scene.cycles.samples = SAMPLES
scene.cycles.max_bounces = 6
scene.render.bake.margin = 6
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_diffuse = True
scene.render.bake.use_pass_glossy = False
scene.render.bake.use_pass_transmission = True
scene.render.bake.use_pass_emit = True
scene.cycles.bake_type = "COMBINED"

# screen stand-ins light the scene during the bake but are not exported
for o in COLS["helpers"].objects:
    if o.type == "MESH":
        o.hide_render = False
for o in COLS["rt"].objects:
    o.hide_render = True


def join_group(group):
    objs = [o for o in COLS[group].objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = f"baked_{group}"
    return o


def unwrap(o, margin):
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    me = o.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name="bake")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=margin, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.pack_islands(margin=margin, rotate=True)
    bpy.ops.object.mode_set(mode="OBJECT")


def bake_group(group, size):
    o = join_group(group)
    unwrap(o, 0.0015 if group != "shell" else 0.001)
    img = bpy.data.images.new(f"bake_{group}", size, size, float_buffer=True)
    for slot in o.material_slots:
        m = slot.material
        nt = m.node_tree
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img
        nt.nodes.active = n
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    print(f"baking {group} ({len(o.data.polygons)} faces) at {size}px…", flush=True)
    bpy.ops.object.bake(type="COMBINED")
    raw = os.path.join(OUT, f"{group}_raw.png")
    img.save_render(raw, scene=scene)  # applies the AgX view transform
    # clean up bake nodes so materials don't reference the image on export
    for slot in o.material_slots:
        nt = slot.material.node_tree
        for n in [n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image == img]:
            nt.nodes.remove(n)
    return o, raw


exports = []
for group in GROUPS:
    size = ATLAS * 2 if group == "shell" else ATLAS
    o, raw = bake_group(group, size)
    exports.append(o)

# denoise + compress
import cv2  # noqa: E402

for group in GROUPS:
    raw = os.path.join(OUT, f"{group}_raw.png")
    im = cv2.imread(raw)
    den = cv2.fastNlMeansDenoisingColored(im, None, 5, 7, 7, 21)
    cv2.imwrite(os.path.join(OUT, f"{group}.jpg"), den, [cv2.IMWRITE_JPEG_QUALITY, 88])
    small = cv2.resize(den, (den.shape[1] // 2, den.shape[0] // 2), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, f"{group}_low.jpg"), small, [cv2.IMWRITE_JPEG_QUALITY, 85])

# export: baked meshes (UV only) + real-time meshes
for o in COLS["rt"].objects:
    o.hide_render = False
bpy.ops.object.select_all(action="DESELECT")
for o in exports:
    o.select_set(True)
for o in COLS["rt"].objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=os.path.join(OUT, "loft.glb"),
    use_selection=True,
    export_format="GLB",
    export_materials="PLACEHOLDER",
    export_texcoords=True,
    export_normals=False,
    export_apply=True,
    export_yup=True,
)
print("exported", flush=True)
