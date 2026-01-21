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

---

## Upcoming

### Phase 2: Self-Hosted Dependencies
- [ ] **Bulk Rename** - Pattern-based renaming with batch download
  - Requires: JSZip (~90KB, self-hosted)
  - Features: `{name}`, `{n}`, `{date}` patterns
  - Security: filename sanitization, 100 file limit, 500MB total limit

- [ ] **HEIC Converter** - Convert iPhone photos to standard formats
  - Requires: heic2any (~800KB, self-hosted)
  - Security: magic byte validation, 50MB file limit
  - May need CSP update for WASM

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
