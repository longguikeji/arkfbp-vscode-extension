import { Flow, Edge } from "./../flow/workflows/";
import { NodeType, Node } from "./../flow/nodes";
import { NodeID } from './../flow/nodes/node'

const acquireApi = (window as any).acquireVsCodeApi;

function createNode(payload: { type: NodeType }) {
  const { type } = payload;
  acquireApi.postMessage({
    command: 'createNode',
    node: {
      type,
    }
  });
}

function selectNode(payload: { node: Node }) {
  const { node } = payload;
  acquireApi.postMessage({
    command: 'selectNode',
    node: {
      id: node.id,
      cls: node.cls,
      filename: node.fileName,
      x: node.position[0],
      y: node.position[1],
    }
  });
}

function moveNode(payload: { flow: Flow, node: Node; x: number; y: number }) {
  const { flow, node, x, y } = payload;
  const edge = flow.edges.find((item: Edge) => item[0] === node.id);
  acquireApi.postMessage({
    command: 'moveNode',
    node: {
      id: node.id,
      cls: node.cls,
      filename: node.fileName,
      x,
      y,
      next: edge ? edge[1] : null
    }
  });
}

function createEdge(payload: {flow: Flow, from: Node; to: Node }) {
  const {flow, from, to } = payload;
  flow.edges.push([from.id, to.id]);
  acquireApi.postMessage({
    command: 'createEdge',
    node: {
      id: from.id,
      cls: from.cls,
      filename: from.fileName,
      x: from.position[0],
      y: from.position[1],
      next: to.id,
    }
  });
}

function removeSelected(payload: {flow: Flow, selected: Node | [NodeID, NodeID]}) {
  const { flow, selected } = payload;
  if(Array.isArray(selected)) {
    const node = flow.getNodeById(selected[0]) as Node;
    acquireApi.postMessage({
      command: 'removeEdge',
      node: {
        id: node.id,
        cls: node.cls,
        filename: node.fileName,
        x: node.position[0],
        y: node.position[1],
      }
    });
    return;
  }

  if(selected instanceof Node) {
    acquireApi.postMessage({
      command: 'removeNode',
      node: {
        id: selected.id,
        cls: selected.cls,
        filename: selected.fileName,
        x: selected.position[0],
        y: selected.position[1],
      }
    });
  
    flow.edges.forEach((item: Edge) => {
      const node = flow.getNodeById(item[0]) as Node;
      if(item[1] === selected.id) {
        acquireApi.postMessage({
          command: 'removeEdge',
          node: {
            id: node.id,
            cls: node.cls,
            filename: node.fileName,
            x: node.position[0],
            y: node.position[1],
          }
        });
      }
    });
  }
}

export default {
  createNode,
  selectNode,
  moveNode,
  createEdge,
  removeSelected
}