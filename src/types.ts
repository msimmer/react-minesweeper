export type Column = {
  bomb: boolean
  edges: number
  flag: boolean
  reveal: boolean
  region: number | null
  show: boolean
}

export type Row = Column[]
export type Rows = Row[]
export type MaybeColumn = Column | null

export type Regions = {
  [name: string]: number
}

export type Indices = [number, number]

export type StatusIndex = 'READY' | 'WIN' | 'LOSE'
export enum Status {
  ready,
  win,
  lose,
}

export type ModalIndex = 'NONE' | 'OPTIONS' | 'ABOUT'
export enum Modal {
  none,
  options,
  about,
}

export type LevelIndex = 'EASY' | 'MEDIUM' | 'HARD' | 'BEAST'
export enum Level {
  easy,
  medium,
  hard,
  beast,
}

export type State = {
  bbbv: number
  bombs: number
  flags: number
  rows: Rows
  size: number
  status: Status
  start: number
  timer: number | undefined
  time: number
  modal: Modal
  left: number
  level: Level
}
