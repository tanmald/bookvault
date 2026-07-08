-- ============================================================================
-- Add series/saga fields to books
-- ============================================================================
--
-- Context: supports automatic series detection (REVIEW.md §6 item 13) —
-- grouping a book's series companions on BookDetails, suggesting companions
-- at upload time, and sorting by suggested reading order. These columns are
-- populated by the find-series edge function's auto-detection pipeline, not
-- typed by the user; EditBookMetadataDialog exposes them only as a manual
-- correction/override path.
-- ============================================================================

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS series_name text,
  ADD COLUMN IF NOT EXISTS series_position numeric;

-- Speeds up "find companions in this library" lookups (BookDetails grouping).
CREATE INDEX IF NOT EXISTS idx_books_series_name
  ON public.books (library_id, series_name)
  WHERE series_name IS NOT NULL;
