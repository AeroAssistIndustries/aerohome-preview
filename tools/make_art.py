"""Generates the flag and seal SVGs used on the AeroHome site."""
import math, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img')

def us_flag():
    W, H = 190, 100
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Flag of the United States">']
    sh = H / 13
    for i in range(13):
        s.append(f'<rect x="0" y="{i*sh:.3f}" width="{W}" height="{sh+0.05:.3f}" fill="{"#B22234" if i % 2 == 0 else "#FFFFFF"}"/>')
    cw, ch = 76, sh * 7
    s.append(f'<rect width="{cw}" height="{ch:.3f}" fill="#3C3B6E"/>')
    for r in range(9):
        cols = 6 if r % 2 == 0 else 5
        for c in range(cols):
            x = cw / 12 * (2 * c + 1 + (0 if r % 2 == 0 else 1))
            y = ch / 10 * (r + 1)
            s.append(star(x, y, 2.4, '#FFFFFF'))
    s.append('</svg>')
    return ''.join(s)

def star(cx, cy, r, fill):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        rr = r if k % 2 == 0 else r * 0.382
        pts.append(f'{cx + rr*math.cos(a):.2f},{cy + rr*math.sin(a):.2f}')
    return f'<polygon points="{" ".join(pts)}" fill="{fill}"/>'

def az_flag():
    W, H = 150, 100
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Flag of Arizona">',
         f'<rect width="{W}" height="{H}" fill="#002868"/>',
         f'<rect width="{W}" height="{H/2}" fill="#BF0A30"/>']
    cx, cy = W / 2, H / 2
    # 13 rays across the top half: 6 yellow among red
    n = 13
    for i in range(n):
        if i % 2 == 1:
            a0 = math.pi + math.pi * i / n
            a1 = math.pi + math.pi * (i + 1) / n
            R = 200
            p = f'{cx},{cy} {cx + R*math.cos(a0):.2f},{cy + R*math.sin(a0):.2f} {cx + R*math.cos(a1):.2f},{cy + R*math.sin(a1):.2f}'
            s.append(f'<polygon points="{p}" fill="#FED700"/>')
    s.append(f'<rect y="{H/2}" width="{W}" height="{H/2}" fill="#002868"/>')
    s.append(star(cx, cy, 21, '#CE5C17'))
    s.append('</svg>')
    return ''.join(s)

def seal(top, bottom, center_svg, aria):
    r = 50
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="{aria}">',
         '<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0D9A2"/><stop offset=".5" stop-color="#C8A15A"/><stop offset="1" stop-color="#8E6A2E"/></linearGradient>',
         '<path id="t" d="M18,60 a42,42 0 1,1 84,0"/><path id="u" d="M14,60 a46,46 0 0,0 92,0"/></defs>',
         '<circle cx="60" cy="60" r="57" fill="none" stroke="url(#b)" stroke-width="2.5"/>',
         '<circle cx="60" cy="60" r="51" fill="none" stroke="url(#b)" stroke-width=".8"/>',
         '<circle cx="60" cy="60" r="32" fill="none" stroke="url(#b)" stroke-width="1.2"/>',
         f'<text font-family="Archivo, Arial, sans-serif" font-size="9.2" font-weight="700" letter-spacing="1.6" fill="url(#b)"><textPath href="#t" startOffset="50%" text-anchor="middle">{top}</textPath></text>',
         f'<text font-family="Archivo, Arial, sans-serif" font-size="8.4" font-weight="700" letter-spacing="1.6" fill="url(#b)"><textPath href="#u" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">{bottom}</textPath></text>',
         star(17, 60, 2.6, '#C8A15A'), star(103, 60, 2.6, '#C8A15A'),
         center_svg, '</svg>']
    return ''.join(s)

files = {
    'flag-us.svg': us_flag(),
    'flag-az.svg': az_flag(),
    'seal-american.svg': seal('AMERICAN OWNED', 'AMERICAN COMPANY',
        '<text x="60" y="66" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="1" fill="url(#b)">USA</text>' + ''.join(star(48 + i*12, 47, 2.4, '#C8A15A') for i in range(3)),
        'American owned'),
    'seal-ndaa.svg': seal('NDAA §848', 'COMPLIANT',
        '<path d="M60 38 L76 44 V58 C76 69 69 77 60 81 C51 77 44 69 44 58 V44 Z" fill="none" stroke="url(#b)" stroke-width="2"/><text x="60" y="60" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="8.5" font-weight="800" fill="url(#b)">NDAA</text><text x="60" y="70" text-anchor="middle" font-family="Archivo, Arial, sans-serif" font-size="7" font-weight="700" fill="url(#b)">§848</text>',
        'NDAA Section 848 compliant'),
    'seal-arizona.svg': seal('HEADQUARTERED IN', 'ARIZONA · USA',
        star(60, 60, 15, '#C8A15A'),
        'Headquartered in Arizona'),
}
for name, svg in files.items():
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(svg)
    print(name, len(svg))
