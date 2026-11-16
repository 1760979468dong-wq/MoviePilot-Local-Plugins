import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,createElementVNode:_createElementVNode,toDisplayString:_toDisplayString,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,createElementBlock:_createElementBlock,renderList:_renderList,Fragment:_Fragment,normalizeStyle:_normalizeStyle} = await importShared('vue');


const _hoisted_1 = { class: "text-body-2 font-weight-medium" };
const _hoisted_2 = { class: "text-body-2 font-weight-medium" };
const _hoisted_3 = { class: "text-body-2 font-weight-medium" };
const _hoisted_4 = { class: "text-body-2 font-weight-medium" };
const _hoisted_5 = { class: "d-flex align-center mb-2" };
const _hoisted_6 = {
  key: 1,
  class: "text-body-2 text-medium-emphasis"
};
const _hoisted_7 = { class: "d-flex align-start mb-2" };
const _hoisted_8 = { class: "flex-grow-1" };
const _hoisted_9 = { class: "text-body-2 font-weight-medium" };
const _hoisted_10 = { class: "text-caption text-medium-emphasis" };
const _hoisted_11 = { key: 0 };
const _hoisted_12 = { class: "d-flex align-center ga-2" };
const _hoisted_13 = {
  key: 3,
  class: "text-body-2 text-medium-emphasis"
};
const _hoisted_14 = { class: "text-caption text-medium-emphasis mt-2" };
const _hoisted_15 = { class: "d-flex align-center flex-wrap ga-2 mb-2" };
const _hoisted_16 = { class: "text-caption text-medium-emphasis" };
const _hoisted_17 = { class: "d-flex align-center" };
const _hoisted_18 = { class: "d-flex align-center mt-2 mb-1" };
const _hoisted_19 = { class: "d-flex align-start mb-2" };
const _hoisted_20 = { class: "flex-grow-1 text-truncate" };
const _hoisted_21 = { class: "text-body-2 font-weight-medium" };
const _hoisted_22 = { class: "text-caption text-medium-emphasis" };
const _hoisted_23 = { class: "d-flex align-center ga-2" };
const _hoisted_24 = {
  class: "text-body-2 text-center",
  style: {"min-width":"2rem"}
};
const _hoisted_25 = { class: "text-subtitle-2 mt-3 mb-1 d-flex align-center" };
const _hoisted_26 = { class: "text-subtitle-2 mt-3 mb-1 d-flex align-center" };
const _hoisted_27 = { class: "text-subtitle-2 mt-3 mb-1 d-flex align-center" };
const _hoisted_28 = { key: 0 };
const _hoisted_29 = { key: 0 };
const _hoisted_30 = {
  key: 5,
  class: "text-body-2 text-medium-emphasis"
};

const {computed,onMounted,reactive,ref} = await importShared('vue');



