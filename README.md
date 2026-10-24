# AeroHome website

Live: **https://aerohome.us/** (Cloudflare Pages, deployed from `main`; GitHub holds the code).

Launch build command: `SITE_URL=https://aerohome.us/ SITE_EMAIL=info@aerohome.us python3 tools/build.py --launch`

| Path | What it is |
|---|---|
| `index.html`, `privacy.html`, `terms.html`, `404.html` | Built pages, served as-is |
| `assets/` | Styles, fonts (Oxanium, IBM Plex Sans, IBM Plex Mono), images, scripts, and the 3D scene bundle |
| `src/` | Editable sources: page markup, styles, page script, and the 3D hero and product models |
| `tools/build.py` | Rebuilds the pages and the 3D bundle from `src/` |
| `tools/make_art.py` | Generates the flag and seal artwork |

## Rebuild

```
npm install                       # once, for the 3D bundle and minifier
python3 tools/build.py            # preview build (search engines told not to index)
python3 tools/build.py --launch   # launch build (indexable)
```

Set `SITE_URL` to the final address (for example `https://aerohome.us/`) when building for launch, so share links and canonical tags point to the right place.
