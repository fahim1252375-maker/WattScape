\set ON_ERROR_STOP on
BEGIN;
INSERT INTO organizations(id,name,legal_name,default_currency,unit_system,time_zone_policy,locale,retention_days,region,created_at,updated_at)
VALUES (:'org_id'::uuid, :'org_name', :'legal_name', 'USD', 'metric', 'UTC', 'en-US', 365, 'unspecified', now(), now());
INSERT INTO organization_users(id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at)
VALUES (gen_random_uuid(), :'org_id'::uuid, :'issuer', :'subject', :'email', :'display_name', 'Organization Owner', 'active', now(), now());
COMMIT;
