# @quaver/ui

Shared UI component library built with shadcn/ui and Tailwind CSS for Quaver applications.

## Features

- **shadcn/ui Components** - Full set of accessible, customizable components
- **AI Elements** - Specialized components for AI chat interfaces (prompt input, code blocks, web preview)
- **Dark Mode** - Built-in theme support via next-themes
- **Tailwind CSS v4** - Modern CSS with PostCSS integration

## Installation

```bash
bun add @quaver/ui
```

## Usage

### Import Styles

In your app's root layout:

```tsx
import "@quaver/ui/globals.css";
```

### Import Components

```tsx
// shadcn components
import { Button } from "@quaver/ui/components/shadcn/button";
import { Card } from "@quaver/ui/components/shadcn/card";
import { Input } from "@quaver/ui/components/shadcn/input";

// AI Elements
import { PromptInput } from "@quaver/ui/components/ai-elements/prompt-input";
import { WebPreview } from "@quaver/ui/components/ai-elements/web-preview";
import { CodeBlock } from "@quaver/ui/components/ai-elements/code-block";

// Utilities
import { cn } from "@quaver/ui/lib/utils";
```

## Structure

```
src/
├── components/
│   ├── shadcn/           # 50+ shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── ai-elements/      # AI chat UI components
│   │   ├── prompt-input.tsx
│   │   ├── web-preview.tsx
│   │   ├── code-block.tsx
│   │   ├── message.tsx
│   │   └── ...
│   └── mode-toggle.tsx   # Theme toggle
├── hooks/
│   └── use-mobile.ts
├── lib/
│   └── utils.ts          # cn() and other utilities
└── styles/
    └── globals.css       # Tailwind + theme variables
```

## Components

### shadcn/ui

Full set of components from [shadcn/ui](https://ui.shadcn.com):

| Component | Description |
|-----------|-------------|
| `button` | Primary action buttons |
| `card` | Content containers |
| `input` | Text input fields |
| `textarea` | Multi-line text input |
| `select` | Dropdown selection |
| `dialog` | Modal dialogs |
| `dropdown-menu` | Contextual menus |
| `form` | Form handling with react-hook-form |
| `sonner` | Toast notifications |
| ... | 50+ more components |

### AI Elements

Specialized components for AI-powered interfaces:

| Component | Description |
|-----------|-------------|
| `prompt-input` | Chat input with attachments, speech, and submit |
| `web-preview` | Sandboxed iframe with navigation |
| `code-block` | Syntax-highlighted code with copy |
| `message` | Chat message bubbles |
| `conversation` | Message thread container |
| `reasoning` | Chain of thought display |
| `artifact` | Generated content display |
| `canvas` | Visual editing canvas |

## Adding New Components

Use shadcn CLI from the app that uses this package:

```bash
cd apps/app
bunx shadcn@latest add <component>
```

Components are installed to `packages/ui/src/components/shadcn/`.

## Exports

| Import Path | Description |
|-------------|-------------|
| `@quaver/ui/globals.css` | Global styles and CSS variables |
| `@quaver/ui/lib/*` | Utility functions |
| `@quaver/ui/hooks/*` | React hooks |
| `@quaver/ui/components/shadcn/*` | shadcn/ui components |
| `@quaver/ui/components/ai-elements/*` | AI interface components |

## Development

```bash
# Type check
bun run check-types

# Lint
bun run check

# Fix lint issues
bun run fix
```

## License

Private - Internal use only
