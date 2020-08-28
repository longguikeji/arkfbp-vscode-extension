import { Node } from './node'
import { fabric } from 'fabric'

export const CURVE = 50


export class Edge extends fabric.Group {

  type = 'edge'

  private _from: Node | null = null
  private _to: Node | null = null

  private _line: fabric.Object
  private _arrow: fabric.Object

  constructor(objects?: fabric.Object[], options?: fabric.IGroupOptions) {
    super(objects, options || {})

    this._line = objects![0]
    this._arrow = objects![1]
  }

  get from(): Node | null {
    return this._from
  }

  set from(value: Node | null) {
    this._from = value
  }

  get to(): Node | null {
    return this._to
  }

  set to(value: Node | null) {
    this._to = value
  }

  get line(): fabric.Object {
    return this._line
  }

  set line(value: fabric.Object) {
    this._line = value
  }

  get arrow(): fabric.Object {
    return this._arrow
  }

  set arrow(value: fabric.Object) {
    this._arrow = value
  }
}

export function createEdgeXY(
  canvas: fabric.Canvas,
  sx: number, sy: number,
  tx: number, ty: number,
  iw: number, ih: number, edge?: Edge,
): Edge {
  // Organic / curved edge
  let c1X: number
  let c1Y: number
  let c2X: number
  let c2Y: number

  [c1X, c1Y, c2X, c2Y] = getControlPoints(sx, sy, tx, ty, iw)
  const path = createEdgePathArray(sx, sy, c1X, c1Y, c2X, c2Y, tx, ty)
  const line = new fabric.Path(path.join(' '), {
    fill: '',
    stroke: '#C5C8CE',
    strokeWidth: 3,
    objectCaching: false,
    hasBorders: false,
    hasControls: false,
  })

  const epsilon = 0.01
  let center = findPointOnCubicBezier(0.5, sx, sy, c1X, c1Y, c2X, c2Y, tx, ty)

  // estimate slope and intercept of tangent line
  const getShiftedPoint = (ee: number) => {
    return findPointOnCubicBezier(
      0.5 + ee, sx, sy, c1X, c1Y, c2X, c2Y, tx, ty,
    )
  }
  const plus = getShiftedPoint(epsilon)
  const minus = getShiftedPoint(-epsilon)
  const m = 1 * (plus[1] - minus[1]) / (plus[0] - minus[0])
  const b = center[1] - (m * center[0])

  let arrowLength = 12
  // Which direction should arrow point
  if (plus[0] > minus[0]) {
    arrowLength *= -1
  }

  center = findLinePoint(center[0], center[1], m, b, -1 * arrowLength / 2)

  const points = perpendicular(center[0], center[1], m, arrowLength * 0.9)
  // For m === 0, figure out if arrow should be straight up or down
  const flip = plus[1] > minus[1] ? -1 : 1
  const arrowTip = findLinePoint(center[0], center[1], m, b, arrowLength, flip)
  points.push(arrowTip)

  const pointsArray = points.map(
    (point) => point.join(','),
  ).join(' ')

  const newPoints: any = []
  points.map((point: any) => {
    const left = point[0]
    const top = point[1]
    newPoints.push({
      x: left,
      y: top,
    })
  })

  const arrow = new fabric.Polyline(newPoints, {
    fill: '#C5C8CE',
    hasControls: false,
  })

  const e = edge || new Edge([line, arrow], {
    hasBorders: false,
    hasControls: false,
    lockMovementX: true,
    lockMovementY: true,
  })

  if (edge) {
    e.addWithUpdate(line)
    e.addWithUpdate(arrow)
  }

  e.startCoord = [sx, sy]
  e.line = line
  e.arrow = arrow
  return e
}

export function createEdge(canvas: fabric.Canvas, from: Node, to: Node): Edge | null {
  const sourceX = from.left + from.width - 3
  const sourceY = from.top + from.height / 2 + 3
  const targetX = to.left + 1
  const targetY = to.top + to.height / 2 + 4

  const edge = createEdgeXY(canvas, sourceX, sourceY, targetX, targetY, from.width, from.height)
  edge.from = from
  edge.to = to

  from.outputs.push(edge)
  to.inputs.push(edge)

  canvas.add(edge as any)
  return edge
}

