# Anti-Features: What iresized.com Should NOT Build

> Compiled: 2026-03-10
> Purpose: Prevent scope creep by cataloguing features that seem obviously useful for an image tool but are a bad fit for a free, client-side static app.

---

## Summary Table

| Feature | Sounds Good Because | Why It's a Bad Fit | Severity |
|---|---|---|---|
| AI Image Upscaling | Users want larger images without quality loss | Heavy WASM models (50–400 MB), slow on low-end devices, already done better by dedicated tools | High |
| Neural Style Transfer | Creative, trendy, differentiating | Multi-hundred MB model bundles; 10–60s per image; practically unusable on most hardware | Critical |
| Face Detection / Tagging | Useful for photo organisation | GDPR biometric data classification, privacy optics, high liability, complex consent flow | Critical |
| RAW Camera File Conversion | Photographers need it | Hundreds of proprietary per-camera formats; reliable WASM decoders don't exist for all; huge bundle | High |
| OCR (Text Extraction from Images) | Useful for screenshots, docs | Tesseract WASM is 10–30 MB + language data; slow; iresized is about image output, not text | Medium |
| PDF-to-Image Conversion | Common user request | PDF.js bundle is 2–3 MB; PDF is a document format, not an image format; out-of-scope category creep | Medium |
| Color Grading with LUTs | Professional photography workflow | Niche user base; steep learning curve; professionals use Lightroom/Capture One, not browser tools | Medium |
| Image-to-Video / GIF Animation | Fun, creative tool | Video encoding in browser is CPU-intensive; output files are huge; output quality poor without FFmpeg | High |
| Batch AI Background Removal | Power user workflow | GPU/server needed for quality results; client-side models produce mediocre results; already a free tool | High |
| Generative Image Fill / Inpainting | Photoshop-like magic eraser | Requires diffusion models (400 MB+); generation takes 30–120s client-side; quality not competitive | Critical |
| Image Metadata Editing (full EXIF write) | Users may want to set GPS, copyright | Complex binary format; write support is poorly standardized in browsers; legal grey area with GPS data | Medium |
| SVG Tracing / Vectorisation | Convert raster to vector | Autotrace WASM bundles are 5–15 MB; quality is often poor; Inkscape/Illustrator do this far better | Medium |
| Image Comparison Slider | Side-by-side before/after | UX-only feature with no output file; doesn't fit the "tool" model; barely useful standalone | Low |
| Screen Capture / Screenshot Tool | Grab images from desktop | Requires Screen Capture API; poor Safari support; OS built-in tools do this better; out of scope | Low |
| Cloud Storage Integration | Save to Google Drive / Dropbox | Requires OAuth, server-side credentials, accounts — directly violates the zero-account philosophy | Critical |

---

## Detailed Entries

### 1. AI Image Upscaling

**Why it seems like a good idea:**
Upscaling is one of the most searched image tools. Users who resize down to thumbnails often want to go back up. AI super-resolution (ESRGAN, Real-ESRGAN) produces visually impressive results compared to bicubic interpolation.

**Why it's a bad fit:**
- Lightweight browser models (e.g. upscale.js, ONNX Runtime Web) require 30–100 MB model downloads on first use.
- Quality degrades significantly at scale — results are only impressive in the "wow" demo, not production use.
- Processing a 2 MP image takes 5–30 seconds on a mid-range laptop without GPU acceleration.
- Users with serious upscaling needs go to Topaz Gigapixel, Let's Enhance, or similar tools.
- iresized already provides standard resize — the marginal value does not justify the complexity and size cost.

**Verdict:** Do not build. The dedicated tools are too far ahead in quality for this to be competitive as a free side-feature.

---

### 2. Neural Style Transfer ("Artistic Filter")

**Why it seems like a good idea:**
Turning photos into paintings in one click is visually spectacular and highly shareable. It has proven viral potential and media coverage.

**Why it's a bad fit:**
- TensorFlow.js style transfer models are 20–80 MB each.
- Processing time on CPU is 30–120 seconds per image at reasonable quality.
- WebGPU speeds this up but browser support remains inconsistent (especially on iOS Safari as of 2026).
- Output quality on consumer hardware is mediocre — the viral demos were run on cloud GPUs.
- Page load bloat would be severe even with lazy loading.

**Verdict:** Do not build. This is a cloud GPU feature dressed up as a browser feature.

---

### 3. Face Detection / Face Tagging / Smart Crop to Face

**Why it seems like a good idea:**
Auto-crop-to-face is genuinely useful for profile photos and headshots. MediaPipe and face-api.js make it technically feasible in the browser.

