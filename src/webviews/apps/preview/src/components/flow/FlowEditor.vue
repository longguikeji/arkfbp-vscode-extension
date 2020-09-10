<template>
  <div class="flow-editor">
    <component :is="flowTool" />
    <canvas id="c" class="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { debounce } from "lodash";
import { Component, Prop, Vue, Watch, Emit } from "vue-property-decorator";
import { Editor } from "../../floweditor/editor";
import { Node, NodeType, NodeTree, NodeID } from "../../flow/nodes";
import { Flow, Edge } from "../../flow/workflows";

@Component({})
export default class FlowEditor extends Vue {
  editor: Editor | null = null;
  selected: Node | [NodeID, NodeID] | null = null;

  debounceMoveNode = debounce(payload => this.moveNode(payload), 500);

  @Prop({ type: Object, required: true }) flow!: Flow;

  @Emit("createNode")
  createNode(payload: { type: NodeType }) {
    return payload;
  }

  @Emit("selectNode")
  selectNode(payload: { node: Node }) {
    return payload;
  }

  @Emit("moveNode")
  moveNode(payload: { flow: Flow, node: Node; x: number; y: number }) {
    return payload;
  }

  @Emit("createEdge")
  createEdge(payload: { flow: Flow, from: Node; to: Node }) {
    return payload;
  }

  @Emit("removeSelected")
  removeSelected() {
    return { flow: this.flow, selected: this.selected };
  }

  @Watch("flow")
  onShowChange() {
    if (this.editor) {
      this.editor.clear();
    }
    if (this.flow) {
      this.renderGraph();
    }
    this.selected = null;
  }

  get flowTool() {
    return {render: h => h('FlowTool', {
        on: {
            createNode: this.createNode,
            removeSelected: this.removeSelected,
        },
    })}
  }

  fitToContainer(c: any) {
    c.style.width = "100%";
    c.style.height = "500px";
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
  }

  renderEditor() {
    const canvas = document.querySelector("#c");
    this.fitToContainer(canvas);

    this.editor = new Editor("c", {
      onNodeSelected: (id: string) => {
        const node = this.flow.getNodeById(id);
        const selectedNode = this.selected instanceof Node ? this.selected : null;
        if(!selectedNode || selectedNode.id !== id){
            this.selectNode({node});
            this.selected = node;
        }
      },
      onEdgeSelected: (from: Node, to: Node) => {
        if(from != null && to != null) {
          this.selected = [from.id, to.id];
        }
      },
      onNodeMoving: (id: string, x: number, y: number) => {
        const node = this.flow.getNodeById(id);
        this.debounceMoveNode({ flow: this.flow , node, x, y });
      },
      onConnect: (fromId: string, toId: string) => {
        const from = this.flow.getNodeById(fromId);
        const to = this.flow.getNodeById(toId);
        if (from != null && to != null) {
            this.createEdge({flow: this.flow, from, to });
        }
      }
    });
  }

  renderGraph() {
    const editor = this.editor!;
    const { tree, edges } = this.flow;

    const mapping = new Map();

    const walkTree = (node: Node | NodeTree) => {
      if (node instanceof NodeTree) {
        if (node.children) {
          node.children.forEach(c => walkTree(c));
        }
      } else {
        const {id, type, position: [left, top]} = node;
        const graphNode = editor.createNode({
            id,
            type: type as any,  // TODO: 统一两个NodeType
            left,
            top,
        });
        mapping.set(node.id, graphNode);
      }
    };
    walkTree(tree!);

    edges.forEach(([from, to]: Edge) => {
      if(mapping.get(from) && mapping.get(to)) {
        editor.connect(mapping.get(from), mapping.get(to));
      }
    });

  }

  mounted() {
    this.renderEditor();
    if (this.flow) {
      this.renderGraph();
    }
  }
}
</script>

<style scoped lang="less">
.flow-editor {
  position: relative;
  width: 100%;
  height: 100%;
  text-align: left;
  background: white;

  .content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
