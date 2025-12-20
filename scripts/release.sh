#!/bin/bash
# Release script for Sendly CLI
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

VERSION_TYPE=${1:-patch}

echo "🚀 Releasing Sendly CLI..."

# Ensure we're in the right directory
cd "$(dirname "$0")/.."

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo "❌ Error: Uncommitted changes detected. Please commit first."
  exit 1
fi

# Build
echo "📦 Building..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

# Bump version
echo "📝 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 New version: $NEW_VERSION"

# Generate oclif manifest
echo "📋 Generating manifest..."
npx oclif manifest

# Publish to npm
echo "🌐 Publishing to npm..."
npm publish --access public

# Calculate SHA256 for Homebrew
echo "🍺 Calculating SHA256 for Homebrew..."
TARBALL_URL="https://registry.npmjs.org/@sendly/cli/-/cli-${NEW_VERSION}.tgz"
SHA256=$(curl -sL "$TARBALL_URL" | shasum -a 256 | cut -d' ' -f1)
echo "SHA256: $SHA256"

# Update Homebrew formula
echo "📝 Updating Homebrew formula..."
sed -i '' "s|url \".*\"|url \"$TARBALL_URL\"|" homebrew/sendly.rb
sed -i '' "s|sha256 \".*\"|sha256 \"$SHA256\"|" homebrew/sendly.rb

# Commit and tag
echo "📌 Committing and tagging..."
git add .
git commit -m "chore(cli): release v$NEW_VERSION"
git tag "cli-v$NEW_VERSION"

echo "✅ Released @sendly/cli v$NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Push changes: git push && git push --tags"
echo "2. Update Homebrew tap with the new formula"
echo "3. Create GitHub release with changelog"
