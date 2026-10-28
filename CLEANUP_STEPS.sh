#!/bin/bash
echo "🧹 Cleaning up repository - removing backend code from GitHub"
echo ""

# Remove apps-script from git tracking (but keep locally)
echo "1️⃣ Removing apps-script/ from git tracking..."
git rm -r --cached apps-script/

# Optionally remove documentation files (uncomment if you want)
# echo "2️⃣ Removing documentation files from git tracking..."
# git rm --cached API_DOCUMENTATION.md DEPLOYMENT.md TESTING.md USER_GUIDE.md PROJECT_SUMMARY.md HANDOFF.md

# Commit the changes
echo "2️⃣ Committing changes..."
git add .gitignore
git commit -m "chore: remove backend code from repository

- Remove apps-script/ directory (contains sensitive backend code)
- Update .gitignore to prevent future pushes
- Backend should be deployed manually to Google Apps Script"

# Push to GitHub
echo "3️⃣ Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Backend code removed from GitHub"
echo ""
echo "📝 Note: The apps-script/ folder still exists locally"
echo "    Deploy it manually to Google Apps Script (see DEPLOYMENT.md)"
