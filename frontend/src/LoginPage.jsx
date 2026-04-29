import { useState } from "react";
import { login, register, forgotPassword } from "./api";

export default function LoginPage({ onLogin }) {
  const [view, setView] = useState("login"); // "login" | "register" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const reset = () => {
    setError(null);
    setSuccessMessage(null);
    setPassword("");
    setPasswordConfirm("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await login(email.trim().toLowerCase(), password);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await register(email.trim().toLowerCase(), password, passwordConfirm);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const data = await forgotPassword(email.trim().toLowerCase());
      setSuccessMessage(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">standardgrid</div>
        <div className="auth-subtitle">
          {view === "login" && "Anmelden"}
          {view === "register" && "Account erstellen"}
          {view === "forgot" && "Passwort zurücksetzen"}
        </div>

        {view === "login" && (
          <form onSubmit={handleLogin} className="auth-form">
            <input
              className="form-input"
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              className="form-input"
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn auth-submit-btn" disabled={isLoading}>
              {isLoading ? "Anmelden…" : "Anmelden"}
            </button>
            <div className="auth-links">
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setView("forgot"); reset(); }}
              >
                Passwort vergessen?
              </button>
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setView("register"); reset(); }}
              >
                Noch kein Account? Registrieren
              </button>
            </div>
          </form>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="auth-form">
            <p className="auth-hint">
              Nur möglich, wenn noch kein Account existiert (Erstregistrierung).
              Danach nur per Einladungslink.
            </p>
            <input
              className="form-input"
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              className="form-input"
              type="password"
              placeholder="Passwort (min. 8 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              className="form-input"
              type="password"
              placeholder="Passwort wiederholen"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn auth-submit-btn" disabled={isLoading}>
              {isLoading ? "Erstellen…" : "Account erstellen"}
            </button>
            <div className="auth-links">
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setView("login"); reset(); }}
              >
                Zurück zum Login
              </button>
            </div>
          </form>
        )}

        {view === "forgot" && (
          <form onSubmit={handleForgot} className="auth-form">
            {successMessage ? (
              <p className="auth-success">{successMessage}</p>
            ) : (
              <>
                <input
                  className="form-input"
                  type="email"
                  placeholder="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                {error && <p className="auth-error">{error}</p>}
                <button type="submit" className="btn auth-submit-btn" disabled={isLoading}>
                  {isLoading ? "Senden…" : "Reset-Link senden"}
                </button>
              </>
            )}
            <div className="auth-links">
              <button
                type="button"
                className="auth-link-btn"
                onClick={() => { setView("login"); reset(); }}
              >
                Zurück zum Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
