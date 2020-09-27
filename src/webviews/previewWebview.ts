import { GraphNode, getArkFBPFlowGraphNodes, getArkFBPGraphNodes } from './../arkfbp';
import { commands, Disposable, workspace, ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import * as path from 'path';
// import { Commands } from '../commands';
import {
	IpcMessage,
	onIpcCommand,
	ReadyCommandType,
	SettingsDidRequestJumpToNotificationType,
	PreviewState,
} from './protocol';
import { WebviewBase } from './webviewBase';

const anchorRegex = /.*?#(.*)/;

export class PreviewWebview extends WebviewBase {
	private _pendingJumpToAnchor: string | undefined;

	constructor(context: ExtensionContext, private readonly _graphFilePath: string) {
		super(context);

		this.renderEndOfBody();
	}

	// constructor() {
	// 	super('xxx');

	// 	this._disposable = Disposable.from(
	// 		this._disposable,
	// 		...[
	// 			// Commands.ShowSettingsPageAndJumpToCompareView,
	// 		].map(c => {
	// 			// The show and jump commands are structured to have a # separating the base command from the anchor
	// 			let anchor: string | undefined;
	// 			const match = anchorRegex.exec(c);
	// 			if (match !== null) {
	// 				[, anchor] = match;
	// 			}

	// 			return commands.registerCommand(c, () => this.onShowCommand(anchor), this);
	// 		})
	// 	);
	// }

	// protected onShowCommand(anchor?: string) {
	// 	if (anchor) {
	// 		this._pendingJumpToAnchor = anchor;
	// 	}
	// 	super.onShowCommand();
	// }

	protected onMessageReceived(e: IpcMessage) {
		switch (e.method) {
			case ReadyCommandType.method:
				onIpcCommand(ReadyCommandType, e, params => {
					if (this._pendingJumpToAnchor !== undefined) {
						this.notify(SettingsDidRequestJumpToNotificationType, { anchor: this._pendingJumpToAnchor });
						this._pendingJumpToAnchor = undefined;
					}
				});

				break;

			default:
				super.onMessageReceived(e);

				break;
		}
	}

	get graphFilePath() {
		return this._graphFilePath;
	}

	get filename(): string {
		return 'preview.html';
	}

	get id(): string {
		return 'arkfbp.preview';
	}

	get title(): string {
		return 'ArkFBP Flow Editor';
	}

	renderEndOfBody() {
		const scopes: ['user' | 'workspace', string][] = [['user', 'User']];
		if (workspace.workspaceFolders !== undefined && workspace.workspaceFolders.length) {
			scopes.push(['workspace', 'Workspace']);
		}

		const flowDir = path.dirname(this._graphFilePath);
		let graphNodes = getArkFBPFlowGraphNodes(flowDir);
		let graphIndexNodes = getArkFBPGraphNodes(this._graphFilePath);

		// Merge graphNodes & graphIndexNodes
		graphIndexNodes.forEach((node: GraphNode) => {
			if(graphNodes.length === 0) {
				node.base = node.cls;
				node.name = node.cls;
			}
			for (var i = 0; i < graphNodes.length; ++i) {
				const graphNode = graphNodes[i];
				if (graphNode.name === node.cls) {
					node.name = graphNode.name;
					node.base = graphNode.base;
					break;
				} else {
					node.base = node.cls;
					node.name = node.cls;
				}
			}
		});

		const state: PreviewState = {
			graphNodes: graphIndexNodes,
		};

		return `<script type="text/javascript" nonce="Z2l0bGVucy1ib290c3RyYXA=">window.state = ${JSON.stringify(
			state
		)}; window.acquireVsCodeApi = acquireVsCodeApi();</script>`;
	}
}
