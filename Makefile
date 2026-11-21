# ChoreTrack: run `make` (or `make help`) to list every target.
#
# Recipes must be indented with tabs; that's a Make rule, not a style choice.

SHELL := /usr/bin/env bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help
MAKEFLAGS += --no-print-directory

# ---- Settings (override on the command line, e.g. `make start PORT=8080`) ----
PORT     ?= 3030
DATA_DIR ?= ./data
WHAT     ?= all
CHANNEL  ?= release
VERSION  ?= auto
COMPOSE  ?= docker compose
SERVICE  := choretrack
CHANGIE  := npx --no-install changie

C_RESET := \033[0m
C_BOLD  := \033[1m
C_DIM   := \033[2m
C_CYAN  := \033[36m
C_GREEN := \033[32m

say = printf "$(C_CYAN)▸$(C_RESET) $(C_BOLD)%s$(C_RESET)\n" $(1)

##@ General

.PHONY: help
help: ## Show this help
	@printf "\n  $(C_BOLD)✅ ChoreTrack$(C_RESET) $(C_DIM)%s$(C_RESET)\n" "$$(node -p '"v" + require("./package.json").version' 2>/dev/null)"
	@awk 'BEGIN {FS = ":.*##"} \
		/^##@/ { printf "\n  $(C_BOLD)%s$(C_RESET)\n", substr($$0, 5) } \
		/^[a-zA-Z0-9_-]+:.*?## / { printf "    $(C_CYAN)%-18s$(C_RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@printf "\n  $(C_DIM)Settings: PORT=$(PORT) WHAT=$(WHAT) CHANNEL=$(CHANNEL) VERSION=$(VERSION)$(C_RESET)\n\n"

.PHONY: version
version: ## Print the current version
	@node -p '"v" + require("./package.json").version'

##@ Run it natively (Node.js 22+)

.PHONY: install
install: ## Install dependencies exactly as locked
	@$(call say,"Installing dependencies")
	npm ci

.PHONY: build
build: ## Build the web app and server into dist/
	@$(call say,"Building")
	npm run build

.PHONY: start
start: ## Start the built server (PORT=3030)
	DATA_DIR=$(DATA_DIR) node dist/server/index.js --port $(PORT)

.PHONY: dev
dev: ## Start with hot reload (API on PORT, web on :5173)
	PORT=$(PORT) npm run dev

.PHONY: export
export: ## Print data as JSON (WHAT=chores|users|scores|all)
	@DATA_DIR=$(DATA_DIR) node dist/server/index.js --export $(WHAT)

.PHONY: update
update: ## Update to the latest release (CHANNEL=main: latest main), rebuild, restart
	@$(MAKE) pull
	@$(MAKE) install build
	@$(MAKE) restart

.PHONY: restart
restart: ## Restart the systemd service or launchd agent, if installed
	@if command -v systemctl >/dev/null && systemctl list-unit-files "$(SERVICE).service" 2>/dev/null | grep -q "$(SERVICE)"; then \
		$(call say,"Restarting systemd service"); sudo systemctl restart "$(SERVICE)"; \
	elif command -v launchctl >/dev/null && launchctl list 2>/dev/null | grep -q com.choretrack.server; then \
		$(call say,"Restarting launchd agent"); launchctl kickstart -k "gui/$$(id -u)/com.choretrack.server"; \
	else \
		printf "$(C_DIM)No service found. If ChoreTrack runs in a terminal, restart it with: make start$(C_RESET)\n"; \
	fi

##@ Run it with Docker

.PHONY: deploy
deploy: ## Build the image and start the container in the background
	@$(call say,"Building and starting the container")
	$(COMPOSE) up -d --build
	@printf "$(C_GREEN)✔$(C_RESET) ChoreTrack is up: http://localhost:3030\n"

.PHONY: docker-update
docker-update: ## Update to the latest release (CHANNEL=main: latest main), redeploy
	@$(MAKE) pull
	@$(MAKE) deploy

.PHONY: logs
logs: ## Follow the container's logs
	$(COMPOSE) logs -f $(SERVICE)

.PHONY: stop
stop: ## Stop the container (data is kept)
	$(COMPOSE) down

.PHONY: docker-export
docker-export: ## Print data as JSON from the container (WHAT=...)
	@$(COMPOSE) exec -T $(SERVICE) node dist/server/index.js --export $(WHAT)

##@ Develop

.PHONY: check
check: ## Typecheck and run the unit/API tests
	npm run typecheck
	npm test

.PHONY: e2e
e2e: build ## Run browser tests at phone, tablet and desktop sizes
	npm run test:e2e

.PHONY: clean
clean: ## Remove build output and test artefacts
	rm -rf ./dist ./test-results ./playwright-report ./.e2e-data

##@ Release (see docs/releasing.md)

.PHONY: change
change: ## Record a change for the next release (interactive)
	$(CHANGIE) new

.PHONY: changelog-preview
changelog-preview: ## Preview the next release notes (VERSION=auto)
	@$(CHANGIE) batch $(VERSION) --dry-run

.PHONY: release
release: ## Batch changes into VERSION=auto|major|minor|patch|vX.Y.Z and commit
	@test -z "$$(git status --porcelain)" || { echo "Commit or stash your changes first."; exit 1; }
	@ls .changes/unreleased/*.yaml >/dev/null 2>&1 || { echo "No unreleased changes. Add some with: make change"; exit 1; }
	$(CHANGIE) batch $(VERSION)
	$(CHANGIE) merge
	npm install --package-lock-only --ignore-scripts --no-audit --no-fund >/dev/null
	@v="$$($(CHANGIE) latest)"; \
		git add CHANGELOG.md .changes package.json package-lock.json; \
		git commit --quiet -m "Release $$v"; \
		$(call say,"Committed release $$v. Merge it into main, then run: make tag")

.PHONY: tag
tag: ## Tag the latest release on main and push it (publishes the GitHub release)
	@test "$$(git rev-parse --abbrev-ref HEAD)" = main || { echo "Switch to main first: git switch main && git pull"; exit 1; }
	@test -z "$$(git status --porcelain)" || { echo "Working tree isn't clean."; exit 1; }
	@v="$$($(CHANGIE) latest)"; \
		if git rev-parse -q --verify "refs/tags/$$v" >/dev/null; then echo "$$v is already tagged."; exit 1; fi; \
		git tag -a "$$v" -F ".changes/$$v.md" --cleanup=verbatim; \
		git push origin "$$v"; \
		printf "$(C_GREEN)✔$(C_RESET) Tagged and pushed %s\n" "$$v"

# ---- Internal ----

.PHONY: pull
pull:
	@git fetch --tags --quiet origin
	@if [ "$(CHANNEL)" = main ]; then \
		$(call say,"Updating to the latest main"); \
		git switch --quiet main && git pull --ff-only --quiet; \
	else \
		latest="$$(git tag --list 'v*' --sort=-v:refname | head -n1)"; \
		if [ -z "$$latest" ]; then \
			$(call say,"No releases tagged yet; following main"); \
			git switch --quiet main && git pull --ff-only --quiet; \
		else \
			$(call say,"Updating to release $$latest"); \
			git -c advice.detachedHead=false checkout --quiet "$$latest"; \
		fi; \
	fi
