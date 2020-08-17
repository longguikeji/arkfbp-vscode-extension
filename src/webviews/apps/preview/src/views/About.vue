<template>
  <div class="about">
    <component v-if="workflow" :is="flowEditor" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { Workflow, Edge } from "./../flow/workflows/";
import { NodeTree } from "./../flow/nodes/nodeTree";
import {
  StartNode,
  StopNode,
  APINode,
  FunctionNode,
  NopNode,
  Node,
} from "./../flow/nodes";

@Component({
  components: {
  }
})
export default class About extends Vue {
  private workflow: Workflow|null = null

  get vscode() {
    return (window as any).acquireVsCodeApi
  }

  get flowEditor() {
    return {render: h => h('FlowEditor', {
        props: {
            workflow: this.workflow,
        },
        on: {
            moveNode: this.flowMoveNode,
            addEdge: this.flowAddEdge,
            selectNode: this.flowSelectNode,
            remove: this.flowRemoveSelected,
        },
    })}
  }

  flowMoveNode(payload: { workflow: Workflow, node: Node; x: number; y: number }) {
    const edge = payload.workflow.edges.find((item: Edge) => item[0] === payload.node.id)
    debugger
    this.vscode.postMessage({
      command: 'moveNode',
      node: {
        id: payload.node.id,
        cls: payload.node.cls,
        filename: payload.node.fileName,
        x: payload.x,
        y: payload.y,
        next: edge ? edge[1] : null
      }
    })
  }

  flowAddEdge(payload: { from: Node; to: Node }) {
    this.vscode.postMessage({
      command: 'addEdge',
      node: {
        id: payload.from.id,
        cls: payload.from.cls,
        filename: payload.from.fileName,
        x: payload.from.position[0],
        y: payload.from.position[1],
        next: payload.to.id,
      }
    })
  }

  flowSelectNode() {

  }

  flowRemoveSelected() {

  }

  mounted() {
    const nodes = (window as any).state.graphNodes;

    const nodeTree = new NodeTree("/");
    const edges: Edge[] = [];

    for (let i = 0; i < nodes.length; ++i) {
      console.info(i);
      switch (nodes[i].base) {
        case 'APINode':
          const apiNode = new APINode(nodes[i].id, `${nodes[i].cls}.js`)
          apiNode.cls = nodes[i].cls
          apiNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(apiNode, nodeTree);
          break;
        case 'StartNode':
          const startNode = new StartNode(nodes[i].id, `${nodes[i].cls}.js`)
          startNode.cls = nodes[i].cls
          startNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(startNode, nodeTree);
          break;
        case 'StopNode':
          const stopNode = new StopNode(nodes[i].id, `${nodes[i].cls}.js`)
          stopNode.cls = nodes[i].cls
          stopNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(stopNode, nodeTree);
          break;
        case 'FunctionNode':
          const functionNode = new FunctionNode(nodes[i].id, `${nodes[i].cls}.js`)
          functionNode.cls = nodes[i].cls
          functionNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(functionNode, nodeTree);
          break;
        case 'NopNode':
          const nopNode = new NopNode(nodes[i].id, `${nodes[i].cls}.js`)
          nopNode.cls = nodes[i].cls
          nopNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(nopNode, nodeTree);
          break;
        default:
          console.info('base...', nodes[i].base);
          break;
      }

      if (typeof nodes[i].next !== 'undefined') {
        edges.push([nodes[i].id, nodes[i].next]);
      }
    }

    const wf = new Workflow("wf", "wf", nodeTree, edges);

    this.workflow = wf;
  }
}
</script>
