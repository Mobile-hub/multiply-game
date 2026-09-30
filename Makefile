.PHONY: open serve test check help

PORT ?= 8000
JS := $(wildcard js/*.js) $(wildcard tests/*.js)

help:
	@echo "make open   - open the game in the default browser"
	@echo "make serve  - serve the game on http://localhost:$(PORT)"
	@echo "make test   - run unit tests (node)"
	@echo "make check  - syntax-check every JS file (node)"

open:
	xdg-open index.html >/dev/null 2>&1 || open index.html

serve:
	python3 -m http.server $(PORT)

test:
	node tests/questions.test.js

check:
	@for f in $(JS); do node --check $$f || exit 1; done && echo "syntax OK"
