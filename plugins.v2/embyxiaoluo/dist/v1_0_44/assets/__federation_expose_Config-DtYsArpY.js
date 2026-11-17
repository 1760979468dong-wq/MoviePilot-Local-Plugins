import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { S as Settings } from './Settings-C4vKiikV.js';

const {openBlock:_openBlock,createBlock:_createBlock} = await importShared('vue');


const _sfc_main = {
  __name: 'Config',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'embyxiaoluo' },
  initialConfig: { type: Object, default: () => ({}) },
  sourcePluginId: { type: String, default: '' },
},
  emits: ['layout', 'save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {


const emit = __emit;

return (_ctx, _cache) => {
  return (_openBlock(), _createBlock(Settings, {
    api: __props.api,
    "plugin-id": __props.pluginId,
    "initial-config": __props.initialConfig,
    "host-managed-config": "",
    onClose: _cache[0] || (_cache[0] = $event => (emit('close'))),
    onSave: _cache[1] || (_cache[1] = $event => (emit('save', $event)))
  }, null, 8, ["api", "plugin-id", "initial-config"]))
}
}

};

export { _sfc_main as default };
