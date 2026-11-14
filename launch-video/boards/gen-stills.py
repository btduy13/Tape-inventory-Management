"""Generate the 13 posed storyboard scenes + index.html for launch-video."""
import os, sys

ROOT = sys.argv[1]
FR = os.path.join(ROOT, "compositions", "frames")
os.makedirs(FR, exist_ok=True)

INK = "#16173a"; RED = "#cf1f27"; YEL = "#fef211"; BLUE = "#252a9a"; TAPE_Y = "#FFCD00"
EX = (0.95, -0.17); EY = (-0.56, -0.32)
L, W, H = 250, 150, 125
S = 2.0
O = (806.5, 755.5)  # centre box origin -> box bbox centred on (960, 540)
STEP = (L + 100) * S  # neighbour spacing along EX


def proj(o, s=S):
    def p(x, y, z):
        return (o[0] + s * (x * EX[0] + y * EY[0]), o[1] + s * (x * EX[1] + y * EY[1] - z))
    return p


def poly(*pts):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in pts)


def print_row(text, size, count, step, x0, base=0.0):
    out = []
    for i in range(count):
        x = x0 + i * step
        out.append(
            f'<circle cx="{x:.1f}" cy="{base-size*0.35:.1f}" r="{size*0.48:.1f}" fill="none" stroke="{RED}" stroke-width="{size*0.17:.1f}"/>'
            f'<circle cx="{x:.1f}" cy="{base-size*0.35:.1f}" r="{size*0.17:.1f}" fill="{RED}"/>'
            f'<text x="{x+size*0.8:.1f}" y="{base:.1f}" font-size="{size}" font-weight="700" font-family="Roboto" fill="{RED}">{text}</text>'
        )
    return "".join(out)


def box(o, tape="plain", s=S):
    p = proj(o, s)
    half = W / 2; tw = 42; fold = 60
    t0, t1 = half - tw / 2, half + tw / 2
    g = []
    # contact shadow
    g.append(f'<polygon points="{poly(p(-6,-10,0), p(L+10,-10,0), p(L+10,W+6,0), p(-6,W+6,0))}" fill="#000" opacity="0.22" filter="url(#soft)"/>')
    g.append(f'<polygon points="{poly(p(0,0,0), p(0,W,0), p(0,W,H), p(0,0,H))}" fill="#a8743f"/>')
    g.append(f'<polygon points="{poly(p(0,0,0), p(L,0,0), p(L,0,H), p(0,0,H))}" fill="#c98f52"/>')
    g.append(f'<polygon points="{poly(p(0,0,H), p(L,0,H), p(L,half,H), p(0,half,H))}" fill="#e2b47e"/>')
    g.append(f'<polygon points="{poly(p(0,half,H), p(L,half,H), p(L,W,H), p(0,W,H))}" fill="#d9a86f"/>')
    g.append(f'<polyline points="{poly(p(0,W,H), p(0,0,H), p(L,0,H))}" fill="none" stroke="#f0cc9c" stroke-width="3" stroke-linejoin="round"/>')
    a, b = p(0, 0, 0), p(0, 0, H)
    g.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#8e5f30" stroke-opacity="0.6" stroke-width="2.4"/>')
    if tape == "plain":
        g.append(f'<polygon points="{poly(p(0,t0,H), p(0,t1,H), p(0,t1,H-fold), p(0,t0,H-fold))}" fill="#9a6a35" opacity="0.85"/>')
        g.append(f'<polygon points="{poly(p(0,t0,H), p(L,t0,H), p(L,t1,H), p(0,t1,H))}" fill="#b5844a" opacity="0.9"/>')
        q0, q1 = p(0, t0 + 6, H), p(L, t0 + 6, H)
        g.append(f'<line x1="{q0[0]:.1f}" y1="{q0[1]:.1f}" x2="{q1[0]:.1f}" y2="{q1[1]:.1f}" stroke="#fff" stroke-opacity="0.35" stroke-width="3"/>')
    else:
        g.append(f'<polygon points="{poly(p(0,t0,H), p(0,t1,H), p(0,t1,H-fold), p(0,t0,H-fold))}" fill="#e9b800"/>')
        g.append(f'<polygon points="{poly(p(0,t0,H), p(L,t0,H), p(L,t1,H), p(0,t1,H))}" fill="{TAPE_Y}"/>')
        tt = p(0, half, H)
        m = f"matrix({s*EX[0]:.3f} {s*EX[1]:.3f} {-s*EY[0]:.3f} {-s*EY[1]:.3f} {tt[0]:.1f} {tt[1]:.1f})"
        g.append(f'<g data-layout-ignore transform="{m}">{print_row("LOGO CỦA BẠN", 15, 2, 128, 14, 5.4)}</g>')
        em = p(0, half, H - fold / 2)
        m2 = f"matrix({s*EY[0]:.3f} {s*EY[1]:.3f} 0 {s} {em[0]:.1f} {em[1]:.1f})"
        g.append(f'<g transform="{m2}"><circle r="11" fill="none" stroke="{RED}" stroke-width="4"/><circle r="4" fill="{RED}"/></g>')
    return "".join(g)


