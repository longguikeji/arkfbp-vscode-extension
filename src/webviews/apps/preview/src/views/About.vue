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
import { updateFile } from "./../apis/file";

@Component({
  components: {
  }
})
export default class About extends Vue {
  private workflow: Workflow|null = null
  private filePath: string|null = null

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

  flowMoveNode(node: Node, x: number, y: number) {
    console.info(node, x, y)
    updateFile(this.filePath, {
      id: node.id,
      cls: node.cls,
      filename: node.fileName,
    })
  }

  flowAddEdge() {

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
          apiNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(apiNode, nodeTree);
          break;
        case 'StartNode':
          const startNode = new StartNode(nodes[i].id, `${nodes[i].cls}.js`)
          startNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(startNode, nodeTree);
          break;
        case 'StopNode':
          const stopNode = new StopNode(nodes[i].id, `${nodes[i].cls}.js`)
          stopNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(stopNode, nodeTree);
          break;
        case 'FunctionNode':
          const functionNode = new FunctionNode(nodes[i].id, `${nodes[i].cls}.js`)
          functionNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(functionNode, nodeTree);
          break;
        case 'NopNode':
          const nopNode = new NopNode(nodes[i].id, `${nodes[i].cls}.js`)
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

    console.info(1, nodes)
    console.info(2, nodeTree)
    console.info(3, edges)
    console.info(4, (window as any).state.filePath)

    const wf = new Workflow("wf", "wf", nodeTree, edges);

    this.workflow = wf;
    this.filePath = (window as any).state.filePath;
  }
}
</script>
