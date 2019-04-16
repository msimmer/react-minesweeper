import { StatusIndex, ModalIndex, LevelIndex, Level } from './types'

export const statuses: { [k in StatusIndex]: number } = {
  READY: 0,
  WIN: 1,
  LOSE: 2,
}

export const modals: { [k in ModalIndex]: number } = {
  NONE: 0,
  OPTIONS: 1,
  ABOUT: 2,
}

export const levels: { [k in LevelIndex]: number } = {
  EASY: 0,
  MEDIUM: 1,
  HARD: 2,
  BEAST: 3,
}
