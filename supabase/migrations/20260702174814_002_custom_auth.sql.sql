-- Create custom agents table for PIN-based authentication
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT UNIQUE NOT NULL,
  pin TEXT NOT NULL DEFAULT '0000',
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'lead', 'co_lead', 'agent', 'readonly')),
  display_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select" ON agents FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT TO authenticated, anon WITH CHECK (true);
CREATE POLICY "agents_update" ON agents FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Insert default agents
INSERT INTO agents (matricule, pin, role, display_name) VALUES
  ('LSPD-0507', '0507', 'admin', 'Commandant DOA'),
  ('LSPD-1001', '1001', 'lead', 'Lead Agent DOA'),
  ('LSPD-1002', '1002', 'co_lead', 'Co-Lead Agent'),
  ('LSPD-2001', '2001', 'agent', 'Agent DOA'),
  ('LSPD-3001', '3001', 'readonly', 'Observateur')
ON CONFLICT (matricule) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_agents_matricule ON agents(matricule);