import { APP_CONFIG } from "./config";

// Standard-Optionen für Cloudflare Access
const fetchOptions = {
  credentials: "include", // DAS IST DER MAGISCHE BEFEHL FÜR CLOUDFLARE
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

  if (limit !== null && limit !== undefined) {
    query.append("limit", String(limit));
  }

  if (bundesland) {
    query.append("bundesland", bundesland);
  }

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

export async function fetchTabs() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/`, fetchOptions);
  if (!response.ok) throw new Error("Tabs konnten nicht geladen werden.");
  return response.json();
}

export async function createTab(name) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/`, {
    ...fetchOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Tab konnte nicht angelegt werden.");
  }

  return data;
}

export async function updateTab(tabId, name) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/${tabId}`, {
    ...fetchOptions,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Tab konnte nicht aktualisiert werden.");
  }

  return data;
}

export async function deleteTab(tabId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/tabs/${tabId}`, {
    ...fetchOptions,
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Tab konnte nicht gelöscht werden.");
  }

  return data;
}

export async function fetchGroups(tabId = null) {
  const query = new URLSearchParams();

  if (tabId !== null && tabId !== undefined) {
    query.append("tab_id", String(tabId));
  }

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
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tab_id: tabId,
      name,
      color,
      value,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Gruppe konnte nicht angelegt werden.");
  }

  return data;
}

export async function updateGroup(groupId, name, color, value) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/groups/${groupId}`, {
    ...fetchOptions,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      color,
      value,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Gruppe konnte nicht aktualisiert werden.");
  }

  return data;
}

export async function deleteGroup(groupId) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/groups/${groupId}`, {
    ...fetchOptions,
    method: "DELETE",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Gruppe konnte nicht gelöscht werden.");
  }

  return data;
}

export async function fetchAssignments(tabId = null) {
  const query = new URLSearchParams();

  if (tabId !== null && tabId !== undefined) {
    query.append("tab_id", String(tabId));
  }

  const url = query.toString()
    ? `${APP_CONFIG.api.baseUrl}/assignments/?${query.toString()}`
    : `${APP_CONFIG.api.baseUrl}/assignments/`;

  const response = await fetch(url, fetchOptions);
  if (!response.ok) throw new Error("Zuweisungen konnten nicht geladen werden.");
  return response.json();
}

export async function fetchPostcodeValues() {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/values`, fetchOptions);
  if (!response.ok) throw new Error("PLZ-Werte konnten nicht geladen werden.");
  return response.json();
}

export async function assignPostcodesToGroup(tabId, groupId, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/bulk`, {
    ...fetchOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tab_id: tabId,
      group_id: groupId,
      postcodes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Zuweisung konnte nicht gespeichert werden.");
  }

  return data;
}

export async function assignValueToPostcodes(value, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/values/bulk`, {
    ...fetchOptions,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      value,
      postcodes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "PLZ-Wert konnte nicht gespeichert werden.");
  }

  return data;
}

export async function deleteAssignmentsByPostcodes(tabId, postcodes) {
  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/bulk`, {
    ...fetchOptions,
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tab_id: tabId,
      postcodes,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Zuweisung konnte nicht entfernt werden.");
  }

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
    {
      ...fetchOptions,
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "CSV-Import fehlgeschlagen.");
  }

  return data;
}

export async function importPostcodeValuesFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${APP_CONFIG.api.baseUrl}/assignments/import-values`, {
    ...fetchOptions,
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || "Werte-Import fehlgeschlagen.");
  }

  return data;
}