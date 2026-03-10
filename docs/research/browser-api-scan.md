# Browser API Opportunity Scan
**Date:** 2026-03-10
**Purpose:** Identify modern browser APIs and WASM libraries that could power new image processing features for iresized.com — a 100% client-side, no-server static image tool suite.

---

## Summary Table

| API / Library | What It Enables | Browser Support | Effort | Priority |
|---|---|---|---|---|
| Canvas 2D API | Pixel manipulation, filters, compositing | Universal | Low | Already in use |
| OffscreenCanvas + Web Workers | Off-main-thread processing, non-blocking UI | All modern browsers (Baseline 2023) | Low-Medium | High |
| ImageBitmap / createImageBitmap | Fast async decode, zero-copy transfer to workers/WebGL | All modern browsers | Low | High |
| WebGL (GLSL shaders) | GPU-accelerated filters, real-time effects | All modern browsers | Medium | High |
| WebGPU | Next-gen GPU compute, ML inference, 3x+ perf over WebGL | Chrome 113+, Safari 26+, Firefox 141+ (no Linux yet) | High | Medium |
| WebCodecs API | Fast decode/encode of AVIF, WebP, JPEG, VP9 frames | Chrome/Edge (Baseline 2021), limited Firefox | Medium | Medium |
| FFmpeg.wasm | Full FFmpeg in browser: format conversion, GIF, frame extract | Chrome 92+, Firefox 79+, Safari 15.2+ | Medium | High |
| wasm-vips (libvips WASM) | Pipeline-based image ops: resize, crop, sharpen, ICC | Chrome 91+, Firefox 89+, all SIMD-capable browsers | Medium | Medium |
| Squoosh codecs (WASM) | MozJPEG, OxiPNG, WebP, AVIF encode/decode | All WASM-capable browsers | Medium | High |
| Streams API | Chunk-process large files without full memory load | All modern browsers | Low | Medium |
| File System Access API | Read/write files directly to disk, folder batch mode | Chromium only (Chrome, Edge, Opera) — no Firefox/Safari | Low | Low-Medium |
| Clipboard API | Paste images from clipboard, copy result instantly | All modern browsers | Low | High |
| AVIF/WebP native decode | Browser-native format reading via `<img>` + canvas | AVIF: 95%+ (Chrome 85+, Firefox 93+, Safari 16+); WebP: 95%+ | None | Already viable |
| Web Workers (general) | Background processing, parallel batch jobs | Universal | Low | High |
| CSS Filters via Canvas | Apply CSS-style filters and capture result | Universal | Low | Medium |
| Shape Detection API | Face/barcode/text detection in images | Chrome/Edge only (experimental) | Low | Low |

---

## Detailed API Profiles

### 1. Canvas 2D API
**What it enables:** Pixel-level read/write via `getImageData`/`putImageData`, compositing, drawing, filters.
**Browser support:** Universal — every browser since 2011.
**Feature ideas:**
- Already the foundation of all current iresized tools
- CSS-style filter presets (brightness, contrast, saturation, sepia, hue-rotate) applied via `ctx.filter` and captured

---

### 2. OffscreenCanvas + Web Workers
**What it enables:** Moves canvas rendering/processing entirely off the main thread. The UI stays perfectly responsive during heavy operations like processing a 20MP photo.
**Browser support:** All modern browsers (Chrome 69+, Firefox 105+, Safari 16.4+) — Baseline 2023.
**Feature ideas:**
- Batch resize/convert multiple images in parallel workers
- Real-time filter preview without UI jank
- Background watermarking of large photo sets
- Non-blocking export pipeline for high-res images

