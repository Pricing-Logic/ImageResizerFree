# Competitor Analysis — iresized.com Feature Gap Report

**Date:** 2026-03-10
**Analyst:** competitor-researcher agent
**Scope:** Top 12 free online image tools vs iresized.com

---

## iresized.com Current Tools

| Tool | Description |
|---|---|
| Resize | Pixel/percentage resizing |
| Compress | Lossy/lossless compression |
| Crop | Manual crop with aspect ratio presets |
| HEIC Convert | HEIC → JPG/PNG client-side |
| Bulk Rename | Batch file renaming |
| Strip EXIF | Remove metadata from images |
| Remove BG | MediaPipe-powered background removal |
| Advanced BG | RMBG-1.4 ONNX model background removal |
| Watermark Removal | Edge-propagation inpainting |

---

## Competitor Feature Audit

### 1. Squoosh (squoosh.app) — Google
**Model:** 100% free, open source, client-side (WASM)

| Feature | Have it? | Notes |
|---|---|---|
| Format conversion (WebP, AVIF, MozJPEG, JPEG XL) | Partial | iresized compresses but doesn't convert to AVIF/WebP explicitly |
| Side-by-side before/after comparison slider | No | High-value UX feature |
| Fine-grained codec controls (quality, effort, chroma) | No | Power-user feature |
| Lossless vs lossy toggle | Partial | Basic compress only |
| Offline PWA support | No | Squoosh is installable PWA |

**Key gap:** Format conversion to modern codecs (AVIF, WebP, JPEG XL) with a before/after comparison slider.

---

### 2. TinyPNG (tinypng.com)
**Model:** Free (20 images/upload, 5MB limit, 100 credits/month); Paid removes limits

| Feature | Have it? | Notes |
|---|---|---|
| Smart lossy PNG/WebP compression | Partial | |
| Animated PNG (APNG) support | No | Feasible via Canvas/WASM |
| WordPress plugin integration | No | N/A for static tool |
| Batch upload (20 at once) | No | Bulk operations not yet in iresized |

**Key gap:** Animated image (APNG/WebP) support; batch processing UI.

---

### 3. Photopea (photopea.com)
**Model:** Free (ad-supported), Premium removes ads

| Feature | Have it? | Notes |
|---|---|---|
| Full layer-based editor (Photoshop-like) | No | Complex, out of scope |
| PSD/AI/SVG/RAW file support | No | RAW decode = complex WASM |
| Adjustment layers (curves, levels, HSL) | No | |
| Text overlay with full font control | No | Canvas-feasible |
| Healing/clone stamp | No | Canvas API feasible |
| Vector shape tools | No | Out of scope |

**Key gap:** Text overlay/watermarking tool (add text to image) is highly demanded and feasible.

---

### 4. iLoveIMG (iloveimg.com)
**Model:** Free (server-side), limits on batch; Premium removes limits

| Feature | Have it? | Notes |
|---|---|---|
| Animated GIF creation from images | No | ezgif-style — Canvas feasible |
| Image watermarking (text + logo) | No | Canvas feasible |
| AI upscaling (4x) | No | UpscalerJS / WASM feasible |
| Photo effects/filters | No | Canvas filters feasible |
| Stickers/overlays | No | Canvas feasible |
| Google Drive / Dropbox integration | No | Not client-side friendly |

**Key gap:** Add watermark (text/logo), GIF maker from images, AI upscaling — all paywalled or server-side elsewhere.

---

### 5. ImageResizer.com
**Model:** Free (server-side, 6-hour auto-delete)

| Feature | Have it? | Notes |
|---|---|---|
| Resize by target file size (KB/MB) | No | Canvas binary-search feasible |
| Bulk resize multiple images | No | Web Workers feasible |
| Output format selection (PNG, WebP) | Partial | |

**Key gap:** Resize-to-target-filesize (e.g., "make this under 500KB") — currently paywalled or rate-limited everywhere.

---

### 6. Pixlr (pixlr.com)
**Model:** Free (limited AI credits); Paid unlocks AI tools fully

| Feature | Have it? | Notes |
|---|---|---|
| AI generative fill | No | Requires server/model |
| AI object removal | No | Partial via inpainting — feasible |
| Liquify/warp tool | No | Canvas feasible |
| Healing brush | No | Canvas feasible |
| Color correction (curves, HSL, levels) | No | Canvas feasible |
| Noise reduction | No | WASM feasible |
| Sticker/element library | No | Asset-heavy, less relevant |

**Key gap:** Color correction tools (hue/saturation/brightness/contrast sliders) — basic but missing from iresized.

