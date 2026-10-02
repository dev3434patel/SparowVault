# MODEL_DECISION (ST-14)

| Decision | Value |
|----------|--------|
| Foundation model pretraining | Not in MVP |
| Narrow fine-tuning | Deferred until labelled error study shows benefit |
| Remote PDF AI | Rejected (privacy ADR ST-PRIV-001) |
| Local PaddleOCR worker | Deferred |
| Current OCR | Tesseract.js selective, native-first |
| AI explanations | Only over validated ledger facts if used; deterministic baselines remain SoT |

A non-improving model must not be added to the product.
