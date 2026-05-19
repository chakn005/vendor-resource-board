const { useState, useEffect, useMemo, useRef, useCallback } = React;

const FALLBACK_DATA = window.VENDOR_BOARD_INITIAL_DATA || [];
const shared = () => window.VendorBoardSharedState;
const sheetSync = () => window.VendorSheetSync;

function cleanRows(rows) {
  return rows.map((r) => {
    const obj = {};
    for (const k in r) obj[k] = r[k] === null || r[k] === undefined ? "" : r[k];
    return obj;
  });
}

function SyncBadge({ status }) {
  const map = {
    loading: { label: "Connecting…", color: "#854F0B", bg: "#FAEEDA" },
    live: { label: "Live · org-wide", color: "#0F6E56", bg: "#E1F5EE" },
    "live-editor": { label: "Live · you can publish", color: "#185FA5", bg: "#E6F1FB" },
    local: { label: "Local only (configure Supabase)", color: "#888780", bg: "#F1EFE8" },
    error: { label: "Sync error", color: "#993C1D", bg: "#FAECE7" }
  };
  const s = map[status] || map.local;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 500, color: s.color, background: s.bg
    }}>{s.label}</span>
  );
}

const ALLIANCE_COLORS = { CP: "#185FA5", BO: "#0F6E56", ES: "#854F0B" };
const ALLIANCE_BG = { CP: "#E6F1FB", BO: "#E1F5EE", ES: "#FAEEDA" };
const TZ_COLORS = { EST: "#533AB7", IST: "#993C1D", PST: "#0F6E56" };
const FUNDING_COLORS = { CapEx: "#185FA5", Opex: "#0F6E56", Shadow: "#888780", "": "#B4B2A9" };

function initials(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
}

function Badge({ label, color, bg, size = 12 }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      background: bg,
      color: color,
      fontSize: size,
      fontWeight: 500,
      whiteSpace: "nowrap"
    }}>{label}</span>
  );
}

