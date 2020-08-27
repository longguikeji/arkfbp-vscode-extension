import 'fabric'
import { Edge } from './edge'
declare let fabric: any

export const enum NodeType {
    NOP = 'NOP',
    Test = 'Test',
    Start = 'Start',
    Stop = 'Stop',
    API = 'API',
    Function = 'Function',
    Flow= 'Flow',
    IF = 'IF',
    Switch = 'Switch',
    Loop = 'Loop',
}

export class Node extends fabric.Group {

    type = 'node'

    inputs: Edge[]
    outputs: Edge[]

    private _id: string

    private _input: fabric.Object | null
    private _output: fabric.Object | null

    constructor(objects?: fabric.Object[], options?: fabric.IGroupOptions) {
        super(objects, options || {})

        this.inputs = []
        this.outputs = []

        this._id = ''
        this._input = null
        this._output = null
    }

    get id(): string {
        return this._id
    }

    set id(value: string) {
        this._id = value
    }

    get input() {
        return this._input!
    }

    set input(value: fabric.Object) {
        this._input = value
    }

    get output() {
        return this._output!
    }

    set output(value: fabric.Object) {
        this._output = value
    }

}

function makeInput(left: number, top: number, fill?: string): fabric.Object {
    const input = new fabric.Path('M6,68 C2.6862915,68 4.05812251e-16,65.3137085 0,62 C-4.05812251e-16,58.6862915 2.6862915,56 6,56 L14,56 C16.209139,56 18,54.209139 18,52 L18,56 L18,68 L18,72 C18,69.8578046 16.3160315,68.1089211 14.1996403,68.0048953 L14,68 L6,68 Z', {
        left: 0,
        top: 0,
        hasControls: false,
        fill,
    })

    const text = new fabric.Text('in', {
        left: 5,
        top: 5,
        fontFamily: 'Courier',
        fontSize: 8,
        hasBorders: false,
        hasControls: false,
        fill: 'white',
    })

    const group = new fabric.Group([
        input,
        text,
    ], {left, top})

    return group
}

function makeOutput(left: number, top: number, fill?: string): fabric.Object {
    const output = new fabric.Path('M133,53 L133,49 C133,51.209139 134.790861,53 137,53 L137,53 L145,53 C148.313708,53 151,55.6862915 151,59 C151,62.3137085 148.313708,65 145,65 L145,65 L137,65 L136.80036,65.0048953 C134.683968,65.1089211 133,66.8578046 133,69 L133,69 L133,65 L133,53 Z', {
        left: 0,
        top: 0,
        hasControls: false,
        fill,
    })

    const text = new fabric.Text('out', {
        left: 2,
        top: 5,
        fontFamily: 'Courier',
        fontSize: 8,
        hasBorders: false,
        hasControls: false,
        fill: 'white',
    })

    const group = new fabric.Group([
        output,
        text,
    ], {
            left,
            top,
        })

    return group
}

