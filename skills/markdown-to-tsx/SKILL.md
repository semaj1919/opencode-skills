---
name: markdown-to-tsx
description: Use when converting Markdown files to Next.js .tsx page files that follow the Maine Coons website Tailwind CSS styling patterns
---

# Markdown to TSX Converter

## Overview

Converts Markdown files into Next.js App Router `.tsx` page files using the Maine Coons website's established Tailwind CSS styling conventions.

## When to Use

- Converting `.md` files to `.tsx` page components
- The output must match the existing website styling (amber headings, gray paragraphs, gradient CTA sections, FAQ accordion)
- The source contains section headers, paragraphs, lists, and call-to-action text blocks

## Quick Reference

| Markdown | JSX Output |
|----------|-----------|
| `# Title` | Hero section with `<HeroWrapper>`, h1 `text-5xl md:text-6xl font-bold text-slate-900`, gradient divider, subtitle paragraph |
| `## Subtitle` | Subtitle `<p className="text-xl text-slate-600 max-w-3xl">` inside HeroWrapper |
| `### Header` | Section heading h2 `text-3xl font-bold text-amber-900 mb-6` with `id` |
| Paragraph | `<p className="mb-4 text-gray-700">` |
| `**bold**` | `<strong>text</strong>` (no className) |
| `- item` | `<li><strong>label</strong> — description</li>` or plain `<li>` |
| CTA text block | Standalone `<section className="py-5 px-4 bg-gradient-to-br from-blue-50 to-purple-50">` with gradient card + Call/Email buttons |
| `{#anchor}` | Extracts anchor name, adds `id="name"` to heading, strips from visible text |
| `&apos;` | Convert to `&apos;` (JSX-safe) |
| `&quot;` | Convert to `&quot;` (JSX-safe) |
| FAQ Q&A pairs | `<details className="group bg-slate-50 rounded-2xl p-6 border border-slate-200 cursor-pointer hover:border-blue-300 transition">` with `<summary>` |

## Imports

Every generated file MUST include these imports at the top:

```tsx
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {HeroWrapper} from '@/components/hero-wrapper';
```

If the markdown references specific React components (e.g., `<Kings />`, `<Queens />`), import them from `@/components/adults` (or the appropriate component path).

## Conversion Rules

### 1. Title (`#`) → Hero Section

Wrap the title and `##` subtitle in `<HeroWrapper>` with a "Back to Home" link:

```tsx
<HeroWrapper>
    <Link
        href="/"
        className="inline-flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition mb-8 font-medium">
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Home</span>
    </Link>

    <div className="flex items-center space-x-4 mb-6">
        <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
            {title}
        </h1>
        <div className="flex-1 h-1 bg-gradient-to-r from-blue-600 to-transparent rounded-full"></div>
    </div>

    <p className="text-xl text-slate-600 max-w-3xl">
        {subtitle text from ## heading}
    </p>
</HeroWrapper>
```

### 2. Subtitle (`##`) in Hero

If `##` appears immediately after `#`, use it as the subtitle `<p>` inside HeroWrapper. If `##` appears after paragraphs or other content, it becomes a section heading (rule 3).

### 3. Section Headers (`###` and subsequent `##` after content)

Each `###` or subsequent `##` after content starts a new section:

```tsx
<section className="py-10 px-4">
    <div className="max-w-7xl mx-auto">
        <h2
            id="anchor-name"
            className="mb-6 text-3xl font-bold text-amber-900">
            Section Title
        </h2>
        {/* content */}
    </div>
</section>
```

#### Special: Standalone component sections

When a section heading is immediately followed by a React component call (e.g., `<Kings />`, `<Queens />`), the heading is placed OUTSIDE the section wrapper:

```tsx
<h2
    id="our-kings"
    className="text-3xl font-bold text-amber-900 max-w-7xl mx-auto">
    Section Title
</h2>
<ComponentName />
```

### 4. Paragraphs

```tsx
<p className="mb-4 text-gray-700">
    Text content here
</p>
```

### 5. Bold Text

`**bold**` converts to `<strong>` with no className:

```tsx
<p className="mb-4 text-gray-700">
    Some text <strong>bold portion</strong> more text
</p>
```

### 6. Unordered Lists (inline within sections)

When a list follows a paragraph that introduces it (e.g., "Patterns include:"):

```tsx
<ul className="mb-4 list-disc pl-6 space-y-2 text-gray-700">
    <li>
        <strong>Label</strong> — description text
    </li>
</ul>
```

