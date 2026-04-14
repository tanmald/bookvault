# Enabling File Uploads for a Library

File upload access (epub/pdf) is controlled by the `allow_member_uploads` flag on the `libraries` table.  
By default it is `false` — users can only add books manually. Set it to `true` to unlock the upload UI.

---

## Option 1 — Supabase Dashboard (SQL Editor)

1. Go to your project at [supabase.com](https://supabase.com) → **SQL Editor**
2. Run:

```sql
-- Enable uploads for a specific library by name
UPDATE libraries
SET allow_member_uploads = true
WHERE name = 'My Library';

-- Or by library ID (more precise)
UPDATE libraries
SET allow_member_uploads = true
WHERE id = '<library-uuid>';
```

3. Click **Run**. The change takes effect immediately — no redeploy needed.

---

## Option 2 — Supabase Dashboard (Table Editor)

1. Go to **Table Editor** → `libraries`
2. Find the row for the library you want to enable
3. Click the row to edit it
4. Toggle `allow_member_uploads` to `true`
5. Click **Save**

---

## Finding the Library ID

If you don't know the library UUID, run this first:

```sql
SELECT id, name, allow_member_uploads
FROM libraries
ORDER BY created_at DESC;
```

---

## Disabling Uploads

```sql
UPDATE libraries
SET allow_member_uploads = false
WHERE id = '<library-uuid>';
```

---

## Notes

- The flag applies to **everyone** in the library (including the owner).
- Users in libraries with `allow_member_uploads = false` see a manual entry form instead of the file upload UI.
- Changes are reflected immediately on next page load — no cache to clear.
