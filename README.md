# Cortify Landing Page

AI-powered communication intelligence platform landing page.

## Overview

This is the public-facing landing page for Cortify - showcasing features, collecting waitlist signups, and driving downloads. The landing page connects to a production API for waitlist management.

## Tech Stack

- **Frontend**: Vite + TypeScript
- **Styling**: Tailwind CSS
- **Runtime**: Bun
- **API**: Connects to production backend via environment variables

## Project Structure

```
cortify-landing-page/
├── .env                    # Production API configuration
├── .env.example           # Environment template
├── index.html             # Main landing page
├── vite.config.ts         # Vite configuration
├── package.json           # Dependencies
├── tailwind.config.js     # Tailwind configuration
├── postcss.config.js      # PostCSS configuration
├── tsconfig.json          # TypeScript configuration
│
├── public/                # Static assets
│   ├── components/        # Reusable HTML components
│   └── images/           # Images and icons
│
└── src/                   # Source code
    ├── scripts/           # TypeScript modules
    │   └── main.ts       # Main application logic
    ├── styles/           # CSS files
    │   └── main.css      # Main stylesheet
    └── vite-env.d.ts     # Vite environment types
```

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd discourse.ai_landing_page
```

2. Install dependencies:
```bash
bun install
```

3. Configure environment:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your production API URL
# VITE_API_BASE_URL=https://your-production-api-url.com/api
```

4. Start development server:
```bash
bun run dev
```

The landing page will be available at `http://localhost:5173`

## Development Commands

```bash
bun run dev      # Start development server (port 5173)
bun run build    # Build for production
bun run preview  # Preview production build
bun run clean    # Remove node_modules
```

## Environment Variables

The landing page requires the following environment variable:

- `VITE_API_BASE_URL` - Production API endpoint for waitlist functionality

Example `.env`:
```env
VITE_API_BASE_URL=https://api.cortify.ai/api
```

## Features

- **Dark/Light Theme Toggle** - User-selectable theme with localStorage persistence
- **Waitlist Signup** - Name + email collection with Discord notifications
- **Responsive Design** - Mobile-first design with Tailwind CSS
- **Modern UI** - Glassmorphism effects, gradients, and smooth animations
- **SEO Optimized** - Meta tags and semantic HTML

## Deployment

The landing page is deployed to Coolify. Build output is in the `dist/` folder:

```bash
bun run build
```

The build process:
1. TypeScript compilation (`tsc`)
2. Vite production build
3. Output to `dist/` directory

## Project Notes

- This repository contains **only the landing page frontend**
- The backend API is located in a separate repository at `D:\Discourse\discourse-web-app`
- Waitlist data is sent to the production API via the configured `VITE_API_BASE_URL`
- Discord notifications are handled by the backend API

## License

All rights reserved © 2026 Cortify
