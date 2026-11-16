import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const {createElementVNode:_createElementVNode,createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,toDisplayString:_toDisplayString,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,normalizeClass:_normalizeClass,createElementBlock:_createElementBlock,renderList:_renderList,Fragment:_Fragment} = await importShared('vue');


const _hoisted_1 = { class: "d-flex align-center" };
const _hoisted_2 = { class: "flex-grow-1" };
const _hoisted_3 = { class: "text-caption text-medium-emphasis" };
const _hoisted_4 = { class: "text-subtitle-2 mb-2 d-flex align-center" };
const _hoisted_5 = { class: "d-flex align-center ga-2 mt-1 flex-wrap" };
const _hoisted_6 = { class: "d-flex align-center mb-2" };
const _hoisted_7 = { class: "min-w-0" };
const _hoisted_8 = { class: "text-body-2 font-weight-medium text-truncate" };
const _hoisted_9 = { class: "text-caption text-medium-emphasis text-truncate" };
const _hoisted_10 = { class: "d-flex align-center mb-2" };
const _hoisted_11 = { class: "text-body-2 font-weight-medium mb-1" };
const _hoisted_12 = { class: "text-caption text-medium-emphasis" };
const _hoisted_13 = { class: "text-right" };
const _hoisted_14 = { class: "text-subtitle-2 mb-2 d-flex align-center" };
const _hoisted_15 = { class: "text-subtitle-2 mb-2 d-flex align-center" };
const _hoisted_16 = { class: "d-flex justify-end ga-2 mt-4" };
const _hoisted_17 = {
  class: "mx-auto d-flex align-center justify-center",
  style: {"width":"220px","height":"220px"}
};
const _hoisted_18 = ["src"];

const {computed,onMounted,onUnmounted,reactive,ref,watch} = await importShared('vue');



const _sfc_main = {
  __name: 'SettingsForm',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  initialConfig: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
},
  emits: ['save', 'close', 'refresh'],
  setup(__props, { emit: __emit }) {

/**
 * DDNSTO 自动续期的共享设置表单。
 * 配置弹窗（Config.vue）与插件详情页的「设置」层（Page.vue）复用同一份表单，
 * 避免两处设置不一致。同时提供穿透域名的查看与增删改。
 */
const props = __props;

const emit = __emit;

const form = reactive({
  enabled: false,
  base_url: 'https://web.kooldns.cn',
  cookie: '',
  device_ids: [],
  check_hours: 6,
  renew_before_days: 1,
  notify_enabled: true,
  notify_on_error: true,
});

const devices = ref([]);
const probing = ref(false);
const probeState = ref({ ok: null, message: '' });
const showCookie = ref(false);

// 微信扫码登录
const qrDialog = ref(false);
const qrImage = ref('');
const qrToken = ref('');
const qrStatus = ref('idle');
const qrMessage = ref('');
const qrLoading = ref(false);
let qrTimer = null;
let qrBusy = false;

// 域名管理
const domainDialog = ref(false);
const domainSaving = ref(false);
const domainMessage = ref('');
const deleteTarget = ref(null);
const domainForm = reactive({
  record_id: null,
  device_id: null,
  prefix: '',
  target: '',
  note: '',
});

const CHECK_OPTIONS = [
  { title: '每 1 小时', value: 1 },
  { title: '每 3 小时', value: 3 },
  { title: '每 6 小时', value: 6 },
  { title: '每 12 小时', value: 12 },
  { title: '每天 09:00', value: 24 },
];

const DAY_OPTIONS = [
  { title: '到期后再领取', value: 0 },
  { title: '剩余不足 1 天', value: 1 },
  { title: '剩余不足 2 天', value: 2 },
  { title: '剩余不足 3 天', value: 3 },
  { title: '剩余不足 4 天', value: 4 },
  { title: '剩余不足 5 天', value: 5 },
  { title: '剩余不足 6 天', value: 6 },
  { title: '剩余不足 7 天', value: 7 },
];

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) form[key] = config[key];
  }
  if (!Array.isArray(form.device_ids)) form.device_ids = [];
  form.device_ids = form.device_ids.map(Number).filter(id => Number.isFinite(id));
}

