import { useEffect, useState } from 'react'
import { useRules } from '@/api/queries'
import { STORE } from '@/lib/constants'
import { isOpen, isPromoDay } from '@/lib/pricing'

/** Aberto/fechado e promoção do dia, no fuso da loja. Reavalia a cada minuto. */
export function useStoreStatus() {
  const { data: rules } = useRules()
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(t)
  }, [])

  if (!rules) return { rules: undefined, open: false, promoToday: false, label: '' }

  const open = isOpen(rules, now, STORE.timeZone)
  const opens = rules.opensAt.replace(':00', 'h').replace(':', 'h')
  const closes = rules.closesAt.replace(':00', 'h').replace(':', 'h')
  return {
    rules,
    open,
    promoToday: isPromoDay(rules, now, STORE.timeZone),
    label: open ? `Aberto agora, até ${closes}` : `Fechado agora, abrimos às ${opens}`,
  }
}
