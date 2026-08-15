import { useMemo, useState } from 'react'
import { Plus, Power, Search, CornerDownRight } from 'lucide-react'
import { useLocale, toAsciiDigits } from '@/i18n/LocaleContext'
import { useToast } from '@/components/account/Toast'
import { Modal } from '@/components/ui/Modal'
import { buttonClass } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import type { Account, AccountType } from '@/data/coa'
import { groupBalance } from '@/lib/accounting'
import { useLedger } from '@/state/LedgerContext'
import { StatCard, Pill, FilterChips } from '../_shared'
import { AccountTypePill, Amount, accountTypeMeta } from './_bits'

/**
 * The chart of accounts — the spine every posting names. Header accounts total their
 * children and cannot be posted to; leaves carry the balances. An account is never
 * deleted once it has been posted to, only deactivated, so the history it holds stays
 * readable forever.
 */
export function ChartOfAccounts() {
  const { pick } = useLocale()
  const { accounts, entries, balanceOf, toggleAccount } = useLedger()
  const [type, setType] = useState<'all' | AccountType>('all')
  const [q, setQ] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const query = toAsciiDigits(q.trim().toLowerCase())
  const matches = (a: Account) =>
    query === '' || a.code.includes(query) || a.name.en.toLowerCase().includes(query) || a.name.ar.includes(q.trim())

  const roots = accounts.filter((a) => !a.parent && (type === 'all' || a.type === type))
  const postable = accounts.filter((a) => a.postable)
  const withActivity = postable.filter((a) => balanceOf(a.code) !== 0).length

  const chips = [
    { id: 'all' as const, label: pick({ en: 'All', ar: 'الكل' }), count: accounts.length },
    ...(Object.keys(accountTypeMeta) as AccountType[]).map((t) => ({
      id: t,
      label: pick(accountTypeMeta[t].label),
      count: accounts.filter((a) => a.type === t).length,
    })),
  ]

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div className="min-w-0">
          <h3 className="font-serif text-card-title text-ink">{pick({ en: 'Chart of accounts', ar: 'دليل الحسابات' })}</h3>
          <p className="font-sans text-caption text-ink-subtle mt-xxs max-w-2xl">{pick({
            en: 'Every account the book can post to, grouped the way the statements read them. Headings total their children; only the accounts beneath them carry entries.',
            ar: 'كل حساب يقبل الترحيل، مرتبًا كما تقرؤه القوائم المالية. الحسابات التجميعية تجمع ما تحتها، والترحيل يقع على الحسابات الفرعية وحدها.',
          })}</p>
        </div>
        <button onClick={() => setAddOpen(true)} className={buttonClass('primary', 'sm')}>
          <Plus size={15} /> {pick({ en: 'Add account', ar: 'إضافة حساب' })}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-sm">
        <StatCard label={pick({ en: 'Accounts', ar: 'الحسابات' })} value={String(accounts.length)} sub={`${postable.length} ${pick({ en: 'postable', ar: 'قابل للترحيل' })}`} tone="dark" />
        <StatCard label={pick({ en: 'With a balance', ar: 'بأرصدة' })} value={String(withActivity)} sub={pick({ en: 'Carrying movement', ar: 'عليها حركة' })} tone="gold" />
        <StatCard label={pick({ en: 'Control accounts', ar: 'حسابات المراقبة' })} value={String(accounts.filter((a) => a.isControl).length)} sub={pick({ en: 'Tied to a subledger', ar: 'مرتبطة بسجل مساعد' })} />
        <StatCard label={pick({ en: 'Entries in the book', ar: 'القيود في الدفتر' })} value={String(entries.length)} sub={pick({ en: 'Since the book opened', ar: 'منذ افتتاح الدفتر' })} tone="green" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-md">
        <FilterChips chips={chips} active={type} onChange={setType} label={pick({ en: 'Group', ar: 'المجموعة' })} />
        <label className="relative">
          <Search size={15} className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input ps-9 w-56"
            placeholder={pick({ en: 'Code or name…', ar: 'رمز أو اسم…' })}
          />
        </label>
      </div>

      <div className="flex flex-col gap-md">
        {roots.map((root) => (
          <GroupCard key={root.code} root={root} matches={matches} onToggle={toggleAccount} />
        ))}
      </div>

      {addOpen && <AddAccountModal onClose={() => setAddOpen(false)} />}
    </div>
  )
}