def conveyor():
    o = (O[0], O[1])
    p = proj(o)
    g = []
    g.append(f'<polygon points="{poly(p(-3000,-24,-4), p(3000,-24,-4), p(3000,W+24,-4), p(-3000,W+24,-4))}" fill="#3f424c"/>')
    for i in range(-80, 81):
        x = i * 36
        a, b = p(x, -24, -4), p(x, W + 24, -4)
        g.append(f'<line x1="{a[0]:.1f}" y1="{a[1]:.1f}" x2="{b[0]:.1f}" y2="{b[1]:.1f}" stroke="#585c68" stroke-width="3"/>')
    g.append(f'<polygon points="{poly(p(-3000,-24,-4), p(3000,-24,-4), p(3000,-24,-34), p(-3000,-24,-34))}" fill="#a9afbb"/>')
    g.append(f'<polygon points="{poly(p(-3000,-24,-29), p(3000,-24,-29), p(3000,-24,-34), p(-3000,-24,-34))}" fill="#6d7280"/>')
    for i in range(-6, 7):
        x = i * 175 + 40
        a = p(x, -24, -34)
        g.append(f'<rect x="{a[0]-7:.1f}" y="{a[1]:.1f}" width="14" height="400" fill="#b9bec8"/>')
    return "".join(g)


DEFS = '<defs><filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/></filter><filter id="far"><feGaussianBlur stdDeviation="2.2"/></filter></defs>'


def conveyor_world(center_tape):
    nb = lambda k: (O[0] + k * STEP * EX[0], O[1] + k * STEP * EX[1])
    parts = [conveyor(), box(nb(1)), box(O, center_tape), box(nb(-1))]
    return f'<svg class="world" viewBox="0 0 1920 1080" width="1920" height="1080">{DEFS}<rect width="1920" height="1080" fill="#e8e3d9"/><rect y="0" width="1920" height="70" fill="#dcd6ca"/>{"".join(parts)}</svg>'


def warehouse_world(center_tape):
    g = ['<rect width="1920" height="1080" fill="#ebe6dc"/>', '<rect y="760" width="1920" height="320" fill="#d4cdbf"/>']
    rack = []
    for row, (y, bh) in enumerate([(300, 120), (560, 120), (790, 110)]):
        rack.append(f'<rect x="0" y="{y}" width="1920" height="16" fill="#3a3c92"/>')
        x = -40 + (row % 2) * 60
        while x < 1960:
            rack.append(f'<rect x="{x}" y="{y-bh}" width="170" height="{bh}" rx="3" fill="#c8975c"/>'
                        f'<rect x="{x}" y="{y-bh}" width="170" height="16" fill="#d9ac74"/>'
                        f'<rect x="{x+72}" y="{y-bh}" width="26" height="46" fill="#a87a45" opacity="0.85"/>')
            x += 196
    for ux in range(0, 1921, 480):
        rack.append(f'<rect x="{ux-8}" y="0" width="16" height="820" fill="#2c2e7a"/>')
    g.append(f'<g filter="url(#far)" opacity="0.8">{"".join(rack)}</g>')
    g.append('<rect width="1920" height="1080" fill="#ebe6dc" opacity="0.28"/>')
    g.append(box(O, center_tape))
    return f'<svg class="world" viewBox="0 0 1920 1080" width="1920" height="1080">{DEFS}{"".join(g)}</svg>'