const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'QingwaBonus' },
  sourcePluginId: { type: String, default: '' },
},
  emits: ['action', 'switch', 'close', 'layout'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const latest = ref(null);
const liveBalance = ref(null);
const balanceLoading = ref(true);
const items = ref([]);
const cachedAt = ref(null);
const loading = ref(true);
const refreshing = ref(false);
const saving = ref(false);
const message = ref('');
const messageType = ref('info');
const buyingId = ref(null);
const amounts = ref({});

const GOODS = [
  { key: 'bonus', keyword: '每日福利', label: '每日福利：1000蝌蚪', icon: 'mdi-gift-outline' },
  { key: 'upload', keyword: '上传量', label: '10.0 GB 上传量', icon: 'mdi-upload-outline' },
  { key: 'download', keyword: '下载量', label: '10.0 GB 下载量', icon: 'mdi-download-outline' },
];

// 与后端配置字段保持一致
const form = reactive({
  enabled: false,
  site_name: '青蛙',
  start_time: '09:00',
  end_time: '10:00',
  notify_enabled: true,
  notify_on_error: true,
  retry_enabled: true,
  retry_interval: 5,
  retry_max: 3,
  item_bonus: true,
  item_bonus_amount: 1,
  item_upload: false,
  item_upload_amount: 1,
  item_download: false,
  item_download_amount: 1,
});

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

function priceText(item) {
  if (!item) return ''
  if (item.a_type === 'bonus') return `${Number(item.a_amount).toLocaleString('en-US')} 蝌蚪`
  if (item.a_type === 'invites') return `${item.a_amount} 个永久邀请`
  if (item.a_type === 'attendance_card') return `${item.a_amount} 张补签卡`
  return String(item.a_amount)
}

const manualItems = computed(() => {
  const list = items.value || [];
  return GOODS.map(g => {
    const item = list.find(it => String(it?.name || '').includes(g.keyword));
    if (!item) return null
    return {
      id: item.id,
      name: item.name,
      icon: g.icon,
      price: priceText(item),
      stock: item.stock,
      limit: Number(item.limit_amount || 0),
    }
  }).filter(Boolean)
});

const goodsRows = computed(() => {
  const list = items.value || [];
  return GOODS.map(g => {
    const item = list.find(it => String(it?.name || '').includes(g.keyword));
    return {
      ...g,
      price: priceText(item),
      limit: Number(item?.limit_amount || 0),
      stock: item?.stock,
    }
  })
});

const enabledGoodsCount = computed(() => GOODS.filter(g => form[onKey(g.key)]).length);

const cachedText = computed(() => {
  if (!cachedAt.value) return '未知'
  return new Date(cachedAt.value * 1000).toLocaleString('zh-CN', { hour12: false })
});

const nextPlanText = computed(() => {
  if (!form.enabled) return '未启用自动购买'
  return latest.value?.next_plan || '待生成'
});

function onKey(key) {
  return `item_${key}`
}

function amountKey(key) {
  return `item_${key}_amount`
}

function isAuto(name) {
  const map = { '每日福利': 'item_bonus', '上传量': 'item_upload', '下载量': 'item_download' };
  const found = Object.entries(map).find(([k]) => String(name || '').includes(k));
  return found ? !!form[found[1]] : false
}

function maxAuto(row) {
  return row.limit > 0 ? row.limit : 999
}

function incAuto(row) {
  const cur = Number(form[amountKey(row.key)] || 1);
  form[amountKey(row.key)] = Math.min(cur + 1, maxAuto(row));
}

function decAuto(row) {
  const cur = Number(form[amountKey(row.key)] || 1);
  form[amountKey(row.key)] = Math.max(cur - 1, 1);
}

function amountOf(item) {
  const v = amounts.value[item.id];
  return v !== undefined && v !== null ? v : 1
}

function maxOf(item) {
  return item.limit > 0 ? item.limit : 999
}

function setAmount(item, value) {
  let n = Number(value);
  if (Number.isNaN(n) || n < 1) n = 1;
  amounts.value = { ...amounts.value, [item.id]: Math.min(n, maxOf(item)) };
}

function incAmount(item) {
  setAmount(item, Math.min(amountOf(item) + 1, maxOf(item)));
}

function decAmount(item) {
  setAmount(item, Math.max(amountOf(item) - 1, 1));
}

async function loadConfig() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/config`, { feedback: 'silent' }));
    if (response && typeof response === 'object') {
      for (const key of Object.keys(form)) {
        if (response[key] !== undefined && response[key] !== null) form[key] = response[key];
      }
    }
  } catch (err) {
    // 保留默认值
  }
}

async function loadLatest() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/latest`, { feedback: 'silent' }));
    latest.value = response || null;
  } catch (err) {
    latest.value = null;
  }
}

async function loadItems(force = false) {
  const url = force ? `plugin/${props.pluginId}/items?refresh=1` : `plugin/${props.pluginId}/items`;
  try {
    const response = unwrap(await props.api.get(url, { feedback: 'silent' }));
    if (response?.success) {
      items.value = response.items || [];
      cachedAt.value = response.cached_at || null;
    }
  } catch (err) {
    items.value = [];
  }
}

