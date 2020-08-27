export { Node, NodeID, NodeType } from './node'
export { StartNode } from './startNode'
export { StopNode } from './stopNode'
export { APINode } from './apiNode'
export { FunctionNode } from './functionNode'
export { TestNode } from './testNode'
export { NopNode } from './nopNode'
export { LoopNode } from './loopNode'
export { FlowNode } from './flowNode'
export { IFNode } from './ifNode'
export { SwitchNode } from './switchNode'
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
  TestNode,
  IFNode,
  SwitchNode,
  NopNode,
  LoopNode,
  FlowNode,
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
      case NodeType.Loop:
        return LoopNode
      case NodeType.Flow:
        return FlowNode
      case NodeType.Test:
        return TestNode
      case NodeType.IF:
        return IFNode
      case NodeType.Switch:
        return SwitchNode
      default:
        throw Error('not exists node type')
    }
  }

  const fn = getConstructor(type)
  return new fn(id)
}