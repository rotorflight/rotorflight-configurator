##
## Makefile for Rotorflight Configurator
##


.PHONY: all apps debug release init clean realclean distclean


all: apps

apps:
	yarn gulp apps

debug:
	yarn gulp debug

release:
	yarn gulp release

init:
	yarn install


## Cleaning

clean:
	rm -fr apps debug release

realclean: clean
	rm -fr dist

distclean: realclean
	rm -fr cache node_modules

