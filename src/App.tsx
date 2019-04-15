import React from 'react'
import classNames from 'classnames'
import './App.css'

type Column = {
  bomb: boolean
  edges: number
  reveal: boolean
  region: number | null
}

type Row = Column[]
type Rows = Row[]
type MaybeColumn = Column | null

type Regions = {
  [name: string]: number
}

type Indices = [number, number]

// get integer between min and max exclusive of max
const random = (min: number, max: number): number => {
  const min_: number = Math.ceil(min)
  const max_: number = Math.floor(max)
  return Math.floor(Math.random() * (max_ - min_)) + min_
}

const Header = (props: { handleReset: () => void }) => {
  return (
    <header>
      <div className="counter" />
      <button className="status" onClick={props.handleReset}>
        😃
      </button>
      <div className="timer" />
    </header>
  )
}

const Board = (props: { rows: Rows; handleClick: (indices: Indices) => () => void; handleReset: () => void }) => (
  <div className="board">
    <Header handleReset={props.handleReset} />
    <div className="grid">
      {props.rows.map((row: Row, i) => (
        <div key={i} className="row">
          {row.map((column: Column, j) => (
            <div key={`${i}-${j}`} className="column">
              <button
                onClick={props.handleClick([i, j])}
                className={classNames('button', { reveal: column.reveal } /* , { bomb: column.bomb } */)}
              >
                {column.reveal && column.bomb && '💣'}
                {(column.reveal && !column.bomb && column.edges && column.edges) || ''}
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
)

class App extends React.Component {
  state: {
    bbbv: number
    bombs: number
    rows: Rows
    size: number
  } = {
    bbbv: 0,
    bombs: 12,
    rows: [],
    size: 12,
  }

  componentWillMount() {
    this.reset()
  }

  setRegion = (rows: Rows, rowIndex: number, columnIndex: number, region: number): MaybeColumn => {
    // get the current node if it exists and set its region
    let node: MaybeColumn = this.regionBlank(rows, rowIndex, columnIndex)
    if (!node) return node

    node.region = region

    // iterate along the X and Y axes recursively checking for blanks
    if (this.regionBlank(rows, rowIndex + 1, columnIndex)) this.setRegion(rows, rowIndex + 1, columnIndex, region) // below
    if (this.regionBlank(rows, rowIndex - 1, columnIndex)) this.setRegion(rows, rowIndex - 1, columnIndex, region) // above
    if (this.regionBlank(rows, rowIndex, columnIndex + 1)) this.setRegion(rows, rowIndex, columnIndex + 1, region) // right
    if (this.regionBlank(rows, rowIndex, columnIndex - 1)) this.setRegion(rows, rowIndex, columnIndex - 1, region) // left

    // get the siblings of the current node and update their regions. we're
    // dilating the region to account for any tiles that would be revealed by
    // clicking on blank tile. we resolve any overlapping tiles (edges that
    // could be revealed by a click on different regions) by setting a flag on
    // the node and only counting it once
    this.assign(this.regionEdge, rows, rowIndex, columnIndex, (node: Column) => (node.region = region))

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
        const node = this.setRegion(rows, i, j, region)
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
    this.setState({ bbbv, rows })
  }

  setBombs = (rows: Rows, size: number): Rows => {
    const rowIndex: number = random(0, size)
    const columnIndex: number = random(0, size)
    const current: Column = rows[rowIndex][columnIndex]

    // try again if it's already set
    if (current.bomb === true) return this.setBombs(rows, size)

    // set the bomb value on the column
    current.bomb = true

    let node: MaybeColumn = null

    // set the edges value on the adjacent nodes, including diagonals
    this.assign(this.exists, rows, rowIndex, columnIndex, (node: Column) => (node.edges += 1))

    return rows
  }

  getRows = (size: number): Rows => {
    const { bombs } = this.state
    const column: Column = { bomb: false, edges: 0, reveal: false, region: null }
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
    if (confirm('You died 💣 Play again?')) this.reset()
  }

  win = (): void => {
    if (confirm('You won ! 🎉 Play again?')) this.reset()
  }

  // if a node exists
  exists = (rows: Rows, row: number, col: number): MaybeColumn => (rows[row] && rows[row][col] ? rows[row][col] : null)

  // if a node is hidden
  hidden = (rows: Rows, row: number, col: number): MaybeColumn =>
    this.exists(rows, row, col) && rows[row][col].reveal === false ? rows[row][col] : null

  // if a node has no edges touching a bomb
  blank = (rows: Rows, row: number, col: number): MaybeColumn =>
    this.exists(rows, row, col) && this.hidden(rows, row, col) && rows[row][col].edges < 1 ? rows[row][col] : null

  // if a node is touching a bomb
  edge = (rows: Rows, row: number, col: number): MaybeColumn =>
    this.exists(rows, row, col) && rows[row][col].edges > 0 ? rows[row][col] : null

  // if a node is blank and has not been assigned a region
  regionBlank = (rows: Rows, row: number, col: number): MaybeColumn =>
    this.exists(rows, row, col) &&
    rows[row][col].region === null &&
    rows[row][col].bomb === false &&
    rows[row][col].edges < 1
      ? rows[row][col]
      : null

  // if a node is an edge and has not been assigned a region
  regionEdge = (rows: Rows, row: number, col: number): MaybeColumn =>
    this.exists(rows, row, col) && rows[row][col].edges > 0 && rows[row][col].region === null ? rows[row][col] : null

  // utility function for assigning values to orthagonal and diagonal nodes in
  // relation to a source node at rowIndex x columnIndex
  assign = (
    conditional: (rows: Rows, rowIndex: number, columnIndex: number) => MaybeColumn,
    rows: Rows,
    rowIndex: number,
    columnIndex: number,
    callback: (node: Column) => void,
  ) => {
    let node: MaybeColumn = null
    if ((node = conditional.call(this, rows, rowIndex + 1, columnIndex))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex - 1, columnIndex))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex, columnIndex + 1))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex, columnIndex - 1))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex + 1, columnIndex + 1))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex - 1, columnIndex - 1))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex + 1, columnIndex - 1))) callback.call(this, node)
    if ((node = conditional.call(this, rows, rowIndex - 1, columnIndex + 1))) callback.call(this, node)
  }

  reveal = (rows: Rows, indices: Indices): Rows => {
    const [rowIndex, columnIndex] = indices
    const current: Column = rows[rowIndex][columnIndex]

    current.reveal = true

    if (current.bomb) {
      this.die()
      return rows
    }

    if (current.edges > 0) {
      current.reveal = true
      return rows
    }

    let node: MaybeColumn = null

    // recursively call reveal while blank tiles have edges against the selected tile
    if (this.blank(rows, rowIndex + 1, columnIndex)) this.reveal(rows, [rowIndex + 1, columnIndex]) // below
    if (this.blank(rows, rowIndex - 1, columnIndex)) this.reveal(rows, [rowIndex - 1, columnIndex]) // above
    if (this.blank(rows, rowIndex, columnIndex + 1)) this.reveal(rows, [rowIndex, columnIndex + 1]) // right
    if (this.blank(rows, rowIndex, columnIndex - 1)) this.reveal(rows, [rowIndex, columnIndex - 1]) // left

    this.assign(this.edge, rows, rowIndex, columnIndex, (node: Column) => (node.reveal = true))

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

  handleClick = (indices: Indices) => (): void => {
    const { rows } = this.state
    this.reveal(rows, indices)
    this.setState({ rows }, this.validate)
  }

  render(): JSX.Element {
    const { rows } = this.state
    return (
      <div className="page">
        <Board rows={rows} handleClick={this.handleClick} handleReset={this.reset} />
      </div>
    )
  }
}

export default App
