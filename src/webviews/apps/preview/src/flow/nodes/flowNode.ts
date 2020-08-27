import { Node, NodeType } from './node'

export class FlowNode extends Node {

    flow: string | null = ''

    payload: any | null = null

    protected _type: NodeType = NodeType.Flow
    protected _typeShortName: string = 'FLOW'
    protected _typeName: string = 'FLOW'
    protected _typeAnnotatedName: string = '工作流'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}