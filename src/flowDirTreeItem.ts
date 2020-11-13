import {
    Command,
    EventEmitter,
    FileSystemWatcher,
    TreeItem,
    TreeItemCollapsibleState,
    ThemeIcon
  } from "vscode";
  import { join as pathJoin } from "path";

  export class FlowDirTreeItem extends TreeItem {
    constructor(
      public readonly label: string,
      public readonly dir: string,
      public readonly collapsibleState: TreeItemCollapsibleState,
      public readonly tooltip: string,
      public readonly command?: Command
    ) {
      super(label, collapsibleState);
      this.dir = dir;
    }
    // iconPath = ThemeIcon.Folder;
    contextValue = "flowFolder";
  }