List items with `label — description` format use `<strong>` for the label. Plain list items (no separator) are rendered as-is.

### 7. CTA Sections (Call to Action)

When a section ends with contact info (phone number, email, or phrases like "Text or call us", "Contact us", "Ready to..."), extract the contact info and create a standalone CTA section between content sections:

```tsx
<section className="py-5 px-4 bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="mx-auto max-w-4xl">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-3 text-center text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-2">
                Ready to Learn More?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                    href="tel:+19512902885"
                    className="inline-flex items-center justify-center px-4 py-1.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition">
                    Call (951) 290-2885
                </a>
                <a
                    href="mailto:vince@mindfulmainecoon.com"
                    className="inline-flex items-center justify-center px-4 py-1.5 bg-blue-700 hover:bg-blue-800 font-bold rounded-xl transition">
                    Email Us
                </a>
            </div>
        </div>
    </div>
</section>
```

CTA detection heuristics:
- Contains a phone number (e.g., `(951) 290-2885`, `+19512902885`)
- Contains an email address
- Contains phrases like "Contact us", "Call us", "Text or call", "Ready to"
- Appears at the end of a content block or section

### 8. Table of Contents

After the hero section, insert a TOC:

```tsx
<section className="py-10 px-4">
    <div className="max-w-7xl mx-auto">
        <h2 className="mb-4 text-3xl font-bold text-amber-900">
            Table of Contents
        </h2>
        <ul className="space-y-2">
            <li>
                <a
                    href="#anchor-name"
                    className="text-amber-700 hover:text-amber-900 underline">
                    Section Title
                </a>
            </li>
        </ul>
    </div>
</section>
```

TOC links use the anchor names extracted from `{#anchor}` syntax in the markdown. Include all `###` (and `##` section headers) in the TOC. Skip hero `##` subtitle.

### 9. FAQ Section

When the markdown has Q&A pairs (questions followed by answers), use native HTML `<details>` elements:

```tsx
<section className="py-10 px-4">
    <div className="mx-auto max-w-4xl">
        <h2
            id="frequently-asked-questions"
            className="text-4xl font-bold mb-12">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Frequently Asked Questions
            </span>
        </h2>

        <div className="space-y-6">
            <details className="group bg-slate-50 rounded-2xl p-6 border border-slate-200 cursor-pointer hover:border-blue-300 transition">
                <summary className="flex items-start justify-between font-semibold text-slate-900 text-lg">
                    <span>Question text</span>
                    <span className="group-open:rotate-180 transition">
                        ▼
                    </span>
                </summary>
                <p className="mt-4 text-slate-700 leading-relaxed">
                    Answer text here
                </p>
            </details>
        </div>
    </div>
</section>
```

FAQ heading uses a gradient text span (`bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent`). FAQ section has `text-4xl` heading with `mb-12` spacing. FAQ answers use `text-slate-700 leading-relaxed` (unlike regular paragraphs which use `text-gray-700`).

### 10. Anchor Syntax

Markdown `{#anchor-name}` syntax:
- Extract the anchor name from `{#name}`
- Add `id="name"` to the parent heading element
- DO NOT include `{#anchor-name}` in the visible text
- Convert `&apos;` to `&apos;` and `&quot;` to `&quot;` for JSX safety

### 11. Root Wrapper

Use a fragment `<>...</>` instead of `<main>`:

```tsx
export default function PageName() {
    return (
        <>
            {/* Hero Section */}
            <HeroWrapper>
                ...
            </HeroWrapper>

            {/* Table of Contents */}
            <section className="py-10 px-4">
                ...
            </section>

            {/* Content sections */}
            ...
        </>
    );
}
```

### 12. generateMetadata

Add a metadata function after imports:

