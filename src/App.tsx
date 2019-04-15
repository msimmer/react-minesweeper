import React from 'react'
import classNames from 'classnames'
import { Column, MaybeColumn, Row, Rows, Regions, Indices, Status, State } from './types'
import './App.css'

const statuses: {
  READY: number
  WIN: number
  LOSE: number
} = {
  READY: 0,
  WIN: 1,
  LOSE: 2,
}

// get integer between min and max exclusive of max
const random = (min: number, max: number): number => {
  const min_: number = Math.ceil(min)
  const max_: number = Math.floor(max)
  return Math.floor(Math.random() * (max_ - min_)) + min_
}

const Header = (props: { bombs: number; flags: number; handleReset: () => void; status: Status }) => {
  return (
    <header>
      <div className="flags">{props.flags}</div>
      <button className="status" onClick={props.handleReset}>
        {props.status === statuses.READY ? '😃' : props.status === statuses.WIN ? '😎' : '🙁'}
      </button>
      <div className="timer" />
    </header>
  )
}

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

class App extends React.Component {
  state: State = {
    bbbv: 0,
    bombs: 12,
    flags: 12,
    rows: [],
    size: 12,
    status: statuses.READY,
  }

  componentWillMount() {
    this.reset()
  }

  setRegion = (rows: Rows, [row, col]: Indices, region: number): MaybeColumn => {
    // get the current node if it exists and set its region
    let node: MaybeColumn = this.regionBlank(rows, [row, col])
    if (!node) return node

    node.region = region

    // iterate along the X and Y axes recursively checking for blanks
    const matrix: Indices[] = [
      [row + 1, col], // below
      [row - 1, col], // above
      [row, col + 1], // right
      [row, col - 1], // left
    ]

    let coords: Indices | undefined
    while ((coords = matrix.shift())) {
      if (this.regionBlank(rows, coords)) this.setRegion(rows, coords, region)
    }

    // get the siblings of the current node and update their regions. we're
    // dilating the region to account for any tiles that would be revealed by
    // clicking on blank tile. we resolve any overlapping tiles (edges that
    // could be revealed by a click on different regions) by setting a flag on
    // the node and only counting it once
    this.assign(this.regionEdge, rows, [row, col], (node: Column) => (node.region = region))

    // let our loop know that successfully found a region and can increment the
    // counter
    return node
  }