/** One of the five roots, with everything beneath it. */
function GroupCard({ root, matches, onToggle }: { root: Account; matches: (a: Account) => boolean; onToggle: (code: string) => void }) {
  const { pick } = useLocale()
  const { accounts, entries, balanceOf } = useLedger()

  // Children of the root, each followed by its own leaves — two levels is all the chart uses.
  const rows = useMemo(() => {
    const out: { account: Account; depth: number }[] = []
    const walk = (parent: string, depth: number) => {
      for (const a of accounts.filter((x) => x.parent === parent)) {
        out.push({ account: a, depth })
        walk(a.code, depth + 1)
      }
    }
    walk(root.code, 0)
    return out
  }, [accounts, root.code])

  const shown = rows.filter((r) => matches(r.account))
  if (shown.length === 0) return null

  const total = groupBalance(accounts, entries, root.code)

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-sm px-lg py-md bg-surface-2 border-b border-hairline">
        <div className="flex items-center gap-sm">
          <span className="font-sans text-data text-ink tabular-nums">{root.code}</span>
          <h4 className="font-serif text-card-title text-ink">{pick(root.name)}</h4>
          <AccountTypePill type={root.type} />
        </div>
        <span className="font-sans text-data text-ink tabular-nums">
          <span className="font-sans text-caption uppercase tracking-wide text-ink-subtle me-2">{pick({ en: 'Group total', ar: 'إجمالي المجموعة' })}</span>
          <Amount minor={total} tone="gold" dash={false} />
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-hairline">
              {[
                { h: { en: 'Account', ar: 'الحساب' }, a: 'text-start' },
                { h: { en: 'Nature', ar: 'الطبيعة' }, a: 'text-start' },
                { h: { en: 'Normal side', ar: 'الجانب الطبيعي' }, a: 'text-start' },
                { h: { en: 'Balance', ar: 'الرصيد' }, a: 'text-end' },
                { h: { en: '', ar: '' }, a: 'text-end' },
              ].map((x, i) => (
                <th key={i} className={cn('font-sans text-caption uppercase tracking-wide text-ink-subtle px-lg py-2', x.a)}>{pick(x.h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(({ account: a, depth }) => {
              const balance = a.postable ? balanceOf(a.code) : groupBalance(accounts, entries, a.code)
              return (
                <tr key={a.code} className={cn('border-b border-hairline last:border-0', !a.active && 'opacity-55', !a.postable && 'bg-surface-2/40')}>
                  <td className="px-lg py-sm">
                    <div className="flex items-center gap-xs" style={{ paddingInlineStart: `${depth * 18}px` }}>
                      {depth > 0 && <CornerDownRight size={13} className="text-ink-subtle shrink-0 rtl:-scale-x-100" />}
                      <span className="font-sans text-data text-ink tabular-nums">{a.code}</span>
                      <span className={cn('font-sans text-data', a.postable ? 'text-ink' : 'text-ink-muted font-medium')}>{pick(a.name)}</span>
                      {a.isControl && <Pill color="#2e5f8a" bg="#e7f0f8">{pick({ en: 'Control', ar: 'مراقبة' })}</Pill>}
                      {a.contra && <Pill color="#a4533f" bg="#f7e9e4">{pick({ en: 'Contra', ar: 'مقابل' })}</Pill>}
                      {!a.active && <Pill color="#b5403b" bg="#faeceb">{pick({ en: 'Inactive', ar: 'موقوف' })}</Pill>}
                    </div>
                  </td>
                  <td className="px-lg py-sm font-sans text-caption text-ink-muted">
                    {pick(a.postable ? { en: 'Postable', ar: 'قابل للترحيل' } : { en: 'Heading', ar: 'تجميعي' })}
                  </td>
                  <td className="px-lg py-sm font-sans text-caption text-ink-muted">
                    {pick(a.normal === 'debit' ? { en: 'Debit', ar: 'مدين' } : { en: 'Credit', ar: 'دائن' })}
                  </td>
                  <td className="px-lg py-sm text-end"><Amount minor={balance} tone={a.postable ? 'plain' : 'muted'} /></td>
                  <td className="px-lg py-sm text-end">
                    {a.postable && (
                      <button
                        onClick={() => onToggle(a.code)}
                        title={pick(a.active ? { en: 'Deactivate', ar: 'إيقاف' } : { en: 'Activate', ar: 'تفعيل' })}
                        className="grid place-items-center w-7 h-7 rounded-md text-ink-subtle hover:text-ink ms-auto transition-colors"
                      ><Power size={14} /></button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Add a postable account under an existing heading. */
function AddAccountModal({ onClose }: { onClose: () => void }) {
  const { pick } = useLocale()
  const { flash } = useToast()
  const { accounts, addAccount } = useLedger()
  const headings = accounts.filter((a) => !a.postable)

  const [code, setCode] = useState('')
  const [en, setEn] = useState('')
  const [ar, setAr] = useState('')
  const [parent, setParent] = useState(headings[0]?.code ?? '')
  const [contra, setContra] = useState(false)

  const parentAccount = accounts.find((a) => a.code === parent)
  const taken = accounts.some((a) => a.code === code.trim())
  const valid = code.trim() !== '' && !taken && en.trim() !== '' && ar.trim() !== '' && parentAccount != null

  const submit = () => {
    if (!valid || !parentAccount) return
    // The account inherits its group's nature and normal side; a contra account is the
    // deliberate exception, and it flips only the side.
    const normal = contra
      ? (parentAccount.type === 'asset' || parentAccount.type === 'expense' ? 'credit' : 'debit')
      : (parentAccount.type === 'asset' || parentAccount.type === 'expense' ? 'debit' : 'credit')
    addAccount({
      code: code.trim(),
      name: { en: en.trim(), ar: ar.trim() },
      type: parentAccount.type,
      normal,
      parent: parentAccount.code,
      postable: true,
      contra: contra || undefined,
    })
    flash(`${pick({ en: 'Account added', ar: 'أُضيف الحساب' })} ${code.trim()}`)
    onClose()
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      eyebrow={pick({ en: 'Chart of accounts', ar: 'دليل الحسابات' })}
      title={pick({ en: 'Add account', ar: 'إضافة حساب' })}
      footer={<>
        <button onClick={onClose} className={buttonClass('ghost', 'sm')}>{pick({ en: 'Cancel', ar: 'إلغاء' })}</button>
        <button onClick={submit} disabled={!valid} className={buttonClass('primary', 'sm')}>{pick({ en: 'Add account', ar: 'إضافة الحساب' })}</button>
      </>}
    >
      <div className="flex flex-col gap-md">
        <div className="grid sm:grid-cols-2 gap-md">
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Under', ar: 'ضمن' })}</span>
            <select value={parent} onChange={(e) => setParent(e.target.value)} className="input cursor-pointer">
              {headings.map((h) => <option key={h.code} value={h.code}>{h.code} · {pick(h.name)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Account code', ar: 'رمز الحساب' })}</span>
            <input value={code} onChange={(e) => setCode(e.target.value)} className={cn('input tabular-nums', taken && 'border-danger')} placeholder="5390" dir="ltr" />
            {taken && <span className="font-sans text-caption text-danger">{pick({ en: 'That code is already in the chart.', ar: 'هذا الرمز مستخدم في الدليل.' })}</span>}
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (Arabic)', ar: 'الاسم بالعربية' })}</span>
            <input value={ar} onChange={(e) => setAr(e.target.value)} className="input" placeholder="اسم الحساب…" />
          </label>
          <label className="flex flex-col gap-xs"><span className="label">{pick({ en: 'Name (English)', ar: 'الاسم بالإنجليزية' })}</span>
            <input value={en} onChange={(e) => setEn(e.target.value)} className="input" placeholder="Account name…" dir="ltr" />
          </label>
        </div>

        <label className="flex items-center gap-sm cursor-pointer">
          <input type="checkbox" checked={contra} onChange={(e) => setContra(e.target.checked)} className="w-4 h-4 accent-[#b08a57]" />
          <span className="font-sans text-data text-ink">{pick({ en: 'Contra account — it reduces the group it sits in', ar: 'حساب مقابل — يخصم من مجموعته' })}</span>
        </label>

        <p className="font-sans text-caption rounded-lg bg-surface-2 border border-hairline p-md text-ink-subtle">
          {parentAccount
            ? pick({
              en: `It joins ${parentAccount.name.en} as a postable account, taking that group's nature. An account can be deactivated later, never deleted — the entries it carries are history.`,
              ar: `يُضاف ضمن ${parentAccount.name.ar} كحساب قابل للترحيل، ويأخذ طبيعة مجموعته. يمكن إيقاف الحساب لاحقًا ولا يمكن حذفه — القيود التي يحملها تاريخ لا يُمحى.`,
            })
            : pick({ en: 'Choose the heading it belongs under.', ar: 'اختر الحساب التجميعي الذي يندرج تحته.' })}
        </p>
      </div>
    </Modal>
  )
}
