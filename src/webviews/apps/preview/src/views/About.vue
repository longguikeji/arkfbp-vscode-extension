<template>
  <div class="about">
    <component v-if="flow" :is="flowEditor" />
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from "vue-property-decorator";
import { Flow, Edge } from "./../flow/workflows/";
import { NodeTree } from "./../flow/nodes/nodeTree";
import flowEditor from './../apis/flowEditor'
import {
  StartNode,
  StopNode,
  APINode,
  FunctionNode,
  NopNode,
  SwitchNode,
  IFNode,
  TestNode,
  LoopNode,
  FlowNode,
  Node,
 } from "./../flow/nodes";

@Component({
  components: {
  }
})
export default class About extends Vue {
  private flow: Flow|null = null

  get flowEditor() {
    return {render: h => h('FlowEditor', {
        props: {
            flow: this.flow,
        },
        on: {
            createNode: flowEditor.createNode,
            selectNode: flowEditor.selectNode,
            moveNode: flowEditor.moveNode,
            createEdge: flowEditor.createEdge,
            removeSelected: flowEditor.removeSelected,
        },
    })}
  }

  mounted() {
    const nodes = (window as any).state.graphNodes;

    const nodeTree = new NodeTree("/");
    const edges: Edge[] = [];

    for (let i = 0; i < nodes.length; ++i) {
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
        case 'SwitchNode':
          const switchNode = new SwitchNode(nodes[i].id, `${nodes[i].cls}.js`)
          switchNode.cls = nodes[i].cls
          switchNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(switchNode, nodeTree);
          break;
        case 'IFNode':
          const ifNode = new IFNode(nodes[i].id, `${nodes[i].cls}.js`)
          ifNode.cls = nodes[i].cls
          ifNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(ifNode, nodeTree);
          break;
        case 'LoopNode':
          const loopNode = new LoopNode(nodes[i].id, `${nodes[i].cls}.js`)
          loopNode.cls = nodes[i].cls
          loopNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(loopNode, nodeTree);
          break;
        case 'TestNode':
          const testNode = new TestNode(nodes[i].id, `${nodes[i].cls}.js`)
          testNode.cls = nodes[i].cls
          testNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(testNode, nodeTree);
          break;
        case 'FlowNode':
          const flowNode = new FlowNode(nodes[i].id, `${nodes[i].cls}.js`)
          flowNode.cls = nodes[i].cls
          flowNode.position = [Number(nodes[i].x), Number(nodes[i].y)]
          nodeTree.add(flowNode, nodeTree);
          break;
        default:
          break;
      }

      if (typeof nodes[i].next !== 'undefined') {
        edges.push([nodes[i].id, nodes[i].next]);
      }
    }

    const f = new Flow("flow", "flow", nodeTree, edges);

    this.flow = f;
  }
}
</script>

<style scoped lang="less">
</style>