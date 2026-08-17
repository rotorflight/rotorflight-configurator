# ========================================
# VARIABLES
# ========================================

.DELETE_ON_ERROR:
.ONESHELL:
.SHELLFLAGS       := -eu -c
.DEFAULT_GOAL     := help

SEMVER            ?= 0.0.0

# ========================================
# RULES
# ========================================

.PHONY: init
init: ## Install development dependencies
	pnpm install --frozen-lockfile
	"$(MAKE)" fontawesome

.PHONY: fontawesome
fontawesome:
	rm -fr public/fontawesome
	mkdir -p public/fontawesome/css
	mkdir -p public/fontawesome/webfonts
	cp ./node_modules/@fortawesome/fontawesome-free/css/all.min.css public/fontawesome/css/all.min.css
	cp ./node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid* public/fontawesome/webfonts

.PHONY: version
version: ## Set application version to $SEMVER
	sed -i -e 's|^\(  "version": *\)".*"|\1"$(SEMVER)"|' package.json

.PHONY: dev-server
dev-server: ## Run development server
	pnpm vite

.PHONY: dev-client
dev-client: ## Run development client
	pnpm gulp dev_client

.PHONY: debug
debug: ## Run debug build
	pnpm gulp debug

.PHONY: android
android: ## Run android debug build
	pnpm gulp debug --platform android

.PHONY: clean
clean: ##
	rm -fr app bundle redist

.PHONY: realclean
realclean: clean
	rm -fr nwjs_cache

.PHONY: distclean
distclean: realclean
	rm -fr node_modules

# ========================================
# HELP
# ========================================

blue      := $(shell tput setaf 4 2>/dev/null)
grey500   := $(shell tput setaf 244 2>/dev/null)
grey300   := $(shell tput setaf 240 2>/dev/null)
bold      := $(shell tput bold 2>/dev/null)
underline := $(shell tput smul 2>/dev/null)
reset     := $(shell tput sgr0 2>/dev/null)

.PHONY: help
help: ## Display this help
	@printf '\n'
	@printf '  $(underline)$(grey500)Targets$(reset)\n\n'
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ \
		{ printf "  $(grey300)make$(reset) $(bold)$(blue)%-20s$(reset) $(grey500)%s$(reset)\n", $$1, $$2 }' \
		$(MAKEFILE_LIST)
	@printf '\n'
