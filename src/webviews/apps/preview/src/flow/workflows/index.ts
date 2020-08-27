import { Node, NodeID }  from '../../flow/nodes/node'
import { StartNode }  from '../../flow/nodes/startNode'
import { NodeTree } from '../../flow/nodes/nodeTree'
import {getCodeFromFlow, getFlowFromCodes} from './helper'

type EdgeType = 'positive'|'negative'
export type Edge = [NodeID, NodeID]|[NodeID, NodeID, EdgeType]
export type Edges = Edge[]

export class Flow {

    static fromCodes(name: string, code: string, nodeCodes: Array<{name: string, code: string}>): Flow {
        return getFlowFromCodes(name, code, nodeCodes)
    }

    private _id: string
    private _name: string
    private _nodes: Map<NodeID, Node>
    private _edges: Edges
    private _root: Node | null
    private _tree: NodeTree

    constructor(id: string, name: string, tree: NodeTree, edges: Edges) {
        this._id = id

        this._name = name
        this._tree = tree
        this._nodes = new Map<NodeID, Node>()
        this._edges = edges
        this._root = null

        for (const node of this._tree.nodes) {
            this._nodes.set(node.id, node)
        }
    }

    toCode() {
        return getCodeFromFlow(this)
    }

    get id(): string {
        return this._id
    }

    get name(): string {
        return this._name
    }

    get root(): Node | null {
        return this._root
    }

    get edges(): Edges {
        return this._edges
    }

    set edges(v: Edges) {
        this._edges = v
    }

    get tree(): NodeTree {
        return this._tree
    }

    getNodeById(id: NodeID): Node | null {
        const node = this._nodes.get(id)
        if (node) {
            return node
        }

        return null
    }

    add(node: Node) {
        this._nodes.set(node.id, node)
        this._tree.add(node, this._tree)
    }

    delete(id: NodeID) {
        this._nodes.delete(id)
        this._tree.delete(id, this._tree)
        this._edges.filter(item => !item.includes(id))
    }
}