def bubble(kind):
    if kind == "silent":
        w, h = 300, 170
        inner = "".join(f'<circle cx="{75+i*50}" cy="85" r="14" fill="#9c9b9b"/>' for i in range(4))
        fill = "#ffffff"
    else:
        w, h = 530, 170
        inner = (f'<circle cx="80" cy="85" r="36" fill="none" stroke="{RED}" stroke-width="13"/><circle cx="80" cy="85" r="13" fill="{RED}"/>'
                 f'<text x="132" y="103" font-family="Roboto" font-weight="700" font-size="50" fill="{RED}">LOGO CỦA BẠN</text>')
        fill = YEL
    x, y = 1160, 128
    path = (f"M{x+28},{y} H{x+w-28} Q{x+w},{y} {x+w},{y+28} V{y+h-28} Q{x+w},{y+h} {x+w-28},{y+h} "
            f"H{x+120} L{x+40},{y+h+62} L{x+70},{y+h} H{x+28} Q{x},{y+h} {x},{y+h-28} V{y+28} Q{x},{y} {x+28},{y} Z")
    return (f'<svg class="bubble" viewBox="0 0 1920 1080" width="1920" height="1080">'
            f'<path d="{path}" fill="{fill}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
            f'<g transform="translate({x},{y})">{inner}</g></svg>')


def strip(h=180, base=TAPE_Y):
    item = (f'<div class="it"><svg width="{int(h*0.62)}" height="{int(h*0.62)}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="{RED}" stroke-width="14"/><circle cx="50" cy="50" r="15" fill="{RED}"/></svg>'
            f'<span>LOGO CỦA BẠN</span></div>')
    return f'<div class="strip" style="height:{h}px;top:{540-h/2}px;background:{base}">{item*3}</div>'


STRIP_CSS = (".strip{position:absolute;left:-200px;right:-200px;display:flex;align-items:center;justify-content:center;gap:150px;box-shadow:0 10px 30px rgba(0,0,0,.18)}"
             ".strip .it{display:flex;align-items:center;gap:34px;flex:none}"
             f".strip span{{font-family:Roboto;font-weight:700;font-size:78px;color:{RED};white-space:nowrap}}")

CURSOR = ('<svg class="cursor" style="left:{x}px;top:{y}px" width="70" height="96" viewBox="0 0 28 38">'
          '<path d="M2 2 L2 30 L9 23.5 L13.5 34 L18 32 L13.6 21.8 L23 21.8 Z" fill="#fff" stroke="#111" stroke-width="2" stroke-linejoin="round"/></svg>')

BASE_CSS = ("#root{position:absolute;inset:0;overflow:hidden;font-family:Inter}"
            "#root .world,#root .bubble{position:absolute;left:0;top:0}"
            ".t{position:absolute;left:0;right:0;top:888px;text-align:center;font-family:Inter;font-weight:800;font-size:72px;letter-spacing:-0.02em;line-height:1.1}"
            ".cursor{position:absolute;filter:drop-shadow(0 4px 6px rgba(0,0,0,.3))}"
            ".ui{position:absolute;display:block;box-shadow:0 24px 60px rgba(22,23,58,.18)}")


