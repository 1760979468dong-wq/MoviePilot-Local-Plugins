import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { S as Settings } from './Settings-fbA2A3Ou.js';

const {openBlock:_openBlock,createBlock:_createBlock} = await importShared('vue');


const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'embyxiaoluo' },
  sourcePluginId: { type: String, default: '' },
},
  emits: ['action', 'switch', 'close'],
  setup(__props, { emit: __emit }) {


const emit = __emit;

return (_ctx, _cache) => {
  return (_openBlock(), _createBlock(Settings, {
    api: __props.api,
    "plugin-id": __props.pluginId,
    onClose: _cache[0] || (_cache[0] = $event => (emit('close'))),
    onAction: _cache[1] || (_cache[1] = $event => (emit('action')))
  }, null, 8, ["api", "plugin-id"]))
}
}

};

export { _sfc_main as default };
