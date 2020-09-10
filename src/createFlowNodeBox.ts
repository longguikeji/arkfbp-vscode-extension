import { window } from 'vscode';
import * as vscode from 'vscode';
import * as arkfbp from './arkfbp';
import { idText } from 'typescript';
import { previewWebviewList } from './extension'
import { PreviewWebview } from './webviews/previewWebview';

export async function showCreateFlowNodeBox(flowReference?: string, node?: {type: string}) {
	const flowName = node ? flowReference : await window.showInputBox({
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

	const baseClassName = node ? `${node.type}Node` : await window.showQuickPick(
		[
			'StartNode',
			'StopNode',
			'FunctionNode',
			'IFNode',
			'SwitchNode',
			'APINode',
			'NopNode',
			'LoopNode',
			'TestNode',
			'FlowNode',
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

	const graphFilePath = arkfbp.getGraphFilePath(flowName);

	arkfbp.updateFlowGraph('createNode', graphFilePath, {
		cls: className,
		id: nodeID,
		filename: filename,
		x: 30,
		y: 30,
	});

	const previewWebview = previewWebviewList.find((item: PreviewWebview) => item.graphFilePath === graphFilePath);

	if(previewWebview) {
		previewWebview.resetPanel();
	}

	window.showInformationMessage(`新节点${className}创建成功`);
}
