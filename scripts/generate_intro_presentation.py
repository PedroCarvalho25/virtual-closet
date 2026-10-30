from pathlib import Path
from math import cos, sin, pi

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Inches, Pt


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "Virtual-Closet-Apresentacao-Introdutoria.pptx"
SHOTS = ROOT / "docs" / "screenshots"

COLORS = {
    "canvas": "FAF9F6",
    "ink": "292D25",
    "olive": "41573C",
    "lemon": "E7EDB8",
    "sage": "EEF1E8",
    "blush": "F7EAE4",
    "muted": "73786C",
    "line": "E6E7E0",
    "white": "FFFFFF",
    "black": "171914",
    "gold": "B59D38",
}

SW = 13.333
SH = 7.5
FONT = "DM Sans"


def rgb(hex_value):
    return RGBColor.from_string(hex_value)


def set_fill(shape, color, transparency=0):
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(COLORS.get(color, color))
    shape.fill.transparency = transparency


def set_line(shape, color=None, width=1):
    if color is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = rgb(COLORS.get(color, color))
        shape.line.width = Pt(width)


def add_rect(slide, x, y, w, h, color, radius=True, line=None, transparency=0):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    shape = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    set_fill(shape, color, transparency)
    set_line(shape, line)
    if radius:
        shape.adjustments[0] = 0.12
    return shape


def add_circle(slide, x, y, d, color, line=None, transparency=0):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    set_fill(shape, color, transparency)
    set_line(shape, line)
    return shape


def add_text(
    slide,
    text,
    x,
    y,
    w,
    h,
    size=22,
    color="ink",
    bold=False,
    align=PP_ALIGN.LEFT,
    valign=MSO_ANCHOR.TOP,
    font=FONT,
    margin=0,
    line_spacing=1.0,
):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.margin_left = Inches(margin)
    frame.margin_right = Inches(margin)
    frame.margin_top = Inches(margin)
    frame.margin_bottom = Inches(margin)
    frame.vertical_anchor = valign
    frame.word_wrap = True
    p = frame.paragraphs[0]
    p.text = text
    p.alignment = align
    p.line_spacing = line_spacing
    p.font.name = font
    p.font.size = Pt(size)
    p.font.bold = bold
    p.font.color.rgb = rgb(COLORS.get(color, color))
    return box


def add_rich_text(slide, runs, x, y, w, h, size=22, color="ink", align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    frame = box.text_frame
    frame.clear()
    frame.margin_left = 0
    frame.margin_right = 0
    frame.margin_top = 0
    frame.margin_bottom = 0
    p = frame.paragraphs[0]
    p.alignment = align
    for text, bold, run_color in runs:
        run = p.add_run()
        run.text = text
        run.font.name = FONT
        run.font.size = Pt(size)
        run.font.bold = bold
        run.font.color.rgb = rgb(COLORS.get(run_color or color, run_color or color))
    return box


def add_kicker(slide, text, x=0.7, y=0.42, w=4.8, dark=False):
    pill = add_rect(slide, x, y, min(max(1.35, len(text) * 0.085 + 0.42), w), 0.34, "lemon", radius=True)
    add_text(slide, text.upper(), x + 0.12, y + 0.045, pill.width / Inches(1) - 0.24, 0.23, 10.5, "ink", True)


def add_title(slide, title, subtitle=None, dark=False):
    color = "canvas" if dark else "ink"
    muted = "sage" if dark else "muted"
    add_text(slide, title, 0.72, 0.77, 11.85, 0.8, 31, color, True)
    if subtitle:
        add_text(slide, subtitle, 0.74, 1.53, 11.3, 0.55, 17, muted)


def add_footer(slide, number, dark=False):
    color = "sage" if dark else "muted"
    add_text(slide, f"{number:02d}", 12.15, 7.05, 0.48, 0.22, 10.5, color, True, PP_ALIGN.RIGHT)
    line = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT,
        Inches(0.72),
        Inches(7.13),
        Inches(1.35),
        Inches(7.13),
    )
    line.line.color.rgb = rgb(COLORS["lemon"] if dark else COLORS["olive"])
    line.line.width = Pt(2)


