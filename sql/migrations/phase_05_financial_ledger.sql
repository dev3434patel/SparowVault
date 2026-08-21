-- Phase 5 — financial_events + financial_effects (run once per environment).

CREATE TABLE IF NOT EXISTS financial_events (
  id                     VARCHAR(191)  NOT NULL,
  user_id                VARCHAR(191)  NOT NULL,
  source_transaction_id  VARCHAR(191)  NOT NULL,
  event_type             VARCHAR(64)   NOT NULL,
  event_date             DATE          NOT NULL,
  amount_paise           BIGINT        NOT NULL,
  currency               CHAR(3)       NOT NULL DEFAULT 'INR',
  description            VARCHAR(512)  NOT NULL DEFAULT '',
  source                 VARCHAR(32)   NOT NULL DEFAULT 'transaction',
  status                 VARCHAR(32)   NOT NULL DEFAULT 'posted',
  reversal_of_event_id   VARCHAR(191)  NULL,
  created_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at             DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fin_event_txn (user_id, source_transaction_id),
  KEY idx_fin_ev_user_date (user_id, event_date),
  KEY idx_fin_ev_user_status (user_id, status),
  CONSTRAINT fk_fin_ev_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS financial_effects (
  id               VARCHAR(191)  NOT NULL,
  event_id         VARCHAR(191)  NOT NULL,
  user_id          VARCHAR(191)  NOT NULL,
  target_type      VARCHAR(32)   NOT NULL,
  target_id        VARCHAR(191)  NOT NULL,
  effect_direction ENUM('increase','decrease') NOT NULL,
  amount_paise     BIGINT        NOT NULL,
  component        VARCHAR(32)   NOT NULL,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fin_ef_event (event_id),
  KEY idx_fin_ef_user_target (user_id, target_type, target_id),
  CONSTRAINT fk_fin_ef_event FOREIGN KEY (event_id) REFERENCES financial_events(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fin_ef_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
