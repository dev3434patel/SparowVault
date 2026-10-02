-- Branch masters can store a public URL. Safe to re-run only when the column is absent.
SET @has_url := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'company_branches'
    AND COLUMN_NAME = 'url'
);
SET @sql := IF(@has_url = 0,
  'ALTER TABLE company_branches ADD COLUMN url VARCHAR(512) NULL',
  'SELECT 1');
PREPARE branch_url_stmt FROM @sql;
EXECUTE branch_url_stmt;
DEALLOCATE PREPARE branch_url_stmt;
