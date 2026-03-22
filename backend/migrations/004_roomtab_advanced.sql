ALTER TABLE roomtab_expenses ADD COLUMN receipt_url TEXT;
ALTER TABLE roomtab_expenses ADD COLUMN settled BOOLEAN DEFAULT 0;
