import {
  Event,
  EventEmitter,
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
} from "vscode";
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FlowTreeItem } from "./flowTreeItem1";
import { ScriptEventEmitter, MaybeScript } from "./types";
import { FlowDirTreeItem } from "./flowDirTreeItem1";

import { getArkFBPAppDir } from './arkfbp';
import * as arkfbp from './arkfbp';
import { Database, Table, Column, DataType } from './models/database';

import { showCreateDatabaseBox } from './createDatabaseBox';

class DatabaseTreeItem extends TreeItem {

  constructor(
    public readonly database: Database,
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super(`[${database.name}]`, collapsibleState);
  }

  iconPath = ThemeIcon.Folder;
  contextValue = "database";

}

class TableTreeItem extends TreeItem {

  constructor(
    public readonly database: Database,
    public readonly table: Table,
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super(table.name, collapsibleState);
  }

  iconPath = ThemeIcon.Folder;
  contextValue = "table";

}

class ColumnTreeItem extends TreeItem {

  constructor(
    public readonly database: Database,
    public readonly table: Table,
    public readonly column: Column,
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super(column.name, collapsibleState);
  }

  iconPath = ThemeIcon.Folder;
  contextValue = "column";
}

class SnapshotTreeItem extends TreeItem {

  constructor(
    public readonly database: Database,
    public readonly table: Table,
    public readonly snapshot: Table,
    public readonly collapsibleState: TreeItemCollapsibleState,
  ) {
    super(snapshot.version, collapsibleState);
  }

  iconPath = ThemeIcon.Folder;
  contextValue = "snapshot";
}


export class DatabaseProvider
  implements TreeDataProvider<FlowTreeItem | FlowDirTreeItem | DatabaseTreeItem> {
  private readonly _onDidChangeTreeData: ScriptEventEmitter = new EventEmitter();
  public readonly onDidChangeTreeData: Event<MaybeScript> = this
    ._onDidChangeTreeData.event;

  constructor(private readonly context: vscode.ExtensionContext, private readonly workspaceRoot: string) {
  }

  async create() {
    const result = await showCreateDatabaseBox();
    arkfbp.createDatabase({name: result});
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FlowTreeItem | FlowDirTreeItem): TreeItem {
    return element;
  }

  getChildren(
    item?: FlowTreeItem | FlowDirTreeItem | DatabaseTreeItem | TableTreeItem | ColumnTreeItem | SnapshotTreeItem
  ): Thenable<(FlowTreeItem | FlowDirTreeItem)[]> {
    return new Promise((resolve: Function) => {
      if (item instanceof DatabaseTreeItem) {
        this.renderTables(resolve, item.database);
      } else if (item instanceof TableTreeItem) {
        this.renderColumns(resolve, item.database, item.table);
      } else {
        this.renderDatabases(resolve);
      }
    });
  }

  private renderDatabases(
    resolve: Function,
  ): void {
    const treeItems: DatabaseTreeItem[] = [];
    const databases = arkfbp.getDatabases();

    databases.forEach(database => {
      const item = new DatabaseTreeItem(
        database,
        TreeItemCollapsibleState.Expanded,
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
    });

    resolve(treeItems);
  }

  private renderTables(
    resolve: Function,
    database: Database
  ): void {

    const treeItems: TableTreeItem[] = [];

    database.tables.forEach(table => {
      const item = new TableTreeItem(
        database,
        table,
        TreeItemCollapsibleState.Collapsed,
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
    });

    resolve(treeItems);
  }

  private renderColumns(
    resolve: Function,
    database: Database,
    table: Table,
  ): void {
    const treeItems: ColumnTreeItem[] = [];

    table.columns.forEach(column => {
      const item = new ColumnTreeItem(
        database,
        table,
        column,
        TreeItemCollapsibleState.None,
      );

      let iconName: string = '';
      switch (column.type) {
        case DataType.String:
          iconName = 'icon-string.svg';
          break;
        case DataType.Integer:
          iconName = 'icon-number.svg';
          break;
        case DataType.Double:
          iconName = 'icon-number.svg';
          break;
        case DataType.Boolean:
          iconName = 'icon-boolean.svg';
          break;
      }

      item.iconPath = {
        light: path.join(
          this.context.extensionPath,
          "resources",
          "light",
          iconName,
        ),
        dark: path.join(
          this.context.extensionPath,
          "resources",
          "dark",
          iconName,
        )
      };

      treeItems.push(item);
    });

    resolve(treeItems);
  }

  private renderShapshots(
    resolve: Function,
    database: Database,
    table: Table,
  ): void {
    const treeItems: SnapshotTreeItem[] = [];

    table.snapshots.forEach(snapshot => {
      const item = new SnapshotTreeItem(
        database,
        table,
        snapshot,
        TreeItemCollapsibleState.None,
      );

      treeItems.push(item);
    });

    resolve(treeItems);
  }

}