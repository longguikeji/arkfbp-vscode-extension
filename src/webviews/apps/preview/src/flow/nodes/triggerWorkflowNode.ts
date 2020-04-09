import { Node, NodeType } from './node'

export class TriggerWorkflowNode extends Node {

    workflow: string | null = ''

    payload: any | null = null

    protected _type: NodeType = NodeType.TriggerWorkflow
    protected _typeShortName: string = 'TRIGGER-WORKFLOW'
    protected _typeName: string = 'TRIGGER-WORKFLOW'
    protected _typeAnnotatedName: string = '工作流'

    protected _hasOutputs: boolean = true
    protected _hasInputs: boolean = true

}