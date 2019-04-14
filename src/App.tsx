import React from 'react'
import classNames from 'classnames'
import './App.css'

type Column = {
  bomb: boolean
  edges: number
  reveal: boolean
}

type Row = Column[]
type Rows = Row[]

type MaybeColumn = Column | null

// get integer between min and max exclusive of max
const random = (min: number, max: number): number => {
  const min_: number = Math.ceil(min)
  const max_: number = Math.floor(max)
  return Math.floor(Math.random() * (max_ - min_)) + min_
}

class App extends React.Component {
  state: {
    bombs: number
    rows: Rows
    size: number
  } = {
    bombs: 12,
    rows: [],
    size: 12,
  }

  componentWillMount() {
    this.reset()
  }

  reset = (): void => {
    const { size } = this.state
    const rows: Rows = this.getRows(size)
    this.setState({ rows })
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
    if ((node = this.exists(rows, rowIndex + 1, columnIndex + 1))) node.edges += 1
    if ((node = this.exists(rows, rowIndex + 1, columnIndex - 1))) node.edges += 1
    if ((node = this.exists(rows, rowIndex - 1, columnIndex + 1))) node.edges += 1
    if ((node = this.exists(rows, rowIndex - 1, columnIndex - 1))) node.edges += 1
    if ((node = this.exists(rows, rowIndex + 1, columnIndex))) node.edges += 1
    if ((node = this.exists(rows, rowIndex - 1, columnIndex))) node.edges += 1
    if ((node = this.exists(rows, rowIndex, columnIndex + 1))) node.edges += 1
    if ((node = this.exists(rows, rowIndex, columnIndex - 1))) node.edges += 1

    return rows
  }

  getRows = (size: number): Rows => {
    const { bombs } = this.state
    const column: Column = { bomb: false, edges: 0, reveal: false }
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
    setTimeout(() => {
      if (confirm('You died 💣 Play again?')) this.reset()
    }, 0)
  }

  win = (): void => {
    setTimeout(() => {
      if (confirm('You won ! 🎉 Play again?')) this.reset()
    }, 0)
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

  reveal = (rows: Rows, indices: number[]): Rows => {
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
    if ((node = this.blank(rows, rowIndex + 1, columnIndex))) this.reveal(rows, [rowIndex + 1, columnIndex]) // below
    if ((node = this.blank(rows, rowIndex - 1, columnIndex))) this.reveal(rows, [rowIndex - 1, columnIndex]) // above
    if ((node = this.blank(rows, rowIndex, columnIndex + 1))) this.reveal(rows, [rowIndex, columnIndex + 1]) // right
    if ((node = this.blank(rows, rowIndex, columnIndex - 1))) this.reveal(rows, [rowIndex, columnIndex - 1]) // left

    // reveal the first tile that is touching a bomb orthagonally or diagonally
    if ((node = this.edge(rows, rowIndex + 1, columnIndex))) node.reveal = true
    if ((node = this.edge(rows, rowIndex - 1, columnIndex))) node.reveal = true
    if ((node = this.edge(rows, rowIndex, columnIndex + 1))) node.reveal = true
    if ((node = this.edge(rows, rowIndex, columnIndex - 1))) node.reveal = true
    if ((node = this.edge(rows, rowIndex + 1, columnIndex + 1))) node.reveal = true
    if ((node = this.edge(rows, rowIndex - 1, columnIndex - 1))) node.reveal = true
    if ((node = this.edge(rows, rowIndex - 1, columnIndex + 1))) node.reveal = true
    if ((node = this.edge(rows, rowIndex + 1, columnIndex - 1))) node.reveal = true

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

  handleClick = (indices: number[]) => (): void => {
    const { rows } = this.state
    this.reveal(rows, indices)
    this.setState({ rows }, this.validate)
  }

  render(): JSX.Element {
    const { rows, ...rest } = this.state
    return (
      <div className="page">
        <div className="grid">
          {rows.map((row: Row, i) => (
            <div key={i} className="row">
              {row.map((column: Column, j) => (
                <div key={`${i}-${j}`} className="column">
                  <button
                    onClick={this.handleClick([i, j])}
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
  }
}

export default App
