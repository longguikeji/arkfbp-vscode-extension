<template>
  <div class="about">
    <FlowEditor :workflow="workflow" />
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
export default class Home extends Vue {

  @Prop({ type: Workflow }) private workflow!: Workflow

  mounted() {
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.command) {
            case 'render':
                {
                  console.info('>>>>>>>>><<<<');
                  const nodeTree = new NodeTree("/");
                  const nodes = message.nodes;
                  const edges: Edge[] = [];
                  for (let i = 0; i < nodes.length; ++i) {
                    switch (nodes[i].base) {
                      case 'APINode':
                        console.info('APINode...');
                        nodeTree.add(new APINode(nodes[i].id, "xx.js"), nodeTree);
                        console.info('APINode Done...');
                        break;
                      case 'StartNode':
                        console.info('StartNode...');
                        nodeTree.add(new StartNode(nodes[i].id, "xx.js"), nodeTree);
                        break;
                      case 'StopNode':
                        console.info('StopNode...');
                        nodeTree.add(new StopNode(nodes[i].id, "xx.js"), nodeTree);
                        break;
                      case 'FunctionNode':
                        console.info('FunctionNode...');
                        nodeTree.add(new FunctionNode(nodes[i].id, "xx.js"), nodeTree);
                        break;
                      case 'NopNode':
                        console.info('NopNode...');
                        nodeTree.add(new NopNode(nodes[i].id, "xx.js"), nodeTree);
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
                break;
        }
    });
  }
}
</script>
