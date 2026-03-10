# Blog Side Panel — Design Spec

## Summary

Add a persistent blog panel to the right of the iresized.com app card. The blog serves two content types: opinionated industry takes and tool-specific announcements. Posts are hardcoded in JS. The panel uses a "featured post + archive links" layout with in-panel navigation.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Side panel, always visible | Blog has permanent real estate without disrupting tool flow |
| Storage | JS array in script.js | Zero dependencies, matches the static site architecture |
| Panel style | Featured post + archive links | Highlights newest content, editorial feel |
| Voice | PG-13 dry sarcasm | Blunt, annoyed, professional. No profanity. |
| Content scope | Tool posts + opinion pieces | Mix of "we built X" and "why does Y cost $12/month" |

## Layout & Structure

Two-column flex layout:

- **Left column (app):** `max-width: 650px`, unchanged
- **Right column (blog):** `max-width: 320px`, sticky top, scrolls independently
- **Container:** `max-width: 1020px`, flex with gap
- **Mobile (<900px):** blog stacks below app card as full-width section

The blog panel is a new `<aside>` beside the existing `.app-card`, both inside a new `.page-layout` flex wrapper. Existing app card HTML/CSS stays untouched.

## Data Model

```js
const BLOG_POSTS = [
    {
        id: 'why-we-built-this',
        title: 'Why We Built This',
        date: '2026-03-10',
        readTime: '3 min read',
        excerpt: 'Every image tool on the internet follows the same playbook...',
        body: [
            'Paragraph 1...',
            'Paragraph 2...',
        ]
    },
];
```

- `body`: array of paragraph strings, rendered as `<p>` tags. No markdown.
- Ordered newest-first. First item = featured post.
- `id`: internal state tracking only, not URL routing.
- Adding a post = adding an object to the top of the array.

## Panel Behavior

Three states:

1. **List view (default):** Featured post shows title, date, read time, excerpt (~150 chars), "Continue reading →". Below divider: older posts as compact `→ Title` links.

2. **Article view:** Panel replaced with `← Back` arrow, title, date/read time, full body paragraphs. Panel scrolls independently (`position: sticky`, `overflow-y: auto`, `max-height: calc(100vh - offset)`).

3. **Mobile stacked:** Below 900px, blog loses sticky positioning, sits below app card as normal block. Same list→article behavior, full-width.

State management: single `currentPost` variable (null = list view, post id = reading). One `renderBlogPanel()` function redraws the panel. No URL routing, no hash changes.

## Voice Guide

**Voice: The Fed-Up Builder**

- First person singular. "I built this" not "we launched this."
- PG-13 sarcasm. Dry, blunt, clearly annoyed but professional. No profanity.
- State the problem plainly, then state what you did about it.
- Short paragraphs. 2-3 sentences max.
- Specific over vague. Name the exact broken thing.
- No marketing speak. No "excited to announce", no "game-changing."
- End posts with something practical — what the user gets, not a CTA.

## Initial Content (2 Posts)

1. **"Why We Built This"** — Founding rant. Why free image tools shouldn't need subscriptions.
2. **"Watermark Removal, Done Properly"** — Tool post. Gemini watermarks, why mirror-clone failed, edge-propagation inpainting.

## Files Modified

- **`index.html`** — Add `.page-layout` flex wrapper, `<aside class="blog-panel">` with panel structure. ~30 lines. Existing app card untouched.
- **`style.css`** — New styles: `.page-layout`, `.blog-panel`, `.blog-post-card`, `.blog-article`, `.blog-archive-link`, sticky positioning, 900px mobile breakpoint. ~80 lines. No existing styles modified.
- **`script.js`** — `BLOG_POSTS` array with voice guide comment, `renderBlogPanel()`, `openPost(id)`, `closeBlogPost()`, click listeners in `init()`. ~80 lines. No existing functions modified.

Nothing removed. Nothing refactored. Purely additive.
