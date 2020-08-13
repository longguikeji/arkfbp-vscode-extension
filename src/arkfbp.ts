import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as babel from '@babel/core';
import * as babelTypes from "@babel/types";

import { workspace, TextDocument } from 'vscode';
import * as ts from 'typescript';

import { runCommandInIntegratedTerminal } from './util';
import { Database, Table } from './models/database';
import {
    parse,
    stringify,
    assign
  } from 'comment-json';

const ARKFBP_META_DIR = '.arkfbp';
const ARKFBP_META_CONFIG_FILE = 'config.yaml';
const ARKFBP_FLOW_DIR = 'flows';
const ARKFBP_DATBASE_DIR = 'databases';

export function isArkFBPApp(root: string): boolean {
    try {
        const stat = fs.statSync(path.join(root, ARKFBP_META_DIR, ARKFBP_META_CONFIG_FILE));
        return stat.isFile();
    } catch (error) {
        return false;
    }
}

export function isArkFBPAppByDocument(document: TextDocument): boolean {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
        const root = workspaceFolder.uri.scheme === 'file' ? workspaceFolder.uri.fsPath : undefined;
        if (typeof root === 'undefined') {
            return false;
        }
        return isArkFBPApp(root);
    }

    return false;
}

export function getArkFBPAppDirByDocument(document: TextDocument): string {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
        const root = workspaceFolder.uri.scheme === 'file' ? workspaceFolder.uri.fsPath : '';
        return root;
    }

    throw new Error('unknown location');
}

export function getArkFBPAppDir(): string {
    const folders: any = workspace.workspaceFolders;
    return folders[0].uri.fsPath;
}

/**
 * Get the root flow dir inside the ArkFBP app
 *
 * @param root: string
 */
export function getArkFBPFlowRootDir(root?: string): string {
    if (typeof root === 'undefined') {
        root = getArkFBPAppDir();
    }
    return path.join(root, "src", ARKFBP_FLOW_DIR);
}

export function getArkFBPFlows(dir: string, includeGroup: boolean = false): (string | [string, boolean])[] {
    const flows: (string | [string, boolean])[] = [];
    const elements = fs.readdirSync(dir);

    elements.forEach(element => {
        if (isArkFBPFlow(path.join(dir, element))) {
            flows.push(element);
        } else {
            if (includeGroup) {
                // flow group
                flows.push([element, true]);
            }
        }
    });

    return flows;
}


export function getDatabaseRootDir(root?: string): string {
    if (root === undefined) {
        root = getArkFBPAppDir();
    }
    return path.join(root, "src", ARKFBP_DATBASE_DIR);
}

export function getDatabases(): Database[] {
    const databaseDir = getDatabaseRootDir();
    const elements = fs.readdirSync(databaseDir);
    const databases: Database[] = [];
    elements.forEach(element => {
        if (element === 'migrations') {
            return;
        }

        const database = new Database(element);
        const tablesDir = path.join(databaseDir, element, 'tables');
        if (!fs.existsSync(tablesDir)) {
            return;
        }

        const tables = fs.readdirSync(tablesDir);

        tables.forEach(table => {
            const t = new Table(table);
            const tableDefinitionFilePath = path.join(tablesDir, table, 'index.json');
            if (!fs.existsSync(tableDefinitionFilePath)) {
                return;
            }

            t.loadFromFile(tableDefinitionFilePath);

            /**
             * load the snapshots of the table
             */
            const snapshotsDir = path.join(tablesDir, table, 'snapshots');
            if (fs.existsSync(snapshotsDir)) {
                const snapshots = fs.readdirSync(snapshotsDir);
                snapshots.forEach(snapshot => {
                    const snapshotTable = new Table(table);
                    const tableDefinitionFilePath = path.join(snapshotsDir, snapshot);
                    if (!fs.existsSync(tableDefinitionFilePath)) {
                        return;
                    }

                    snapshotTable.loadFromFile(tableDefinitionFilePath);
                    t.snapshots.push(snapshotTable);
                });
            }

            database.tables.push(t);
        });

        databases.push(database);
    });

    return databases;
}

export function isArkFBPFlow(root: string): boolean {
    try {
        let stat = fs.statSync(path.join(root, 'index.js'));
        if (!stat.isFile()) {
            return false;
        }

        stat = fs.statSync(path.join(root, 'nodes'));
        if (!stat.isDirectory()) {
            return false;
        }

        return true;
    } catch (err) {
        return false;
    }
}

/**
 *
 * @param root
 */
export function getArkFBPFlowDirByDocument(document: TextDocument): string {
    const flowRootDir = getArkFBPFlowRootDir(workspace.rootPath);
    let dirname = path.dirname(document.uri.fsPath);
    let flowDir: string = '';

    while (dirname.indexOf(flowRootDir) >= 0) {
        if (isArkFBPFlow(dirname)) {
            flowDir = dirname;
            break;
        }

        dirname = path.dirname(dirname);
    }

    return flowDir;
}

export interface GraphNode {
    indexs?: number[];
    kind?: ts.SyntaxKind;
    pos?: number;
    end?: number;
    node?: any;
    isDirectory?: boolean;

