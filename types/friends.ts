import { UserLookupDTO } from '@shared-protocol/types'

export enum FriendsTabEnum {
  FOLLOWINGS,
  FOLLOWERS,
}

export interface UserLookupWithFriends extends UserLookupDTO {
  userFollowers: number
  userFollowings: number
}
