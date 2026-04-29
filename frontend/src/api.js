import { APP_CONFIG } from "./config";

const fetchOptions = {
  credentials: "include",
};

export async function fetchMarkers() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/markers/`, fetchOptions);
  if (!response.ok) throw new Error("Marker konnten nicht geladen werden.");
  return response.json();
}

export async function fetchGeoSample() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/markers/geo-sample`, fetchOptions);
  if (!response.ok) throw new Error("GeoJSON-Stichprobe konnte nicht geladen werden.");
  return response.json();
}

export async function fetchPostcodeRecords(bundesland = "") {
  const query = new URLSearchParams();
  if (bundesland) query.append("bundesland", bundesland);
  const url = query.toString()
    ? `${APP_CONFIG.api.baseUrl}/markers/postcode-records?${query.toString()}`
    : `${APP_CONFIG.api.baseUrl}/markers/postcode-records`;
  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error("PLZ-Datensätze konnten nicht geladen werden.");
  return response.json();
}

export async function fetchGeoFeatures(limit = null, bundesland = "") {
  const query = new URLSearchParams();
  if (limit !== null && limit !== undefined) query.append("limit", String(limit));
  if (bundesland) query.append("bundesland", bundesland);
  const url = query.toString()
    ? `${APP_CONFIG.api.baseUrl}/markers/geo-features?${query.toString()}`
    : `${APP_CONFIG.api.baseUrl}/markers/geo-features`;
  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error("GeoJSON-Features konnten nicht geladen werden.");
  return response.json();
}

export async function fetchBundeslaender() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/markers/bundeslaender`, fetchOptions);
  if (!response.ok) throw new Error("Bundesländer konnten nicht geladen werden.");
  return response.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function getMe() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/me`, fetchOptions);
  if (!response.ok) return null;
  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/login`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Login fehlgeschlagen.");
  return data;
}

export async function logout() {
  await fetch(`${APP_CONFIG.api.baseUrl}/auth/logout`, {
    ...fetchOptions,
    method: "POST",
  });
}

export async function register(email, password, passwordConfirm) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/register`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, password_confirm: passwordConfirm }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Registrierung fehlgeschlagen.");
  return data;
}

export async function getInviteInfo(token) {
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/auth/invite-info/${encodeURIComponent(token)}`,
    fetchOptions
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Einladungslink ungültig.");
  return data;
}

export async function acceptInvite(token, password, passwordConfirm) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/accept-invite`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Einladung konnte nicht angenommen werden.");
  return data;
}

export async function forgotPassword(email) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/forgot-password`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Fehler.");
  return data;
}

export async function resetPassword(token, password, passwordConfirm) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/auth/reset-password`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password, password_confirm: passwordConfirm }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Passwort konnte nicht zurückgesetzt werden.");
  return data;
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function fetchMyTeams() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/teams/`, fetchOptions);
  if (!response.ok) throw new Error("Teams konnten nicht geladen werden.");
  return response.json();
}

export async function createTeam(name) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/teams/`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Team konnte nicht erstellt werden.");
  return data;
}

export async function renameTeam(teamId, name) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/teams/${teamId}`, {
    ...fetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Team konnte nicht umbenannt werden.");
  return data;
}

export async function fetchTeamMembers(teamId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/teams/${teamId}/members`, fetchOptions);
  if (!response.ok) throw new Error("Mitglieder konnten nicht geladen werden.");
  return response.json();
}

export async function inviteTeamMember(teamId, userEmail, role) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/teams/${teamId}/members`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_email: userEmail, role }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Mitglied konnte nicht hinzugefügt werden.");
  return data;
}

export async function updateMemberRole(teamId, memberEmail, role) {
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/teams/${teamId}/members/${encodeURIComponent(memberEmail)}`,
    {
      ...fetchOptions,
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Rolle konnte nicht geändert werden.");
  return data;
}

