import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');

export async function showCreateFlowBox(root?: string) {
	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	let result = await window.showInputBox({
		value: '',
		valueSelection: [2, 4],
		placeHolder: '填写工作流的名称',
		validateInput: text => {
			text = text.trim();
			if (text.length === 0) {
				return "无效的工作流名称";
			}

			return null;
		}
	});

	if (typeof result === 'undefined') {
		return;
	}

	if (typeof root !== 'undefined') {
		result = root + '.' + result;
	}

	let stdout = cp.execFileSync('arkfbp', ['createflow', `${result}`], {
		cwd: cwd,
	});

	console.info(stdout.toString());
	window.showInformationMessage(`工作流${result}创建成功`);
}
