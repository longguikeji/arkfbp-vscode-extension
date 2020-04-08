import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf  from 'rimraf';
import { ThrottledDelayer } from './async';
import * as yaml from 'js-yaml';
import { ITerminalMap } from "./types";

import { AppProvider } from "./app";

import * as ts from 'typescript';

import { FlowsProvider } from "./flowExplorer";
import { runCommandInIntegratedTerminal } from './util';

import { showCreateFlowBox } from './createFlowBox';
import { showCreateFlowNodeBox } from './createFlowNodeBox';

import { COMMAND_REFRESH, FlowOutlineProvider, COMMAND_SELECTION, posToLine } from './flowOutline';

import { isArkFBPApp, isArkFBPAppByDocument, getArkFBPFlowDirByDocument } from './arkfbp';

import {
	window, commands, workspace, languages, OutputChannel, ExtensionContext, ViewColumn,
	QuickPickItem, Terminal, DiagnosticCollection, Diagnostic, Range, TextDocument, DiagnosticSeverity,
	CodeActionProvider, CodeActionContext, CancellationToken, Command, Uri
} from 'vscode';

import { O_SYMLINK } from 'constants';
import { resolve } from 'dns';
import { FlowTreeItem } from './flowTreeItem';

import { GraphPreviewPanel } from './graph';
import { registerStatusBarItem } from './statusBar';
import * as arkfbp from './arkfbp';

export function deactivate() {
	if (terminal) {
		terminal.dispose();
	}
}

let terminal: Terminal | null = null;


