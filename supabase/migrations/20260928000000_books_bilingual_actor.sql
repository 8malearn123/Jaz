-- Who posted an entry, and who closed a period, in both languages.
--
-- The books shipped with `posted_by text` and `closed_by text`, while the rest of the
-- schema stores a bilingual name as a pair — name_en/name_ar, memo_en/memo_ar,
-- party_en/party_ar. That single column was a real loss, not a shortcut: the ledger
-- shows the poster's name beside every entry, and the console is read in Arabic, so
-- one text column meant an Arabic reader saw an English name — or, worse, whichever
-- language the writing code happened to pick.
--
-- Both tables are still empty, so this is a rename rather than a data migration.

alter table public.journal_entries    rename column posted_by to posted_by_en;
alter table public.journal_entries    add column posted_by_ar text;
alter table public.accounting_periods rename column closed_by to closed_by_en;
alter table public.accounting_periods add column closed_by_ar text;

-- The append-only guard lists every immutable column by name, so it has to learn the
-- new pair — otherwise a posted entry's poster becomes editable, which is exactly the
-- kind of silent hole a rename leaves behind.

create or replace function public.journal_entries_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'a posted entry is never deleted — reverse it instead (%)', old.no;
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
