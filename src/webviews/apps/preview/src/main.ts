import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import components from './components'

Vue.config.productionTip = false

// Vue.prototype.$vscode = new Vue({data: {
//   acquire: (window as any).state.acquireVsCodeApi,
//   nodes: (window as any).state.graphNodes,
// }})

Object.keys(components).forEach(key => {
  Vue.component(key, components[key])
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
