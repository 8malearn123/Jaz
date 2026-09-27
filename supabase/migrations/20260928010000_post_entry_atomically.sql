-- One entry, one call, one transaction.
--
-- postEntry() wrote the header, then the lines, as two round trips. The module's own
-- comment said the two "must not be separate round trips a caller could abandon
-- between" — and then they were. Two things went wrong with that:
--
--   * If the lines were refused (out of balance, a header account, a closed period)
--     the client tried to delete the header it had just written. That delete is
--     REFUSED by journal_entries_append_only_trg, which raises on every DELETE with
--     no exemption. Verified against this database: the header survives. So a single
--     refused posting left a zero-line entry in the ledger forever — visible in the
--     journal, uncorrectable, and removable only by disabling a trigger.
--   * A client that died between the two calls left the same wreckage.
--
-- post_journal_entry() writes both in one statement, so the entry either lands whole
-- or not at all. It is SECURITY INVOKER: RLS and every trigger still apply to the
-- caller exactly as they do to a direct insert, so this adds atomicity and nothing
-- else. It also names the columns a caller may set, which means status, reversed_by,
-- period and created_at are no longer reachable from the client at all.

create or replace function public.post_journal_entry(
  p_id           uuid,
  p_no           text,
  p_date         date,
  p_source       public.journal_source,
  p_memo_en      text,
  p_memo_ar      text,
  p_lines        jsonb,
  p_source_ref   text default null,
  p_party_en     text default null,
  p_party_ar     text default null,
  p_reversal_of  uuid default null,
  p_posted_by_en text default null,
  p_posted_by_ar text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  n int;
begin
  insert into public.journal_entries (
    id, no, entry_date, source, source_ref, memo_en, memo_ar,
    party_en, party_ar, reversal_of, posted_by_en, posted_by_ar
  ) values (
    p_id, p_no, p_date, p_source, p_source_ref, p_memo_en, p_memo_ar,
    p_party_en, p_party_ar, p_reversal_of, p_posted_by_en, p_posted_by_ar
  );

  insert into public.journal_lines (
    entry_id, account_code, debit_minor, credit_minor, center_id, memo_en, memo_ar, "position"
  )
  select
    p_id,
    l ->> 'account_code',
    coalesce((l ->> 'debit_minor')::bigint, 0),
    coalesce((l ->> 'credit_minor')::bigint, 0),
    nullif(l ->> 'center_id', ''),
    l ->> 'memo_en',
    l ->> 'memo_ar',
    (ord - 1)::int
  from jsonb_array_elements(p_lines) with ordinality as t(l, ord);

  -- The deferred balance trigger catches this at commit too, but failing here names
  -- the problem plainly instead of reporting it from inside a constraint.
  select count(*) into n from public.journal_lines where entry_id = p_id;
  if n < 2 then
    raise exception 'an entry needs at least two lines; got %', n;
  end if;

  return p_id;
end;
$$;

revoke all on function public.post_journal_entry(
  uuid, text, date, public.journal_source, text, text, jsonb, text, text, text, uuid, text, text
) from public, anon;
grant execute on function public.post_journal_entry(
  uuid, text, date, public.journal_source, text, text, jsonb, text, text, text, uuid, text, text
) to authenticated;

-- A lineless header was never a posting, so removing one is not rewriting history.
-- This cannot reach a real entry: journal_lines_immutable_trg refuses every line
-- delete, so an entry that has lines can never be reduced to none. Without the
-- exemption, wreckage left by any client that does not use the function above is
-- permanent, which is worse than allowing this.

create or replace function public.journal_entries_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from public.journal_lines where entry_id = old.id) then
      raise exception 'a posted entry is never deleted — reverse it instead (%)', old.no;
    end if;
    return old;
  end if;

  -- The one legitimate mutation: recording that this entry has been reversed.
  if new.status is distinct from old.status and not (old.status = 'posted' and new.status = 'reversed') then
    raise exception 'an entry goes from posted to reversed and nowhere else';
  end if;

  if new.reversed_by is distinct from old.reversed_by and old.reversed_by is not null then
    raise exception 'the reversal of an entry is recorded once';
  end if;

  if (new.no, new.entry_date, new.source, new.source_ref, new.memo_en, new.memo_ar,
      new.party_en, new.party_ar, new.reversal_of, new.posted_by_en, new.posted_by_ar)
     is distinct from
     (old.no, old.entry_date, old.source, old.source_ref, old.memo_en, old.memo_ar,
      old.party_en, old.party_ar, old.reversal_of, old.posted_by_en, old.posted_by_ar) then
    raise exception 'a posted entry is immutable — correct it with a reversal (%)', old.no;
  end if;

  return new;
end;
$$;

revoke all on function public.journal_entries_append_only() from public, anon, authenticated;
