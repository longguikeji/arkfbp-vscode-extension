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

import { isArkFBPApp, isArkFBPAppByDocument, getArkFBPFlowDirByDocument, getDatabases, updateFlowGraph } from './arkfbp';

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

export const previewWebviewList: PreviewWebview[] = [];
export const provide: any = {};

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
	provide.appProvider = appProvider;

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


	if(arkfbp.getLanguageType() !== 'python') {
		const dependencyProvider: DependencyProvider = new DependencyProvider(
			context,
			rootPath
		);
		provide.dependencyProvider = dependencyProvider;

		vscode.window.registerTreeDataProvider("arkfbp.explorer.dependency", dependencyProvider);
		context.subscriptions.push(
			vscode.commands.registerCommand('arkfbp.explorer.dependency.action.openDocumentPage', async (item: any) => {
				vscode.env.openExternal(vscode.Uri.parse(`https://npmjs.com/package/${item.label}`));
			})
		);
	}


	if(arkfbp.getLanguageType() !== 'python') {
		const databaseProvider: DatabaseProvider = new DatabaseProvider(
			context,
			rootPath
		);
		provide.databaseProvider = databaseProvider;

		vscode.window.registerTreeDataProvider("arkfbp.explorer.database", databaseProvider);
		context.subscriptions.push(
			vscode.commands.registerCommand("arkfbp.explorer.database.action.create", () => databaseProvider.create())
		);
		context.subscriptions.push(
			vscode.commands.registerCommand("arkfbp.explorer.database.action.refresh", () => databaseProvider.refresh())
		);
	}


	const flowProvider: FlowsProvider = new FlowsProvider(
		context,
		rootPath,
		terminal
	);
	provide.flowProvider = flowProvider;

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

			flowOutlineDataProvider.setFlowDirPath(graphDefinitionFile);

			await vscode.commands.executeCommand('workbench.action.editorLayoutTwoRows');
			await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');

			await vscode.workspace.openTextDocument(graphDefinitionFile).then(doc => {
				vscode.window.showTextDocument(doc).then(async () => {
					await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');

					vscode.commands.executeCommand('arkfbp.graph.preview', graphDefinitionFile);
				});
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
		vscode.commands.registerCommand("arkfbp.explorer.flow.action.rename", async (item: any) => {
			flowProvider.rename(item.dir, item.label);
		})
	);


	const flowOutlineDataProvider = new FlowOutlineProvider(context);
	provide.flowOutlineDataProvider = flowOutlineDataProvider;

	vscode.window.createTreeView('arkfbp.explorer.flowOutline', {
		treeDataProvider: flowOutlineDataProvider,
	});
	context.subscriptions.push(
		vscode.commands.registerCommand('arkfbp.explorer.flowOutline.action.createFlowNode', async () => {
			await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');

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
			const result = await vscode.window.showWarningMessage('确认删除该节点么? \n该操作不可逆', {
				modal: true,
			}, 'OK');

			if (typeof result !== 'undefined') {
				const editor = vscode.window.activeTextEditor;
				if (!editor) {
					return;
				}

				const flowDir = getArkFBPFlowDirByDocument(editor.document);
				const graphFilePath = path.join(flowDir, arkfbp.getMainFileName());
				const files = arkfbp.findNodeFilesByClass(flowDir, item.cls);

				if (files.length === 0) {
					vscode.window.showErrorMessage('找不到对应的节点定义文件');
					return;
				}

				if (files.length > 1) {
					vscode.window.showWarningMessage('多于一个的定义文件，默认显示第一个匹配的文件');
				}

				updateFlowGraph('removeNode', graphFilePath, { cls: item.cls, id: item.id });
				const previewWebview = previewWebviewList.find((item: PreviewWebview) => item.graphFilePath === graphFilePath);

				if(previewWebview) {
					previewWebview.show(graphFilePath);
				}

				rimraf.sync(files[0]);
				flowOutlineDataProvider.refresh();

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
			await vscode.commands.executeCommand('workbench.action.editorLayoutTwoRows');
			await vscode.commands.executeCommand('workbench.action.focusLastEditorGroup');

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
		vscode.commands.registerCommand('arkfbp.graph.preview', (graphFilePath) => {
			if (graphFilePath) {
				// GraphPreviewPanel.createOrShow(context.extensionPath, graphDefinitionFile);
				const previewWebview = previewWebviewList.find((item: PreviewWebview) => item.graphFilePath === graphFilePath);

				if(previewWebview) {
					previewWebview.show(graphFilePath);
				} else {
					const pw = new PreviewWebview(context, graphFilePath);
					pw.show(graphFilePath);

					previewWebviewList.push(pw);
				}
			}
		})
	);
}