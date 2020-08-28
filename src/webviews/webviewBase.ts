import * as paths from 'path';
import * as fs from 'fs';
import {
	commands,
	ConfigurationChangeEvent,
	ConfigurationTarget,
	Disposable,
	Uri,
	ViewColumn,
	WebviewPanel,
	WebviewPanelOnDidChangeViewStateEvent,
	window,
	workspace
} from 'vscode';
import {
	DidChangeConfigurationNotificationType,
	IpcMessage,
	IpcNotificationParamsOf,
	IpcNotificationType,
	onIpcCommand,
	UpdateConfigurationCommandType
} from './protocol';
import { ExtensionContext } from 'vscode';
import { getFlowReference, updateFlowGraph, openNodeFileFromGraph } from './../arkfbp';
import { showCreateFlowNodeBox } from './../createFlowNodeBox';
// import { Commands } from '../commands';

let ipcSequence = 0;

const emptyCommands: Disposable[] = [
	{
		dispose: function() {
			/* noop */
		}
	}
];

export abstract class WebviewBase implements Disposable {
	//protected _disposable: Disposable;
	private _disposablePanel: Disposable | undefined;
	private _panel: WebviewPanel | undefined;

	// constructor(showCommand: Commands, private readonly _column?: ViewColumn) {
	// 	// this._disposable = Disposable.from(
	// 	// 	configuration.onDidChange(this.onConfigurationChanged, this),
	// 	// 	commands.registerCommand(showCommand, this.onShowCommand, this)
	// 	// );
	// }

	constructor(private readonly _context: ExtensionContext) {
		// this._disposable = Disposable.from(
		// 	configuration.onDidChange(this.onConfigurationChanged, this),
		// 	commands.registerCommand(showCommand, this.onShowCommand, this)
		// );
	}

	abstract get filename(): string;
	abstract get id(): string;
	abstract get title(): string;

	registerCommands(): Disposable[] {
		return emptyCommands;
	}

	renderHead?(): string | Promise<string>;
	renderBody?(): string | Promise<string>;
	renderEndOfBody?(): string | Promise<string>;

	dispose() {
		// this._disposable && this._disposable.dispose();
		this._disposablePanel && this._disposablePanel.dispose();
	}

	// protected onShowCommand() {
	// 	this.show(this._column);
	// }

	// private onConfigurationChanged(e: ConfigurationChangeEvent) {
	// 	this.notifyDidChangeConfiguration();
	// }

	private onPanelDisposed() {
		this._disposablePanel && this._disposablePanel.dispose();
		this._panel = undefined;
	}

	// private onViewStateChanged(e: WebviewPanelOnDidChangeViewStateEvent) {
	// 	// Anytime the webview becomes active, make sure it has the most up-to-date config
	// 	if (e.webviewPanel.active) {
	// 		this.notifyDidChangeConfiguration();
	// 	}
	// }

	protected onMessageReceived(e: IpcMessage) {
		switch (e.method) {
			case UpdateConfigurationCommandType.method:
				onIpcCommand(UpdateConfigurationCommandType, e, async params => {
					// const target =
					// 	params.scope === 'workspace' ? ConfigurationTarget.Workspace : ConfigurationTarget.Global;

					// for (const key in params.changes) {
					// 	const inspect = configuration.inspect(key as any)!;

					// 	let value = params.changes[key];
					// 	if (value !== undefined) {
					// 		if (params.scope === 'workspace') {
					// 			if (value === inspect.workspaceValue) {
					// 				continue;
					// 			}
					// 		} else {
					// 			if (value === inspect.globalValue && value !== inspect.defaultValue) {
					// 				continue;
					// 			}

					// 			if (value === inspect.defaultValue) {
					// 				value = undefined;
					// 			}
					// 		}
					// 	}

					// 	void (await configuration.update(key as any, value, target));
					// }

					// for (const key of params.removes) {
					// 	void (await configuration.update(key as any, undefined, target));
					// }
				});

				break;
			default:
				break;
		}
	}

	private onMessageReceivedCore(e: IpcMessage) {
		if (e === null) {
			return;
		}
		this.onMessageReceived(e);
	}

	get visible() {
		return this._panel === undefined ? false : this._panel.visible;
	}

	hide() {
		if (this._panel === undefined) {
			return;
		}

		this._panel.dispose();
	}

	setTitle(title: string) {
		if (this._panel === undefined) {
			return;
		}

		this._panel.title = title;
	}

