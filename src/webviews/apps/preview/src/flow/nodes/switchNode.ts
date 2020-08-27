import { Node, NodeType } from './node'

export class SwitchNode extends Node {

    /**
     * Switch节点的代码内容
     */
    code: string | null = null

    protected _type: NodeType = NodeType.Switch
    protected _typeShortName: string = 'SWITCH'
    protected _typeName: string = 'SWITCH'
    protected _typeAnnotatedName: string = 'Switch'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}