applyConfig(props.initialConfig);
watch(() => props.initialConfig, value => applyConfig(value), { deep: true });

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

const cookieReady = computed(() => String(form.cookie || '').trim().length > 0);
const selectedText = computed(() => {
  if (!form.device_ids.length) return '全部符合条件的设备'
  return `已选 ${form.device_ids.length} 台设备`
});
const deviceOptions = computed(() =>
  devices.value.map(d => ({ title: d.name, value: d.id })),
);
const domainDevices = computed(() =>
  devices.value.filter(d => (d.domains || []).length > 0),
);

async function probe() {
  if (!cookieReady.value) {
    probeState.value = { ok: false, message: '请先填写 Cookie' };
    return
  }
  probing.value = true;
  probeState.value = { ok: null, message: '' };
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/probe`, {
      cookie: form.cookie,
      base_url: form.base_url,
    }));
    if (response?.success) {
      devices.value = response.devices || [];
      probeState.value = {
        ok: true,
        message: `连接成功（账号 ${response.user?.username || response.user?.id}，共 ${response.device_count} 台设备）`,
      };
      const ids = new Set(devices.value.map(d => d.id));
      form.device_ids = form.device_ids.filter(id => ids.has(id));
    } else {
      devices.value = [];
      probeState.value = { ok: false, message: response?.message || '连接失败' };
    }
  } catch (err) {
    devices.value = [];
    probeState.value = { ok: false, message: err?.message || '连接失败' };
  } finally {
    probing.value = false;
  }
}

function stopQrPolling() {
  if (qrTimer) {
    clearInterval(qrTimer);
    qrTimer = null;
  }
  qrBusy = false;
}

async function startQrLogin() {
  stopQrPolling();
  qrDialog.value = true;
  qrLoading.value = true;
  qrStatus.value = 'loading';
  qrMessage.value = '正在获取二维码…';
  qrImage.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/login/qr`));
    if (!response?.success) {
      qrStatus.value = 'error';
      qrMessage.value = response?.message || '二维码获取失败';
      return
    }
    qrToken.value = response.token;
    qrImage.value = response.qr_image || '';
    qrStatus.value = 'pending';
    qrMessage.value = response.message || '请使用微信扫描二维码';
    // 后端是长轮询，用 busy 标记保证同一时刻只有一个请求在途
    qrTimer = setInterval(() => {
      if (qrBusy) return
      qrBusy = true;
      pollQrLogin().finally(() => { qrBusy = false; });
    }, 1000);
  } catch (err) {
    qrStatus.value = 'error';
    qrMessage.value = err?.message || '二维码获取失败';
  } finally {
    qrLoading.value = false;
  }
}

async function pollQrLogin() {
  if (!qrToken.value) return
  try {
    const response = unwrap(await props.api.get(
      `plugin/${props.pluginId}/login/qr/poll?token=${encodeURIComponent(qrToken.value)}`,
      { feedback: 'silent' },
    ));
    const status = response?.status || 'pending';
    qrMessage.value = response?.message || qrMessage.value;
    if (status === 'success') {
      stopQrPolling();
      qrStatus.value = 'success';
      if (response.cookie) form.cookie = response.cookie;
      emit('refresh');
      await probe();
      setTimeout(() => { qrDialog.value = false; }, 1200);
      return
    }
    if (status === 'expired' || status === 'error') {
      stopQrPolling();
      qrStatus.value = status;
      return
    }
    qrStatus.value = status;
  } catch (err) {
    stopQrPolling();
    qrStatus.value = 'error';
    qrMessage.value = err?.message || '登录状态查询失败';
  }
}

function closeQrDialog() {
  stopQrPolling();
  qrDialog.value = false;
}

function openAddDomain(deviceId = null) {
  domainForm.record_id = null;
  domainForm.device_id = deviceId ?? form.device_ids[0] ?? devices.value[0]?.id ?? null;
  domainForm.prefix = '';
  domainForm.target = '';
  domainForm.note = '';
  domainMessage.value = '';
  domainDialog.value = true;
}

