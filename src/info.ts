import {
    Event,
    EventEmitter,
    TreeDataProvider,
    TreeItem,
    TreeItemCollapsibleState,
    FileSystemWatcher,
    WorkspaceFolder,
    workspace
  } from "vscode";
  import * as vscode from "vscode";
  import * as fs from "fs";
  import * as path from "path";
  import { FlowTreeItem } from "./FlowTreeItem";
  import { ScriptEventEmitter, MaybeScript } from "./types";
  import { FlowDirTreeItem } from "./FlowDirTreeItem";
  import * as yaml from 'js-yaml';

  function getPackageJson(root: string): string {
    return path.join(root, ".arkfbp", "config.yml");
  }

  export class NpmScriptsNodeProvider
    implements TreeDataProvider<FlowTreeItem | FlowDirTreeItem> {
    private readonly _onDidChangeTreeData: ScriptEventEmitter = new EventEmitter();
    public readonly onDidChangeTreeData: Event<MaybeScript> = this
      ._onDidChangeTreeData.event;
    private fileWatcher: FileSystemWatcher;

    constructor(private readonly workspaceRoot: string) {
      workspace.workspaceFolders.forEach(folder => {
        const pattern: string = getPackageJson(folder.uri.path);
        this.fileWatcher = workspace.createFileSystemWatcher(pattern);
        this.fileWatcher.onDidChange(() => this.refresh());
      });
    }

    refresh(): void {
      this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: FlowTreeItem | FlowDirTreeItem): TreeItem {
      return element;
    }

    getChildren(
      element?: FlowTreeItem | FlowDirTreeItem
    ): Thenable<FlowTreeItem[] | FlowDirTreeItem[]> {
      return new Promise((resolve: Function) => {
        const folders: any = workspace.workspaceFolders;
        if (element) {
          // Workspace render scripts
          const folder: WorkspaceFolder = folders.find(
            o => o.name === element.label
          );
          const packageJsonPath: string = path.join(
            folder.uri.fsPath,
            "package.json"
          );
          this.renderSingleWorkspace(resolve, packageJsonPath);
        } else if (folders && folders.length > 1) {
          // Root render workspaces
          this.renderMultipleWorkspaces(resolve, folders);
        } else {
          // Root render scripts
          this.renderSingleWorkspace(resolve);
        }
      });
    }

    /**
     * Render tree items for multiple workspaces
     *
     * @private
     * @param {Function} resolve
     * @param {WorkspaceFolder[]} folders
     * @memberof ScriptNodeProvider
     */
    private renderMultipleWorkspaces(
      resolve: Function,
      folders: WorkspaceFolder[]
    ): void {
      resolve(this.mkTreeItemsForWorkspace(folders));
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
      packageJsonPath?: string
    ): void {
      if (!packageJsonPath) {
        packageJsonPath = getPackageJson(this.workspaceRoot);
      }

      if (this.pathExists(packageJsonPath)) {
        resolve(this.mkTreeItemsFromPackageScripts(packageJsonPath));
      } else {
        vscode.window.showInformationMessage("Workspace has no package.json");
        resolve([]);
      }
    }

    private mkTreeItemsForWorkspace(
      folders: WorkspaceFolder[]
    ): FlowDirTreeItem[] {
      const workspaceFolders: any = workspace.workspaceFolders;
      const treeItems: FlowDirTreeItem[] = [];
      folders.forEach((folder: WorkspaceFolder): void => {
        const workspaceRoot: string = folder.uri.fsPath;
        const packageJsonPath: string = getPackageJson(workspaceRoot);
        const name = folder.name;
        if (this.pathExists(packageJsonPath)) {
          treeItems.push(
            new FlowDirTreeItem(
              name,
              '',
              TreeItemCollapsibleState.Collapsed,
              `${name} Workspace Folder`
            )
          );
        }
      });
      return treeItems;
    }

    /**
     * Takes a path to project package.json, return a list of all keys
     * from the scripts section
     *
     * @private
     * @param {string} packageJsonPath
     * @returns {FlowTreeItem[]}
     * @memberof ScriptNodeProvider
     */
    private mkTreeItemsFromPackageScripts(
      packageJsonPath: string
    ): FlowTreeItem[] {
      const treeItems: FlowTreeItem[] = [];
      // const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

      const doc = yaml.safeLoad(fs.readFileSync(packageJsonPath, "utf-8").toString());
      const workspaceDir: string = path.dirname(packageJsonPath);
      const toScript = (
        scriptName: string,
        scriptCommand: string
      ): FlowTreeItem => {
        const cmdObject = {
          title: "Run Script",
          command: "npmScripts.executeCommand",
          arguments: [scriptName, workspaceDir]
        };

        return new FlowTreeItem(
          scriptName,
          '',
          TreeItemCollapsibleState.None,
          scriptCommand,
          cmdObject
        );
      };

      if (doc) {
        treeItems.push(toScript("Type" + ': ' + doc["type"], doc["type"]));
        treeItems.push(toScript("Language" + ': ' + doc["language"], doc["language"]));
        treeItems.push(toScript("ArkFBP" + ': ' + doc["arkfbpSpecVersion"], doc["arkfbpSpecVersion"]));
        treeItems.push(toScript("ArkFBP Cli" + ': ' + doc["arkfbpSpecVersion"], doc["arkfbpSpecVersion"]));
      }
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