function CapabilityDot({ val }) {
  const yes = val === "Yes";
  const no = val === "No";
  return (
    <span style={{
      display: "inline-block",
      width: 10, height: 10,
      borderRadius: "50%",
      background: yes ? "#1D9E75" : no ? "#E24B4A" : "#D3D1C7"
    }} title={val || "—"} />
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)",
      borderRadius: "var(--border-radius-md)",
      padding: "12px 16px",
      minWidth: 110
    }}>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 500, lineHeight: 1, color: "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function VendorRow({ row, onClick }) {
  const avail = String(row["Availability"]);
  const availNum = parseInt(avail) || 0;
  const hasAvail = availNum > 0;

  return (
    <tr
      onClick={() => onClick(row)}
      style={{ cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: row.Vendor === "Beqisoft" ? "#B5D4F4" : "#C0DD97",
            color: row.Vendor === "Beqisoft" ? "#042C53" : "#173404",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 500
          }}>{initials(row.Name)}</div>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row.Name}</span>
        </div>
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <Badge label={row.Vendor} color={row.Vendor === "Beqisoft" ? "#042C53" : "#173404"} bg={row.Vendor === "Beqisoft" ? "#B5D4F4" : "#C0DD97"} />
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <Badge label={row.Alliance} color={ALLIANCE_COLORS[row.Alliance] || "#444"} bg={ALLIANCE_BG[row.Alliance] || "#eee"} />
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["Role FY25"]}</td>
      <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--color-text-secondary)" }}>{row["QE Manager"]}</td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <Badge label={row["Time Zone Support"]} color={TZ_COLORS[row["Time Zone Support"]] || "#444"} bg={row["Time Zone Support"] === "EST" ? "#EEEDFE" : row["Time Zone Support"] === "IST" ? "#FAECE7" : "#E1F5EE"} />
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 50, height: 6, background: "var(--color-border-tertiary)", borderRadius: 3, overflow: "hidden"
          }}>
            <div style={{ width: `${row["Allocation %"]}%`, height: "100%", background: row["Allocation %"] >= 90 ? "#E24B4A" : row["Allocation %"] >= 60 ? "#EF9F27" : "#1D9E75", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{row["Allocation %"]}%</span>
        </div>
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <span style={{ color: hasAvail ? "#0F6E56" : "var(--color-text-secondary)" }}>{avail || "0"}</span>
      </td>
      <td style={{ padding: "8px 10px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>UI</span><CapabilityDot val={row.UI} />
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>API</span><CapabilityDot val={row.API} />
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>SQL</span><CapabilityDot val={row.SQL} />
          <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>LT</span><CapabilityDot val={row["Load Testing"]} />
        </div>
      </td>
      <td style={{ padding: "8px 10px", fontSize: 12 }}>
        <Badge label={row.Funding || "—"} color={FUNDING_COLORS[row.Funding] || "#444"} bg={row.Funding === "CapEx" ? "#E6F1FB" : row.Funding === "Opex" ? "#E1F5EE" : "#F1EFE8"} />
      </td>
      <td style={{ padding: "8px 10px", fontSize: 11, color: "var(--color-text-secondary)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row["Current Assignments"]}</td>
    </tr>
  );
}

function DetailPanel({ row, onClose }) {
  if (!row) return null;
  const fields = [
    ["SOW", row.SOW],
    ["Start Date", row["Start Date"]], ["End Date", row["End Date"]],
    ["IST Hours", row["IST Hours"]], ["EST Hours", row["EST Hours"]], ["PST Hours", row["PST Hours"]],
    ["Application Experience", row["Application Experience"]],
    ["Currently Trained On", row["Currently Trained On"]],
  ];
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 360,
      background: "var(--color-background-primary)",
      borderLeft: "0.5px solid var(--color-border-secondary)",
      zIndex: 100, overflowY: "auto", padding: "20px 24px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontWeight: 500, fontSize: 15 }}>Vendor Detail</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 20, lineHeight: 1 }}>×</button>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: row.Vendor === "Beqisoft" ? "#B5D4F4" : "#C0DD97",
          color: row.Vendor === "Beqisoft" ? "#042C53" : "#173404",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 500, fontSize: 15
        }}>{initials(row.Name)}</div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 15 }}>{row.Name}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{row["Role FY25"]}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        <Badge label={row.Vendor} color={row.Vendor === "Beqisoft" ? "#042C53" : "#173404"} bg={row.Vendor === "Beqisoft" ? "#B5D4F4" : "#C0DD97"} />
        <Badge label={`Alliance: ${row.Alliance}`} color={ALLIANCE_COLORS[row.Alliance]} bg={ALLIANCE_BG[row.Alliance]} />
        <Badge label={row["Time Zone Support"]} color={TZ_COLORS[row["Time Zone Support"]] || "#444"} bg={row["Time Zone Support"] === "EST" ? "#EEEDFE" : row["Time Zone Support"] === "IST" ? "#FAECE7" : "#E1F5EE"} />
        <Badge label={row.Funding || "—"} color={FUNDING_COLORS[row.Funding] || "#444"} bg={row.Funding === "CapEx" ? "#E6F1FB" : "#E1F5EE"} />
      </div>
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Allocation</span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{row["Allocation %"]}%</span>
        </div>
        <div style={{ height: 8, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${row["Allocation %"]}%`, height: "100%", background: row["Allocation %"] >= 90 ? "#E24B4A" : row["Allocation %"] >= 60 ? "#EF9F27" : "#1D9E75", borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Availability: {row["Availability"] || "0"}</span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>QE Mgr: {row["QE Manager"]}</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Capabilities</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[["UI", row.UI], ["API", row.API], ["SQL", row.SQL], ["Load Testing", row["Load Testing"]]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <CapabilityDot val={v} />
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{k}</span>
            </div>
          ))}
        </div>
      </div>
      {fields.map(([label, val]) => val ? (
        <div key={label} style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "10px 0" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{label}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{val}</div>
        </div>
      ) : null)}
    </div>
  );
}

function wantsPublishUi() {
  try {
    return new URLSearchParams(window.location.search).get("publish") === "1";
  } catch {
    return false;
  }
}

function VendorBoard() {
  const [data, setData] = useState(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [syncStatus, setSyncStatus] = useState("local");
  const [showPublisherTools, setShowPublisherTools] = useState(wantsPublishUi());
  const [sheetUrl, setSheetUrl] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [search, setSearch] = useState("");
  const [filterVendor, setFilterVendor] = useState("All");
  const [filterAlliance, setFilterAlliance] = useState("All");
  const [filterTZ, setFilterTZ] = useState("All");
  const [filterManager, setFilterManager] = useState("All");
  const [filterFunding, setFilterFunding] = useState("All");
  const [sortCol, setSortCol] = useState("Name");
  const [sortDir, setSortDir] = useState("asc");
  const [selectedRow, setSelectedRow] = useState(null);
  const [activeTab, setActiveTab] = useState("table");
  const [uploadMsg, setUploadMsg] = useState("");
  const sheetFingerprint = useRef("");

  const applyRemote = useCallback((remote) => {
    if (!remote || !Array.isArray(remote.data) || !remote.data.length) return;
    setData(remote.data);
    setLastUpdated(remote.updatedAt || remote.meta?.updatedAt || null);
    if (remote.meta?.sheetUrl) setSheetUrl(remote.meta.sheetUrl);
    if (remote.meta?.autoSync) setAutoSync(!!remote.meta.autoSync);
    const fp = sheetSync()?.contentFingerprint?.({ data: remote.data }) || "";
    sheetFingerprint.current = fp;
  }, []);

  const publishData = useCallback(async (cleaned, metaExtra) => {
    const ss = shared();
    if (!ss?.isEnabled?.()) {
      setData(cleaned);
      setLastUpdated(new Date().toISOString());
      return { ok: true, local: true };
    }
    if (!ss.canPublish()) {
      return { ok: false, needKey: true };
    }
    const meta = {
      ...(metaExtra || {}),
      sheetUrl: (metaExtra?.sheetUrl || sheetUrl || "").trim(),
      autoSync: metaExtra?.autoSync ?? autoSync
    };
    const ts = await ss.publish({ data: cleaned, meta });
    if (!ts) return { ok: false, needKey: false };
    setLastUpdated(meta.updatedAt || ts);
    sheetFingerprint.current = sheetSync()?.contentFingerprint?.({ data: cleaned }) || "";
    return { ok: true, local: false };
  }, [sheetUrl, autoSync]);

  useEffect(() => {
    const ss = shared();
    if (!ss) {
      setLoading(false);
      return;
    }
    ss.onStatusChange(setSyncStatus);
    ss.init();
    (async () => {
      const remote = await ss.fetchRemote();
      if (remote?.data?.length) applyRemote(remote);
      ss.subscribeRemote(applyRemote);
      setSyncStatus(ss.getStatus());
      setShowPublisherTools(wantsPublishUi() || ss.canPublish());
      setLoading(false);
    })();
  }, [applyRemote]);

  useEffect(() => {
    setShowPublisherTools(wantsPublishUi() || !!shared()?.canPublish?.());
  }, [syncStatus]);

  useEffect(() => {
    const ss = shared();
    if (!autoSync || !sheetUrl.trim() || !ss?.canPublish?.()) return undefined;
    const pollMs = ss.getPollIntervalMs?.() || 60000;

    const tick = async () => {
      try {
        const board = await sheetSync().syncFromGoogleSheet(sheetUrl);
        const cleaned = cleanRows(sheetSync().rowsToFlatObjects(board));
        const fp = sheetSync().contentFingerprint({ data: cleaned });
        if (fp && fp === sheetFingerprint.current) return;
        const result = await publishData(cleaned, {
          source: "google-sheet",
          sheetUrl: sheetUrl.trim(),
          autoSync: true,
          syncedAt: new Date().toISOString()
        });
        if (result.ok) {
          setData(cleaned);
          setUploadMsg(`✓ Auto-synced ${cleaned.length} rows from Google Sheet`);
        }
      } catch {
        /* silent on poll failures */
      }
    };

    tick();
    const id = setInterval(tick, pollMs);
    return () => clearInterval(id);
  }, [autoSync, sheetUrl, publishData]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadMsg("Processing…");
    try {
      let cleaned;
      if (window.VendorSheetSync?.parseUploadedFile) {
        const board = await window.VendorSheetSync.parseUploadedFile(file);
        cleaned = cleanRows(window.VendorSheetSync.rowsToFlatObjects(board));
      } else {
        const reader = new FileReader();
        cleaned = await new Promise((resolve, reject) => {
          reader.onload = (ev) => {
            try {
              const wb = window.XLSX.read(ev.target.result, { type: "array" });
              const ws = wb.Sheets[wb.SheetNames[0]];
              const json = window.XLSX.utils.sheet_to_json(ws, { defval: "" });
              resolve(cleanRows(json));
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      }

      const result = await publishData(cleaned, {
        source: "upload",
        fileName: file.name,
        syncedAt: new Date().toISOString()
      });

      if (result.needKey) {
        setUploadMsg("Enter publisher key to sync for the organization");
        shared()?.promptForEditKey?.();
        return;
      }

      setData(cleaned);
      setUploadMsg(
        result.ok
          ? `✓ ${cleaned.length} records ${result.local ? "updated locally" : "published for all viewers"}`
          : "Publish failed — check edit key and Supabase"
      );
    } catch {
      setUploadMsg("Error reading file. Use a valid .xlsx or .csv");
    }
    e.target.value = "";
  };

  const handleSheetSyncNow = async () => {
    if (!sheetUrl.trim()) {
      setUploadMsg("Paste a Google Sheets link first");
      return;
    }
    if (!shared()?.canPublish?.()) {
      shared()?.promptForEditKey?.();
      setUploadMsg("Publisher key required to sync for everyone");
      return;
    }
    setUploadMsg("Syncing from Google Sheet…");
    try {
      const board = await sheetSync().syncFromGoogleSheet(sheetUrl);
      const cleaned = cleanRows(sheetSync().rowsToFlatObjects(board));
      const result = await publishData(cleaned, {
        source: "google-sheet",
        sheetUrl: sheetUrl.trim(),
        autoSync,
        syncedAt: new Date().toISOString()
      });
      if (result.ok) {
        setData(cleaned);
        setUploadMsg(`✓ Synced ${cleaned.length} rows — all viewers updated`);
      } else {
        setUploadMsg("Sync failed — check publisher key");
      }
    } catch {
      setUploadMsg("Could not read sheet. Share as “Anyone with the link can view”");
    }
  };

  const filtered = useMemo(() => {
    return data.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        String(r.Name).toLowerCase().includes(q) ||
        String(r["Current Assignments"]).toLowerCase().includes(q) ||
        String(r["Application Experience"]).toLowerCase().includes(q) ||
        String(r.SOW).toLowerCase().includes(q) ||
        String(r["Role FY25"]).toLowerCase().includes(q);
      return matchSearch &&
        (filterVendor === "All" || r.Vendor === filterVendor) &&
        (filterAlliance === "All" || r.Alliance === filterAlliance) &&
        (filterTZ === "All" || r["Time Zone Support"] === filterTZ) &&
        (filterManager === "All" || r["QE Manager"] === filterManager) &&
        (filterFunding === "All" || r.Funding === filterFunding);
    }).sort((a, b) => {
      let av = a[sortCol] ?? ""; let bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [data, search, filterVendor, filterAlliance, filterTZ, filterManager, filterFunding, sortCol, sortDir]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const beqisoft = filtered.filter(r => r.Vendor === "Beqisoft").length;
    const zucitech = filtered.filter(r => r.Vendor === "Zucitech").length;
    const available = filtered.filter(r => parseInt(String(r.Availability)) > 0).length;
    const capex = filtered.filter(r => r.Funding === "CapEx").length;
    const opex = filtered.filter(r => r.Funding === "Opex").length;
    const byAlliance = { CP: 0, BO: 0, ES: 0 };
    filtered.forEach(r => { if (byAlliance[r.Alliance] !== undefined) byAlliance[r.Alliance]++; });
    return { total, beqisoft, zucitech, available, capex, opex, byAlliance };
  }, [filtered]);

  const qeManagers = useMemo(() => {
    const names = new Set();
    data.forEach((r) => {
      const m = String(r["QE Manager"] || "").trim();
      if (m) names.add(m);
    });
    return [...names].sort();
  }, [data]);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const SortHeader = ({ label, col }) => (
    <th
      onClick={() => toggleSort(col)}
      style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textAlign: "left", cursor: "pointer", whiteSpace: "nowrap", userSelect: "none", borderBottom: "0.5px solid var(--color-border-secondary)" }}
    >
      {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  const selStr = s => ({ padding: "6px 10px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", cursor: "pointer" });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-secondary)" }}>Loading vendor data…</div>;

  return (
    <div style={{ fontFamily: "var(--font-sans)", position: "relative" }}>
      <h2 className="sr-only">2026 Vendor Resource Board — leadership roster with KPIs, filters, and analytics</h2>

      {/* Header — leadership (default) vs publisher (?publish=1) */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Vendor Resource Board 2026</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            {showPublisherTools ? "Publisher mode · changes sync for the organization" : "Leadership & management · read-only"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : "Awaiting first publish"}
            {" · "}{data.length} resources
          </div>
          <div style={{ marginTop: 8 }}><SyncBadge status={syncStatus} /></div>
        </div>
        {showPublisherTools ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                shared()?.promptForEditKey?.();
                setShowPublisherTools(wantsPublishUi() || !!shared()?.canPublish?.());
              }}
              style={{
                padding: "6px 12px", borderRadius: "var(--border-radius-md)",
                border: "0.5px solid var(--color-border-secondary)", fontSize: 12,
                background: "var(--color-background-primary)", cursor: "pointer"
              }}
            >
              Publisher key
            </button>
            <label style={{
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              padding: "6px 12px", borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              fontSize: 12, color: "var(--color-text-primary)",
              background: "var(--color-background-primary)"
            }}>
              ↑ Upload .xlsx / .csv
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
            {uploadMsg && <span style={{ fontSize: 11, color: uploadMsg.startsWith("✓") ? "#0F6E56" : "#E24B4A" }}>{uploadMsg}</span>}
          </div>
        ) : (
          <a href="?publish=1" style={{ fontSize: 12, color: "#185fa5", textDecoration: "none", padding: "6px 0" }}>
            Publisher tools →
          </a>
        )}
      </div>

      {showPublisherTools && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
          marginBottom: 16, padding: "10px 12px",
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          border: "0.5px solid var(--color-border-tertiary)"
        }}>
          <input
            type="url"
            placeholder="Google Sheets URL — changes sync for all viewers when published"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            style={{
              flex: "1 1 280px", padding: "6px 10px", fontSize: 12,
              borderRadius: "var(--border-radius-md)",
              border: "0.5px solid var(--color-border-secondary)",
              background: "var(--color-background-primary)"
            }}
          />
          <button type="button" onClick={handleSheetSyncNow} style={{
            padding: "6px 12px", fontSize: 12, cursor: "pointer",
            borderRadius: "var(--border-radius-md)",
            border: "0.5px solid var(--color-border-secondary)",
            background: "var(--color-background-primary)"
          }}>Sync now</button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            Auto-sync every minute
          </label>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {[["table","Table View"],["analytics","Analytics"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              padding: "8px 16px", fontSize: 13, cursor: "pointer", border: "none",
              background: "none", color: activeTab === id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: activeTab === id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6, fontWeight: activeTab === id ? 500 : 400
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatCard label="Total Resources" value={stats.total} />
        <StatCard label="Beqisoft" value={stats.beqisoft} />
        <StatCard label="Zucitech" value={stats.zucitech} />
        <StatCard label="Available" value={stats.available} sub={`${Math.round((stats.available/Math.max(stats.total,1))*100)}% of total`} />
        <StatCard label="CapEx" value={stats.capex} />
        <StatCard label="Opex" value={stats.opex} />
        <StatCard label="CP Alliance" value={stats.byAlliance.CP} />
        <StatCard label="ES Alliance" value={stats.byAlliance.ES} />
        <StatCard label="BO Alliance" value={stats.byAlliance.BO} />
      </div>

      {activeTab === "table" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Search name, role, assignment, app…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: "1 1 200px", padding: "6px 10px", fontSize: 12, borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
            />
            <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={selStr()}>
              <option value="All">All Vendors</option>
              <option>Beqisoft</option><option>Zucitech</option>
            </select>
            <select value={filterAlliance} onChange={e => setFilterAlliance(e.target.value)} style={selStr()}>
              <option value="All">All Alliances</option>
              <option>CP</option><option>BO</option><option>ES</option>
            </select>
            <select value={filterTZ} onChange={e => setFilterTZ(e.target.value)} style={selStr()}>
              <option value="All">All Timezones</option>
              <option>EST</option><option>IST</option><option>PST</option>
            </select>
            <select value={filterManager} onChange={e => setFilterManager(e.target.value)} style={selStr()}>
              <option value="All">All Managers</option>
              {qeManagers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={filterFunding} onChange={e => setFilterFunding(e.target.value)} style={selStr()}>
              <option value="All">All Funding</option>
              <option>CapEx</option><option>Opex</option><option>Shadow</option>
            </select>
            {(search || filterVendor !== "All" || filterAlliance !== "All" || filterTZ !== "All" || filterManager !== "All" || filterFunding !== "All") && (
              <button onClick={() => { setSearch(""); setFilterVendor("All"); setFilterAlliance("All"); setFilterTZ("All"); setFilterManager("All"); setFilterFunding("All"); }}
                style={{ ...selStr(), color: "var(--color-text-danger)" }}>
                Clear filters
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>
            Showing {filtered.length} of {data.length} records · Click any row for details
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: 170 }} /><col style={{ width: 90 }} /><col style={{ width: 70 }} />
                <col style={{ width: 150 }} /><col style={{ width: 70 }} /><col style={{ width: 60 }} />
                <col style={{ width: 90 }} /><col style={{ width: 55 }} /><col style={{ width: 140 }} />
                <col style={{ width: 80 }} /><col style={{ width: 130 }} />
              </colgroup>
              <thead style={{ background: "var(--color-background-secondary)" }}>
                <tr>
                  <SortHeader label="Name" col="Name" />
                  <SortHeader label="Vendor" col="Vendor" />
                  <SortHeader label="Alliance" col="Alliance" />
                  <SortHeader label="Role" col="Role FY25" />
                  <SortHeader label="Manager" col="QE Manager" />
                  <SortHeader label="TZ" col="Time Zone Support" />
                  <SortHeader label="Allocation" col="Allocation %" />
                  <SortHeader label="Avail" col="Availability" />
                  <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textAlign: "left", borderBottom: "0.5px solid var(--color-border-secondary)" }}>Capabilities</th>
                  <SortHeader label="Funding" col="Funding" />
                  <th style={{ padding: "8px 10px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textAlign: "left", borderBottom: "0.5px solid var(--color-border-secondary)" }}>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => <VendorRow key={i} row={row} onClick={setSelectedRow} />)}
                {filtered.length === 0 && (
                  <tr><td colSpan={11} style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>No records match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* By Vendor */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Resources by vendor</div>
            {["Beqisoft","Zucitech"].map(v => {
              const cnt = data.filter(r => r.Vendor === v).length;
              const pct = Math.round(cnt / data.length * 100);
              return <div key={v} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{v}</span><span style={{ fontWeight: 500 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: v === "Beqisoft" ? "#378ADD" : "#639922", borderRadius: 4 }} />
                </div>
              </div>;
            })}
          </div>

          {/* By Alliance */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Resources by alliance</div>
            {["CP","ES","BO"].map(a => {
              const cnt = data.filter(r => r.Alliance === a).length;
              const pct = Math.round(cnt / data.length * 100);
              return <div key={a} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span><Badge label={a} color={ALLIANCE_COLORS[a]} bg={ALLIANCE_BG[a]} /></span>
                  <span style={{ fontWeight: 500 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: ALLIANCE_COLORS[a], borderRadius: 4 }} />
                </div>
              </div>;
            })}
          </div>

          {/* By Timezone */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Resources by timezone</div>
            {["IST","EST","PST"].map(tz => {
              const cnt = data.filter(r => r["Time Zone Support"] === tz).length;
              const pct = Math.round(cnt / data.length * 100);
              return <div key={tz} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{tz}</span><span style={{ fontWeight: 500 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: TZ_COLORS[tz], borderRadius: 4 }} />
                </div>
              </div>;
            })}
          </div>

          {/* By Funding */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Funding breakdown</div>
            {["CapEx","Opex","Shadow"].map(f => {
              const cnt = data.filter(r => r.Funding === f).length;
              const pct = Math.round(cnt / data.length * 100);
              return <div key={f} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{f}</span><span style={{ fontWeight: 500 }}>{cnt} ({pct}%)</span>
                </div>
                <div style={{ height: 8, background: "var(--color-border-tertiary)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: FUNDING_COLORS[f], borderRadius: 4 }} />
                </div>
              </div>;
            })}
          </div>

          {/* By Manager */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "16px 20px", gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Resources by QE manager</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {qeManagers.map(m => {
                const rows = data.filter(r => r["QE Manager"] === m);
                const avail = rows.filter(r => parseInt(String(r.Availability)) > 0).length;
                return <div key={m} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 14px" }}>
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 2 }}>{m}</div>
                  <div style={{ fontSize: 22, fontWeight: 500 }}>{rows.length}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{avail} available</div>
                </div>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedRow && <DetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}

const mountEl = document.getElementById("vendor-board-root");
if (mountEl) {
  ReactDOM.createRoot(mountEl).render(React.createElement(VendorBoard));
}
