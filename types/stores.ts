import type { MonsterDTO, ProductResponse, UserShortPersonal } from '@shared-protocol/types'

export interface AppStore {
  user?: UserShortPersonal
  monstersMap: Map<MonsterDTO['id'], MonsterDTO>
  monstersListIdArray: MonsterDTO['id'][]
  productsList?: ProductResponse[]
  version?: number | string
}
