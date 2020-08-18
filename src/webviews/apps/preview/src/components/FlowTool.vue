<template>
  <div class="tool-bar">
    <div class="tools">
      <div class="tools-left">
      </div>
      <div class="tools-middle">
        <div class="tool-item"><div @click="addNodeApi">API</div></div>
        <div class="tool-item"><div @click="addNodeFunction">FN</div></div>
        <div class="tool-item"><div @click="addNodeIf">IF</div></div>
        <div>
          <div class="tool-item" @click="isShowDb = !isShowDb" >DB</div>
          <div class="tool-item-db" v-if="isShowDb">
            <div class="db-type" v-for="item in dbOperationType" :key="item">
              <a @click="addNodeDb(item)">{{item}}</a>
            </div>
          </div>
        </div>
        <div class="tool-item"><div @click="addNodeWorkflow">WF</div></div>
        <div class="tool-item"><div @click="addNodeWait">WAIT</div></div>
        <div class="tool-item"><div @click="addNodeEvent">EVENT</div></div>
        <div class="tool-item"><div @click="addNodeClock">CLOCK</div></div>
        <div class="tool-item"><div @click="addNodeStop">STOP</div></div>
      </div>
      <div class="tools-right">
        <div class="tool-item"><div>COPY</div></div>
        <div class="tool-item"><div @click="removeSelected">DELETE</div></div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {Vue, Component, Prop, Watch, Emit} from 'vue-property-decorator'
import {NodeType} from '../flow/nodes'
import {Workflow} from '../flow/workflows'

@Component({
  components: {
  },
})

export default class FlowTool extends Vue {
  private isShowDb: boolean = false  

  @Emit('addNode') addNode(payload: {type: NodeType, operationType?: string}) {return payload}

  get iconStyles() {
    return {width: '36px', height: '20px'}
  }

  get dbOperationType() {
    return ['Query', 'QueryAll', 'Insert', 'Delete', 'Update']
  }

  addNodeApi() {this.addNode({type: NodeType.API})}
  addNodeFunction() {this.addNode({type: NodeType.Function})}
  addNodeIf() {this.addNode({type: NodeType.IF})}
  addNodeDb(dbOperationType) {this.addNode({type: NodeType.DB, operationType: dbOperationType})}
  addNodeWorkflow() {this.addNode({type: NodeType.TriggerWorkflow})}
  addNodeWait() {this.addNode({type: NodeType.WaitEvent})}
  addNodeEvent() {this.addNode({type: NodeType.TriggerEvent})}
  addNodeClock() {this.addNode({type: NodeType.Clock})}
  addNodeStop() {this.addNode({type: NodeType.Stop})}

  removeSelected() {
    this.$root.$emit('removeFlowEditorSelected')
  }
}
</script>

<style lang="less" scoped>
.tool-bar {
  display: flex;
  height: 100%;
  font-weight: 400;
  font-size: 12px;
  color: #515A6E;

  .tools {
    display: flex;
    flex: 1;
    justify-content: space-between;
    align-items: center;
    height: 100%;
    padding: 0 10px 0 16px;

    .tool-item {
      display: inline-flex;
      flex: none;
      justify-content: center;
      align-items: center;
      height: 20px;
      padding: 0 3px;
      margin: 0 3px;
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

    .tool-item-db {
      display: flex;
      flex-direction: column;

      .db-type {
        padding: 0 3px;
        border: 1px solid #E8EAEC;
        border-radius: 2px;
        line-height: 20px;
        color: rgba(0, 122, 255, 1);
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