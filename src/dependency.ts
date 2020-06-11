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
  import { ScriptEventEmitter, MaybeScript } from "./types";

  class Item extends TreeItem {
    constructor(
      public readonly label: string,
      public readonly collapsibleState: TreeItemCollapsibleState,
      public readonly tooltip: string,
    ) {
      super(label, collapsibleState);
    }

    iconPath = {
      light: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "light",
        "file_type_npm.svg"
      ),
      dark: path.join(
        __filename,
        "..",
        "..",
        "resources",
        "dark",
        "file_type_npm.svg"
      )
    };

    contextValue = "dependency";
  }

  function getPackageJson(root: string): string {
    return path.join(root, "package.json");
  }

  export class DependencyProvider
    implements TreeDataProvider<Item> {
    private readonly _onDidChangeTreeData: ScriptEventEmitter = new EventEmitter();
    public readonly onDidChangeTreeData: Event<MaybeScript> = this
      ._onDidChangeTreeData.event;

    constructor(private readonly context:vscode.ExtensionContext, private readonly workspaceRoot: string) {
      const pattern = path.join(workspaceRoot, 'package.json');
      const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
      fileWatcher.onDidChange(() => {
        this.refresh();
      });
    }

    refresh(): void {
      this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Item): TreeItem {
      return element;
    }

    getChildren(
      element?: Item
    ): Thenable<Item[]> {
      return new Promise((resolve: Function) => {
        const folders: any = workspace.workspaceFolders;
        if (element) {
          // Workspace render scripts
          const folder: WorkspaceFolder = folders.find(
            (o: any) => o.name === element.label
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

    private renderMultipleWorkspaces(
      resolve: Function,
      folders: WorkspaceFolder[]
    ): void {
      resolve(this.mkTreeItemsForWorkspace(folders));
    }

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
    ): Item[] {
      const workspaceFolders: any = workspace.workspaceFolders;
      const treeItems: Item[] = [];
      folders.forEach((folder: WorkspaceFolder): void => {
        const workspaceRoot: string = folder.uri.fsPath;
        const packageJsonPath: string = getPackageJson(workspaceRoot);
        const name = folder.name;
        if (this.pathExists(packageJsonPath)) {
          treeItems.push(
            new Item(
              name,
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
     * @returns {Item[]}
     * @memberof ScriptNodeProvider
     */
    private mkTreeItemsFromPackageScripts(
      packageJsonPath: string
    ): Item[] {
      const treeItems: Item[] = [];
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
      const toScript = (
        scriptName: string,
        scriptCommand: string
      ): Item => {
        const item = new Item(
          scriptName,
          TreeItemCollapsibleState.None,
          scriptCommand,
        );

        item.iconPath = item.iconPath = {
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

        return item;
      };

      const dependencies = packageJson.dependencies;
      for (const key in dependencies) {
        treeItems.push(toScript(key, dependencies[key]));
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