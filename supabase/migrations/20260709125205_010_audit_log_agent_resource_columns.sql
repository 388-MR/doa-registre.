/*
# 010 — Audit log: add agent + resource columns for periodic reports
# Adds agent_matricule, agent_codename, resource_type, resource_id, resource_name
# to the audit_log table so periodic reports can query by agent or organization.
*/

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS agent_matricule TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS agent_codename TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource_name TEXT;
