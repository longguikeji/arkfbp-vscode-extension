import uuid = require('uuid/v4')
import _get = require('lodash/get')
import { Schema } from 'jsonschema'
import { Field, FieldType } from './schemaField'

export class PayloadSchema {

    private _fields: Array<Field & Schema>
    private _top: Field & Schema
    private _refKeyMapping: Map<string, string>

    constructor(s: Schema, name: string) {
        this._fields = []
        this._refKeyMapping = new Map<string, string>()

        const walk = (schema: Schema, refKey: string, aName: string, isRequired: boolean) => {
            const f = schema as Field & Schema
            f.name = aName
            f.isRequired = isRequired
            f.key = this._generateKey()
            this._refKeyMapping.set(f.key, refKey)
            if (f.properties) {
                Array.from(Object.entries(f.properties)).forEach(([k, v]) => {
                    //walk(v, `${refKey}.${k}`, k, f.required ? f.required.includes(k) : false)
                })
            }
        }
        walk(s, name, name, false)

        this._top = s as Field
    }

    /**
     * get the reference key to access the element
     *
     * @param key unique id of the field
     */
    getRefKey(key: string): string {
        const refKey = this._refKeyMapping.get(key)
        if (!refKey) {
            throw new Error(key + ' not found')
        }

        return refKey
    }

    /**
     * add elements to the object
     *
     * @param parent the reference key of the parent element
     * @param fields elements to add
     */
    add(parentRefKey: string, ...fields: Field[]) {
        this._fields.push(...fields)

        const parent = this._getField(parentRefKey)

        if (!parent.properties) {
            parent.properties = {}
        }

        for (const field of fields) {
            parent.properties[field.name] = field
            const refKey = (parentRefKey === '.' ? '' : parentRefKey) + '.' + field.name

            if (!field.key) {
                field.key = this._generateKey()
            }

            this._refKeyMapping.set(field.key, refKey)
        }
    }

    remove(f: Field) {
        if (!this._refKeyMapping.has(f.key)) {
            return
        }

        if (f.type === 'object' && f.properties) {
            // recursively delete all the children
            for (const key in f.properties) {
                if (!Object.prototype.hasOwnProperty.call(f.properties, key)) {
                    continue
                }
                this.remove(f.properties[key])
            }
        }

        const refKey = this.getRefKey(f.key)

        // delete from the tree
        const parent = this._getParent(refKey)
        this._removeFromParent(parent, f)

        // delete the element from __fields
        let idx = -1
        for (let i = 0; i < this._fields.length; ++i) {
            const field = this._fields[i]
            if (field.key === f.key) {
                idx = i
                break
            }
        }

        if (idx >= 0) {
            this._fields.splice(idx, 1)
        }

        this._refKeyMapping.delete(f.key)
    }

    toFlatten(): { key: string, title: string, children: Array<{}> } {
        return this._convert(this._top)
    }

    toPayloadFlatten(payload: any, refs: any): {
        key: string, title: string, children: Array<{}>,
    } {
        return this._payloadConvert({...this._top, parentPath: ''}, payload, refs)
    }

    toSchema(): Schema {
        this._toSchema(this._top)
        return this._top
    }

    _toSchema(field: Field & Schema) {
        // update required
        field.required = field.properties
            ? Array.from(Object.entries(field.properties! as object))
                .filter(([k, v]) => v.isRequired)
                .map(([k, v]) => v.name)
            : []

        if (field.properties) {
            Object.keys(field.properties).forEach(key => {
                this._toSchema(field.properties![key])
            })
        }
    }

    private _getParent(refKey: string) {
        let secs = refKey.split('.')
        secs = secs.slice(1, -1).filter((v) => {
            if (v.length) {
                return true
            }
            return false
        }) // skip the first dot

        return this._getField(secs.join('.'))
    }

    private _getField(refKey: string) {
        let secs = refKey.split('.')
        secs = secs.slice(1).filter((v) => {
            if (v.length) {
                return true
            }
            return false
        }) // skip the first dot

        let value = this._top

        for (const k of secs) {
            value = value.properties![k]
        }

        return value
    }

    private _removeFromParent(parent: any, f: Field) {
        if (!parent.properties) {
            return
        }

        delete(parent.properties[f.name])
    }

    private _convert(f: Field): {
        key: string, title: string, scopedSlots: { title: string }, children: Array<{}>,
        name:string,
        field: Field,
    } {
        return {
            key: f.key!,
            title: f.title || '',
            name: f.name || '',
            children: f.properties
                ? Array.from(Object.entries(f.properties)).map(([k, v]) => {
                    return this._convert({...v, name: k} as Field)
                }) : [],
            scopedSlots: {
                title: 'custom',
            },
            field: f,
        }
    }

    private _payloadConvert(f: any, payload: any = {}, refs: any = {}): {
        key: string, title: string, scopedSlots: { title: string }, children: Array<{}>,
        name:string,
        field: Field,
        path: string,
        isFieldExists: boolean,
    } {
        const pathStr = f.parentPath ? f.parentPath + '.' + f.name : f.name
        const refKey = f.items && f.items.$ref && f.items.$ref.split('/').pop()
        const payloadValue = typeof payload === 'object' ? payload[f.name] : null
        // TODO api schema refs数据格式需后续统一
        return {
            key: f.key!,
            title: f.title || '',
            name: f.name || '',
            children: f.properties
                ? Array.from(Object.entries(f.properties)).map(([k, v]) => {
                    return this._payloadConvert({...v as any, name: k, parentPath: pathStr} as Field, payload)
                })
                : refKey ?
                    Array.from(Object.entries(refs[refKey].properties)).map(([k, v]) => {
                        return this._payloadConvert({...v as any, name: k, parentPath: pathStr} as Field, payload)
                    })
                : Array.isArray(payloadValue) ?
                    payloadValue.map((item, index) => {
                        return {
                            title: `${index} : “${item}”,`,
                            scopedSlots: {
                                title: 'custom',
                            },
                            field: {
                                type: 'string',
                            },
                        }
                    })
                : [],
            scopedSlots: {
                title: 'custom',
            },
            field: f,
            path: pathStr,
            isFieldExists: _get({payload}, pathStr) !== undefined,
        }
    }

    private _generateKey(): string {
        return uuid()
    }

}