export async function activate(context: ExtensionContext) {
	if (!terminal) {
		terminal = window.createTerminal();
	}

	window.onDidCloseTerminal((closedTerminal) => {
		if (terminal === closedTerminal) {
			terminal = null;
		}
	});

	// StatusBar
	registerStatusBarItem(context);

	//workspace.onDidChangeConfiguration(_event => loadConfiguration(context), null, context.subscriptions);
	//loadConfiguration(context);

	const rootPath: string = vscode.workspace.rootPath || ".";

	// Welcome Command
	vscode.commands.registerCommand("arkfbp.welcome", () => {
		window.showInformationMessage('Welcome to use ArkFBP');
	});

	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.createFlowNode', async () => {
			await showCreateFlowNodeBox();
		})
	);

	// Compile Command
	vscode.commands.registerCommand("arkfbp.build", () => {
		const cmd = 'npm';
		const args = ['run', 'compile'];
		runCommandInIntegratedTerminal(terminal, cmd, args, this.workspaceRoot);
	});


	const appProvider: AppProvider = new AppProvider(
		context,
		rootPath
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.info", appProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.info.action.build", () => {
			appProvider.build(terminal);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.info.action.run", () => {
			appProvider.run(terminal);
		})
	);

	const flowProvider: FlowsProvider = new FlowsProvider(
		context,
		rootPath,
		terminal,
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.flow", flowProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.refresh", () => flowProvider.refresh())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.create", (item?) => {
			if (typeof item === 'undefined') {
				flowProvider.create();
			} else {
				flowProvider.create(path.join(item.dir, item.label));
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.delete", async (item: FlowTreeItem) => {
			const result = await vscode.window.showWarningMessage('确认删除该工作流么? \n该操作不可逆', {
				modal: true,
			}, 'OK');

			if (typeof result !== 'undefined') {
				const flowDir = path.join(item.dir, item.label);
				console.info(flowDir);
				rimraf.sync(flowDir);
				flowProvider.refresh();
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flow.action.createFolder', (item?) => {
			if (typeof item === 'undefined') {
				flowProvider.createFolder();
			} else {
				flowProvider.createFolder(path.join(item.dir, item.label));
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flow.action.copy', (item) => {
			flowProvider.copy(path.join(item.dir, item.label));
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.run", (item: FlowTreeItem) => flowProvider.run(item))
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.open", async (flowReference: string) => {
			console.info(flowReference);
			const flowGraphDefinitionFile = arkfbp.getFlowGraphDefinitionFileByReference(rootPath, flowReference);
			console.info(flowGraphDefinitionFile);

			await vscode.workspace.openTextDocument(flowGraphDefinitionFile).then(doc => {
				vscode.window.showTextDocument(doc).then(async () => {
					vscode.commands.executeCommand('arkfbp.graph.preview');
				});
			});
		})
	);

	const flowOutlineDataProvider = new FlowOutlineProvider(context);
	vscode.window.createTreeView('arkfbp.explorer.flowOutline', {
		treeDataProvider: flowOutlineDataProvider,
	});
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.createFlowNode', () => {
			vscode.commands.executeCommand('arkfbp.createFlowNode').then(() => flowOutlineDataProvider.refresh());
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_REFRESH, () => flowOutlineDataProvider.refresh())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_SELECTION, (pos, end) => {
			const editor = vscode.window.activeTextEditor;
			if (editor !== undefined) {
				const code: string = editor.document.getText();
				const posStart = posToLine(code, pos);
				const posEnd = posToLine(code, end);
				editor.selection = new vscode.Selection(posStart, posEnd);
				editor.revealRange(
					new vscode.Range(posStart, posEnd),
					vscode.TextEditorRevealType.InCenterIfOutsideViewport
				);
				editor.show();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.deleteFlowNode', async (item) => {
			const result = await vscode.window.showWarningMessage('确认删除该节点么? \n该操作不可逆', {
				modal: true,
			}, 'OK');

			if (typeof result !== 'undefined') {
				// try to delete the node file
				if (typeof item.id !== 'undefined') {
					vscode.window.showInformationMessage(`The flow node ${item.cls} with id: ${item.id} deleted`);
				} else {
					vscode.window.showInformationMessage(`The flow node ${item.cls} with no id deleted`);
				}
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.open', async (item) => {
			console.info(item);

			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const flowDir = getArkFBPFlowDirByDocument(editor.document);
			const files = arkfbp.findNodeFilesByClass(flowDir, item.cls);
			if (files.length === 0) {
				vscode.window.showErrorMessage('找不到对应的节点定义文件');
				return;
			}
			if (files.length > 1) {
				vscode.window.showWarningMessage('多于一个的定义文件，默认显示第一个匹配的文件');
			}

			await vscode.workspace.openTextDocument(files[0]).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		})
	);

	/**
	 * Preview the Graph
	 */
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.graph.preview', () => {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				return;
			}

			const flowDir = getArkFBPFlowDirByDocument(editor.document);
			if (flowDir !== '') {
				GraphPreviewPanel.createOrShow(context.extensionPath, path.join(flowDir, 'index.js'));
			}
		})
	);
}

function isValidationEnabled(document: TextDocument) {
	return true;
}

function loadConfiguration(context: ExtensionContext): void {
	workspace.onDidSaveTextDocument(document => {
		if (isValidationEnabled(document)) {
			validateDocument(document);
		}
	}, null, context.subscriptions);
	window.onDidChangeActiveTextEditor(editor => {
		if (editor && editor.document && isValidationEnabled(editor.document)) {
			validateDocument(editor.document);
		}
	}, null, context.subscriptions);

	// remove markers on close
	workspace.onDidCloseTextDocument(_document => {
	}, null, context.subscriptions);

	// workaround for onDidOpenTextDocument
	// workspace.onDidOpenTextDocument(document => {
	// 	console.log("onDidOpenTextDocument ", document.fileName);
	// 	validateDocument(document);
	// }, null, context.subscriptions);
	validateAllDocuments();
}

function validateAllDocuments() {
	// TODO: why doesn't this not work?
	//workspace.textDocuments.forEach(each => validateDocument(each));

	window.visibleTextEditors.forEach(each => {
		if (each.document) {
			validateDocument(each.document);
		}
	});
}

async function validateDocument(document: TextDocument) {
	if (!isArkFBPAppByDocument(document)) {
		return;
	}

	console.log('validateDocument... ', document.fileName);

	try {
		const doc = yaml.safeLoad(fs.readFileSync(document.fileName).toString());
		console.log(doc);
	} catch (e) {
		console.log(e);
	}
}