**Key pattern:**
```js
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('image-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

---

### 3. ImageBitmap / createImageBitmap
**What it enables:** Async image decoding off the main thread, zero-copy transfer between workers and WebGL. Avoids redundant decode overhead. Reported 60% performance boost in real case studies.
**Browser support:** All modern browsers.
**Feature ideas:**
- Decode uploaded images in a worker before processing
- Zero-copy pipeline: decode → worker → OffscreenCanvas → WebGL
- Fast thumbnail generation from large uploads

---

### 4. WebGL (GLSL Shaders)
**What it enables:** GPU-parallel pixel processing. Complex filters that would take seconds on CPU run in milliseconds via fragment shaders.
**Browser support:** Universal — all modern browsers.
**Feature ideas:**
- Real-time image filters: unsharp mask, vignette, lens distortion, chromatic aberration
- Color grading LUT (Look-Up Table) application
- Exposure/levels adjustments with live preview at full resolution
- Background removal via simple luminance/chroma keying

**Performance context:** WebGL has ~0.01ms frame times vs 1.2ms for Canvas 2D at scale. The setup overhead (~40ms init) is only worth it for repeated operations.

---

### 5. WebGPU
**What it enables:** Modern compute shaders (not just render shaders), direct GPU memory access, parallel compute pipelines. 3x performance gain over WebGL demonstrated for ML/image diffusion workloads.
**Browser support:** Chrome 113+ (2023), Safari 26+ (Sept 2025), Firefox 141+ (July 2025, Windows only; Linux in progress). ~85%+ of users covered in 2026.
**Caveats:** Linux not fully supported yet. `importExternalTexture` not in Firefox stable.
**Feature ideas:**
- AI upscaling (super-resolution via compute shader)
- Real-time style transfer / artistic filters
- Batch image processing on GPU with compute pipelines
- Noise reduction algorithms (e.g., BM3D)

**Strategic note:** WebGPU is not yet deploy-safe as the primary path for all users but can be used as a progressive enhancement with WebGL fallback.

---

### 6. WebCodecs API
**What it enables:** Low-level, high-performance access to browser codec infrastructure. Can decode/encode video frames, extract frames from video, and decode image formats at native speed.
**Browser support:** Chrome/Edge fully (Baseline 2021). Firefox support is incomplete (no WebCodecs in Firefox stable as of 2026). ~80/100 compatibility score.
**Feature ideas:**
- Fast AVIF/WebP decode for very large images
- Extract still frames from uploaded video files (without FFmpeg)
- Animated WebP/GIF frame extraction
- Encode output to AVIF client-side with hardware acceleration

**Caveat:** Not usable as the sole method — needs Canvas fallback for Firefox.

---

### 7. FFmpeg.wasm
**What it enables:** The full FFmpeg toolchain compiled to WebAssembly. Supports JPEG, PNG, GIF, WebP, AVIF, MP4, and virtually every image/video format. Multi-threaded via Web Workers. UI stays responsive.
**Browser support:** Chrome 92+, Firefox 79+, Safari 15.2+. Requires `SharedArrayBuffer` (COOP/COEP headers on Vercel).
**File size:** Core WASM bundle is ~25MB (can lazy-load on first use).
**Feature ideas:**
- **GIF creator** from uploaded image sequence or video clip
- **Video frame extractor** — pull frames from uploaded MP4/WebM
- **Format converter** — batch convert PNG→AVIF, JPEG→WebP, etc.
- **Animated WebP creator** from frames
- **Image sequence to timelapse** (output MP4 or GIF)
- Lossless PNG crush via FFmpeg filters

**Key note:** Vercel requires setting `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to enable `SharedArrayBuffer`. This is configurable via `vercel.json`.

---

### 8. wasm-vips (libvips compiled to WASM)
**What it enables:** The libvips pipeline image processing engine in the browser. Memory-efficient streaming pipeline: processes images in tiles rather than loading entirely into RAM. Supports resize, crop, rotate, sharpen, ICC color profiles, format conversion.
**Browser support:** Chrome 91+, Firefox 89+, Safari (SIMD-capable). SIMD support is Baseline 2023.
**Performance vs Sharp:** wasm-vips is 5.9x faster than jimp for JPEG but ~8x slower than native Sharp for JPEG (SIMD assembly limitation in Emscripten). PNG performance is comparable.
**Feature ideas:**
- High-quality image resizing (Lanczos, Mitchell algorithms not available in Canvas)
- Correct ICC color profile handling during resize
- Memory-safe processing of very large images (>50MP)
- TIFF, HEIC (read), and obscure format support

---

### 9. Squoosh Codecs (WASM)
**What it enables:** Google's open-source Squoosh exposes individual WASM codec modules: MozJPEG (better JPEG compression), OxiPNG (lossless PNG optimizer), WebP encoder, AVIF encoder, JPEG XL encoder.
**Browser support:** All WASM-capable browsers (Chrome 57+, Firefox 52+, Safari 11+).
**Feature ideas:**
- **Smart JPEG optimizer** — re-encode with MozJPEG at target file size
- **PNG optimizer** — lossless OxiPNG compression with preview
- **AVIF converter** — encode images to AVIF with quality slider
- **Target file size mode** — binary search encode quality to hit user-specified KB limit

---

### 10. Streams API (ReadableStream / TransformStream)
**What it enables:** Process files incrementally in chunks — never load the full file into memory at once. Critical for handling 50MB+ images or batch processing many files without browser crashes.
**Browser support:** All modern browsers (IE excluded).
**Feature ideas:**
- Stream-process ZIP archives of images for batch operations
- Progressive display as large image decodes chunk by chunk
- Memory-safe pipeline for 100MP+ images
- Stream downloaded output directly to disk via `showSaveFilePicker` (File System Access API)

---

### 11. File System Access API
**What it enables:** Read and write files directly to the user's local filesystem. Enable "Open folder" batch workflows. Save directly to original location without re-downloading.
**Browser support:** Chromium only (Chrome, Edge, Opera). No Firefox, no Safari as of 2026. Compatibility score: 30/100.
**Mitigation:** `browser-fs-access` (Google Chrome Labs) provides a graceful fallback to the standard file picker for unsupported browsers.
**Feature ideas:**
- "Open folder" batch import — select a folder of images and process all at once
- "Save in place" — overwrite original file directly (Chromium users only)
- Auto-save output to a watched folder

