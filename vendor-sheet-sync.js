/**
 * Parse vendor spreadsheets and fetch published Google Sheets CSV.
 * # SECURITY-REVIEW: only processes files/URLs supplied by trusted publishers.
 */
(function () {
  const MAX_FILE_BYTES = 5 * 1024 * 1024;

  function slugify(text) {
    return String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
  }

  function rowId(cells, index) {
    const name =
      cells["Vendor"] ||
      cells["Vendor Name"] ||
      cells["Company"] ||
      cells["Name"] ||
      `row-${index + 1}`;
    return `${slugify(name) || "vendor"}-${index + 1}`;
  }

  function matrixToBoard(matrix, metaExtra) {
    if (!matrix || !matrix.length) {
      return { columns: [], rows: [], meta: metaExtra || {} };
    }

    const headerRow = matrix[0].map((h) => String(h ?? "").trim());
    const columns = headerRow.filter((h, i) => h || i === 0);
    const used = columns.length ? headerRow.map((h, i) => h || `Column ${i + 1}`) : [];

    const rows = [];
    for (let r = 1; r < matrix.length; r += 1) {
      const line = matrix[r];
      if (!line || !line.some((c) => String(c ?? "").trim())) continue;

      const cells = {};
      used.forEach((col, i) => {
        cells[col] = String(line[i] ?? "").trim();
      });
      rows.push({ id: rowId(cells, rows.length), cells });
    }

    return {
      columns: used.filter(Boolean),
      rows,
      meta: metaExtra || {}
    };
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i += 1;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
        row.push(field);
        field = "";
        if (row.some((c) => String(c).trim())) rows.push(row);
        row = [];
        if (ch === "\r") i += 1;
      } else if (ch !== "\r") {
        field += ch;
      }
    }

    if (field.length || row.length) {
      row.push(field);
      if (row.some((c) => String(c).trim())) rows.push(row);
    }

    return rows;
  }

  function googleSheetExportUrl(inputUrl) {
    const raw = String(inputUrl || "").trim();
    if (!raw) return null;

    try {
      const u = new URL(raw);
      if (!/docs\.google\.com$/i.test(u.hostname)) return null;

      const match = u.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return null;

      const id = match[1];
      let gid = u.searchParams.get("gid");
      if (!gid) {
        const hashGid = (u.hash || "").match(/gid=(\d+)/);
        gid = hashGid ? hashGid[1] : "0";
      }

      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
    } catch {
      return null;
    }
  }

  async function fetchGoogleSheetCsv(sheetUrl) {
    const exportUrl = googleSheetExportUrl(sheetUrl);
    if (!exportUrl) throw new Error("Invalid Google Sheets URL");

    const res = await fetch(exportUrl, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not fetch sheet (publish as “Anyone with the link can view”)");
    const text = await res.text();
    return parseCsv(text);
  }

  async function parseUploadedFile(file) {
    if (!file) throw new Error("No file selected");
    if (file.size > MAX_FILE_BYTES) throw new Error("File too large (max 5 MB)");

    const name = file.name || "upload";
    const lower = name.toLowerCase();

    if (lower.endsWith(".csv") || file.type === "text/csv") {
      const text = await file.text();
      return matrixToBoard(parseCsv(text), {
        source: "upload",
        fileName: name,
        syncedAt: new Date().toISOString()
      });
    }

    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const XLSX = window.XLSX;
      if (!XLSX) throw new Error("Spreadsheet library not loaded");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const matrix = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
        header: 1,
        defval: ""
      });
      return matrixToBoard(matrix, {
        source: "upload",
        fileName: name,
        syncedAt: new Date().toISOString()
      });
    }

    throw new Error("Use .csv or .xlsx");
  }

  async function syncFromGoogleSheet(sheetUrl) {
    const matrix = await fetchGoogleSheetCsv(sheetUrl);
    return matrixToBoard(matrix, {
      source: "google-sheet",
      sheetUrl: String(sheetUrl).trim(),
      syncedAt: new Date().toISOString()
    });
  }

  function contentFingerprint(board) {
    try {
      if (Array.isArray(board?.data)) return JSON.stringify(board.data);
      return JSON.stringify({ columns: board.columns, rows: board.rows });
    } catch {
      return "";
    }
  }

  function rowsToFlatObjects(board) {
    if (!board || !Array.isArray(board.rows)) return [];
    return board.rows.map((r) => (r.cells ? r.cells : r));
  }

  window.VendorSheetSync = {
    parseUploadedFile,
    syncFromGoogleSheet,
    googleSheetExportUrl,
    contentFingerprint,
    matrixToBoard,
    rowsToFlatObjects
  };
})();
