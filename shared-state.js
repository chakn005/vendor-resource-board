/**
 * Vendor board shared state (Supabase read + realtime; publish via RPC + edit key).
 * # SECURITY-REVIEW: external API; edit key in sessionStorage only; never log keys.
 */
(function () {
  const EDIT_KEY_STORAGE = "vendorBoardEditKey";
  const CONFIG = () => window.VENDOR_BOARD_SUPABASE || {};
  const DEBOUNCE_MS = 500;

  let client = null;
  let channel = null;
  let enabled = false;
  let status = "local";
  let publishTimer = null;
  let suppressRealtimeUntil = 0;
  let onRemoteChange = null;
  let onStatusChange = null;

  function getConfig() {
    const c = CONFIG();
    const url = (c.url || "").trim();
    const anonKey = (c.anonKey || "").trim();
    const stateId = (c.stateId || "default").trim() || "default";
    return { url, anonKey, stateId };
  }

  function setStatus(next) {
    status = next;
    if (typeof onStatusChange === "function") onStatusChange(next);
  }

  function init() {
    const { url, anonKey } = getConfig();
    if (!url || !anonKey) {
      enabled = false;
      setStatus("local");
      return false;
    }

    const lib = window.supabase;
    if (!lib || typeof lib.createClient !== "function") {
      enabled = false;
      setStatus("error");
      return false;
    }

    try {
      client = lib.createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      enabled = true;
      setStatus("loading");
      return true;
    } catch {
      enabled = false;
      setStatus("error");
      return false;
    }
  }

  function scopedEditKeyStorage() {
    try {
      return `${EDIT_KEY_STORAGE}:vendor-resource-board`;
    } catch {
      return EDIT_KEY_STORAGE;
    }
  }

  function getEditKey() {
    try {
      return sessionStorage.getItem(scopedEditKeyStorage()) || "";
    } catch {
      return "";
    }
  }

  function setEditKey(key) {
    try {
      const trimmed = (key || "").trim();
      if (!trimmed) {
        sessionStorage.removeItem(scopedEditKeyStorage());
        return;
      }
      sessionStorage.setItem(scopedEditKeyStorage(), trimmed);
    } catch {
      /* ignore */
    }
  }

  function canPublish() {
    return enabled && !!getEditKey();
  }

  function normalizePayload(row) {
    if (!row || typeof row.state !== "object" || row.state === null) {
      return emptyState(row?.updated_at);
    }
    const s = row.state;
    return {
      v: s.v || 1,
      data: Array.isArray(s.data) ? s.data : [],
      meta: typeof s.meta === "object" && s.meta ? s.meta : {},
      updatedAt: row.updated_at || s.meta?.updatedAt || s.updatedAt || null
    };
  }

  function emptyState(updatedAt) {
    return {
      v: 1,
      data: [],
      meta: {},
      updatedAt: updatedAt || null
    };
  }

  async function fetchRemote() {
    if (!enabled || !client) return null;
    const { stateId } = getConfig();
    try {
      const { data, error } = await client
        .from("vendor_board_state")
        .select("state, updated_at")
        .eq("id", stateId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setStatus(canPublish() ? "live-editor" : "live");
        return emptyState();
      }

      const payload = normalizePayload(data);
      setStatus(canPublish() ? "live-editor" : "live");
      return payload;
    } catch {
      setStatus("error");
      return null;
    }
  }

  async function publish(snapshot) {
    if (!enabled || !client || !canPublish()) return false;

    const { stateId } = getConfig();
    const body = {
      v: 1,
      data: Array.isArray(snapshot.data) ? snapshot.data : [],
      meta: {
        ...(snapshot.meta || {}),
        updatedAt: new Date().toISOString()
      }
    };

    try {
      suppressRealtimeUntil = Date.now() + 1500;
      const { data, error } = await client.rpc("publish_vendor_board_state", {
        p_id: stateId,
        p_state: body,
        p_edit_key: getEditKey()
      });

      if (error) throw error;
      setStatus("live-editor");
      return data || body.meta.updatedAt;
    } catch (err) {
      const msg = err && err.message ? String(err.message) : "";
      if (/unauthorized/i.test(msg)) {
        setEditKey("");
        setStatus("live");
      } else {
        setStatus("error");
      }
      return false;
    }
  }

  function schedulePublish(snapshot) {
    if (!canPublish()) return;
    clearTimeout(publishTimer);
    publishTimer = setTimeout(() => publish(snapshot), DEBOUNCE_MS);
  }

  function subscribeRemote(handler) {
    if (!enabled || !client) return;
    onRemoteChange = handler;
    const { stateId } = getConfig();

    if (channel) {
      try {
        client.removeChannel(channel);
      } catch {
        /* ignore */
      }
    }

    channel = client
      .channel(`vendor_board_state:${stateId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vendor_board_state",
          filter: `id=eq.${stateId}`
        },
        (payload) => {
          if (Date.now() < suppressRealtimeUntil) return;
          const row = payload.new || payload.old;
          if (!row) return;
          if (typeof onRemoteChange === "function") onRemoteChange(normalizePayload(row));
        }
      )
      .subscribe();
  }

  function promptForEditKey() {
    const entered = window.prompt(
      "Enter the publisher edit key to upload sheets and sync for the organization.\n\n" +
        "Set in Supabase: vendor_board_config.edit_key"
    );
    if (entered === null) return false;
    const trimmed = entered.trim();
    if (!trimmed) return false;
    setEditKey(trimmed);
    setStatus(enabled ? "live-editor" : "local");
    return true;
  }

  window.VendorBoardSharedState = {
    init,
    fetchRemote,
    publish,
    schedulePublish,
    subscribeRemote,
    canPublish,
    getEditKey,
    setEditKey,
    promptForEditKey,
    isEnabled: () => enabled,
    getStatus: () => status,
    getPollIntervalMs() {
      const ms = Number(CONFIG().sheetPollMs);
      return Number.isFinite(ms) && ms >= 15000 ? ms : 60000;
    },
    onStatusChange(fn) {
      onStatusChange = fn;
    }
  };
})();
