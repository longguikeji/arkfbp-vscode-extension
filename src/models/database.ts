import * as fs from 'fs';

export enum DataType {

    String = "string",
    Integer = "integer",
    Double = "double",
    Boolean = "boolean",

}

export class Column {

    name: string;

    type: string = "string";

    description: string = '';

    blank: boolean = true;

    unique: boolean = false;

    maxLength?: number;
    choices?: any[];

    constructor(name: string, type: string) {
        this.name = name;
        this.type = type;
    }

}

export class Table {

    version: string;
    name: string;

    columns: Column[];
    snapshots: Table[];

    constructor(name: string) {
        this.version = '';
        this.name = name;
        this.snapshots = [];
        this.columns = [];
    }

    loadFromFile(filePath: string) {
        const data = fs.readFileSync(filePath);
        const obj = JSON.parse(data.toString());

        this.version = obj.version;

        if (obj.hasOwnProperty('columns')) {
            const columns: Column[] = [];
            obj.columns!.forEach((element: any) => {
                const name = element.name;
                const type = element.type;
                const column = new Column(name, type);
                columns.push(column);
            });

            this.columns = columns;
        }
    }

}


export class Database {

    name: string;
    tables: Table[];

    constructor(name: string, tables?: Table[]) {
        this.name = name;
        this.tables = [];
    }

}