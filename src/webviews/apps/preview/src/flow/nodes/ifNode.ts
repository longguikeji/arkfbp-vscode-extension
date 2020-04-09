import { Node, NodeType } from './node'

export class IFNode extends Node {

    ret: boolean = false

    protected _type: NodeType = NodeType.IF
    protected _typeShortName: string = 'IF'
    protected _typeName: string = 'IF'
    protected _typeAnnotatedName: string = 'IF'

    protected _hasInputs: boolean = true
    protected _hasOutputs: boolean = true

    protected _run = `{
        const ret = !!this.expression()
        this.ret = ret

        if (ret) {
            return this.positiveStatement()
        }

        return this.negativeStatement()
    }`

    protected _expression = `{
        return true
    }`
    protected _positiveStatement = `{}`
    protected _negativeStatement = `{}`

    get expression() {
        return this._expression
    }
    set expression(v) {
        this._expression = v
    }

    get positiveStatement() {
        return this._positiveStatement
    }
    set positiveStatement(v) {
        this._positiveStatement = v
    }

    get negativeStatement() {
        return this._negativeStatement
    }
    set negativeStatement(v) {
        this._negativeStatement = v
    }
}