---

### 7. Fotor (fotor.com)
**Model:** Free with core features; Pro unlocks AI tools

| Feature | Have it? | Notes |
|---|---|---|
| AI photo enhancer (auto levels) | No | Canvas histogram-based feasible |
| AI object remover | No | Inpainting model feasible |
| Photo collage maker | No | Canvas feasible |
| Portrait beautify (skin smoothing) | No | Requires ML model |
| Batch edit 50 photos | No | Web Workers feasible |
| Filters/effects (50+) | No | Canvas CSS-filter feasible |

**Key gap:** One-click auto-enhance and collage maker — both Fotor paywalls or rate-limits.

---

### 8. BeFunky (befunky.com)
**Model:** Free (basic); Plus ($6.99/mo) for batch, AI, advanced effects

| Feature | Have it? | Notes |
|---|---|---|
| Artsy filters (painting, sketch, cartoon) | No | Canvas/shader feasible |
| Photo collage builder | No | Canvas feasible |
| Batch photo editing | No | Paywalled — Web Workers feasible |
| AI background removal | Partial (iresized has it free) | iresized wins here |
| High-resolution export | No | iresized limited by memory |
| Text with font library | No | Google Fonts + Canvas feasible |

**Key gap:** Batch editing (behind paywall at BeFunky) — iresized could offer free unlimited batch.

---

### 9. img2go.com
**Model:** Free (server-side, 24-hour delete)

| Feature | Have it? | Notes |
|---|---|---|
| AI colorize (B&W to color) | No | Colorization models exist in ONNX |
| AI blur faces | No | MediaPipe face detection feasible |
| OCR (extract text from image) | No | Tesseract.js WASM — feasible |
| PDF to image (per page) | No | PDF.js — fully feasible client-side |
| Image to PDF | No | jsPDF — feasible |
| 250+ format support | No | Limited scope for client-side |
| GIF/video frame extraction | No | Feasible |

**Key gap:** Face blur (privacy tool), OCR, PDF↔Image — all highly demanded, most paywalled or server-only.

---

### 10. Convertio (convertio.co)
**Model:** Free (100MB, 10 files/24hrs); Paid removes limits

| Feature | Have it? | Notes |
|---|---|---|
| OCR in 70+ languages | No | Tesseract.js covers many |
| RAW camera format conversion | No | WASM decoders exist but large |
| 500+ format conversions | No | Out of scope |
| ZIP output for batch downloads | No | JSZip — fully feasible client-side |

**Key gap:** ZIP download for bulk-processed files — trivial to add, competitors charge for it.

---

### 11. FreeConvert (freeconvert.com)
**Model:** Free (server-side); limits on file size and concurrent conversions

| Feature | Have it? | Notes |
|---|---|---|
| Color picker from image | No | EyeDropper API + Canvas — trivial |
| Image enlarger | No | CSS/Canvas upscale or AI |
| Collage maker | No | Canvas feasible |

**Key gap:** Color picker/palette extractor from image — completely trivial client-side, most tools server-side.

---

### 12. Ezgif (ezgif.com)
**Model:** 100% free, server-side, no limits stated

| Feature | Have it? | Notes |
|---|---|---|
| Animated GIF maker (from images) | No | Canvas + gif.js library feasible |
| Video to GIF | No | Requires video decode — WebCodecs API |
| GIF frame editor (add/remove/reorder) | No | Canvas feasible |
| GIF optimization (reduce colors) | No | WASM feasible |
| APNG / WebP / AVIF animation | No | Canvas feasible |
| Animated image crop/resize/rotate | No | Canvas feasible |
| GIF split to frames | No | Canvas feasible |
| Animated GIF speed control | No | Canvas feasible |

**Key gap:** Full animated GIF toolkit — ezgif is free but server-side; a client-side equivalent would be a strong differentiator.

---

## Feature Gap Summary Table

