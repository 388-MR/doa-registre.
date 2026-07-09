/*
# 011 — Allow super_admin role in agent_roles + ensure updated_at trigger
*/
ALTER TABLE agent_roles DROP CONSTRAINT IF EXISTS agent_roles_role_check;
ALTER TABLE agent_roles ADD CONSTRAINT agent_roles_role_check
  CHECK (role IN ('commandant_doa', 'agent_doa', 'super_admin'));
