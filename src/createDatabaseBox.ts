import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');


export async function showCreateDatabaseBox() {
	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	const result = await window.showInputBox({
		// value: `${label}`,
		placeHolder: '填写数据库的名称',
		validateInput: text => {
			text = text.trim();
			if (text.length === 0) {
				return "无效的名称";
			}

			if (text.indexOf('/') >= 0) {
				return '非法的名称';
			}

			return null;
		}
	});

	return result;
}