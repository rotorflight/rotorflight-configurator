##
## Makefile for Rotorflight Configurator
##

# Default version number
SEMVER ?= 2.0.0-devel


## Rules

.PHONY: all init apps debug release version clean realclean distclean

all: apps

init:
	yarn install

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

