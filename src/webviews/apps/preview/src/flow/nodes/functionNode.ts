import { Node, NodeType } from './node'

export class FunctionNode extends Node {

    /**
     * Function节点的代码内容
     */
    code: string | null = null

    protected _type: NodeType = NodeType.Function
    protected _typeShortName: string = 'FUNCTION'
    protected _typeName: string = 'FUNCTION'
    protected _typeAnnotatedName: string = '函数'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}