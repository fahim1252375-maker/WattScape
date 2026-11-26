CREATE TABLE organization_invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  email varchar(320) NOT NULL,
  token_hash varchar(64) NOT NULL UNIQUE,
  role varchar(48) NOT NULL CHECK (role IN ('Facilities Operator','Energy/Sustainability Analyst','Technician','Auditor/Read Only')),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_by_subject varchar(255) NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);
CREATE INDEX ix_org_invitation_email_expiry ON organization_invitations(lower(email), expires_at) WHERE accepted_at IS NULL;
