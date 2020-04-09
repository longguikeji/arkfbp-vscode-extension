import { Node, NodeType } from './node'

export class StartNode extends Node {

    protected _type: NodeType = NodeType.Start
    protected _typeShortName: string = 'START'
    protected _typeName: string = 'START'
    protected _typeAnnotatedName: string = '开始'

    protected _hasOutputs: boolean = true

}