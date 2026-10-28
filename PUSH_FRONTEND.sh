#!/bin/bash
echo "🚀 Pushing frontend changes to GitHub"
echo ""

# Add all frontend changes
echo "📦 Adding changes..."
git add frontend/
git add .gitignore

# Show what's being committed
echo ""
echo "📋 Changes to be committed:"
git status --short

# Commit
echo ""
echo "💾 Committing..."
git commit -m "feat: update frontend for deployment v1.0.0

- Update version to 1.0.0
- Improve page title and meta tags
- Add frontend README with deployment instructions
- Ready for production deployment

Changes:
- frontend/package.json: version bump to 1.0.0
- frontend/index.html: better title and meta tags
- frontend/README.md: deployment documentation
- .gitignore: exclude backend code"

# Push to GitHub
echo ""
echo "⬆️  Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Frontend pushed successfully"
echo ""
echo "🌐 Next steps:"
echo "   1. Go to Vercel/Cloudflare"
echo "   2. It should auto-deploy the new version"
echo "   3. Check deployment logs"
echo ""
