##
## Makefile for Rotorflight Configurator
##

# Default version number
SEMVER ?= 0.0.0


## Rules

.PHONY: all init apps debug release version clean realclean distclean

all: apps

init:
	yarn install

	$(MAKE) fontawesome

.PHONY: fontawesome
fontawesome:
	rm -fr public/fontawesome
	mkdir -p public/fontawesome/css
	mkdir -p public/fontawesome/webfonts
	cp ./node_modules/@fortawesome/fontawesome-free/css/all.min.css public/fontawesome/css/all.min.css
	cp ./node_modules/@fortawesome/fontawesome-free/webfonts/fa-solid* public/fontawesome/webfonts

apps:
	yarn gulp apps

debug:
	yarn gulp debug

release:
	yarn gulp release

version:
	sed -i -e 's/\("version":[ \t]*\)".*"/\1"$(SEMVER)"/' package.json


## Cleaning

clean:
	rm -fr apps debug release

realclean: clean
	rm -fr dist

distclean: realclean
	rm -fr cache node_modules

