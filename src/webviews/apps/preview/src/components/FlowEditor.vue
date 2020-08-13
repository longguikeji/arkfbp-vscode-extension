<template>
  <div class="flow-editor">
    <canvas id="c" class="canvas"></canvas>
  </div>
</template>

<script lang="ts">
import { debounce } from "lodash";
import { Component, Prop, Vue, Watch, Emit } from "vue-property-decorator";
import { Editor } from "../floweditor/editor";
import { Node, NodeTree } from "../flow/nodes";
import { Workflow, Edge } from "../flow/workflows";

@Component({})
export default class FlowEditor extends Vue {
  editor: Editor | null = null;
  selected: object = {};

  debounceMoveNode = debounce(payload => this.moveNode(payload), 500);

  @Prop({ type: Object, required: true }) workflow!: Workflow;

  @Emit("moveNode")
  moveNode(payload: { node: Node; x: number; y: number }) {
    return payload;
  }

  @Emit("addEdge")
  addEdge(payload: { from: Node; to: Node }) {
    return payload;
  }

  @Emit("selectNode")
  selectNode(payload: { node: Node | null }) {
    return payload;
  }

  @Emit("remove")
  remove(payload: { node?: Node; edge?: { from: Node; to: Node } }) {
    return payload;
  }

  @Watch("workflow")
  onShowChange() {
    if (this.editor) {
      this.editor.clear();
    }
    if (this.workflow) {
      this.renderGraph();
    }
    this.selected = {};
  }

  fitToContainer(c: any) {
    c.style.width = "100%";
    c.style.height = "500px";
    c.style.border = '1px solid green';
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
  }

  renderEditor() {
    const canvas = document.querySelector("#c");
    this.fitToContainer(canvas);

    this.editor = new Editor("c", {
      onNodeSelected: (id: string) => {
        const node = this.workflow.getNodeById(id);
        const selectedNode = (this.selected as any).node
          ? (this.selected as any).node
          : {};
        if (selectedNode.id !== id) {
          this.selectNode({ node });
          this.selected = { node };
        }
      },
      onEdgeSelected: (from: Node, to: Node) => {
        this.selected = { edge: { from, to } };
      },
      onNodeMoving: (id: string, x: number, y: number) => {
        const node = this.workflow.getNodeById(id);
        this.debounceMoveNode({ node, x, y });
      },
      onConnect: (fromId: string, toId: string) => {
        const from = this.workflow.getNodeById(fromId);
        const to = this.workflow.getNodeById(toId);
        if (from != null && to != null) {
            this.addEdge({ from, to });
        }
      }
    });
  }

  renderGraph() {
    const editor = this.editor!;
    const { tree, edges } = this.workflow;

    const mapping = new Map();

    const walkTree = (node: Node | NodeTree) => {
      if (node instanceof NodeTree) {
        if (node.children) {
          node.children.forEach(c => walkTree(c));
        }
      } else {
        const {
          id,
          type,
          position: [left, top]
        } = node;
        const graphNode = editor.createNode({
          id: id as any,
          type: type as any, // TODO: 统一两个NodeType
          left,
          top,
        });
        mapping.set(node.id, graphNode);
      }
    };
    walkTree(tree!);

    edges.forEach(([from, to]: Edge) => {
      editor.connect(mapping.get(from), mapping.get(to));
    });

  }

  created() {
    this.$root.$on("removeFlowEditorSelected", () => {
      // TODO 移除节点时没有移除tabBar中的节点，重构后需添加此功能
      this.remove(this.selected);
    });
  }

  beforeDestroy() {
    this.$root.$off("removeFlowEditorSelected");
  }

  mounted() {
    this.renderEditor();
    if (this.workflow) {
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
