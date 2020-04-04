import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem | null = null;

function updateStatusBarItem(): void {
    if (statusBarItem === null) {
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.command = 'arkfbp.welcome';
    }

    statusBarItem.text = `$(heart) ArkFBP`;
    statusBarItem.show();
}

export function registerStatusBarItem(context: vscode.ExtensionContext) {
    context.subscriptions.push(statusBarItem);
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
	context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem));
	updateStatusBarItem();
}