function makeNode(id: string, options: {
    hasInputs?: boolean,
    hasOutputs?: boolean,
    stroke?: string,
    label: string,
    labelFill: string,
    backgroudLabel: string,
    inputsFill?: string,
    outputsFill?: string,
}): Node {
    // Node Rect
    const rect = new fabric.Rect({
        left: 0,
        top: 0,
        fill: '#FFFFFF',
        width: 100,
        height: 100,
        rx: 10,
        ry: 10,
        strokeWidth: 1,
        stroke: options.stroke,
        hasControls: false,
    })

    // Label
    const text = new fabric.Text(options.label, {
        left: 5,
        top: 1,
        fill: options.labelFill,
        fontFamily: 'Courier',
        fontSize: 16,
        hasBorders: false,
        hasControls: false,
    })

    // ID
    const idText = new fabric.Text(id.toString(), {
        left: 4,
        top: 15,
        fontFamily: 'Courier',
        fontSize: 26,
        hasBorders: false,
        hasControls: false,
        fill: options.labelFill,
    })

    const circle = new fabric.Circle({
        left: 5,
        top: 40,
        radius: 10,
        fill: '#EFEFF4',
    })

    const triangle = new fabric.Triangle({
        left: 22,
        top: 46,
        fill: '#607D8B',
        width: 8,
        height: 8,
        hasControls: false,
        angle: 90,
    })

    const text2 = new fabric.Text('开始', {
        left: 5,
        top: 65,
        fontFamily: 'PingFang SC',
        fontSize: 10,
        hasBorders: false,
        hasControls: false,
    })

    const text3 = new fabric.Text('Start', {
        left: 5,
        top: 78,
        fontFamily: 'PingFang SC',
        fontSize: 10,
        hasBorders: false,
        hasControls: false,
    })

    // BgLabel
    const text4 = new fabric.Text(options.backgroudLabel, {
        left: 60,
        top: 45,
        fontFamily: 'PingFang SC',
        fontSize: 28,
        hasBorders: false,
        hasControls: false,
        opacity: 0.15,
        fontStyle: 'italic',
    })

    const group = [
        rect, text, idText, circle, triangle, text2, text3, text4,
    ]
    let input: fabric.Object | null = null
    let output: fabric.Object | null = null

    if (options && options.hasInputs) {
        input = makeInput(-18, 45, options.inputsFill)
        group.push(input)
    }

    if (options && options.hasOutputs) {
        output = makeOutput(100, 45, options.outputsFill)
        group.push(output)
    }

    const node = new Node(group, {
        left: 0,
        top: 0,
        hasBorders: false,
        hasControls: false,
    })

    node.rect = rect
    node.label = text
    node.idText = idText
    node.backgroundLabel = text4

    if (input) {
        node.input = input
    }
    if (output) {
        node.output = output
    }

    node.indicator1 = circle
    node.indicator2 = triangle
    node.indicator3 = text2
    node.indicator4 = text3

    node.id = id
    return node
}

export function createStartNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasOutputs: true,
        stroke: '#607D8B',
        label: 'Start',
        labelFill: '#607D8B',
        backgroudLabel: 'SA',
        outputsFill: '#607D8B',
    })
    node.left = left
    node.top = top
    return node
}

export function createStopNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        stroke: '#607D8B',
        label: 'Stop',
        labelFill: '#607D8B',
        backgroudLabel: 'SP',
        inputsFill: '#607D8B',
    })
    node.left = left
    node.top = top
    return node
}

export function createFunctionNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#969CA2',
        hasOutputs: true,
        outputsFill: '#969CA2',

        stroke: '#FF3B30',
        label: 'Function',
        labelFill: '#FF3B30',
        backgroudLabel: 'FX',
    })

    node.left = left
    node.top = top
    return node
}

export function createAPINode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'API',
        labelFill: '#50B0C6',
        backgroudLabel: 'AP',
    })

    node.left = left
    node.top = top
    return node
}

export function createNopNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'Nop',
        labelFill: '#50B0C6',
        backgroudLabel: 'N',
    })

    node.left = left
    node.top = top
    return node
}

export function createFlowNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'Flow',
        labelFill: '#50B0C6',
        backgroudLabel: 'F',
    })

    node.left = left
    node.top = top
    return node
}

export function createLoopNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'Loop',
        labelFill: '#50B0C6',
        backgroudLabel: 'LO',
    })

    node.left = left
    node.top = top
    return node
}

export function createSwitchNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'Switch',
        labelFill: '#50B0C6',
        backgroudLabel: 'SW',
    })

    node.left = left
    node.top = top
    return node
}

export function createIFNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'IF',
        labelFill: '#50B0C6',
        backgroudLabel: 'IF',
    })

    node.left = left
    node.top = top
    return node
}

export function createTestNode(id: string, left: number, top: number) {
    const node = makeNode(id, {
        hasInputs: true,
        inputsFill: '#50B0C6',
        hasOutputs: true,
        outputsFill: '#50B0C6',

        stroke: '#50B0C6',
        label: 'Test',
        labelFill: '#50B0C6',
        backgroudLabel: 'TE',
    })

    node.left = left
    node.top = top
    return node
}