export function updateEdge(canvas: fabric.Canvas, edge: Edge, from: Node, to: Node): Edge | null {
  edge.remove(edge.line)
  edge.remove(edge.arrow)

  const sourceX = from.left + from.width - 3
  const sourceY = from.top + from.height / 2 + 3
  const targetX = to.left + 1
  const targetY = to.top + to.height / 2 + 4

  const e = createEdgeXY(canvas, sourceX, sourceY, targetX, targetY, from.width, from.height, edge)
  e.from = from
  e.to = to
  canvas.add(e as any)
  return e
}

export function updateEdgeXY(
  canvas: fabric.Canvas,
  edge: Edge,
  sx: number, sy: number,
  tx: number, ty: number,
  iw: number, ih: number,
): Edge | null {
  edge.remove(edge.line)
  edge.remove(edge.arrow)

  const e = createEdgeXY(canvas, sx, sy, tx, ty, iw, ih, edge)
  canvas.add(e as any)
  return e
}

export function createEdgePathArray(
  sourceX: number, sourceY: number,
  c1X: number, c1Y: number,
  c2X: number, c2Y: number,
  targetX: number, targetY: number): Array<string | number> {
  return [
    'M',
    sourceX, sourceY,
    'C',
    c1X, c1Y,
    c2X, c2Y,
    targetX, targetY,
  ]
}

// Point along cubic bezier curve
// See http://en.wikipedia.org/wiki/File:Bezier_3_big.gif
export function findPointOnCubicBezier(p: number,
                                       sx: number, sy: number,
                                       c1x: number, c1y: number,
                                       c2x: number, c2y: number,
                                       ex: number, ey: number) {
  // p is percentage from 0 to 1
  const op = 1 - p
  // 3 green points between 4 points that define curve
  const g1x = sx * p + c1x * op
  const g1y = sy * p + c1y * op
  const g2x = c1x * p + c2x * op
  const g2y = c1y * p + c2y * op
  const g3x = c2x * p + ex * op
  const g3y = c2y * p + ey * op
  // 2 blue points between green points
  const b1x = g1x * p + g2x * op
  const b1y = g1y * p + g2y * op
  const b2x = g2x * p + g3x * op
  const b2y = g2y * p + g3y * op
  // Point on the curve between blue points
  const x = b1x * p + b2x * op
  const y = b1y * p + b2y * op

  return [x, y]
}


// find point on line y = mx + b that is `offset` away from x,y
function findLinePoint(x: number, y: number, m: number, b: number, offset: number, flip?: number) {
  const x1 = x + offset / Math.sqrt(1 + m * m)
  let y1
  if (Math.abs(m) === Infinity) {
    y1 = y + (flip || 1) * offset
  } else {
    y1 = (m * x1) + b
  }
  return [x1, y1]
}

// find points of perpendicular line length l centered at x,y
function perpendicular(x: number, y: number, oldM: number, l: number) {
  const m = -1 / oldM
  const b = y - m * x
  const point1 = findLinePoint(x, y, m, b, l / 2)
  const point2 = findLinePoint(x, y, m, b, l / -2)
  return [point1, point2]
}

function getControlPoints(sourceX: number, sourceY: number, targetX: number, targetY: number, width: number): number[] {
  let c1X: number
  let c1Y: number
  let c2X: number
  let c2Y: number
  if (targetX - 5 < sourceX) {
    const curveFactor = (sourceX - targetX) * CURVE / 200
    if (Math.abs(targetY - sourceY) < width / 2) {
      // Loopback
      c1X = sourceX + curveFactor
      c1Y = sourceY - curveFactor
      c2X = targetX - curveFactor
      c2Y = targetY - curveFactor
    } else {
      // Stick out some
      c1X = sourceX + curveFactor
      c1Y = sourceY + (targetY > sourceY ? curveFactor : -curveFactor)
      c2X = targetX - curveFactor
      c2Y = targetY + (targetY > sourceY ? -curveFactor : curveFactor)
    }
  } else {
    // Controls halfway between
    c1X = sourceX + (targetX - sourceX) / 2
    c1Y = sourceY
    c2X = c1X
    c2Y = targetY
  }

  return [c1X, c1Y, c2X, c2Y]
}
