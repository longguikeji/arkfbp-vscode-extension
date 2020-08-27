import { Node, NodeType } from './node'

export class TestNode extends Node {

    /**
     * Function节点的代码内容
     */
    code: string | null = null

    protected _type: NodeType = NodeType.Test
    protected _typeShortName: string = 'TEST'
    protected _typeName: string = 'TEST'
    protected _typeAnnotatedName: string = '测试'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}