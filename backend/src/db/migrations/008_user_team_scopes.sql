CREATE TABLE IF NOT EXISTS app_user_team_scopes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  encounter_id BIGINT NOT NULL REFERENCES encontros(id) ON DELETE CASCADE,
  team_id BIGINT NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_user_team_scopes_unique UNIQUE (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_user_team_scopes_user_id ON app_user_team_scopes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_team_scopes_team_id ON app_user_team_scopes(team_id);
CREATE INDEX IF NOT EXISTS idx_user_team_scopes_encounter_id ON app_user_team_scopes(encounter_id);

DROP TRIGGER IF EXISTS app_user_team_scopes_set_updated_at ON app_user_team_scopes;
CREATE TRIGGER app_user_team_scopes_set_updated_at
BEFORE UPDATE ON app_user_team_scopes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
