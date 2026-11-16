import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _sfc_main$1 } from './SettingsForm-CzC6X3R_.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,createElementVNode:_createElementVNode,openBlock:_openBlock,createBlock:_createBlock} = await importShared('vue');


const {onMounted} = await importShared('vue');


const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
},
  emits: ['layout', 'save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

/**
 * 插件配置弹窗：复用共享的 SettingsForm，保证与详情页内的设置完全一致。
 */
const props = __props;

const emit = __emit;

function onSave(data) {
  emit('save', data);
}

function onClose() {
  emit('close');
}

onMounted(() => {
  emit('layout', { maxWidth: '60rem' });
});

return (_ctx, _cache) => {
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_card_actions = _resolveComponent("v-card-actions");
  const _component_v_card = _resolveComponent("v-card");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_card_title, { class: "d-flex align-center flex-wrap ga-2 pt-4 pb-3" }, {
        default: _withCtx(() => [
          _createVNode(_component_v_icon, {
            color: "primary",
            class: "mr-2"
          }, {
            default: _withCtx(() => [...(_cache[0] || (_cache[0] = [
              _createTextVNode("mdi-refresh-circle", -1)
            ]))]),
            _: 1
          }),
          _cache[3] || (_cache[3] = _createElementVNode("span", { class: "text-h6" }, "DDNSTO 自动续期", -1)),
          _createVNode(_component_v_chip, {
            size: "small",
            variant: "tonal",
            color: "secondary"
          }, {
            default: _withCtx(() => [...(_cache[1] || (_cache[1] = [
              _createTextVNode("免费 7 天套餐", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            icon: "",
            variant: "text",
            size: "small",
            title: "关闭",
            onClick: onClose
          }, {
            default: _withCtx(() => [
              _createVNode(_component_v_icon, null, {
                default: _withCtx(() => [...(_cache[2] || (_cache[2] = [
                  _createTextVNode("mdi-close", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      _createVNode(_component_v_card_text, { class: "pt-0" }, {
        default: _withCtx(() => [
          _createVNode(_sfc_main$1, {
            api: props.api,
            "plugin-id": props.pluginId,
            "initial-config": props.initialConfig,
            onSave: onSave
          }, null, 8, ["api", "plugin-id", "initial-config"])
        ]),
        _: 1
      }),
      _createVNode(_component_v_card_actions, { class: "px-4 pb-4" }, {
        default: _withCtx(() => [
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            variant: "text",
            onClick: onClose
          }, {
            default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  }))
}
}

};

export { _sfc_main as default };
