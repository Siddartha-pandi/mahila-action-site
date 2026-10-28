.PHONY: install run dev build start seed seed-wait

NPM ?= npm

install:
	$(NPM) install

run: dev

dev:
	$(NPM) run dev

build:
	$(NPM) run build

start:
	$(NPM) run start

seed:
	$(NPM) run seed:pg

seed-wait:
	$(NPM) run seed:pg:wait
