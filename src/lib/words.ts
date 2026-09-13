export type GameId = 'rain' | 'spy' | 'sort'
export type GameWord = {
  id: string
  game_id: GameId
  word: string
  meaning: string
  extra: string
  type?: 'good' | 'bad' | string
  correction?: string
  goodWord?: string
  badWord?: string
}