    cls?: string;
    id?: string;
    next?: string;
    name?: string;
    base?: string;
}

export function syntaxKindToName(kind: ts.SyntaxKind) {
    return ts.SyntaxKind[kind];
}

export function getNodes(node: ts.Node) {
    const nodes: ts.Node[] = [];
    ts.forEachChild(node, cbNode => {
        nodes.push(cbNode);
    });
    return nodes;
}

export function getXChildren(sfile: ts.Node, parent: GraphNode): GraphNode[] {
    const childNodes = parent!.indexs!.reduce((childs, index) => {
        return getNodes(childs[index]);
    }, getNodes(sfile));

    return childNodes.map((node, index) => {
        return {
            indexs: parent!.indexs!.concat([index]),
            kind: node.kind,
            pos: node.pos,
            end: node.end,
            node: node,
            isDirectory: getNodes(node).length > 0,
        };
    });
}

export function getArkFBPGraphNodes(graphFilePath: string): GraphNode[] {
    const content = fs.readFileSync(graphFilePath).toString();

    const sfile = ts.createSourceFile(
        graphFilePath,
        content,
        ts.ScriptTarget.Latest
    );

    const nodes: GraphNode[] = getNodes(sfile).map((node: ts.Node, index: number) => {
        return {
            indexs: [index],
            kind: node.kind,
            pos: node.pos,
            end: node.end,
            node: node,
            isDirectory: getNodes(node).length > 0,
        };
    }).filter((node: GraphNode) => {
        if (node.kind && syntaxKindToName(node.kind) === 'ClassDeclaration') {
            return true;
        }

        return false;
    });

    if (nodes.length === 0) {
        return [];
    }

    // Flow Class Definition
    const cls = nodes[0];

    let methods = getXChildren(sfile, cls).filter((node: GraphNode) => {
        if (node.kind && syntaxKindToName(node.kind) !== 'MethodDeclaration') {
            return false;
        }

        if (node.node && node.node.name && node.node.name.escapedText !== 'createNodes') {
            return false;
        }

        return true;
    });

    // Get `createNodes` Func
    if (methods.length === 0) {
        return [];
    }

    const createNodesFunc = methods[0];
    const ret = getXChildren(sfile, createNodesFunc);

    const returnStatement = ret[1].node.statements[0];
    const elements = returnStatement.expression.elements;
    const flowNodes = elements.map((element: any) => {
        const p: GraphNode = {
            pos: element.pos,
            end: element.end,
        };

        for (let i = 0; i < element.properties.length; ++i) {
            const prop = element.properties[i];
            if (prop.name.escapedText === 'cls') {
                p['cls'] = prop.initializer.escapedText;
            }
            if (prop.name.escapedText === 'id') {
                p['id'] = prop.initializer.text;
            }
            if (prop.name.escapedText === 'next') {
                p['next'] = prop.initializer.text;
            }
            if (prop.name.escapedText === 'x') {
                p['x'] = prop.initializer.text;
            }
            if (prop.name.escapedText === 'y') {
                p['y'] = prop.initializer.text;
            }
        }

        return p;
    });

    return flowNodes;
}

export function getArkFBPGraphNodeFromFile(filePath: string): GraphNode | null {
    const content = fs.readFileSync(filePath).toString();
    const sfile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest
    );

    const nodes: GraphNode[] = getNodes(sfile).map((node: ts.Node, index: number) => {
        return {
            indexs: [index],
            kind: node.kind,
            pos: node.pos,
            end: node.end,
            node: node,
            isDirectory: getNodes(node).length > 0,

            cls: '',
            id: '',
            next: '',
            name: '',
            base: '',
        };
    }).filter((node: GraphNode) => {
        if (node.kind && syntaxKindToName(node.kind) === 'ClassDeclaration') {
            return true;
        }

        return false;
    });

    if (nodes.length === 0) {
        return null;
    }

    const node = nodes[0];
    const nodeName = node.node.name.escapedText;
    const baseNode = node.node.heritageClauses[0].types[0].expression.escapedText;
    const p: GraphNode = {};
    p.base = baseNode;
    p.name = nodeName;
    return p;
}

export function getFlowPath(flow: string): string {
    return flow.replace(/\./g, '/');
}

export function getGraphFile(flow: string): string {
    const flowPath = getFlowPath(flow);
    const flowRootDirPath = getArkFBPFlowRootDir(getArkFBPAppDir());
    return path.join(flowRootDirPath, flowPath, 'index.js');
}

/**
 * Get all nodes defined in the flow directory
 *
 * @param flowDirPath: flow directory path
 */
export function getArkFBPFlowGraphNodes(flowDirPath: string): GraphNode[] {
    const elements = fs.readdirSync(path.join(flowDirPath, 'nodes'));

    const graphNodes: GraphNode[] = [];

    for (var i = 0; i < elements.length; ++i) {
        const element = elements[i];
        console.info(`${i}, >>>, `, element);
        const graphNode = getArkFBPGraphNodeFromFile(path.join(flowDirPath, 'nodes', element));
        if (graphNode) {
            graphNodes.push(graphNode);
        }
    }

    return graphNodes;
}