  // calculate the minimum required clicks to solve the board to score against
  // the 3BV (http://www.stephan-bechtel.de/3bv.htm). we break the board down
  // into regions that would be revealed when a blank tile is clicked, also
  // accounting for tiles that that share an edge with blank tiles
  getRegions = (rows: Rows, indices: Indices = [0, 0], regionIndex: number = 0): number => {
    const { bombs, size } = this.state
    const count: Regions = {}

    // store regions as an index
    let region: number = 0
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < rows[i].length; j++) {
        const node = this.setRegion(rows, [i, j], region)
        if (node) region += 1
      }
    }

    // count the tiles per region
    for (let i = 0; i < region; i++) {
      count[i] = rows.reduce(
        (acc1, curr1) => acc1 + curr1.reduce((acc2, curr2) => acc2 + (curr2.region === i ? 1 : 0), 0),
        0,
      )
    }

    // minimum clicks required to clear all blanks
    const blanks = Object.keys(count).length

    // number of tiles that are either blank or would be revealed by clicking a
    // blank beside it
    const dilated = Object.values(count).reduce((acc: number, curr: number) => acc + curr, 0)

    // remaining tiles that require a single click to reveal
    const remains = size - dilated - bombs

    // minimum required clicks to clear the board
    const bbbv = blanks + remains

    return bbbv
  }

  reset = (): void => {
    const { size } = this.state
    const rows: Rows = this.getRows(size)
    const bbbv: number = this.getRegions(rows)
    this.setState({ flags: 12, bbbv, rows, status: statuses.READY })
  }

  setBombs = (rows: Rows, size: number): Rows => {
    const row: number = random(0, size)
    const col: number = random(0, size)
    const current: Column = rows[row][col]

    // try again if it's already set
    if (current.bomb === true) return this.setBombs(rows, size)

    // set the bomb value on the column
    current.bomb = true

    let node: MaybeColumn = null

    // set the edges value on the adjacent nodes, including diagonals
    this.assign(this.exists, rows, [row, col], (node: Column) => (node.edges += 1))

    return rows
  }

  getRows = (size: number): Rows => {
    const { bombs } = this.state
    const column: Column = { bomb: false, edges: 0, flag: false, reveal: false, region: null, show: false }
    const rows: Rows = []

    // create empty rows
    for (let i = 0; i < size; i++) {
      const columns = new Array(size)
      for (let j = 0; j < size; j++) {
        columns[j] = { ...column }
      }
      rows.push(columns)
    }

    for (let i = 0; i < bombs; i++) {
      this.setBombs(rows, size)
    }

    return rows
  }

  die = (): void => {
    this.setState({ status: statuses.LOSE })
  }

  win = (): void => {
    this.setState({ status: statuses.WIN })
  }

  // if a node exists
  exists = (rows: Rows, [row, col]: Indices): MaybeColumn => (rows[row] && rows[row][col] ? rows[row][col] : null)

  // if a node is hidden
  hidden = (rows: Rows, [row, col]: Indices): MaybeColumn =>
    this.exists(rows, [row, col]) && rows[row][col].reveal === false ? rows[row][col] : null

  // if a node has no edges touching a bomb
  blank = (rows: Rows, [row, col]: Indices): MaybeColumn =>
    this.exists(rows, [row, col]) && (this.hidden(rows, [row, col]) && rows[row][col].edges < 1) ? rows[row][col] : null

  // if a node is touching a bomb
  edge = (rows: Rows, [row, col]: Indices): MaybeColumn =>
    this.exists(rows, [row, col]) && rows[row][col].edges > 0 ? rows[row][col] : null

  // if a node is blank and has not been assigned a region
  regionBlank = (rows: Rows, [row, col]: Indices): MaybeColumn =>
    this.exists(rows, [row, col]) &&
    rows[row][col].region === null &&
    rows[row][col].bomb === false &&
    rows[row][col].edges < 1
      ? rows[row][col]
      : null

  // if a node is an edge and has not been assigned a region
  regionEdge = (rows: Rows, [row, col]: Indices): MaybeColumn =>
    this.exists(rows, [row, col]) && rows[row][col].edges > 0 && rows[row][col].region === null ? rows[row][col] : null

  // utility function for assigning values to orthagonal and diagonal nodes in
  // relation to a source node at row index x col index
  assign = (
    conditional: (rows: Rows, [row, col]: Indices) => MaybeColumn,
    rows: Rows,
    [row, col]: Indices,
    callback: (node: Column) => void,
  ) => {
    const matrix: Indices[] = [
      [row + 1, col], // orthangonals
      [row - 1, col],
      [row, col + 1],
      [row, col - 1],
      [row + 1, col + 1], // diagonals
      [row - 1, col - 1],
      [row + 1, col - 1],
      [row - 1, col + 1],
    ]

    let node: MaybeColumn = null
    let coords: Indices | undefined
    while ((coords = matrix.shift())) {
      if ((node = conditional.call(this, rows, coords))) callback.call(this, node)
    }
  }

  reveal = (rows: Rows, indices: Indices): Rows => {
    const [row, col] = indices
    const current: Column = rows[row][col]

    current.reveal = true
    if (current && current.flag === false) current.show = true

    // only orthangonals
    const matrix: Indices[] = [
      [row + 1, col], // below
      [row - 1, col], // above
      [row, col + 1], // right
      [row, col - 1], // left
    ]

    let node: MaybeColumn = null
    let coords: Indices | undefined

    // recursively call reveal while blank tiles have edges against the selected tile
    while ((coords = matrix.shift())) {
      if (this.blank(rows, coords)) this.reveal(rows, coords)
    }

    this.assign(this.edge, rows, [row, col], (node: Column) => {
      node.reveal = true
      if (node && node.flag === false) node.show = true
    })

    return rows
  }

  // check to see if user wins
  validate = (): void => {
    const { bombs, rows, size } = this.state
    const revealed = rows.reduce(
      (acc1, curr1) => acc1 + curr1.reduce((acc2, curr2) => (acc2 += curr2.reveal ? 1 : 0), 0),
      0,
    )

    if (size ** 2 - bombs === revealed) this.win()
  }

  handleClick = (indices: Indices) => (e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void => {
    const { rows, status } = this.state
    let { flags } = this.state
    const [row, col] = indices
    const node: Column = rows[row][col]

    // don't keep clicking after game is done
    if (status !== statuses.READY) return

    // trying to drop a flag but none remaining, noop
    if (e.shiftKey && flags < 1) return

    // drop a flag
    if (e.shiftKey) {
      const flagged = !node.flag
      node.flag = flagged
      flags += flagged ? -1 : 1
      return this.setState({ flags, rows })
    }

    // don't handle click for flagged tiles
    if (node.flag) return

    if (node.bomb) return this.die()

    // edge tile
    if (node.edges > 0) {
      node.reveal = true
      node.show = true
    } else {
      // blank tile
      this.reveal(rows, indices)
    }

    this.setState({ rows }, this.validate)
  }

  render(): JSX.Element {
    return (
      <div className="page">
        <Board handleClick={this.handleClick} handleReset={this.reset} {...this.state} />
      </div>
    )
  }
}

export default App
