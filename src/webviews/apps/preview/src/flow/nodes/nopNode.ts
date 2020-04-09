import { Node, NodeType } from './node'

/**
 * NOP节点
 *
 * NOP节点不做任何事情，专门用来打断当前链式的输入输出结构
 */
export class NopNode extends Node {

    protected _type: NodeType = NodeType.NOP
    protected _typeShortName: string = 'NOP'
    protected _typeName: string = 'NOP'
    protected _typeAnnotatedName: string = '空节点'

    protected _hasOutputs: boolean = false
    protected _hasInputs: boolean = false

}