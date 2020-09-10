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
import { getArkFBPFlowRootDir, getArkFBPFlows, getArkFBPAppDir, isArkFBPApp } from './arkfbp';
import * as arkfbp from './arkfbp';
import { showCreateFlowFolderBox, showRenameBox } from './createFlowFolderBox';
import { showCreateFlowBox } from './createFlowBox';
import * as copydir from 'copy-dir';
import * as box from './box';

export class FlowsProvider
  implements TreeDataProvider<FlowTreeItem | FlowDirTreeItem> {
  private readonly _onDidChangeTreeData: ScriptEventEmitter = new EventEmitter();
  public readonly onDidChangeTreeData: Event<MaybeScript> = this
    ._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext, private readonly workspaceRoot: string, private readonly terminal: Terminal) {
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  async create(p?: string) {
    let flowReference: string = '';
    if (typeof p !== 'undefined') {
      if (path.isAbsolute(p)) {
        // extract last flow part
        const flowRootDir = arkfbp.getArkFBPFlowRootDir(arkfbp.getArkFBPAppDir());
        if (p.indexOf(flowRootDir) >= 0) {
          flowReference = p.slice(flowRootDir.length + 1);
        }
      }

      flowReference = flowReference.replace('/', '.');
    }

    if(flowReference !== '') {
      const result = await showCreateFlowBox(flowReference);
    } else {
      const result = await showCreateFlowBox();
    }
    
    this.refresh();
  }

  async createFolder(p?: string) {
    if (typeof p === 'undefined') {
      p = arkfbp.getArkFBPFlowRootDir();
    } else {
      if (!path.isAbsolute(p)) {
        p = path.join(arkfbp.getArkFBPFlowRootDir(), p);
      }
    }

    const result = await showRenameBox(p);
    this.refresh();
  }

  async rename(dir: string, label: string) {
    const result = await showCreateFlowFolderBox(label);
    if(!result) {
      return;
    }

    fs.rename(path.join(dir, label), path.join(dir, result), () => {
      this.refresh();
    });
  }

  copy(p: string) {
    const srcName = path.basename(p);
    let dstName: string = p;
    while (1) {
      const x = dstName.charCodeAt(dstName.length - 1);
      if (x >= 48 && x <= 57) {
        dstName = dstName.slice(0, dstName.length - 1) + (Number(String.fromCharCode(x)) + 1).toString();
      } else {
        dstName = dstName + '1';
      }
      if (!fs.existsSync(dstName)) {
        break;
      }
    }

    copydir.sync(p, dstName);
    this.refresh();
  }

  async run(item: FlowTreeItem) {
    const flowName = item.reference;

    const inputs = await box.showRunFlowInputsBox();

    if(!inputs) {
      return;
    }

    arkfbp.runFlow(this.workspaceRoot, this.terminal, flowName, inputs.format, inputs.data);
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
        const root = getArkFBPAppDir();

        const dir: string = path.join(
          element.dir,
          element.label,
        );

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
      resolve([]);
    }
  }

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
        const reference = x.length > 0 ? x + '/' + cmd : cmd;

        const item = new FlowTreeItem(
          `${cmd}`,
          flowsRootPath,
          TreeItemCollapsibleState.None,
          '',
          reference,
          {
            title: "Open flow definition",
            command: "arkfbp.explorer.flow.action.openGraphDefinitionFile",
            arguments: [reference],
          }
        );

        item.iconPath = {
          light: path.join(
            this.context.extensionPath,
            "resources",
            "light",
            "icon-status-copied.svg"
          ),
          dark: path.join(
            this.context.extensionPath,
            "resources",
            "dark",
            "icon-status-copied.svg"
          )
        };
        treeItems.push(item);
      } else {
        const item = new FlowDirTreeItem(
          element[0],
          flowsRootPath,
          TreeItemCollapsibleState.Collapsed,
          '',
        );

        item.iconPath = {
          light: path.join(
            this.context.extensionPath,
            "resources",
            "light",
            "icon-open-folder.svg"
          ),
          dark: path.join(
            this.context.extensionPath,
            "resources",
            "dark",
            "icon-open-folder.svg"
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