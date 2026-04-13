create extension if not exists "wrappers" with schema "extensions";

drop extension if exists "pg_net";

drop policy "Library owners and admins can add members" on "public"."library_members";

alter table "public"."reading_progress" alter column "status" drop default;

alter type "public"."reading_status" rename to "reading_status__old_version_to_be_dropped";

create type "public"."reading_status" as enum ('to_read', 'reading', 'read', 'not_planned');

alter table "public"."reading_progress" alter column status type "public"."reading_status" using status::text::"public"."reading_status";

alter table "public"."reading_progress" alter column "status" set default 'to_read'::public.reading_status;

DROP FUNCTION IF EXISTS public.get_library_friends_book_progress(uuid, uuid);

drop type "public"."reading_status__old_version_to_be_dropped";

alter table "public"."library_members" disable row level security;

alter table "public"."reading_progress" alter column "status" set default 'not_planned'::public.reading_status;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.auto_add_library_creator()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert creator as admin into library_members
  INSERT INTO public.library_members (library_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by);

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_library_friends_book_progress(p_user_id uuid, p_book_id uuid)
 RETURNS TABLE(friend_id uuid, display_name text, avatar_url text, status public.reading_status, progress integer, started_at timestamp with time zone, finished_at timestamp with time zone, review_id uuid, review_rating integer, review_text text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_library_id uuid;
BEGIN
  SELECT library_id INTO v_library_id
  FROM public.books
  WHERE id = p_book_id;
  RETURN QUERY
  SELECT
    lm.user_id as friend_id,
    p.display_name,
    p.avatar_url,
    rp.status,
    rp.progress,
    rp.started_at,
    rp.finished_at,
    r.id as review_id,
    r.rating as review_rating,
    r.content as review_text
  FROM public.library_members lm
  LEFT JOIN public.profiles p ON p.user_id = lm.user_id
  LEFT JOIN public.reading_progress rp
    ON rp.user_id = lm.user_id
    AND rp.book_id = p_book_id
  LEFT JOIN public.reviews r
    ON r.user_id = lm.user_id
    AND r.book_id = p_book_id
  WHERE lm.library_id = v_library_id
    AND lm.user_id <> p_user_id;
END;
$function$
;


  create policy "users_can_view_files"
  on "public"."book_files"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.books b
  WHERE ((b.id = book_files.book_id) AND ((b.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_members lm
          WHERE ((lm.library_id = b.library_id) AND (lm.user_id = auth.uid())))))))));



  create policy "users_can_view_book_tags"
  on "public"."book_tags"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.books b
  WHERE ((b.id = book_tags.book_id) AND ((b.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_members lm
          WHERE ((lm.library_id = b.library_id) AND (lm.user_id = auth.uid())))))))));



  create policy "users_can_view_friendships"
  on "public"."friendships"
  as permissive
  for select
  to public
using (((user_id = auth.uid()) OR (friend_id = auth.uid())));



  create policy "authenticated_can_read_genres"
  on "public"."genres"
  as permissive
  for select
  to public
using (true);



  create policy "Enable read access for all users"
  on "public"."invite_links"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "library_members_insert"
  on "public"."library_members"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "library_members_select"
  on "public"."library_members"
  as permissive
  for select
  to authenticated
using (true);



  create policy "users_can_create_reviews"
  on "public"."reviews"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "users_can_view_reviews"
  on "public"."reviews"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.books b
  WHERE ((b.id = reviews.book_id) AND ((b.owner_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_members lm
          WHERE ((lm.library_id = b.library_id) AND (lm.user_id = auth.uid())))))))));



  create policy "authenticated_can_read_tags"
  on "public"."tags"
  as permissive
  for select
  to public
using (true);



  create policy "Library owners and admins can add members"
  on "public"."library_members"
  as permissive
  for insert
  to public
with check (((EXISTS ( SELECT 1
   FROM public.libraries
  WHERE ((libraries.id = library_members.library_id) AND (libraries.created_by = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.library_members lm
  WHERE ((lm.library_id = library_members.library_id) AND (lm.user_id = auth.uid()) AND (lm.role = 'admin'::public.library_role))))));


CREATE TRIGGER auto_add_library_creator_trigger AFTER INSERT ON public.libraries FOR EACH ROW EXECUTE FUNCTION public.auto_add_library_creator();


