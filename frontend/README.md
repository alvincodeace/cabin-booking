# Cabin Booking System - Frontend

Production-ready React application for the Cabin Booking System.

## Version
**v1.0.0** - Production Release

## Quick Start

### Development
```bash
npm install
cp .env.example .env
# Edit .env and add your VITE_APPS_SCRIPT_URL
npm run dev
```

### Production Build
```bash
npm run build
# Output: dist/ folder
```

## Environment Variables

Create a `.env` file:
```
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

## Deployment

### Vercel
1. Connect GitHub repository
2. Set Root Directory: `frontend`
3. Set Build Command: `npm run build`
4. Set Output Directory: `dist`
5. Add environment variable: `VITE_APPS_SCRIPT_URL`

### Cloudflare Pages
1. Connect GitHub repository
2. Set Root Directory: `frontend`
3. Set Build Command: `npm run build`
4. Set Build Output Directory: `dist`
5. Add environment variable: `VITE_APPS_SCRIPT_URL`

## Tech Stack
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Features
✅ Real-time cabin availability  
✅ Booking with temporary locks  
✅ Role-based access control  
✅ Admin dashboard  
✅ Responsive design  

---

**Last Updated**: v1.0.0 (September 2026)
