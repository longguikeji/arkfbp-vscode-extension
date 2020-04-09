export enum FieldType {
    Object = 'object',
    String = 'string',
    Number = 'number',
    Integer = 'integer',
    Boolean = 'boolean',
    Array = 'array',
}

export class Field {

    required: boolean = true
    dataType: FieldType = FieldType.Object
    name: string = ''
    alias: string = ''
    comment: string = ''
    children?: any = {}

    private _key: string | null = null

    constructor({required, dataType, name, alias, comment}:
        {required?: boolean, dataType?: FieldType, name?: string, alias?: string, comment?: string},
    ) {

        if (required !== undefined) {
            this.required = required
        }
        if (dataType !== undefined) {
            this.dataType = dataType
        }
        if (name !== undefined) {
            this.name = name
        }
        if (alias !== undefined) {
            this.alias = alias
        }
        if (comment !== undefined) {
            this.comment = comment
        }
    }

    get key(): string {
        return this._key!
    }

    set key(v: string) {
        this._key = v
    }
}