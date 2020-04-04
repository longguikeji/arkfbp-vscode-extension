import { window } from 'vscode';
import * as vscode from 'vscode';
import cp = require('child_process');

export async function showCreateFlowNodeBox() {
	const flowName = await window.showInputBox({
		placeHolder: "流名称"
	});

	if (typeof flowName === 'undefined') {
		return;
	}

	const nodeID = await window.showInputBox({
		placeHolder: "节点ID"
	});

	if (typeof nodeID === 'undefined') {
		return;
	}

	const className = await window.showInputBox({
		placeHolder: "节点类名"
	});

	if (typeof className === 'undefined') {
		return;
	}

	const baseClassName = await window.showQuickPick(
		[
			'StartNode',
			'StopNode',
			'IFNode',
			'APINode',
			'NopNode',
			'LoopNode',
			'TestNode',
		],
	{
		placeHolder: '选择基础节点',
	});

	if (typeof baseClassName === 'undefined') {
		return;
	}

	const cwd = vscode.workspace.workspaceFolders![0].uri.path;
	let stdout = cp.execFileSync('arkfbp-cli', ['createnode', '--flow', `${flowName}`, '--base', `${baseClassName}`, '--class', `${className}`, '--id', `${nodeID}`], {
		cwd: cwd,
	});

	console.info(stdout.toString());
	window.showInformationMessage(`工作流节点创建成功`);
}