def scene(cid, bg, body, extra_css="", title=None, tcolor=INK):
    t = f'<div class="t" id="{cid}-title" style="color:{tcolor}">{title}</div>' if title else ""
    return f"""<template>
  <style>
    #root {{ background: {bg}; }}
    {BASE_CSS}
    {STRIP_CSS}
    {extra_css}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="1920" data-height="1080">
    {body}
    {t}
  </div>
  <script>
    // Posed still for the storyboard; motion is added once the board is approved.
    const tl = gsap.timeline({{ paused: true }});
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""


def img(src, w, h, cx=960, cy=540, extra=""):
    return f'<img class="ui" src="assets/ui/{src}" style="width:{w}px;height:{h}px;left:{cx-w/2:.0f}px;top:{cy-h/2:.0f}px;{extra}" alt="">'


def roll(cx=960, cy=560, rx=300, ry=105, hgt=250, fill_top="#d9b47f"):
    top, bot = cy - hgt / 2, cy + hgt / 2
    return (f'<svg class="world" viewBox="0 0 1920 1080" width="1920" height="1080"><defs>'
            '<linearGradient id="rs" x1="0" x2="1"><stop offset="0" stop-color="#9c6d3a"/><stop offset="0.35" stop-color="#d7ad74"/><stop offset="0.7" stop-color="#c39058"/><stop offset="1" stop-color="#8a5e30"/></linearGradient>'
            '<filter id="sh"><feGaussianBlur stdDeviation="18"/></filter></defs>'
            f'<ellipse cx="{cx}" cy="{bot+18}" rx="{rx+20}" ry="{ry*0.7}" fill="#000" opacity="0.35" filter="url(#sh)"/>'
            f'<path d="M{cx-rx},{top} V{bot} A{rx},{ry} 0 0 0 {cx+rx},{bot} V{top} Z" fill="url(#rs)"/>'
            f'<ellipse cx="{cx}" cy="{top}" rx="{rx}" ry="{ry}" fill="{fill_top}"/>'
            f'<ellipse cx="{cx}" cy="{top}" rx="{rx*0.62}" ry="{ry*0.62}" fill="#8e5a2e"/>'
            f'<ellipse cx="{cx}" cy="{top+4}" rx="{rx*0.54}" ry="{ry*0.52}" fill="#1c2079"/>'
            '</svg>')


scenes = []  # (id, file, start, dur, html)

def add(cid, name, dur, html):
    scenes.append((cid, f"{cid[1:]}-{name}.html", dur, html))

add("s01", "thung-nao", 3.0, scene("s01", "#e8e3d9", conveyor_world("plain"), title="Thùng nào của bạn?"))
add("s02", "thung-im-lang", 4.2, scene("s02", "#e8e3d9", conveyor_world("plain") + bubble("silent"), title="không đủ làm thương hiệu"))
add("s03", "qua-tay", 3.6, scene("s03", "#ebe6dc", warehouse_world("plain") + bubble("silent"), title="kho bãi"))
dots = ('<svg class="world" viewBox="0 0 1920 1080" width="1920" height="1080"><circle cx="560" cy="270" r="24" fill="#fff" opacity="0.9"/>'
        '<circle cx="1380" cy="790" r="24" fill="#fff" opacity="0.9"/></svg>')
add("s04", "cuon-bang", 3.0, scene("s04", BLUE, roll() + dots, title="Băng keo in logo", tcolor="#ffffff"))
add("s05", "tai-logo", 3.2, scene("s05", "#f3f1ec", img("preview.png", 1395, 421) + CURSOR.format(x=640, y=604), title="Tải logo của bạn lên"))
add("s06", "chon-kho", 2.8, scene("s06", "#f3f1ec", img("spec-row.png", 1035, 146, cy=300, extra="box-shadow:none") + strip(180), title="Khổ 12 – 80 mm"))
add("s07", "toi-da-3-mau", 2.8, scene("s07", "#f3f1ec", img("colors-bg.png", 836, 317, cy=262, extra="box-shadow:none;border-radius:12px") + strip(180), title="Tối đa 3 màu"))
add("s08", "xem-3d", 2.4, scene("s08", "#f3f1ec", img("roll3d-view.png", 1170, 616, cy=520, extra="border-radius:16px"), title="Xem mô phỏng 3D"))
add("s09", "bao-gia", 3.0, scene("s09", "#f3f1ec",
    img("quote-summary.png", 877, 500, cy=446, extra="border-radius:18px") + img("quote-button.png", 877, 108, cy=782, extra="border-radius:12px")
    + CURSOR.format(x=1150, y=790), title="Báo giá trong ngày làm việc"))
press = ('<div class="roller" style="top:260px"></div><div class="roller" style="top:660px"></div>'
         '<div class="ink"></div><div class="plate" style="left:236px"></div><div class="plate" style="left:1624px"></div>')
press_css = (".roller{position:absolute;left:290px;width:1340px;height:160px;border-radius:80px/20px;"
             "background:linear-gradient(180deg,#4a4e5c 0%,#9aa0ad 22%,#eef0f5 45%,#a3a9b6 70%,#565a68 100%)}"
             f".ink{{position:absolute;left:290px;width:1340px;top:406px;height:14px;background:{RED};border-radius:0 0 40px 40px/0 0 10px 10px}}"
             ".plate{position:absolute;top:150px;width:60px;height:790px;background:#14164d;border-radius:8px}")
add("s10", "xuong-in", 3.5, scene("s10", BLUE, press + strip(180), press_css, title="Xưởng in và cuộn băng keo", tcolor="#ffffff"))
add("s11", "thung-nay", 3.0, scene("s11", "#e8e3d9", conveyor_world("print") + bubble("speak"), title="Thùng này của bạn"))
add("s12", "dan-toi-dau", 4.6, scene("s12", "#ebe6dc", warehouse_world("print") + bubble("speak"), title="thương hiệu đi tới đó"))
end = ('<div class="tag">Hãy để thương hiệu đi cùng bạn</div>'
       '<img class="logo" src="assets/brand/vinh-thinh-logo.png" alt="Vĩnh Thịnh">'
       '<div class="under" data-layout-ignore><span>VĨNH THỊNH</span><span>VĨNH THỊNH</span><span>VĨNH THỊNH</span></div><div class="cta">Thiết kế ngay</div><div class="url">[địa chỉ website]</div>')
end_css = (".logo{position:absolute;height:400px;left:809px;top:296px}"
           f".under{{position:absolute;left:660px;width:600px;top:716px;height:36px;background:{RED};display:flex;align-items:center;justify-content:space-around;box-shadow:0 6px 14px rgba(0,0,0,.18)}}"
           ".under span{font-family:Roboto;font-weight:700;font-size:20px;color:#fff;letter-spacing:.06em}"
           f".tag{{position:absolute;left:0;right:0;top:150px;text-align:center;font-weight:800;font-size:64px;letter-spacing:-0.02em;color:{INK}}}"
           f".cta{{position:absolute;left:770px;width:380px;top:782px;height:92px;border-radius:16px;background:{BLUE};color:#fff;font-weight:800;font-size:44px;display:flex;align-items:center;justify-content:center}}"
           f".url{{position:absolute;left:0;right:0;top:900px;text-align:center;font-weight:700;font-size:34px;color:{INK};opacity:.65}}")
add("s13", "end-card", 5.3, scene("s13", YEL, end, end_css))

start = 0.0
hosts = []
for cid, fname, dur, html in scenes:
    with open(os.path.join(FR, fname), "w", encoding="utf-8") as f:
        f.write(html)
    hosts.append(f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/frames/{fname}" '
                 f'data-start="{start:.1f}" data-duration="{dur:.1f}" data-track-index="1" data-track-kind="graphics" '
                 f'data-width="1920" data-height="1080"></div>')
    print(cid, f"{start:.1f}-{start+dur:.1f}")
    start += dur
total = round(start, 1)

index = f"""<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #e8e3d9; }}
      #root {{ position: relative; width: 100%; height: 100%; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
    f.write(index)
print("total", total)
