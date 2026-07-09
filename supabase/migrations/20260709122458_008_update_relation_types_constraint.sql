/*
# 008 — Update organization_relations relation_type constraint

## Changes
- Drops the old CHECK constraint that only allowed: alliance, rivalite, conflit_actif, neutre
- Adds a new CHECK constraint allowing the 9 relation types:
  allie, ennemi, partenaire_commercial, fournisseur, client, neutre, sous_controle, rival, inconnu
- No data migration needed (table is currently empty)

## Security
- No RLS changes — existing policies remain intact
*/

ALTER TABLE organization_relations DROP CONSTRAINT IF EXISTS organization_relations_relation_type_check;

ALTER TABLE organization_relations ADD CONSTRAINT organization_relations_relation_type_check
  CHECK (relation_type IN (
    'allie', 'ennemi', 'partenaire_commercial', 'fournisseur', 'client',
    'neutre', 'sous_controle', 'rival', 'inconnu'
  ));
