import { window } from 'vscode';
import * as vscode from 'vscode';
import * as arkfbp from './arkfbp';
import { idText } from 'typescript';

export async function showCreateFlowNodeBox(flowReference?: string) {
	const flowName = await window.showInputBox({
		placeHolder: "流名称",
		value: flowReference ? flowReference : '',
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
			'FunctionNode',
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

	const filename = className[0].toLowerCase() + className.slice(1);

	const r = arkfbp.createNode({
		flow: flowName,
		base: baseClassName,
		class: className,
		id: nodeID,
	});
	if (!r) {
		window.showErrorMessage(`新节点${className}创建失败`);
	}

	arkfbp.updateFlowGraph(flowName, {
		cls: className,
		id: nodeID,
		filename: filename,
	});

	window.showInformationMessage(`新节点${className}创建成功`);
}
