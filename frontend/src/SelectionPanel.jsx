import { useEffect, useMemo, useState } from "react";
import {
  assignPostcodesToGroup,
  assignValueToPostcodes,
  createGroup,
  deleteAssignmentsByPostcodes,
  deleteGroup,
  getAssignmentsExportUrl,
  importAssignmentsCsv,
  importPostcodeValuesFile,
  updateGroup,
} from "./api";

function SelectionPanel({
  selectedItems = [],
  removePlz,
  clearSelection,
  addPlz,
  postcodeRecords = [],
  geoSampleInfo = "",
  geoFeatureLimit,
  setGeoFeatureLimit,
  bundeslaender = [],
  selectedBundesland = "",
  setSelectedBundesland,
  activeFilterLabel = "Alle Bundesländer",
  groups = [],
  assignments = [],
  postcodeValues = [],
  selectedGroupId = null,
  setSelectedGroupId,
  reloadAssignments,
  reloadGroups,
  reloadPostcodeValues,
  selectedTabId = null,
  activeTabName = "",
  userRole = null,
}) {
  const canEdit = userRole === "admin" || userRole === "editor";
  const [searchValue, setSearchValue] = useState("");
  const [addPlzValue, setAddPlzValue] = useState("");
  const [addPlzMessage, setAddPlzMessage] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentSearchValue, setAssignmentSearchValue] = useState("");
  const [assignmentGroupFilter, setAssignmentGroupFilter] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importMessage, setImportMessage] = useState("");

  const [groupFormName, setGroupFormName] = useState("");
  const [groupFormColor, setGroupFormColor] = useState("#2563eb");
  const [groupFormValue, setGroupFormValue] = useState("");
  const [groupFormMessage, setGroupFormMessage] = useState("");
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [showGroupEditor, setShowGroupEditor] = useState(false);

  useEffect(() => {
    setEditingGroupId(null);
    setGroupFormName("");
    setGroupFormColor("#2563eb");
    setGroupFormValue("");
    setGroupFormMessage("");
    setAssignmentMessage("");
    setImportMessage("");
    setShowGroupEditor(false);
  }, [selectedTabId]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), "de", {
        sensitivity: "base",
      })
    );
  }, [groups]);

  const groupById = useMemo(() => {
    const map = {};
    for (const group of groups) {
      map[group.id] = group;
    }
    return map;
  }, [groups]);

  const postcodeRecordByPostcode = useMemo(() => {
    const map = {};
    for (const record of postcodeRecords) {
      const postcode = String(record?.postcode || "").trim();
      if (!postcode) continue;
      map[postcode] = record;
    }
    return map;
  }, [postcodeRecords]);

  const assignmentByPostcode = useMemo(() => {
    const map = {};
    for (const assignment of assignments) {
      const postcode = String(assignment?.postcode || "").trim();
      if (!postcode) continue;
      map[postcode] = assignment;
    }
    return map;
  }, [assignments]);

  const assignmentListItems = useMemo(() => {
    return assignments
      .map((assignment) => {
        const postcode = String(assignment?.postcode || "").trim();
        const record = postcodeRecordByPostcode[postcode];
        const assignedGroup = groupById[assignment.group_id] || null;

        return {
          postcode,
          groupId: assignment.group_id,
          groupName: assignedGroup?.name || `Gruppe ${assignment.group_id}`,
          groupColor: assignedGroup?.color || "#9ca3af",
          groupValue: assignedGroup?.value ?? null,
          name:
            record?.name ||
            record?.bundesland ||
            record?.plz2 ||
            "Kein Zusatzinfo im aktuellen Filter",
        };
      })
      .sort((a, b) => {
        const groupCompare = a.groupName.localeCompare(b.groupName, "de", {
          sensitivity: "base",
        });
        if (groupCompare !== 0) return groupCompare;
        return a.postcode.localeCompare(b.postcode, "de", { sensitivity: "base" });
      });
  }, [assignments, postcodeRecordByPostcode, groupById]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return selectedItems;
    return selectedItems.filter((item) => {
      const plz = String(item?.plz || "").toLowerCase();
      const name = String(item?.name || "").toLowerCase();
      return plz.includes(query) || name.includes(query);
    });
  }, [selectedItems, searchValue]);

  const filteredAssignmentListItems = useMemo(() => {
    const query = assignmentSearchValue.trim().toLowerCase();
    return assignmentListItems.filter((item) => {
      const matchesSearch =
        !query ||
        item.postcode.toLowerCase().includes(query) ||
        item.groupName.toLowerCase().includes(query) ||
        String(item.name || "").toLowerCase().includes(query);
      const matchesGroup =
        !assignmentGroupFilter ||
        String(item.groupId) === String(assignmentGroupFilter);
      return matchesSearch && matchesGroup;
    });
  }, [assignmentListItems, assignmentSearchValue, assignmentGroupFilter]);

  const selectedGroup = selectedGroupId ? groupById[selectedGroupId] || null : null;

  const selectedAssignedPostcodes = useMemo(() => {
    return selectedItems
      .map((item) => String(item?.plz || "").trim())
      .filter((postcode) => Boolean(assignmentByPostcode[postcode]));
  }, [selectedItems, assignmentByPostcode]);

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupFormName("");
    setGroupFormColor("#2563eb");
    setGroupFormValue("");
    setShowGroupEditor(false);
  };

  const handleStartEditGroup = (group) => {
    setEditingGroupId(group.id);
    setGroupFormName(group.name);
    setGroupFormColor(group.color);
    setGroupFormValue(
      group.value === null || group.value === undefined ? "" : String(group.value)
    );
    setGroupFormMessage("");
    setShowGroupEditor(true);
  };

  const handleStartCreateGroup = () => {
    setEditingGroupId(null);
    setGroupFormName("");
    setGroupFormColor("#2563eb");
    setGroupFormValue("");
    setGroupFormMessage("");
    setShowGroupEditor(true);
  };

  const handleSaveGroup = async () => {
    if (!selectedTabId) {
      setGroupFormMessage("Bitte zuerst einen Produktbereich auswählen.");
      return;
    }

    const normalizedName = groupFormName.trim();
    const normalizedValue = groupFormValue.trim().replace(",", ".");

    if (!normalizedName) {
      setGroupFormMessage("Bitte einen Gruppennamen eingeben.");
      return;
    }

    if (!/^#[0-9a-fA-F]{6}$/.test(groupFormColor)) {
      setGroupFormMessage("Bitte eine gültige Farbe wählen.");
      return;
    }

    let parsedValue = null;
    if (normalizedValue !== "") {
      parsedValue = Number(normalizedValue);
      if (Number.isNaN(parsedValue)) {
        setGroupFormMessage("Bitte einen gültigen numerischen Wert eingeben.");
        return;
      }
    }

    try {
      let result;
      if (editingGroupId) {
        result = await updateGroup(editingGroupId, normalizedName, groupFormColor, parsedValue);
      } else {
        result = await createGroup(selectedTabId, normalizedName, groupFormColor, parsedValue);
      }

      await reloadGroups?.();
      setGroupFormMessage(result.message || "Gruppe gespeichert.");
      setShowGroupEditor(false);
      setEditingGroupId(null);
      setGroupFormName("");
      setGroupFormColor("#2563eb");
      setGroupFormValue("");
    } catch (error) {
      setGroupFormMessage(error.message || "Fehler beim Speichern der Gruppe.");
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    const confirmed = window.confirm(
      `Möchtest du die Gruppe "${groupName}" wirklich löschen?\n\nAlle Zuweisungen dieser Gruppe gehen dabei verloren.`
    );
    if (!confirmed) return;

    try {
      const result = await deleteGroup(groupId);
      await reloadGroups?.();
      await reloadAssignments?.();
      if (selectedGroupId === groupId) setSelectedGroupId?.(null);
      if (editingGroupId === groupId) resetGroupForm();
      setGroupFormMessage(result.message || "Gruppe gelöscht.");
    } catch (error) {
      setGroupFormMessage(error.message || "Fehler beim Löschen der Gruppe.");
    }
  };

  const handleAddPlz = () => {
    const normalized = addPlzValue.trim();
    if (!/^\d{5}$/.test(normalized)) {
      setAddPlzMessage("Bitte eine gültige fünfstellige PLZ eingeben.");
      return;
    }
    const exists = postcodeRecords.some((item) => item?.postcode === normalized);
    if (!exists) {
      setAddPlzMessage("Diese PLZ wurde in den geladenen Datensätzen nicht gefunden.");
      return;
    }
    addPlz?.(normalized);
    setAddPlzMessage(`PLZ ${normalized} wurde zur Auswahl hinzugefügt.`);
    setAddPlzValue("");
  };

  const handleAssignToGroup = async () => {
    if (!selectedTabId) { setAssignmentMessage("Bitte zuerst einen Produktbereich auswählen."); return; }
    if (!selectedGroupId) { setAssignmentMessage("Bitte zuerst eine Gruppe auswählen."); return; }
    if (selectedItems.length === 0) { setAssignmentMessage("Bitte zuerst mindestens eine PLZ auswählen."); return; }

    try {
      const result = await assignPostcodesToGroup(
        selectedTabId, selectedGroupId, selectedItems.map((item) => item.plz)
      );
      await reloadAssignments?.();
      clearSelection?.();
      setAssignmentMessage(result.message || "Zuweisung gespeichert.");
    } catch (error) {
      setAssignmentMessage(error.message || "Fehler beim Speichern der Zuweisung.");
    }
  };

  const handleRemoveSelectedAssignments = async () => {
    if (!selectedTabId) { setAssignmentMessage("Bitte zuerst einen Produktbereich auswählen."); return; }
    if (selectedAssignedPostcodes.length === 0) {
      setAssignmentMessage("In der aktuellen Auswahl gibt es keine bestehenden Gruppenzuweisungen.");
      return;
    }
    const confirmed = window.confirm(
      `Möchtest du ${selectedAssignedPostcodes.length} ausgewählte PLZ aus ihrer bisherigen Gruppe entfernen?`
    );
    if (!confirmed) return;

    try {
      const result = await deleteAssignmentsByPostcodes(selectedTabId, selectedAssignedPostcodes);
      await reloadAssignments?.();
      selectedAssignedPostcodes.forEach((postcode) => removePlz?.(postcode));
      setAssignmentMessage(result.message || "Zuweisungen entfernt.");
    } catch (error) {
      setAssignmentMessage(error.message || "Fehler beim Entfernen der Zuweisungen.");
    }
  };

  const handleRemoveAssignment = async (postcode) => {
    if (!selectedTabId) { setAssignmentMessage("Bitte zuerst einen Produktbereich auswählen."); return; }
    const assignment = assignmentByPostcode[postcode];
    const assignedGroup = assignment ? groupById[assignment.group_id] : null;
    const groupLabel = assignedGroup?.name ? ` aus ${assignedGroup.name}` : "";
    const confirmed = window.confirm(
      `Möchtest du die Zuweisung der PLZ ${postcode}${groupLabel} wirklich entfernen?`
    );
    if (!confirmed) return;

    try {
      const result = await deleteAssignmentsByPostcodes(selectedTabId, [postcode]);
      await reloadAssignments?.();
      removePlz?.(postcode);
      setAssignmentMessage(result.message || "Zuweisung entfernt.");
    } catch (error) {
      setAssignmentMessage(error.message || "Fehler beim Entfernen der Zuweisung.");
    }
  };

  const handleExportAssignments = () => {
    window.open(getAssignmentsExportUrl(selectedTabId), "_blank");
  };

  const handleImportAssignments = async () => {
    if (!selectedTabId) { setImportMessage("Bitte zuerst einen Produktbereich auswählen."); return; }
    if (!importFile) { setImportMessage("Bitte zuerst eine CSV-Datei auswählen."); return; }
    try {
      const result = await importAssignmentsCsv(importFile, selectedTabId);
      await reloadAssignments?.();
      setImportMessage(result.message || "CSV-Import erfolgreich.");
      setImportFile(null);
    } catch (error) {
      setImportMessage(error.message || "CSV-Import fehlgeschlagen.");
    }
  };

  const renderGroupValueText = (value) => {
    if (value === null || value === undefined || value === "") return "Kein Wert";
    return String(value);
  };

  return (
    <aside className="shell-card panel-aside">
      {/* Header */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "6px" }}>Produktbereich</div>
        <div style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.03em" }}>
          {activeTabName || "Kein Bereich gewählt"}
        </div>
        <div style={{ marginTop: "8px", fontSize: "14px", color: "#6b7280" }}>{activeFilterLabel}</div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        {[
          { value: selectedItems.length, label: "Ausgewählt" },
          { value: sortedGroups.length, label: "Gruppen" },
          { value: assignments.length, label: "Zuweisungen" },
        ].map(({ value, label }) => (
          <div key={label} className="soft-card" style={{ flex: 1, padding: "14px" }}>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Gruppe zuweisen */}
      <div className="soft-card" style={{ padding: "16px", marginBottom: "18px" }}>
        <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Aktuelle Aktion</div>
        <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: "#111827" }}>
          Gruppe für die Auswahl
        </div>

        {sortedGroups.length > 0 ? (
          <div className="group-list">
            {sortedGroups.map((group) => {
              const isActive = selectedGroupId === group.id;
              const count = assignments.filter((a) => a.group_id === group.id).length;
              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId?.(group.id)}
                  className={`group-row${isActive ? " group-row--active" : ""}`}
                  style={{ "--gc": group.color }}
                >
                  <span
                    className="group-dot"
                    style={{ background: group.color, boxShadow: isActive ? `0 0 0 3px ${group.color}33` : "none" }}
                  />
                  <span className="group-name">{group.name}</span>
                  {group.value != null && (
                    <span className="group-value">{renderGroupValueText(group.value)}</span>
                  )}
                  <span className="group-count">{count}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="message-text" style={{ padding: "10px 0 8px", color: "#9ca3af" }}>
            Noch keine Gruppen vorhanden.
          </div>
        )}

        <div style={{ marginBottom: "12px", minHeight: "28px", display: "flex", alignItems: "center", gap: "8px" }}>
          {selectedGroup ? (
            <>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: selectedGroup.color, flexShrink: 0 }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{selectedGroup.name}</span>
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>aktiv — Klick auf Karte oder PLZ-Feld zuweisen</span>
            </>
          ) : (
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Wähle eine Gruppe oben aus, dann PLZ zuweisen.</span>
          )}
        </div>

        {canEdit ? (
          <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
            <button
              className="btn sp-btn-dark"
              onClick={handleAssignToGroup}
              style={{ boxShadow: selectedGroup ? `0 10px 22px ${selectedGroup.color}33` : "0 10px 20px rgba(17,24,39,0.18)" }}
            >
              Auswahl dieser Gruppe zuweisen
            </button>
            <button className="btn sp-btn-muted" onClick={handleRemoveSelectedAssignments}>
              Auswahl aus bestehender Gruppe entfernen
            </button>
          </div>
        ) : (
          <div className="soft-card message-text" style={{ padding: "10px 12px" }}>
            Als Betrachter kannst du keine Zuweisungen vornehmen.
          </div>
        )}

        {assignmentMessage && (
          <div className="message-text--dark" style={{ marginTop: "10px" }}>{assignmentMessage}</div>
        )}
      </div>

      {/* Gruppen verwalten */}
      <div className="soft-card" style={{ padding: "16px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Gruppen</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Farben, Namen und Werte verwalten</div>
          </div>
          {canEdit && (
            <button className="btn sp-btn-subtle" onClick={handleStartCreateGroup}>Neue Gruppe</button>
          )}
        </div>

        {showGroupEditor && (
          <div className="soft-card" style={{ padding: "12px", marginBottom: "12px", background: "#f8fafc" }}>
            <input
              type="text"
              placeholder="Gruppenname"
              value={groupFormName}
              onChange={(e) => setGroupFormName(e.target.value)}
              className="form-input form-input--white"
              style={{ marginBottom: "10px" }}
            />
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                type="color"
                value={groupFormColor}
                onChange={(e) => setGroupFormColor(e.target.value)}
                style={{ width: "54px", height: "44px", borderRadius: "14px", border: "1px solid rgba(15,23,42,0.09)", background: "white", padding: "4px", boxSizing: "border-box" }}
              />
              <input
                type="text"
                placeholder="Optionaler Wert"
                value={groupFormValue}
                onChange={(e) => setGroupFormValue(e.target.value)}
                className="form-input form-input--white"
                style={{ flex: 1, width: "auto" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: groupFormMessage ? "10px" : "0" }}>
              <button className="btn sp-btn-action" style={{ flex: 1 }} onClick={handleSaveGroup}>
                {editingGroupId ? "Änderungen speichern" : "Gruppe anlegen"}
              </button>
              <button className="btn sp-btn-cancel" onClick={resetGroupForm}>Schließen</button>
            </div>
            {groupFormMessage && <div className="message-text--dark">{groupFormMessage}</div>}
          </div>
        )}

        {sortedGroups.length > 0 ? (
          <div className="scroll-list" style={{ maxHeight: "260px" }}>
            {sortedGroups.map((group) => {
              const isActive = selectedGroupId === group.id;
              return (
                <div
                  key={group.id}
                  style={{
                    padding: "12px",
                    borderRadius: "16px",
                    background: isActive ? "#eef4ff" : "#f8fafc",
                    border: isActive ? "1px solid rgba(59,130,246,0.28)" : "1px solid rgba(15,23,42,0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                    <button
                      onClick={() => setSelectedGroupId?.(group.id)}
                      className="btn"
                      style={{ background: "transparent", padding: 0, textAlign: "left", flex: 1, display: "flex", alignItems: "center", gap: "10px" }}
                    >
                      <div style={{ width: "14px", height: "14px", borderRadius: "5px", background: group.color, border: "1px solid rgba(15,23,42,0.12)", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>{group.name}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{renderGroupValueText(group.value)}</div>
                      </div>
                    </button>
                    {canEdit && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="btn sp-btn-subtle" onClick={() => handleStartEditGroup(group)}>Bearbeiten</button>
                        <button className="btn sp-btn-delete" onClick={() => handleDeleteGroup(group.id, group.name)}>Löschen</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="soft-card message-text" style={{ padding: "14px" }}>Noch keine Gruppen vorhanden.</div>
        )}
      </div>

      {/* Aktuelle Auswahl */}
      <div className="soft-card" style={{ padding: "16px", marginBottom: "18px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px" }}>Aktuelle Auswahl</div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="PLZ direkt eingeben"
            value={addPlzValue}
            onChange={(e) => setAddPlzValue(e.target.value)}
            className="form-input"
            style={{ flex: 1, width: "auto" }}
          />
          <button className="btn sp-btn-action" onClick={handleAddPlz}>Hinzufügen</button>
        </div>

        {addPlzMessage && <div className="message-text--dark" style={{ marginBottom: "10px" }}>{addPlzMessage}</div>}

        <input
          type="text"
          placeholder="Auswahl durchsuchen"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="form-input"
          style={{ marginBottom: "10px" }}
        />

        {selectedItems.length > 0 && (
          <button
            className="btn"
            onClick={clearSelection}
            style={{ width: "100%", marginBottom: "10px", background: "#fee2e2", color: "#991b1b", borderRadius: "14px", padding: "11px 12px" }}
          >
            Auswahl leeren
          </button>
        )}

        {filteredItems.length > 0 ? (
          <div className="scroll-list" style={{ maxHeight: "260px" }}>
            {filteredItems.map((item) => {
              const postcode = String(item?.plz || "").trim();
              const assignment = assignmentByPostcode[postcode];
              const assignedGroup = assignment ? groupById[assignment.group_id] : null;

              return (
                <div
                  key={item.plz}
                  style={{ padding: "12px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{item.plz}</div>
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.name}
                    </div>
                    {assignedGroup && (
                      <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "999px", background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)", fontSize: "12px", color: "#374151" }}>
                        <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: assignedGroup.color, display: "inline-block", border: "1px solid rgba(15,23,42,0.12)" }} />
                        {assignedGroup.name}
                      </div>
                    )}
                  </div>
                  <button className="btn sp-btn-remove" onClick={() => removePlz?.(item.plz)}>Entfernen</button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="soft-card message-text" style={{ padding: "14px" }}>
            {selectedItems.length === 0 ? "Noch keine PLZ ausgewählt." : "Keine Treffer in der aktuellen Auswahl."}
          </div>
        )}
      </div>

      {/* Zuweisungen */}
      <div className="soft-card" style={{ padding: "16px", marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px" }}>Zuweisungen</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Bestehende Gebietszuweisungen im aktiven Bereich</div>
          </div>
          <button className="btn sp-btn-subtle" onClick={handleExportAssignments}>Export</button>
        </div>

        {canEdit && (
          <div style={{ marginBottom: "12px" }}>
            <input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files?.[0] || null)} style={{ marginBottom: "10px", width: "100%" }} />
            <button
              className="btn sp-btn-import"
              onClick={handleImportAssignments}
              style={{ marginBottom: importMessage ? "10px" : "0" }}
            >
              Import
            </button>
            {importMessage && <div className="message-text--dark">{importMessage}</div>}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="Zuweisungen durchsuchen"
            value={assignmentSearchValue}
            onChange={(e) => setAssignmentSearchValue(e.target.value)}
            className="form-input"
          />
          <select
            value={assignmentGroupFilter}
            onChange={(e) => setAssignmentGroupFilter(e.target.value)}
            className="form-select"
          >
            <option value="">Alle Gruppen</option>
            {sortedGroups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        {filteredAssignmentListItems.length > 0 ? (
          <div className="scroll-list" style={{ maxHeight: "340px" }}>
            {filteredAssignmentListItems.map((item) => (
              <div
                key={item.postcode}
                style={{ padding: "12px", borderRadius: "16px", background: "#f8fafc", border: "1px solid rgba(15,23,42,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{item.postcode}</div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.name}
                  </div>
                  <div style={{ marginTop: "6px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "4px 8px", borderRadius: "999px", background: "#ffffff", border: "1px solid rgba(15,23,42,0.08)", fontSize: "12px", color: "#374151" }}>
                    <span style={{ width: "10px", height: "10px", borderRadius: "999px", background: item.groupColor, display: "inline-block", border: "1px solid rgba(15,23,42,0.12)" }} />
                    {item.groupName}
                    {item.groupValue !== null && item.groupValue !== undefined ? ` (${item.groupValue})` : ""}
                  </div>
                </div>
                {canEdit && (
                  <button className="btn sp-btn-remove-danger" onClick={() => handleRemoveAssignment(item.postcode)}>
                    Entfernen
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="soft-card message-text" style={{ padding: "14px" }}>
            Noch keine Zuweisungen im aktuellen Produktbereich vorhanden.
          </div>
        )}
      </div>

      {/* Karte */}
      <div className="soft-card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px" }}>Karte</div>

        <div style={{ marginBottom: "10px" }}>
          <select
            value={selectedBundesland}
            onChange={(e) => setSelectedBundesland?.(e.target.value)}
            className="form-select"
          >
            <option value="">Alle Bundesländer</option>
            {bundeslaender.map((bundesland) => (
              <option key={bundesland} value={bundesland}>{bundesland}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {[200, 1000, 2000].map((limit) => (
            <button
              key={limit}
              onClick={() => setGeoFeatureLimit?.(limit)}
              className="btn sp-btn-subtle"
              style={{
                background: geoFeatureLimit === limit ? "#111827" : "#eef2f7",
                color: geoFeatureLimit === limit ? "white" : "#111827",
                borderRadius: "999px",
                padding: "9px 12px",
              }}
            >
              {limit}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default SelectionPanel;