```tsx
export function generateMetadata() {
    return {
        title: '{Title from markdown} | Mindful Maine Coons',
        description: '{First paragraph excerpt or subtitle text}',
    };
}
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `text-amber-900` for h1 in hero | Use `text-slate-900` for hero h1 |
| Using `text-amber-800` for section headings | Use `text-amber-900` for section headings |
| Using `<main>` wrapper | Use `<>...</>` fragment wrapper |
| Using `<strong className="font-semibold">` | Use plain `<strong>` without className |
| Embedding CTA inside content sections | Extract CTA as standalone section between content sections |
| Using `<div>` for FAQ | Use native `<details>`/`<summary>` elements |
| Using `text-gray-700 leading-relaxed` for paragraphs | Use `text-gray-700` only (no `leading-relaxed`) |
| Forgetting `Link` and `ArrowLeft` imports | Always import from `next/link` and `lucide-react` |
| Including `{#anchor}` in visible text | Strip anchor syntax from displayed text |
| Using `<h3>` for section headings | Use `<h2>` for all section headings |
| Wrapping hero h1 in flex div without gradient line | Always include the gradient divider `<div>` |
| Forgetting `generateMetadata()` | Always add metadata function after imports |
| Using `text-gray-700 leading-relaxed` in FAQ answers | Use `text-slate-700 leading-relaxed` ONLY inside FAQ `<details>` paragraphs |
| Wrapping standalone component headings in section wrapper | Place heading outside section, directly before component call |
| Forgetting `list-disc pl-6 space-y-2` on lists | Always add these classes to `<ul>` elements |
| Using `text-slate-700` for regular paragraphs | Use `text-gray-700` for regular paragraphs; `text-slate-700` is FAQ-only |

## Example Conversion

**Markdown input:**
```markdown
# Maine Coon
## The Gentle Giant

The Maine Coon is a large domesticated cat breed.

### History
The breed originated in the United States.

### Temperament
- Friendly
- Intelligent
- Playful

### FAQ
**Q: How big do they get?**
A: They can reach 25 pounds.
```

**TSX output:**
```tsx
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {HeroWrapper} from '@/components/hero-wrapper';

export function generateMetadata() {
    return {
        title: 'Maine Coon | Mindful Maine Coons',
        description: 'The Gentle Giant',
    };
}

export default function MaineCoon() {
    return (
        <>
            {/* Hero Section */}
            <HeroWrapper>
                <Link
                    href="/"
                    className="inline-flex items-center space-x-2 text-slate-600 hover:text-blue-600 transition mb-8 font-medium">
                    <ArrowLeft className="w-5 h-5" />
                    <span>Back to Home</span>
                </Link>

                <div className="flex items-center space-x-4 mb-6">
                    <h1 className="text-5xl md:text-6xl font-bold text-slate-900">
                        Maine Coon
                    </h1>
                    <div className="flex-1 h-1 bg-gradient-to-r from-blue-600 to-transparent rounded-full"></div>
                </div>

                <p className="text-xl text-slate-600 max-w-3xl">
                    The Gentle Giant
                </p>
            </HeroWrapper>

            {/* Table of Contents */}
            <section className="py-10 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2 className="mb-4 text-3xl font-bold text-amber-900">
                        Table of Contents
                    </h2>
                    <ul className="space-y-2">
                        <li>
                            <a
                                href="#history"
                                className="text-amber-700 hover:text-amber-900 underline">
                                History
                            </a>
                        </li>
                        <li>
                            <a
                                href="#temperament"
                                className="text-amber-700 hover:text-amber-900 underline">
                                Temperament
                            </a>
                        </li>
                        <li>
                            <a
                                href="#faq"
                                className="text-amber-700 hover:text-amber-900 underline">
                                FAQ
                            </a>
                        </li>
                    </ul>
                </div>
            </section>

            {/* History */}
            <section className="py-10 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2
                        id="history"
                        className="mb-6 text-3xl font-bold text-amber-900">
                        History
                    </h2>
                    <p className="mb-4 text-gray-700">
                        The breed originated in the United States.
                    </p>
                </div>
            </section>

            {/* Temperament */}
            <section className="py-10 px-4">
                <div className="max-w-7xl mx-auto">
                    <h2
                        id="temperament"
                        className="mb-6 text-3xl font-bold text-amber-900">
                        Temperament
                    </h2>
                    <ul className="mb-4 list-disc pl-6 space-y-2 text-gray-700">
                        <li>Friendly</li>
                        <li>Intelligent</li>
                        <li>Playful</li>
                    </ul>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-10 px-4">
                <div className="mx-auto max-w-4xl">
                    <h2
                        id="faq"
                        className="text-4xl font-bold mb-12">
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Frequently Asked Questions
                        </span>
                    </h2>

                    <div className="space-y-6">
                        <details className="group bg-slate-50 rounded-2xl p-6 border border-slate-200 cursor-pointer hover:border-blue-300 transition">
                            <summary className="flex items-start justify-between font-semibold text-slate-900 text-lg">
                                <span>How big do they get?</span>
                                <span className="group-open:rotate-180 transition">
                                    ▼
                                </span>
                            </summary>
                            <p className="mt-4 text-slate-700 leading-relaxed">
                                They can reach 25 pounds.
                            </p>
                        </details>
                    </div>
                </div>
            </section>
        </>
    );
}
```
