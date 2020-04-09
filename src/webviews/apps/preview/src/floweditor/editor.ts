declare var fabric: any

import {
    Node,
    NodeType,
    createAPINode,
    createStartNode,
    createStopNode,
    createFunctionNode,
    createTriggerEventNode,
    createTriggerWorkflowNode,
    createWaitEventNode,
    createClockNode,
    createIFNode,
} from './node'
import {
    CURVE,
    createEdgePathArray,
    findPointOnCubicBezier,
    createEdge,
    createEdgeXY,
    Edge,
    updateEdge,
    updateEdgeXY,
} from './edge'


export class Editor {

    private _id = 0
    private _canvas: fabric.Canvas

    private isDragging = false
    private selection = false
    private lastPosX = 0
    private lastPosY = 0
    private newEdge: Edge | null = null

    private onNodeSelected: Function
    private onEdgeSelected: Function
    private onNodeMoving: Function
    private onConnect: Function

    constructor(canvasID: string, options: any) {
        this._canvas = new fabric.Canvas(canvasID, {
            selection: true,
        })

        this.registerCanvasEvents()
        fabric.Object.prototype.originX = 'left'
        fabric.Object.prototype.originY = 'top'
        this._id = 0

        this.onNodeSelected = options.onNodeSelected || (() => { })
        this.onEdgeSelected = options.onEdgeSelected || (() => { })
        this.onNodeMoving = options.onNodeMoving || (() => { })
        this.onConnect = options.onConnect || (() => { })
    }

    clear() {
        this._canvas.clear()
    }

    connect(fromNode: Node, toNode: Node): Edge | null {
        return createEdge(this._canvas, fromNode, toNode)
    }

    group() {
        if (!this._canvas.getActiveObjects()) {
            return
        }

        const newGroup = (this._canvas.getActiveObject() as fabric.ActiveSelection).toGroup() as fabric.Group

        const bg = new fabric.Rect({
            left: 0 - newGroup.get('width')! / 2 - 10,
            top: 0 - newGroup.get('height')! / 2 - 10,
            fill: '#E6E6E6',
            width: newGroup.get('width')! + 20,
            height: newGroup.get('height')! + 20,
            rx: 10,
            ry: 10,
            strokeWidth: 1,
            stroke: '#333333',
            hasControls: false,
        })

        newGroup.insertAt(bg, 0, true)
        newGroup.type = 'nodegroup'
        this._canvas.requestRenderAll()
    }

    ungroup() {
        if (!this._canvas.getActiveObject()) {
            return
        }

        const group = this._canvas.getActiveObject() as fabric.Group
        group.removeWithUpdate(group.item(0))
        group.toActiveSelection()
        this._canvas.requestRenderAll()
    }

    deleteSelected() {
        const objects = this._canvas.getActiveObjects()
        for (const object of objects) {
            if (object instanceof Edge) {
                this._canvas.remove(object)
                continue
            }

            if (object instanceof Node) {
                if (object.inputs) {
                    for (const line of object.inputs) {
                        this._canvas.remove(line as any)
                    }
                }

                if (object.outputs) {
                    for (const line of object.outputs) {
                        this._canvas.remove(line as any)
                    }
                }

                this._canvas.remove(object)
            }
        }
    }

    add(node: Node) {
        let left = node.left
        let top = node.top
        this._canvas.getObjects().map((o: fabric.Object) => {
            if (o.type !== 'node') {
                return
            }

            const left2 = o.left
            const top2 = o.top

            if (left === left2 && top === top2) {
                left += 10
                top += 10
            }
        })

        node.left = left
        node.top = top

        this.addToCanvas(node as any)
    }

    createNode(options: { id?: number, type: NodeType, left: number, top: number }): Node | null {
        const { type, left, top } = options
        const id = options.id || this.getNextId()

        let node: Node | null = null
        switch (type) {
            case NodeType.Start:
                node = createStartNode(id, left, top)
                break
            case NodeType.Stop:
                node = createStopNode(id, left, top)
                break
            case NodeType.Function:
                node = createFunctionNode(id, left, top)
                break
            case NodeType.API:
                node = createAPINode(id, left, top)
                break
            case NodeType.TriggerEvent:
                node = createTriggerEventNode(id, left, top)
                break
            case NodeType.TriggerWorkflow:
                node = createTriggerWorkflowNode(id, left, top)
                break
            case NodeType.WaitEvent:
                node = createWaitEventNode(id, left, top)
                break
            case NodeType.Clock:
                node = createClockNode(id, left, top)
                break
            case NodeType.IF:
                node = createIFNode(id, left, top)
                break
            default:
        }

        if (node) {
            this.addToCanvas(node as any)
        }
        return node
    }

