# PDF.js rendered review

Fixture: `tests/fixtures/statements/multipage.pdf`
Engine: Chromium + pdfjs-dist viewport/overlay (loopback asset server)

- Cases: 12
- FAIL: 0
- Rotations in fixture: recorded from page.rotate (parser still rejects non-zero at ingest)
- Zoom grid: 0.75, 1, 1.25, 1.5, 2
- Page switches + nested scroll covered

Row-band provenance remains honest when field tokens are absent.
