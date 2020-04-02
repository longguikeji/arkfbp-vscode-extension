// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { ThrottledDelayer } from './async';
import * as yaml from 'js-yaml';
import { ITerminalMap } from "./types";

import { NpmScriptsNodeProvider } from "./info";

import * as ts from 'typescript';


import { FlowsProvider } from "./flowExplorer";
import { runCommandInIntegratedTerminal } from './util';

import { showQuickPick, showCreateFlowBox } from './basicInput';
import { COMMAND_REFRESH, FlowOutlineProvider, COMMAND_SELECTION, posToLine } from './flowOutline';

import { isArkFBPApp, isArkFBPAppByDocument, getArkFBPFlowDirByDocument } from './arkfbp';

import {
	window, commands, workspace, languages, OutputChannel, ExtensionContext, ViewColumn,
	QuickPickItem, Terminal, DiagnosticCollection, Diagnostic, Range, TextDocument, DiagnosticSeverity,
	CodeActionProvider, CodeActionContext, CancellationToken, Command, Uri
} from 'vscode';

import { O_SYMLINK } from 'constants';
import { resolve } from 'dns';
import { FlowTreeItem } from './FlowTreeItem';

import { GraphPreviewPanel } from './graph';

// // this method is called when your extension is activated
// // your extension is activated the very first time the command is executed
// export function activate(context: vscode.ExtensionContext) {

// 	// The command has been defined in the package.json file
// 	// Now provide the implementation of the command with registerCommand
// 	// The commandId parameter must match the command field in package.json
// 	context.subscriptions.push(
// 		vscode.commands.registerCommand('arkfbp.new', () => {
// 			// The code you place here will be executed every time your command is executed
// 			const options: { [key: string]: (context: ExtensionContext) => Promise<void> } = {
// 				'新建工作流': showCreateFlowBox,
// 				'新建节点': showQuickPick,
// 			};

// 			const quickPick = window.createQuickPick();
// 			quickPick.items = Object.keys(options).map(label => ({ label: label }));
// 			quickPick.onDidChangeSelection(selection => {
// 				if (selection[0]) {
// 					options[selection[0].label](context)
// 						.catch(console.error);
// 				}
// 			});
// 			quickPick.onDidHide(() => quickPick.dispose());
// 			quickPick.show();

// 			//vscode.window.showInformationMessage('Hello World again!');
// 		})
// 	);

// }

// this method is called when your extension is deactivated
export function deactivate() {
	if (terminal) {
		terminal.dispose();
	}
}

let terminal: Terminal | null = null;
let myStatusBarItem: vscode.StatusBarItem;

function updateStatusBarItem(): void {
	myStatusBarItem.text = `ArkFBP`;
	myStatusBarItem.show();
}

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
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
	myStatusBarItem.command = 'arkfbp.welcome';
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));
	updateStatusBarItem();


	//workspace.onDidChangeConfiguration(_event => loadConfiguration(context), null, context.subscriptions);
	//loadConfiguration(context);

	const rootPath: string = vscode.workspace.rootPath || ".";

	// Welcome Command
	vscode.commands.registerCommand("arkfbp.welcome", () => {
		window.showInformationMessage('Welcome to use ArkFBP');
	});

	// New Command
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.new', () => {
			const options: { [key: string]: (context: ExtensionContext) => Promise<void> } = {
				'新建工作流': showCreateFlowBox,
				'新建节点': showQuickPick,
			};

			const quickPick = window.createQuickPick();
			quickPick.items = Object.keys(options).map(label => ({ label: label }));
			quickPick.onDidChangeSelection(selection => {
				if (selection[0]) {
					options[selection[0].label](context)
						.catch(console.error);
				}
			});
			quickPick.onDidHide(() => quickPick.dispose());
			quickPick.show();
		})
	);

	// Compile Command
	vscode.commands.registerCommand("arkfbp.build", () => {
		const cmd = 'npm';
		const args = ['run', 'compile'];
		runCommandInIntegratedTerminal(terminal, cmd, args, this.workspaceRoot);
	});

	const nodeProvider: NpmScriptsNodeProvider = new NpmScriptsNodeProvider(
		rootPath
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.info", nodeProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.info.action.build", () => {
			const cmd = 'npm';
			const args = ['run', 'compile'];
			runCommandInIntegratedTerminal(terminal, cmd, args, this.workspaceRoot);
		})
	);

	const flowProvider: FlowsProvider = new FlowsProvider(
		rootPath,
		terminal,
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.flow", flowProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.refresh", () => flowProvider.refresh())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.create", () => flowProvider.create())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.run", (item: FlowTreeItem) => flowProvider.run(item))
	);

	const flowOutlineDataProvider = new FlowOutlineProvider(context);
	vscode.window.createTreeView('arkfbp.explorer.flowOutline', {
		treeDataProvider: flowOutlineDataProvider,
	});
	context.subscriptions.push(
		vscode.commands.registerCommand("COMMAND_REFRESH", () => flowOutlineDataProvider.refresh())
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
			console.info(flowDir);
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