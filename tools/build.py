"""Builds the AeroHome site into the repo root.

    python3 tools/build.py            # preview build (noindex)
    python3 tools/build.py --launch   # launch build (indexable)
"""
import os, re, sys, time, shutil, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'src')
LAUNCH = '--launch' in sys.argv
SITE = os.environ.get('SITE_URL', 'https://aeroassistindustries.github.io/aerohome-preview/')
V = time.strftime('%Y%m%d%H%M')
EMAIL = os.environ.get('SITE_EMAIL', 'info@aeroassist.us')
WAITLIST = os.environ.get('WAITLIST_URL', 'https://portal.aeroassist.us/api/aerohome/waitlist')
OLD = os.environ.get('OLD_SITE', '/home/claude/aerohome-site')

def read(p): return open(p, encoding='utf-8').read()
def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(s)

def seal(name, n):
    svg = read(os.path.join(ROOT, 'assets', 'img', f'{name}.svg'))
    p = f'{name.split("-")[1][:3]}{n}'
    svg = svg.replace('id="b"', f'id="{p}b"').replace('url(#b)', f'url(#{p}b)')
    svg = svg.replace('id="t"', f'id="{p}t"').replace('href="#t"', f'href="#{p}t"')
    svg = svg.replace('id="u"', f'id="{p}u"').replace('href="#u"', f'href="#{p}u"')
    svg = svg.replace(' role="img"', ' aria-hidden="true"')
    return re.sub(r' aria-label="[^"]*"', '', svg)

YES = '<svg aria-hidden="true"><use href="#i-check"/></svg><span class="sr-only">Included</span>'
NO = '<span class="no" aria-hidden="true">—</span><span class="sr-only">Not included</span>'

CHIP = '<span class="chip" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>'
TRI = '<span class="tri" aria-hidden="true"></span>'

def add_chips(html):
    def a(m):
        cls, inner = m.group(2), m.group(4)
        if 'btn-sm' in cls or 'chip' in inner or 'tri' in inner: return m.group(0)
        if 'btn-brass' in cls or 'btn-ink' in cls: inner = inner + CHIP
        elif 'btn-ghost' in cls or 'btn-line' in cls: inner = inner + TRI
        return m.group(1) + inner + m.group(5)
    return re.sub(r'(<(?:a|button) class="(btn [^"]*)"([^>]*)>)(.*?)(</(?:a|button)>)', a, html, flags=re.S)

def curly(html):
    # typographic apostrophes in visible text only (not in tags, scripts or styles)
    parts = re.split(r'(<script\b.*?</script>|<style\b.*?</style>|<[^>]+>)', html, flags=re.S)
    for i in range(0, len(parts), 2):
        parts[i] = re.sub(r"(?<=[A-Za-z0-9])'(?=[A-Za-z])", '\u2019', parts[i])
    return ''.join(parts)

def faq_ld(html):
    import json, html as H
    qas = re.findall(r'<details class="qa"><summary>(.*?)<i>.*?</summary><p>(.*?)</p></details>', html, flags=re.S)
    clean = lambda t: H.unescape(re.sub(r'<[^>]+>', '', t)).strip()
    data = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": clean(q), "acceptedAnswer": {"@type": "Answer", "text": clean(a)}} for q, a in qas]}
    tag = '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + '</script>\n'
    return html.replace('</head>', tag + '</head>', 1) if qas else html

def render(html):
    counts = {}
    def sub_svg(m):
        name = m.group(1)
        counts[name] = counts.get(name, 0) + 1
        return seal(name, counts[name])
    html = re.sub(r'<!--svg:([a-z-]+)-->', sub_svg, html)
    html = html.replace('{{Y}}', YES).replace('{{N}}', NO)
    html = html.replace('{{SITE}}', SITE).replace('{{V}}', V).replace('{{WAITLIST}}', WAITLIST)
    robots = '' if LAUNCH else '<meta name="robots" content="noindex, nofollow">'
    html = html.replace('<!--robots-->', robots)
    return faq_ld(curly(add_chips(html)))

