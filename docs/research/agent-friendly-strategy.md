# Making iresized Agent-Friendly — Strategy Report

**Date:** 2026-03-10
**Sources:** 4 parallel research agents (REST API, CLI, MCP, Core Analysis)

---

## Executive Summary

iresized.com's 17 image tools can be exposed via **three interfaces** — CLI, MCP server, and REST API — all sharing a single **Sharp-based core library**. 9 of 17 tools port trivially to Sharp; the remaining 8 need medium-effort rewrites. The MCP server is the highest-leverage deliverable for agent use.

**Recommended build order:** Core library (1 week) → MCP server (3 days) → CLI (3 days) → REST API (5 days)

---

## Architecture: Shared Core + Three Interfaces

```
                    ┌──────────────┐
                    │  iresized.com │  (browser, Canvas 2D)
                    └──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │   CLI   │  │   MCP   │  │  REST   │
        │ @iresized│  │ Server  │  │  API    │
        │  /cli   │  │ (stdio) │  │(Express)│
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
             └────────────┼────────────┘
                          │
                 ┌────────────────┐
                 │  @iresized/core │  (Sharp-based)
                 │  processImage() │
                 └────────────────┘
```

---

## 1. Core Library (`@iresized/core`)

**Single entry point:**
```typescript
processImage(inputBuffer, operation, options) → Promise<{ buffer, format, size, stats? }>
```

**Library:** Sharp (libvips) — 5-10x faster than alternatives, pre-built binaries for all platforms.

### Tool Portability

| Effort | Tools | Count |
|--------|-------|-------|
| **Trivial** (Sharp direct) | Resize, Compress, Strip Metadata, Crop, Format Convert, Bulk Rename, Batch, Target Size | 8 |
| **Low** (minor adaptation) | HEIC Convert, Advanced BG (Transformers.js Node), Auto-Enhance | 3 |
| **Medium** (rewrite needed) | Background Remove, Watermark Inpainting, Adjust, Filters, Add Watermark, Image to PDF | 6 |

**Key rewrites:**
- **CSS `ctx.filter`** (Adjust + Filters) → Sharp `.modulate()` + `.linear()` parameter mapping
- **Watermark inpainting** → Same algorithm on raw RGBA buffer instead of Canvas context
- **Add Watermark text** → Sharp SVG composite overlay
- **Image to PDF** → `pdf-lib` replaces `jsPDF`
- **Background removal** → `@imgly/background-removal-node` or Transformers.js Node

**10 utility functions** are already pure JS and can be copied verbatim.

**Estimated effort:** ~1 week

---

## 2. MCP Server (Highest Priority for Agents)

**Why first:** Claude Code and other AI agents use MCP natively. This is the most direct path to "agent-friendly."

**Transport:** stdio (local, zero config)
**SDK:** `@modelcontextprotocol/sdk` (TypeScript)
**Tools to expose:** 12 tools

### Example Tool Schemas

```typescript
resize: { inputPath, outputPath, width?, height?, maintainAspect, quality, format }
compress: { inputPath, outputPath, targetKB?, quality?, format }
convert: { inputPath, outputPath, targetFormat, quality }
batch: { inputDir, outputDir, operation, options, glob }
```

**I/O strategy:** File paths (not base64 — MCP has 1MB response cap)
**Response:** `{ outputPath, originalSize, newSize, width, height, format }`

**Estimated effort:** ~3 days (after core library exists)

---

## 3. CLI Tool (`@iresized/cli`)

**Command pattern:** Subcommand (like git/docker)
```bash
iresized resize -w 800 -q 90 input.jpg -o output.jpg
iresized compress -q 80 input.jpg -o output.jpg
iresized convert --format webp input.jpg -o output.jpg
iresized batch resize -w 800 "./images/*.jpg" --output-dir ./out
```

**Agent-friendly features:**
- `--json` flag for machine-readable output
- stdin/stdout piping support
- Progress on stderr (keeps stdout clean)
- Exit codes: 0=success, 1=input error, 2=processing error

**Package:** `@iresized/cli` (scoped npm)
**Deps:** Sharp + Commander.js (~10-15MB installed)

**Estimated effort:** ~3 days (after core library exists)

---

## 4. REST API

**Stack:** Express.js on Railway ($5-15/mo) or Render free tier
**Endpoints:**
```
POST /api/resize       { width, height, fit }
POST /api/compress     { quality, format }
POST /api/convert      { format }
POST /api/remove-bg    (no params)
POST /api/batch        { operation, options }
...plus 7 more
```

**File handling:** Multipart form data via multer (10MB cap)
**Response:** Binary stream with Content-Disposition
**Rate limiting:** 100 req/15min (Sharp ops), 30 req/15min (AI ops)

**Estimated effort:** ~5 days (after core library exists)

---

## Total Effort Estimate

| Phase | Effort | Dependency |
|-------|--------|------------|
| Core library (`@iresized/core`) | ~1 week | None |
| MCP server | ~3 days | Core library |
| CLI tool | ~3 days | Core library |
| REST API + hosting | ~5 days | Core library |
| **Total** | **~3.5 weeks** | Sequential after core |

MCP + CLI can be built in parallel after core (both just wrap `processImage()`).

---

## Risk: Hard Features

Two tools have no clean Sharp equivalent:
1. **Watermark inpainting** — Custom pixel math. Needs rewrite from Canvas ctx → raw RGBA buffer. The algorithm is self-contained (~100 lines), but testing against visual output is manual.
2. **Background removal** — Requires ML model inference (~177MB model). Works in Node via Transformers.js or @imgly/background-removal-node, but adds cold-start latency.

**Recommendation:** Ship v1 without these two, add them in v2 after core stabilizes.

---

## Competitor Comparison

| Feature | TinyPNG | remove.bg | Cloudinary | iresized (planned) |
|---------|---------|-----------|------------|-------------------|
| Free API tier | 500/mo | 1/mo | 25K transforms/mo | Unlimited (self-hosted) |
| MCP server | No | No | No | Yes |
| CLI tool | No | No | Yes ($) | Yes (free, OSS) |
| Client-side option | No | No | No | Yes (existing site) |
| Open source | No | No | No | Yes |

The MCP server would make iresized the **first open-source image processing tool natively accessible to AI agents**.
