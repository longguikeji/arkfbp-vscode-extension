import { Schema } from 'jsonschema'

export enum FieldType {
    Object = 'object',
    String = 'string',
    Number = 'number',
    Integer = 'integer',
    Boolean = 'boolean',
    Array = 'array',
}

export class Field implements Schema {

    isRequired?: boolean = true
    type: string|string[] = FieldType.Object
    name: string = ''
    title: string = ''
    description?: string = ''
    properties?: {[name: string]: Field} = {}

    private _key: string | null = null

    constructor({isRequired, type, name, title, description}:
        {isRequired?: boolean, type?: FieldType, name?: string, title?: string, description?: string},
    ) {

        if (isRequired !== undefined) {
            this.isRequired = isRequired
        }
        if (type !== undefined) {
            this.type = type
        }
        if (name !== undefined) {
            this.name = name
        }
        if (title !== undefined) {
            this.title = title
        }
        if (description !== undefined) {
            this.description = description
        }
    }

    get key(): string {
        return this._key!
    }

    set key(v: string) {
        this._key = v
    }
}