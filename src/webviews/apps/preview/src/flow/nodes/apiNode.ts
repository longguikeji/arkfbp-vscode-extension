import { Node, NodeType } from './node'
import { Inputs } from './inputs'
import { Outputs } from './outputs'


export class APINode extends Node {

    /**
     * 应用的InstanceID
     */
    application: string | null = null

    /**
     * API的唯一标识, 不含application部分, 不含server url部分
     *
     * @Example: /pets/{petId}.get
     */
    api: string | null = null

    payload: any | null = null

    protected _type: NodeType = NodeType.API
    protected _typeShortName = 'API'
    protected _typeName = 'API'
    protected _typeAnnotatedName = '调用接口'

    protected _hasInputs = true
    protected _hasOutputs = true

}