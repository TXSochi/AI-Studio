# Latent — AI-native creative studio (landing page)

Static site: HTML + CSS + vanilla JS. No build step, no npm install.

## Struktur

```
latent-studio/
├─ index.html            ← semua konten & section
├─ assets/
│  ├─ css/style.css      ← design tokens (light/dark), layout, responsive
│  ├─ js/scene.js        ← three.js particle system (shader: noise → & → field → sphere → halo)
│  ├─ js/main.js         ← GSAP ScrollTrigger, Lenis smooth scroll, intro, state per section
│  └─ favicon.svg
└─ README.md
```

Library di-load dari CDN (pinned version):
three.js 0.149.0 · GSAP 3.12.5 + ScrollTrigger · Lenis 1.1.13 · Google Fonts (Bodoni Moda, Schibsted Grotesk)

## Preview lokal

Buka lewat local server (jangan double-click file, font & canvas butuh http):

```
npx serve .
# atau
python3 -m http.server 8000
```

## Deploy ke Vercel

**Opsi A — GitHub (disarankan)**
1. Buat repo baru, upload isi folder ini (index.html ada di root repo).
2. Vercel → Add New → Project → import repo.
3. Framework Preset: **Other**. Build command & output directory: kosongkan.
4. Deploy. Nama project harus huruf kecil, contoh `latent-studio`.

**Opsi B — Vercel CLI**
```
npm i -g vercel
vercel --prod
```

Netlify juga bisa: drag & drop folder ini ke app.netlify.com/drop.

## Yang paling sering diubah

- **Warna**: `:root` di `style.css` (`--paper`, `--ink`, `--klein`, dll). Versi dark ada di blok `prefers-color-scheme: dark`.
- **Posisi/scale partikel per section**: fungsi `stateSet()` di `main.js`.
  `shape` 0 = ampersand, 1 = field, 2 = sphere, 3 = halo. `noise` = seberapa "belum jadi" bentuknya.
- **Glyph di hero**: `glyphPoints()` di `scene.js` sample karakter `&`. Ganti ke huruf/logo lain (mis. inisial brand) cukup ganti string-nya.
- **Jumlah partikel**: `count` di `initScene()` (desktop 17000, mobile 9000).
- **Copy & project**: langsung di `index.html`. Artwork project = inline SVG, bisa diganti `<img>` biasa.

Accessibility: `prefers-reduced-motion` dihormati (intro & smooth scroll dimatikan), fallback ampersand statis kalau WebGL tidak tersedia.
