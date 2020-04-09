import { Node, NodeID } from '../../flow/nodes/node'

export class NodeTree{

    name: string
    children: Array<Node|NodeTree> | null

    constructor(name: string) {
        this.name = name
        this.children = null
    }

    get nodes(): Node[] {
        return this._list(null)
    }

    add(item: Node|NodeTree, parent: NodeTree) {
        if (!parent.children) {
            parent.children = new Array<Node|NodeTree>()
        }

        parent.children.push(item)
    }

    // copy(item: Node): Node {
    // }

    delete(id: NodeID, parent: NodeTree): void {
        parent.children = parent.children!.filter(n => {
            return !(n instanceof Node && n.id === id)
        })
    }

    private _list(parent: NodeTree | null): Node[] {
        let v: Node[] = []
        if (!parent) {
            parent = this
        }

        if (parent.children) {
            for (const e of parent.children) {
                if (e instanceof Node) {
                    v.push(e)
                } else if (e instanceof NodeTree) {
                    v = [...v, ...this._list(e)]
                }
            }
        }

        return v
    }

}