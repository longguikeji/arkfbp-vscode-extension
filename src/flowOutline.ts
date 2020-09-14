import * as vscode from 'vscode';
import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';
import { getArkFBPFlowDirByDocument, getMainFileName } from './arkfbp';

export const COMMAND_SELECTION = 'arkfbp.explorer.flowOutline.action.selection';
export const COMMAND_REFRESH = 'arkfbp.explorer.flowOutline.action.refresh';

export function syntaxKindToName(kind: ts.SyntaxKind) {
  return ts.SyntaxKind[kind];
}

export function getNodes(node: ts.Node) {
  const nodes: ts.Node[] = [];
  ts.forEachChild(node, cbNode => {
    nodes.push(cbNode);
  });
  return nodes;
}

export function posToLine(scode: string, pos: number) {
  const code = scode.slice(0, pos).split('\n');
  return new vscode.Position(code.length - 1, code[code.length - 1].length);
}

export interface AstNode {
  indexs?: number[];
  kind?: ts.SyntaxKind;
  pos?: number;
  end?: number;
  node?: any;
  id?: string;
  cls?: string;
  isDirectory?: boolean;
}

export class AstModel {
  private sfile: ts.SourceFile = ts.createSourceFile('ast.ts', ``, ts.ScriptTarget.Latest);
  constructor() { }
  private _getAst() {
    const editor = vscode.window.activeTextEditor;
    if (editor !== undefined) {
      const flowDirPath = getArkFBPFlowDirByDocument(editor.document);
      if (flowDirPath !== '') {
        const content = fs.readFileSync(path.join(flowDirPath, getMainFileName())).toString();
        this.sfile = ts.createSourceFile(
          path.join(flowDirPath, getMainFileName()),
          content,
          ts.ScriptTarget.Latest
        );
      } else {
        this.sfile = ts.createSourceFile('ast.ts', ``, ts.ScriptTarget.Latest);
      }
    }
  }

  public get roots(): AstNode[] {
    this._getAst();
    const nodes = getNodes(this.sfile).map((node, index) => {
      return {
        indexs: [index],
        kind: node.kind,
        pos: node.pos,
        end: node.end,
        node: node,
        isDirectory: getNodes(node).length > 0,
      };
    }).filter((node: AstNode) => {
      if (node.kind && syntaxKindToName(node.kind) === 'ClassDeclaration') {
        return true;
      }

      return false;
    });

    return nodes;
  }

  public getXChildren(parent: AstNode): AstNode[] {
    const childNodes = parent!.indexs!.reduce((childs, index) => {
      return getNodes(childs[index]);
    }, getNodes(this.sfile));

    return childNodes.map((node, index) => {
      return {
        indexs: parent!.indexs!.concat([index]),
        kind: node.kind,
        pos: node.pos,
        end: node.end,
        node: node,
        isDirectory: getNodes(node).length > 0,
      };
    });
  }

  public getChildren(parent: AstNode): AstNode[] {
    let methods = this.getXChildren(parent);
    methods = methods.filter((node: AstNode) => {
      if (node.kind && syntaxKindToName(node.kind) !== 'MethodDeclaration') {
        return false;
      }

      if (node.node && node.node.name && node.node.name.escapedText !== 'createNodes') {
        return false;
      }

      return true;
    });

    if (methods.length === 0) {
      return [];
    }

    const createNodesFunc = methods[0];
    const ret = this.getXChildren(createNodesFunc);

    const returnStatement = ret[1].node.statements[0];
    const elements = returnStatement.expression.elements;
    const flowNodes = elements.map((element: any) => {
      const p: AstNode = {
        pos: element.pos,
        end: element.end,
      };
      for (let i = 0; i < element.properties.length; ++i) {
        const prop = element.properties[i];
        if (prop.name.escapedText === 'cls') {
          p['cls'] = prop.initializer.escapedText;
        }
        if (prop.name.escapedText === 'id') {
          p['id'] = prop.initializer.text;
        }
      }
      return p;
    });

    return flowNodes;
  }
}

export class FlowOutlineProvider implements vscode.TreeDataProvider<AstNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly model: AstModel = new AstModel()
  ) {
    this.context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => this.didChange()));
    this.context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => this.didChange()));
  }
  public refresh(): any {
    this._onDidChangeTreeData.fire();
  }

  public copy(p: string) {
    // const srcName = path.basename(p);
    // let dstName: string = p;
    // while (1) {
    //   const x = dstName.charCodeAt(dstName.length - 1);
    //   if (x >= 48 && x <= 57) {
    //     dstName = dstName.slice(0, dstName.length - 1) + (Number(String.fromCharCode(x)) + 1).toString();
    //   } else {
    //     dstName = dstName + '1';
    //   }
    //   if (!fs.existsSync(dstName)) {
    //     break;
    //   }
    // }

    // copydir.sync(p, dstName);
    this.refresh();
  }

  public getTreeItem(element: AstNode): vscode.TreeItem {
    let label: string;
    if (element['cls']) {
      label = `[#${element['id']}] ${element['cls']}`;
    } else {
      label = 'Graph';
    }

    const item = new vscode.TreeItem(`${label}`);
    item.collapsibleState = element.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : void 0;
    item.command = {
      title: 'open the file',
      command: 'arkfbp.explorer.flowOutline.action.open',
      arguments: [{cls: element['cls']}],
    };

    return item;
  }

  public getChildren(element?: AstNode): AstNode[] | Thenable<AstNode[]> {
    if (element) {
      return this.model.getChildren(element);
    } else {
      if (this.model.roots.length) {
        return this.model.getChildren(this.model.roots[0]);
      } else {
        return [];
      }
    }
  }

  public didChange() {
    if (
      vscode.window.activeTextEditor &&
      vscode.window.activeTextEditor.document.uri.scheme === 'file' &&
      ['javascript', 'typescript'].indexOf(
        vscode.window.activeTextEditor.document.languageId
      ) > -1
    ) {
      this.refresh();
    }
  }
}