| Feature | Competitor(s) | Paywalled? | Client-Side Feasible? | Difficulty | Demand |
|---|---|---|---|---|---|
| Format conversion (AVIF, WebP, JPEG XL) | Squoosh, iLoveIMG | No (Squoosh free) | Yes — WASM codecs | Medium | High |
| Before/after comparison slider | Squoosh | No | Yes — CSS/JS | Low | High |
| Add watermark (text + logo) | iLoveIMG, Canva | Partial | Yes — Canvas | Low | High |
| AI image upscaling (2x-4x) | iLoveIMG, Fotor, Canva | Yes (most) | Yes — UpscalerJS/WASM | Medium | Very High |
| Animated GIF maker (images→GIF) | Ezgif, iLoveIMG | No (server) | Yes — gif.js + Canvas | Medium | High |
| Color correction (HSL, curves, levels) | Pixlr, Fotor | Partial free | Yes — Canvas | Low | High |
| Resize to target file size (KB) | ImageResizer | Partial | Yes — binary search compress | Low | High |
| ZIP download for bulk output | Convertio, FreeConvert | Yes | Yes — JSZip | Trivial | Medium |
| Color picker / palette from image | FreeConvert, img2go | No | Yes — EyeDropper API | Trivial | Medium |
| PDF to image (client-side) | img2go, Convertio | Partial | Yes — PDF.js | Medium | High |
| Image to PDF | img2go, iLoveIMG | Yes | Yes — jsPDF | Low | High |
| Face blur / privacy tool | img2go | Yes | Yes — MediaPipe | Low | High |
| OCR (extract text from image) | img2go, Convertio | Yes | Yes — Tesseract.js WASM | Medium | High |
| Batch processing UI | TinyPNG, BeFunky | Yes (most) | Yes — Web Workers | Medium | Very High |
| Filters/effects (preset looks) | Pixlr, Fotor, BeFunky | Partial | Yes — Canvas CSS-filters | Low | Medium |
| Photo collage maker | Fotor, BeFunky, Canva | Partial | Yes — Canvas | Medium | Medium |
| Auto-enhance (one-click) | Fotor, Pixlr | Yes | Yes — Canvas histogram | Low | High |
| GIF frame editor | Ezgif | No (server) | Yes — Canvas | High | Medium |
| Animated APNG/WebP creation | Ezgif, TinyPNG | No (server) | Yes — WASM | High | Medium |
| Video to GIF | Ezgif | No (server) | Partial — WebCodecs API | High | Medium |

---

## Top Priority Recommendations (Client-Side, High Demand, Paywalled Elsewhere)

### Tier 1 — Quick Wins (Low Difficulty, High ROI)
1. **Resize to target file size** — Users constantly need "under 1MB" for email/upload. Binary-search compression loop. No library needed.
2. **Add watermark (text + logo)** — Canvas 2D, Google Fonts. Highly demanded, most tools server-side or paywalled.
3. **Color picker + palette extractor** — EyeDropper API + Canvas `getImageData`. Trivial.
4. **ZIP download for batch output** — JSZip. Trivial. Removes the biggest friction in bulk workflows.
5. **Before/after slider** — Pure CSS/JS. Huge UX credibility boost, shows quality.

### Tier 2 — Medium Effort, High Value
6. **Format conversion (AVIF, WebP output)** — Browser already supports these via Canvas `toBlob`. Near-trivial.
7. **Auto-enhance (one-click)** — Canvas histogram equalization. Fotor charges for this.
8. **Filters/effects** — CSS `filter` property on Canvas. 10 presets = huge visual appeal.
9. **Face blur / privacy** — MediaPipe already in project (Remove BG uses it). Reuse for face detection + Gaussian blur.
10. **Image to PDF** — jsPDF library. Simple page-per-image layout.
11. **PDF to image** — PDF.js. Each page renders to Canvas → download as PNG/JPG.

### Tier 3 — High Effort, Differentiator
12. **AI upscaling (2x-4x)** — UpscalerJS or ESRGAN ONNX. Paywalled everywhere. Massive demand.
13. **OCR (text extraction)** — Tesseract.js WASM (~10MB). Paywalled at most tools.
14. **Animated GIF maker** — gif.js or WASM gifski. ezgif is the only free option but server-side.
15. **Batch processing UI** — Web Workers + progress UI. BeFunky charges $7/mo for this.

---

## Competitive Positioning

iresized.com already **leads** on:
- Background removal (free, unlimited, client-side — remove.bg charges $0.90/image)
- Watermark removal (unique — almost no free competitor offers this)
- HEIC conversion (most competitors are server-side or paywalled)
- Privacy (all client-side, no uploads)

iresized.com **lags** on:
- Format conversion breadth (no AVIF output)
- Batch/bulk workflow UX
- Basic editing (color correction, filters)
- GIF/animation tools
- AI upscaling (high demand, high paywall elsewhere)

---

*Sources consulted: Squoosh GitHub, TinyPNG pricing, Photopea docs, iLoveIMG features page, ImageResizer.com, Pixlr pricing, Fotor feature list, BeFunky pricing, img2go.com, Convertio help center, FreeConvert.com, Ezgif.com tool list.*
