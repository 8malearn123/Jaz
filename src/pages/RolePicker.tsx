import { useNavigate } from 'react-router-dom'
import { Fingerprint, Globe, ArrowLeft, Info, Lock } from 'lucide-react'
import { useLocale } from '@/i18n/LocaleContext'
import { useChannel } from '@/state/ChannelContext'
import { personaList, type Persona, type RoleGroup } from '@/data/roles'
import { roleIcons } from '@/components/roles/roleIcons'
import { Wordmark } from '@/components/brand/Wordmark'
import { JazanScene } from '@/components/brand/JazanScene'
import { StatusBadge } from '@/components/ui/Misc'
import { cn } from '@/lib/cn'

const groups: { id: RoleGroup; key: string }[] = [
  { id: 'shopper', key: 'picker.group.shopper' },
  { id: 'business', key: 'picker.group.business' },
  { id: 'staff', key: 'picker.group.staff' },
]

export function RolePicker() {
  const { t, pick, toggleLocale, locale } = useLocale()
  const { role, setRole } = useChannel()
  const navigate = useNavigate()

  const choose = (p: Persona) => {
    setRole(p.id)
    navigate(p.home)
  }

  return (
    <div className="relative min-h-screen bg-canvas-dark text-ink-on-dark overflow-hidden flex flex-col">
      {/* atmosphere */}
      <div className="absolute inset-0 opacity-40">
        <JazanScene tone="dark" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-canvas-dark/40 via-transparent to-canvas-dark" />

      {/* top bar */}
      <header className="relative z-10 flex items-center justify-between px-lg sm:px-xl py-lg">
        <button
          onClick={toggleLocale}
          className="inline-flex items-center gap-xs font-sans text-caption uppercase tracking-[0.1em] text-ink-on-dark-muted hover:text-ink-on-dark transition-colors"
        >
          <Globe size={15} />
          {locale === 'ar' ? 'English' : 'العربية'}
        </button>
        <div className="text-end">
          <Wordmark tone="on-dark" size="md" />
          <p className="font-sans text-caption text-ink-on-dark-muted mt-0.5">{t('brand.location').split('·')[0]}</p>
        </div>
      </header>

      {/* body */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-lg py-xl">
        <div className="text-center mb-xl animate-fade-up">
          <h1 className="font-serif text-display-lg text-ink-on-dark">{t('picker.welcome')}</h1>
          <p className="text-body-lg text-ink-on-dark-muted mt-sm">{t('picker.subtitle')}</p>
        </div>

        <div className="w-full max-w-3xl rounded-xl bg-surface-1/95 backdrop-blur-sm shadow-soft-lg p-lg sm:p-xl animate-scale-in">
          {/* Nafath */}
          <button
            onClick={() => choose(personaList[0])}
            className="w-full flex items-center justify-center gap-sm rounded-lg bg-chocolate text-ink-on-dark py-4 font-sans text-button uppercase tracking-[0.08em] hover:bg-canvas-dark transition-colors"
          >
            <Fingerprint size={18} className="text-primary-bright" />
            {t('picker.nafath')}
          </button>

          {/* divider */}
          <div className="flex items-center gap-md my-lg">
            <span className="flex-1 h-px bg-hairline" />
            <span className="font-sans text-caption uppercase tracking-[0.1em] text-ink-subtle">{t('picker.or')}</span>
            <span className="flex-1 h-px bg-hairline" />
          </div>

          {/* persona groups */}
          <div className="flex flex-col gap-lg">
            {groups.map((g) => (
              <div key={g.id} className="flex flex-col gap-sm">
                <h2 className="font-sans text-caption uppercase tracking-[0.14em] text-ink-subtle">{t(g.key)}</h2>
                <div className="grid sm:grid-cols-2 gap-sm">
                  {personaList.filter((p) => p.group === g.id).map((p) => (
                    <PersonaCard key={p.id} persona={p} active={p.id === role} onClick={() => choose(p)} pick={pick} t={t} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* demo note */}
          <div className="mt-lg rounded-md bg-surface-2 border border-hairline px-md py-3 flex items-center gap-sm">
            <Info size={16} className="text-primary-hover shrink-0" />
            <p className="font-sans text-caption text-ink-muted">{t('picker.demoNote')}</p>
          </div>
        </div>
      </main>
    </div>
  )
}

function PersonaCard({
  persona,
  active,
  onClick,
  pick,
  t,
}: {
  persona: Persona
  active: boolean
  onClick: () => void
  pick: <T>(p: { en: T; ar: T }) => T
  t: (k: string) => string
}) {
  const Icon = roleIcons[persona.id]
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-md rounded-lg border bg-surface-1 p-md text-start transition-all duration-300',
        active ? 'border-primary ring-1 ring-primary/30' : 'border-hairline hover:border-hairline-strong hover:shadow-soft hover:-translate-y-0.5',
      )}
    >
      <span className="grid place-items-center w-11 h-11 rounded-md shrink-0" style={{ backgroundColor: persona.accent, color: persona.onAccent }}>
        <Icon size={20} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-xs">
          <span className="font-serif text-card-title text-ink truncate">{pick(persona.roleLabel)}</span>
          {persona.requiresMFA && <Lock size={12} className="text-ink-subtle shrink-0" />}
        </span>
        <span className="block font-sans text-caption text-ink-subtle truncate">{pick(persona.name)}</span>
      </span>
      {active ? (
        <StatusBadge variant="gold">{t('picker.current')}</StatusBadge>
      ) : (
        <ArrowLeft size={18} className="text-ink-subtle group-hover:text-primary-hover transition-colors ltr:rotate-180 shrink-0" />
      )}
    </button>
  )
}
