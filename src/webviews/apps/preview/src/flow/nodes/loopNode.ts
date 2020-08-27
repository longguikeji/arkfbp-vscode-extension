import { Node, NodeType } from './node'

export class LoopNode extends Node {

    /**
     * Function节点的代码内容
     */
    code: string | null = null

    protected _type: NodeType = NodeType.Loop
    protected _typeShortName: string = 'LOOP'
    protected _typeName: string = 'LOOP'
    protected _typeAnnotatedName: string = '循环'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}