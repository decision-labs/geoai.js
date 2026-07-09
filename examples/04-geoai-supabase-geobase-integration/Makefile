.PHONY: help install dev build type-check migrate-push migrate-psql

.DEFAULT_GOAL := help

DB_URL ?=
MIGRATIONS_DIR := supabase/migrations
MIG_1 := $(MIGRATIONS_DIR)/20250914214029_create_geoai_tables.sql
MIG_2 := $(MIGRATIONS_DIR)/20250119000000_fix_geometry_multipolygon.sql
MIG_3 := $(MIGRATIONS_DIR)/20250119000002_add_search_path_to_functions.sql

help:
	@echo "Available targets:"
	@echo "  make install       Install dependencies"
	@echo "  make dev           Start dev server"
	@echo "  make type-check    Run TypeScript checks"
	@echo "  make build         Build project"
	@echo "  make migrate-push  Apply migrations with Supabase CLI (requires DB_URL)"
	@echo "  make migrate-psql  Apply migration files with psql (requires DB_URL)"

install:
	pnpm install

dev:
	pnpm dev

type-check:
	pnpm type-check

build:
	pnpm build

migrate-push:
	@test -n "$(DB_URL)" || (echo "DB_URL is required"; exit 1)
	supabase db push --db-url "$(DB_URL)" --dry-run
	supabase db push --db-url "$(DB_URL)" --include-all

migrate-psql:
	@test -n "$(DB_URL)" || (echo "DB_URL is required"; exit 1)
	psql "$(DB_URL)" -f "$(MIG_1)"
	psql "$(DB_URL)" -f "$(MIG_2)"
	psql "$(DB_URL)" -f "$(MIG_3)"
