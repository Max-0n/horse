export * from './button'
export * from './friends'
export * from './share'
export * from './stores'
export * from './text'

export interface ConnectorResponse {
  user: any
  stateVersion: string
  stateVersionBefore: string
  featureFlags?: any
}

export enum URLS {
  INDEX = '/',
  MONSTERS = '/monsters',
  ONBOARDING = '/onboarding',
  ONBOARDING_MONSTER = '/onboarding-monster',
  MONSTERS_ID = '/monsters/[monsterId]',
  PRODUCTS = '/products',
  PRODUCTS_ID = '/products/[productId]',
  MINIGAMES_PERK_SELECT = '/products/[productId]/perk',
  MINIGAMES_PERK_DRAW = '/products/[productId]/perk/[perkId]',
  SCANNER = '/scanner',
  SCANNER_ID = '/scanner/[code]',
  SCANNER_LIST = '/scanner/list',
  FRIENDS = '/friends',
  FRIENDS_ID = '/friends/[friendId]',
  LEADERBOARD = '/leaderboard',
}

export enum PERK_TYPE {
  THUNDER = 'thunder',
  CIRCLE = 'circle',
  CLOCK = 'clock',
  STAR = 'star',
}

export interface PERK {
  type: PERK_TYPE
  name: string
}