export function buildApp(workspaceRoot: string, terminal?: vscode.Terminal) {
    const cmd = 'npm';
    const args = ['run', 'compile'];
    if (terminal) {
        runCommandInIntegratedTerminal(terminal, cmd, args, workspaceRoot);
    }
}

export function runApp(workspaceRoot: string, terminal: vscode.Terminal) {
    const cmd = 'node';
    const args = ['dist/cli.js', 'serve'];
    runCommandInIntegratedTerminal(terminal, cmd, args, workspaceRoot);
}

export function runFlow(workspaceRoot: string, terminal: vscode.Terminal, flowName: string, format: string, data: string) {
    const cmd = 'node';
    const args = ["./dist/cli.js", "run", "--verbose", "--name", `${flowName}`, "--inputs", format === 'JSON' ? `'${data}'` : data, "--inputs-format", format];
    runCommandInIntegratedTerminal(terminal, cmd, args, workspaceRoot);
}

export function getFlowDirPathByReference(workspaceRoot: string, reference: string): string {
    const p = path.join(workspaceRoot, 'src', ARKFBP_FLOW_DIR, reference);
    return p;
}

export function getFlowGraphDefinitionFileByReference(workspaceRoot: string, reference: string): string {
    const p = path.join(workspaceRoot, 'src', ARKFBP_FLOW_DIR, reference, 'index.js');
    return p;
}

export function getFlowReferenceByAbsoluteFlowDirPath(p: string): string{
    const flowRootDirPath = getArkFBPFlowRootDir(getArkFBPAppDir());
    let referencePath = p.slice(flowRootDirPath.length+1);
    referencePath = referencePath.replace(/\//g, '.');
    return referencePath;
}

export function findNodeFilesByClass(flowDirPath: string, classID: string): string[] {
    const nodesDirPath = path.join(flowDirPath, 'nodes');
    console.info(nodesDirPath);
    const elements = fs.readdirSync(nodesDirPath);
    const matchedFiles: string[] = [];
    elements.forEach((element) => {
        if (element.toLocaleLowerCase() === (classID + '.js').toLocaleLowerCase()) {
            matchedFiles.push(path.join(nodesDirPath, element));
        }
    });

    return matchedFiles;
}

export function createNode(options: { flow: string, base: string, class: string, id: string }): boolean {
    const cwd = vscode.workspace.workspaceFolders![0].uri.path;
    let stdout = cp.execFileSync('arkfbp', ['createnode', '--flow', `${options.flow}`, '--base', `${options.base}`, '--class', `${options.class}`, '--id', `${options.id}`], {
        cwd: cwd,
    });

    console.info(stdout.toString());
    return true;
}

export function updateFlowGraph(flow: string, node: {
    id: string,
    cls: string,
    filename: string,
    next?: string,
}) {
    const graphFilePath = getGraphFile(flow);
    const nodes = getArkFBPGraphNodes(graphFilePath);
    nodes.push(node);

    const code = fs.readFileSync(graphFilePath).toString();
    const result = babel.transform(code, {
        plugins: [
            myImportInjector,
            myImportInjector2,
        ],
    });

    function myImportInjector({ type, template }: { type: any, template: any}) {
        const myImport = template(`import { ${node.cls} } from "./nodes/${node.filename}";`, { sourceType: "module" });
        return {
            visitor: {
                Program(path: any, state: any) {
                    const lastImport = path.get("body").filter((p: any) => p.isImportDeclaration()).pop();
                    if (lastImport) {
                        lastImport.insertAfter(myImport());
                    }

                },
            },
        };
    }

    function myImportInjector2({ types, template }: {types: any, template: any}) {
        return {
            visitor: {
                ClassMethod(path: any, state: any) {
                    if (path.node.key.name === 'createNodes') {
                        const returnStatement = path.node.body.body[0];
                        const arrayExpression = returnStatement.argument as babelTypes.ArrayExpression;
                        const o1 = babelTypes.objectProperty(babelTypes.identifier('cls'), babelTypes.identifier(node.cls));
                        const o2 = babelTypes.objectProperty(babelTypes.identifier('id'), babelTypes.stringLiteral(node.id));
                        const o3 = babelTypes.objectProperty(babelTypes.identifier('x'), babelTypes.numericLiteral(30));
                        const o4 = babelTypes.objectProperty(babelTypes.identifier('y'), babelTypes.numericLiteral(30));
                        arrayExpression.elements.push(
                            babelTypes.objectExpression([o1, o2, o3, o4])
                        );
                    }
                }
            },
        };
    }

    if (!result){
        return;
    }

    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
        fs.writeFileSync(graphFilePath, result.code);
        vscode.workspace.openTextDocument(graphFilePath).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    } else {
        fs.writeFileSync(graphFilePath, result);
    }

}

export function createDatabase(options: { name: string }): boolean {
    const cwd = vscode.workspace.workspaceFolders![0].uri.path;
    let stdout = cp.execFileSync('arkfbp', ['db', 'create', '--name', `${options.name}`], {
        cwd: cwd,
    });

    console.info(stdout.toString());
    return true;
}