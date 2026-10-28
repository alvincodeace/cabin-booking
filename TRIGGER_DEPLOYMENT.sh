#!/bin/bash
echo "🔄 Triggering fresh deployment..."
echo ""

# Add the new file
git add frontend/public/version.txt

# Commit
git commit -m "chore: trigger fresh deployment after making repo public

- Add version.txt file
- Force new deployment on Vercel"

# Push
git push origin main

echo ""
echo "✅ Pushed! New deployment should start now."
echo ""
