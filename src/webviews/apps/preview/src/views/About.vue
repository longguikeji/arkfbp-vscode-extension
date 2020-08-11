<template>
  <div class="about">
    <FlowEditor v-if="workflow" :workflow="workflow" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import FlowEditor from "./../components/FlowEditor.vue";
import { Workflow, Edge } from "./../flow/workflows/";
import { NodeTree } from "./../flow/nodes/nodeTree";
import {
  StartNode,
  StopNode,
  APINode,
  FunctionNode,
  NopNode,
} from "./../flow/nodes";


@Component({
  components: {
    FlowEditor
  }
})
export default class About extends Vue {
  private workflow: Workflow|null = null

  mounted() {
    const nodes = (window as any).state.graphNodes;

    const nodeTree = new NodeTree("/");
    const edges: Edge[] = [];

    for (let i = 0; i < nodes.length; ++i) {
      console.info(i);
      switch (nodes[i].base) {
        case 'APINode':
          const apiNode = new APINode(nodes[i].id, "xx.js")
          apiNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(apiNode, nodeTree);
          break;
        case 'StartNode':
          const startNode = new StartNode(nodes[i].id, "xx.js")
          startNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(startNode, nodeTree);
          break;
        case 'StopNode':
          const stopNode = new StopNode(nodes[i].id, "xx.js")
          stopNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(stopNode, nodeTree);
          break;
        case 'FunctionNode':
          const functionNode = new FunctionNode(nodes[i].id, "xx.js")
          functionNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(functionNode, nodeTree);
          break;
        case 'NopNode':
          const nopNode = new NopNode(nodes[i].id, "xx.js")
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

    const wf = new Workflow("wf", "wf", nodeTree, edges);

    this.workflow = wf;
  }
}
</script>
