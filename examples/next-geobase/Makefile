# Variables
REGISTRY_PATH = ../../src/registry.ts
TASKS_DIR = src/app/tasks
INDEX_PAGE = src/app/page.tsx
TEMP_DIR = /tmp

# Common commands
GREP_TASK = grep -o 'task: "[^"]*"' $(REGISTRY_PATH) | sed 's/task: "//' | sed 's/"//'
GREP_CODE_TASK = grep -r "task:" $(TASKS_DIR)/ --include="*.tsx" | sed 's/.*task: "//' | sed 's/".*//'
GREP_LINKS = grep -o 'href="/tasks/[^"]*"' $(INDEX_PAGE) | sed 's/href="\/tasks\///' | sed 's/"//'
FIND_ROUTES = find $(TASKS_DIR) -type d -name "*" | sed 's|$(TASKS_DIR)/||' | sed 's|/||'

.PHONY: help check-routes check-task-names check-links check-registry check-all

# Default target
help:
	@echo "Available targets:"
	@echo "  check-routes      - Check if route directories match registry task names"
	@echo "  check-task-names  - Check if task names in code match registry"
	@echo "  check-links       - Check if index page links match actual routes"
	@echo "  check-registry    - Show all tasks from registry.ts"
	@echo "  check-all         - Run all checks"

# Get all task names from registry.ts
check-registry:
	@echo "=== Tasks from registry.ts ==="
	@$(GREP_TASK) | sort

# Check if route directories match registry task names
check-routes:
	@echo "=== Checking route directories ==="
	@echo "Expected routes (from registry):"
	@$(GREP_TASK) | sort > $(TEMP_DIR)/expected_routes.txt
	@cat $(TEMP_DIR)/expected_routes.txt
	@echo ""
	@echo "Actual route directories:"
	@$(FIND_ROUTES) | sort > $(TEMP_DIR)/actual_routes.txt
	@cat $(TEMP_DIR)/actual_routes.txt
	@echo ""
	@echo "=== Route Directory Analysis ==="
	@echo "Routes that should exist but don't:"
	@comm -23 $(TEMP_DIR)/expected_routes.txt $(TEMP_DIR)/actual_routes.txt || true
	@echo ""
	@echo "Routes that exist but aren't in registry:"
	@comm -13 $(TEMP_DIR)/expected_routes.txt $(TEMP_DIR)/actual_routes.txt || true
	@echo ""
	@echo "Routes that match registry:"
	@comm -12 $(TEMP_DIR)/expected_routes.txt $(TEMP_DIR)/actual_routes.txt || true

# Check if task names in code files match registry
check-task-names:
	@echo "=== Checking task names in code files ==="
	@echo "Task names found in code files:"
	@$(GREP_CODE_TASK) | sort | uniq
	@echo ""
	@echo "=== Task Name Analysis ==="
	@echo "Tasks in code that match registry:"
	@$(GREP_CODE_TASK) | sort | uniq > $(TEMP_DIR)/code_tasks.txt
	@$(GREP_TASK) | sort > $(TEMP_DIR)/registry_tasks.txt
	@comm -12 $(TEMP_DIR)/code_tasks.txt $(TEMP_DIR)/registry_tasks.txt || true
	@echo ""
	@echo "Tasks in code that are NOT in registry:"
	@comm -23 $(TEMP_DIR)/code_tasks.txt $(TEMP_DIR)/registry_tasks.txt || true

# Check if index page links match actual routes
check-links:
	@echo "=== Checking index page links ==="
	@echo "Links found in index page:"
	@$(GREP_LINKS) | sort
	@echo ""
	@echo "=== Link Analysis ==="
	@echo "Links that match actual routes:"
	@$(GREP_LINKS) | sort > $(TEMP_DIR)/index_links.txt
	@$(FIND_ROUTES) | sort > $(TEMP_DIR)/actual_routes.txt
	@comm -12 $(TEMP_DIR)/index_links.txt $(TEMP_DIR)/actual_routes.txt || true
	@echo ""
	@echo "Links that don't match any route:"
	@comm -23 $(TEMP_DIR)/index_links.txt $(TEMP_DIR)/actual_routes.txt || true

# Check for any old route directories that should be removed
check-old-routes:
	@echo "=== Checking for old route directories ==="
	@echo "Looking for old route names that should be renamed:"
	@if ls $(TASKS_DIR)/ | grep -E "(land-cover$$|solar-panel$$|oil-storage-tank$$|building-footprint$$|zero-shot$$)" > /dev/null 2>&1; then \
		echo "Found old route directories:"; \
		ls $(TASKS_DIR)/ | grep -E "(land-cover$$|solar-panel$$|oil-storage-tank$$|building-footprint$$|zero-shot$$)"; \
	else \
		echo "No old route directories found ✓"; \
	fi

# Check for empty route directories
check-empty-routes:
	@echo "=== Checking for empty route directories ==="
	@for dir in $(TASKS_DIR)/*/; do\
		if [ ! -f "$$dir/page.tsx" ]; then \
			echo "Empty directory: $$dir"; \
		fi; \
	done

# Run all checks
check-all: check-registry check-routes check-task-names check-links check-old-routes check-empty-routes
	@echo ""
	@echo "=== Summary ==="
	@echo "✓ Registry tasks: $$(grep -c 'task:' $(REGISTRY_PATH))"
	@echo "✓ Route directories: $$(find $(TASKS_DIR) -type d -name "*" | wc -l | tr -d ' ')"
	@echo "✓ Index page links: $$(grep -c 'href="/tasks/' $(INDEX_PAGE))"
	@echo ""
	@echo "All checks completed!"



# Quick status check
status:
	@echo "=== Quick Status Check ==="
	@echo "Registry tasks: $$(grep -c 'task:' $(REGISTRY_PATH))"
	@echo "Route directories: $$(find $(TASKS_DIR) -type d -name "*" | wc -l | tr -d ' ')"
	@echo "Index page links: $$(grep -c 'href="/tasks/' $(INDEX_PAGE))"
	@echo ""
	@echo "Expected vs Actual routes:"
	@$(GREP_TASK) | sort > $(TEMP_DIR)/expected.txt
	@$(FIND_ROUTES) | sort > $(TEMP_DIR)/actual.txt
	@if cmp -s $(TEMP_DIR)/expected.txt $(TEMP_DIR)/actual.txt; then \
		echo "✓ All routes match registry!"; \
	else \
		echo "✗ Routes don't match registry"; \
		echo "Missing: $$(comm -23 $(TEMP_DIR)/expected.txt $(TEMP_DIR)/actual.txt | wc -l)"; \
		echo "Extra: $$(comm -13 $(TEMP_DIR)/expected.txt $(TEMP_DIR)/actual.txt | wc -l)"; \
	fi
	@echo ""
	@echo "Note: Temporary files created in /tmp/ are automatically cleaned up" 