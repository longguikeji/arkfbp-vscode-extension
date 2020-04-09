export { Node, NodeID, NodeType } from './node'
export { StartNode } from './startNode'
export { StopNode } from './stopNode'
export { APINode } from './apiNode'
export { FunctionNode } from './functionNode'
export { WaitEventNode } from './waitEventNode'
export { NopNode } from './nopNode'
export { TriggerEventNode } from './triggerEventNode'
export { TriggerWorkflowNode } from './triggerWorkflowNode'
export { IFNode } from './ifNode'
export { DBNode } from './dbNode'
export { NodeTree } from './nodeTree'
export { Field } from './field'
export { Outputs } from './outputs'
export { Inputs } from './inputs'


import {
  Node,
  NodeID,
  NodeType,
  StartNode,
  StopNode,
  APINode,
  FunctionNode,
  WaitEventNode,
  IFNode,
  DBNode,
  NopNode,
  TriggerEventNode,
  TriggerWorkflowNode,
  NodeTree,
  Field,
  Outputs,
} from '.'

export function makeNode(id: NodeID, type: NodeType): Node {

  const getConstructor = (aType: NodeType): any => {
    switch(aType) {
      case NodeType.Start:
        return StartNode
      case NodeType.Stop:
        return StopNode
      case NodeType.NOP:
        return NopNode
      case NodeType.API:
        return APINode
      case NodeType.Function:
        return FunctionNode
      case NodeType.TriggerEvent:
        return TriggerEventNode
      case NodeType.TriggerWorkflow:
        return TriggerWorkflowNode
      case NodeType.WaitEvent:
        return WaitEventNode
      case NodeType.IF:
        return IFNode
      case NodeType.DB:
        return DBNode
      default:
        throw Error('not exists node type')
    }
  }

  const fn = getConstructor(type)
  return new fn(id)
}