async function refreshBalance() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/balance`, { feedback: 'silent' }));
    if (response?.balance) liveBalance.value = response.balance;
  } catch (err) {
    // 忽略：保留上一次已知余额
  } finally {
    balanceLoading.value = false;
  }
}

async function refreshItems() {
  refreshing.value = true;
  await Promise.all([loadItems(true), loadLatest(), refreshBalance()]);
  refreshing.value = false;
}

async function saveConfig() {
  saving.value = true;
  message.value = '';
  try {
    const payload = { ...form };
    for (const row of goodsRows.value) {
      const max = maxAuto(row);
      const cur = Number(payload[amountKey(row.key)] || 1);
      payload[amountKey(row.key)] = Math.max(1, Math.min(cur, max));
    }
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/config`, payload));
    if (response?.success) {
      messageType.value = 'success';
      message.value = '自动购买设置已保存并生效';
      await Promise.all([loadConfig(), loadLatest()]);
    } else {
      messageType.value = 'error';
      message.value = response?.message || '保存失败';
    }
  } catch (err) {
    messageType.value = 'error';
    message.value = '保存失败';
  } finally {
    saving.value = false;
  }
}

async function buyNow(item) {
  const amount = Math.max(1, Math.min(Number(amountOf(item)) || 1, maxOf(item)));
  buyingId.value = item.id;
  message.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/buy`,
      { item_id: item.id, amount }));
    const state = response?.state || (response?.success ? '购买成功' : '失败');
    messageType.value = response?.success ? 'success' : 'error';
    message.value = `${item.name}：${state}。${response?.message || ''}`;
    await loadItems(true);
    await loadLatest();
    if (response?.balance) liveBalance.value = response.balance;
    await refreshBalance();
  } catch (err) {
    messageType.value = 'error';
    message.value = `${item.name}：购买请求失败`;
  } finally {
    buyingId.value = null;
  }
}

async function runAuto() {
  buyingId.value = 'auto';
  message.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/run`));
    const ok = response?.success;
    messageType.value = ok ? 'success' : 'error';
    message.value = ok ? `自动购买完成：${response?.summary || ''}` : `自动购买失败：${response?.message || ''}`;
    await loadItems(true);
    await loadLatest();
    if (response?.balance) liveBalance.value = response.balance;
    await refreshBalance();
  } catch (err) {
    messageType.value = 'error';
    message.value = '触发失败';
  } finally {
    buyingId.value = null;
  }
}

function resultText(r) {
  if (!r.success) return '失败'
  return r.skipped ? '已购买过' : '购买成功'
}

function rowColor(r) {
  if (!r.success) return 'error'
  return r.skipped ? 'info' : 'success'
}

// 最近购买明细：手动与自动统一展示，旧的仅有 results 的数据做兼容回退
const historyRows = computed(() => {
  const list = latest.value?.history;
  if (Array.isArray(list) && list.length) return list
  const results = latest.value?.results;
  if (!Array.isArray(results)) return []
  return results.map(r => ({
    name: r.name,
    amount: r.amount,
    state: resultText(r),
    success: r.success,
    skipped: r.skipped,
    message: r.message,
    source: '自动',
    time: latest.value?.time,
  }))
});

function onClose() {
  emit('close');
}

onMounted(async () => {
  emit('layout', { maxWidth: '58rem' });
  await Promise.all([loadConfig(), loadLatest(), loadItems(), refreshBalance()]);
  loading.value = false;
});

