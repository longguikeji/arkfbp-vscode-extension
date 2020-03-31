import {
    Command,
    EventEmitter,
    FileSystemWatcher,
    TreeItem,
    TreeItemCollapsibleState
  } from "vscode";
  import { join as pathJoin } from "path";

  export class FlowTreeItem extends TreeItem {
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

    iconPath = {
      light: pathJoin(
        __filename,
        "..",
        "..",
        "..",
        "resources",
        "light",
        "file_type_npm.svg"
      ),
      dark: pathJoin(
        __filename,
        "..",
        "..",
        "..",
        "resources",
        "dark",
        "file_type_npm.svg"
      )
    };

    contextValue = "flow";
  }