    getThumbnailDataURL(multiplier?: number): string {
        const dataURL = this._canvas.toDataURL({
            format: 'png',
            quality: 1.0,
            multiplier: multiplier || 0.42,
        })

        return dataURL
    }

    private getNextId(): number {
        this._id += 1
        return this._id
    }

    private addToCanvas(o: fabric.Object) {
        this._canvas.add(o)
    }

    private getMouseCoords(event: any) {
        const pointer = this._canvas.getPointer(event.e)
        const posX = pointer.x
        const posY = pointer.y
        return [posX, posY]
    }

    private getNode(coord: any): any {
        let node
        const x = coord[0]
        const y = coord[1]
        this._canvas.getObjects().map((o: any) => {
            if (o.type !== 'node') {
                return
            }

            const ox = o.left
            const oy = o.top

            if (ox < x && x <= ox + o.width && y >= oy && y <= oy + o.height) {
                node = o
            }
        })

        return node
    }

    private getNodeInputs(node: any, coord: any) {
        if (!node.input) {
            return
        }

        const x = coord[0]
        const y = coord[1]

        if (x >= node.left &&
            x <= node.left + node.input.width &&
            y >= node.top + node.height / 2 - node.input.height / 2 &&
            y <= node.top + node.height / 2 + node.input.height / 2) {
            return node.input
        }
    }

    private getNodeOutputs(node: any, coord: any) {
        if (!node.output) {
            return
        }

        const x = coord[0]
        const y = coord[1]

        if (x >= node.left + node.width - node.output.width &&
            x <= node.left + node.width &&
            y >= node.top + node.height / 2 - node.output.height / 2 &&
            y <= node.top + node.height / 2 + node.output.height / 2) {
            return node.output
        }
    }

    private highlightInputs(exclude?: any) {
        this._canvas.getObjects().map((o: any) => {
            if (o.type !== 'node') {
                return
            }

            if (exclude && exclude.id !== o.id) {
                return
            }

            if (o.input && o.input.scaleX === 1.0) {
                o.input.set({
                    scaleY: 1.1,
                    scaleX: 1.1,
                    left: o.input.left - 2,
                })
            }
        })
    }

    private resetInputs(exclude?: any) {
        this._canvas.getObjects().map((o: any) => {
            if (o.type !== 'node') {
                return
            }

            if (exclude && exclude.id !== o.id) {
                return
            }

            if (o.input && o.input.scaleX > 1.0) {
                o.input.set({
                    scaleY: 1.0,
                    scaleX: 1.0,
                    left: o.input.left + 2,
                })
            }
        })
    }

    private highlightOutputs(exclude?: any) {
        this._canvas.getObjects().map((o: any) => {
            if (o.type !== 'node') {
                return
            }

            if (exclude && exclude.id !== o.id) {
                return
            }

            if (o.output && o.output.scaleX === 1.0) {
                o.output.set({
                    scaleY: 1.1,
                    scaleX: 1.1,
                    top: o.output.top - 1,
                })
            }
        })
    }

    private resetOutputs(exclude?: any) {
        this._canvas.getObjects().map((o: any) => {
            if (o.type !== 'node') {
                return
            }

            if (exclude && exclude.id !== o.id) {
                return
            }

            if (o.output && o.output.scaleX > 1.0) {
                o.output.set({
                    scaleY: 1.0,
                    scaleX: 1.0,
                    top: o.output.top + 1,
                })
            }
        })
    }

    private registerCanvasEvents() {
        this._canvas.on({
            'object:moving': this.onObjectMoving,
            'mouse:down': this.onMousedown,
            'mouse:up': this.onMouseup,
            'mouse:move': this.onMousemove,
            'mouse:wheel': this.onMousewheel,
            'mouse:over': this.onMouseover,
            'mouse:out': this.onMouseout,
            'selection:created': this.onSelectionCreated,
            'selection:updated': this.onSelectionUpdated,
            'selection:cleared': this.onSelectionCleared,
        })
    }

