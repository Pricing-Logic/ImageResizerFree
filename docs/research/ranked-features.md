# Ranked Feature Ideas — iresized.com

**Date:** 2026-03-10
**Author:** feature-ranker agent
**Method:** Synthesised from competitor-analysis.md, browser-api-scan.md, and anti-features.md.
**Ranking formula:** (high user value) × (low complexity) × (high paywall prevalence)

Anti-features filtered out: AI upscaling, neural style transfer, face detection/blur (GDPR), RAW conversion, OCR, PDF-to-image, LUT colour grading, GIF/animation creator, generative fill/inpainting, cloud storage integration, screen capture, SVG vectorisation, before/after comparison slider (no output file).

---

## Ranked Feature Table

| Rank | Feature | Complexity | Paywall Prevalence | User Value | Score Notes |
|---|---|---|---|---|---|
| 1 | Clipboard Paste & Copy | Simple | Medium | Very High | Zero-dependency, huge daily friction solved |
| 2 | ZIP Download for Bulk Output | Simple | High | High | One JSZip call; removes biggest bulk-workflow blocker |
| 3 | Colour Correction (HSL / Brightness / Contrast) | Simple | High | High | Canvas `ctx.filter` only; Pixlr/Fotor charge for it |
| 4 | Format Conversion (AVIF / WebP output) | Simple | Medium | Very High | Canvas `.toBlob('image/avif')` — browser already supports it |
| 5 | Resize to Target File Size (KB/MB) | Simple | High | Very High | Binary-search compress loop; no extra library needed |
| 6 | Add Watermark (Text + Logo overlay) | Simple | High | High | Canvas 2D + Google Fonts; iLoveIMG/Canva paywall it |
| 7 | Filters / Preset Effects | Simple | High | Medium | CSS-filter on Canvas; BeFunky charges $6.99/mo |
| 8 | Auto-Enhance (one-click levels) | Simple | High | High | Canvas histogram normalisation; Fotor/Pixlr paywall it |
| 9 | Image to PDF | Simple | High | High | jsPDF library (~90 KB); iLoveIMG/img2go paywall it |
| 10 | Batch Processing UI | Medium | Very High | Very High | Web Workers + OffscreenCanvas; BeFunky charges $7/mo |

---

## Detailed Feature Profiles

### 1. Clipboard Paste & Copy
**What it does:** Lets users paste a screenshot or copied image directly into iresized, and copy the processed result back to clipboard with one click.
**Why users want it:** Screenshots have to be saved to disk first before any tool can process them — a slow, annoying detour. Copying the result avoids another save/re-open cycle when pasting into Slack, email, or Figma.
**Technical approach:** `navigator.clipboard.read()` to receive `image/png` blobs on paste; `navigator.clipboard.write()` with a `ClipboardItem` to copy the result. Requires HTTPS + user permission (both already satisfied by Vercel). Supported in all modern browsers.
**Complexity:** Simple — 1–2 days. No new libraries.
**Paywall prevalence:** Most tools are server-side so this pattern does not appear. Among client-side tools, Squoosh does not have it. Effectively unique.
**Key API:** Clipboard API (browser-api-scan.md §12)

---

### 2. ZIP Download for Bulk Output
**What it does:** Packages all processed images from a bulk operation into a single ZIP file for one-click download.
**Why users want it:** Downloading 20 resized images one at a time is the single biggest friction point in any batch workflow. It stops users from using bulk tools at all.
**Technical approach:** `JSZip` library (~100 KB minified). After batch processing, call `zip.generateAsync({ type: 'blob' })` and trigger a single download. No server involved.
**Complexity:** Simple — under 1 day. JSZip is well-maintained and tiny.
**Paywall prevalence:** Convertio charges for batch ZIP output. FreeConvert limits it. Most free tools simply do not have a batch mode at all.
**Key API:** Web Workers (already in scope for batch) + JSZip

---

### 3. Colour Correction (HSL / Brightness / Contrast / Saturation)
**What it does:** Sliders to adjust brightness, contrast, saturation, hue, and sharpness on any image before export.
**Why users want it:** The most common photo "fix" before sharing — "make it a bit brighter", "more vivid colours". Currently requires Photoshop, Fotor Pro, or Pixlr Pro.
**Technical approach:** Canvas 2D `ctx.filter` CSS-string approach for live preview: `filter: brightness(1.2) contrast(1.1) saturate(1.3)`. Render to canvas on export. For hue-rotate and advanced ops, `getImageData` pixel loops or a lightweight WebGL pass. No library needed for basic sliders; WebGL optional for GPU preview.
**Complexity:** Simple for basic sliders (CSS filter on canvas). Medium if adding live WebGL preview.
**Paywall prevalence:** Pixlr, Fotor, and BeFunky all paywall their full adjustment panels. Even partial free tiers have limited controls.
**Key API:** Canvas 2D API + optional WebGL shaders (browser-api-scan.md §4)

