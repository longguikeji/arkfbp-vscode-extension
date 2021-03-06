import dedent = require('dedent')
import * as babel from '@babel/core'
import * as t from '@babel/types'
import template = require('babel-template')
import generate from 'babel-generator'
// import BabelClassPropertiesPlugin from '@babel/plugin-proposal-class-properties'
import lowerFirst = require('lodash/lowerFirst')
import {inspectNodeCode} from '../../flow/utils/inspect'

import {
  Node,
  NodeID,
  NodeType,
  makeNode,
  APINode,
} from '../../flow/nodes'

export function getCodeFromNode(node: Node, code?: string) {

  if (!code) return getInitialCode(node)

  const program = getProgram(code)
  const e = program.body.find(s => {
    return t.isExportNamedDeclaration(s)
      && t.isClassDeclaration(s.declaration)
  })! as t.ExportNamedDeclaration
  const d = e.declaration as t.ClassDeclaration

  const otherClassBodyNodes = d.body.body.filter((s: any) => !t.isClassProperty(s))
  const classProperties = getClassProperties(node)
  d.body.body = [
    ...classProperties,
    ...otherClassBodyNodes,
  ]

  return generate(program as any).code
}

function getInitialCode(node: Node): string {
  const {type, cls} = node

  const superCls = `${type}Node`
  const superClsFileName = (type === NodeType.API) ? 'apiNode'
    : (type === NodeType.IF) ? 'ifNode'
    : lowerFirst(superCls)

  return dedent`import { ${superCls} } from 'arkfbp/lib/${superClsFileName}'
    export class ${cls} extends ${superCls} {
      async run() {
      }
    }`
}

function getProgram(code: string): t.Program {
  const file = (babel as any).parse(code, {
    sourceType: 'module',
    // plugins: [BabelClassPropertiesPlugin],
  }) as t.File

  return file.program
}

function getClassProperties(node: Node): t.ClassProperty[] {
  const buildRequire = template(`
    PROPERTY = VALUE;
  `)

  switch (node.type) {
    // case NodeType.API:
    //   return ['application', 'api', 'payload']
    //     .filter((key => node[key])
    //     .reduce((memo: t.ClassProperty[], key) => {
    //       memo.push(buildRequire({
    //         PROPERTY: t.identifier(key),
    //         VALUE: t.valueToNode(node[key]),
    //       } as any) as any as t.ClassProperty)
    //       return memo
    //     }, [])
    default:
      return []
  }
}

export function getNodeFromCode(id: NodeID, code: string): Node {
  const {
    cls,
    type,
    properties,
  } = inspectNodeCode(code)

  const node = makeNode(id, type as NodeType)
  node.cls = cls
  Object.assign(node, properties)

  return node
}