**Why it's a bad fit:**
- Under GDPR Article 9, facial biometric data is "special category" personal data. Even client-side processing of faces is under regulatory scrutiny.
- Users will be uncomfortable with a free tool analyzing faces, regardless of whether data leaves the device.
- The feature creates enormous reputational risk for a small tool — one bad headline ruins the brand.
- Smart crop to subject (without face recognition) is a safer alternative if needed.

**Verdict:** Do not build. The regulatory and trust risk is disproportionate to the feature value.

---

### 4. RAW Camera File Conversion (CR3, ARW, NEF, etc.)

**Why it seems like a good idea:**
Photographers frequently need to convert RAW files to JPEG/PNG for sharing. There are hundreds of camera models.

**Why it's a bad fit:**
- RAW formats are mostly proprietary with no single open standard. There are 500+ distinct RAW formats in the wild.
- Reliable open-source WASM decoders exist for only a subset (LibRaw covers many, but the WASM build is 15–25 MB).
- Some manufacturers (notably Sony, Fujifilm) change their RAW spec between camera generations without publishing documentation.
- HEIC Convert (already in iresized) is the more relevant modern format. RAW is a niche that photographers handle with dedicated tools.

**Verdict:** Do not build. LibRaw WASM is promising but coverage gaps and bundle size make it a poor fit.

---

### 5. OCR — Text Extraction from Images

**Why it seems like a good idea:**
Extracting text from screenshots is a genuinely common task. Tesseract.js runs fully client-side with no server needed.

**Why it's a bad fit:**
- Tesseract WASM core is 10–15 MB; language data files add another 5–20 MB per language.
- Performance is slow on mobile (30–90 seconds for a complex document page).
- OCR is a text-output tool, not an image-output tool. It doesn't fit iresized's product model of "image in, image out."
- macOS and iOS have built-in Live Text OCR that is dramatically faster and more accurate. Windows 11 has a similar feature.
- Users who need reliable OCR use dedicated tools (Adobe Acrobat, Google Lens, Microsoft OneNote).

**Verdict:** Do not build. Wrong product category and OS-level competition is too strong.

---

### 6. PDF-to-Image Conversion

**Why it seems like a good idea:**
"How do I convert PDF to JPG" is a very high-search-volume query. PDF.js makes it technically feasible.

**Why it's a bad fit:**
- PDF.js adds 2–3 MB to the bundle.
- PDF is a document format, not an image format. Treating it as an image pipeline step invites confusion.
- PDFs can be multi-page, password-protected, form-based, or font-embedded — handling edge cases is a significant maintenance burden.
- Converting a PDF in a browser gives lower quality than dedicated tools because fonts are rasterized at screen resolution.
- Dedicated free tools (ilovepdf, smallpdf, etc.) dominate this keyword.

**Verdict:** Do not build. Wrong category and dominated by incumbents.

---

### 7. Color Grading with LUTs

**Why it seems like a good idea:**
LUT (Look-Up Table) application is technically simple — a color remap operation on the canvas. It's a great feature for photographers who want consistent looks.

**Why it's a bad fit:**
- The target user (someone using LUTs) already has Lightroom, Capture One, or DaVinci Resolve.
- Parsing .cube and .3dl files adds implementation complexity with no off-the-shelf library.
- Distributing built-in LUTs raises licensing questions (most commercial LUT packs are not free to redistribute).
- The UX for selecting, previewing, and applying LUTs is complex to do well.
- Market research suggests LUT users are professionals who will not replace their existing workflow with a browser tool.

**Verdict:** Do not build. The audience is a professional niche already well-served.

---

### 8. Image-to-GIF / GIF Animation Creator

**Why it seems like a good idea:**
GIFs are still widely used. Turning a series of images into a GIF is a legitimate user need.

**Why it's a bad fit:**
- GIF encoding in the browser (gif.js, omggif) is slow — 2 seconds per frame on a modern laptop.
- Output file sizes are enormous compared to modern alternatives (WebP animations, MP4).
- The GIF palette limitation (256 colors) means output quality is visibly poor for photos.
- Video creation (even simple animation) pushes users toward expecting video features next, creating scope creep.

**Verdict:** Do not build unless a compelling modern alternative (WebP animation export) justifies it with no quality compromise.

---

### 9. Generative Fill / AI Inpainting

**Why it seems like a good idea:**
Photoshop's Generative Fill is the most-talked-about image feature of the last two years. A free browser version would get enormous attention.

**Why it's a bad fit:**
- State-of-the-art inpainting (Stable Diffusion, FLUX) requires 2–8 GB VRAM. Browser WASM implementations use quantized models that are 400 MB–1 GB.
- Generation time on CPU is 2–5 minutes per image. On WebGPU it may be 15–30 seconds.
- Output quality from browser-runnable models is not competitive with cloud tools.
- The user expectation (Photoshop-level magic) will never be met by a client-side static tool.
- First-load experience would be catastrophic — users would abandon before the model finishes loading.

