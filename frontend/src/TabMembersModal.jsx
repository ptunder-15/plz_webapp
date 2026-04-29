import { useEffect, useState } from "react";
import {
  fetchTabMembers,
  inviteTabMember,
  updateTabMemberRole,
  removeTabMember,
} from "./api";

const ROLE_LABELS = {
  admin: "Inhaber",
  editor: "Bearbeiter",
  viewer: "Betrachter",
};

const ROLE_DESCRIPTIONS = {
  editor: "Kann Gruppen & PLZ-Zuweisungen bearbeiten",
  viewer: "Kann nur lesen, keine Änderungen möglich",
};

export default function TabMembersModal({ tab, onClose, onMembersChanged }) {
  const [owner, setOwner] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteUrl, setInviteUrl] = useState(null);
  const [invitedEmail, setInvitedEmail] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tab) loadMembers();
  }, [tab?.id]);

  async function loadMembers() {
    setIsLoading(true);
    try {
      const data = await fetchTabMembers(tab.id);
      setOwner(data.owner);
      setMembers(data.members);
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
      const result = await inviteTabMember(tab.id, email, inviteRole);
      setMembers(result.members);
      setInvitedEmail(email);
      setInviteEmail("");
      setInviteUrl(result.invite_url || null);
      setCopied(false);
      onMembersChanged?.();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRoleChange(memberEmail, newRole) {
    try {
      const result = await updateTabMemberRole(tab.id, memberEmail, newRole);
      setMembers(result.members);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleRemove(memberEmail) {
    if (!window.confirm(`${memberEmail} wirklich aus diesem Tab entfernen?`)) return;
    try {
      const result = await removeTabMember(tab.id, memberEmail);
      setMembers(result.members);
      onMembersChanged?.();
    } catch (err) {
      alert(err.message);
    }
  }

  if (!tab) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Zugriff auf „{tab.name}"</h2>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title">Wer hat Zugriff</h3>

          {isLoading ? (
            <p className="modal-loading">Laden…</p>
          ) : (
            <div className="member-list">
              {/* Owner row */}
              <div className="member-row">
                <div className="member-info">
                  <span className="member-email">{owner}</span>
                  <span className="member-invited-by">Tab-Inhaber</span>
                </div>
                <div className="member-actions">
                  <span className="member-role-badge">Inhaber</span>
                </div>
              </div>

              {/* Other members */}
              {members.map((m) => (
                <div key={m.user_email} className="member-row">
                  <div className="member-info">
                    <span className="member-email">{m.user_email}</span>
                    {m.invited_by && (
                      <span className="member-invited-by">eingeladen von {m.invited_by}</span>
                    )}
                  </div>
                  <div className="member-actions">
                    <select
                      className="member-role-select"
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.user_email, e.target.value)}
                    >
                      <option value="editor">Bearbeiter</option>
                      <option value="viewer">Betrachter</option>
                    </select>
                    <button
                      className="btn btn-danger-subtle"
                      onClick={() => handleRemove(m.user_email)}
                      title="Zugriff entfernen"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {members.length === 0 && (
                <p className="modal-hint">Noch niemand anderes hat Zugriff auf diesen Tab.</p>
              )}
            </div>
          )}

          <form onSubmit={handleInvite} className="invite-form">
            <h4 className="invite-title">Person hinzufügen</h4>
            <div className="invite-row">
              <input
                className="form-input invite-email-input"
                type="email"
                placeholder="email@beispiel.de"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  setInviteUrl(null);
                  setInvitedEmail(null);
                  setCopied(false);
                }}
                required
              />
              <select
                className="form-input invite-role-select"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="editor">Bearbeiter</option>
                <option value="viewer">Betrachter</option>
              </select>
              <button type="submit" className="btn btn-primary" disabled={isInviting}>
                {isInviting ? "…" : "Hinzufügen"}
              </button>
            </div>
            {inviteError && <p className="form-error">{inviteError}</p>}

            {inviteUrl && (
              <div className="invite-url-box">
                <div className="invite-url-label">
                  ✓ Einladungslink für <strong>{invitedEmail}</strong> erstellt:
                </div>
                <div className="invite-url-row">
                  <input
                    className="form-input invite-url-input"
                    type="text"
                    value={inviteUrl}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    className={`btn ${copied ? "btn-copied" : "btn-primary"}`}
                    onClick={() => {
                      navigator.clipboard.writeText(inviteUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                  >
                    {copied ? "✓ Kopiert" : "Kopieren"}
                  </button>
                </div>
                <p className="invite-url-hint">
                  Schick diesen Link per WhatsApp oder E-Mail. Er ist 7 Tage gültig und kann nur einmal verwendet werden.
                </p>
              </div>
            )}

            <div className="role-hints">
              {Object.entries(ROLE_DESCRIPTIONS).map(([role, desc]) => (
                <div key={role} className="role-hint-row">
                  <span className="role-hint-label">{ROLE_LABELS[role]}:</span>
                  <span className="role-hint-desc">{desc}</span>
                </div>
              ))}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
