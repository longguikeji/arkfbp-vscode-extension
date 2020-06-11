import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');


export async function showRunFlowInputsBox() {
    const cwd = vscode.workspace.workspaceFolders![0].uri.path;

    const inputsFormat = await window.showQuickPick(
		[
			'JSON',
			'String',
		],
	{
		placeHolder: '选择参数类型',
    });

	const inputs = await window.showInputBox({
		value: inputsFormat === 'JSON' ? '{}' : '',
		placeHolder: '填写运行参数',
	});

	return {
        format: inputsFormat,
        data: inputs,
    };
}