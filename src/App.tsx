import React, { ChangeEvent } from 'react'
import cloneDeep from 'lodash/cloneDeep'
import { Column, MaybeColumn, Row, Rows, Regions, Indices, State, Modal, Level } from './types'
import Board from './Board'
import Toolbar from './Toolbar'
import { statuses, modals, levels } from './constants'
import './App.css'

// get integer between min and max exclusive of max
const random = (min: number, max: number): number => {
    const min_: number = Math.ceil(min)
    const max_: number = Math.floor(max)
    return Math.floor(Math.random() * (max_ - min_)) + min_
}

class MineSweeper extends React.Component {
    static defaultProps: State = {
        bbbv: 0,
        bombs: 12,
        flags: 12,
        rows: [],
        size: 12,
        status: statuses.READY,
        start: 0,
        time: 0,
        timer: undefined,
        modal: modals.NONE,
        left: 0,
        level: levels.EASY,
    }

    state: State = { ...MineSweeper.defaultProps }

    componentWillMount() {
        this.reset()
    }

    getTime = (): void => {
        const { start, timer } = this.state
        if (!timer) return

        const time: State['time'] = Math.floor((Date.now() - start) / 1000)
        if (time > 999) return

        this.setState({ time })
    }

    // start the timer
    start = (): { start: number; timer: State['timer'] } => {
        const start: State['start'] = Date.now()
        const timer: State['timer'] = window.setInterval(this.getTime.bind(this), 1000)
        return { start, timer }
    }

    // stop the timer
    stop = (): void => {
        const { timer } = this.state
        window.clearInterval(timer)
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
    getRegions = (rows: Rows, size: State['size'], bombs: State['bombs']): State['bbbv'] => {
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
        const blanks: number = Object.keys(count).length

        // number of tiles that are either blank or would be revealed by clicking a
        // blank beside it
        const dilated: number = Object.values(count).reduce((acc: number, curr: number) => acc + curr, 0)

        // remaining tiles that require a single click to reveal
        const remains: number = size - dilated - bombs

        // minimum required clicks to clear the board
        const bbbv: State['bbbv'] = blanks + remains

        return bbbv
    }

    reset = (): void => {
        const { level } = this.state
        let { bombs, flags, size } = this.state

        if (level === levels.EASY) {
            bombs = flags = size = 12
        } else if (level === levels.MEDIUM) {
            bombs = flags = 48
            size = 16
        } else if (level === levels.HARD) {
            bombs = flags = 72
            size = 16
        } else if (level === levels.BEAST) {
            bombs = flags = 192
            size = 20
        }

        const rows: Rows = this.getRows(size, bombs)
        const bbbv: State['bbbv'] = this.getRegions(rows, size, bombs)
        this.stop()
        this.setState({ ...MineSweeper.defaultProps, bombs, flags, size, bbbv, rows, level })
    }

    setBombs = (rows: Rows, size: number): Rows => {
        const row: number = random(0, size)
        const col: number = random(0, size)
        const current: Column = rows[row][col]

        // try again if it's already set
        if (current.bomb === true) return this.setBombs(rows, size)

        // set the bomb value on the column
        current.bomb = true

        // set the edges value on the adjacent nodes, including diagonals
        this.assign(this.exists, rows, [row, col], (node: Column) => (node.edges += 1))

        return rows
    }

    getRows = (size: State['size'], bombs: State['bombs']): Rows => {
        const column: Column = { bomb: false, edges: 0, flag: false, reveal: false, region: null, show: false }
        const rows: Rows = []

        // create empty rows
        for (let i = 0; i < size; i++) {
            const columns: Row = new Array(size)
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
        this.stop()
        this.setState({ status: statuses.LOSE, timer: MineSweeper.defaultProps.timer })
    }

    win = (): void => {
        this.stop()
        this.setState({ status: statuses.WIN, timer: MineSweeper.defaultProps.timer })
    }

    // if a node exists
    exists = (rows: Rows, [row, col]: Indices): MaybeColumn => (rows[row] && rows[row][col] ? rows[row][col] : null)

    // if a node is hidden
    hidden = (rows: Rows, [row, col]: Indices): MaybeColumn =>
        this.exists(rows, [row, col]) && rows[row][col].reveal === false ? rows[row][col] : null

    // if a node has no edges touching a bomb
    blank = (rows: Rows, [row, col]: Indices): MaybeColumn =>
        this.exists(rows, [row, col]) && (this.hidden(rows, [row, col]) && rows[row][col].edges < 1)
            ? rows[row][col]
            : null

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
        this.exists(rows, [row, col]) && rows[row][col].edges > 0 && rows[row][col].region === null
            ? rows[row][col]
            : null

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

        // recursively call reveal while blank tiles have edges against the selected tile
        let coords: Indices | undefined
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
        const revealed: number = rows.reduce(
            (acc1, curr1) => acc1 + curr1.reduce((acc2, curr2) => (acc2 += curr2.reveal ? 1 : 0), 0),
            0,
        )

        if (size ** 2 - bombs === revealed) this.win()
    }

    handleClick = (indices: Indices) => (e: React.MouseEvent<HTMLButtonElement>): void => {
        const { status } = this.state
        const rows = cloneDeep(this.state.rows)
        let { start, timer, flags } = this.state
        const [row, col] = indices
        const node: Column = rows[row][col]

        // don't keep clicking after game is done
        if (status !== statuses.READY) return

        // get the start time and timer index from start method
        if (!timer) ({ start, timer } = this.start())

        // trying to drop a flag but none remaining, noop
        if (e.shiftKey && flags < 1) return

        // drop a flag
        if (e.shiftKey && this.hidden(rows, indices)) {
            const flagged: boolean = !node.flag
            node.flag = flagged
            flags += flagged ? -1 : 1
            return this.setState({ flags, rows, start, timer })
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

        this.setState({ rows, start, timer }, this.validate)
    }

    toggleModal = (modal: Modal) => (e: React.MouseEvent<HTMLButtonElement>): void => {
        const modal_ = this.state.modal === modal ? modals.NONE : modal
        this.setState({ modal: modal_, left: e.currentTarget.offsetLeft })
    }

    handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const level: Level = Number(e.currentTarget.value)
        this.setState({ level }, () => this.reset())
    }

    render(): JSX.Element {
        const { modal, left, level } = this.state
        return (
            <div className="page">
                <div className="frame">
                    <Toolbar
                        toggleModal={this.toggleModal}
                        handleChange={this.handleChange}
                        modal={modal}
                        left={left}
                        level={level}
                    />
                    <Board handleClick={this.handleClick} handleReset={this.reset} {...this.state} />
                </div>
            </div>
        )
    }
}

export default MineSweeper
