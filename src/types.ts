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

export enum Status {
  ready,
  win,
  lose,
}

export type State = {
  bbbv: number
  bombs: number
  flags: number
  rows: Rows
  size: number
  status: Status
}
