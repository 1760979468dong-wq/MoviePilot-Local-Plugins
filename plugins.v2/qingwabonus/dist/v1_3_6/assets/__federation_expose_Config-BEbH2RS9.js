import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,createElementVNode:_createElementVNode,toDisplayString:_toDisplayString,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass,normalizeStyle:_normalizeStyle} = await importShared('vue');


const _hoisted_1 = { class: "d-flex align-center" };
const _hoisted_2 = { class: "flex-grow-1" };
const _hoisted_3 = { class: "text-caption text-medium-emphasis" };
const _hoisted_4 = { class: "d-flex align-center mb-2" };
const _hoisted_5 = { class: "d-flex align-start mb-2" };
const _hoisted_6 = { class: "flex-grow-1 text-truncate" };
const _hoisted_7 = { class: "text-body-2 font-weight-medium" };
const _hoisted_8 = { class: "text-caption text-medium-emphasis" };
const _hoisted_9 = { class: "d-flex align-center ga-2" };
const _hoisted_10 = {
  class: "text-body-2 text-center",
  style: {"min-width":"2rem"}
};
const _hoisted_11 = { class: "text-subtitle-2 mb-2 d-flex align-center" };
const _hoisted_12 = { class: "text-subtitle-2 mb-2 d-flex align-center" };
const _hoisted_13 = { class: "d-flex align-center" };
const _hoisted_14 = { class: "text-subtitle-2 mb-2 d-flex align-center" };

const {computed,onMounted,reactive,ref,watch} = await importShared('vue');



const _sfc_main = {
  __name: 'Config',
  props: {
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'QingwaBonus' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
},
  emits: ['layout', 'save', 'close', 'switch'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const form = reactive({
  enabled: false,
  site_name: '青蛙',
  item_bonus: true,
  item_bonus_amount: 1,
  item_upload: false,
  item_upload_amount: 1,
  item_download: false,
  item_download_amount: 1,
  start_time: '09:00',
  end_time: '10:00',
  notify_enabled: true,
  notify_on_error: true,
  retry_enabled: true,
  retry_interval: 5,
  retry_max: 3,
});

const GOODS = [
  { key: 'bonus', label: '每日福利：1000蝌蚪', keyword: '每日福利', icon: 'mdi-gift-outline' },
  { key: 'upload', label: '10.0 GB 上传量', keyword: '上传量', icon: 'mdi-upload-outline' },
  { key: 'download', label: '10.0 GB 下载量', keyword: '下载量', icon: 'mdi-download-outline' },
];

const items = ref([]);
const loadingItems = ref(false);
const loadingPrices = ref(true);

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) form[key] = config[key];
  }
}

applyConfig(props.initialConfig);
watch(() => props.initialConfig, value => applyConfig(value), { deep: true });

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

function priceText(item) {
  if (!item) return null
  if (item.a_type === 'bonus') return `${Number(item.a_amount).toLocaleString('en-US')} 蝌蚪`
  if (item.a_type === 'invites') return `${item.a_amount} 个永久邀请`
  if (item.a_type === 'attendance_card') return `${item.a_amount} 张补签卡`
  return String(item.a_amount)
}

const goodsRows = computed(() =>
  GOODS.map(g => {
    const item = (items.value || []).find(it => String(it?.name || '').includes(g.keyword));
    return {
      ...g,
      price: priceText(item),
      limit: Number(item?.limit_amount || 0),
      itemId: item?.id ?? null,
    }
  })
);

function maxAmount(row) {
  return row.limit > 0 ? row.limit : 999
}

function onKey(key) {
  return `item_${key}`
}

function amountKey(key) {
  return `item_${key}_amount`
}

function inc(row) {
  const max = maxAmount(row);
  const cur = Number(form[amountKey(row.key)] || 1);
  form[amountKey(row.key)] = Math.min(cur + 1, max);
}

function dec(row) {
  const cur = Number(form[amountKey(row.key)] || 1);
  form[amountKey(row.key)] = Math.max(cur - 1, 1);
}