def chrome(index_html):
    """Header and footer for the inner pages, with in-page links pointed at the home page."""
    a = index_html.index('<a class="skip"'); b = index_html.index('<main id="main">')
    top = index_html[a:b]
    f0 = index_html.index('<footer class="foot">'); f1 = index_html.index('</footer>') + len('</footer>')
    foot = index_html[f0:f1]
    fix = lambda s: re.sub(r'href="#(?!i-|main)([a-z-]*)"', lambda m: f'href="index.html#{m.group(1)}"' if m.group(1) else 'href="index.html"', s)
    head_end = index_html.index('<body>') + len('<body>')
    sprite_end = index_html.index('</svg>', head_end) + len('</svg>')
    sprite = index_html[head_end:sprite_end]
    return fix(top), fix(foot), sprite

def legal_page(index_html, title, desc, src_file, out_name):
    t = read(os.path.join(OLD, src_file))
    art = re.search(r'<article[^>]*>(.*?)</article>', t, re.S).group(1)
    art = re.sub(r'<div class="legal-note">.*?</div>', '', art, flags=re.S)
    art = art.replace('<h3>', '<h2>').replace('</h3>', '</h2>')
    art = art.replace('The interactive illustration and the &ldquo;Build your setup&rdquo; calculator run entirely in your browser',
                      'The interactive illustrations, the &ldquo;Find your setup&rdquo; questions, the ZIP check and the &ldquo;Build your setup&rdquo; calculator run entirely in your browser')
    updated = re.search(r'Last updated[^<]*?(\d{1,2} \w{3} \d{4})', t)
    updated = updated.group(1) if updated else '1 Oct 2026'
    top, foot, sprite = chrome(index_html)
    head = index_html[:index_html.index('<body>')]
    head = re.sub(r'<title>.*?</title>', f'<title>{title} | AeroHome</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', head)
    head = head.replace(f'<link rel="canonical" href="{SITE}">', f'<link rel="canonical" href="{SITE}{out_name}">')
    head = re.sub(r'<link rel="preload"[^>]*>\n?', '', head)
    head = head.replace(' data-scene="assets/js/scene.js?v=' + V + '"', '')
    body = f'''<body>{sprite}
{top}<main id="main" class="on-paper">
<section class="doc">
  <div class="wrap">
    <p class="kicker"><a href="index.html" style="color:inherit;text-decoration:none">AeroHome</a></p>
    <h1 class="d2">{title}</h1>
    <p class="meta">Last updated {updated}</p>
    {art.strip()}
  </div>
</section>
</main>
{foot}
<button class="totop" type="button" aria-label="Back to top"><svg aria-hidden="true"><use href="#i-up"/></svg></button>
<script src="assets/js/site-lite.js?v={V}" defer></script>
</body>
</html>
'''
    return head + body

def not_found(index_html):
    top, foot, sprite = chrome(index_html)
    head = index_html[:index_html.index('<body>')]
    head = re.sub(r'<title>.*?</title>', '<title>Page not found | AeroHome</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="This page could not be found. Head back to AeroHome or join the 2026 pilot waitlist.">', head)
    head = head.replace(' data-scene="assets/js/scene.js?v=' + V + '"', '')
    head = re.sub(r'<link rel="canonical"[^>]*>\n?', '', head)
    head = re.sub(r'<link rel="preload"[^>]*>\n?', '', head)
    # absolute asset paths so the page works from any missing URL depth
    base = '<base href="' + SITE + '">'
    head = head.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n' + base)
    body = f'''<body>{sprite}
{top}<main id="main" class="on-dark">
<section class="nf">
  <div class="wrap">
    <p class="kicker" style="justify-content:center">Error 404</p>
    <h1 class="d1">This page isn’t on the property.</h1>
    <p class="lede" style="color:#c3cad8">Sentinel swept the whole perimeter and came back empty. The link may be old or mistyped.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap"><a class="btn btn-brass" href="index.html">Back to AeroHome</a><a class="btn btn-ghost" href="index.html#waitlist">Join the waitlist</a></div>
  </div>
</section>
</main>
{foot}
<button class="totop" type="button" aria-label="Back to top"><svg aria-hidden="true"><use href="#i-up"/></svg></button>
<script src="assets/js/site-lite.js?v={V}" defer></script>
</body>
</html>
'''
    return add_chips(head + body)