    private onObjectMoving = (e: any) => {
        const p = e.target

        if (p.type !== 'node' && p.type !== 'nodegroup') {
            return
        }

        if (p instanceof Node) {
            if (p.inputs) {
                for (const edge of p.inputs) {
                    if (!edge) {
                        continue
                    }

                    if (edge.from && edge.to) {
                        updateEdge(this._canvas, edge, edge.from, edge.to)
                    }
                }
            }

            if (p.outputs) {
                for (const edge of p.outputs) {
                    if (!edge) {
                        continue
                    }

                    if (edge.from && edge.to) {
                        updateEdge(this._canvas, edge, edge.from, edge.to)
                    }
                }
            }

            this.onNodeMoving(p.id, p.left, p.top)

            return
        }

        if (p.type === 'nodegroup') {
            // @Fix bug here
            p.forEachObject((o: any) => {
                if (o.type !== 'node') {
                    return
                }

                if (o.id !== 3) {
                    return
                }

                if (o.inputLines) {
                    for (const edge of o.inputLines) {
                        if (!edge) {
                            continue
                        }

                        const sx = edge.startCoord[0]
                        const sy = edge.startCoord[1]
                        const tx = p.left + p.width / 2 + o.left
                        const ty = p.top

                        console.info('++++++', p.left, o.left, p.width / 2)
                        console.info('++++|||', p.top, o.top, p.height / 2)

                        // this.updateEdgeXY(edge, sx, sy, tx, ty)
                    }
                }

                // if (o.outputLines) {
                //     for (const edge of p.outputLines) {
                //         if (!edge) {
                //             continue
                //         }

                //         this.updateEdge(edge, edge.from, edge.to)
                //     }
                // }
            })
        }
    }

    private onMousedown = (opt: any) => {
        const evt = opt.e

        if (evt.altKey === true) {
            this.isDragging = true
            this.selection = false
            this.lastPosX = evt.clientX
            this.lastPosY = evt.clientY
            return
        }

        const coord = this.getMouseCoords(opt.e)

        const sx = coord[0]
        const sy = coord[1]

        const tx = coord[0]
        const ty = coord[1]

        if (this.newEdge) {
            this.resetInputs()
            const node = this.getNode(coord)
            if (!node) {
                this._canvas.remove(this.newEdge as any)
                this.newEdge = null
                return
            }

            if (!this.getNodeInputs(node, coord)) {
                this._canvas.remove(this.newEdge as any)
                this.newEdge = null
                return
            }

            if (this.newEdge && this.newEdge.from) {
                this.newEdge.from.outputs.push(this.newEdge)
            }
            node.inputs.push(this.newEdge)
            this.newEdge.to = node

            this.onConnect(this.newEdge.from!.id, this.newEdge.to!.id)
            // this.onConnect(this.newEdge)

            this.newEdge = null
        } else {
            // check whether we're clicking the input or output port
            const node = this.getNode(coord)
            if (node) {
                const output = this.getNodeOutputs(node, coord)
                if (output) {
                    this.newEdge = createEdgeXY(this._canvas, sx, sy, tx, ty, 50, 50)
                    this.newEdge.from = node
                    this._canvas.add(this.newEdge as any)
                    this.highlightInputs()
                }
            }
        }
    }

    private onMouseup = (e: any) => {
        this.isDragging = false
        this.selection = true
    }

    private onMousemove = (opt: any) => {
        if (this.isDragging) {
            const e = opt.e
            if (!e) {
                return
            }
            this._canvas.viewportTransform![4] += e.clientX - this.lastPosX
            this._canvas.viewportTransform![5] += e.clientY - this.lastPosY
            this._canvas.requestRenderAll()
            this.lastPosX = e.clientX
            this.lastPosY = e.clientY
            return
        }

        if (this.newEdge) {
            const coord = this.getMouseCoords(opt.e)
            const tx = coord[0]
            const ty = coord[1]

            updateEdgeXY(
                this._canvas,
                this.newEdge,
                this.newEdge.startCoord[0], this.newEdge.startCoord[1],
                tx, ty,
                50, 50)
        }
    }

