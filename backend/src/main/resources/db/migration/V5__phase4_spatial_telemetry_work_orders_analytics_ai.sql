-- Phase 4: additive tenant-scoped spatial, telemetry, maintenance, analytics and AI foundations.

CREATE TABLE floor_plans (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  floor_id uuid NOT NULL,
  revision integer NOT NULL CHECK (revision > 0),
  coordinate_system varchar(32) NOT NULL DEFAULT 'LOCAL_CARTESIAN' CHECK (coordinate_system IN ('LOCAL_CARTESIAN')),
  unit varchar(8) NOT NULL DEFAULT 'm' CHECK (unit IN ('m','ft')),
  width numeric(14,3) NOT NULL CHECK (width > 0),
  height numeric(14,3) NOT NULL CHECK (height > 0),
  origin_x numeric(14,3) NOT NULL DEFAULT 0,
  origin_y numeric(14,3) NOT NULL DEFAULT 0,
  rotation_degrees numeric(8,3) NOT NULL DEFAULT 0 CHECK (rotation_degrees >= -360 AND rotation_degrees <= 360),
  plan_reference varchar(500),
  is_active boolean NOT NULL DEFAULT true,
  created_by varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_floor_plan_floor_tenant FOREIGN KEY (organization_id,site_id,floor_id) REFERENCES floors(organization_id,site_id,id),
  CONSTRAINT uq_floor_plan_revision UNIQUE (organization_id,floor_id,revision)
);
CREATE UNIQUE INDEX uq_floor_plan_one_active ON floor_plans(organization_id,floor_id) WHERE is_active = true;
CREATE INDEX ix_floor_plans_site ON floor_plans(organization_id,site_id,floor_id,is_active);

CREATE TABLE spatial_elements (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  floor_id uuid NOT NULL,
  plan_revision integer NOT NULL CHECK (plan_revision > 0),
  entity_type varchar(16) NOT NULL CHECK (entity_type IN ('room','asset')),
  room_id uuid,
  asset_id uuid,
  geometry jsonb NOT NULL CHECK (jsonb_typeof(geometry) = 'object'),
  position_x numeric(14,3) NOT NULL DEFAULT 0,
  position_y numeric(14,3) NOT NULL DEFAULT 0,
  position_z numeric(14,3) NOT NULL DEFAULT 0,
  rotation_degrees numeric(8,3) NOT NULL DEFAULT 0 CHECK (rotation_degrees >= -360 AND rotation_degrees <= 360),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  lock_version bigint NOT NULL DEFAULT 0,
  lifecycle_state varchar(16) NOT NULL DEFAULT 'active' CHECK (lifecycle_state IN ('active','retired')),
  created_by varchar(255) NOT NULL,
  updated_by varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT uq_spatial_element_org_id UNIQUE (organization_id,id),
  CONSTRAINT fk_spatial_element_floor FOREIGN KEY (organization_id,site_id,floor_id) REFERENCES floors(organization_id,site_id,id),
  CONSTRAINT fk_spatial_element_plan_revision FOREIGN KEY (organization_id,floor_id,plan_revision) REFERENCES floor_plans(organization_id,floor_id,revision),
  CONSTRAINT fk_spatial_element_room FOREIGN KEY (organization_id,site_id,room_id) REFERENCES rooms(organization_id,site_id,id),
  CONSTRAINT fk_spatial_element_asset FOREIGN KEY (organization_id,site_id,asset_id) REFERENCES assets(organization_id,site_id,id),
  CONSTRAINT ck_spatial_element_target CHECK (
    (entity_type = 'room' AND room_id IS NOT NULL AND asset_id IS NULL) OR
    (entity_type = 'asset' AND asset_id IS NOT NULL AND room_id IS NULL)
  )
);
CREATE UNIQUE INDEX uq_spatial_element_room ON spatial_elements(organization_id,room_id) WHERE room_id IS NOT NULL AND lifecycle_state = 'active';
CREATE UNIQUE INDEX uq_spatial_element_asset ON spatial_elements(organization_id,asset_id) WHERE asset_id IS NOT NULL AND lifecycle_state = 'active';
CREATE INDEX ix_spatial_elements_floor ON spatial_elements(organization_id,site_id,floor_id,lifecycle_state);

CREATE TABLE spatial_element_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  spatial_element_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  action varchar(16) NOT NULL CHECK (action IN ('created','updated','retired')),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  actor_subject varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_spatial_version_element FOREIGN KEY (organization_id,spatial_element_id) REFERENCES spatial_elements(organization_id,id),
  CONSTRAINT uq_spatial_version UNIQUE (organization_id,spatial_element_id,version)
);
CREATE INDEX ix_spatial_versions_history ON spatial_element_versions(organization_id,spatial_element_id,version DESC);

