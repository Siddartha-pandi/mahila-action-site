.PHONY: default dev seed build start clean install

NPM ?= npm

default: dev

# Start Next.js web server
dev:
	$(NPM) run dev

# Database Seed
seed:
	$(NPM) run seed:pg

# Production Build & Run
build:
	$(NPM) run build

start:
	$(NPM) run start

# Clean Cache
clean:
	$(NPM) run clean:all

# Dependencies
install:
	$(NPM) install
