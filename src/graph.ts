import * as path from 'path';
import * as vscode from 'vscode';
import { getArkFBPFlowGraphNodes } from './arkfbp';

import { getArkFBPGraphNodes, GraphNode, getArkFBPGraphNodeFromFile } from './arkfbp';

export class GraphPreviewPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: GraphPreviewPanel | undefined;

	public static readonly viewType = 'graphPreview';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string, graphFilePath: string) {
		const editor = vscode.window.activeTextEditor;
		const flowDir = path.dirname(graphFilePath);
		let graphNodes = getArkFBPFlowGraphNodes(flowDir);
		let graphIndexNodes = getArkFBPGraphNodes(graphFilePath);

		// Merge graphNodes & graphIndexNodes
		graphIndexNodes.forEach((node: GraphNode) => {
			for (var i = 0; i < graphNodes.length; ++i) {
				const graphNode = graphNodes[i];
				if (graphNode.name === node.cls) {
					node.name = graphNode.name;
					node.base = graphNode.base;
					graphNodes.splice(i, 1);
					break;
				} else {
					node.base = node.cls;
					node.name = node.cls;
				}
			}
		});

		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (GraphPreviewPanel.currentPanel) {
			GraphPreviewPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			GraphPreviewPanel.viewType,
			'Graph',
			vscode.ViewColumn.Two,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

        GraphPreviewPanel.currentPanel = new GraphPreviewPanel(panel, extensionPath);
        GraphPreviewPanel.currentPanel.render(graphIndexNodes);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		GraphPreviewPanel.currentPanel = new GraphPreviewPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
        );
	}

	public render(graphNodes: GraphNode[]) {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		console.info('render:', graphNodes);
		this._panel.webview.postMessage({ command: 'render', nodes:  graphNodes});
	}

	public dispose() {
		GraphPreviewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;
	    this._updateForCat(webview);

	}

	private _updateForCat(webview: vscode.Webview) {
		this._panel.title = 'Graph Flow';
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview,) {
        const styleCssUri = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._extensionPath, 'dist', 'webviews', 'preview.css')
		));

		const styleCssUri2 = webview.asWebviewUri(vscode.Uri.file(
            path.join(this._extensionPath, 'dist', 'webviews', 'main-styles.')
		));

		const scriptUri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'dist', 'webviews', 'preview.js')
		));

		const script2Uri = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'dist', 'webviews', 'main-styles.js')
		));

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();
		/*

			<link nonce="${nonce}" href=${styleCssUri} rel=preload as=style>
				<link nonce="${nonce}" href=${scriptUri} rel=preload as=script>
				<link nonce="${nonce}" href=${script2Uri} rel=preload as=script>
				<link nonce="${nonce}" href=${styleCssUri} rel=stylesheet>
		*/

		return `<!DOCTYPE html>
			<html lang=en>
			<head>
				<meta charset=utf-8>
				<meta http-equiv=X-UA-Compatible content="IE=edge">
				<meta name=viewport content="width=device-width,initial-scale=1">
				<link rel=icon href=/favicon.ico>
				<title>Preview ArkFBP Graph</title>
				<link nonce="${nonce}" href=${scriptUri} rel=preload as=script>
				<link nonce="${nonce}" href=${script2Uri} rel=preload as=script>
			</head>
			<body>
				<div id=app></div>
				<script nonce="${nonce}" src=${script2Uri}></script>
				<script nonce="${nonce}" src=${scriptUri}></script>
			</body>
			</html>
		`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}