function openEditDomain(device, domain) {
  domainForm.record_id = domain.id;
  domainForm.device_id = device.id;
  domainForm.prefix = domain.prefix || '';
  domainForm.target = domain.target || '';
  domainForm.note = domain.note || '';
  domainMessage.value = '';
  domainDialog.value = true;
}

async function saveDomain() {
  if (domainSaving.value) return
  domainSaving.value = true;
  domainMessage.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/domain/save`, {
      record_id: domainForm.record_id,
      device_id: domainForm.device_id,
      prefix: domainForm.prefix,
      target: domainForm.target,
      note: domainForm.note,
    }));
    if (!response?.success) {
      domainMessage.value = response?.message || '保存失败';
      return
    }
    domainDialog.value = false;
    probeState.value = { ok: true, message: response.message };
    await probe();
  } catch (err) {
    domainMessage.value = err?.message || '保存失败';
  } finally {
    domainSaving.value = false;
  }
}

async function confirmDeleteDomain() {
  if (!deleteTarget.value || domainSaving.value) return
  domainSaving.value = true;
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/domain/delete`, {
      record_id: deleteTarget.value.id,
    }));
    probeState.value = {
      ok: !!response?.success,
      message: response?.message || '删除完成',
    };
    deleteTarget.value = null;
    await probe();
  } catch (err) {
    probeState.value = { ok: false, message: err?.message || '删除失败' };
  } finally {
    domainSaving.value = false;
  }
}

function onSave() {
  emit('save', { ...form, device_ids: [...form.device_ids] });
}

onMounted(() => {
  if (cookieReady.value) probe();
});

onUnmounted(() => {
  stopQrPolling();
});

