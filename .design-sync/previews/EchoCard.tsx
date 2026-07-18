// Preview EchoCard — card echo phong cách in-game (viền rarity, main stat, thanh mốc roll, RV%).
// Dữ liệu thật từ DB của app (Dreamless/havoc-eclipse + Camellya) để card giống hệt in-app.
import { EchoCard, ScoreBadge } from 'app'
import { CHARACTER_BY_ID } from '../../app/src/data/characters'
import { scoreEcho } from '../../app/src/engine/score'
import type { Echo } from '../../app/src/types'

const camellya = CHARACTER_BY_ID['camellya']

const dreamless: Echo = {
  id: 'preview-dreamless',
  name: 'Dreamless',
  cost: 4,
  set: 'havoc-eclipse',
  rarity: 5,
  level: 25,
  mainStat: 'critRate',
  substats: [
    { stat: 'critDmg', value: 21.0 },
    { stat: 'critRate', value: 8.7 },
    { stat: 'atkPct', value: 10.9 },
    { stat: 'basicAtk', value: 9.4 },
    { stat: 'atk', value: 50 },
  ],
}

const fusionWarrior: Echo = {
  id: 'preview-fusion-warrior',
  name: 'Fusion Warrior',
  cost: 1,
  set: 'molten-rift',
  rarity: 5,
  level: 25,
  mainStat: 'atkPct',
  substats: [
    { stat: 'critRate', value: 7.5 },
    { stat: 'energyRegen', value: 8.4 },
    { stat: 'hp', value: 470 },
    { stat: 'atkPct', value: 8.6 },
    { stat: 'critDmg', value: 15.0 },
  ],
}

const geochelone4: Echo = {
  id: 'preview-geochelone',
  name: 'Bell-Borne Geochelone',
  cost: 4,
  set: 'rejuvenating-glow',
  rarity: 4,
  level: 10,
  mainStat: 'hpPct',
  substats: [
    { stat: 'hpPct', value: 7.9 },
    { stat: 'def', value: 60 },
    { stat: 'energyRegen', value: 9.2 },
  ],
}

/** Card đầy đủ: 5★ +25, main Crit Rate, substat tô màu theo profile Camellya */
export const FiveStarFull = () => (
  <div style={{ background: '#020617', borderRadius: 8, maxWidth: 340, padding: 16 }}>
    <EchoCard echo={dreamless} profile={camellya} />
  </div>
)

/** Bản compact cho lưới nhiều cột (LoadoutView) — 2 card cạnh nhau */
export const CompactPair = () => (
  <div style={{ background: '#020617', borderRadius: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 520, padding: 16 }}>
    <EchoCard echo={dreamless} compact profile={camellya} />
    <EchoCard echo={fusionWarrior} compact profile={camellya} />
  </div>
)

/** Chân card có footer — điểm ScoreBadge (chip) như trong kết quả OCR/bench */
export const WithScoreFooter = () => (
  <div style={{ background: '#020617', borderRadius: 8, maxWidth: 340, padding: 16 }}>
    <EchoCard
      echo={dreamless}
      profile={camellya}
      footer={<ScoreBadge r={scoreEcho(dreamless, camellya)} variant="badge" profile={camellya} />}
    />
  </div>
)

/** Echo 4★ đang nâng cấp (+10, mới mở 3 substat) — viền tím, không tô theo profile */
export const FourStarMidLevel = () => (
  <div style={{ background: '#020617', borderRadius: 8, maxWidth: 340, padding: 16 }}>
    <EchoCard echo={geochelone4} />
  </div>
)
