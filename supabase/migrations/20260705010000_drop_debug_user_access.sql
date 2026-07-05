-- ============================================================================
-- Drop debug_user_access() diagnostic RPC
-- ============================================================================
--
-- Context: this SECURITY DEFINER function was added while debugging RLS
-- policies and was never intended to ship to production (REVIEW.md L5). It is
-- not called from any client code. It only ever returned data scoped to
-- auth.uid(), so it carried no access-control risk, but diagnostic RPCs
-- shouldn't be left lying around in a production schema.
-- ============================================================================

DROP FUNCTION IF EXISTS public.debug_user_access();