export async function removeTeamMember(teamId, memberEmail) {
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/teams/${teamId}/members/${encodeURIComponent(memberEmail)}`,
    { ...fetchOptions, method: "DELETE" }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Mitglied konnte nicht entfernt werden.");
  return data;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

export async function fetchTabs(teamId) {
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/tabs/?team_id=${encodeURIComponent(teamId)}`,
    fetchOptions
  );
  if (!response.ok) throw new Error("Tabs konnten nicht geladen werden.");
  return response.json();
}

export async function createTab(name, teamId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, team_id: teamId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Tab konnte nicht angelegt werden.");
  return data;
}

export async function updateTab(tabId, name) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/${tabId}`, {
    ...fetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Tab konnte nicht aktualisiert werden.");
  return data;
}

export async function deleteTab(tabId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/${tabId}`, {
    ...fetchOptions,
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Tab konnte nicht gelöscht werden.");
  return data;
}

// ── Groups ────────────────────────────────────────────────────────────────────

export async function fetchGroups(tabId = null) {
  const query = new URLSearchParams();
  if (tabId !== null && tabId !== undefined) query.append("tab_id", String(tabId));
  const url = query.toString()
    ? `${APP_CONFIG.api.baseUrl}/groups/?${query.toString()}`
    : `${APP_CONFIG.api.baseUrl}/groups/`;
  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error("Gruppen konnten nicht geladen werden.");
  return response.json();
}

export async function createGroup(tabId, name, color, value) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/groups/`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab_id: tabId, name, color, value }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Gruppe konnte nicht angelegt werden.");
  return data;
}

export async function updateGroup(groupId, name, color, value) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/groups/${groupId}`, {
    ...fetchOptions,
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color, value }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Gruppe konnte nicht aktualisiert werden.");
  return data;
}

export async function deleteGroup(groupId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/groups/${groupId}`, {
    ...fetchOptions,
    method: "DELETE",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Gruppe konnte nicht gelöscht werden.");
  return data;
}

// ── Assignments ───────────────────────────────────────────────────────────────

export async function fetchAssignments(tabId = null) {
  const query = new URLSearchParams();
  if (tabId !== null && tabId !== undefined) query.append("tab_id", String(tabId));
  const url = query.toString()
    ? `${APP_CONFIG.api.baseUrl}/assignments/?${query.toString()}`
    : `${APP_CONFIG.api.baseUrl}/assignments/`;
  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error("Zuweisungen konnten nicht geladen werden.");
  return response.json();
}

export async function fetchPostcodeValues(teamId) {
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/assignments/values?team_id=${encodeURIComponent(teamId)}`,
    fetchOptions
  );
  if (!response.ok) throw new Error("PLZ-Werte konnten nicht geladen werden.");
  return response.json();
}

export async function assignPostcodesToGroup(tabId, groupId, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/bulk`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab_id: tabId, group_id: groupId, postcodes }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Zuweisung konnte nicht gespeichert werden.");
  return data;
}

export async function assignValueToPostcodes(teamId, value, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/values/bulk`, {
    ...fetchOptions,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ team_id: teamId, value, postcodes }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "PLZ-Wert konnte nicht gespeichert werden.");
  return data;
}

export async function deleteAssignmentsByPostcodes(tabId, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/bulk`, {
    ...fetchOptions,
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tab_id: tabId, postcodes }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Zuweisung konnte nicht entfernt werden.");
  return data;
}

export function getAssignmentsExportUrl(tabId = null) {
  if (tabId === null || tabId === undefined) {
    return `${APP_CONFIG.api.baseUrl}/assignments/export`;
  }
  return `${APP_CONFIG.api.baseUrl}/assignments/export?tab_id=${encodeURIComponent(tabId)}`;
}

export async function importAssignmentsCsv(file, tabId) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/assignments/import?tab_id=${encodeURIComponent(tabId)}`,
    { ...fetchOptions, method: "POST", body: formData }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "CSV-Import fehlgeschlagen.");
  return data;
}

export async function importPostcodeValuesFile(file, teamId) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(
    `${APP_CONFIG.api.baseUrl}/assignments/import-values?team_id=${encodeURIComponent(teamId)}`,
    { ...fetchOptions, method: "POST", body: formData }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Werte-Import fehlgeschlagen.");
  return data;
}
