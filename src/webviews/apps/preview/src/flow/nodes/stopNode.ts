import { Node, NodeType } from './node'
import { Inputs } from './inputs'

export class StopNode extends Node {

    protected _type: NodeType = NodeType.Stop
    protected _typeShortName: string = 'STOP'
    protected _typeName: string = 'STOP'
    protected _typeAnnotatedName: string = '结束'

}