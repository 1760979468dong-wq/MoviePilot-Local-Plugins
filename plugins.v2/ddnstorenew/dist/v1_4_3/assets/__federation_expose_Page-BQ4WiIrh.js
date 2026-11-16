import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _sfc_main$1 } from './SettingsForm-CzC6X3R_.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,createElementVNode:_createElementVNode,toDisplayString:_toDisplayString,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass} = await importShared('vue');


const _hoisted_1 = { key: 1 };
const _hoisted_2 = { class: "d-flex align-center mb-2" };
const _hoisted_3 = { class: "d-flex align-center text-caption text-medium-emphasis mb-1" };
const _hoisted_4 = { class: "d-flex align-center text-caption text-medium-emphasis mb-1" };
const _hoisted_5 = { class: "text-body-2 font-weight-medium" };
const _hoisted_6 = {
  key: 0,
  class: "text-caption text-medium-emphasis mt-1"
};
const _hoisted_7 = { class: "d-flex align-center mb-2 mt-4" };
const _hoisted_8 = { class: "d-flex align-start" };
const _hoisted_9 = { class: "flex-grow-1 min-w-0" };
const _hoisted_10 = { class: "text-body-2 font-weight-medium text-truncate" };
const _hoisted_11 = { class: "text-caption text-medium-emphasis" };
const _hoisted_12 = {
  key: 0,
  class: "text-caption text-medium-emphasis"
};
const _hoisted_13 = {
  key: 1,
  class: "mt-2"
};
const _hoisted_14 = { class: "text-caption text-medium-emphasis mb-1" };
const _hoisted_15 = {
  key: 2,
  class: "text-caption text-medium-emphasis mt-1"
};
const _hoisted_16 = { class: "d-flex align-center mb-2" };
const _hoisted_17 = { class: "text-caption text-medium-emphasis" };
const _hoisted_18 = { key: 2 };

const {computed,onMounted,ref} = await importShared('vue');


