import { useEffect, useState } from "react";
import { getInviteInfo, acceptInvite, resetPassword } from "./api";

const ROLE_LABELS = {
  admin: "Admin",
  editor: "Bearbeiter",
  viewer: "Betrachter",
};

export default function InvitePage({ token, mode = "invite", onSuccess }) {
  // mode: "invite" | "reset"
  const [inviteInfo, setInviteInfo] = useState(null);
  const [infoError, setInfoError] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (mode === "invite" && token) {
      getInviteInfo(token)
        .then(setInviteInfo)
        .catch((err) => setInfoError(err.message));
    }
  }, [token, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      let data;
      if (mode === "invite") {
        data = await acceptInvite(token, password, passwordConfirm);
      } else {
        data = await resetPassword(token, password, passwordConfirm);
      }
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "invite" && infoError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">standardgrid</div>
          <p className="auth-error" style={{ marginTop: "16px" }}>{infoError}</p>
          <p className="auth-hint" style={{ marginTop: "12px" }}>
            Bitte frage deinen Admin um einen neuen Einladungslink.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">standardgrid</div>
        <div className="auth-subtitle">
          {mode === "invite" ? "Einladung annehmen" : "Neues Passwort setzen"}
        </div>

        {mode === "invite" && inviteInfo && (
          <div className="invite-info-box">
            <div className="invite-info-email">{inviteInfo.email}</div>
            <div className="invite-info-meta">
              Eingeladen von <strong>{inviteInfo.invited_by}</strong>
              {" · "}Rolle: <strong>{ROLE_LABELS[inviteInfo.role] ?? inviteInfo.role}</strong>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Hidden username field so Apple Keychain / browser saves password for the correct account */}
          <input
            type="email"
            autoComplete="username"
            value={inviteInfo?.email ?? ""}
            readOnly
            style={{ display: "none" }}
          />
          <input
            className="form-input"
            type="password"
            placeholder="Passwort wählen (min. 8 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            autoFocus
          />
          <input
            className="form-input"
            type="password"
            placeholder="Passwort wiederholen"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn auth-submit-btn" disabled={isLoading}>
            {isLoading
              ? "Speichern…"
              : mode === "invite"
              ? "Einladung annehmen & loslegen"
              : "Passwort speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
