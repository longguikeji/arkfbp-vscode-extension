import uuid = require('uuid/v4')
import dedent = require('dedent')
import { Field, FieldType } from './field'

export class Outputs {

    private _fields: Field[]
    private _top: Field
    private _refKeyMapping: Map<string, string>

    constructor() {
        this._fields = []

        this._top = new Field({
            required: true,
            name: '.',
            alias: 'out',
            dataType: FieldType.Object,
            comment: 'top object',
        })
        this._top.key = this._generateKey()
        this._refKeyMapping = new Map<string, string>()
        this._refKeyMapping.set(this._top.key, '.')
    }

    get field() {
        return this._top
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

        if (!parent.children) {
            parent.children = []
        }

        for (const field of fields) {
            parent.children[field.name] = field
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

        if (f.dataType === 'object' && f.children) {
            // recursively delete all the children
            for (const key in f.children) {
                if (!f.children.hasOwnProperty(key)) {
                    continue
                }
                this.remove(f.children[key])
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
        return this._convertObject(this._top)
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
            value = value.children[k]
        }

        return value
    }

    private _removeFromParent(parent: any, f: Field) {
        if (!parent.children) {
            return
        }

        delete(parent.children[f.name])
    }

    private _convertObject(f: Field): {
        key: string, title: string, scopedSlots: { title: string }, children: Array<{}>,
        field: Field,
    } {
        const r = {
            key: f.key!,
            title: f.alias,
            children: new Array<{}>(),
            scopedSlots: {
                title: 'custom',
            },
            field: f,
        }

        if (f.dataType === 'object' && f.children) {
            for (const key in f.children) {
                if (!f.children.hasOwnProperty(key)) {
                    continue
                }
                const field = f.children[key]
                if (field.dataType === 'object') {
                    r.children.push(this._convertObject(field))
                } else {
                    r.children.push(this._convert(field))
                }
            }
        } else {
            r.children.push(this._convert(f))
        }

        return r
    }

    private _convert(f: Field): {
        key: string, title: string, scopedSlots: { title: string }, children: Array<{}>,
        field: Field,
    } {
        return {
            key: f.key!,
            title: f.alias,
            children: [],
            scopedSlots: {
                title: 'custom2',
            },
            field: f,
        }
    }

    private _generateKey(): string {
        return uuid()
    }

}

