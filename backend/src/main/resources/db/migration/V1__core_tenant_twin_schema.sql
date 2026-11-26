CREATE TABLE organizations (
  id uuid PRIMARY KEY, name varchar(160) NOT NULL, legal_name varchar(240) NOT NULL,
  default_currency varchar(3) NOT NULL DEFAULT 'USD' CHECK (default_currency ~ '^[A-Z]{3}$'),
  unit_system varchar(16) NOT NULL DEFAULT 'metric' CHECK (unit_system IN ('metric','imperial')),
  time_zone_policy varchar(80) NOT NULL DEFAULT 'UTC', locale varchar(16) NOT NULL DEFAULT 'en-US',
  retention_days integer NOT NULL DEFAULT 365 CHECK (retention_days BETWEEN 1 AND 36500),
  region varchar(80) NOT NULL DEFAULT 'unspecified', created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
);
CREATE TABLE organization_users (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), issuer varchar(500) NOT NULL,
  subject varchar(255) NOT NULL, email varchar(320), display_name varchar(160), role varchar(48) NOT NULL CHECK (role IN ('Organization Owner','Organization Admin','Site Admin','Facilities Operator','Energy/Sustainability Analyst','Technician','Auditor/Read Only')),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','revoked')),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT uq_org_user_subject UNIQUE (organization_id, issuer, subject), CONSTRAINT uq_org_user_id UNIQUE (organization_id,id)
);
CREATE INDEX ix_org_users_subject ON organization_users(issuer,subject,status);
CREATE TABLE sites (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), name varchar(160) NOT NULL,
  code varchar(32) NOT NULL, region_tag varchar(80), address varchar(320), time_zone varchar(80) NOT NULL,
  building_use varchar(100), area_sqm numeric(14,2) CHECK(area_sqm IS NULL OR area_sqm > 0),
  status varchar(24) NOT NULL DEFAULT 'commissioning' CHECK(status IN ('operational','commissioning','needs_mapping')),
  latitude numeric(10,7) CHECK(latitude IS NULL OR latitude BETWEEN -90 AND 90), longitude numeric(10,7) CHECK(longitude IS NULL OR longitude BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT uq_site_org_code UNIQUE(organization_id,code), CONSTRAINT uq_site_org_id UNIQUE(organization_id,id)
);
CREATE INDEX ix_sites_org_name ON sites(organization_id,name);
CREATE TABLE buildings (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, site_id uuid NOT NULL, code varchar(32) NOT NULL, name varchar(160) NOT NULL,
  model_state varchar(24) NOT NULL DEFAULT 'draft' CHECK(model_state IN ('draft','needs_review','reviewed','superseded')),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_building_site_tenant FOREIGN KEY(organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT uq_building_site_code UNIQUE(site_id,code), CONSTRAINT uq_building_tenant_site_id UNIQUE(organization_id,site_id,id)
);
CREATE TABLE floors (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, site_id uuid NOT NULL, building_id uuid NOT NULL, level_number integer NOT NULL,
  name varchar(100) NOT NULL, elevation_m numeric(8,2), area_sqm numeric(12,2) CHECK(area_sqm IS NULL OR area_sqm > 0),
  model_state varchar(24) NOT NULL DEFAULT 'draft' CHECK(model_state IN ('draft','needs_review','reviewed','superseded')),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_floor_building_tenant FOREIGN KEY(organization_id,site_id,building_id) REFERENCES buildings(organization_id,site_id,id),
  CONSTRAINT uq_floor_building_level UNIQUE(building_id,level_number), CONSTRAINT uq_floor_tenant_site_id UNIQUE(organization_id,site_id,id)
);
CREATE INDEX ix_floors_site_level ON floors(organization_id,site_id,level_number);
CREATE TABLE rooms (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, site_id uuid NOT NULL, floor_id uuid NOT NULL,
  code varchar(32) NOT NULL, name varchar(160) NOT NULL, zone_type varchar(24) NOT NULL CHECK(zone_type IN ('lab','office','plant','lobby','storage','server','corridor')),
  area_sqm numeric(12,2) NOT NULL CHECK(area_sqm > 0), model_state varchar(24) NOT NULL DEFAULT 'draft', provenance varchar(80) NOT NULL DEFAULT 'operator_entered',
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_room_floor_tenant FOREIGN KEY(organization_id,site_id,floor_id) REFERENCES floors(organization_id,site_id,id),
  CONSTRAINT uq_room_site_code UNIQUE(site_id,code), CONSTRAINT uq_room_org_site_id UNIQUE(organization_id,site_id,id)
);
CREATE INDEX ix_rooms_site_code ON rooms(organization_id,site_id,code);
CREATE TABLE assets (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL, site_id uuid NOT NULL, floor_id uuid NOT NULL, room_id uuid,
  system_name varchar(120), asset_class varchar(40) NOT NULL CHECK(asset_class IN ('Chiller','AHU','Boiler','Switchgear','Pump','SolarInverter','Submeter','CoolingTower','PVArray')),
  name varchar(160) NOT NULL, manufacturer varchar(120), model varchar(120), serial varchar(120), commission_date date,
  status varchar(24) NOT NULL DEFAULT 'commissioning' CHECK(status IN ('running','standby','warning','fault','maintenance','commissioning')),
  criticality varchar(16) NOT NULL DEFAULT 'medium' CHECK(criticality IN ('critical','high','medium','low')),
  owner varchar(160), source_id varchar(120) NOT NULL, power_kw numeric(14,3) CHECK(power_kw IS NULL OR power_kw >= 0), water_flow_lpm numeric(14,3) CHECK(water_flow_lpm IS NULL OR water_flow_lpm >= 0),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_asset_floor_tenant FOREIGN KEY(organization_id,site_id,floor_id) REFERENCES floors(organization_id,site_id,id),
  CONSTRAINT fk_asset_room_tenant FOREIGN KEY(organization_id,site_id,room_id) REFERENCES rooms(organization_id,site_id,id),
  CONSTRAINT uq_asset_org_source UNIQUE(organization_id,source_id), CONSTRAINT uq_asset_org_site_id UNIQUE(organization_id,site_id,id)
);
CREATE INDEX ix_assets_site_name ON assets(organization_id,site_id,name);
CREATE TABLE twin_nodes (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), site_id uuid,
  kind varchar(32) NOT NULL CHECK(kind IN ('organization','site','building','floor','space','asset','system','meter','point','resource_stream','issue','work_order','scenario','impact_record')),
  name varchar(200) NOT NULL, lifecycle_state varchar(24) NOT NULL DEFAULT 'active' CHECK(lifecycle_state IN ('active','draft','needs_review','retired')),
  source_id varchar(120) NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_twin_node_site_tenant FOREIGN KEY(organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT uq_twin_node_org_kind_source UNIQUE(organization_id,kind,source_id), CONSTRAINT uq_twin_node_org_id UNIQUE(organization_id,id)
);
CREATE INDEX ix_twin_nodes_site_kind ON twin_nodes(organization_id,site_id,kind);
CREATE TABLE twin_edges (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), source_node_id uuid NOT NULL, target_node_id uuid NOT NULL,
  edge_type varchar(32) NOT NULL CHECK(edge_type IN ('contains','located_in','feeds','serves','measures','derived_from','supplied_by','connected_to','has_issue','addressed_by','uses_factor','evidenced_by','supersedes')),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(attributes)='object'), created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  CONSTRAINT fk_twin_edge_source_tenant FOREIGN KEY(organization_id,source_node_id) REFERENCES twin_nodes(organization_id,id),
  CONSTRAINT fk_twin_edge_target_tenant FOREIGN KEY(organization_id,target_node_id) REFERENCES twin_nodes(organization_id,id),
  CONSTRAINT ck_twin_edge_distinct CHECK(source_node_id <> target_node_id),
  CONSTRAINT uq_twin_edge UNIQUE(organization_id,source_node_id,target_node_id,edge_type)
);
CREATE INDEX ix_twin_edges_source ON twin_edges(organization_id,source_node_id);
CREATE INDEX ix_twin_edges_target ON twin_edges(organization_id,target_node_id);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_subject varchar(255) NOT NULL,
  action varchar(100) NOT NULL, resource_type varchar(160) NOT NULL, resource_id uuid, outcome varchar(16) NOT NULL CHECK(outcome IN ('allowed','denied')),
  request_id varchar(80), details_json jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details_json)='object'),
  created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, CONSTRAINT uq_audit_org_id UNIQUE(organization_id,id)
);
CREATE INDEX ix_audit_org_created ON audit_events(organization_id,created_at DESC);
CREATE INDEX ix_audit_org_resource ON audit_events(organization_id,resource_type,resource_id);

CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$;
CREATE TRIGGER trg_audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();
