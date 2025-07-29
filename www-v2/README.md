# Lorm Website

The official website and documentation for Lorm - a powerful, type-safe mobile framework for mobile applications.

## Built With

- **Next.js 15** - React framework for production
- **Fumadocs** - Beautiful documentation framework
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe JavaScript
- **Lucide React** - Beautiful icons

## Features

- 🎨 Modern, responsive design inspired by tRPC and GitHub
- 📚 Comprehensive documentation with Fumadocs
- 🌙 Dark/light mode support
- ⚡ Fast page loads with Next.js optimizations
- 🔍 Built-in search functionality
- 📱 Mobile-first responsive design
- ♿ Accessibility-first approach

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── docs/           # Documentation pages
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage
├── components/         # Reusable components
│   ├── ui/            # UI components (Button, Card, etc.)
│   ├── code-block.tsx # Syntax highlighting
│   ├── feature-grid.tsx
│   └── stats-section.tsx
└── lib/               # Utility functions
    └── utils.ts
```

## Customization

### Styling

The website uses Tailwind CSS with custom design tokens. Key files:

- `tailwind.config.js` - Tailwind configuration with Fumadocs preset
- `src/app/globals.css` - Global styles and custom CSS

### Content

- Homepage content: `src/app/page.tsx`
- Documentation: `src/app/docs/`
- Navigation: `src/app/layout.config.tsx`

### Components

All UI components are built with:
- Radix UI primitives for accessibility
- Class Variance Authority (CVA) for variants
- Tailwind CSS for styling

## Deployment

The website is optimized for deployment on:

- **Vercel** (recommended)
- **Netlify**
- **Railway**
- Any Node.js hosting platform

### Build for Production

```bash
pnpm build
```

This creates an optimized production build in the `.next` directory.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Apache License - see the [LICENSE](../../LICENSE) file for details.