CREATE TABLE telemetry_devices (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  asset_id uuid,
  external_id varchar(120) NOT NULL,
  display_name varchar(160) NOT NULL,
  protocol varchar(16) NOT NULL CHECK (protocol IN ('HTTPS','MQTT','MODBUS','BACNET')),
  status varchar(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  secret_hash varchar(64) NOT NULL,
  last_seen_at timestamptz,
  created_by varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_telemetry_device_site FOREIGN KEY (organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT fk_telemetry_device_asset FOREIGN KEY (organization_id,site_id,asset_id) REFERENCES assets(organization_id,site_id,id),
  CONSTRAINT uq_telemetry_device_external UNIQUE (organization_id,external_id),
  CONSTRAINT uq_telemetry_device_org_id UNIQUE (organization_id,id)
);
CREATE INDEX ix_telemetry_devices_site ON telemetry_devices(organization_id,site_id,status);

CREATE TABLE telemetry_points (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  device_id uuid NOT NULL,
  asset_id uuid,
  metric_key varchar(64) NOT NULL,
  value numeric(20,6) NOT NULL CHECK (value BETWEEN -1000000000000 AND 1000000000000),
  unit varchar(24) NOT NULL,
  quality varchar(16) NOT NULL DEFAULT 'good' CHECK (quality IN ('good','uncertain','bad')),
  source_event_id varchar(120),
  observed_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_telemetry_point_device FOREIGN KEY (organization_id,device_id) REFERENCES telemetry_devices(organization_id,id),
  CONSTRAINT fk_telemetry_point_site FOREIGN KEY (organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT fk_telemetry_point_asset FOREIGN KEY (organization_id,site_id,asset_id) REFERENCES assets(organization_id,site_id,id)
);
CREATE UNIQUE INDEX uq_telemetry_device_event ON telemetry_points(device_id,source_event_id) WHERE source_event_id IS NOT NULL;
CREATE INDEX ix_telemetry_site_metric_time ON telemetry_points(organization_id,site_id,metric_key,observed_at DESC);
CREATE INDEX ix_telemetry_asset_time ON telemetry_points(organization_id,asset_id,observed_at DESC) WHERE asset_id IS NOT NULL;

CREATE TABLE work_orders (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  asset_id uuid,
  title varchar(180) NOT NULL,
  description varchar(4000),
  priority varchar(16) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open','triaged','in_progress','blocked','completed','cancelled')),
  due_at timestamptz,
  assignee_subject varchar(255),
  assignee_name varchar(160),
  created_by varchar(255) NOT NULL,
  updated_by varchar(255) NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  lock_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_work_order_site FOREIGN KEY (organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT fk_work_order_asset FOREIGN KEY (organization_id,site_id,asset_id) REFERENCES assets(organization_id,site_id,id),
  CONSTRAINT uq_work_order_org_id UNIQUE (organization_id,id)
);
CREATE INDEX ix_work_orders_site_status_due ON work_orders(organization_id,site_id,status,due_at);
CREATE INDEX ix_work_orders_assignee ON work_orders(organization_id,assignee_subject,status);

CREATE TABLE work_order_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  work_order_id uuid NOT NULL,
  event_type varchar(32) NOT NULL,
  from_status varchar(16),
  to_status varchar(16),
  actor_subject varchar(255) NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_work_order_event_order FOREIGN KEY (organization_id,work_order_id) REFERENCES work_orders(organization_id,id)
);
CREATE INDEX ix_work_order_events_order ON work_order_events(organization_id,work_order_id,created_at DESC);

CREATE TABLE energy_factors (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  effective_from timestamptz NOT NULL,
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  electricity_cost_per_kwh numeric(14,6) CHECK (electricity_cost_per_kwh IS NULL OR electricity_cost_per_kwh >= 0),
  grid_emissions_kg_per_kwh numeric(14,8) CHECK (grid_emissions_kg_per_kwh IS NULL OR grid_emissions_kg_per_kwh >= 0),
  water_cost_per_m3 numeric(14,6) CHECK (water_cost_per_m3 IS NULL OR water_cost_per_m3 >= 0),
  created_by varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_energy_factor_site FOREIGN KEY (organization_id,site_id) REFERENCES sites(organization_id,id),
  CONSTRAINT uq_energy_factor_effective UNIQUE (organization_id,site_id,effective_from)
);
CREATE INDEX ix_energy_factors_lookup ON energy_factors(organization_id,site_id,effective_from DESC);

CREATE TABLE ai_usage_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  site_id uuid NOT NULL,
  actor_subject varchar(255) NOT NULL,
  provider varchar(40) NOT NULL,
  model varchar(120) NOT NULL,
  task varchar(48) NOT NULL,
  outcome varchar(16) NOT NULL CHECK (outcome IN ('success','disabled','failed')),
  input_tokens integer,
  output_tokens integer,
  latency_ms bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT fk_ai_usage_site FOREIGN KEY (organization_id,site_id) REFERENCES sites(organization_id,id)
);
CREATE INDEX ix_ai_usage_org_created ON ai_usage_events(organization_id,created_at DESC);

-- Audit snapshots and work-order history are append-only.
CREATE FUNCTION wattscape_reject_history_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'WattScape history rows are append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER trg_spatial_versions_immutable
  BEFORE UPDATE OR DELETE ON spatial_element_versions
  FOR EACH ROW EXECUTE FUNCTION wattscape_reject_history_mutation();
CREATE TRIGGER trg_work_order_events_immutable
  BEFORE UPDATE OR DELETE ON work_order_events
  FOR EACH ROW EXECUTE FUNCTION wattscape_reject_history_mutation();
CREATE TRIGGER trg_ai_usage_events_immutable
  BEFORE UPDATE OR DELETE ON ai_usage_events
  FOR EACH ROW EXECUTE FUNCTION wattscape_reject_history_mutation();
