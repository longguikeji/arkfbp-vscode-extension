import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  FileSystemWatcher,
  WorkspaceFolder,
  workspace,
  Terminal,
  window,
} from "vscode";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FlowTreeItem } from "./flowTreeItem";
import { ScriptEventEmitter, MaybeScript } from "./types";
import { FlowDirTreeItem } from "./flowDirTreeItem";

import { runCommandInIntegratedTerminal } from './util';
import { getArkFBPFlowRootDir, getArkFBPFlows, getArkFBPAppDir } from './arkfbp';


export class FlowsProvider
  implements TreeDataProvider<FlowTreeItem | FlowDirTreeItem> {
  private readonly _onDidChangeTreeData: ScriptEventEmitter = new EventEmitter();
  public readonly onDidChangeTreeData: Event<MaybeScript> = this
    ._onDidChangeTreeData.event;
  private fileWatcher: FileSystemWatcher;

  constructor(private readonly context: vscode.ExtensionContext, private readonly workspaceRoot: string, private readonly terminal: Terminal) {
    workspace.workspaceFolders.forEach(folder => {
      // const pattern: string = getPackageJson(folder.uri.path);
      // this.fileWatcher = workspace.createFileSystemWatcher(pattern);
      // this.fileWatcher.onDidChange(() => this.refresh());
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  create(): void {
    vscode.commands.executeCommand('arkfbp.createFlow').then(() => {
      this.refresh();
    });
  }

  run(item: FlowTreeItem): void {
    const flowName = item.command.arguments[0];
    const args = ["./dist/cli.js", "run", "--name", `${flowName}`];

    runCommandInIntegratedTerminal(this.terminal, 'node', args, this.workspaceRoot);
  }

  getTreeItem(element: FlowTreeItem | FlowDirTreeItem): TreeItem {
    return element;
  }

  getChildren(
    element?: FlowTreeItem | FlowDirTreeItem
  ): Thenable<(FlowTreeItem | FlowDirTreeItem)[]> {
    return new Promise((resolve: Function) => {
      const folders: any = workspace.workspaceFolders;
      if (element) {

        console.info(element, 'getChildren');
        const root = getArkFBPAppDir();

        const dir: string = path.join(
          element.dir,
          element.label,
        );

        console.info(dir);

        this.renderSingleWorkspace(resolve, dir);
      } else {
        // Root render scripts
        this.renderSingleWorkspace(resolve);
      }
    });
  }


  /**
   * Render tree items for a single project workspace
   *
   * @private
   * @param {any} element
   * @param {any} resolve
   * @memberof ScriptNodeProvider
   */
  private renderSingleWorkspace(
    resolve: Function,
    rootPath?: string
  ): void {
    if (!rootPath) {
      rootPath = getArkFBPFlowRootDir(this.workspaceRoot);
    }

    if (this.pathExists(rootPath)) {
      resolve(this.mkTreeItemsFromPackageScripts(rootPath));
    } else {
      vscode.window.showInformationMessage("Workspace has no flows directory");
      resolve([]);
    }
  }

  /**
  * Takes a path to project, return a list of all keys
  * from the scripts section
  *
  * @private
  * @param {string} flowsRootPath
  * @returns {FlowTreeItem[]}
  * @memberof ScriptNodeProvider
  */
  private mkTreeItemsFromPackageScripts(
    flowsRootPath: string
  ): (FlowTreeItem | FlowDirTreeItem)[] {
    const treeItems: (FlowTreeItem | FlowDirTreeItem)[] = [];
    const flows = getArkFBPFlows(flowsRootPath, true);

    flows.forEach(element => {
      if (typeof element === 'string') {
        const cmd = element as string;
        const r = getArkFBPFlowRootDir(getArkFBPAppDir());
        const x = flowsRootPath.slice(r.length + 1);

        const item = new FlowTreeItem(
          `${cmd}`,
          flowsRootPath,
          TreeItemCollapsibleState.None,
          cmd,
          {
            title: "Run Flow",
            command: "arkfbp.explorer.flow.action.run",
            arguments: [x.length > 0 ? x + '/' + cmd : cmd, flowsRootPath]
          }
        );

        item.iconPath = {
          light: path.join(
            this.context.extensionPath,
            "resources",
            "light",
            "file_type_npm.svg"
          ),
          dark: path.join(
            this.context.extensionPath,
            "resources",
            "dark",
            "file_type_npm.svg"
          )
        };
        treeItems.push(item);
      } else {
        const item = new FlowDirTreeItem(
          element[0],
          flowsRootPath,
          TreeItemCollapsibleState.Collapsed,
          null,
        );

        item.iconPath = {
          light: path.join(
            this.context.extensionPath,
            "resources",
            "light",
            "folder.svg"
          ),
          dark: path.join(
            this.context.extensionPath,
            "resources",
            "dark",
            "folder.svg"
          )
        };

        treeItems.push(item);
      }

    });

    return treeItems;
  }

  /**
   * Safely determine if a path exists on disk. (Safely, ie: Doesn't throw)
   *
   * @private
   * @param {string} p
   * @returns {boolean}
   * @memberof ScriptNodeProvider
   */
  private pathExists(p: string): boolean {
    try {
      fs.accessSync(p);
    } catch (err) {
      return false;
    }

    return true;
  }
}