SITE_LITE = r"""(function(){var h=document.getElementById('head'),t=document.querySelector('.totop'),m=document.querySelector('.menu-btn');if(!h||!m)return;
function s(){var y=window.scrollY||0;h.classList.toggle('scrolled',y>8);if(t)t.classList.toggle('show',y>900);}
window.addEventListener('scroll',s,{passive:true});s();if(t)t.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
function set(o){if(o)document.documentElement.style.setProperty('--drawer-top',Math.max(0,h.getBoundingClientRect().bottom)+'px');document.body.classList.toggle('menu-open',o);m.setAttribute('aria-expanded',String(o));document.documentElement.style.overflow=o?'hidden':'';}
m.addEventListener('click',function(){set(!document.body.classList.contains('menu-open'));});
document.addEventListener('keydown',function(e){if(e.key==='Escape')set(false);});})();
"""

def main():
    # 3D bundle
    if os.environ.get('BUILD3D'):
        subprocess.run(['bash', os.environ['BUILD3D']], check=True)
    else:  # needs `npm install` once
        env = dict(os.environ, NODE_PATH=os.path.join(ROOT, 'node_modules'))
        subprocess.run([os.path.join(ROOT, 'node_modules', '.bin', 'esbuild'), os.path.join(SRC, 'main.js'), '--bundle', '--minify',
                        '--format=iife', '--target=es2019', '--outfile=' + os.path.join(ROOT, 'assets', 'js', 'scene.js'), '--log-level=warning'], check=True, env=env)
    esb = os.environ.get('ESBUILD') or os.path.join(ROOT, 'node_modules', '.bin', 'esbuild')
    subprocess.run([esb, os.path.join(SRC, 'site.css'), '--minify', '--target=safari15,ios15,chrome100,firefox100,edge100',
                    '--outfile=' + os.path.join(ROOT, 'assets', 'css', 'site.css'), '--log-level=warning'], check=True)
    subprocess.run([esb, os.path.join(SRC, 'site.js'), '--minify', '--target=es2017', '--outfile=' + os.path.join(ROOT, 'assets', 'js', 'site.js'), '--log-level=warning'], check=True)
    write(os.path.join(ROOT, 'assets', 'js', 'site-lite.js'), SITE_LITE)
    idx = render(read(os.path.join(SRC, 'index.html')))
    write(os.path.join(ROOT, 'index.html'), idx)
    write(os.path.join(ROOT, 'privacy.html'), legal_page(idx, 'Privacy Policy', 'What AeroHome collects through this website and the waitlist, how it is used, and the choices you have.', 'privacy.html', 'privacy.html'))
    write(os.path.join(ROOT, 'terms.html'), legal_page(idx, 'Terms of Use', 'The rules for using the AeroHome website and joining the pilot-program waitlist.', 'terms.html', 'terms.html'))
    write(os.path.join(ROOT, '404.html'), not_found(idx))
    open(os.path.join(ROOT, '.nojekyll'), 'w').close()
    if LAUNCH:
        write(os.path.join(ROOT, 'robots.txt'), f"User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n")
        today = time.strftime('%Y-%m-%d')
        urls = ''.join(f"  <url><loc>{SITE}{p}</loc><lastmod>{today}</lastmod></url>\n" for p in ['', 'privacy.html', 'terms.html'])
        write(os.path.join(ROOT, 'sitemap.xml'), f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
        host = re.sub(r'^https?://', '', SITE).strip('/')
        if not host.endswith('github.io') and '/' not in host:
            write(os.path.join(ROOT, 'CNAME'), host + '\n')
    else:
        write(os.path.join(ROOT, 'robots.txt'), "User-agent: *\nDisallow: /\n")
        for f in ['sitemap.xml', 'CNAME']:
            if os.path.exists(os.path.join(ROOT, f)): os.remove(os.path.join(ROOT, f))
    write(os.path.join(ROOT, 'site.webmanifest'), '{"name":"AeroHome","short_name":"AeroHome","start_url":"./","display":"browser","background_color":"#0b0f19","theme_color":"#0b0f19","icons":[{"src":"assets/img/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"assets/img/icon-512.png","sizes":"512x512","type":"image/png"}]}\n')
    # contact address, switched in one place
    if EMAIL != 'info@aeroassist.us':
        for f in ['index.html', 'privacy.html', 'terms.html', '404.html', 'assets/js/site.js']:
            fp = os.path.join(ROOT, f); s = read(fp)
            write(fp, s.replace('info@aeroassist.us', EMAIL))
    print('built', 'LAUNCH' if LAUNCH else 'PREVIEW', SITE, EMAIL, V)

if __name__ == '__main__':
    main()