**Verdict:** Do not build. This is a cloud GPU feature. The gap between expectation and reality would generate negative reviews.

---

### 10. Cloud Storage Integration (Google Drive, Dropbox, OneDrive)

**Why it seems like a good idea:**
Users have images stored in the cloud. Letting them open and save directly would be convenient.

**Why it's a bad fit:**
- OAuth flows require a server-side component to keep client secrets safe. This directly violates iresized's static/serverless architecture.
- Adding accounts or third-party auth creates user friction and GDPR compliance obligations.
- iresized's core value proposition is "no account, no upload." Cloud integration contradicts this.
- If a user has Google Photos, they already have Google's editing tools.

**Verdict:** Do not build under any circumstances. Fundamentally incompatible with the product philosophy.

---

### 11. Screen Capture / Screenshot Tool

**Why it seems like a good idea:**
If a user wants to capture and then edit an image, combining capture and editing in one tool is convenient.

**Why it's a bad fit:**
- The Screen Capture API (`getDisplayMedia`) has poor and inconsistent Safari support.
- Every OS has a built-in screenshot tool (Win+Shift+S on Windows, Cmd+Shift+4 on macOS). This is classic "duplicating OS functionality."
- The feature does not produce a better result than the OS equivalent.
- It expands the product scope from "image tools" to "productivity tools."

**Verdict:** Do not build. OS-level competition makes this pointless.

---

### 12. SVG Tracing / Vectorisation

**Why it seems like a good idea:**
Converting a raster logo to SVG is a frequent need for designers. An "Image to SVG" tool sounds high-value.

**Why it's a bad fit:**
- Autotrace and Potrace WASM builds are 5–15 MB.
- Output quality for photographic images is poor — the feature is really only useful for simple flat-color graphics.
- Inkscape (free, desktop) and Vector Magic (paid, web) do this far better.
- Users who need real vectorisation results are designers who know the limitations and use proper tools.

**Verdict:** Do not build. Quality expectations cannot be met client-side.

---

## Principles Derived from This Analysis

1. **If it needs a GPU server, it's not a client-side feature.** AI generation, style transfer, and high-quality upscaling are cloud products.

2. **If the OS does it well for free, don't compete.** Screenshots, basic editing, file format conversion in most cases.

3. **If the WASM bundle exceeds ~5 MB for a single feature, think twice.** iresized is a lightweight tool; bundle bloat destroys the user experience for dial-up, mobile, and low-powered devices.

4. **If the target user is a professional with existing tools, you won't win.** LUTs, RAW conversion, vectorisation — professionals have workflows. Target the general user who doesn't.

5. **If it requires accounts or server credentials, it's out of scope.** Cloud storage, OAuth flows, paid APIs — all violate the product's core identity.

6. **If the feature is about text output, not image output, it's the wrong product.** OCR, PDF reading, metadata extraction.

7. **If it creates regulatory exposure disproportionate to the value, skip it.** Face detection is the clearest example.

---

## Sources Consulted

- [WebAssembly in 2025: The Full Story](https://medium.com/@p.reaboi.frontend/webassembly-in-2025-the-full-story-frontend-web3-limitations-7ee7cf0f9292)
- [How To Run Lightweight AI Image Upscalers Directly In Your Browser](https://www.alibaba.com/product-insights/how-to-run-lightweight-ai-image-upscalers-directly-in-your-browser-no-install-no-gpu-required.html)
- [WebCodecs API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [WebCodecs API - Can I use](https://caniuse.com/webcodecs)
- [GDPR and Facial Recognition: Privacy Implications](https://www.gdpr-advisor.com/gdpr-and-facial-recognition-privacy-implications-and-legal-considerations/)
- [Tesseract WASM - GitHub](https://github.com/robertknight/tesseract-wasm)
- [Integrating OCR in the browser with Tesseract.js](https://transloadit.com/devtips/integrating-ocr-in-the-browser-with-tesseract-js/)
- [Running Stable Diffusion under 400MB in the browser](https://www.leebutterman.com/2024/12/01/running-stable-diffusion-in-under-400-megabytes-in-the-browser-at-over-3-fps.html)
- [Client-Side AI for Cost-Effective, Secure Web Apps](https://www.griddynamics.com/blog/client-side-ai)
- [Raw image format - Wikipedia](https://en.wikipedia.org/wiki/Raw_image_format)
- [ISACA: Facial Recognition and Privacy Concerns 2025](https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2025/facial-recognition-and-privacy-concerns-and-solutions-in-the-age-of-ai)
