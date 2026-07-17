import { useMemo, useState } from 'react'
import type { CharacterProfile, Echo } from '../types'
import { upgradePotential } from '../engine/economy'
import { useFmtN, useT } from '../i18n'

// F10 (task 73, spec designer 16/07): "Chi phí hoàn thiện bộ" — <details> đóng trong LoadoutView
// (sau StatBreakdown): tổng EXP/Tuner/Credit còn thiếu của 5 echo trong bộ + ước tính SỐ NGÀY farm.
// Income/ngày là THAM SỐ user chỉnh được (persist localStorage) — datamine KHÔNG có số income live-ops.
// Tuner và EXP đến từ nguồn farm khác nhau → KHÔNG gộp 1 số, lấy max + ghi rõ nút thắt.

const LS_TUNER = 'wuwa-income-tuner'
const LS_EXP = 'wuwa-income-exp'

// Default income (task 78, 17/07/2026) — nguồn: research/echo-economy.md §5b.
// ĐO THẬT 4 run Tacet Field (screenshot user, SOL3 max): mỗi run 20 Premium Tuner + 3 Premium/4 Advanced
// tube = 23.000 EXP, counter waveplate 180→120→60→0 xác nhận 60 WP/run × 4 run/ngày.
// Cộng Weekly Activity 50 Tuner + 64.000 EXP/tuần (game8 archives/605757); KHÔNG cộng Whimpering Wastes
// (skill-gate, chu kỳ ~28 ngày). User chỉnh theo tài khoản — giá trị nhập sẽ override qua localStorage.
const DEFAULT_TUNER_PER_DAY = 87 // 4×20 + 50/7 ≈ 87,1
const DEFAULT_EXP_PER_DAY = 101000 // 4×23.000 + 64.000/7 ≈ 101.143

interface Props {
  echoes: Echo[]
  profile: CharacterProfile
}

export default function BuildCostEstimator({ echoes, profile }: Props) {
  const t = useT()
  const fmtN = useFmtN()
  // localStorage bị chặn (private mode/policy) sẽ THROW ngay trong init → sập cả cây render;
  // guard như mọi chỗ khác trong app (pattern App.tsx wuwa-seen)
  const [tunerRate, setTunerRate] = useState(() => {
    try { return localStorage.getItem(LS_TUNER) ?? String(DEFAULT_TUNER_PER_DAY) } catch { return String(DEFAULT_TUNER_PER_DAY) }
  })
  const [expRate, setExpRate] = useState(() => {
    try { return localStorage.getItem(LS_EXP) ?? String(DEFAULT_EXP_PER_DAY) } catch { return String(DEFAULT_EXP_PER_DAY) }
  })

  const need = useMemo(() => {
    let exp = 0
    let tuners = 0
    let credits = 0
    for (const e of echoes) {
      const p = upgradePotential(e, profile, { trials: 0 })
      exp += p.expNeeded
      tuners += p.tunersNeeded
      credits += p.creditsNeeded
    }
    return { exp, tuners, credits }
  }, [echoes, profile])

  if (need.exp === 0 && need.tuners === 0) return null // bộ đã full — ẩn hẳn

  const tunerN = Math.max(0, Number(tunerRate) || 0)
  const expN = Math.max(0, Number(expRate) || 0)
  // Tính mỗi vế 1 lần (task 76 — trước đây days + bottleneck mỗi cái tự chia lại)
  const tunerDays = tunerN > 0 ? need.tuners / tunerN : null
  const expDays = expN > 0 ? need.exp / expN : null
  const days = tunerDays !== null && expDays !== null ? Math.ceil(Math.max(tunerDays, expDays)) : null
  const bottleneck = tunerDays !== null && expDays !== null && tunerDays >= expDays ? 'Tuner' : 'EXP'

  const save = (key: string, v: string, set: (s: string) => void) => {
    set(v)
    try { localStorage.setItem(key, v) } catch { /* private mode — bỏ qua */ }
  }
  const inputCls = 'w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1'

  return (
    <details className="rounded border border-slate-800 bg-slate-900/40 px-2.5 py-1.5 text-xs">
      <summary className="cursor-pointer text-slate-300">
        💰 {t('buildcost.title')}
        <span className="ml-2 text-[10px] text-slate-500">{t('buildcost.teaser', { tuners: need.tuners, exp: fmtN(need.exp) })}</span>
      </summary>
      <div className="mt-1.5 space-y-1.5">
        <p className="text-slate-400">
          {t('buildcost.needed', { exp: fmtN(need.exp), tuners: need.tuners, credits: fmtN(need.credits) })}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-400">
          <label className="flex items-center gap-1.5">
            {t('buildcost.tunerPerDayLabel')}
            <input
              type="number" min={0} value={tunerRate} aria-label={t('buildcost.tunerPerDayLabel')}
              onChange={(e) => save(LS_TUNER, e.target.value, setTunerRate)}
              className={inputCls}
            />
          </label>
          <label className="flex items-center gap-1.5">
            {t('buildcost.expPerDayLabel')}
            <input
              type="number" min={0} value={expRate} aria-label={t('buildcost.expPerDayLabel')}
              placeholder={t('buildcost.expPerDayHint')}
              onChange={(e) => save(LS_EXP, e.target.value, setExpRate)}
              className={`${inputCls} w-40`}
            />
          </label>
        </div>
        <p className="text-[10px] text-slate-500">{t('buildcost.defaultNote')}</p>
        {days !== null ? (
          <p className="font-semibold text-sky-300">{t('buildcost.daysEstimate', { days, res: bottleneck })}</p>
        ) : (
          <p className="text-slate-500">{t('buildcost.enterRate')}</p>
        )}
      </div>
    </details>
  )
}
