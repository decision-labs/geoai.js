# Makefile for GeoBase AI Documentation CI/CD

.PHONY: list-models check-videos help

# Default target
help:
	@echo "Available commands:"
	@echo "  list-models    - List all available models in the library"
	@echo "  check-videos   - Check for expected MP4 files per model"
	@echo "  help          - Show this help message"

# List all models available in the library
list-models:
	@echo "Available models in GeoBase AI library:"
	@echo "======================================"
	@grep -E 'task: "' ../src/registry.ts | sed 's/.*task: "\([^"]*\)".*/- \1/' | sort
	@echo ""
	@echo "Total models: $$(grep -c 'task: "' ../src/registry.ts)"

# Check for expected MP4 files per model
check-videos:
	@echo "Checking for expected MP4 files per model:"
	@echo "=========================================="
	@for model in $$(grep -E 'task: "' ../src/registry.ts | sed 's/.*task: "\([^"]*\)".*/\1/' | sort); do \
		case "$$model" in \
			"car-detection") video_file="../examples/next-geobase/public/video/car-detection-model.mp4" ;; \
			*) video_file="../examples/next-geobase/public/video/$${model}.mp4" ;; \
		esac; \
		if [ -f "$$video_file" ]; then \
			echo "✅ $$model.mp4 - Found"; \
		else \
			echo "❌ $$model.mp4 - Missing"; \
		fi; \
	done 