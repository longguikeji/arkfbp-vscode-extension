import { Node, NodeType } from './node'

export class WaitEventNode extends Node {

    application: string | null = null

    event: string | null = null

    payload: any | null = null

    protected _type: NodeType = NodeType.WaitEvent
    protected _typeShortName: string = 'WAIT-EVENT'
    protected _typeName: string = 'WAIT-EVENT'
    protected _typeAnnotatedName: string = '等待事件'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}