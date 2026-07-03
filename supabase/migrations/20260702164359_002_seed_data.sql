/*
# REGISTRE DOA - Initial Seed Data

This migration populates the database with initial data required for the application.

## 1. Tags
Pre-defined tags for categorization:
- Trafic
- Blanchiment
- Violence
- Arme
- Drogue
- Meurtre
- Extorsion
- Racket

## 2. Organizations
Pre-defined organizations as specified:

BIKERS:
- SOD
- The Lost

CRIMINAL ORGANIZATIONS:
- Renskaia
- Fuente Blanca
- Cartel Corse
- SVG

GANGS:
- Vagos
- Families
- Ballas
- Red Of Street

All organizations are created with default values and can be modified later.
*/

-- Insert default tags
INSERT INTO tags (name, color) VALUES
  ('Trafic', '#ef4444'),
  ('Blanchiment', '#f59e0b'),
  ('Violence', '#dc2626'),
  ('Arme', '#374151'),
  ('Drogue', '#7c3aed'),
  ('Meurtre', '#b91c1c'),
  ('Extorsion', '#ea580c'),
  ('Racket', '#c2410c'),
  ('Fraude', '#0284c7'),
  ('Kidnapping', '#be185d')
ON CONFLICT (name) DO NOTHING;

-- Insert Bikers organizations
INSERT INTO organizations (name, category, color, threat_level, description, status) VALUES
  ('SOD', 'bikers', '#1a1a2e', 3, 'Organisation de motards. Informations supplémentaires requises.', 'active'),
  ('The Lost', 'bikers', '#2d2d44', 4, 'Club de motards actif dans la région. Réputé pour leurs activités criminelles.', 'active')
ON CONFLICT DO NOTHING;

-- Insert Criminal Organizations
INSERT INTO organizations (name, category, color, threat_level, description, status) VALUES
  ('Renskaia', 'criminal_org', '#1e3a5f', 5, 'Organisation criminelle structurée. Haute dangerosité. Opérations internationales suspectées.', 'active'),
  ('Fuente Blanca', 'criminal_org', '#f5f5dc', 4, 'Cartel impliqué dans le trafic de stupéfiants. Réseau bien établi.', 'active'),
  ('Cartel Corse', 'criminal_org', '#1e40af', 4, 'Organisation corse opérant au niveau international. Blancheiment et trafic.', 'active'),
  ('SVG', 'criminal_org', '#3d3d3d', 3, 'Organisation criminelle émergente. Surveillance recommandée.', 'active')
ON CONFLICT DO NOTHING;

-- Insert Gangs
INSERT INTO organizations (name, category, color, threat_level, description, status) VALUES
  ('Vagos', 'gang', '#fbbf24', 3, 'Gang actif dans les quartiers est. Principales activités: trafic et extorsion.', 'active'),
  ('Families', 'gang', '#22c55e', 3, 'Gang opérant dans les quartiers sud. Structure familiale.', 'active'),
  ('Ballas', 'gang', '#a855f7', 3, 'Gang rival des Families. Territoire: quartier nord.', 'active'),
  ('Red Of Street', 'gang', '#dc2626', 2, 'Gang en croissance. Activités en cours d''identification.', 'active')
ON CONFLICT DO NOTHING;

-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT DO NOTHING;
