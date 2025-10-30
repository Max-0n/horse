export enum ShareType {
  MONSTER = 'monster',
  PRODUCT = 'product',
  USER = 'user',
}

//TODO delete?
export interface StartApp {
  trafficId?: string
  ref?: string
  monster?: string
  product?: string
}

export interface ShareStoryOptions {
  monsterId?: string
  monsterName?: string
  generatedImage?: string
}
