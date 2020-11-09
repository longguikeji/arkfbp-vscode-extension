import BaseCmd from './BaseCmd';
import * as vscode from 'vscode';

export default class PythonCmd extends BaseCmd{
  create(workspaceRoot: string, terminal?: vscode.Terminal){
    console.log('python', workspaceRoot);
  }
}