return (_ctx, _cache) => {
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_textarea = _resolveComponent("v-textarea");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_checkbox = _resolveComponent("v-checkbox");
  const _component_v_table = _resolveComponent("v-table");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_card_actions = _resolveComponent("v-card-actions");
  const _component_v_dialog = _resolveComponent("v-dialog");
  const _component_v_progress_circular = _resolveComponent("v-progress-circular");

  return (_openBlock(), _createElementBlock("div", null, [
    _createVNode(_component_v_alert, {
      type: "info",
      variant: "tonal",
      density: "compact",
      class: "mb-4 text-caption"
    }, {
      default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
        _createTextVNode(" 登录页有图形验证码，无法用账号密码自动登录；点「微信扫码登录」用手机微信扫一下即可自动获取并保存 Cookie。 也可以手动复制：打开 ", -1),
        _createElementVNode("a", {
          href: "https://web.kooldns.cn",
          target: "_blank",
          rel: "noopener"
        }, "web.kooldns.cn", -1),
        _createTextVNode(" 登录后按 F12 → 应用 → Cookie，按 ", -1),
        _createElementVNode("code", null, "sessionid=xxx; csrftoken=yyy", -1),
        _createTextVNode(" 格式填入。 Cookie 有效期约 14 天，过期后重新扫码即可。 ", -1)
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
            default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
              _createTextVNode("mdi-clock-outline", -1)
            ]))]),
            _: 1
          }, 8, ["color"]),
          _createElementVNode("div", _hoisted_2, [
            _cache[22] || (_cache[22] = _createElementVNode("div", { class: "text-body-2 font-weight-medium" }, "自动定时续期", -1)),
            _createElementVNode("div", _hoisted_3, _toDisplayString(form.enabled ? '已启用，满足条件时自动重新领取免费套餐' : '未启用，仅支持手动续期'), 1)
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
      _createVNode(_component_v_icon, {
        size: "small",
        class: "mr-1"
      }, {
        default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
          _createTextVNode("mdi-link-variant", -1)
        ]))]),
        _: 1
      }),
      _cache[24] || (_cache[24] = _createTextVNode("站点与登录凭证 ", -1))
    ]),
    _createVNode(_component_v_row, { dense: "" }, {
      default: _withCtx(() => [
        _createVNode(_component_v_col, {
          cols: "12",
          md: "8"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_text_field, {
              modelValue: form.base_url,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.base_url) = $event)),
              label: "站点地址",
              variant: "outlined",
              density: "comfortable",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, {
          cols: "12",
          md: "4",
          class: "d-flex align-center"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_btn, {
              block: "",
              color: "success",
              variant: "tonal",
              "prepend-icon": "mdi-qrcode-scan",
              onClick: startQrLogin
            }, {
              default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                _createTextVNode("微信扫码登录", -1)
              ]))]),
              _: 1
            })
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, { cols: "12" }, {
          default: _withCtx(() => [
            (showCookie.value)
              ? (_openBlock(), _createBlock(_component_v_textarea, {
                  key: 0,
                  modelValue: form.cookie,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((form.cookie) = $event)),
                  label: "会话 Cookie",
                  placeholder: "sessionid=xxx; csrftoken=yyy",
                  variant: "outlined",
                  density: "comfortable",
                  rows: "2",
                  "auto-grow": "",
                  "hide-details": "",
                  class: "mt-3"
                }, null, 8, ["modelValue"]))
              : (_openBlock(), _createBlock(_component_v_text_field, {
                  key: 1,
                  modelValue: form.cookie,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.cookie) = $event)),
                  type: "password",
                  label: "会话 Cookie",
                  placeholder: "sessionid=xxx; csrftoken=yyy",
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": "",
                  class: "mt-3"
                }, null, 8, ["modelValue"])),
            _createElementVNode("div", _hoisted_5, [
              _createVNode(_component_v_btn, {
                size: "small",
                variant: "text",
                color: "primary",
                "prepend-icon": showCookie.value ? 'mdi-eye-off' : 'mdi-eye',
                onClick: _cache[4] || (_cache[4] = $event => (showCookie.value = !showCookie.value))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(showCookie.value ? '隐藏 Cookie' : '显示 Cookie'), 1)
                ]),
                _: 1
              }, 8, ["prepend-icon"]),
              _createVNode(_component_v_btn, {
                size: "small",
                variant: "text",
                color: "primary",
                loading: probing.value,
                "prepend-icon": "mdi-connection",
                onClick: probe
              }, {
                default: _withCtx(() => [...(_cache[26] || (_cache[26] = [
                  _createTextVNode("读取设备与域名", -1)
                ]))]),
                _: 1
              }, 8, ["loading"]),
              _createVNode(_component_v_spacer),
              (probeState.value.message)
                ? (_openBlock(), _createElementBlock("span", {
                    key: 0,
                    class: _normalizeClass(["text-caption", probeState.value.ok ? 'text-success' : 'text-error'])
                  }, _toDisplayString(probeState.value.message), 3))
                : _createCommentVNode("", true)
            ])
          ]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createVNode(_component_v_divider, { class: "my-4" }),
    _createElementVNode("div", _hoisted_6, [
      _createVNode(_component_v_icon, {
        size: "small",
        class: "mr-1"
      }, {
        default: _withCtx(() => [...(_cache[27] || (_cache[27] = [
          _createTextVNode("mdi-devices", -1)
        ]))]),
        _: 1
      }),
      _cache[28] || (_cache[28] = _createElementVNode("span", { class: "text-subtitle-2" }, "自动续期设备", -1)),
      _createVNode(_component_v_spacer),
      _createVNode(_component_v_chip, {
        size: "x-small",
        variant: "tonal"
      }, {
        default: _withCtx(() => [
          _createTextVNode(_toDisplayString(selectedText.value), 1)
        ]),
        _: 1
      })
    ]),
    (!devices.value.length)
      ? (_openBlock(), _createBlock(_component_v_alert, {
          key: 0,
          type: "warning",
          variant: "tonal",
          density: "compact",
          class: "text-caption mb-2"
        }, {
          default: _withCtx(() => [...(_cache[29] || (_cache[29] = [
            _createTextVNode(" 尚未读取到设备。扫码或填入 Cookie 后点击「读取设备与域名」，即可勾选需要自动续期的设备； 不勾选则对全部符合条件的设备生效。 ", -1)
          ]))]),
          _: 1
        }))
      : (_openBlock(), _createBlock(_component_v_row, {
          key: 1,
          dense: ""
        }, {
          default: _withCtx(() => [
            (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(devices.value, (device) => {
              return (_openBlock(), _createBlock(_component_v_col, {
                key: device.id,
                cols: "12",
                md: "6"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_card, {
                    variant: "outlined",
                    rounded: "lg",
                    class: "pa-2"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_checkbox, {
                        modelValue: form.device_ids,
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.device_ids) = $event)),
                        value: device.id,
                        "hide-details": "",
                        density: "compact",
                        color: "primary"
                      }, {
                        label: _withCtx(() => [
                          _createElementVNode("div", _hoisted_7, [
                            _createElementVNode("div", _hoisted_8, _toDisplayString(device.name), 1),
                            _createElementVNode("div", _hoisted_9, [
                              _createTextVNode(_toDisplayString(device.status) + " · " + _toDisplayString(device.plan_name) + " ", 1),
                              (device.expires_at)
                                ? (_openBlock(), _createElementBlock(_Fragment, { key: 0 }, [
                                    _createTextVNode(" · 至 " + _toDisplayString(device.expires_at), 1)
                                  ], 64))
                                : _createCommentVNode("", true)
                            ])
                          ])
                        ]),
                        _: 2
                      }, 1032, ["modelValue", "value"])
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
    _createVNode(_component_v_divider, { class: "my-4" }),
    _createElementVNode("div", _hoisted_10, [
      _createVNode(_component_v_icon, {
        size: "small",
        class: "mr-1"
      }, {
        default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
          _createTextVNode("mdi-web", -1)
        ]))]),
        _: 1
      }),
      _cache[32] || (_cache[32] = _createElementVNode("span", { class: "text-subtitle-2" }, "穿透域名管理", -1)),
      _createVNode(_component_v_spacer),
      _createVNode(_component_v_btn, {
        size: "small",
        color: "primary",
        variant: "tonal",
        "prepend-icon": "mdi-plus",
        disabled: !devices.value.length,
        onClick: _cache[6] || (_cache[6] = $event => (openAddDomain()))
      }, {
        default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
          _createTextVNode("添加域名", -1)
        ]))]),
        _: 1
      }, 8, ["disabled"])
    ]),
    (!domainDevices.value.length)
      ? (_openBlock(), _createBlock(_component_v_alert, {
          key: 2,
          type: "info",
          variant: "tonal",
          density: "compact",
          class: "text-caption mb-2"
        }, {
          default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
            _createTextVNode(" 没有读取到已配置的域名。请先在上方点击「读取设备与域名」。 ", -1)
          ]))]),
          _: 1
        }))
      : _createCommentVNode("", true),
    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(domainDevices.value, (device) => {
      return (_openBlock(), _createElementBlock("div", {
        key: device.id,
        class: "mb-3"
      }, [
        _createElementVNode("div", _hoisted_11, [
          _createVNode(_component_v_icon, {
            size: "x-small",
            class: "mr-1"
          }, {
            default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
              _createTextVNode("mdi-router-wireless", -1)
            ]))]),
            _: 1
          }),
          _createTextVNode(_toDisplayString(device.name) + " ", 1),
          _createElementVNode("span", _hoisted_12, "（" + _toDisplayString(device.domains.length) + " 条）", 1)
        ]),
        _createVNode(_component_v_table, {
          density: "compact",
          class: "text-caption"
        }, {
          default: _withCtx(() => [
            _cache[37] || (_cache[37] = _createElementVNode("thead", null, [
              _createElementVNode("tr", null, [
                _createElementVNode("th", { class: "text-left" }, "备注"),
                _createElementVNode("th", { class: "text-left" }, "外网域名"),
                _createElementVNode("th", { class: "text-left" }, "内网地址"),
                _createElementVNode("th", { class: "text-right" }, "操作")
              ])
            ], -1)),
            _createElementVNode("tbody", null, [
              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(device.domains, (domain) => {
                return (_openBlock(), _createElementBlock("tr", {
                  key: domain.id
                }, [
                  _createElementVNode("td", null, _toDisplayString(domain.note || '—'), 1),
                  _createElementVNode("td", null, _toDisplayString(domain.url || domain.prefix || '—'), 1),
                  _createElementVNode("td", null, _toDisplayString(domain.target || '—'), 1),
                  _createElementVNode("td", _hoisted_13, [
                    _createVNode(_component_v_btn, {
                      icon: "",
                      size: "x-small",
                      variant: "text",
                      title: "编辑",
                      onClick: $event => (openEditDomain(device, domain))
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_icon, { size: "small" }, {
                          default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                            _createTextVNode("mdi-pencil", -1)
                          ]))]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["onClick"]),
                    _createVNode(_component_v_btn, {
                      icon: "",
                      size: "x-small",
                      variant: "text",
                      color: "error",
                      title: "删除",
                      onClick: $event => (deleteTarget.value = { ...domain, deviceName: device.name })
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_icon, { size: "small" }, {
                          default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                            _createTextVNode("mdi-delete", -1)
                          ]))]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["onClick"])
                  ])
                ]))
              }), 128))
            ])
          ]),
          _: 2
        }, 1024)
      ]))
    }), 128)),
    _createVNode(_component_v_divider, { class: "my-4" }),
    _createElementVNode("div", _hoisted_14, [
      _createVNode(_component_v_icon, {
        size: "small",
        class: "mr-1"
      }, {
        default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
          _createTextVNode("mdi-tune", -1)
        ]))]),
        _: 1
      }),
      _cache[39] || (_cache[39] = _createTextVNode("执行策略 ", -1))
    ]),
    _createVNode(_component_v_row, { dense: "" }, {
      default: _withCtx(() => [
        _createVNode(_component_v_col, {
          cols: "12",
          sm: "6"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_select, {
              modelValue: form.check_hours,
              "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.check_hours) = $event)),
              items: CHECK_OPTIONS,
              "item-title": "title",
              "item-value": "value",
              label: "检查间隔",
              variant: "outlined",
              density: "comfortable",
              "hide-details": ""
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
              modelValue: form.renew_before_days,
              "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((form.renew_before_days) = $event)),
              items: DAY_OPTIONS,
              "item-title": "title",
              "item-value": "value",
              label: "自动续期时机",
              variant: "outlined",
              density: "comfortable",
              "hide-details": ""
            }, null, 8, ["modelValue"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_col, { cols: "12" }, {
          default: _withCtx(() => [...(_cache[40] || (_cache[40] = [
            _createElementVNode("div", { class: "text-caption text-medium-emphasis mt-1" }, " 免费套餐不可叠加，但未到期也能重新领取，新套餐有效期从领取时刻重新计算 7 天。 例如剩余 4 天时领取，有效期会变成「今天 + 7 天」，不会浪费。 详情页的「立即续期」按钮不受此设置限制，会直接领取。 ", -1)
          ]))]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createVNode(_component_v_divider, { class: "my-4" }),
    _createElementVNode("div", _hoisted_15, [
      _createVNode(_component_v_icon, {
        size: "small",
        class: "mr-1"
      }, {
        default: _withCtx(() => [...(_cache[41] || (_cache[41] = [
          _createTextVNode("mdi-bell-outline", -1)
        ]))]),
        _: 1
      }),
      _cache[42] || (_cache[42] = _createTextVNode("通知 ", -1))
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
              "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((form.notify_enabled) = $event)),
              color: "success",
              inset: "",
              "hide-details": ""
            }, {
              label: _withCtx(() => [...(_cache[43] || (_cache[43] = [
                _createElementVNode("span", { class: "text-body-2" }, "续期成功通知", -1)
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
              "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((form.notify_on_error) = $event)),
              color: "success",
              inset: "",
              "hide-details": ""
            }, {
              label: _withCtx(() => [...(_cache[44] || (_cache[44] = [
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
    _createElementVNode("div", _hoisted_16, [
      _createVNode(_component_v_btn, {
        color: "primary",
        variant: "flat",
        loading: __props.saving,
        onClick: onSave
      }, {
        default: _withCtx(() => [...(_cache[45] || (_cache[45] = [
          _createTextVNode("保存设置", -1)
        ]))]),
        _: 1
      }, 8, ["loading"])
    ]),
    _createVNode(_component_v_dialog, {
      modelValue: domainDialog.value,
      "onUpdate:modelValue": _cache[17] || (_cache[17] = $event => ((domainDialog).value = $event)),
      "max-width": "440"
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, null, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "text-body-1 d-flex align-center" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_icon, {
                  class: "mr-2",
                  color: "primary"
                }, {
                  default: _withCtx(() => [...(_cache[46] || (_cache[46] = [
                    _createTextVNode("mdi-web", -1)
                  ]))]),
                  _: 1
                }),
                _createTextVNode(" " + _toDisplayString(domainForm.record_id ? '修改域名' : '添加域名') + " ", 1),
                _createVNode(_component_v_spacer),
                _createVNode(_component_v_btn, {
                  icon: "",
                  variant: "text",
                  size: "small",
                  onClick: _cache[11] || (_cache[11] = $event => (domainDialog.value = false))
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_v_icon, null, {
                      default: _withCtx(() => [...(_cache[47] || (_cache[47] = [
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
            _createVNode(_component_v_card_text, null, {
              default: _withCtx(() => [
                _createVNode(_component_v_select, {
                  modelValue: domainForm.device_id,
                  "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((domainForm.device_id) = $event)),
                  items: deviceOptions.value,
                  "item-title": "title",
                  "item-value": "value",
                  label: "所属设备",
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": "",
                  disabled: !!domainForm.record_id,
                  class: "mb-3"
                }, null, 8, ["modelValue", "items", "disabled"]),
                _createVNode(_component_v_text_field, {
                  modelValue: domainForm.prefix,
                  "onUpdate:modelValue": _cache[13] || (_cache[13] = $event => ((domainForm.prefix) = $event)),
                  label: "域名前缀",
                  placeholder: "例如 xiaoluo5（对应 https://xiaoluo5.ddnsto.com）",
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": "",
                  class: "mb-3"
                }, null, 8, ["modelValue"]),
                _createVNode(_component_v_text_field, {
                  modelValue: domainForm.target,
                  "onUpdate:modelValue": _cache[14] || (_cache[14] = $event => ((domainForm.target) = $event)),
                  label: "内网地址",
                  placeholder: "例如 https://ddnsto.example.com",
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": "",
                  class: "mb-3"
                }, null, 8, ["modelValue"]),
                _createVNode(_component_v_text_field, {
                  modelValue: domainForm.note,
                  "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((domainForm.note) = $event)),
                  label: "备注",
                  placeholder: "例如 emby / qb",
                  variant: "outlined",
                  density: "comfortable",
                  "hide-details": ""
                }, null, 8, ["modelValue"]),
                (domainMessage.value)
                  ? (_openBlock(), _createBlock(_component_v_alert, {
                      key: 0,
                      type: "error",
                      variant: "tonal",
                      density: "compact",
                      class: "mt-3 text-caption"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(domainMessage.value), 1)
                      ]),
                      _: 1
                    }))
                  : _createCommentVNode("", true)
              ]),
              _: 1
            }),
            _createVNode(_component_v_card_actions, { class: "px-4 pb-4" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_spacer),
                _createVNode(_component_v_btn, {
                  variant: "text",
                  onClick: _cache[16] || (_cache[16] = $event => (domainDialog.value = false))
                }, {
                  default: _withCtx(() => [...(_cache[48] || (_cache[48] = [
                    _createTextVNode("取消", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_v_btn, {
                  color: "primary",
                  variant: "flat",
                  loading: domainSaving.value,
                  onClick: saveDomain
                }, {
                  default: _withCtx(() => [...(_cache[49] || (_cache[49] = [
                    _createTextVNode(" 保存 ", -1)
                  ]))]),
                  _: 1
                }, 8, ["loading"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(_component_v_dialog, {
      "model-value": !!deleteTarget.value,
      "max-width": "380",
      "onUpdate:modelValue": _cache[19] || (_cache[19] = $event => (deleteTarget.value = null))
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, null, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "text-body-1" }, {
              default: _withCtx(() => [...(_cache[50] || (_cache[50] = [
                _createTextVNode("删除域名", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_v_card_text, { class: "text-body-2" }, {
              default: _withCtx(() => [
                _cache[51] || (_cache[51] = _createTextVNode(" 确定删除 ", -1)),
                _createElementVNode("strong", null, _toDisplayString(deleteTarget.value?.note || deleteTarget.value?.prefix), 1),
                _createTextVNode(" （" + _toDisplayString(deleteTarget.value?.url || deleteTarget.value?.target) + "）吗？删除后该穿透地址将立即失效。 ", 1)
              ]),
              _: 1
            }),
            _createVNode(_component_v_card_actions, { class: "px-4 pb-4" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_spacer),
                _createVNode(_component_v_btn, {
                  variant: "text",
                  onClick: _cache[18] || (_cache[18] = $event => (deleteTarget.value = null))
                }, {
                  default: _withCtx(() => [...(_cache[52] || (_cache[52] = [
                    _createTextVNode("取消", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_v_btn, {
                  color: "error",
                  variant: "flat",
                  loading: domainSaving.value,
                  onClick: confirmDeleteDomain
                }, {
                  default: _withCtx(() => [...(_cache[53] || (_cache[53] = [
                    _createTextVNode("删除", -1)
                  ]))]),
                  _: 1
                }, 8, ["loading"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["model-value"]),
    _createVNode(_component_v_dialog, {
      "model-value": qrDialog.value,
      "max-width": "360",
      persistent: "",
      "onUpdate:modelValue": closeQrDialog
    }, {
      default: _withCtx(() => [
        _createVNode(_component_v_card, null, {
          default: _withCtx(() => [
            _createVNode(_component_v_card_title, { class: "text-body-1 d-flex align-center" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_icon, {
                  class: "mr-2",
                  color: "success"
                }, {
                  default: _withCtx(() => [...(_cache[54] || (_cache[54] = [
                    _createTextVNode("mdi-wechat", -1)
                  ]))]),
                  _: 1
                }),
                _cache[56] || (_cache[56] = _createTextVNode("微信扫码登录 ", -1)),
                _createVNode(_component_v_spacer),
                _createVNode(_component_v_btn, {
                  icon: "",
                  variant: "text",
                  size: "small",
                  onClick: closeQrDialog
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_v_icon, null, {
                      default: _withCtx(() => [...(_cache[55] || (_cache[55] = [
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
            _createVNode(_component_v_card_text, { class: "text-center" }, {
              default: _withCtx(() => [
                _createElementVNode("div", _hoisted_17, [
                  (qrLoading.value)
                    ? (_openBlock(), _createBlock(_component_v_progress_circular, {
                        key: 0,
                        indeterminate: "",
                        color: "primary"
                      }))
                    : (qrImage.value)
                      ? (_openBlock(), _createElementBlock("img", {
                          key: 1,
                          src: qrImage.value,
                          alt: "微信登录二维码",
                          style: {"width":"220px","height":"220px"}
                        }, null, 8, _hoisted_18))
                      : (_openBlock(), _createBlock(_component_v_icon, {
                          key: 2,
                          size: "64",
                          color: "grey"
                        }, {
                          default: _withCtx(() => [...(_cache[57] || (_cache[57] = [
                            _createTextVNode("mdi-qrcode-remove", -1)
                          ]))]),
                          _: 1
                        }))
                ]),
                _createElementVNode("div", {
                  class: _normalizeClass(["text-body-2 mt-3", qrStatus.value === 'error' || qrStatus.value === 'expired' ? 'text-error' : 'text-medium-emphasis'])
                }, _toDisplayString(qrMessage.value), 3),
                (qrStatus.value === 'expired' || qrStatus.value === 'error')
                  ? (_openBlock(), _createBlock(_component_v_btn, {
                      key: 0,
                      class: "mt-3",
                      color: "primary",
                      variant: "tonal",
                      size: "small",
                      "prepend-icon": "mdi-refresh",
                      onClick: startQrLogin
                    }, {
                      default: _withCtx(() => [...(_cache[58] || (_cache[58] = [
                        _createTextVNode("重新获取二维码", -1)
                      ]))]),
                      _: 1
                    }))
                  : _createCommentVNode("", true)
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["model-value"])
  ]))
}
}

};

export { _sfc_main as _ };