	async show(graphFilePath: string, column: ViewColumn = ViewColumn.Active): Promise<void> {
		const html = await this.getHtml();

		if (this._panel === undefined) {
			this._panel = window.createWebviewPanel(
				this.id,
				this.title,
				{ viewColumn: column, preserveFocus: false },
				{
					retainContextWhenHidden: true,
					enableFindWidget: true,
					enableCommandUris: true,
					enableScripts: true
				}
			);

			//this._panel.iconPath = Uri.file(Container.context.asAbsolutePath('images/gitlens-icon.png'));
			this._disposablePanel = Disposable.from(
				this._panel,
				this._panel.onDidDispose(this.onPanelDisposed, this),
				// this._panel.onDidChangeViewState(this.onViewStateChanged, this),
				this._panel.webview.onDidReceiveMessage(this.onMessageReceivedCore, this),
				...this.registerCommands()
			);

			this._panel.webview.html = html;

			this.getMessage(graphFilePath);
		} else {
			this.resetPanel();
		}
	}

	// Reset the html to get the webview to reload
	async resetPanel() {
		const html = await this.getHtml();

		if (this._panel === undefined) {
			return;
		}
		
		this._panel.webview.html = '';
		this._panel.webview.html = html;
		this._panel.reveal(this._panel.viewColumn || ViewColumn.Active, false);
	}

	private _html: string | undefined;
	private async getHtml(): Promise<string> {
		const filename = this._context.asAbsolutePath(paths.join('dist/webviews/', this.filename));

		let content;
		// When we are debugging avoid any caching so that we can change the html and have it update without reloading
		const debug = true;
		if (debug) {
			content = await new Promise<string>((resolve, reject) => {
				fs.readFile(filename, 'utf8', (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				});
			});
		} else {
			if (this._html !== undefined) {
				return this._html;
			}

			const doc = await workspace.openTextDocument(filename);
			content = doc.getText();
		}

		let html = content.replace(
			/#{root}/g,
			Uri.file(this._context.asAbsolutePath('.'))
				.with({ scheme: 'vscode-resource' })
				.toString()
		);

		if (this.renderHead) {
			html = html.replace(/#{head}/i, await this.renderHead());
		}

		if (this.renderBody) {
			html = html.replace(/#{body}/i, await this.renderBody());
		}

		if (this.renderEndOfBody) {
			html = html.replace(/#{endOfBody}/i, await this.renderEndOfBody());
		}

		this._html = html;
		return html;
	}

	protected notify<NT extends IpcNotificationType>(type: NT, params: IpcNotificationParamsOf<NT>): Thenable<boolean> {
		return this.postMessage({ id: this.nextIpcId(), method: type.method, params: params });
	}

	private nextIpcId() {
		if (ipcSequence === Number.MAX_SAFE_INTEGER) {
			ipcSequence = 1;
		} else {
			ipcSequence++;
		}

		return `host:${ipcSequence}`;
	}

	// private notifyDidChangeConfiguration() {
	// 	// Make sure to get the raw config, not from the container which has the modes mixed in
	// 	return this.notify(DidChangeConfigurationNotificationType, { config: configuration.get() });
	// }

	private postMessage(message: IpcMessage) {
		if (this._panel === undefined) {
			return Promise.resolve(false);
		}

		return this._panel.webview.postMessage(message);
	}
	
	// Handle messages from the webview
	private getMessage(graphFilePath: string) {
		if(this._panel === undefined) {
			return;
		}
		
		this._panel.webview.onDidReceiveMessage( 
			 async (message: any) => {
				switch (message.command) {
					case 'createNode':
						const flowReference = getFlowReference(graphFilePath);
						await showCreateFlowNodeBox(flowReference, message.node);
						this.resetPanel();
						return;
					case 'selectNode':
						openNodeFileFromGraph(graphFilePath, message.node);
						return;
					case 'moveNode':
						updateFlowGraph('moveNode', graphFilePath, message.node);
						return;
					case 'removeNode':
						updateFlowGraph('removeNode', graphFilePath, message.node);
						this.resetPanel();
						return;
					case 'createEdge':
						updateFlowGraph('updateEdge', graphFilePath, message.node);
						return;
					case 'removeEdge':
						updateFlowGraph('updateEdge', graphFilePath, message.node);
						this.resetPanel();
						return;
				}
			},
			null,
			[]
		);
	}
}
