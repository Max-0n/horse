import { type PERK, PERK_TYPE } from '@/types'

// Ключ по которому authToken будет храниться в LS
export const AUTH_TOKEN_KEY = 'at'

// Кол-во подгружаемых монстров при скролле
export const MONSTERS_OFFSET_PAGINATION = 8

export const RARE_MIN_POWER = 15

export const PERKS: PERK[] = [
  { type: PERK_TYPE.STAR, name: 'minigame.perk.star' },
  { type: PERK_TYPE.CLOCK, name: 'minigame.perk.clock' },
  { type: PERK_TYPE.CIRCLE, name: 'minigame.perk.circle' },
  { type: PERK_TYPE.THUNDER, name: 'minigame.perk.thunder' },
]
