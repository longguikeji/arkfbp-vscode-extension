import * as babel from '@babel/core'
import * as t from '@babel/types'
// import BabelClassPropertiesPlugin from '@babel/plugin-proposal-class-properties'
import { Edges } from '../workflows/index'
import { OperationType } from '../nodes/dbNode'

export function inspectFlowCode(code: string) {

  const file = babel.parse(code, {
    sourceType: 'module',
    // plugins: [BabelClassPropertiesPlugin],
  }) as t.File

  const fileNames = file.program.body.filter(s => {
    if (t.isImportDeclaration(s)) {
      if (s.source.value) {
        if (typeof s.source.value === 'string') {
          return s.source.value.startsWith('./nodes/')
        }
      }
    }
    return false
  }).reduce((memo, s) => {
    const ss = s as t.ImportDeclaration
    const imported = (ss.specifiers[0] as t.ImportDefaultSpecifier).local
    const cls = imported.name
    const fileName = (ss.source.value as string).split('/').pop()
    memo.set(cls, fileName)
    return memo
  }, new Map())

  const d = file.program.body.find((s): boolean => {
    if (t.isExportNamedDeclaration(s)) {
      if (s.declaration) {
        if (t.isClassDeclaration(s.declaration)){
          if (s.declaration.id) {
            return t.isIdentifier(s.declaration.id)
              && s.declaration.id.name === 'Main'
          }
        }
      }
    }
    return false
  })! as t.ExportNamedDeclaration

  const c = d.declaration as t.ClassDeclaration

  const createGraph = c.body.body.find((s: any) => {
    return t.isClassMethod(s) &&
      t.isIdentifier(s.key) &&
      s.key.name === 'createGraph'
  }) as t.ClassMethod

  const e = createGraph.body.body.find(s => {
    return t.isExpressionStatement(s)
      && t.isAssignmentExpression(s.expression)
      && t.isMemberExpression(s.expression.left)
      && t.isIdentifier(s.expression.left.object)
      && s.expression.left.object.name === 'g'
      && t.isIdentifier(s.expression.left.property)
      && s.expression.left.property.name === 'nodes'
  }) as t.ExpressionStatement|undefined

  const nodeArrayExpression = (e!.expression as t.AssignmentExpression).right as t.ArrayExpression

  const nodes = nodeArrayExpression.elements.map(s => {
    const properties = (s as t.ObjectExpression).properties as t.ObjectProperty[]

    const clsProperty = properties.find(p => p.key.name === 'cls' && t.isIdentifier(p.value)) as t.ObjectProperty
    const idProperty = properties.find(p => p.key.name === 'id' && t.isLiteral(p.value)) as t.ObjectProperty
    const xProperty = properties.find(p => p.key.name === 'x' && t.isLiteral(p.value)) as t.ObjectProperty
    const yProperty = properties.find(p => p.key.name === 'y' && t.isLiteral(p.value)) as t.ObjectProperty
    const positiveNextProperty = properties.find(p => p.key.name === 'positiveNext' && t.isLiteral(p.value)) as t.ObjectProperty
    const negativeNextProperty = properties.find(p => p.key.name === 'negativeNext' && t.isLiteral(p.value)) as t.ObjectProperty
    const nextProperty = properties.find(p => p.key.name === 'next' && (t.isArrayExpression(p.value) || t.isLiteral(p.value))) as t.ObjectProperty

    const cls = (clsProperty!.value as t.Identifier).name as string
    const id = (idProperty!.value as t.NumericLiteral).value as number
    const x = xProperty ? (xProperty!.value as t.NumericLiteral).value as number : 0
    const y = yProperty ? (yProperty!.value as t.NumericLiteral).value as number : 0
    const positiveNext = positiveNextProperty ? (positiveNextProperty!.value as t.NumericLiteral).value as number : null
    const negativeNext = negativeNextProperty ? (negativeNextProperty!.value as t.NumericLiteral).value as number : null
    const next = nextProperty
      ? nextProperty.value.type === 'ArrayExpression'
        ? ((nextProperty.value as t.ArrayExpression).elements as t.NumericLiteral[]).map(v => v.value as number)
        : t.isNumericLiteral(nextProperty.value)
          ? (nextProperty.value as t.NumericLiteral).value === null
            ? []
            : [(nextProperty.value as t.NumericLiteral).value as number]
          : []
      : []

    return {
      fileName: fileNames.get(cls),
      cls,
      id,
      position: [x, y] as [number, number],
      next,
      positiveNext,
      negativeNext,
    }
  })

  const edges = nodes.reduce((memo: Edges, node) => {
    if (node.next.length > 0) {
      const l = node.next.map(id => [node.id, id] as [number, number])
      memo.push(...l)
    }
    if (node.positiveNext) {
      memo.push([node.id, node.positiveNext, 'positive'])
    }
    if (node.negativeNext) {
      memo.push([node.id, node.negativeNext, 'negative'])
    }
    return memo
  }, [])

  return {
    nodes,
    edges,
  }
}

export function inspectNodeCode(code: string) {
  // TODO: 检查代码格式
  const file = babel.parse(code, {
    sourceType: 'module',
    //plugins: [BabelClassPropertiesPlugin],
  }) as t.File

  const d = file.program.body.find(s => {
    return t.isExportNamedDeclaration(s)
      && t.isClassDeclaration(s.declaration)
  })! as t.ExportNamedDeclaration

  const c = d.declaration as t.ClassDeclaration
  const cls = (c.id as t.Identifier).name
  const superCls = (c.superClass as t.Identifier).name
  const type = superCls.endsWith('Node') ? superCls.replace('Node', '') : 'DB'
  const operationType = superCls.endsWith('Data') ? superCls.replace('Data', '') as OperationType : null

  const classProperties = (d.declaration as t.ClassDeclaration).body.body
    .filter((s: any) => t.isClassProperty(s)) as t.ClassProperty[]

  const properties =  classProperties.reduce((memo: any, p) => {
    if (p.value) {
      if (t.isIdentifier(p.key)) {
        memo[p.key.name] = getValueFromExpression(p.value)
      }
      if (t.isStringLiteral(p.key)) {
        memo[p.key.value] = getValueFromExpression(p.value)
      }
    }
    return memo
  }, {})

  return {
    cls,
    type,
    properties,
    operationType,
  }
}

// TODO: 从Expression获取值，目前仅支持部分简单的类型
function getValueFromExpression(e: t.Expression|null): any {

  if (t.isArrayExpression(e)) {
    return e.elements.reduce((memo: any[], el) => {
      if (el === null) {
        memo.push(null)
      } else if (t.isExpression(el)) {
        memo.push(getValueFromExpression(el))
      } else {
        memo.push((el as any).argument.map((i: t.Expression) => getValueFromExpression(i)))
      }
      return memo
    }, [])
  }

  if (t.isObjectExpression(e)) {
    return e.properties.reduce((memo: any, p) => {
      if (t.isObjectProperty(p)) {
        if (t.isExpression(p.value)) {
          const key = p.key.name || p.key.value
          memo[key] = getValueFromExpression(p.value)
        }
      }
      return memo
    }, {})
  }

  if (t.isLiteral(e)) {
    if (t.isNullLiteral(e)) return null
    if (t.isRegExpLiteral(e)) return null
    if (t.isTemplateLiteral(e)) return null
    return e.value
  }

  return null
}
