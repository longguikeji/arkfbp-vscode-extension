import { NodeType } from './node'
import {FunctionNode} from './functionNode'

export const enum OperationType {
  Query = 'Query',
  QueryAll = 'QueryAll',
  Insert = 'Insert',
  Delete = 'Delete',
  Update = 'Update',
}

export class DBNode extends FunctionNode {

    /**
     * 数据库的操作类型
     */
    operationType: OperationType | null = null

    protected _type: NodeType = NodeType.DB
    protected _typeShortName: string = 'DB'
    protected _typeName: string = 'DB'
    protected _typeAnnotatedName: string = '数据库'

    protected _hasOutputs: boolean = true

}