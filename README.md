# Very Little Text

Very Little Text is an **AI-driven microfiction site generator** built with Node.js. Feed it a JSON file of stories and it outputs a static website packed with structured data for search engines.

## Features
- Generates SEO-friendly pages with JSON-LD and Open Graph tags
- Designed for publishing bite-size, AI-crafted stories
- Minimal Node.js build script with no runtime dependencies

## Getting Started
### Prerequisites
- [Node.js](https://nodejs.org/) 18 or later

### Build the site
```bash
npm run build
```
This creates the `docs/` directory with the homepage, individual episodes, RSS feed, and sitemap.

### Run tests
```bash
npm test
```
The tests verify that generated pages exist and include structured data.

## Project Structure
- `data/stories.json` – source stories and site metadata
- `generate.mjs` – converts `stories.json` into static HTML
- `docs/` – output folder ready to deploy to any static host

## SEO for AI Microfiction
Each episode page embeds JSON-LD schema and descriptive metadata so search engines and AI tools can easily index the stories. The concise microfiction format makes content digestible for humans and machines alike.

## License
Distributed under the MIT License. See `LICENSE` for more information.
