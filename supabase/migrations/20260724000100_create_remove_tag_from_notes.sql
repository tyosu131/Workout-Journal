-- Remove one tag only from notes belonging to the supplied user.
-- This function is invoker-security and callable only by the backend role.

create or replace function public.remove_tag_from_notes(
  _user_id uuid,
  _tag text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if _user_id is null or _tag is null or btrim(_tag) = '' then
    raise exception 'user id and tag are required' using errcode = '22023';
  end if;

  update public.notes
  set tags = array_remove(tags, _tag)
  where userid = _user_id
    and tags @> array[_tag]::text[];
end;
$$;

revoke all on function public.remove_tag_from_notes(uuid, text) from public;
revoke all on function public.remove_tag_from_notes(uuid, text) from anon, authenticated;
grant execute on function public.remove_tag_from_notes(uuid, text) to service_role;
