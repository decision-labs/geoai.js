.PHONY: release bump-version publish help

# Default target - show help
.DEFAULT_GOAL := help

# Show help
help:
	@echo "🚀 GeoAI Release Management"
	@echo ""
	@echo "Available commands:"
	@echo "  make bump-version  - Bump version locally (prompts for version & changelog)"
	@echo "  make publish       - Publish to npm and push to remote"
	@echo "  make release       - Full release process (bump-version + publish)"
	@echo "  make help          - Show this help message"
	@echo ""
	@echo "Usage examples:"
	@echo "  make bump-version  # Prepare release locally"
	@echo "  make publish       # Publish when ready"
	@echo "  make release       # Complete release in one step"

# Bump version locally - prompts for version and changelog details
bump-version:
	@echo "🚀 Starting local version upgrade..."
	@echo ""
	@read -p "Enter version (e.g., 1.0.0-rc.3): " version; \
	read -p "Enter changelog entry (brief description): " changelog; \
	echo ""; \
	echo "📝 Updating version to $$version..."; \
	sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$$version\"/" package.json; \
	echo "📝 Updating README CDN links..."; \
	sed -i '' "s/geoai@[^/]*\//geoai@$$version\//g" README.md; \
	echo "📝 Adding changelog entry..."; \
	echo "" >> CHANGELOG.md; \
	echo "## [$$version] - $$(date +%Y-%m-%d)" >> CHANGELOG.md; \
	echo "" >> CHANGELOG.md; \
	echo "### Release Candidate" >> CHANGELOG.md; \
	echo "- $$changelog" >> CHANGELOG.md; \
	echo "" >> CHANGELOG.md;

build-version:
	echo "🔨 Building and testing...";
	@echo ""
	@read -p "Enter version (e.g., 1.0.0-rc.3): " version; \
	pnpm install --frozen-lockfile && pnpm run build && pnpm run test:build; \
	echo "🏷️  Creating git commit..."; \
	git add package.json README.md CHANGELOG.md; \
	git commit -m "chore(release): $$version"; \
	git tag v$$version; \
	echo ""; \
	echo "✅ Local upgrade to $$version completed! Run 'make publish' to publish."

# Publish to npm and push to remote
publish:
	@echo "📦 Publishing to npm..."; \
	pnpm run publish:pkg; \
	echo "📤 Pushing to remote..."; \
	git push && git push --tags; \
	echo ""; \
	echo "✅ Published successfully!"

# Full release process (bump-version + publish)
release: bump-version publish
