/**
 * Supabase connection (anon URL + key are safe to commit when schema.sql RLS is applied).
 * Set edit_key only in Supabase SQL — never in this file. Publishers enter it in the app UI.
 */
window.VENDOR_BOARD_SUPABASE = {
  url: "",
  anonKey: "",
  stateId: "default",
  sheetPollMs: 60000
};