def add_logo(slide, x, y, dark=False, scale=1.0):
    add_circle(slide, x, y, 0.34 * scale, "lemon")
    # Three small layer lines: the brand's existing visual metaphor.
    for i in range(3):
        yy = y + (0.11 + i * 0.055) * scale
        line = slide.shapes.add_connector(
            MSO_CONNECTOR.STRAIGHT,
            Inches(x + 0.09 * scale),
            Inches(yy),
            Inches(x + 0.25 * scale),
            Inches(yy),
        )
        line.line.color.rgb = rgb(COLORS["olive"])
        line.line.width = Pt(1.4)
    add_text(
        slide,
        "virtual closet.",
        x + 0.45 * scale,
        y - 0.005 * scale,
        2.2 * scale,
        0.34 * scale,
        15 * scale,
        "canvas" if dark else "ink",
        True,
        valign=MSO_ANCHOR.MIDDLE,
    )


def add_image_fit(slide, path, x, y, w, h):
    from PIL import Image

    with Image.open(path) as img:
        iw, ih = img.size
    image_ratio = iw / ih
    box_ratio = w / h
    if image_ratio > box_ratio:
        shown_h = w / image_ratio
        top = y + (h - shown_h) / 2
        return slide.shapes.add_picture(str(path), Inches(x), Inches(top), width=Inches(w))
    shown_w = h * image_ratio
    left = x + (w - shown_w) / 2
    return slide.shapes.add_picture(str(path), Inches(left), Inches(y), height=Inches(h))


def add_phone(slide, path, x, y, h, accent="sage"):
    from PIL import Image

    with Image.open(path) as img:
        iw, ih = img.size
    ratio = iw / ih
    image_h = h - 0.18
    image_w = image_h * ratio
    frame_w = image_w + 0.18
    add_rect(slide, x, y, frame_w, h, "white", radius=True, line="line")
    add_rect(slide, x + 0.06, y + 0.06, frame_w - 0.12, h - 0.12, accent, radius=True)
    slide.shapes.add_picture(
        str(path),
        Inches(x + 0.09),
        Inches(y + 0.09),
        width=Inches(image_w),
        height=Inches(image_h),
    )
    return frame_w


def add_bullet(slide, title, body, x, y, w, color="olive", index=None):
    if index is not None:
        add_circle(slide, x, y + 0.02, 0.36, color)
        add_text(slide, str(index), x, y + 0.03, 0.36, 0.28, 11, "white", True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
        text_x = x + 0.52
        text_w = w - 0.52
    else:
        add_circle(slide, x, y + 0.08, 0.11, color)
        text_x = x + 0.24
        text_w = w - 0.24
    add_text(slide, title, text_x, y, text_w, 0.32, 17, "ink", True)
    add_text(slide, body, text_x, y + 0.34, text_w, 0.58, 13.5, "muted")


def add_chevron(slide, x, y, w=0.38, color="olive"):
    shape = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, Inches(x), Inches(y), Inches(w), Inches(w))
    set_fill(shape, color)
    set_line(shape, None)
    return shape


def slide_background(slide, color="canvas"):
    bg = slide.background
    bg.fill.solid()
    bg.fill.fore_color.rgb = rgb(COLORS[color])


