# iresized.com Development Progress

## Completed

### Foundation
- [x] Core resize tool with aspect ratio locking
- [x] Quality slider and format selection (JPEG/PNG/WebP)
- [x] Drag-and-drop file upload
- [x] Vintage UI styling with self-hosted fonts
- [x] Security headers via vercel.json (strict CSP)
- [x] Cowboy hat favicon
- [x] GitHub contribution system (issue templates)
- [x] "Suggest a Feature" link in footer
- [x] Vercel Web Analytics

### Phase 1: Zero-Dependency Tools
- [x] Tab navigation UI
- [x] **Compress Only** - Reduce file size without changing dimensions
- [x] **Strip EXIF/Metadata** - Remove GPS, camera info, timestamps
- [x] **Image Cropper** - Interactive crop with aspect ratio presets
  - [x] Enhanced: drag-to-move selection
  - [x] Enhanced: resize handles on corners and edges
  - [x] Enhanced: persistent selection when changing aspect ratio
  - [x] Enhanced: cursor feedback for interaction mode
- [x] **Custom Filename** - Rename files before download (all tools)

### Phase 2: Self-Hosted Dependencies
- [x] **HEIC Converter** - Convert iPhone HEIC/HEIF to JPEG/PNG/WebP
  - Batch conversion with ZIP download
  - Quality slider, 50MB per file limit
  - Self-hosted heic2any (~1.3MB)
- [x] **Bulk Rename** - Pattern-based renaming with batch download
  - Patterns: `{n}`, `{name}`, `{date}`
  - 100 file limit, 500MB total limit
  - Self-hosted JSZip (~97KB)

---

## Upcoming

### Phase 3: ML-Based (Requires CSP Change)
- [ ] **Background Remover** - AI-powered background removal
  - Requires: MediaPipe Selfie Segmentation (~2MB, self-hosted)
  - CSP change: add `'wasm-unsafe-eval'` to script-src
  - Security: 2048x2048 max input, 30s timeout
  - All processing remains client-side

---

## Security Checklist (All Tools)

| Control | Status |
|---------|--------|
| Input validation (`validatePositiveInt()`) | ✅ |
| Filename sanitization (path traversal blocked) | ✅ |
| Memory cleanup (`cleanupCanvas()`) | ✅ |
| Error isolation (`safeExecute()`) | ✅ |
| Display safety (`textContent` only) | ✅ |
| Strict CSP headers | ✅ |
| No inline scripts/styles | ✅ |
| Self-hosted fonts (no external requests) | ✅ |
| SRI hashes for dependencies | ⏳ Phase 2 |

---

## Commits

| Hash | Description |
|------|-------------|
| `45ee756` | Add Phase 2 tools: HEIC Converter and Bulk Rename |
| `006b2ac` | Add custom filename option for all tools |
| `d5e8cb8` | Update progress.md with analytics and recent commits |
| `3abfee8` | Add Vercel Web Analytics |
| `d15b583` | Add progress.md tracking completed and upcoming tasks |
| `4b9b4df` | Enhance crop tool with movable selection and resize handles |
| `b1a08c1` | Add Phase 1 image tools: Compress, Crop, Strip EXIF |
| `aca95ec` | Replace EST badge with red FREE stamp |
| `96ecdff` | Rebrand to iresized.com |
| `fe8e385` | Add contribution system with GitHub Issues |
| `b388d26` | Add cowboy hat favicon |

---

## Repository

https://github.com/Pricing-Logic/ImageResizerFree
