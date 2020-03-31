import * as path from 'path';
import * as fs from 'fs';

import { workspace, TextDocument } from 'vscode';
import { isSwitchStatement } from 'typescript';

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

export function getArkFBPFlowDir(root: string): string {
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