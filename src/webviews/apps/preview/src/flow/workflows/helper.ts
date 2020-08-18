import * as t from '@babel/types'
import generate from 'babel-generator'
// import template from 'babel-template'
// import dedent from 'dedent'
import dedent = require('dedent')
import template = require('babel-template')

import {Workflow} from '.'
import {
  NodeTree,
  Node,
  NodeType,
  NodeID,
  makeNode,
} from './../../flow/nodes'
import {inspectFlowCode} from './../../flow/utils/inspect'

export function getCodeFromFlow(flow: Workflow) {
  const nodes = flow.tree!.nodes.map(node => {
    const edges = flow.edges
      .filter(([from]) => from === node.id)

    const getIFNodeNext = (tt: 'positive'|'negative') => {
      const edge = edges.find(([from, to, type]) => type === tt)
      return edge ? edge[1] : null
    }

    const getNext = () => {
      const l: string[] = edges.filter(([from, to, type]) => !type).map(([from, to]) => to)
      return l.length === 0 ? null
          : l.length === 1 ? l[0]
          : l
    }

    const objectExpression = t.valueToNode({
      id: node.id,
      x: node.position[0],
      y: node.position[1],
      ...(node.type === NodeType.IF ? {
        positiveNext: getIFNodeNext('positive'),
        negativeNext: getIFNodeNext('negative'),
      } : {
        next: getNext(),
      }),
    }) as t.ObjectExpression

    const clsProperty = t.objectProperty(t.identifier('cls'), t.identifier(node.cls))
    objectExpression.properties.unshift(clsProperty)

    return objectExpression
  })

  const mainExpressionStatement = template(dedent`
    export class Main extends Flow {

      createNodes() {
            return VALUE
        }

        createGraph() {
            const g = new Graph()

            g.nodes = this.createNodes();

            return g
        }
    }
  `, {sourceType: 'module'})({
    VALUE: t.arrayExpression(nodes),
  } as any) as any as t.ExpressionStatement

  const defaultImportDeclarationList = template(`
    import { Flow } from 'arkfbp/lib/flow'
    import { Graph } from 'arkfbp/lib/graph'
  `, {sourceType: 'module'})() as any as t.ImportDeclaration[]

  const nodeImportDeclarationList: t.ImportDeclaration[] = flow.tree!.nodes
    .map(node => {
      const identifier = t.identifier(node.cls)
      const specifier = t.importSpecifier(identifier, identifier)
      const source = t.stringLiteral(`./nodes/${node.fileName}`)
      return t.importDeclaration([specifier], source)
    })

  const program = t.program([
    ...defaultImportDeclarationList,
    ...nodeImportDeclarationList,
    mainExpressionStatement,
  ]) as any

  return generate(program).code
}

export function getFlowFromCodes(name: string, code: string, nodeCodes: Array<{name: string, code: string}>): Workflow {
  const flowData = inspectFlowCode(code)

  const nodeCodeMap = nodeCodes.reduce((memo, current) => {
    memo.set(current.name, current.code)
    return memo
  }, new Map())

  const aTree = new NodeTree('/')
  flowData.nodes.forEach(({fileName, cls, id, position}) => {
    const nodeCode = nodeCodeMap.get(`${fileName}.js`)!
    const node = Node.fromCode(id, nodeCode)
    node.fileName = fileName
    node.position = position
    node.cls = cls
    aTree.add(node, aTree)
  })

  return new Workflow(
    name,
    name,
    aTree,
    flowData.edges,
  )
}