**Strategic note:** Worth implementing for Chromium users (~70% of web) with standard download fallback. Do not gate core features on it.

---

### 12. Clipboard API
**What it enables:** Read images directly from the clipboard (screenshots, copied images from other apps). Write processed images back to the clipboard for instant paste into other apps.
**Browser support:** All modern browsers (requires HTTPS + user permission).
**Feature ideas:**
- **"Paste image" button** — process a screenshot from clipboard without saving first
- **"Copy result"** — one-click copy processed image to paste into Slack, email, Figma
- Screenshot-to-optimized-WebP workflow
- Paste → resize → copy back round-trip in under 5 seconds

---

### 13. Web Workers (General)
**What it enables:** True parallel JavaScript execution. Run CPU-bound image processing without blocking the UI thread.
**Browser support:** Universal.
**Feature ideas:**
- Parallel batch processing (one worker per image)
- Keep UI interactive during long exports
- Terminate slow operations gracefully

---

### 14. Shape Detection API (Experimental)
**What it enables:** Browser-native face detection, barcode detection, and text detection in images.
**Browser support:** Chrome/Edge only (behind flags or origin trials). Not in Firefox or Safari.
**Feature ideas:**
- Auto face-crop / smart crop to detected subject
- QR code reader from uploaded image
- Auto-straighten based on text line detection

**Strategic note:** Too limited in browser support for production use in 2026. Monitor for standardization progress.

---

## Key Decisions for iresized

### Recommended Architecture Pattern
```
User Upload
    ↓
createImageBitmap() [async decode, off main thread]
    ↓
Web Worker + OffscreenCanvas [processing]
    ↓ (optional GPU path)
WebGL shaders [real-time filters]
    ↓
WASM codec [encode to target format]
    ↓
Blob → download / clipboard copy
```

### Quick Win APIs (Low effort, high impact)
1. **Clipboard API** — paste screenshots, copy results. 1-2 days to add.
2. **OffscreenCanvas + Worker** — non-blocking processing for existing tools. 1-3 days.
3. **Squoosh MozJPEG/OxiPNG codecs** — smarter compression with quality targeting. 2-3 days.

### Medium-term unlocks
4. **FFmpeg.wasm** — GIF creator, format converter, video frame extractor. Requires Vercel header config.
5. **WebGL filters** — real-time filter preview, GPU-accelerated adjustments.
6. **WebCodecs** — fast AVIF encode (with Canvas fallback for Firefox).

### Longer-term / experimental
7. **WebGPU** — AI upscaling, ML-based features. Use as progressive enhancement.
8. **wasm-vips** — high-quality resize with Lanczos/ICC support for power users.
9. **File System Access API** — batch folder mode for Chromium users.

### Vercel Config Note
To use FFmpeg.wasm (which needs `SharedArrayBuffer`), add to `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```
This is a sitewide change — test all existing tools still function with these headers before deploying.

---

## Sources
- [WebGPU API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [WebGPU hits critical mass — all major browsers](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/)
- [WebCodecs API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [WebCodecs browser support — Can I use](https://caniuse.com/webcodecs)
- [ffmpeg.wasm overview](https://ffmpegwasm.netlify.app/docs/overview/)
- [Browser Image Conversion Using FFmpeg.wasm — Telerik](https://www.telerik.com/blogs/browser-image-conversion-using-ffmpeg.wasm)
- [wasm-vips GitHub](https://github.com/kleisauke/wasm-vips)
- [Bringing Sharp to WebAssembly — StackBlitz](https://blog.stackblitz.com/posts/bringing-sharp-to-wasm-and-webcontainers/)
- [File System Access API — Can I use](https://caniuse.com/native-filesystem-api)
- [Clipboard API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
- [OffscreenCanvas — web.dev](https://web.dev/articles/offscreen-canvas)
- [AVIF browser support 2026 — Orquitool](https://orquitool.com/en/blog/avif-browser-support-2026-compatibility-webp-switch/)
- [ImageBitmap performance — LookScanned Blog](https://blog.lookscanned.io/posts/boost-performance-with-imagebitmap/)
- [Squoosh + WebAssembly — Transloadit](https://transloadit.com/devtips/optimize-images-in-browsers-with-squoosh-and-webassembly/)
- [State of WebAssembly 2025-2026 — Platform.uno](https://platform.uno/blog/the-state-of-webassembly-2025-2026/)
- [Streams API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [WebGL GPU-accelerated image filter — DEV Community](https://dev.to/hexshift/how-to-build-a-gpu-accelerated-image-filter-with-webgl-and-javascript-2ij3)
- [The Modern Web APIs in 2026 — DEV Community](https://dev.to/luckynkosi/the-modern-web-is-a-superpower-why-browser-apis-matter-in-2026-1ioi)
