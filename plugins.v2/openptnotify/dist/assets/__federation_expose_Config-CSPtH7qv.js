import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,createElementVNode:_createElementVNode,openBlock:_openBlock,createBlock:_createBlock} = await importShared('vue');


const {computed,onMounted,reactive,watch} = await importShared('vue');



const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'OpenPTNotify' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
},
  emits: ['layout', 'save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const form = reactive({
  enabled: false,
  notify_enabled: true,
  cron: '0 9 * * *',
  source_url: 'https://bfjy2024.github.io/openpt/',
  notify_mode: 'all',
  only_open: true,
  mark_owned: true,
  notify_on_error: true,
});

const modeItems = [
  { title: '每次推送全部开注站点', value: 'all' },
  { title: '仅推送新增站点', value: 'new' },
];

// 简单每日 Cron（分 时 * * *）与 HH:MM 时间输入的双向映射
const timeValue = computed({
  get() {
    const matched = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/.exec(String(form.cron || '').trim());
    if (!matched) return ''
    const hour = String(matched[2]).padStart(2, '0');
    const minute = String(matched[1]).padStart(2, '0');
    return `${hour}:${minute}`
  },
  set(value) {
    if (!value) return
    const [hour, minute] = String(value).split(':');
    if (hour === undefined || minute === undefined) return
    form.cron = `${Number(minute)} ${Number(hour)} * * *`;
  },
});

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) {
      form[key] = config[key];
    }
  }
}

applyConfig(props.initialConfig);
watch(() => props.initialConfig, value => applyConfig(value), { deep: true });

function onSave() {
  emit('save', { ...form });
}

function onClose() {
  emit('close');
}

onMounted(() => emit('layout', { maxWidth: '56rem' }));

return (_ctx, _cache) => {
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_card_actions = _resolveComponent("v-card-actions");
  const _component_v_card = _resolveComponent("v-card");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_card_title, { class: "text-h6" }, {
        default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
          _createTextVNode("PT开注提醒", -1)
        ]))]),
        _: 1
      }),
      _createVNode(_component_v_card_text, null, {
        default: _withCtx(() => [
          _createVNode(_component_v_alert, {
            type: "info",
            variant: "tonal",
            density: "comfortable",
            class: "mb-4"
          }, {
            default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
              _createTextVNode(" 定时抓取开放注册页面，把当前开放注册的 PT 站点推送到已启用的通知渠道。 ", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.enabled,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((form.enabled) = $event)),
                    label: "启用插件",
                    color: "primary",
                    "hide-details": "",
                    class: "mt-0"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.notify_enabled,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.notify_enabled) = $event)),
                    label: "发送通知",
                    color: "primary",
                    "hide-details": "",
                    class: "mt-0"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: timeValue.value,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((timeValue).value = $event)),
                    type: "time",
                    label: "每日通知时间",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": "",
                    class: "mb-3"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.cron,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.cron) = $event)),
                    label: "Cron 表达式（高级）",
                    variant: "outlined",
                    density: "comfortable",
                    hint: "默认每日一次即可；如需每周/多时段可直接改写",
                    "persistent-hint": "",
                    class: "mb-5"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, { cols: "12" }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.source_url,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.source_url) = $event)),
                    label: "抓取地址",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": "",
                    class: "mb-3"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_select, {
                    modelValue: form.notify_mode,
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.notify_mode) = $event)),
                    items: modeItems,
                    "item-title": "title",
                    "item-value": "value",
                    label: "推送模式",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": "",
                    class: "mb-3"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "4"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.only_open,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.only_open) = $event)),
                    label: "只保留开放注册",
                    color: "primary",
                    "hide-details": "",
                    class: "mt-0"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "4"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.mark_owned,
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.mark_owned) = $event)),
                    label: "通知中标注已拥有",
                    color: "primary",
                    "hide-details": "",
                    class: "mt-0"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "4"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.notify_on_error,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((form.notify_on_error) = $event)),
                    label: "失败时提醒",
                    color: "primary",
                    "hide-details": "",
                    class: "mt-0"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          _cache[11] || (_cache[11] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, " 「已拥有」依据该站点域名是否已在 MoviePilot「站点管理」中配置来判断；关闭上方开关只影响通知正文是否带该标记。 ", -1))
        ]),
        _: 1
      }),
      _createVNode(_component_v_card_actions, null, {
        default: _withCtx(() => [
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            variant: "text",
            onClick: onClose
          }, {
            default: _withCtx(() => [...(_cache[12] || (_cache[12] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_btn, {
            color: "primary",
            variant: "flat",
            onClick: onSave
          }, {
            default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
              _createTextVNode("保存", -1)
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