    private onMousewheel = (opt: any) => {
        const delta = opt.e.deltaY
        let zoom = this._canvas.getZoom()
        zoom = zoom + delta / 200
        if (zoom > 2) {
            zoom = 2
        }
        if (zoom < 0.3) {
            zoom = 0.3
        }

        this._canvas.setZoom(zoom)
        opt.e.preventDefault()
        opt.e.stopPropagation()
    }

    private onMouseover = (e: any) => {
        const target = e.target
        if (!target || !target.type) {
            return
        }

        if (target instanceof Node) {
            target.rect.set({
                strokeWidth: 2,
            })

            if (target.inputs) {
                for (const edge of target.inputs) {
                    edge.line.set({
                        stroke: '#2D8CF0',
                    })
                    edge.arrow.set({
                        stroke: '#2D8CF0',
                        fill: '#2D8CF0',
                    })
                }
            }

            if (target.outputs) {
                for (const edge of target.outputs) {
                    edge.line.set({
                        stroke: '#2D8CF0',
                    })
                    edge.arrow.set({
                        stroke: '#2D8CF0',
                        fill: '#2D8CF0',
                    })
                }
            }
        } else if (target instanceof Edge) {
            target.line.set({
                stroke: '#2D8CF0',
            })
            target.arrow.set({
                stroke: '#2D8CF0',
                fill: '#2D8CF0',
            })
        }

        this._canvas.renderAll()
    }

    private onMouseout = (e: fabric.IEvent) => {
        const target = e.target
        if (!target) {
            return
        }

        if (!target.type) {
            return
        }

        if (target instanceof Node) {
            target.rect.set({
                strokeWidth: 1,
            })

            if (target.inputs) {
                for (const edge of target.inputs) {
                    edge.line.set({
                        stroke: '#C5C8CE',
                    })
                    edge.arrow.set({
                        stroke: '#C5C8CE',
                        fill: '#C5C8CE',
                    })
                }
            }

            if (target.outputs) {
                for (const edge of target.outputs) {
                    edge.line.set({
                        stroke: '#C5C8CE',
                    })
                    edge.arrow.set({
                        stroke: '#C5C8CE',
                        fill: '#C5C8CE',
                    })
                }
            }
        } else if (target instanceof Edge) {
            target.line.set({
                stroke: '#C5C8CE',
            })
            target.arrow.set({
                stroke: '#C5C8CE',
                fill: '#C5C8CE',
            })
        }

        this._canvas.renderAll()
    }

    private onSelectionCreated = (opt: any) => {
        const target = opt.target
        if (!target) {
            return
        }

        if (target.type !== 'node' && target.type !== 'edge') {
            return
        }

        // tslint:disable-next-line: prefer-switch
        if (target.type === 'node') {
            target.rect.set({
                strokeWidth: 2,
            })
            this.onNodeSelected(target.id)
        } else if (target.type === 'edge') {
            target.line.set({
                stroke: '#2D8CF0',
            })
            target.arrow.set({
                stroke: '#2D8CF0',
                fill: '#2D8CF0',
            })
            this.onEdgeSelected(target.from, target.to)
        }
    }

    private onSelectionUpdated = (opt: any) => {
        const target = opt.target
        if (!target) {
            return
        }

        if (target.type !== 'node' && target.type !== 'edge') {
            return
        }

        // tslint:disable-next-line: prefer-switch
        if (target.type === 'node') {
            this.onNodeSelected(target.id)
        }

        if (target.type === 'edge') {
            this.onEdgeSelected(target.from, target.to)
        }
    }

    private onSelectionCleared = (opt: any) => {
        if (!opt.deselected) {
            return
        }
        for (const target of opt.deselected) {
            if (target.type !== 'node' && target.type !== 'edge') {
                continue
            }

            // tslint:disable-next-line: prefer-switch
            if (target.type === 'node') {
                target.rect.set({
                    strokeWidth: 1,
                })
            } else if (target.type === 'edge') {
                target.line.set({
                    stroke: '#C5C8CE',
                })
                target.arrow.set({
                    stroke: '#C5C8CE',
                    fill: '#C5C8CE',
                })
            }
        }

        this._canvas.renderAll()
    }
}
