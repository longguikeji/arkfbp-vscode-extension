import { Inputs } from './inputs'
import { Outputs } from './outputs'
import { getCodeFromNode, getNodeFromCode } from './helper'

export type NodeID = number

export const enum NodeType {
    NOP = 'NOP',
    Start = 'Start',
    Stop = 'Stop',
    API = 'API',
    Function = 'Function',
    TriggerEvent = 'TriggerEvent',
    TriggerWorkflow = 'TriggerWorkflow',
    WaitEvent = 'WaitEvent',
    Clock = 'Clock',
    IF = 'IF',
    DB = 'DB',
}


export abstract class Node {
    static fromCode(id: NodeID, code: string): Node {
        return getNodeFromCode(id, code)
    }

    protected _type: NodeType = NodeType.NOP
    protected _typeShortName: string = ''
    protected _typeName: string = ''
    protected _typeAnnotatedName: string = ''

    protected _id: NodeID
    protected _annotation: string = ''

    protected _inputs: Inputs | null = null
    protected _outputs: Outputs | null = null
    protected _customizedOutputs: Outputs | null = null

    protected _hasInputs: boolean = false
    protected _hasOutputs: boolean = false

    protected _x: number = 0
    protected _y: number = 0

    protected _fileName: string = ''
    protected _cls: string = ''
    protected _run: string = ''

    constructor(id: NodeID, fileName: string) {
        this._id = id
        this._fileName = fileName

        if (this._hasInputs) {
            this._inputs = new Inputs()
        }

        if (this._hasOutputs) {
            this._outputs = new Outputs()
        }
    }

    get id(): NodeID {
        return this._id
    }

    get sid(): string {
        return this.typeShortName
         + '-' + this._id
    }

    get type(): NodeType {
        return this._type
    }

    get typeShortName(): string {
        return this._typeShortName
    }

    get typeName(): string {
        return this._typeName
    }

    get typeAnnotatedName(): string {
        return this._typeAnnotatedName
    }

    get annotation(): string {
        return this._annotation
    }

    set annotation(v: string) {
        this._annotation = v
    }

    hasInputs(): boolean {
        return this._hasInputs
    }

    hasOutputs(): boolean {
        return this._hasOutputs
    }

    get inputs(): Inputs | null {
        return this._inputs
    }

    set inputs(v: Inputs | null) {
        this._inputs = v
    }

    /**
     * 获取当前节点的Outputs Schema，如果设置了自定义Outputs，则返回自定义Outputs
     * @return {Outputs | null}
     */
    get outputs(): Outputs | null {
        return this._customizedOutputs ? this._customizedOutputs : this._outputs
    }

    set outputs(v: Outputs | null) {
        this._outputs = v
    }

    get customizedOutputs(): Outputs | null {
        return this._customizedOutputs
    }

    set customizedOutputs(v: Outputs | null) {
        this._customizedOutputs = v
    }

    get position(): [number, number] {
        return [this._x, this._y]
    }

    set position([x, y]: [number, number]) {
        this._x = x
        this._y = y
    }

    get fileName(): string {
        return this._fileName
    }

    set fileName(v: string) {
        this._fileName = v
    }

    get cls(): string {
        return this._cls
    }

    set cls(v: string) {
        this._cls = v
    }

    get run(): string {
        return this._run
    }

    set run(v: string) {
        this._run = v
    }

    toCode(code?: string) {
        return getCodeFromNode(this, code)
    }
}
