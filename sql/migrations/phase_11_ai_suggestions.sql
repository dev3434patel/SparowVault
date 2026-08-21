-- Phase 11 — Explainable AI suggestions (server shadow / analytics).
-- Client may store the same shape in Dexie; JSON holds deterministic inputs only.

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id                        VARCHAR(191)  NOT NULL,
  user_id                   VARCHAR(191)  NOT NULL,
  dedupe_key                VARCHAR(191)  NOT NULL DEFAULT '' COMMENT 'stable idempotency key per engine rule',
  suggestion_type           VARCHAR(32)   NOT NULL,
  severity                  VARCHAR(16)   NOT NULL DEFAULT 'info',
  title                     VARCHAR(200)  NOT NULL DEFAULT '',
  reason                    VARCHAR(2000) NOT NULL DEFAULT '' COMMENT 'deterministic explanation',
  calculation_inputs_json   JSON          NOT NULL COMMENT 'facts passed to UI / optional AI rewriter',
  recommended_action        VARCHAR(500)  NOT NULL DEFAULT '',
  expected_impact_json      JSON          NULL,
  confidence_score          DECIMAL(4,3)  NOT NULL DEFAULT 0.700 COMMENT '0–1',
  source_module             VARCHAR(64)   NOT NULL DEFAULT 'suggestionEngine.v1',
  status                    VARCHAR(24)   NOT NULL DEFAULT 'active',
  history_json              JSON          NULL COMMENT 'created/viewed/dismissed/snoozed/action_taken/expired events',
  ai_explanation            VARCHAR(2000) NULL COMMENT 'optional LLM copy; must not alter numbers',
  remind_at                 DATETIME      NULL,
  expires_at                DATETIME      NOT NULL,
  created_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at                DATETIME      NULL,
  PRIMARY KEY (id),
  KEY idx_ai_sug_user_status (user_id, status, deleted_at),
  KEY idx_ai_sug_user_dedupe (user_id, dedupe_key),
  CONSTRAINT fk_ai_suggestions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Phase 11 rule-backed suggestions; AI text is explanatory only';
