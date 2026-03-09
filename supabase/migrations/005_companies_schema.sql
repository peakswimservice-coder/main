-- 5. Società (Club/Associazioni sportive)
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  account_manager_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