async function loadItems() {
  loadingPrices.value = true;
  loadingItems.value = true;
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/items`, { feedback: 'silent' }));
    if (response?.success) items.value = response.items || [];
  } catch (err) {
    items.value = [];
  } finally {
    loadingItems.value = false;
    loadingPrices.value = false;
  }
}

const enabledCount = computed(
  () => GOODS.filter(g => form[onKey(g.key)]).length
);

function onSave() {
  const data = { ...form };
  for (const row of goodsRows.value) {
    const max = maxAmount(row);
    const cur = Number(data[amountKey(row.key)] || 1);
    data[amountKey(row.key)] = Math.max(1, Math.min(cur, max));
  }
  emit('save', data);
}

function onClose() {
  emit('close');
}

onMounted(async () => {
  emit('layout', { maxWidth: '58rem' });
  await loadItems();
});

return (_ctx, _cache) => {
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_card_actions = _resolveComponent("v-card-actions");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_card_title, { class: "d-flex align-center flex-wrap ga-2 pt-4 pb-3" }, {
        default: _withCtx(() => [
          _createVNode(_component_v_icon, {
            color: "success",
            class: "mr-2"
          }, {
            default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
              _createTextVNode("mdi-frog", -1)
            ]))]),
            _: 1
          }),
          _cache[12] || (_cache[12] = _createElementVNode("span", { class: "text-h6" }, "青蛙蝌蚪福利", -1)),
          _createVNode(_component_v_chip, {
            size: "small",
            variant: "tonal",
            color: "secondary"
          }, {
            default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
              _createTextVNode("自动定时购买", -1)
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
                default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
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
          _createVNode(_component_v_alert, {
            type: "info",
            variant: "tonal",
            density: "compact",
            class: "mb-4 text-caption"
          }, {
            default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
              _createTextVNode(" 本页设置", -1),
              _createElementVNode("strong", null, "每天自动购买", -1),
              _createTextVNode("哪些商品。只想临时买一次，请在插件详情页使用「手动购买」。 ", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_card, {
            variant: "outlined",
            class: "mb-4 pa-3",
            rounded: "lg"
          }, {
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_1, [
                _createVNode(_component_v_icon, {
                  color: form.enabled ? 'success' : 'grey',
                  class: "mr-2"
                }, {
                  default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
                    _createTextVNode("mdi-clock-outline", -1)
                  ]))]),
                  _: 1
                }, 8, ["color"]),
                _createElementVNode("div", _hoisted_2, [
                  _cache[15] || (_cache[15] = _createElementVNode("div", { class: "text-body-2 font-weight-medium" }, "自动定时购买", -1)),
                  _createElementVNode("div", _hoisted_3, _toDisplayString(form.enabled ? `已启用，每日 ${form.start_time}–${form.end_time} 内随机时刻执行` : '未启用，不会自动购买'), 1)
                ]),
                _createVNode(_component_v_switch, {
                  modelValue: form.enabled,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((form.enabled) = $event)),
                  color: "success",
                  "hide-details": "",
                  inset: "",
                  class: "flex-grow-0"
                }, null, 8, ["modelValue"])
              ])
            ]),
            _: 1
          }),
          _createElementVNode("div", _hoisted_4, [
            _cache[16] || (_cache[16] = _createElementVNode("span", { class: "text-subtitle-2" }, "参与自动购买的商品", -1)),
            _createVNode(_component_v_spacer),
            (form.enabled)
              ? (_openBlock(), _createBlock(_component_v_chip, {
                  key: 0,
                  size: "x-small",
                  variant: "tonal",
                  color: "success"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(" 已选 " + _toDisplayString(enabledCount.value) + " 项 ", 1)
                  ]),
                  _: 1
                }))
              : _createCommentVNode("", true)
          ]),
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(goodsRows.value, (row) => {
                return (_openBlock(), _createBlock(_component_v_col, {
                  key: row.key,
                  cols: "12",
                  md: "4"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_v_card, {
                      variant: "outlined",
                      rounded: "lg",
                      class: _normalizeClass(["pa-3 h-100", form[onKey(row.key)] ? 'border-success' : '']),
                      style: _normalizeStyle(form[onKey(row.key)] ? 'border-color: rgb(var(--v-theme-success));' : '')
                    }, {
                      default: _withCtx(() => [
                        _createElementVNode("div", _hoisted_5, [
                          _createVNode(_component_v_icon, {
                            size: "small",
                            color: form[onKey(row.key)] ? 'success' : 'grey',
                            class: "mr-2"
                          }, {
                            default: _withCtx(() => [
                              _createTextVNode(_toDisplayString(row.icon), 1)
                            ]),
                            _: 2
                          }, 1032, ["color"]),
                          _createElementVNode("div", _hoisted_6, [
                            _createElementVNode("div", _hoisted_7, _toDisplayString(row.label), 1),
                            _createElementVNode("div", _hoisted_8, [
                              (loadingPrices.value)
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                    _createTextVNode("价格读取中…")
                                  ], 64))
                                : (row.price)
                                  ? (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
                                      _createTextVNode("单价 " + _toDisplayString(row.price), 1)
                                    ], 64))
                                  : (_openBlock(), _createElementBlock(_Fragment, { key: 2 }, [
                                      _createTextVNode("未读取到价格")
                                    ], 64))
                            ])
                          ]),
                          _createVNode(_component_v_switch, {
                            modelValue: form[onKey(row.key)],
                            "onUpdate:modelValue": $event => ((form[onKey(row.key)]) = $event),
                            color: "success",
                            "hide-details": "",
                            inset: "",
                            density: "compact",
                            class: "flex-grow-0 mt-n1"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                        ]),
                        _createElementVNode("div", _hoisted_9, [
                          _cache[19] || (_cache[19] = _createElementVNode("span", { class: "text-caption text-medium-emphasis" }, "数量", -1)),
                          _createVNode(_component_v_btn, {
                            icon: "",
                            size: "x-small",
                            variant: "tonal",
                            disabled: !form[onKey(row.key)] || form[amountKey(row.key)] <= 1,
                            onClick: $event => (dec(row))
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_v_icon, { size: "small" }, {
                                default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                                  _createTextVNode("mdi-minus", -1)
                                ]))]),
                                _: 1
                              })
                            ]),
                            _: 1
                          }, 8, ["disabled", "onClick"]),
                          _createElementVNode("span", _hoisted_10, _toDisplayString(form[amountKey(row.key)] || 1), 1),
                          _createVNode(_component_v_btn, {
                            icon: "",
                            size: "x-small",
                            variant: "tonal",
                            disabled: !form[onKey(row.key)] || form[amountKey(row.key)] >= maxAmount(row),
                            onClick: $event => (inc(row))
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_v_icon, { size: "small" }, {
                                default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                                  _createTextVNode("mdi-plus", -1)
                                ]))]),
                                _: 1
                              })
                            ]),
                            _: 1
                          }, 8, ["disabled", "onClick"]),
                          _createVNode(_component_v_spacer),
                          _createVNode(_component_v_chip, {
                            size: "x-small",
                            variant: "tonal",
                            color: row.limit > 0 ? 'warning' : 'secondary'
                          }, {
                            default: _withCtx(() => [
                              _createTextVNode(_toDisplayString(row.limit > 0 ? `限购 ${row.limit}` : '不限购'), 1)
                            ]),
                            _: 2
                          }, 1032, ["color"])
                        ])
                      ]),
                      _: 2
                    }, 1032, ["class", "style"])
                  ]),
                  _: 2
                }, 1024))
              }), 128))
            ]),
            _: 1
          }),
          _createVNode(_component_v_divider, { class: "my-4" }),
          _createElementVNode("div", _hoisted_11, [
            _createVNode(_component_v_icon, {
              size: "small",
              class: "mr-1"
            }, {
              default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                _createTextVNode("mdi-clock-outline", -1)
              ]))]),
              _: 1
            }),
            _cache[21] || (_cache[21] = _createTextVNode("执行时间段 ", -1))
          ]),
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.start_time,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.start_time) = $event)),
                    type: "time",
                    label: "开始时间",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.end_time,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((form.end_time) = $event)),
                    type: "time",
                    label: "结束时间",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, { cols: "12" }, {
                default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                  _createElementVNode("div", { class: "text-caption text-medium-emphasis mt-1" }, " 每天在该区间随机选一个时刻执行，保存后立即重新生成。可在详情页查看下次执行时间。 ", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          }),
          _createVNode(_component_v_divider, { class: "my-4" }),
          _createElementVNode("div", _hoisted_12, [
            _createVNode(_component_v_icon, {
              size: "small",
              class: "mr-1"
            }, {
              default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                _createTextVNode("mdi-restart-alert", -1)
              ]))]),
              _: 1
            }),
            _cache[24] || (_cache[24] = _createTextVNode("失败自动重试 ", -1))
          ]),
          _createVNode(_component_v_card, {
            variant: "outlined",
            rounded: "lg",
            class: "pa-3"
          }, {
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_13, [
                _createVNode(_component_v_icon, {
                  color: form.retry_enabled ? 'success' : 'grey',
                  class: "mr-2"
                }, {
                  default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                    _createTextVNode("mdi-refresh", -1)
                  ]))]),
                  _: 1
                }, 8, ["color"]),
                _cache[26] || (_cache[26] = _createElementVNode("div", { class: "flex-grow-1" }, [
                  _createElementVNode("div", { class: "text-body-2 font-weight-medium" }, "购买失败后自动重试"),
                  _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, " 仅在配置的时间段内重试，超出时间段或达到次数上限后不再重试 ")
                ], -1)),
                _createVNode(_component_v_switch, {
                  modelValue: form.retry_enabled,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.retry_enabled) = $event)),
                  color: "success",
                  "hide-details": "",
                  inset: "",
                  class: "flex-grow-0"
                }, null, 8, ["modelValue"])
              ]),
              _createVNode(_component_v_row, {
                dense: "",
                class: "mt-1"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_col, { cols: "6" }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_text_field, {
                        modelValue: form.retry_interval,
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.retry_interval) = $event)),
                        modelModifiers: { number: true },
                        type: "number",
                        min: "1",
                        max: "120",
                        disabled: !form.retry_enabled,
                        label: "重试间隔（分钟）",
                        variant: "outlined",
                        density: "comfortable",
                        "hide-details": ""
                      }, null, 8, ["modelValue", "disabled"])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_v_col, { cols: "6" }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_text_field, {
                        modelValue: form.retry_max,
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.retry_max) = $event)),
                        modelModifiers: { number: true },
                        type: "number",
                        min: "1",
                        max: "20",
                        disabled: !form.retry_enabled,
                        label: "最多重试次数",
                        variant: "outlined",
                        density: "comfortable",
                        "hide-details": ""
                      }, null, 8, ["modelValue", "disabled"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          _createVNode(_component_v_divider, { class: "my-4" }),
          _createElementVNode("div", _hoisted_14, [
            _createVNode(_component_v_icon, {
              size: "small",
              class: "mr-1"
            }, {
              default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                _createTextVNode("mdi-bell-outline", -1)
              ]))]),
              _: 1
            }),
            _cache[28] || (_cache[28] = _createTextVNode("通知与其他 ", -1))
          ]),
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.notify_enabled,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.notify_enabled) = $event)),
                    color: "success",
                    inset: "",
                    "hide-details": ""
                  }, {
                    label: _withCtx(() => [...(_cache[29] || (_cache[29] = [
                      _createElementVNode("span", { class: "text-body-2" }, "购买成功通知", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.notify_on_error,
                    "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.notify_on_error) = $event)),
                    color: "success",
                    inset: "",
                    "hide-details": ""
                  }, {
                    label: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                      _createElementVNode("span", { class: "text-body-2" }, "失败时提醒", -1)
                    ]))]),
                    _: 1
                  }, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.site_name,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((form.site_name) = $event)),
                    label: "站点名称",
                    variant: "outlined",
                    density: "comfortable",
                    "hide-details": ""
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
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
            default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
              _createTextVNode("关闭", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_btn, {
            color: "success",
            variant: "flat",
            onClick: onSave
          }, {
            default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
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
