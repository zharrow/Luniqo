-- ============================================================================
-- Migration 66: Guardian Invitation System
-- Allows Owners to invite guardians (parents) to the portal via email
-- ============================================================================

-- Table to track invitation tokens sent to guardians
CREATE TABLE IF NOT EXISTS guardian_invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guardian_id UUID NOT NULL REFERENCES guardian(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  invited_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  nursery_id UUID NOT NULL REFERENCES nursery(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX idx_guardian_invitation_token ON guardian_invitation(token);
CREATE INDEX idx_guardian_invitation_guardian ON guardian_invitation(guardian_id);
CREATE INDEX idx_guardian_invitation_email ON guardian_invitation(email);
CREATE INDEX idx_guardian_invitation_pending ON guardian_invitation(token) WHERE used_at IS NULL;

-- Comments
COMMENT ON TABLE guardian_invitation IS 'Tracks invitation tokens sent to guardians for portal registration';
COMMENT ON COLUMN guardian_invitation.token IS '64-character random hex token for URL validation';
COMMENT ON COLUMN guardian_invitation.expires_at IS 'Token expires after 7 days from creation';
COMMENT ON COLUMN guardian_invitation.used_at IS 'Set when guardian completes registration via this token';
