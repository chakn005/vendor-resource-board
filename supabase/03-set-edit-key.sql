-- Replace YOUR_PUBLISHER_SECRET with a long random string (same value you enter in the app as Publisher key).
-- Example generator: openssl rand -base64 32

update public.vendor_board_config
set edit_key = 'YOUR_PUBLISHER_SECRET'
where singleton = true;
