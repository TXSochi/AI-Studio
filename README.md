# Latent — AI-native creative studio (v2: black + neon)

Static site: HTML + CSS + vanilla JS. Tidak ada build step, tidak perlu npm install.

## Struktur

```
latent-studio-neon/
├─ index.html            ← konten & semua section
├─ assets/
│  ├─ css/style.css      ← tokens (hitam + #39FF14), layout, responsive
│  ├─ js/scene.js        ← three.js: liquid neon background, objek chrome morphing, halo, dust, neon fill
│  ├─ js/main.js         ← GSAP ScrollTrigger, Lenis, loader, state objek per section, cursor
│  └─ favicon.svg
└─ README.md
```

CDN (pinned): three.js 0.149.0, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13, Google Fonts (Unbounded, Geist, Geist Mono).

## Preview lokal

```
npx serve .
# atau
python3 -m http.server 8000
```
Jangan buka dengan double-click (file://), WebGL & font butuh http.

## Deploy ke Vercel

1. Upload isi folder ke repo GitHub (index.html di root).
2. Vercel → Add New → Project → import repo.
3. Framework Preset **Other**, build command & output dir dikosongkan.
4. Deploy. Nama project huruf kecil, misal `latent-neon`.

Atau: `npm i -g vercel` lalu `vercel --prod` dari dalam folder ini.

## Yang paling sering diubah

- **Warna**: `--neon` di `style.css` dan `NEON` / `MINT` / `DEEP` di awal `create()` di `scene.js`.
- **Objek per section**: `stateSet()` di `main.js`.
  `shape`: 0 sphere, 1 trefoil knot, 2 torus, 3 twisted ribbon.
  `amp`: seberapa "cair" permukaannya. `visible`: 0 = objek mengecil hilang.
  `x` / `y`: posisi dalam fraksi layar. `tilt`: kemiringan.
- **Aliran neon background**: `BG_FRAG` di `scene.js` (`rib` = lebar pita, `sv` = kerapatan garis).
- **Neon fill** (loader & contact): naik-turun mengikuti posisi section `#contact`, amplitudo gelombang ikut kecepatan scroll.
- **Kualitas vs performa**: segmen objek (`seg`) dan background half-res (`* 0.5` di `resize()`).

`prefers-reduced-motion` dihormati (loader dilewati, smooth scroll mati) dan ada fallback statis kalau WebGL tidak tersedia.
