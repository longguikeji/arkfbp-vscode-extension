import BaseCmd from './BaseCmd';
import * as vscode from 'vscode';

export default class JavascriptCmd extends BaseCmd{
  create(workspaceRoot: string, terminal?: vscode.Terminal):void{
    console.log('javascript', workspaceRoot);
  }
}