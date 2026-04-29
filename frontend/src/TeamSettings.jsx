import { useEffect, useState } from "react";
import {
  fetchTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeTeamMember,
  renameTeam,
  createTeam,
} from "./api";

const ROLE_LABELS = {
  admin: "Admin",
  editor: "Bearbeiter",
  viewer: "Betrachter",
};

const ROLE_DESCRIPTIONS = {
  admin: "Kann alles verwalten, Mitglieder einladen & Rollen vergeben",
  editor: "Kann Tabs, Gruppen & PLZ-Zuweisungen bearbeiten",
  viewer: "Kann nur lesen, keine Änderungen möglich",
};

export default function TeamSettings({ team, onClose, onTeamsChanged }) {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [teamName, setTeamName] = useState(team.name);
  const [isRenamingTeam, setIsRenamingTeam] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [createTeamError, setCreateTeamError] = useState(null);
  const [activeSection, setActiveSection] = useState("members");

  const isAdmin = team.role === "admin";

  useEffect(() => {
    loadMembers();
  }, [team.id]);

  async function loadMembers() {
    setIsLoading(true);
    try {
      const data = await fetchTeamMembers(team.id);
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      const result = await inviteTeamMember(team.id, email, inviteRole);
      setMembers(result.members);
      setInviteEmail("");
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(memberEmail, newRole) {
    try {
      const result = await updateMemberRole(team.id, memberEmail, newRole);
      setMembers(result.members);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRemove(memberEmail) {
    if (!window.confirm(`${memberEmail} wirklich aus dem Team entfernen?`)) return;
    try {
      const result = await removeTeamMember(team.id, memberEmail);
      setMembers(result.members);
      onTeamsChanged?.();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRenameTeam(e) {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setIsRenamingTeam(true);
    setRenameError(null);
    try {
      await renameTeam(team.id, name);
      onTeamsChanged?.();
    } catch (err) {
      setRenameError(err.message);
    } finally {
      setIsRenamingTeam(false);
    }
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    setIsCreatingTeam(true);
    setCreateTeamError(null);
    try {
      await createTeam(name);
      setNewTeamName("");
      onTeamsChanged?.();
    } catch (err) {
      setCreateTeamError(err.message);
    } finally {
      setIsCreatingTeam(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Team-Einstellungen</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`modal-tab-btn ${activeSection === "members" ? "active" : ""}`}
            onClick={() => setActiveSection("members")}
          >
            Mitglieder
          </button>
          <button
            className={`modal-tab-btn ${activeSection === "settings" ? "active" : ""}`}
            onClick={() => setActiveSection("settings")}
          >
            Einstellungen
          </button>
          <button
            className={`modal-tab-btn ${activeSection === "new-team" ? "active" : ""}`}
            onClick={() => setActiveSection("new-team")}
          >
            Neues Team
          </button>
        </div>

        {activeSection === "members" && (
          <div className="modal-section">
            <h3 className="modal-section-title">Mitglieder in „{team.name}"</h3>

            {isLoading ? (
              <p className="modal-loading">Laden…</p>
            ) : (
              <div className="member-list">
                {members.map((m) => (
                  <div key={m.user_email} className="member-row">
                    <div className="member-info">
                      <span className="member-email">{m.user_email}</span>
                      {m.invited_by && (
                        <span className="member-invited-by">
                          eingeladen von {m.invited_by}
                        </span>
                      )}
                    </div>
                    <div className="member-actions">
                      {isAdmin ? (
                        <select
                          className="member-role-select"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user_email, e.target.value)}
                          title={ROLE_DESCRIPTIONS[m.role]}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Bearbeiter</option>
                          <option value="viewer">Betrachter</option>
                        </select>
                      ) : (
                        <span className="member-role-badge member-role-badge--{m.role}">
                          {ROLE_LABELS[m.role] ?? m.role}
                        </span>
                      )}
                      {isAdmin && (
                        <button
                          className="btn btn-danger-subtle"
                          onClick={() => handleRemove(m.user_email)}
                          title="Mitglied entfernen"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <form onSubmit={handleInvite} className="invite-form">
                <h4 className="invite-title">Person hinzufügen</h4>
                <div className="invite-row">
                  <input
                    className="form-input invite-email-input"
                    type="email"
                    placeholder="email@beispiel.de"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <select
                    className="form-input invite-role-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="editor">Bearbeiter</option>
                    <option value="viewer">Betrachter</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isInviting}
                  >
                    {isInviting ? "…" : "Hinzufügen"}
                  </button>
                </div>
                {inviteError && <p className="form-error">{inviteError}</p>}
                <div className="role-hints">
                  {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                    <div key={role} className="role-hint-row">
                      <span className="role-hint-label">{ROLE_LABELS[role]}:</span>
                      <span className="role-hint-desc">{desc}</span>
                    </div>
                  ))}
                </div>
              </form>
            )}
          </div>
        )}

        {activeSection === "settings" && (
          <div className="modal-section">
            <h3 className="modal-section-title">Team umbenennen</h3>
            {isAdmin ? (
              <form onSubmit={handleRenameTeam} className="rename-form">
                <div className="rename-row">
                  <input
                    className="form-input"
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={100}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={isRenamingTeam}>
                    {isRenamingTeam ? "…" : "Speichern"}
                  </button>
                </div>
                {renameError && <p className="form-error">{renameError}</p>}
              </form>
            ) : (
              <p className="modal-hint">Nur Admins können das Team umbenennen.</p>
            )}
          </div>
        )}

        {activeSection === "new-team" && (
          <div className="modal-section">
            <h3 className="modal-section-title">Neues Team erstellen</h3>
            <p className="modal-hint">
              Jedes Team hat eigene Tabs, Gruppen und PLZ-Zuweisungen.
              Du wirst automatisch Admin des neuen Teams.
            </p>
            <form onSubmit={handleCreateTeam} className="rename-form">
              <div className="rename-row">
                <input
                  className="form-input"
                  type="text"
                  placeholder="Team-Name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  maxLength={100}
                  required
                />
                <button type="submit" className="btn btn-primary" disabled={isCreatingTeam}>
                  {isCreatingTeam ? "…" : "Team erstellen"}
                </button>
              </div>
              {createTeamError && <p className="form-error">{createTeamError}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
