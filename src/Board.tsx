import React from 'react'
import classNames from 'classnames'
import { Column, Row, Rows, Indices, Status } from './types'
import Header from './Header'
import { statuses } from './constants'

const Board = (props: {
  bombs: number
  flags: number
  rows: Rows
  handleClick: (indices: Indices) => (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
  handleReset: () => void
  status: Status
}) => (
  <div className="board">
    <Header handleReset={props.handleReset} bombs={props.bombs} flags={props.flags} status={props.status} />
    <div className="grid">
      {props.rows.map((row: Row, i) => (
        <div key={i} className="row">
          {row.map((column: Column, j) => (
            <div key={`${i}-${j}`} className="column">
              <button
                onClick={props.handleClick([i, j])}
                className={classNames(
                  'button',
                  { show: column.show },
                  { flag: column.flag },
                  // { bomb: column.bomb },
                  { bomb: props.status !== statuses.READY && column.bomb },
                  { inactive: props.status !== statuses.READY },
                )}
              >
                {column.flag && '⛳'}
                {(column.show || props.status !== statuses.READY) && column.bomb && '💣'}
                {(column.show && !column.bomb && column.edges && column.edges) || ''}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export default Board
