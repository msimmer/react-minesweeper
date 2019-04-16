import React from 'react'
import classNames from 'classnames'
import { Column, Row, Rows, Indices, Status } from './types'
import Header from './Header'
import { statuses } from './constants'

const Text = (props: { column: Column; status: number }): JSX.Element => (
  <React.Fragment>
    {props.column.show && props.column.edges > 0
      ? props.column.edges
      : (props.column.show || props.status !== statuses.READY) && props.column.bomb
      ? '💣'
      : props.column.flag
      ? '⛳'
      : ''}
  </React.Fragment>
)

const Board = (props: {
  bombs: number
  flags: number
  rows: Rows
  handleClick: (indices: Indices) => (e: React.MouseEvent<HTMLButtonElement>) => void
  handleReset: () => void
  status: Status
  time: number
}) => (
  <div className="board">
    <Header
      handleReset={props.handleReset}
      bombs={props.bombs}
      flags={props.flags}
      status={props.status}
      time={props.time}
    />
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
                <Text column={column} status={props.status} />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

export default Board