return (_ctx, _cache) => {
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_list_item_title = _resolveComponent("v-list-item-title");
  const _component_v_list_item_subtitle = _resolveComponent("v-list-item-subtitle");
  const _component_v_list_item = _resolveComponent("v-list-item");
  const _component_v_list = _resolveComponent("v-list");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_card_actions = _resolveComponent("v-card-actions");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_card_title, { class: "d-flex align-center pt-4 pb-3" }, {
        default: _withCtx(() => [
          _createVNode(_component_v_icon, {
            color: "success",
            class: "mr-2"
          }, {
            default: _withCtx(() => [...(_cache[8] || (_cache[8] = [
              _createTextVNode("mdi-frog", -1)
            ]))]),
            _: 1
          }),
          _cache[10] || (_cache[10] = _createElementVNode("span", { class: "text-h6" }, "青蛙蝌蚪福利", -1)),
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
                default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
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
          (message.value)
            ? (_openBlock(), _createBlock(_component_v_alert, {
                key: 0,
                type: messageType.value,
                variant: "tonal",
                density: "comfortable",
                class: "mb-4"
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(message.value), 1)
                ]),
                _: 1
              }, 8, ["type"]))
            : _createCommentVNode("", true),
          _createVNode(_component_v_row, {
            dense: "",
            class: "mb-1"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "3"
              }, {
                default: _withCtx(() => [
                  _cache[11] || (_cache[11] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "账户余额", -1)),
                  _createElementVNode("div", _hoisted_1, _toDisplayString(liveBalance.value ?? (balanceLoading.value ? '读取中…' : '—')), 1)
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "3"
              }, {
                default: _withCtx(() => [
                  _cache[12] || (_cache[12] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "下次自动购买", -1)),
                  _createElementVNode("div", _hoisted_2, _toDisplayString(nextPlanText.value), 1)
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "3"
              }, {
                default: _withCtx(() => [
                  _cache[13] || (_cache[13] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "最近时间", -1)),
                  _createElementVNode("div", _hoisted_3, _toDisplayString(latest.value?.time || '-'), 1)
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "6",
                sm: "3"
              }, {
                default: _withCtx(() => [
                  _cache[14] || (_cache[14] = _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "站点", -1)),
                  _createElementVNode("div", _hoisted_4, _toDisplayString(latest.value?.site || '-'), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          _createVNode(_component_v_divider, { class: "my-3" }),
          _createElementVNode("div", _hoisted_5, [
            _createVNode(_component_v_chip, {
              size: "small",
              variant: "tonal",
              color: "primary",
              class: "mr-2"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_v_icon, {
                  start: "",
                  size: "x-small"
                }, {
                  default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
                    _createTextVNode("mdi-cart-outline", -1)
                  ]))]),
                  _: 1
                }),
                _cache[16] || (_cache[16] = _createTextVNode("手动购买 ", -1))
              ]),
              _: 1
            }),
            _cache[18] || (_cache[18] = _createElementVNode("span", { class: "text-caption text-medium-emphasis" }, "立即买一次，不影响每日自动任务", -1)),
            _createVNode(_component_v_spacer),
            _createVNode(_component_v_btn, {
              size: "x-small",
              variant: "text",
              loading: refreshing.value,
              onClick: refreshItems
            }, {
              default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                _createTextVNode("刷新", -1)
              ]))]),
              _: 1
            }, 8, ["loading"])
          ]),
          (loading.value)
            ? (_openBlock(), _createElementBlock("div", _hoisted_6, "加载中…"))
            : (_openBlock(), _createBlock(_component_v_row, {
                key: 2,
                dense: ""
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(manualItems.value, (item) => {
                    return (_openBlock(), _createBlock(_component_v_col, {
                      key: item.id,
                      cols: "12",
                      md: "4"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_card, {
                          variant: "outlined",
                          rounded: "lg",
                          class: "pa-3 h-100"
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_7, [
                              _createVNode(_component_v_icon, {
                                size: "small",
                                color: "primary",
                                class: "mr-2"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(item.icon), 1)
                                ]),
                                _: 2
                              }, 1024),
                              _createElementVNode("div", _hoisted_8, [
                                _createElementVNode("div", _hoisted_9, _toDisplayString(item.name), 1),
                                _createElementVNode("div", _hoisted_10, [
                                  _createTextVNode(_toDisplayString(item.price) + " · 库存 " + _toDisplayString(item.stock) + " ", 1),
                                  (item.limit > 0)
                                    ? (_openBlock(), _createElementBlock("span", _hoisted_11, " · 限购 " + _toDisplayString(item.limit), 1))
                                    : _createCommentVNode("", true)
                                ])
                              ]),
                              (isAuto(item.name))
                                ? (_openBlock(), _createBlock(_component_v_chip, {
                                    key: 0,
                                    size: "x-small",
                                    variant: "tonal",
                                    color: "success"
                                  }, {
                                    default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                                      _createTextVNode(" 自动 ", -1)
                                    ]))]),
                                    _: 1
                                  }))
                                : _createCommentVNode("", true)
                            ]),
                            _createElementVNode("div", _hoisted_12, [
                              _createVNode(_component_v_btn, {
                                icon: "",
                                size: "x-small",
                                variant: "tonal",
                                disabled: amountOf(item) <= 1,
                                onClick: $event => (decAmount(item))
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_v_icon, { size: "small" }, {
                                    default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
                                      _createTextVNode("mdi-minus", -1)
                                    ]))]),
                                    _: 1
                                  })
                                ]),
                                _: 1
                              }, 8, ["disabled", "onClick"]),
                              _createVNode(_component_v_text_field, {
                                "model-value": amountOf(item),
                                "onUpdate:modelValue": v => setAmount(item, v),
                                type: "number",
                                min: "1",
                                max: maxOf(item),
                                variant: "outlined",
                                density: "compact",
                                "hide-details": "",
                                style: {"max-width":"4.5rem"}
                              }, null, 8, ["model-value", "onUpdate:modelValue", "max"]),
                              _createVNode(_component_v_btn, {
                                icon: "",
                                size: "x-small",
                                variant: "tonal",
                                disabled: amountOf(item) >= maxOf(item),
                                onClick: $event => (incAmount(item))
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_v_icon, { size: "small" }, {
                                    default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                                      _createTextVNode("mdi-plus", -1)
                                    ]))]),
                                    _: 1
                                  })
                                ]),
                                _: 1
                              }, 8, ["disabled", "onClick"]),
                              _createVNode(_component_v_spacer),
                              _createVNode(_component_v_btn, {
                                color: "primary",
                                variant: "flat",
                                size: "small",
                                loading: buyingId.value === item.id,
                                onClick: $event => (buyNow(item))
                              }, {
                                default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
                                  _createTextVNode("购买", -1)
                                ]))]),
                                _: 1
                              }, 8, ["loading", "onClick"])
                            ])
                          ]),
                          _: 2
                        }, 1024)
                      ]),
                      _: 2
                    }, 1024))
                  }), 128))
                ]),
                _: 1
              })),
          (!loading.value && !manualItems.value.length)
            ? (_openBlock(), _createElementBlock("div", _hoisted_13, " 未能读取商品列表，请点刷新重试 "))
            : _createCommentVNode("", true),
          _createElementVNode("div", _hoisted_14, " 商品数据更新时间：" + _toDisplayString(cachedText.value), 1),
          _createVNode(_component_v_divider, { class: "my-4" }),
          _createElementVNode("div", _hoisted_15, [
            _createVNode(_component_v_chip, {
              size: "small",
              variant: "tonal",
              color: "secondary",
              class: "mr-1"
            }, {
              default: _withCtx(() => [
                _createVNode(_component_v_icon, {
                  start: "",
                  size: "x-small"
                }, {
                  default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                    _createTextVNode("mdi-clock-outline", -1)
                  ]))]),
                  _: 1
                }),
                _cache[24] || (_cache[24] = _createTextVNode("自动定时购买 ", -1))
              ]),
              _: 1
            }),
            _createElementVNode("span", _hoisted_16, _toDisplayString(form.enabled ? `已启用，每日 ${form.start_time}–${form.end_time} 内随机时刻执行` : '未启用'), 1),
            _createVNode(_component_v_spacer),
            _createVNode(_component_v_btn, {
              size: "small",
              variant: "outlined",
              color: "secondary",
              loading: buyingId.value === 'auto',
              onClick: runAuto
            }, {
              default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                _createTextVNode("立即执行一次", -1)
              ]))]),
              _: 1
            }, 8, ["loading"]),
            _createVNode(_component_v_btn, {
              size: "small",
              variant: "flat",
              color: "success",
              loading: saving.value,
              onClick: saveConfig
            }, {
              default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                _createTextVNode("保存设置", -1)
              ]))]),
              _: 1
            }, 8, ["loading"])
          ]),
          _createVNode(_component_v_card, {
            variant: "outlined",
            rounded: "lg",
            class: "pa-3 mb-3"
          }, {
            default: _withCtx(() => [
              _createElementVNode("div", _hoisted_17, [
                _createVNode(_component_v_icon, {
                  color: form.enabled ? 'success' : 'grey',
                  class: "mr-2"
                }, {
                  default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
                    _createTextVNode("mdi-power", -1)
                  ]))]),
                  _: 1
                }, 8, ["color"]),
                _cache[28] || (_cache[28] = _createElementVNode("div", { class: "flex-grow-1" }, [
                  _createElementVNode("div", { class: "text-body-2 font-weight-medium" }, "启用自动定时购买"),
                  _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, "关闭后不会自动购买，手动购买不受影响")
                ], -1)),
                _createVNode(_component_v_switch, {
                  modelValue: form.enabled,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((form.enabled) = $event)),
                  color: "success",
                  "hide-details": "",
                  inset: "",
                  class: "flex-grow-0"
                }, null, 8, ["modelValue"])
              ]),
              _createElementVNode("div", _hoisted_18, [
                _cache[29] || (_cache[29] = _createElementVNode("span", { class: "text-subtitle-2" }, "参与自动购买的商品", -1)),
                _createVNode(_component_v_spacer),
                (form.enabled)
                  ? (_openBlock(), _createBlock(_component_v_chip, {
                      key: 0,
                      size: "x-small",
                      variant: "tonal",
                      color: "success"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(" 已选 " + _toDisplayString(enabledGoodsCount.value) + " 项 ", 1)
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
                          class: "pa-3 h-100",
                          style: _normalizeStyle(form[onKey(row.key)] ? 'border-color: rgb(var(--v-theme-success));' : '')
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_19, [
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
                              _createElementVNode("div", _hoisted_20, [
                                _createElementVNode("div", _hoisted_21, _toDisplayString(row.label), 1),
                                _createElementVNode("div", _hoisted_22, [
                                  (row.price)
                                    ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                        _createTextVNode("单价 " + _toDisplayString(row.price), 1)
                                      ], 64))
                                    : (_openBlock(), _createElementBlock(_Fragment, { key: 1 }, [
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
                            _createElementVNode("div", _hoisted_23, [
                              _cache[32] || (_cache[32] = _createElementVNode("span", { class: "text-caption text-medium-emphasis" }, "数量", -1)),
                              _createVNode(_component_v_btn, {
                                icon: "",
                                size: "x-small",
                                variant: "tonal",
                                disabled: !form[onKey(row.key)] || form[amountKey(row.key)] <= 1,
                                onClick: $event => (decAuto(row))
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_v_icon, { size: "small" }, {
                                    default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                                      _createTextVNode("mdi-minus", -1)
                                    ]))]),
                                    _: 1
                                  })
                                ]),
                                _: 1
                              }, 8, ["disabled", "onClick"]),
                              _createElementVNode("span", _hoisted_24, _toDisplayString(form[amountKey(row.key)] || 1), 1),
                              _createVNode(_component_v_btn, {
                                icon: "",
                                size: "x-small",
                                variant: "tonal",
                                disabled: !form[onKey(row.key)] || form[amountKey(row.key)] >= maxAuto(row),
                                onClick: $event => (incAuto(row))
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_v_icon, { size: "small" }, {
                                    default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
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
                        }, 1032, ["style"])
                      ]),
                      _: 2
                    }, 1024))
                  }), 128))
                ]),
                _: 1
              }),
              _createElementVNode("div", _hoisted_25, [
                _createVNode(_component_v_icon, {
                  size: "small",
                  class: "mr-1"
                }, {
                  default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                    _createTextVNode("mdi-clock-outline", -1)
                  ]))]),
                  _: 1
                }),
                _cache[34] || (_cache[34] = _createTextVNode("执行时间段 ", -1))
              ]),
              _createVNode(_component_v_row, { dense: "" }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_col, { cols: "6" }, {
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
                  _createVNode(_component_v_col, { cols: "6" }, {
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
                    default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                      _createElementVNode("div", { class: "text-caption text-medium-emphasis mt-1" }, " 每天在该区间随机选一个时刻执行，保存后立即重新生成。 ", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              _createElementVNode("div", _hoisted_26, [
                _createVNode(_component_v_icon, {
                  size: "small",
                  class: "mr-1"
                }, {
                  default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                    _createTextVNode("mdi-bell-outline", -1)
                  ]))]),
                  _: 1
                }),
                _cache[37] || (_cache[37] = _createTextVNode("通知 ", -1))
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
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.notify_enabled) = $event)),
                        color: "success",
                        inset: "",
                        "hide-details": ""
                      }, {
                        label: _withCtx(() => [...(_cache[38] || (_cache[38] = [
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
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.notify_on_error) = $event)),
                        color: "success",
                        inset: "",
                        "hide-details": ""
                      }, {
                        label: _withCtx(() => [...(_cache[39] || (_cache[39] = [
                          _createElementVNode("span", { class: "text-body-2" }, "失败时提醒", -1)
                        ]))]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              _createElementVNode("div", _hoisted_27, [
                _createVNode(_component_v_icon, {
                  size: "small",
                  class: "mr-1"
                }, {
                  default: _withCtx(() => [...(_cache[40] || (_cache[40] = [
                    _createTextVNode("mdi-restart-alert", -1)
                  ]))]),
                  _: 1
                }),
                _cache[41] || (_cache[41] = _createTextVNode("失败自动重试 ", -1))
              ]),
              _createVNode(_component_v_row, { dense: "" }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_col, {
                    cols: "12",
                    sm: "6"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_switch, {
                        modelValue: form.retry_enabled,
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.retry_enabled) = $event)),
                        color: "success",
                        inset: "",
                        "hide-details": ""
                      }, {
                        label: _withCtx(() => [...(_cache[42] || (_cache[42] = [
                          _createElementVNode("span", { class: "text-body-2" }, "购买失败后自动重试", -1)
                        ]))]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_v_col, {
                    cols: "6",
                    sm: "3"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_text_field, {
                        modelValue: form.retry_interval,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.retry_interval) = $event)),
                        modelModifiers: { number: true },
                        type: "number",
                        min: "1",
                        max: "120",
                        disabled: !form.retry_enabled,
                        label: "间隔（分钟）",
                        variant: "outlined",
                        density: "comfortable",
                        "hide-details": ""
                      }, null, 8, ["modelValue", "disabled"])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_v_col, {
                    cols: "6",
                    sm: "3"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_text_field, {
                        modelValue: form.retry_max,
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.retry_max) = $event)),
                        modelModifiers: { number: true },
                        type: "number",
                        min: "1",
                        max: "20",
                        disabled: !form.retry_enabled,
                        label: "最多次数",
                        variant: "outlined",
                        density: "comfortable",
                        "hide-details": ""
                      }, null, 8, ["modelValue", "disabled"])
                    ]),
                    _: 1
                  }),
                  _createVNode(_component_v_col, { cols: "12" }, {
                    default: _withCtx(() => [...(_cache[43] || (_cache[43] = [
                      _createElementVNode("div", { class: "text-caption text-medium-emphasis" }, " 仅在配置的时间段内重试，超出时间段或达到次数上限后不再重试。 ", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          }),
          _cache[44] || (_cache[44] = _createElementVNode("div", { class: "text-caption text-medium-emphasis mb-2" }, "最近购买明细（含手动与自动）", -1)),
          (historyRows.value.length)
            ? (_openBlock(), _createBlock(_component_v_list, {
                key: 4,
                density: "compact",
                class: "pa-0"
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(historyRows.value, (r, idx) => {
                    return (_openBlock(), _createBlock(_component_v_list_item, {
                      key: idx,
                      class: "px-0"
                    }, {
                      prepend: _withCtx(() => [
                        _createVNode(_component_v_chip, {
                          color: rowColor(r),
                          size: "x-small",
                          variant: "tonal",
                          class: "mr-2"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(r.state), 1)
                          ]),
                          _: 2
                        }, 1032, ["color"])
                      ]),
                      default: _withCtx(() => [
                        _createVNode(_component_v_list_item_title, { class: "text-body-2" }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(r.name), 1),
                            (r.amount)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_28, " · " + _toDisplayString(r.amount) + " 件", 1))
                              : _createCommentVNode("", true),
                            _createVNode(_component_v_chip, {
                              size: "x-small",
                              variant: "text",
                              class: "ml-1",
                              color: r.source === '自动' ? 'secondary' : 'primary'
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(r.source), 1)
                              ]),
                              _: 2
                            }, 1032, ["color"])
                          ]),
                          _: 2
                        }, 1024),
                        _createVNode(_component_v_list_item_subtitle, { class: "text-caption" }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(r.message), 1),
                            (r.time)
                              ? (_openBlock(), _createElementBlock("span", _hoisted_29, " · " + _toDisplayString(r.time), 1))
                              : _createCommentVNode("", true)
                          ]),
                          _: 2
                        }, 1024)
                      ]),
                      _: 2
                    }, 1024))
                  }), 128))
                ]),
                _: 1
              }))
            : (_openBlock(), _createElementBlock("div", _hoisted_30, "暂无购买记录"))
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
            default: _withCtx(() => [...(_cache[45] || (_cache[45] = [
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
