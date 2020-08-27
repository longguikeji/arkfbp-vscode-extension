<template>
  <div class="tool-bar">
    <div class="tools">
      <div class="tools-left">
      </div>
      <div class="tools-middle">
        <div class="tool-item"><div @click="createNodeStart">START</div></div>
        <div class="tool-item"><div @click="createNodeFunction">FN</div></div>
        <div class="tool-item"><div @click="createNodeIf">IF</div></div>
        <div class="tool-item"><div @click="createNodeSwitch">SWITCH</div></div>
        <div class="tool-item"><div @click="createNodeApi">API</div></div>
        <div class="tool-item"><div @click="createNodeLoop">LOOP</div></div>
        <div class="tool-item"><div @click="createNodeFlow">FLOW</div></div>
         <div class="tool-item"><div @click="createNodeTest">TEST</div></div>
        <div class="tool-item"><div @click="createNodeNop">NOP</div></div>
        <div class="tool-item"><div @click="createNodeStop">STOP</div></div>
      </div>
      <div class="tools-right">
        <!-- <div class="tool-item"><div>COPY</div></div> -->
        <div class="tool-item"><div @click="removeSelected">DELETE</div></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch, Emit } from 'vue-property-decorator'
import { NodeType } from '../../flow/nodes'
import { Flow } from '../../flow/workflows'

@Component({
  components: {
  },
})

export default class FlowTool extends Vue {
  @Emit('createNode') createNode(payload: {type: NodeType}) {return payload}
  @Emit('removeSelected') removeSelected() {}

  get iconStyles() {
    return {width: '36px', height: '20px'}
  }

  createNodeStart() {this.createNode({type: NodeType.Start})}
  createNodeFunction() {this.createNode({type: NodeType.Function})}
  createNodeIf() {this.createNode({type: NodeType.IF})}
  createNodeApi() {this.createNode({type: NodeType.API})}
  createNodeFlow() {this.createNode({type: NodeType.Flow})}
  createNodeSwitch() {this.createNode({type: NodeType.Switch})}
  createNodeLoop() {this.createNode({type: NodeType.Loop})}
  createNodeTest() {this.createNode({type: NodeType.Test})}
  createNodeNop() {this.createNode({type: NodeType.NOP})}
  createNodeStop() {this.createNode({type: NodeType.Stop})}
}
</script>

<style lang="less" scoped>
.tool-bar {
  display: flex;
  height: 100%;
  border-bottom: 1px solid #E8EAEC;
  font-weight: 400;
  font-size: 12px;
  color: #515A6E;

  .tools {
    display: flex;
    flex: 1;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    padding: 0 16px;

    .tool-item {
      display: inline-flex;
      flex: none;
      justify-content: center;
      align-items: center;
      height: 20px;
      padding: 0 4px;
      margin: 4px;
      border: 1px solid #E8EAEC;
      border-radius: 2px;
      line-height: 20px;
      color: rgba(0, 122, 255, 1);
      cursor: pointer;

      &.disabled {
        background-color: #f5f5f5;
      }

      &:not(.disabled):hover {
        border: 1px solid #E8EAEC;
      }
    }

    .tools-left,
    .tools-middle,
    .tools-right {
      > div {
        height: 20px;
      }
    }

    .tools-left {
      display: flex;
      flex: 1 0;
      justify-content: flex-start;
    }

    .tools-middle {
      display: flex;
      flex: none;
      justify-content: center;
      width: 480px;
    }

    .tools-right {
      display: flex;
      flex: 1 0;
      justify-content: flex-end;
    }
  }
}
</style>