import { Node, NodeType } from './node'

export class TriggerEventNode extends Node {

    application: string | null = null

    event: string | null = null

    payload: any | null = null

    protected _type: NodeType = NodeType.TriggerEvent
    protected _typeShortName: string = 'TRIGGER-EVENT'
    protected _typeName: string = 'TRIGGER-EVENT'
    protected _typeAnnotatedName: string = '产生事件'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}