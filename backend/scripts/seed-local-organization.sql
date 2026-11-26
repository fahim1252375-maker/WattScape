-- Idempotent local development membership seed. Does not delete or rewrite rows.
-- IDs and issuer must match backend/keycloak/wattscape-local-realm.json and backend/.env.example.
BEGIN;
INSERT INTO organizations (id,name,legal_name,default_currency,unit_system,time_zone_policy,locale,retention_days,region,created_at,updated_at)
VALUES ('20000000-0000-4000-8000-000000000001','WattScape Local','WattScape Local Development','USD','metric','UTC','en-US',365,'local-development',now(),now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO organizations (id,name,legal_name,default_currency,unit_system,time_zone_policy,locale,retention_days,region,created_at,updated_at)
VALUES ('20000000-0000-4000-8000-000000000002','WattScape Other Local','WattScape Other Local Development','USD','metric','UTC','en-US',365,'local-development',now(),now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO sites (id,organization_id,name,code,time_zone,status,created_at,updated_at)
VALUES ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','Other Tenant Site','OTHER01','UTC','operational',now(),now())
ON CONFLICT (id) DO NOTHING;
INSERT INTO organization_users (id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at)
VALUES ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','http://localhost:8081/realms/wattscape-local','10000000-0000-4000-8000-000000000001','local-admin@wattscape.invalid','WattScape Local Admin','Organization Owner','active',now(),now())
ON CONFLICT (organization_id,issuer,subject) DO NOTHING;
INSERT INTO organization_users (id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at)
VALUES ('30000000-0000-4000-8000-000000000003','20000000-0000-4000-8000-000000000002','http://localhost:8081/realms/wattscape-local','10000000-0000-4000-8000-000000000003','local-other-admin@wattscape.invalid','Other Tenant Admin','Organization Owner','active',now(),now())
ON CONFLICT (organization_id,issuer,subject) DO NOTHING;
INSERT INTO organization_users (id,organization_id,issuer,subject,email,display_name,role,status,created_at,updated_at)
VALUES ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','http://localhost:8081/realms/wattscape-local','10000000-0000-4000-8000-000000000002','local-member@wattscape.invalid','WattScape Local Member','Auditor/Read Only','active',now(),now())
ON CONFLICT (organization_id,issuer,subject) DO NOTHING;
COMMIT;
