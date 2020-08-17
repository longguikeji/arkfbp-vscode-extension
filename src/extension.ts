import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as rimraf from 'rimraf';
import * as yaml from 'js-yaml';

import { AppProvider } from "./app";
import { DependencyProvider } from "./dependency";

import { FlowsProvider } from "./flowExplorer";
import { showCreateFlowNodeBox } from './createFlowNodeBox';

import { COMMAND_REFRESH, FlowOutlineProvider, COMMAND_SELECTION, posToLine } from './flowOutline';

import { isArkFBPApp, isArkFBPAppByDocument, getArkFBPFlowDirByDocument, getDatabases } from './arkfbp';

import {
	window, ExtensionContext, Terminal,
} from 'vscode';

import { O_SYMLINK } from 'constants';
import { resolve } from 'dns';
import { FlowTreeItem } from './flowTreeItem';

import { GraphPreviewPanel } from './graph';
import { PreviewWebview } from './webviews/previewWebview';

import { registerStatusBarItem } from './statusBar';
import * as arkfbp from './arkfbp';
import { DatabaseProvider} from './databaseExplorer';

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

	const rootPath: string = vscode.workspace.rootPath || ".";

	// Welcome Command
	vscode.commands.registerCommand("arkfbp.welcome", () => {
		window.showInformationMessage('Welcome to use ArkFBP');
	});

	vscode.commands.registerCommand("arkfbp.build", () => {
		if (terminal) {
			arkfbp.buildApp(rootPath, terminal);
		}
	});

	const appProvider: AppProvider = new AppProvider(
		context,
		rootPath
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.info", appProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.info.action.build", () => {
			if (terminal) {
				appProvider.build(terminal);
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.info.action.run", () => {
			if (terminal) {
				appProvider.run(terminal);
			}
		})
	);

	/////
	const dependencyProvider: DependencyProvider = new DependencyProvider(
		context,
		rootPath
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.dependency", dependencyProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.dependency.action.openDocumentPage', async (item: any) => {
			vscode.env.openExternal(vscode.Uri.parse(`https://npmjs.com/package/${item.label}`));
		})
	);
	//////


	/**
	 * DatabaseProvider
	 */

	const databaseProvider: DatabaseProvider = new DatabaseProvider(
		context,
		rootPath
	);
	vscode.window.registerTreeDataProvider("arkfbp.explorer.database", databaseProvider);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.database.action.create", () => databaseProvider.create())
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.database.action.refresh", () => databaseProvider.refresh())
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
		vscode.commands.registerCommand('arkfbp.explorer.flow.action.openGraphDefinitionFile', async (flow: string) => {
			const graphDefinitionFile = arkfbp.getFlowGraphDefinitionFileByReference(rootPath, flow);
			vscode.workspace.openTextDocument(graphDefinitionFile).then(doc => {
				vscode.window.showTextDocument(doc);
			});
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
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.open", async (item: any) => {
			console.info(item);
			const flow = item.reference;
			const graphDefinitionFile = arkfbp.getFlowGraphDefinitionFileByReference(rootPath, flow);
			console.info(graphDefinitionFile);

			await vscode.workspace.openTextDocument(graphDefinitionFile).then(doc => {
				vscode.window.showTextDocument(doc).then(async () => {
					vscode.commands.executeCommand('arkfbp.graph.preview');
				});
			});
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.rename", async (item: any) => {
			flowProvider.rename(item.dir, item.label);
		})
	);


	const flowOutlineDataProvider = new FlowOutlineProvider(context);
	vscode.window.createTreeView('arkfbp.explorer.flowOutline', {
		treeDataProvider: flowOutlineDataProvider,
	});
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.createFlowNode', async () => {
			const editor = vscode.window.activeTextEditor;
			if (editor === undefined) {
				return;
			}

			const flowDirPath = getArkFBPFlowDirByDocument(editor.document);
			const flowReference = arkfbp.getFlowReferenceByAbsoluteFlowDirPath(flowDirPath);

			await showCreateFlowNodeBox(flowReference).then(() => {
				flowOutlineDataProvider.refresh();
			});
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.copyFlowNode', (item) => {
			console.info(item);
			//vscode.commands.executeCommand('arkfbp.createFlowNode').then(() => flowOutlineDataProvider.refresh());
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
			// @Todo: delete the file and update the graph file

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
				// GraphPreviewPanel.createOrShow(context.extensionPath, path.join(flowDir, 'index.js'));
				const v = new PreviewWebview(context, path.join(flowDir, 'index.js'));
				v.show(path.join(flowDir, 'index.js'));
			}
		})
	);
}