---

### 4. Format Conversion (AVIF / WebP / JPEG / PNG output)
**What it does:** Converts any uploaded image to AVIF, WebP, JPEG, or PNG with a quality slider.
**Why users want it:** AVIF and WebP are the modern web standard — 30–50% smaller than JPEG at equivalent quality. Developers and content creators need to convert existing assets.
**Technical approach:** `canvas.toBlob('image/avif', quality)` and `canvas.toBlob('image/webp', quality)` — these are natively supported in Chrome 85+ (AVIF: 95%+ users) and all modern browsers (WebP: 95%+). For higher-quality JPEG, optionally use the Squoosh MozJPEG WASM codec (browser-api-scan.md §9). No new library required for the basic case.
**Complexity:** Simple for basic format output (canvas.toBlob). Medium if adding Squoosh MozJPEG codec for better JPEG quality.
**Paywall prevalence:** iLoveIMG charges for AVIF conversion. Most dedicated converters are server-side with daily limits. Squoosh is free but single-image only.
**Key API:** Canvas 2D `.toBlob()` + optional Squoosh WASM codecs

---

### 5. Resize to Target File Size (KB / MB)
**What it does:** User specifies a maximum output file size (e.g. "under 500 KB") and the tool automatically finds the right quality/dimension settings to hit that target.
**Why users want it:** Email attachments, form upload limits, and CMS restrictions constantly impose file-size caps. Users currently guess-and-check manually.
**Technical approach:** Binary-search loop on `canvas.toBlob()` quality parameter (0–1). Start at quality 0.5, encode, check blob size vs target, bisect. Typically converges in 5–8 iterations (~200ms total). No library needed.
**Complexity:** Simple — pure JavaScript, no dependencies. The algorithm is well-understood.
**Paywall prevalence:** ImageResizer.com partially paywalls this. No free client-side tool does it cleanly. High frustration, zero free solutions.
**Key API:** Canvas 2D `.toBlob()` with binary search

---

### 6. Add Watermark (Text + Logo Overlay)
**What it does:** Overlays custom text (with font, size, colour, opacity, position controls) or a logo image onto photos before export.
**Why users want it:** Photographers and content creators watermark their work to protect copyright. Currently requires Canva (account), iLoveIMG (server, limits), or Photoshop.
**Technical approach:** Canvas 2D `drawImage()` for logo overlays + `ctx.fillText()` for text with `ctx.font` / `ctx.globalAlpha` / `ctx.fillStyle`. Google Fonts can be loaded via `@font-face` for font variety. Positioning via percentage offsets relative to canvas dimensions.
**Complexity:** Simple. All Canvas 2D primitives. A drag-to-position handle adds ~1 day.
**Paywall prevalence:** iLoveIMG, Canva, and most dedicated watermark tools are server-side or account-gated. Canva requires a free account.
**Key API:** Canvas 2D API + Google Fonts

---

### 7. Filters / Preset Effects (10–15 looks)
**What it does:** One-click preset looks — Vivid, Cool, Warm, B&W, Faded, Vintage, etc. — applied to images before export.
**Why users want it:** Quick visual style matching for social media, presentations, or just personal preference. The effect is immediately obvious and satisfying.
**Technical approach:** Each preset is a named CSS filter string applied via `ctx.filter` then drawn to canvas. E.g. `Vivid = saturate(1.5) contrast(1.1)`, `Vintage = sepia(0.4) brightness(1.1) contrast(0.9)`. 10–15 presets can be defined in ~30 lines of JSON. Thumbnail previews generated once on upload.
**Complexity:** Simple — a lookup table of CSS filter strings. Under 1 day.
**Paywall prevalence:** BeFunky ($6.99/mo), Pixlr (Pro plan), Fotor (Pro plan). Even Photopea keeps filters in premium.
**Key API:** Canvas 2D `ctx.filter` (browser-api-scan.md §1 and §14)

---

### 8. Auto-Enhance (One-Click Levels)
**What it does:** Automatically improves a photo's brightness, contrast, and colour balance with a single click.
**Why users want it:** Many photos from phones are slightly flat, dark, or over-exposed. "Make it look better" is the number-one non-specific request users have.
**Technical approach:** Read image pixel data via `getImageData`, compute per-channel histograms, apply auto-levels stretch (map the 5th–95th percentile of each channel to 0–255). Optionally apply a mild contrast curve. Output via `putImageData`. All pure Canvas 2D — no library.
**Complexity:** Simple — the histogram calculation is ~40 lines of JavaScript.
**Paywall prevalence:** Fotor charges for auto-enhance. Pixlr limits it to Pro. Adobe Express limits AI enhance to paid. No clean free client-side implementation exists.
**Key API:** Canvas 2D `getImageData` / `putImageData`

