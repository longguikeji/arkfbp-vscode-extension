import { window } from 'vscode';
import * as vscode from 'vscode';
import * as arkfbp from './arkfbp';
import cp = require('child_process');

export async function showCreateFlowBox(root?: string) {
	const flowName = await window.showInputBox({
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

	if (typeof flowName === 'undefined') {
		return;
	}

	let flow = flowName;

	if (typeof root !== 'undefined') {
		flow = root + '.' + flow;
	}

	const r = arkfbp.createFlow({
		flow: flow,
	});
	if (!r) {
		window.showErrorMessage(`工作流${flowName}创建失败`);
	}

	window.showInformationMessage(`工作流${flowName}创建成功`);
}
