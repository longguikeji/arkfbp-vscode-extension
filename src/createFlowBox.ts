import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');

export async function showCreateFlowBox() {
	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	const result = await window.showInputBox({
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

	let stdout = cp.execFileSync('arkfbp-cli', ['createflow', `${result}`], {
		cwd: cwd,
	});

	console.info(stdout.toString());
	window.showInformationMessage(`工作流${result}创建成功`);
}
