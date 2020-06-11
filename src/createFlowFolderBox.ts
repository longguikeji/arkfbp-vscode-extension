import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');
import * as fs from 'fs';
import * as path from 'path';

export async function showCreateFlowFolderBox(label: string) {
	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	const result = await window.showInputBox({
		value: `${label}`,
		placeHolder: '填写新的名称',
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


export async function showRenameBox(root?: string) {
	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	const result = await window.showInputBox({
		value: '',
		// valueSelection: [2, 4],
		placeHolder: '填写工作流文件夹的名称',
		validateInput: text => {
			text = text.trim();
			if (text.length === 0) {
				return "无效的工作流文件夹";
			}

			if (text.indexOf('/') >= 0) {
				return '非法的名称';
			}

			return null;
		}
	});

	if (typeof result === 'undefined') {
		return;
	}

	try {
		if (typeof root === 'undefined') {
			fs.mkdirSync(result);
		} else {
			fs.mkdirSync(path.join(root, result));
		}
		window.showInformationMessage(`工作流文件夹${result}创建成功`);
	} catch(error) {
		window.showErrorMessage(`工作流文件夹${result}创建失败!${error}`);
	}
}