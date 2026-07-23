-- Migration to add expense_limit_reset_time to store_settings
-- Up
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS expense_limit_reset_time TIME NOT NULL DEFAULT '00:00:00';

-- Drop and Recreate RPC to include expense_limit_reset_time
DROP FUNCTION IF EXISTS upsert_store_settings;

CREATE OR REPLACE FUNCTION upsert_store_settings(
  p_receipt_retention_days integer,
  p_daily_expense_limit numeric,
  p_monthly_expense_limit numeric,
  p_yearly_expense_limit numeric,
  p_expense_limit_reset_time time
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings store_settings;
BEGIN
  -- Insert or update the single row
  INSERT INTO store_settings (
    id, 
    receipt_retention_days,
    daily_expense_limit,
    monthly_expense_limit,
    yearly_expense_limit,
    expense_limit_reset_time
  )
  VALUES (
    1, 
    p_receipt_retention_days,
    p_daily_expense_limit,
    p_monthly_expense_limit,
    p_yearly_expense_limit,
    p_expense_limit_reset_time
  )
  ON CONFLICT (id) DO UPDATE SET
    receipt_retention_days = EXCLUDED.receipt_retention_days,
    daily_expense_limit = EXCLUDED.daily_expense_limit,
    monthly_expense_limit = EXCLUDED.monthly_expense_limit,
    yearly_expense_limit = EXCLUDED.yearly_expense_limit,
    expense_limit_reset_time = EXCLUDED.expense_limit_reset_time,
    updated_at = NOW()
  RETURNING * INTO v_settings;

  RETURN row_to_json(v_settings);
END;
$$;