const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  sourcePluginId: { type: String, default: '' },
},
  emits: ['action', 'switch', 'close', 'layout'],
  setup(__props, { emit: __emit }) {

/**
 * 插件详情页：分两层。
 * 第一层「状态」只读展示已保存的配置与实时套餐/域名状态；
 * 第二层「设置」才允许修改配置，避免误改。
 */
const props = __props;

const emit = __emit;

const tab = ref('status');
const status = ref(null);
const loading = ref(true);
const saving = ref(false);
const running = ref(false);
const message = ref('');
const messageType = ref('info');

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

const config = computed(() => status.value?.config || {});
const loggedIn = computed(() => !!status.value?.logged_in);
const devices = computed(() => status.value?.devices || []);
const pendingCount = computed(() => devices.value.filter(d => d.needs_renew).length);
const warnings = computed(() => status.value?.last_result?.warnings || []);
const lastResult = computed(() => status.value?.last_result || null);

const CHECK_LABEL = {
  1: '每 1 小时', 3: '每 3 小时', 6: '每 6 小时', 12: '每 12 小时', 24: '每天 09:00',
};

const summary = computed(() => [
  {
    icon: 'mdi-account-circle-outline',
    label: '登录账号',
    value: status.value?.user?.username || (status.value?.user?.id ?? '未登录'),
  },
  {
    icon: 'mdi-gift-outline',
    label: '免费套餐',
    value: status.value?.product?.name
      ? `${status.value.product.name}（${status.value.product.due_days} 天）`
      : '未读取',
  },
  {
    icon: 'mdi-devices',
    label: '设备 / 待续期',
    value: `${status.value?.device_count ?? 0} 台 / ${pendingCount.value} 台`,
  },
  {
    icon: 'mdi-magnify-scan',
    label: '下次执行检查',
    value: status.value?.next_check || status.value?.next_run || '-',
    sub: '按检查间隔定时检查套餐状态',
  },
  {
    icon: 'mdi-calendar-clock',
    label: '下次执行订阅',
    value: status.value?.next_renew || '-',
    sub: status.value?.next_renew_device
      ? `按「自动续期时机」推算，最早轮到：${status.value.next_renew_device}`
      : '按「自动续期时机」与到期时间推算',
  },
]);

// 只读展示已保存的配置
const savedSettings = computed(() => {
  const days = config.value.renew_before_days;
  return [
    {
      icon: 'mdi-power',
      label: '自动定时续期',
      value: config.value.enabled ? '已启用' : '已关闭',
      color: config.value.enabled ? 'success' : 'grey',
    },
    {
      icon: 'mdi-timer-outline',
      label: '检查间隔',
      value: CHECK_LABEL[config.value.check_hours] || `每 ${config.value.check_hours} 小时`,
    },
    {
      icon: 'mdi-calendar-clock',
      label: '自动续期时机',
      value: days ? `剩余不足 ${days} 天` : '到期后再领取',
    },
    {
      icon: 'mdi-devices',
      label: '自动续期设备',
      value: config.value.device_ids?.length
        ? `指定 ${config.value.device_ids.length} 台`
        : '全部符合条件的设备',
    },
    {
      icon: 'mdi-bell-outline',
      label: '通知',
      value: [
        config.value.notify_enabled ? '成功通知' : null,
        config.value.notify_on_error ? '失败提醒' : null,
      ].filter(Boolean).join(' / ') || '已关闭',
    },
  ]
});

function deviceColor(device) {
  return device.needs_renew ? 'warning' : 'success'
}

function deviceHint(device) {
  return device.needs_renew ? `需要续期：${device.reason}` : device.reason
}

function remainingText(device) {
  if (device.remaining_days === null || device.remaining_days === undefined) return ''
  return device.remaining_days < 0 ? '已过期' : `剩余 ${device.remaining_days} 天`
}

async function loadStatus() {
  loading.value = true;
  try {
    const response = unwrap(await props.api.get(
      `plugin/${props.pluginId}/status`, { feedback: 'silent' },
    ));
    status.value = response || null;
  } catch (err) {
    status.value = null;
    message.value = err?.message || '状态读取失败';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
}

async function onSaveConfig(data) {
  saving.value = true;
  try {
    const response = unwrap(await props.api.post(
      `plugin/${props.pluginId}/config`, data,
    ));
    if (response?.success === false) {
      message.value = response?.message || '保存失败';
      messageType.value = 'error';
    } else {
      message.value = '设置已保存';
      messageType.value = 'success';
      tab.value = 'status';
    }
  } catch (err) {
    message.value = err?.message || '保存失败';
    messageType.value = 'error';
  } finally {
    saving.value = false;
    await loadStatus();
  }
}

async function runRenew() {
  if (running.value) return
  running.value = true;
  message.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/renew`, {}));
    message.value = response?.message || '执行完成';
    messageType.value = response?.success ? 'success' : 'error';
  } catch (err) {
    message.value = err?.message || '执行失败';
    messageType.value = 'error';
  } finally {
    running.value = false;
    await loadStatus();
  }
}

function close() {
  emit('close');
}

onMounted(async () => {
  emit('layout', { maxWidth: '64rem' });
  await loadStatus();
});

return (_ctx, _cache) => {
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_tab = _resolveComponent("v-tab");
  const _component_v_tabs = _resolveComponent("v-tabs");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_skeleton_loader = _resolveComponent("v-skeleton-loader");
  const _component_v_table = _resolveComponent("v-table");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_card_text = _resolveComponent("v-card-text");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_card_title, { class: "d-flex align-center flex-wrap ga-2 pt-4 pb-2" }, {
        default: _withCtx(() => [
          _createVNode(_component_v_icon, {
            color: "primary",
            class: "mr-2"
          }, {
            default: _withCtx(() => [...(_cache[4] || (_cache[4] = [
              _createTextVNode("mdi-refresh-circle", -1)
            ]))]),
            _: 1
          }),
          _cache[7] || (_cache[7] = _createElementVNode("span", { class: "text-h6" }, "DDNSTO 自动续期", -1)),
          _createVNode(_component_v_chip, {
            size: "small",
            variant: "tonal",
            color: loggedIn.value ? 'success' : 'error'
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(loggedIn.value ? '已连接' : '未连接'), 1)
            ]),
            _: 1
          }, 8, ["color"]),
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            icon: "",
            variant: "text",
            size: "small",
            title: "刷新",
            loading: loading.value,
            onClick: loadStatus
          }, {
            default: _withCtx(() => [
              _createVNode(_component_v_icon, null, {
                default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
                  _createTextVNode("mdi-refresh", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["loading"]),
          _createVNode(_component_v_btn, {
            icon: "",
            variant: "text",
            size: "small",
            title: "关闭",
            onClick: close
          }, {
            default: _withCtx(() => [
              _createVNode(_component_v_icon, null, {
                default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
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
      _createVNode(_component_v_tabs, {
        modelValue: tab.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((tab).value = $event)),
        density: "comfortable",
        color: "primary",
        class: "px-4"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_v_tab, {
            value: "status",
            "prepend-icon": "mdi-view-dashboard-outline"
          }, {
            default: _withCtx(() => [...(_cache[8] || (_cache[8] = [
              _createTextVNode("状态", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_tab, {
            value: "settings",
            "prepend-icon": "mdi-cog-outline"
          }, {
            default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
              _createTextVNode("设置", -1)
            ]))]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      _createVNode(_component_v_card_text, { class: "pt-4" }, {
        default: _withCtx(() => [
          (message.value)
            ? (_openBlock(), _createBlock(_component_v_alert, {
                key: 0,
                type: messageType.value,
                variant: "tonal",
                density: "compact",
                class: "mb-3 text-caption",
                closable: "",
                "onClick:close": _cache[1] || (_cache[1] = $event => (message.value = ''))
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(message.value), 1)
                ]),
                _: 1
              }, 8, ["type"]))
            : _createCommentVNode("", true),
          (tab.value === 'status')
            ? (_openBlock(), _createElementBlock("div", _hoisted_1, [
                (!loggedIn.value && !loading.value)
                  ? (_openBlock(), _createBlock(_component_v_alert, {
                      key: 0,
                      type: "warning",
                      variant: "tonal",
                      density: "compact",
                      class: "mb-3 text-caption"
                    }, {
                      append: _withCtx(() => [
                        _createVNode(_component_v_btn, {
                          size: "x-small",
                          variant: "text",
                          onClick: _cache[2] || (_cache[2] = $event => (tab.value = 'settings'))
                        }, {
                          default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
                            _createTextVNode("去设置", -1)
                          ]))]),
                          _: 1
                        })
                      ]),
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(status.value?.message || '尚未配置或 Cookie 已失效，请到「设置」页更新 Cookie 或重新扫码登录。') + " ", 1)
                      ]),
                      _: 1
                    }))
                  : _createCommentVNode("", true),
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(warnings.value, (warning) => {
                  return (_openBlock(), _createBlock(_component_v_alert, {
                    key: warning,
                    type: "warning",
                    variant: "tonal",
                    density: "compact",
                    class: "mb-3 text-caption"
                  }, {
                    default: _withCtx(() => [
                      _createTextVNode(_toDisplayString(warning), 1)
                    ]),
                    _: 2
                  }, 1024))
                }), 128)),
                _createElementVNode("div", _hoisted_2, [
                  _createVNode(_component_v_icon, {
                    size: "small",
                    class: "mr-1"
                  }, {
                    default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
                      _createTextVNode("mdi-content-save-check-outline", -1)
                    ]))]),
                    _: 1
                  }),
                  _cache[13] || (_cache[13] = _createElementVNode("span", { class: "text-subtitle-2" }, "已保存的设置", -1)),
                  _createVNode(_component_v_spacer),
                  _createVNode(_component_v_btn, {
                    size: "x-small",
                    variant: "text",
                    color: "primary",
                    "prepend-icon": "mdi-pencil",
                    onClick: _cache[3] || (_cache[3] = $event => (tab.value = 'settings'))
                  }, {
                    default: _withCtx(() => [...(_cache[12] || (_cache[12] = [
                      _createTextVNode("去设置", -1)
                    ]))]),
                    _: 1
                  })
                ]),
                _createVNode(_component_v_row, {
                  dense: "",
                  class: "mb-2"
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(savedSettings.value, (item) => {
                      return (_openBlock(), _createBlock(_component_v_col, {
                        key: item.label,
                        cols: "12",
                        sm: "6",
                        md: "4"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_v_card, {
                            variant: "outlined",
                            rounded: "lg",
                            class: "pa-2 h-100"
                          }, {
                            default: _withCtx(() => [
                              _createElementVNode("div", _hoisted_3, [
                                _createVNode(_component_v_icon, {
                                  size: "x-small",
                                  class: "mr-1"
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(item.icon), 1)
                                  ]),
                                  _: 2
                                }, 1024),
                                _createTextVNode(_toDisplayString(item.label), 1)
                              ]),
                              _createElementVNode("div", {
                                class: _normalizeClass(["text-body-2 font-weight-medium text-truncate", item.color === 'success' ? 'text-success' : ''])
                              }, _toDisplayString(item.value), 3)
                            ]),
                            _: 2
                          }, 1024)
                        ]),
                        _: 2
                      }, 1024))
                    }), 128))
                  ]),
                  _: 1
                }),
                _createVNode(_component_v_row, {
                  dense: "",
                  class: "mb-2 mt-2"
                }, {
                  default: _withCtx(() => [
                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(summary.value, (card) => {
                      return (_openBlock(), _createBlock(_component_v_col, {
                        key: card.label,
                        cols: "12",
                        sm: "6",
                        md: "4"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_v_card, {
                            variant: "outlined",
                            rounded: "lg",
                            class: "pa-3 h-100"
                          }, {
                            default: _withCtx(() => [
                              _createElementVNode("div", _hoisted_4, [
                                _createVNode(_component_v_icon, {
                                  size: "x-small",
                                  class: "mr-1"
                                }, {
                                  default: _withCtx(() => [
                                    _createTextVNode(_toDisplayString(card.icon), 1)
                                  ]),
                                  _: 2
                                }, 1024),
                                _createTextVNode(_toDisplayString(card.label), 1)
                              ]),
                              _createElementVNode("div", _hoisted_5, _toDisplayString(card.value), 1),
                              (card.sub)
                                ? (_openBlock(), _createElementBlock("div", _hoisted_6, _toDisplayString(card.sub), 1))
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
                }),
                _createElementVNode("div", _hoisted_7, [
                  _createVNode(_component_v_icon, {
                    size: "small",
                    class: "mr-1"
                  }, {
                    default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
                      _createTextVNode("mdi-devices", -1)
                    ]))]),
                    _: 1
                  }),
                  _cache[16] || (_cache[16] = _createElementVNode("span", { class: "text-subtitle-2" }, "设备、套餐与域名", -1)),
                  _createVNode(_component_v_spacer),
                  _createVNode(_component_v_btn, {
                    color: "primary",
                    variant: "tonal",
                    size: "small",
                    "prepend-icon": "mdi-play",
                    loading: running.value,
                    disabled: !loggedIn.value || running.value,
                    onClick: runRenew
                  }, {
                    default: _withCtx(() => [...(_cache[15] || (_cache[15] = [
                      _createTextVNode("立即续期", -1)
                    ]))]),
                    _: 1
                  }, 8, ["loading", "disabled"])
                ]),
                _cache[24] || (_cache[24] = _createElementVNode("div", { class: "text-caption text-medium-emphasis mb-2" }, " 「立即续期」会直接重新领取免费套餐，不受「自动续期时机」限制。 ", -1)),
                (loading.value)
                  ? (_openBlock(), _createBlock(_component_v_skeleton_loader, {
                      key: 1,
                      type: "list-item-two-line@3"
                    }))
                  : (!devices.value.length)
                    ? (_openBlock(), _createBlock(_component_v_alert, {
                        key: 2,
                        type: "info",
                        variant: "tonal",
                        density: "compact",
                        class: "text-caption"
                      }, {
                        default: _withCtx(() => [...(_cache[17] || (_cache[17] = [
                          _createTextVNode(" 没有读取到设备，请检查 Cookie 是否有效。 ", -1)
                        ]))]),
                        _: 1
                      }))
                    : (_openBlock(), _createBlock(_component_v_row, {
                        key: 3,
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
                                  class: "pa-3 h-100"
                                }, {
                                  default: _withCtx(() => [
                                    _createElementVNode("div", _hoisted_8, [
                                      _createVNode(_component_v_icon, {
                                        color: deviceColor(device),
                                        class: "mr-2 mt-1"
                                      }, {
                                        default: _withCtx(() => [...(_cache[18] || (_cache[18] = [
                                          _createTextVNode("mdi-router-wireless", -1)
                                        ]))]),
                                        _: 1
                                      }, 8, ["color"]),
                                      _createElementVNode("div", _hoisted_9, [
                                        _createElementVNode("div", _hoisted_10, _toDisplayString(device.name), 1),
                                        _createElementVNode("div", _hoisted_11, _toDisplayString(device.status) + " · " + _toDisplayString(device.plan_name || '未绑定套餐'), 1),
                                        _createElementVNode("div", {
                                          class: _normalizeClass(["text-caption", device.needs_renew ? 'text-warning' : 'text-medium-emphasis'])
                                        }, _toDisplayString(deviceHint(device)), 3),
                                        (device.expires_at)
                                          ? (_openBlock(), _createElementBlock("div", _hoisted_12, " 到期：" + _toDisplayString(device.expires_at) + " " + _toDisplayString(remainingText(device)), 1))
                                          : _createCommentVNode("", true),
                                        (device.domains && device.domains.length)
                                          ? (_openBlock(), _createElementBlock("div", _hoisted_13, [
                                              _createElementVNode("div", _hoisted_14, [
                                                _createVNode(_component_v_icon, { size: "x-small" }, {
                                                  default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
                                                    _createTextVNode("mdi-web", -1)
                                                  ]))]),
                                                  _: 1
                                                }),
                                                _createTextVNode(" 已配置域名（" + _toDisplayString(device.domains.length) + "） ", 1)
                                              ]),
                                              _createVNode(_component_v_table, {
                                                density: "compact",
                                                class: "text-caption"
                                              }, {
                                                default: _withCtx(() => [
                                                  _cache[20] || (_cache[20] = _createElementVNode("thead", null, [
                                                    _createElementVNode("tr", null, [
                                                      _createElementVNode("th", { class: "text-left" }, "备注"),
                                                      _createElementVNode("th", { class: "text-left" }, "外网域名"),
                                                      _createElementVNode("th", { class: "text-left" }, "内网地址")
                                                    ])
                                                  ], -1)),
                                                  _createElementVNode("tbody", null, [
                                                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(device.domains, (domain) => {
                                                      return (_openBlock(), _createElementBlock("tr", {
                                                        key: domain.id ?? domain.prefix
                                                      }, [
                                                        _createElementVNode("td", null, _toDisplayString(domain.note || '—'), 1),
                                                        _createElementVNode("td", null, _toDisplayString(domain.url || domain.prefix || '—'), 1),
                                                        _createElementVNode("td", null, _toDisplayString(domain.target || '—'), 1)
                                                      ]))
                                                    }), 128))
                                                  ])
                                                ]),
                                                _: 2
                                              }, 1024)
                                            ]))
                                          : (_openBlock(), _createElementBlock("div", _hoisted_15, " 未配置穿透域名 "))
                                      ])
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
                _createVNode(_component_v_divider, { class: "my-4" }),
                _createElementVNode("div", _hoisted_16, [
                  _createVNode(_component_v_icon, {
                    size: "small",
                    class: "mr-1"
                  }, {
                    default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
                      _createTextVNode("mdi-history", -1)
                    ]))]),
                    _: 1
                  }),
                  _cache[22] || (_cache[22] = _createElementVNode("span", { class: "text-subtitle-2" }, "最近一次执行", -1)),
                  _createVNode(_component_v_spacer),
                  _createElementVNode("span", _hoisted_17, _toDisplayString(lastResult.value?.time || '尚未执行'), 1)
                ]),
                (lastResult.value?.message)
                  ? (_openBlock(), _createBlock(_component_v_alert, {
                      key: 4,
                      type: lastResult.value.success ? 'success' : 'error',
                      variant: "tonal",
                      density: "compact",
                      class: "text-caption"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(lastResult.value.message), 1)
                      ]),
                      _: 1
                    }, 8, ["type"]))
                  : (_openBlock(), _createBlock(_component_v_alert, {
                      key: 5,
                      type: "info",
                      variant: "tonal",
                      density: "compact",
                      class: "text-caption"
                    }, {
                      default: _withCtx(() => [...(_cache[23] || (_cache[23] = [
                        _createTextVNode(" 暂无执行记录，可点击上方「立即续期」手动触发一次。 ", -1)
                      ]))]),
                      _: 1
                    }))
              ]))
            : (_openBlock(), _createElementBlock("div", _hoisted_18, [
                _createVNode(_sfc_main$1, {
                  api: props.api,
                  "plugin-id": props.pluginId,
                  "initial-config": config.value,
                  saving: saving.value,
                  onSave: onSaveConfig,
                  onRefresh: loadStatus
                }, null, 8, ["api", "plugin-id", "initial-config", "saving"])
              ]))
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
