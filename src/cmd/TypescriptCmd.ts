import BaseCmd from './BaseCmd';
import * as vscode from 'vscode';

export default class TypescriptCmd extends BaseCmd{
  create(workspaceRoot: string, terminal?: vscode.Terminal):void{
    console.log('typescript', workspaceRoot);
  }
}