ALTER TABLE organization_invitations
  ADD COLUMN revoked_at timestamptz;

CREATE INDEX ix_org_invitation_pending_scope
  ON organization_invitations(organization_id, created_at DESC)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
