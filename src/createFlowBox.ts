import { window } from 'vscode';
import * as vscode from 'vscode';
import * as arkfbp from './arkfbp';
import cp = require('child_process');

export async function showCreateFlowBox(root?: string) {
	let isCreateFlow = true;
	if(arkfbp.getLanguageType() === 'python') {
		isCreateFlow = root ? true : false;
	}

	const name = await window.showInputBox({
		value: '',
		valueSelection: [2, 4],
		placeHolder: `填写${isCreateFlow ? '工作流': 'App'}的名称`,
		validateInput: text => {
			text = text.trim();
			if (text.length === 0) {
				return `无效的${isCreateFlow ? '工作流': 'App'}名称`;
			}

			return null;
		}
	});

	if (typeof name === 'undefined') {
		return;
	}

	let flow = name;

	if (typeof root !== 'undefined') {
		flow = root + '/' + flow;
	}

	const languageType = arkfbp.getLanguageType();
	let r: boolean = false;

	if(languageType === 'javascript' || languageType ===  'typescript') {
		r = arkfbp.createJavaScriptFlow({
			flow: flow.replace(/\//g, '.'),
		});
	}

	if(languageType === 'python') {
		let flowPath = arkfbp.getArkFBPFlowRootDir();

		if (typeof root !== 'undefined') {
			flowPath = flowPath + '/' + root;
			const baseFlow = await window.showQuickPick(
				[
					'Base',
					'View',
					'Hook',
				],
			{
				placeHolder: '选择基础节点',
			});
		
			if (typeof baseFlow === 'undefined') {
				return;
			}

			r = arkfbp.createPythonFlow({
				filename: name,
				baseFlow: baseFlow.toLowerCase(),
				flowPath: flowPath,
			});
		} else {
			r = arkfbp.createPythonApp({
				appName: name,
				flowPath: flowPath,
			});
		}
	}

	if (!r) {
		window.showErrorMessage(`${isCreateFlow ? '工作流': 'App'}${name}创建失败`);
	} else {
		window.showInformationMessage(`${isCreateFlow ? '工作流': 'App'}${name}创建成功`);
	}
}
