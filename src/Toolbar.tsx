import React from 'react'
import classNames from 'classnames'
import { modals, levels } from './constants'
import { State, Modal, Level, LevelIndex } from './types'

const titleCase = (str: string): string => `${str[0].toUpperCase()}${str.slice(1).toLowerCase()}`

const ListItem = (props: {
  value: LevelIndex
  level: Level
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <li>
    <label htmlFor={props.value}>
      <input
        checked={props.level === levels[props.value]}
        onChange={props.handleChange}
        id={props.value}
        name="level"
        type="radio"
        value={levels[props.value]}
      />
      {levels[props.value] === levels.BEAST && ' Mode' ? `${titleCase(props.value)} Mode` : titleCase(props.value)}
    </label>
  </li>
)

const Toolbar = (props: {
  toggleModal: (modal: Modal) => (e: React.MouseEvent<HTMLButtonElement>) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  modal: Modal
  left: State['left']
  level: Level
}) => (
  <div className="toolbar">
    <button className="button" onClick={props.toggleModal(modals.OPTIONS)}>
      Options
    </button>
    <button className="button" onClick={props.toggleModal(modals.ABOUT)}>
      About
    </button>
    <a
      target="_blank"
      className="button button-right"
      title="Fork on GitHub"
      href="https://github.com/msimmer/react-minesweeper/"
    >
      <img src="github.svg" alt="GitHub Logo" />
    </a>
    <div className={classNames('modal', { visible: props.modal === modals.OPTIONS })} style={{ left: props.left }}>
      <ul>
        {Object.keys(levels).map(value => {
          const value_: LevelIndex = value as LevelIndex
          return <ListItem key={value} value={value_} level={props.level} handleChange={props.handleChange} />
        })}
      </ul>
    </div>
    <div className={classNames('modal', { visible: props.modal === modals.ABOUT })} style={{ left: props.left }}>
      Shift + Click to drop a flag
      <br />
      Score calculated as 3BV/s
      <br />
      Maxwell Simmer 2019
    </div>
  </div>
)

export default Toolbar