def build():
    prs = Presentation()
    prs.slide_width = Inches(SW)
    prs.slide_height = Inches(SH)
    blank = prs.slide_layouts[6]

    # 01 — Cover
    s = prs.slides.add_slide(blank)
    slide_background(s, "canvas")
    add_rect(s, 0, 0, 5.15, SH, "olive", radius=False)
    add_logo(s, 0.72, 0.55, dark=True, scale=1.05)
    add_text(s, "Um novo olhar\npara o que já é seu.", 0.72, 1.62, 4.05, 1.55, 32, "canvas", True)
    add_text(s, "Uma inteligência pessoal de estilo para decidir, descobrir, usar e lembrar.", 0.74, 3.48, 3.65, 1.08, 18, "sage")
    add_rect(s, 0.72, 5.05, 3.45, 0.58, "lemon", radius=True)
    add_text(s, "Apresentação introdutória", 0.94, 5.19, 3.0, 0.25, 13.5, "ink", True)
    add_text(s, "Virtual Closet", 0.74, 6.32, 3.1, 0.35, 12.5, "sage")
    # Layered product canvas
    add_circle(s, 8.35, 0.38, 4.2, "lemon", transparency=18)
    add_rect(s, 6.02, 0.68, 6.45, 6.12, "sage", radius=True)
    add_phone(s, SHOTS / "09-inicio-ideias.png", 8.12, 0.52, 6.45)
    add_text(s, "SEU DIA, SEU ESTILO", 6.42, 1.22, 1.35, 0.7, 12, "olive", True)
    add_text(s, "O closet deixa de ser inventário.\nEle passa a participar das decisões.", 6.42, 2.0, 1.45, 2.1, 17, "ink", True)

    # 02 — Problem
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "O problema")
    add_title(s, "O paradoxo do closet moderno", "Muita inspiração e muitas roupas ainda resultam em decisões difíceis.")
    columns = [
        ("01", "Possuir não significa enxergar", "Peças ficam esquecidas e combinações possíveis permanecem invisíveis."),
        ("02", "Inspiração não vira ação", "O look salvo nas redes raramente conversa com o que existe no próprio closet."),
        ("03", "Comprar não resolve a decisão", "Novas peças podem repetir funções sem aumentar possibilidades reais."),
    ]
    xs = [0.72, 4.48, 8.24]
    fills = ["sage", "blush", "lemon"]
    for i, ((num, title, body), x, fill) in enumerate(zip(columns, xs, fills)):
        add_rect(s, x, 2.35, 3.38, 3.52, fill, radius=True)
        add_text(s, num, x + 0.25, 2.63, 0.75, 0.45, 20, "olive", True)
        add_text(s, title, x + 0.25, 3.27, 2.84, 0.82, 22, "ink", True)
        add_text(s, body, x + 0.25, 4.34, 2.82, 1.15, 15, "muted")
    add_text(s, "“Tenho roupas, mas não sei o que vestir.”", 0.72, 6.24, 11.8, 0.52, 25, "olive", True, PP_ALIGN.CENTER)
    add_footer(s, 2)

    # 03 — Proposition
    s = prs.slides.add_slide(blank)
    slide_background(s, "olive")
    add_kicker(s, "A proposta", dark=True)
    add_title(s, "Um aplicativo para decidir, descobrir e lembrar", "O produto acompanha o usuário antes, durante e depois de cada escolha.", dark=True)
    prompts = [
        ("HOJE", "O que eu visto?"),
        ("INSPIRAÇÃO", "Como recrio isto?"),
        ("COMPRA", "Vale a pena levar?"),
        ("HISTÓRIA", "Como meu estilo evoluiu?"),
    ]
    for i, (label, question) in enumerate(prompts):
        y = 2.32 + i * 1.02
        add_text(s, label, 0.78, y + 0.09, 1.25, 0.27, 10.5, "lemon", True)
        add_text(s, question, 2.15, y, 5.05, 0.48, 23, "canvas", True)
        line = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(7.33), Inches(y + 0.23), Inches(8.33), Inches(y + 0.23))
        line.line.color.rgb = rgb(COLORS["lemon"])
        line.line.width = Pt(2)
    add_rect(s, 8.7, 2.23, 3.82, 3.92, "canvas", radius=True)
    add_text(s, "Virtual Closet", 9.06, 2.62, 3.0, 0.48, 22, "ink", True)
    add_text(s, "transforma o que você possui em:", 9.06, 3.2, 2.95, 0.58, 15, "muted")
    for i, item in enumerate(["decisões mais simples", "novas possibilidades", "memórias de estilo", "compras mais conscientes"]):
        add_circle(s, 9.06, 4.02 + i * 0.43, 0.12, "lemon")
        add_text(s, item, 9.34, 3.94 + i * 0.43, 2.5, 0.28, 14.5, "ink", i == 1)
    add_footer(s, 3, dark=True)

    # 04 — Product proof
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Produto real")
    add_title(s, "O produto já começou a ganhar forma", "Uma base funcional de closet, outfits, calendário e experiência visual.")
    phone_specs = [
        ("06-closet-redesign.png", 0.85, 2.1, 4.88),
        ("09-inicio-ideias.png", 4.09, 1.86, 5.23),
        ("14-agenda-ideias.png", 7.56, 2.1, 4.88),
    ]
    for file_name, x, y, h in phone_specs:
        add_phone(s, SHOTS / file_name, x, y, h)
    add_rect(s, 10.88, 2.18, 1.72, 4.15, "olive", radius=True)
    add_text(s, "BASE", 11.15, 2.55, 1.2, 0.28, 11, "lemon", True)
    add_text(s, "Peças\nOutfits\nHistórico\nFeed privado", 11.15, 3.02, 1.15, 1.55, 18, "canvas", True)
    add_text(s, "PRÓXIMO", 11.15, 4.97, 1.2, 0.28, 11, "lemon", True)
    add_text(s, "Aprender\ne conectar", 11.15, 5.39, 1.15, 0.75, 16, "sage", True)
    add_footer(s, 4)

    # 05 — Learning loop
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Motor de retenção")
    add_title(s, "Cada uso deixa o aplicativo mais inteligente", "O valor cresce quando a escolha real volta para o sistema como aprendizado.")
    center_x, center_y = 6.65, 4.35
    add_circle(s, center_x - 1.05, center_y - 1.05, 2.1, "olive")
    add_text(s, "STYLE\nMEMORY", center_x - 0.87, center_y - 0.48, 1.75, 0.95, 21, "canvas", True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
    nodes = [
        ("CAPTURAR", "Peças e inspirações", -90),
        ("ENTENDER", "Contexto e preferências", -18),
        ("SUGERIR", "Poucas opções úteis", 54),
        ("VESTIR", "Escolha e ajuste", 126),
        ("APRENDER", "Conforto e confiança", 198),
    ]
    for label, body, deg in nodes:
        angle = deg * pi / 180
        x = center_x + cos(angle) * 3.65 - 1.12
        y = center_y + sin(angle) * 1.7 - 0.52
        add_rect(s, x, y, 2.24, 1.05, "white", radius=True, line="line")
        add_text(s, label, x + 0.18, y + 0.16, 1.85, 0.23, 11, "olive", True, PP_ALIGN.CENTER)
        add_text(s, body, x + 0.12, y + 0.49, 2.0, 0.34, 13.2, "ink", False, PP_ALIGN.CENTER)
    add_text(s, "Não é tempo de tela. É confiança acumulada.", 3.38, 6.45, 6.55, 0.34, 18, "olive", True, PP_ALIGN.CENTER)
    add_footer(s, 5)

    # 06 — Remix
    s = prs.slides.add_slide(blank)
    slide_background(s, "ink")
    add_kicker(s, "A inovação central", dark=True)
    add_title(s, "Remix com meu closet", "Uma inspiração deixa de ser apenas salva e passa a ser executável.", dark=True)
    add_rect(s, 0.72, 2.2, 3.4, 3.95, "white", radius=True)
    add_text(s, "LOOK ORIGINAL", 0.98, 2.5, 2.8, 0.27, 11, "olive", True)
    add_rect(s, 1.02, 3.01, 1.14, 1.34, "sage", radius=True)
    add_rect(s, 2.28, 3.01, 1.14, 1.34, "blush", radius=True)
    add_rect(s, 1.02, 4.49, 2.4, 0.92, "lemon", radius=True)
    add_text(s, "Camiseta oversized", 0.98, 5.5, 2.88, 0.3, 15, "ink", True)
    add_text(s, "Jeans reto · tênis quente", 0.98, 5.78, 2.88, 0.25, 13, "muted")
    add_chevron(s, 4.38, 3.79, 0.48, "lemon")
    add_rect(s, 5.1, 2.2, 3.48, 3.95, "sage", radius=True)
    add_text(s, "LOOK DNA", 5.38, 2.5, 2.8, 0.27, 11, "olive", True)
    dna = [
        ("BASE", "branca + ampla"),
        ("BOTTOM", "escuro + reto"),
        ("SHOE", "casual + quente"),
        ("VIBE", "conforto cotidiano"),
    ]
    for i, (a, b) in enumerate(dna):
        y = 3.02 + i * 0.62
        add_text(s, a, 5.38, y, 0.8, 0.25, 10.5, "olive", True)
        add_text(s, b, 6.22, y - 0.02, 1.98, 0.29, 14.2, "ink", i == 3)
    add_rect(s, 5.42, 5.43, 2.82, 0.48, "olive", radius=True)
    add_text(s, "RECRIAR COM O QUE EU TENHO", 5.62, 5.56, 2.42, 0.2, 10.2, "canvas", True, PP_ALIGN.CENTER)
    add_chevron(s, 8.85, 3.79, 0.48, "lemon")
    add_rect(s, 9.57, 2.2, 3.02, 3.95, "canvas", radius=True)
    add_text(s, "MEU REMIX", 9.84, 2.5, 2.45, 0.27, 11, "olive", True)
    add_phone(s, SHOTS / "09-inicio-ideias.png", 10.17, 2.88, 2.95)
    add_text(s, "ver → adaptar → vestir → publicar", 2.48, 6.45, 8.4, 0.43, 22, "lemon", True, PP_ALIGN.CENTER)
    add_footer(s, 6, dark=True)

    # 07 — Five systems
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Experiência")
    add_title(s, "Cinco sistemas formam o produto", "Cada sistema resolve um momento; juntos, eles criam continuidade.")
    systems = [
        ("01", "DECIDIR", "Três opções para hoje", "olive"),
        ("02", "APRENDER", "Style Memory", "sage"),
        ("03", "RECRIAR", "Look DNA + Remix", "lemon"),
        ("04", "PLANEJAR", "Eventos e viagens", "blush"),
        ("05", "COMPRAR MELHOR", "Antes de comprar", "olive"),
    ]
    for i, (num, title, body, fill) in enumerate(systems):
        x = 0.72 + i * 2.48
        bg = fill
        text_color = "canvas" if fill == "olive" else "ink"
        add_rect(s, x, 2.34, 2.19, 3.55, bg, radius=True)
        add_text(s, num, x + 0.2, 2.6, 0.5, 0.29, 12, "lemon" if fill == "olive" else "olive", True)
        add_text(s, title, x + 0.2, 3.19, 1.8, 0.7, 17.5, text_color, True)
        add_text(s, body, x + 0.2, 4.22, 1.75, 0.78, 15, "sage" if fill == "olive" else "muted")
        add_text(s, "→", x + 0.2, 5.24, 0.42, 0.35, 20, "lemon" if fill == "olive" else "olive", True)
    add_text(s, "A unidade não é a feature isolada — é o ciclo completo.", 0.74, 6.35, 11.7, 0.45, 22, "olive", True)
    add_footer(s, 7)

    # 08 — Journey
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Rotina")
    add_title(s, "O app acompanha momentos reais", "A retenção nasce de ocasiões naturais, não de notificações artificiais.")
    line = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(1.15), Inches(3.7), Inches(12.05), Inches(3.7))
    line.line.color.rgb = rgb(COLORS["line"])
    line.line.width = Pt(4)
    moments = [
        ("07:30", "MANHÃ", "Três opções\npara hoje", "lemon"),
        ("12:40", "INSPIRAÇÃO", "Remix com\nmeu closet", "sage"),
        ("18:10", "COMPRA", "Vale a pena\nlevar?", "blush"),
        ("22:00", "MEMÓRIA", "Como o look\nfuncionou?", "lemon"),
        ("DOMINGO", "PLANEJAR", "Semana, evento\nou viagem", "sage"),
    ]
    for i, (time, label, body, fill) in enumerate(moments):
        x = 1.02 + i * 2.43
        add_circle(s, x, 3.48, 0.44, "olive")
        add_text(s, time, x - 0.32, 2.7, 1.08, 0.28, 12, "olive", True, PP_ALIGN.CENTER)
        add_text(s, label, x - 0.55, 4.13, 1.55, 0.26, 11, "muted", True, PP_ALIGN.CENTER)
        add_rect(s, x - 0.82, 4.55, 2.08, 1.1, fill, radius=True)
        add_text(s, body, x - 0.63, 4.77, 1.7, 0.65, 15.5, "ink", True, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)
    add_footer(s, 8)

    # 09 — Moat
    s = prs.slides.add_slide(blank)
    slide_background(s, "olive")
    add_kicker(s, "Vantagem competitiva", dark=True)
    add_title(s, "A vantagem cresce com cada decisão", "O diferencial não é uma função de IA isolada, mas a memória conectada do usuário.", dark=True)
    layers = [
        ("CONTEXTO", "clima · agenda · disponibilidade", 0.0),
        ("COMPORTAMENTO", "escolhas · rejeições · ajustes", 0.25),
        ("HISTÓRICO", "uso · conforto · confiança", 0.5),
        ("CLOSET", "peças · estados · combinações", 0.75),
    ]
    base_y = 5.65
    for i, (title, body, inset) in enumerate(layers):
        y = base_y - i * 0.82
        x = 0.84 + inset
        w = 6.1 - inset * 2
        fill = ["blush", "sage", "lemon", "canvas"][i]
        add_rect(s, x, y, w, 0.68, fill, radius=True)
        add_text(s, title, x + 0.22, y + 0.13, 1.75, 0.24, 11, "olive", True)
        add_text(s, body, x + 2.0, y + 0.11, w - 2.18, 0.3, 14, "ink", i == 2)
    add_rect(s, 7.55, 2.32, 4.67, 3.94, "canvas", radius=True)
    add_text(s, "STYLE GRAPH", 7.95, 2.75, 3.7, 0.35, 13, "olive", True)
    add_text(s, "Uma representação viva de como a pessoa realmente se veste.", 7.95, 3.3, 3.62, 0.96, 23, "ink", True)
    add_text(s, "Mais uso → melhor contexto → melhores escolhas → maior confiança.", 7.95, 4.65, 3.58, 0.94, 16, "muted")
    add_footer(s, 9, dark=True)

    # 10 — Social
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Rede")
    add_title(s, "Social, mas com propósito", "Começar por círculos privados cria valor antes de exigir uma comunidade pública.")
    add_phone(s, SHOTS / "08-feed-redesign.png", 0.86, 2.02, 4.98)
    add_rect(s, 4.02, 2.25, 3.8, 3.82, "sage", radius=True)
    add_text(s, "PEDIDO DE ESTILO", 4.34, 2.6, 3.15, 0.27, 11, "olive", True)
    add_text(s, "“Casamento à tarde. Quero ficar elegante sem parecer formal demais.”", 4.34, 3.11, 3.04, 1.22, 22, "ink", True)
    add_text(s, "Compartilhar apenas as peças permitidas", 4.34, 4.75, 2.92, 0.55, 14, "muted")
    add_rect(s, 4.34, 5.34, 2.86, 0.48, "olive", radius=True)
    add_text(s, "MONTAR UMA PROPOSTA", 4.58, 5.46, 2.37, 0.2, 10.5, "canvas", True, PP_ALIGN.CENTER)
    actions = [
        ("Círculos privados", "amigos, família e stylist"),
        ("Enquete A ou B", "decisão rápida e contextual"),
        ("Remix colaborativo", "usar peças reais da pessoa"),
    ]
    for i, (title, body) in enumerate(actions):
        add_bullet(s, title, body, 8.42, 2.38 + i * 1.25, 3.85, "olive", i + 1)
    add_text(s, "Rede pública somente depois de utilidade, segurança e conteúdo.", 8.42, 6.12, 3.75, 0.54, 16, "olive", True)
    add_footer(s, 10)

    # 11 — Business model
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Negócio")
    add_title(s, "Receitas alinhadas ao interesse do usuário", "O produto pode crescer sem transformar o closet em um catálogo de anúncios.")
    tiers = [
        ("GRATUITO", "Organizar e começar", ["closet", "outfits", "histórico", "sugestões essenciais"], "sage"),
        ("PREMIUM", "Aprender e decidir", ["Style Memory", "Remix inteligente", "Antes de comprar", "analytics avançado"], "lemon"),
        ("ECOSSISTEMA", "Criar e colaborar", ["stylists", "criadores", "lookbooks", "serviços verificados"], "olive"),
    ]
    for i, (label, value, items, fill) in enumerate(tiers):
        x = 0.78 + i * 4.12
        text_color = "canvas" if fill == "olive" else "ink"
        add_rect(s, x, 2.32, 3.65, 3.88, fill, radius=True)
        add_text(s, label, x + 0.27, 2.62, 3.05, 0.27, 11, "lemon" if fill == "olive" else "olive", True)
        add_text(s, value, x + 0.27, 3.1, 3.0, 0.62, 21, text_color, True)
        for j, item in enumerate(items):
            add_circle(s, x + 0.28, 4.08 + j * 0.4, 0.1, "lemon" if fill == "olive" else "olive")
            add_text(s, item, x + 0.52, 4.0 + j * 0.4, 2.65, 0.25, 14, "sage" if fill == "olive" else "muted")
    add_text(s, "Princípio: recomendar uma compra apenas quando ela cria valor real.", 0.78, 6.52, 11.7, 0.38, 19, "olive", True, PP_ALIGN.CENTER)
    add_footer(s, 11)

    # 12 — Competitive white space
    s = prs.slides.add_slide(blank)
    slide_background(s, "ink")
    add_kicker(s, "Oportunidade", dark=True)
    add_title(s, "O espaço competitivo está na conexão", "A categoria já possui boas funções. A oportunidade é fazê-las trabalhar como um sistema.", dark=True)
    categories = [
        ("PADRÃO DA CATEGORIA", ["closet digital", "background removal", "calendário", "clima", "estatísticas"]),
        ("ESPAÇO DISPUTADO", ["IA de styling", "feed social", "packing", "virtual try-on", "marketplace"]),
        ("TESE VIRTUAL CLOSET", ["Look DNA", "Remix com meu closet", "Style Memory", "Antes de comprar", "círculos privados"]),
    ]
    fills = ["sage", "blush", "lemon"]
    for i, ((title, items), fill) in enumerate(zip(categories, fills)):
        x = 0.76 + i * 4.14
        add_rect(s, x, 2.33, 3.68, 3.95, fill, radius=True)
        add_text(s, title, x + 0.28, 2.66, 3.05, 0.5, 11, "olive", True)
        for j, item in enumerate(items):
            add_text(s, "—", x + 0.28, 3.48 + j * 0.48, 0.25, 0.25, 15, "olive", True)
            add_text(s, item, x + 0.62, 3.43 + j * 0.48, 2.62, 0.31, 15.5, "ink", i == 2)
    add_text(s, "A inovação não está em ter mais features. Está em transformar inspiração em uso real.", 1.15, 6.55, 11.0, 0.42, 20, "canvas", True, PP_ALIGN.CENTER)
    add_footer(s, 12, dark=True)

    # 13 — Roadmap
    s = prs.slides.add_slide(blank)
    slide_background(s)
    add_kicker(s, "Roadmap")
    add_title(s, "A evolução acontece em três horizontes", "Primeiro utilidade, depois inteligência, por fim rede e escala.")
    horizons = [
        ("01", "FUNDAÇÃO ÚTIL", "Integrar a prévia\nCadastro rápido\nFeedback pós-uso\nTrês opções para hoje", "olive"),
        ("02", "DIFERENCIAÇÃO", "Style Graph\nLook DNA + Remix\nAntes de comprar\nStyle Wrapped", "lemon"),
        ("03", "REDE E ESCALA", "Círculos privados\nCriadores e stylists\nReceitas públicas\nComércio responsável", "sage"),
    ]
    for i, (num, title, body, fill) in enumerate(horizons):
        x = 0.76 + i * 4.1
        top = 2.34 + i * 0.28
        height = 3.55 - i * 0.2
        add_rect(s, x, top, 3.58, height, fill, radius=True)
        add_text(s, num, x + 0.26, top + 0.26, 0.65, 0.4, 20, "lemon" if fill == "olive" else "olive", True)
        add_text(s, title, x + 0.26, top + 0.87, 2.94, 0.48, 18, "canvas" if fill == "olive" else "ink", True)
        add_text(s, body, x + 0.26, top + 1.55, 2.95, 1.45, 15, "sage" if fill == "olive" else "muted")
        if i < 2:
            add_chevron(s, x + 3.68, top + 1.43, 0.32, "olive")
    add_text(s, "Provador virtual e rede pública entram como apostas posteriores, não como fundação.", 0.76, 6.48, 11.7, 0.42, 18, "olive", True, PP_ALIGN.CENTER)
    add_footer(s, 13)

    # 14 — Closing
    s = prs.slides.add_slide(blank)
    slide_background(s, "olive")
    add_logo(s, 0.72, 0.55, dark=True, scale=1.05)
    add_text(s, "Seu closet já tem\npossibilidades.", 0.86, 1.6, 6.15, 1.35, 39, "canvas", True)
    add_text(s, "O que faltava era uma inteligência capaz de enxergá-las.", 0.9, 3.34, 5.45, 1.2, 23, "lemon", True)
    add_text(s, "decidir melhor  ·  usar mais  ·  comprar com consciência  ·  construir estilo", 0.9, 5.44, 6.05, 0.76, 15, "sage")
    # Signature layered object.
    for i, (x, y, w, h, fill) in enumerate([
        (8.38, 1.02, 3.55, 4.92, "canvas"),
        (7.88, 1.48, 3.55, 4.92, "sage"),
        (7.38, 1.94, 3.55, 4.92, "lemon"),
    ]):
        add_rect(s, x, y, w, h, fill, radius=True)
    add_text(s, "INSPIRAÇÃO", 7.78, 2.4, 2.72, 0.3, 11, "olive", True)
    add_text(s, "vira", 7.78, 3.01, 2.5, 0.42, 19, "muted")
    add_text(s, "POSSIBILIDADE", 7.78, 3.58, 2.75, 0.4, 21, "ink", True)
    add_text(s, "que vira", 7.78, 4.28, 2.5, 0.42, 19, "muted")
    add_text(s, "VIDA REAL.", 7.78, 4.88, 2.75, 0.48, 25, "olive", True)
    add_text(s, "virtual closet.", 7.78, 6.25, 2.72, 0.3, 14, "ink", True)
    add_footer(s, 14, dark=True)

    # Metadata and save.
    prs.core_properties.title = "Virtual Closet — Apresentação Introdutória"
    prs.core_properties.subject = "Visão de produto, inovação e modelo de negócio"
    prs.core_properties.author = "Virtual Closet"
    prs.core_properties.keywords = "virtual closet, moda, startup, pitch, produto"
    OUT.parent.mkdir(parents=True, exist_ok=True)
    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build()

