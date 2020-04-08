import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

import { workspace, TextDocument } from 'vscode';
import { isSwitchStatement } from 'typescript';
import * as ts from 'typescript';

import { runCommandInIntegratedTerminal } from './util';

const ARKFBP_META_DIR = '.arkfbp';
const ARKFBP_META_CONFIG_FILE = 'config.yaml';
const ARKFBP_FLOW_DIR = 'flows';

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
        return isArkFBPApp(root);
    }

    return false;
}

export function getArkFBPAppDirByDocument(document: TextDocument): string {
    const workspaceFolder = workspace.getWorkspaceFolder(document.uri);
    if (workspaceFolder) {
        const root = workspaceFolder.uri.scheme === 'file' ? workspaceFolder.uri.fsPath : undefined;
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

    elements.forEach((element) => {
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
    console.info('getArkFBPFlowDirByDocument:', document.uri.fsPath);
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
    const childNodes = parent.indexs.reduce((childs, index) => {
        return getNodes(childs[index]);
    }, getNodes(sfile));

    return childNodes.map((node, index) => {
        return {
            indexs: parent.indexs.concat([index]),
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
        if (syntaxKindToName(node.kind) === 'ClassDeclaration') {
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
        if (syntaxKindToName(node.kind) !== 'MethodDeclaration') {
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
    const flowNodes = elements.map((element) => {
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
        }

        return p;
    });

    return flowNodes;
}

export function getArkFBPGraphNodeFromFile(filePath: string): GraphNode {
    console.info('>>>getArkFBPGraphNodeFromFile', filePath);
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
            next:'',
            name: '',
            base: '',
        };
    }).filter((node: GraphNode) => {
        if (syntaxKindToName(node.kind) === 'ClassDeclaration') {
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
        graphNodes.push(graphNode);
    }

    return graphNodes;
}

export function buildApp(workspaceRoot: string, terminal: vscode.Terminal) {
    const cmd = 'npm';
    const args = ['run', 'compile'];
    runCommandInIntegratedTerminal(terminal, cmd, args, workspaceRoot);
}

export function runApp(workspaceRoot: string, terminal: vscode.Terminal) {
    const cmd = 'node';
    const args = ['dist/cli.js', 'serve'];
    runCommandInIntegratedTerminal(terminal, cmd, args, workspaceRoot);
}

export function runFlow(workspaceRoot: string, terminal: vscode.Terminal, flowName: string) {
    const cmd = 'node';
    const args = ["./dist/cli.js", "run", "--name", `${flowName}`];
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

export function findNodeFilesByClass(flowDirPath: string, classID: string): string[] {
    const nodesDirPath = path.join(flowDirPath, 'nodes');
    console.info(nodesDirPath);
    const elements = fs.readdirSync(nodesDirPath);
    const matchedFiles = [];
    elements.forEach((element) => {
        if (element.toLocaleLowerCase() === (classID + '.js').toLocaleLowerCase()) {
            matchedFiles.push(path.join(nodesDirPath, element));
        }
    });

    return matchedFiles;
}