---

### 9. Image to PDF
**What it does:** Converts one or more images into a single downloadable PDF file, one image per page.
**Why users want it:** Submitting photos as a PDF is required by many organisations (CVs, forms, applications). Currently requires Adobe, ilovepdf, or img2go — all server-side.
**Technical approach:** `jsPDF` library (~500 KB minified). Load images onto canvas, call `pdf.addImage(dataUrl, 'JPEG', ...)` per image, then `pdf.save()`. Multiple images become multiple pages. Supports custom page sizes.
**Complexity:** Simple. jsPDF is mature and well-documented. Implementation is ~50 lines.
**Paywall prevalence:** img2go, iLoveIMG, and most PDF tools charge for this or impose server-side limits. ilovepdf paywalls batch PDF creation. High search volume keyword.
**Key API:** jsPDF library

---

### 10. Batch Processing UI
**What it does:** Lets users upload 10–50 images at once and apply the same operation (resize, compress, convert, watermark) to all of them in parallel, with a progress bar and ZIP download at the end.
**Why users want it:** Single-image tools waste enormous time for photographers, designers, and anyone managing product photos. Batch is the #1 most-requested feature category across all image tool platforms.
**Technical approach:** `Web Workers` with `OffscreenCanvas` for off-main-thread processing. One worker per image (or a pool of N workers). `createImageBitmap()` for efficient zero-copy decode. `JSZip` (already ranked at #2) for the output archive. `ReadableStream` for memory-safe handling of large batches.
**Complexity:** Medium — Web Workers, OffscreenCanvas, and progress UI require careful coordination. Estimate 3–5 days.
**Paywall prevalence:** BeFunky charges $6.99/mo. TinyPNG limits free batch to 20 images/month. iLoveIMG restricts batch size. No unlimited free client-side batch tool exists.
**Key API:** Web Workers + OffscreenCanvas + createImageBitmap (browser-api-scan.md §2, §3, §13)

---

## Features Excluded (Anti-Features Filter)

The following appeared in the competitor analysis as gaps but were removed based on anti-features.md:

| Feature | Reason Excluded |
|---|---|
| AI Image Upscaling | 50–400 MB models, slow on low-end devices, dedicated tools too far ahead in quality |
| Filters (Artistic / Painting / Sketch style) | Neural style transfer variant — large ML models, slow, cloud GPU quality gap |
| Face Blur / Privacy Tool | GDPR Article 9 biometric data risk, Critical severity in anti-features |
| OCR (text extraction) | Text-output product, not image-output; Tesseract 10–30 MB; OS tools better |
| PDF to Image | Document format, not image format; category creep; 2–3 MB bundle for PDF.js |
| GIF / Animated image creator | GIF encoding slow and poor quality; palette limited to 256 colours; scope creep |
| Before/After Comparison Slider | UX-only, no output file, does not fit the "tool" model (anti-features.md) |
| Colour Grading with LUTs | Professional niche already using Lightroom/DaVinci; high UX complexity |
| AI Inpainting / Generative Fill | Requires 400 MB+ models; 2–5 min CPU generation time; quality not competitive |
| RAW Camera Conversion | 500+ proprietary formats; LibRaw WASM 15–25 MB; coverage gaps |
| Cloud Storage Integration | Requires OAuth server component; violates zero-account product philosophy |
| SVG Vectorisation | 5–15 MB WASM; quality poor for photos; Inkscape does it better |

---

## Strategic Summary

The highest-value, lowest-risk additions to iresized are all **pure Canvas 2D or tiny-library features** that require zero new WASM bundles:

1. **Clipboard Paste & Copy** — Solves the screenshot workflow gap completely. Unique among client-side tools.
2. **ZIP Download** — Removes the biggest bulk-workflow friction with one library call.
3. **Colour Correction sliders** — The most-missed "basic editing" feature. Competitors charge for it.
4. **Format Conversion (AVIF/WebP)** — The browser already knows how; this just exposes the option.
5. **Resize to Target File Size** — High search volume, zero free client-side solutions.

Items 6–10 (Watermark, Filters, Auto-Enhance, Image-to-PDF, Batch UI) are all buildable with small, well-known libraries and represent the natural next tier of iresized's toolset.

The tools iresized is already strongest on (BG removal, Watermark Removal, HEIC Convert) remain genuine competitive advantages — none of the above recommendations cannibalise them.
