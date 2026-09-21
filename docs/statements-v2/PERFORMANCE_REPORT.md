# Performance notes (ST-17)

Existing limits retained (not loosened):

- PDF 20 MB / 60 pages
- OCR 12 pages
- 2000 rows
- 1 MiB reviewed JSON body

Native extraction remains first; OCR is selective. Optional local Python worker is deferred.
Hardware timing budgets require measurement on target devices before changing limits.
