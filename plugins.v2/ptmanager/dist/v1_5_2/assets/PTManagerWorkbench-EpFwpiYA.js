import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _export_sfc, b as formatInteger, c as _sfc_main$8, f as formatBytes, d as formatNumber, u as unwrapResponse, s as shortDate, e as shortTime, a as formatRatio, w as withQuery, g as freshness, r as ratioColor } from './_plugin-vue_export-helper-CA6bBm6b.js';

const {toDisplayString:_toDisplayString$6,unref:_unref$3,createElementVNode:_createElementVNode$6,createTextVNode:_createTextVNode$5,resolveComponent:_resolveComponent$6,withCtx:_withCtx$6,createVNode:_createVNode$6,openBlock:_openBlock$7,createBlock:_createBlock$6,createCommentVNode:_createCommentVNode$7,createElementBlock:_createElementBlock$7,renderList:_renderList$4,Fragment:_Fragment$4,normalizeClass:_normalizeClass$5} = await importShared('vue');


const _hoisted_1$7 = { class: "text-caption text-medium-emphasis ml-2" };
const _hoisted_2$7 = {
  key: 0,
  class: "text-caption"
};
const _hoisted_3$7 = {
  key: 1,
  class: "ptm-attention__list"
};
const _hoisted_4$6 = ["onClick"];
const _hoisted_5$6 = { class: "ptm-attention__name" };
const _hoisted_6$5 = { class: "ptm-attention__title" };
const _hoisted_7$5 = { class: "ptm-attention__sub" };
const _hoisted_8$5 = { class: "ptm-attention__raw" };
const _hoisted_9$4 = { class: "d-flex align-center justify-space-between flex-wrap ga-2 mb-2" };
const _hoisted_10$4 = { class: "text-caption text-medium-emphasis" };
const _hoisted_11$4 = { class: "ptm-attention__list" };
const _hoisted_12$4 = ["onClick"];
const _hoisted_13$4 = { class: "ptm-attention__name" };
const _hoisted_14$4 = { class: "ptm-attention__title" };
const _hoisted_15$4 = { class: "ptm-attention__sub" };
const _hoisted_16$4 = { class: "ptm-attention__metric" };
const _hoisted_17$4 = { class: "ptm-attention__metric" };

const {computed: computed$6,ref: ref$5,watch: watch$4} = await importShared('vue');


const _sfc_main$7 = {
  __name: 'AttentionDialog',
  props: {
  modelValue: { type: Boolean, default: false },
  sites: { type: Array, default: () => [] },
  initialTab: { type: String, default: 'hr' },
  api: { type: Object, default: () => ({}) },
},
  emits: ['update:modelValue', 'open-site'],
  setup(__props, { emit: __emit }) {

/**
 * H&R 与邀请名额明细弹窗。
 *
 * 总览页的合计卡片只保留上传、下载、做种数与做种体积，H&R 与邀请这类
 * 「需要处理的账号事项」改为可点击入口，点开后在这里逐站列出明细，
 * 回答「具体是哪个站」。
 */
const props = __props;

const emit = __emit;

const tab = ref$5('hr');
const onlyWithValue = ref$5(true);

watch$4(
  () => [props.modelValue, props.initialTab],
  ([open, initial]) => {
    if (open) {
      tab.value = initial === 'invite' ? 'invite' : 'hr';
      onlyWithValue.value = true;
    }
  },
  { immediate: true },
);

/** 扩展字段取值辅助。 */
function extended(site) {
  return site?.extended || {}
}

/** 有未完成 H&R 的站点，按数量从多到少。 */
const hrRows = computed$6(() =>
  props.sites
    .map(site => ({ site, hr: Number(extended(site).hr) || 0 }))
    .filter(row => row.hr > 0)
    .sort((left, right) => right.hr - left.hr),
);

/** 邀请相关站点：默认只看有可用名额或已发出邀请的站点。 */
const inviteRows = computed$6(() =>
  props.sites
    .map(site => {
      const data = extended(site);
      return {
        site,
        available: Number(data.invites_available) || 0,
        sent: Number(data.invites_sent) || 0,
        inviter: data.inviter || '',
        raw: data.invite_raw || '',
      }
    })
    .filter(row => {
      if (onlyWithValue.value) return row.available > 0 || row.sent > 0
      return true
    })
    .sort((left, right) => right.available - left.available || right.sent - left.sent),
);

/** 汇总数字，用于弹窗顶部说明。 */
const totals = computed$6(() => {
  const hrTotal = hrRows.value.reduce((sum, row) => sum + row.hr, 0);
  const available = props.sites.reduce(
    (sum, site) => sum + (Number(extended(site).invites_available) || 0),
    0,
  );
  const sent = props.sites.reduce((sum, site) => sum + (Number(extended(site).invites_sent) || 0), 0);
  const missing = props.sites.filter(site => {
    const data = extended(site);
    return data.hr === null || data.hr === undefined
  }).length;
  return { hrTotal, available, sent, missing }
});

/** 关闭弹窗。 */
function close() {
  emit('update:modelValue', false);
}

/** 打开对应站点详情。 */
function openSite(site) {
  emit('open-site', site);
}

return (_ctx, _cache) => {
  const _component_VToolbarTitle = _resolveComponent$6("VToolbarTitle");
  const _component_VBtn = _resolveComponent$6("VBtn");
  const _component_VToolbar = _resolveComponent$6("VToolbar");
  const _component_VChip = _resolveComponent$6("VChip");
  const _component_VTab = _resolveComponent$6("VTab");
  const _component_VTabs = _resolveComponent$6("VTabs");
  const _component_VDivider = _resolveComponent$6("VDivider");
  const _component_VAlert = _resolveComponent$6("VAlert");
  const _component_VIcon = _resolveComponent$6("VIcon");
  const _component_VSwitch = _resolveComponent$6("VSwitch");
  const _component_VCardText = _resolveComponent$6("VCardText");
  const _component_VCardActions = _resolveComponent$6("VCardActions");
  const _component_VCard = _resolveComponent$6("VCard");
  const _component_VDialog = _resolveComponent$6("VDialog");

  return (_openBlock$7(), _createBlock$6(_component_VDialog, {
    "model-value": __props.modelValue,
    "max-width": "900",
    scrollable: "",
    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => (emit('update:modelValue', $event)))
  }, {
    default: _withCtx$6(() => [
      _createVNode$6(_component_VCard, {
        class: "ptm-attention",
        rounded: "lg"
      }, {
        default: _withCtx$6(() => [
          _createVNode$6(_component_VToolbar, {
            color: "surface",
            density: "comfortable",
            flat: ""
          }, {
            default: _withCtx$6(() => [
              _createVNode$6(_component_VToolbarTitle, { class: "text-subtitle-1" }, {
                default: _withCtx$6(() => [
                  _createTextVNode$5(_toDisplayString$6(tab.value === 'hr' ? 'H&R 明细' : '邀请明细') + " ", 1),
                  _createElementVNode$6("span", _hoisted_1$7, _toDisplayString$6(tab.value === 'hr' ? `合计 ${_unref$3(formatInteger)(totals.value.hrTotal)} 个未完成` : `可用 ${_unref$3(formatInteger)(totals.value.available)} · 已发 ${_unref$3(formatInteger)(totals.value.sent)}`), 1)
                ]),
                _: 1
              }),
              _createVNode$6(_component_VBtn, {
                icon: "mdi-close",
                variant: "text",
                onClick: close
              })
            ]),
            _: 1
          }),
          _createVNode$6(_component_VTabs, {
            modelValue: tab.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((tab).value = $event)),
            density: "comfortable",
            color: "primary"
          }, {
            default: _withCtx$6(() => [
              _createVNode$6(_component_VTab, {
                value: "hr",
                "prepend-icon": "mdi-alert-octagon-outline"
              }, {
                default: _withCtx$6(() => [
                  _cache[3] || (_cache[3] = _createTextVNode$5(" H&R ", -1)),
                  (hrRows.value.length)
                    ? (_openBlock$7(), _createBlock$6(_component_VChip, {
                        key: 0,
                        class: "ml-2",
                        size: "x-small",
                        variant: "flat",
                        color: "error"
                      }, {
                        default: _withCtx$6(() => [
                          _createTextVNode$5(_toDisplayString$6(hrRows.value.length), 1)
                        ]),
                        _: 1
                      }))
                    : _createCommentVNode$7("", true)
                ]),
                _: 1
              }),
              _createVNode$6(_component_VTab, {
                value: "invite",
                "prepend-icon": "mdi-account-plus-outline"
              }, {
                default: _withCtx$6(() => [
                  _cache[4] || (_cache[4] = _createTextVNode$5(" 邀请 ", -1)),
                  (inviteRows.value.length)
                    ? (_openBlock$7(), _createBlock$6(_component_VChip, {
                        key: 0,
                        class: "ml-2",
                        size: "x-small",
                        variant: "flat",
                        color: "primary"
                      }, {
                        default: _withCtx$6(() => [
                          _createTextVNode$5(_toDisplayString$6(inviteRows.value.length), 1)
                        ]),
                        _: 1
                      }))
                    : _createCommentVNode$7("", true)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          _createVNode$6(_component_VDivider),
          _createVNode$6(_component_VCardText, { class: "ptm-attention__body" }, {
            default: _withCtx$6(() => [
              (tab.value === 'hr')
                ? (_openBlock$7(), _createElementBlock$7(_Fragment$4, { key: 0 }, [
                    (!hrRows.value.length)
                      ? (_openBlock$7(), _createBlock$6(_component_VAlert, {
                          key: 0,
                          type: "success",
                          variant: "tonal",
                          density: "comfortable"
                        }, {
                          default: _withCtx$6(() => [
                            _cache[5] || (_cache[5] = _createTextVNode$5(" 当前没有未完成的 H&R。 ", -1)),
                            (totals.value.missing)
                              ? (_openBlock$7(), _createElementBlock$7("span", _hoisted_2$7, " （" + _toDisplayString$6(totals.value.missing) + " 个站点未采集到 H&R 数据） ", 1))
                              : _createCommentVNode$7("", true)
                          ]),
                          _: 1
                        }))
                      : (_openBlock$7(), _createElementBlock$7("div", _hoisted_3$7, [
                          (_openBlock$7(true), _createElementBlock$7(_Fragment$4, null, _renderList$4(hrRows.value, (row) => {
                            return (_openBlock$7(), _createElementBlock$7("button", {
                              key: row.site.domain,
                              type: "button",
                              class: "ptm-attention__row",
                              onClick: $event => (openSite(row.site))
                            }, [
                              _createVNode$6(_sfc_main$8, {
                                api: __props.api,
                                site: row.site,
                                size: 30
                              }, null, 8, ["api", "site"]),
                              _createElementVNode$6("span", _hoisted_5$6, [
                                _createElementVNode$6("span", _hoisted_6$5, _toDisplayString$6(row.site.name), 1),
                                _createElementVNode$6("span", _hoisted_7$5, _toDisplayString$6(row.site.domain), 1)
                              ]),
                              _createElementVNode$6("span", _hoisted_8$5, _toDisplayString$6(extended(row.site).hr_raw || ''), 1),
                              _createVNode$6(_component_VChip, {
                                color: "error",
                                size: "small",
                                variant: "tonal"
                              }, {
                                default: _withCtx$6(() => [
                                  _createTextVNode$5(_toDisplayString$6(_unref$3(formatInteger)(row.hr)), 1)
                                ]),
                                _: 2
                              }, 1024),
                              _createVNode$6(_component_VIcon, {
                                icon: "mdi-chevron-right",
                                size: "18"
                              })
                            ], 8, _hoisted_4$6))
                          }), 128))
                        ]))
                  ], 64))
                : (_openBlock$7(), _createElementBlock$7(_Fragment$4, { key: 1 }, [
                    _createElementVNode$6("div", _hoisted_9$4, [
                      _createElementVNode$6("span", _hoisted_10$4, " 共 " + _toDisplayString$6(inviteRows.value.length) + " 个站点；点击任意站点查看详情 ", 1),
                      _createVNode$6(_component_VSwitch, {
                        modelValue: onlyWithValue.value,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((onlyWithValue).value = $event)),
                        density: "compact",
                        "hide-details": "",
                        color: "primary",
                        label: "只显示有名额或已发邀请的站点"
                      }, null, 8, ["modelValue"])
                    ]),
                    _createElementVNode$6("div", _hoisted_11$4, [
                      (_openBlock$7(true), _createElementBlock$7(_Fragment$4, null, _renderList$4(inviteRows.value, (row) => {
                        return (_openBlock$7(), _createElementBlock$7("button", {
                          key: row.site.domain,
                          type: "button",
                          class: "ptm-attention__row ptm-attention__row--invite",
                          onClick: $event => (openSite(row.site))
                        }, [
                          _createVNode$6(_sfc_main$8, {
                            api: __props.api,
                            site: row.site,
                            size: 30
                          }, null, 8, ["api", "site"]),
                          _createElementVNode$6("span", _hoisted_13$4, [
                            _createElementVNode$6("span", _hoisted_14$4, _toDisplayString$6(row.site.name), 1),
                            _createElementVNode$6("span", _hoisted_15$4, " 邀请人：" + _toDisplayString$6(row.inviter || '未采集'), 1)
                          ]),
                          _createElementVNode$6("span", _hoisted_16$4, [
                            _cache[6] || (_cache[6] = _createElementVNode$6("span", { class: "ptm-attention__metric-label" }, "可用", -1)),
                            _createElementVNode$6("span", {
                              class: _normalizeClass$5(["ptm-attention__metric-value", { 'ptm-attention__metric-value--zero': !row.available }])
                            }, _toDisplayString$6(_unref$3(formatInteger)(row.available)), 3)
                          ]),
                          _createElementVNode$6("span", _hoisted_17$4, [
                            _cache[7] || (_cache[7] = _createElementVNode$6("span", { class: "ptm-attention__metric-label" }, "已发", -1)),
                            _createElementVNode$6("span", {
                              class: _normalizeClass$5(["ptm-attention__metric-value", { 'ptm-attention__metric-value--zero': !row.sent }])
                            }, _toDisplayString$6(_unref$3(formatInteger)(row.sent)), 3)
                          ]),
                          _createVNode$6(_component_VIcon, {
                            icon: "mdi-chevron-right",
                            size: "18"
                          })
                        ], 8, _hoisted_12$4))
                      }), 128))
                    ])
                  ], 64))
            ]),
            _: 1
          }),
          _createVNode$6(_component_VDivider),
          _createVNode$6(_component_VCardActions, { class: "justify-end" }, {
            default: _withCtx$6(() => [
              _createVNode$6(_component_VBtn, {
                variant: "text",
                onClick: close
              }, {
                default: _withCtx$6(() => [...(_cache[8] || (_cache[8] = [
                  _createTextVNode$5("关闭", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  }, 8, ["model-value"]))
}
}

};
const AttentionDialog = /*#__PURE__*/_export_sfc(_sfc_main$7, [['__scopeId',"data-v-8c6d850e"]]);

const {resolveComponent:_resolveComponent$5,createVNode:_createVNode$5,createElementVNode:_createElementVNode$5,toDisplayString:_toDisplayString$5,openBlock:_openBlock$6,createElementBlock:_createElementBlock$6,createCommentVNode:_createCommentVNode$6,normalizeClass:_normalizeClass$4,withCtx:_withCtx$5,createBlock:_createBlock$5} = await importShared('vue');


const _hoisted_1$6 = { class: "ptm-metric__body" };
const _hoisted_2$6 = { class: "ptm-metric__head" };
const _hoisted_3$6 = { class: "ptm-metric__label" };
const _hoisted_4$5 = { class: "ptm-metric__value" };
const _hoisted_5$5 = {
  key: 0,
  class: "ptm-metric__hint"
};


const _sfc_main$6 = {
  __name: 'MetricCard',
  props: {
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, default: 'mdi-chart-line' },
  color: { type: String, default: 'primary' },
  hint: { type: String, default: '' },
},
  setup(__props) {

/** 合计指标卡片：柔和渐变底 + 右上角大图标水印，突出数值本身。 */


return (_ctx, _cache) => {
  const _component_VIcon = _resolveComponent$5("VIcon");
  const _component_VCard = _resolveComponent$5("VCard");

  return (_openBlock$6(), _createBlock$5(_component_VCard, {
    class: _normalizeClass$4(["ptm-metric", `ptm-metric--${__props.color}`]),
    rounded: "lg",
    variant: "flat"
  }, {
    default: _withCtx$5(() => [
      _createVNode$5(_component_VIcon, {
        class: "ptm-metric__watermark",
        icon: __props.icon,
        size: "76"
      }, null, 8, ["icon"]),
      _createElementVNode$5("div", _hoisted_1$6, [
        _createElementVNode$5("div", _hoisted_2$6, [
          _cache[0] || (_cache[0] = _createElementVNode$5("span", { class: "ptm-metric__dot" }, null, -1)),
          _createElementVNode$5("span", _hoisted_3$6, _toDisplayString$5(__props.label), 1)
        ]),
        _createElementVNode$5("div", _hoisted_4$5, _toDisplayString$5(__props.value), 1),
        (__props.hint)
          ? (_openBlock$6(), _createElementBlock$6("div", _hoisted_5$5, _toDisplayString$5(__props.hint), 1))
          : _createCommentVNode$6("", true)
      ])
    ]),
    _: 1
  }, 8, ["class"]))
}
}

};
const MetricCard = /*#__PURE__*/_export_sfc(_sfc_main$6, [['__scopeId',"data-v-b9623b2f"]]);

const {resolveComponent:_resolveComponent$4,createVNode:_createVNode$4,createElementVNode:_createElementVNode$4,toDisplayString:_toDisplayString$4,normalizeStyle:_normalizeStyle$1,renderList:_renderList$3,Fragment:_Fragment$3,openBlock:_openBlock$5,createElementBlock:_createElementBlock$5,createBlock:_createBlock$4,createCommentVNode:_createCommentVNode$5,withCtx:_withCtx$4,normalizeClass:_normalizeClass$3,createTextVNode:_createTextVNode$4,unref:_unref$2} = await importShared('vue');


const _hoisted_1$5 = {
  class: "twelve-panel",
  "aria-label": "十二大进度"
};
const _hoisted_2$5 = { class: "twelve-panel__head" };
const _hoisted_3$5 = { class: "twelve-panel__title" };
const _hoisted_4$4 = { class: "twelve-panel__icon" };
const _hoisted_5$4 = { class: "twelve-panel__stats" };
const _hoisted_6$4 = { class: "twelve-panel__stat" };
const _hoisted_7$4 = { class: "twelve-panel__stat" };
const _hoisted_8$4 = { class: "text-success" };
const _hoisted_9$3 = { class: "twelve-panel__stat" };
const _hoisted_10$3 = { class: "twelve-overflow" };
const _hoisted_11$3 = {
  class: "twelve-track",
  role: "list",
  "aria-label": "十二大站点进度"
};
const _hoisted_12$3 = { class: "twelve-track__line" };
const _hoisted_13$3 = ["title"];
const _hoisted_14$3 = { class: "twelve-node__index" };
const _hoisted_15$3 = { class: "twelve-node__marker" };
const _hoisted_16$3 = {
  key: 0,
  class: "twelve-node__name"
};
const _hoisted_17$3 = {
  key: 1,
  class: "twelve-node__lock"
};
const _hoisted_18$3 = {
  key: 2,
  class: "twelve-node__date"
};
const _hoisted_19$3 = { class: "retirement-summary" };
const _hoisted_20$3 = ["aria-pressed", "onClick"];
const _hoisted_21$3 = { class: "retirement-explorer" };
const _hoisted_22$2 = {
  class: "retirement-site-list",
  "aria-label": "养老进度站点列表"
};
const _hoisted_23$2 = { class: "retirement-site-list__heading" };
const _hoisted_24$2 = { class: "retirement-site-list__body" };
const _hoisted_25$2 = ["disabled"];
const _hoisted_26$2 = {
  key: 0,
  class: "retirement-empty-list"
};
const _hoisted_27$2 = ["aria-pressed", "onClick"];
const _hoisted_28$2 = { class: "retirement-site-option__body" };
const _hoisted_29$2 = { class: "retirement-site-option__title" };
const _hoisted_30$2 = ["disabled"];
const _hoisted_31$2 = { class: "retirement-detail__header" };
const _hoisted_32$1 = { class: "retirement-detail__identity" };
const _hoisted_33$1 = { key: 0 };
const _hoisted_34$1 = { class: "target-level" };
const _hoisted_35$1 = { class: "retirement-detail__right" };
const _hoisted_36$1 = { class: "retirement-detail__metrics" };
const _hoisted_37$1 = {
  key: 0,
  class: "wealthy-retirement-state",
  "aria-label": "富贵养老状态"
};
const _hoisted_38$1 = { class: "wealthy-retirement-state__icon" };
const _hoisted_39$1 = {
  key: 1,
  class: "retirement-route-rail",
  "aria-label": "等级进度"
};
const _hoisted_40$1 = { class: "retirement-route-rail__line" };
const _hoisted_41$1 = { class: "retirement-route-rail__nodes" };
const _hoisted_42$1 = ["aria-pressed", "aria-label", "onClick"];
const _hoisted_43$1 = {
  class: "retirement-route-node__marker",
  "aria-hidden": "true"
};
const _hoisted_44 = { class: "retirement-route-node__name" };
const _hoisted_45 = { key: 0 };
const _hoisted_46 = { class: "retirement-route-node__badge" };
const _hoisted_47 = {
  key: 2,
  class: "retirement-target-grid"
};
const _hoisted_48 = { class: "requirement-panel" };
const _hoisted_49 = { class: "requirement-panel__heading" };
const _hoisted_50 = { class: "requirement-overview__score" };
const _hoisted_51 = { class: "requirement-table-wrap" };
const _hoisted_52 = { class: "requirement-table" };
const _hoisted_53 = { class: "requirement-row__item" };
const _hoisted_54 = {
  key: 0,
  class: "requirement-row__progress"
};
const _hoisted_55 = {
  key: 1,
  class: "requirement-row__progress"
};
const _hoisted_56 = {
  key: 1,
  class: "compact-empty-state"
};
const _hoisted_57 = {
  key: 3,
  class: "retirement-levels"
};
const _hoisted_58 = { class: "retirement-levels__heading" };
const _hoisted_59 = { class: "retirement-levels__table-wrap" };
const _hoisted_60 = { class: "retirement-levels__table" };
const _hoisted_61 = ["open"];
const _hoisted_62 = ["onClick"];
const _hoisted_63 = { "data-label": "注册" };
const _hoisted_64 = {
  class: "retirement-level-row__traffic",
  "data-label": "流量"
};
const _hoisted_65 = { "data-label": "分享率" };
const _hoisted_66 = { "data-label": "做种积分" };
const _hoisted_67 = {
  key: 0,
  class: "retirement-level-row__description"
};
const _hoisted_68 = { class: "retirement-level-row__detail-title" };
const _hoisted_69 = {
  key: 1,
  class: "retirement-level-row__alternatives"
};
const _hoisted_70 = { class: "retirement-level-row__detail-title" };
const _hoisted_71 = { class: "retirement-level-row__tasks" };
const _hoisted_72 = {
  key: 1,
  class: "retirement-detail retirement-detail--empty"
};
const _hoisted_73 = { class: "retirement-empty-detail" };

const {computed: computed$5,nextTick,onBeforeUnmount: onBeforeUnmount$1,onMounted: onMounted$2,ref: ref$4,watch: watch$3} = await importShared('vue');


const _sfc_main$5 = {
  __name: 'RetirementPanel',
  props: {
  retirement: { type: Object, default: () => ({ sites: [] }) },
  sites: { type: Array, default: () => [] },
  api: { type: Object, default: () => ({}) },
  twelve: { type: Object, default: () => ({ joined: 0, total: 12, percent: 0, items: [] }) },
},
  setup(__props) {

/**
 * 养老进度面板。
 *
 * 布局与信息组织对齐 PT数据统计的养老进度：
 * 左侧站点列表（可排序、独立滚动、可拖拽翻页）＋右侧站点明细
 * （头部标识与关键流量 → 等级进度轨道 → 目标等级要求表 → 完整等级路线表）。
 */
const props = __props;

/** 十二大节点数据与汇总。 */
const twelveItems = computed$5(() => props.twelve?.items || []);
const twelveJoinedCount = computed$5(() => Number(props.twelve?.joined || 0));
const twelveTotalCount = computed$5(() => Number(props.twelve?.total || 12));
const twelvePercent = computed$5(() => Number(props.twelve?.percent || 0));
const twelveRemainingCount = computed$5(() =>
  Math.max(twelveTotalCount.value - twelveJoinedCount.value, 0),
);

/** 时间线填充长度：首节点为 0%，末节点为 100%。 */
const twelveTrackPercent = computed$5(() => {
  if (twelveTotalCount.value <= 1 || twelveJoinedCount.value <= 1) return 0
  return Math.min(100, ((twelveJoinedCount.value - 1) * 100) / (twelveTotalCount.value - 1))
});

/** 十二大节点状态文案。 */
function twelveStateMeta(state) {
  if (state === 'joined') return { label: '已加入', icon: 'mdi-check-circle' }
  if (state === 'waiting') return { label: '已配置站点但暂无数据', icon: 'mdi-clock-outline' }
  return { label: '未加入', icon: 'mdi-lock-outline' }
}

/** 加入日期只展示「YYYY-MM-DD」，缺失时给出占位。 */
function twelveJoinDate(joinAt) {
  const text = String(joinAt || '').trim();
  if (!text) return '加入日期未知'
  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : text.slice(0, 10)
}

const retirementSortKey = ref$4('site_priority');
const retirementSortOptions = [
  { title: '站点优先级', value: 'site_priority' },
  { title: '站点名称', value: 'site_name' },
  { title: '养老进度', value: 'retirement_progress' },
  { title: '剩余等级', value: 'levels_remaining' },
];

/** 顶部状态标签筛选，all 表示不筛选。 */
const statusFilter = ref$4('all');
const STATUS_FILTERS = [
  { key: 'all', label: '全部', color: 'primary' },
  { key: 'rule_missing', label: '规则缺失', color: 'secondary' },
  { key: 'upgrading', label: '升级中', color: 'warning' },
  { key: 'retired', label: '养老中', color: 'success' },
  { key: 'wealthy_retired', label: '富贵养老', color: 'warning' },
];

function statusCount(key) {
  if (key === 'all') return (retirement.value.sites || []).length
  if (key === 'wealthy_retired') return wealthyRetiredCount.value
  if (key === 'retired') return ordinaryRetiredCount.value
  return Number(retirement.value[key] || 0)
}

/** 点击状态标签：切换筛选，再次点击取消。 */
function toggleStatusFilter(key) {
  statusFilter.value = statusFilter.value === key ? 'all' : key;
}

const selectedRetirementSiteKey = ref$4('');
const selectedRouteLevelName = ref$4('');

const retirement = computed$5(() => props.retirement || { sites: [] });
const wealthyRetiredCount = computed$5(() =>
  retirement.value.wealthy_retired
  ?? (retirement.value.sites || []).filter(site => site.status === 'wealthy_retired').length,
);
const ordinaryRetiredCount = computed$5(() => Number(retirement.value.retired || 0));

/** 站点记录里查头像用的原始站点信息（含 site_id 与域名）。 */
const siteInfoByDomain = computed$5(() => {
  const map = {};
  for (const site of props.sites || []) {
    map[site.domain] = site;
  }
  return map
});

function avatarSite(site) {
  return siteInfoByDomain.value[site?.domain] || { domain: site?.domain, name: site?.site_name }
}

function retirementSiteKey(site) {
  return String(site?.site_id || site?.domain || site?.site_name || '')
}

function field(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value);
  return Number.isFinite(number) ? formatNumber(number, digits) : String(value)
}

function compareSites(left, right, key) {
  const leftValue = left?.[key];
  const rightValue = right?.[key];
  const leftEmpty = leftValue === null || leftValue === undefined || leftValue === '';
  const rightEmpty = rightValue === null || rightValue === undefined || rightValue === '';
  if (leftEmpty && rightEmpty) return String(left?.site_name || '').localeCompare(String(right?.site_name || ''), 'zh')
  if (leftEmpty) return 1
  if (rightEmpty) return -1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
  return String(leftValue).localeCompare(String(rightValue), 'zh')
}

const filteredRetirementSites = computed$5(() => {
  const sites = retirement.value.sites || [];
  if (statusFilter.value === 'all') return sites
  return sites.filter(site => site.status === statusFilter.value)
});

const sortedRetirementSites = computed$5(() => [...filteredRetirementSites.value].sort((left, right) => {
  if (retirementSortKey.value === 'retirement_progress') {
    return nextLevelOverallProgress(right) - nextLevelOverallProgress(left)
  }
  return compareSites(left, right, retirementSortKey.value)
}));

const selectedRetirementSite = computed$5(() =>
  sortedRetirementSites.value.find(site => retirementSiteKey(site) === selectedRetirementSiteKey.value)
  || sortedRetirementSites.value[0]
  || null,
);

/** 列表标题随筛选变化，筛选结果为空时给出明确提示。 */
const listHeadingText = computed$5(() => {
  const total = (retirement.value.sites || []).length;
  const shown = sortedRetirementSites.value.length;
  if (statusFilter.value === 'all') return `共 ${total} 个站点`
  const label = STATUS_FILTERS.find(item => item.key === statusFilter.value)?.label || '';
  return `${label} ${shown} / ${total}`
});

/** 当前筛选标签文案，供空态提示复用。 */
const currentFilterLabel = computed$5(
  () => STATUS_FILTERS.find(item => item.key === statusFilter.value)?.label || '全部',
);

function retirementMeta(status, site = null) {
  if (status === 'wealthy_retired') return { label: '富贵养老', color: 'warning', icon: 'mdi-crown' }
  if (status === 'retired') return { label: '已养老', color: 'success', icon: 'mdi-shield-check-outline' }
  if (status === 'upgrading' && site && !site.retirement_level && !site.next_level) return { label: '最高等级', color: 'primary', icon: 'mdi-medal-outline' }
  if (status === 'upgrading') return { label: '升级中', color: 'warning', icon: 'mdi-trending-up' }
  return { label: '规则缺失', color: 'secondary', icon: 'mdi-help-circle-outline' }
}

// ---------------------------------------------------------------------------
// 等级进度与要求计算
// ---------------------------------------------------------------------------

function nextLevelRule(site) {
  return (site.route || []).find(level => level.name === site.next_level) || null
}

function retirementRoute(site) {
  const route = site.route || [];
  const userIndex = route.findIndex(level => String(level.name || '').replace(/[^a-z0-9]/gi, '').toLowerCase() === 'user');
  return userIndex >= 0 ? route.slice(userIndex) : route
}

function nextLevelOverallProgress(site) {
  if (site?.status === 'wealthy_retired') return 100
  const nextLevel = nextLevelRule(site);
  if (!nextLevel) return site?.status === 'retired' || !site?.retirement_level ? 100 : 0
  return averageRequirementProgress(requirementRows(site, nextLevel))
}

function routeNodeStatus(site, level) {
  if (level.is_current) return '当前'
  if (level.name === site?.next_level) return '下一等级'
  if (level.is_retirement) return level.reached ? '已保号' : '保号目标'
  return level.reached ? '已达成' : '待达成'
}

function splitLevelName(level) {
  const name = String(level?.name || level || '').trim();
  const aliases = Array.isArray(level?.aliases) ? level.aliases.map(value => String(value || '').trim()).filter(Boolean) : [];
  const combined = [name, ...aliases]
    .map(value => value.match(/^(.+?[\u3400-\u9fff])\s*(?:[（(]([A-Za-z][A-Za-z0-9 .&+/_-]*)[）)]|([A-Za-z][A-Za-z0-9 .&+/_-]*))$/))
    .find(Boolean);
  if (combined) return { local: combined[1].trim(), english: String(combined[2] || combined[3]).trim() }
  const hasChinese = value => /[\u3400-\u9fff]/.test(value);
  const hasEnglish = value => /[A-Za-z]/.test(value);
  const chinese = [name, ...aliases].find(hasChinese) || '';
  const english = [name, ...aliases].find(value => hasEnglish(value) && !hasChinese(value)) || '';
  if (chinese) return { local: chinese, english }
  return { local: name, english: '' }
}

function durationLabel(days) {
  const value = Number(days || 0);
  if (!value) return '无限制'
  return value % 7 === 0 ? `${value / 7} 周` : `${value} 天`
}

function serverDateFor(site) {
  return String(site?.updated_day || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
}

function elapsedAccountDays(site) {
  const startText = String(site?.join_at || '').slice(0, 10);
  const endText = serverDateFor(site);
  if (!startText || !endText) return null
  const start = Date.parse(`${startText}T00:00:00Z`);
  const end = Date.parse(`${endText}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.max(0, Math.floor((end - start) / 86400000))
}

function joinTimeRow(level, key) {
  if (!Number(level?.min_join_days)) return null
  const days = elapsedAccountDays(selectedRetirementSite.value);
  const target = Number(level.min_join_days);
  const strict = Boolean(level.min_join_days_strict);
  const complete = days === null ? false : (strict ? days > target : days >= target);
  const progress = days === null ? 0 : Math.max(0, Math.min(99, days * 100 / target));
  return {
    key,
    label: '注册时间',
    icon: 'mdi-calendar-clock-outline',
    current: days === null ? '数据未提供' : `${days} 天`,
    target: `${strict ? '>' : '≥'} ${durationLabel(target)}`,
    detail: complete ? '已达成' : days === null ? '数据未提供' : `剩余 ${target - days} 天`,
    eta: level.eligible_date || '—',
    complete,
    unavailable: days === null,
    progress,
  }
}

function pushUnsupported(items, prefix) {
  return (items || []).map((item, index) => ({
    key: `${prefix}-unsupported-${index}`,
    label: item?.label || '其他要求',
    icon: 'mdi-help-circle-outline',
    current: '站点未提供',
    target: String(item?.target ?? '需人工确认'),
    detail: '站点未提供该指标',
    eta: '—',
    complete: false,
    unavailable: true,
    progress: 0,
  }))
}

function requirementRows(site, level) {
  if (!level) return []
  const rows = [];
  const reached = Boolean(level.reached);

  const pushNumeric = ({ key, label, icon, current, target, formatter, strict, unavailable = false, etaDate = '' }) => {
    if (!(Number(target) > 0)) return
    const currentNumber = Number(current);
    const available = current !== null && current !== undefined && Number.isFinite(currentNumber) && !unavailable;
    const isStrict = Boolean(strict);
    const complete = reached || (available && (isStrict ? currentNumber > target : currentNumber >= target));
    const progress = complete ? 100 : available ? Math.max(0, Math.min(99, currentNumber * 100 / target)) : 0;
    const difference = available ? Math.max(target - currentNumber, 0) : null;
    rows.push({
      key,
      label,
      icon,
      current: available ? formatter(currentNumber) : '站点未提供',
      target: `${isStrict ? '>' : '≥'} ${formatter(target)}`,
      detail: complete
        ? '已达成'
        : difference === null
          ? '站点未提供该指标'
          : isStrict && difference === 0
            ? `需大于 ${formatter(target)}`
            : `剩余 ${formatter(difference)}`,
      eta: etaDate || '—',
      complete,
      unavailable: !available,
      progress,
    });
  };

  pushNumeric({ key: 'upload', label: '上传量', icon: 'mdi-upload-outline', current: site.upload, target: level.min_upload, formatter: formatBytes, strict: level.min_upload_strict });
  pushNumeric({ key: 'download', label: '下载量', icon: 'mdi-download-outline', current: site.download, target: level.min_download, formatter: formatBytes, strict: level.min_download_strict });
  pushNumeric({ key: 'ratio', label: '分享率', icon: 'mdi-chart-donut', current: site.ratio, target: level.min_ratio, formatter: value => formatNumber(value, 2), strict: level.min_ratio_strict });
  pushNumeric({ key: 'seeding-points', label: '做种积分', icon: 'mdi-star-circle-outline', current: site.seeding_points, target: level.min_seeding_points, formatter: value => formatNumber(value, 0), strict: level.min_seeding_points_strict, unavailable: site.seeding_points === null || site.seeding_points === undefined, etaDate: level.seeding_points_eta_date });
  const joinRow = joinTimeRow(level, 'join-time');
  if (joinRow) rows.push(joinRow);
  pushNumeric({ key: 'bonus', label: '魔力', icon: 'mdi-lightning-bolt-circle', current: site.bonus, target: level.min_bonus, formatter: value => formatNumber(value, 0), strict: level.min_bonus_strict, unavailable: site.bonus === null || site.bonus === undefined });
  pushNumeric({ key: 'seeding', label: '做种数', icon: 'mdi-seed-outline', current: site.seeding, target: level.min_seeding, formatter: value => formatNumber(value, 0), strict: level.min_seeding_strict });
  pushNumeric({ key: 'seeding-size', label: '做种体积', icon: 'mdi-database-outline', current: site.seeding_size, target: level.min_seeding_size, formatter: formatBytes, strict: level.min_seeding_size_strict });
  pushNumeric({ key: 'torrent-uploads', label: '发布数', icon: 'mdi-cloud-upload-outline', current: site.torrent_uploads, target: level.min_torrent_uploads, formatter: value => formatNumber(value, 0), strict: level.min_torrent_uploads_strict, unavailable: site.torrent_uploads === null || site.torrent_uploads === undefined });
  pushNumeric({ key: 'average-seeding-time', label: '平均做种时间', icon: 'mdi-timer-sand', current: site.average_seeding_time_days, target: level.min_average_seeding_time_days, formatter: value => `${formatNumber(value, 1)} 天`, strict: level.min_average_seeding_time_days_strict, unavailable: site.average_seeding_time_days === null || site.average_seeding_time_days === undefined });
  rows.push(...pushUnsupported(level.unsupported_requirements, 'requirement'));

  // 任选条件：站点把升级条件写成「满足以下任一任务即可」
  const alternativeRows = (level.alternatives || []).map((option, optionIndex) => {
    const conditions = [
      ['min_upload', '上传', site.upload, formatBytes],
      ['min_download', '下载', site.download, formatBytes],
      ['min_ratio', '分享率', site.ratio, value => formatNumber(value, 2)],
      ['min_bonus', '魔力', site.bonus, value => formatNumber(value, 0)],
      ['min_seeding_points', '做种积分', site.seeding_points, value => formatNumber(value, 0)],
      ['min_seeding', '做种数', site.seeding, value => formatNumber(value, 0)],
      ['min_seeding_size', '做种体积', site.seeding_size, formatBytes],
      ['min_torrent_uploads', '发布数', site.torrent_uploads, value => formatNumber(value, 0)],
      ['min_average_seeding_time_days', '平均做种时间', site.average_seeding_time_days, value => `${formatNumber(value, 1)} 天`],
    ].filter(([key]) => Number(option?.[key]) > 0).map(([key, label, current, formatter]) => {
      const target = Number(option[key]);
      const currentNumber = Number(current);
      const available = current !== null && current !== undefined && Number.isFinite(currentNumber);
      const strict = Boolean(option[`${key}_strict`]);
      const complete = available && (strict ? currentNumber > target : currentNumber >= target);
      return {
        target: `${label} ${strict ? '>' : '≥'} ${formatter(target)}`,
        current: available ? `${label} ${formatter(currentNumber)}` : `${label}数据未提供`,
        complete,
        progress: complete ? 100 : available ? Math.max(0, Math.min(99, currentNumber * 100 / target)) : 0,
      }
    });
    for (const requirement of option?.unsupported_requirements || []) {
      conditions.push({ target: `${requirement.label || '其他要求'} ${requirement.target ?? ''}`.trim(), current: `${requirement.label || '其他要求'}数据未提供`, complete: false, progress: 0 });
    }
    return {
      key: `alternative-${optionIndex}`,
      target: conditions.map(item => item.target).join(' 且 '),
      current: conditions.map(item => item.current).join('、'),
      complete: conditions.length > 0 && conditions.every(item => item.complete),
      progress: conditions.length ? conditions.reduce((sum, item) => sum + item.progress, 0) / conditions.length : 0,
    }
  }).filter(option => option.target);

  if (alternativeRows.length) {
    const complete = reached || alternativeRows.some(option => option.complete);
    rows.push({
      key: 'alternatives',
      label: '任选条件',
      icon: 'mdi-call-split',
      current: complete ? '达成' : alternativeRows.map(option => option.current).join(' 或 '),
      target: alternativeRows.map(option => option.target).join(' 或 '),
      detail: complete ? '已达成' : '满足任一条件即可',
      eta: '—',
      complete,
      unavailable: !alternativeRows.some(option => option.current && !option.current.includes('站点未提供')),
      progress: complete ? 100 : Math.max(...alternativeRows.map(option => option.progress)),
    });
  }
  return rows
}

function averageRequirementProgress(requirements) {
  if (!requirements.length || requirements.every(row => row.complete)) return 100
  // 站点未提供数据的项（如部分站点没有做种积分）不参与平均：
  // 否则它永远记为 0%，会把整条升级进度压低，看起来像「无法判断等级」。
  const measurable = requirements.filter(row => !row.unavailable);
  if (!measurable.length) return 0
  if (measurable.every(row => row.complete)) return 100
  const progress = Math.round(
    measurable.reduce((sum, row) => sum + Number(row.progress || 0), 0) / measurable.length,
  );
  return Math.min(99, progress)
}

function nextLevelEta(site, requirements) {
  const serverDate = serverDateFor(site);
  if (!serverDate) return { label: '预计时间待补充', days: null }
  const candidates = (requirements || [])
    .map(row => row.eta)
    .filter(value => value && value !== '—')
    .sort();
  if (!candidates.length) return { label: '预计时间待补充', days: null }
  const targetDate = candidates[candidates.length - 1];
  const start = Date.parse(`${serverDate}T00:00:00Z`);
  const end = Date.parse(`${targetDate}T00:00:00Z`);
  const days = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.ceil((end - start) / 86400000)) : null;
  return { label: `预计达成 ${targetDate}`, days }
}

const selectedRetirementView = computed$5(() => {
  const site = selectedRetirementSite.value;
  if (!site) return null

  const route = retirementRoute(site);
  const levels = site.route || [];
  const nextLevel = nextLevelRule(site);
  const displayedLevel = route.find(level => level.name === selectedRouteLevelName.value) || nextLevel;
  const requirements = requirementRows(site, displayedLevel);
  const overallProgress = averageRequirementProgress(requirements);
  const completedCount = requirements.filter(row => row.complete).length;
  // 站点未提供指标的行单列出来，不计入「待完成」，避免看着像永远升不上去
  const unknownCount = requirements.filter(row => row.unavailable && !row.complete).length;
  const routeCount = route.length;
  const currentRouteIndex = route.findIndex(level => level.is_current);
  const completedRouteSegments = currentRouteIndex >= 0
    ? Math.min(currentRouteIndex, Math.max(routeCount - 1, 0))
    : site.status === 'retired' ? Math.max(routeCount - 1, 0) : 0;

  return {
    route,
    levels,
    routeStyle: routeCount ? {
      '--route-count': routeCount,
      '--route-inset': `${50 / routeCount}%`,
      '--route-span': `${100 - 100 / routeCount}%`,
    } : {},
    routeProgress: routeCount <= 1
      ? 100
      : Math.min(100, (completedRouteSegments + nextLevelOverallProgress(site) / 100) * 100 / (routeCount - 1)),
    displayedLevel,
    isDefaultLevel: displayedLevel?.name === nextLevel?.name,
    requirements,
    overallProgress,
    completedCount,
    unknownCount,
    pendingCount: requirements.length - completedCount - unknownCount,
    eta: displayedLevel?.reached ? { label: '已达成', days: null } : nextLevelEta(site, requirements),
  }
});

// ---------------------------------------------------------------------------
// 等级路线表
// ---------------------------------------------------------------------------

function levelTrafficRequirements(level) {
  const requirements = [];
  if (level.min_upload) requirements.push(`上传 ${level.min_upload_strict ? '>' : '≥'} ${formatBytes(level.min_upload)}`);
  if (level.min_download) requirements.push(`下载 ${level.min_download_strict ? '>' : '≥'} ${formatBytes(level.min_download)}`);
  return requirements.length ? requirements : ['—']
}

function levelRatioRequirement(level) {
  if (level.min_ratio === null || level.min_ratio === undefined) return '—'
  return `分享率 ${level.min_ratio_strict ? '>' : '≥'} ${formatNumber(level.min_ratio, 2)}`
}

function levelPointsRequirement(level) {
  if (level.min_seeding_points) return `做种积分 ${level.min_seeding_points_strict ? '>' : '≥'} ${formatNumber(level.min_seeding_points, 0)}`
  if (level.min_bonus) return `魔力 ${formatNumber(level.min_bonus, 0)}`
  if (level.min_seeding) return `做种 ${formatNumber(level.min_seeding, 0)}`
  return '—'
}

function levelHasDetails(level) {
  return Boolean(level.description?.trim() || level.alternatives?.length)
}

function levelAlternativeRequirements(level) {
  const numerals = ['一', '二', '三', '四', '五', '六'];
  const fields = [
    ['min_join_days', '注册', durationLabel],
    ['min_upload', '上传', formatBytes],
    ['min_download', '下载', formatBytes],
    ['min_ratio', '分享率', value => formatNumber(value, 2)],
    ['min_bonus', '魔力', value => formatNumber(value, 0)],
    ['min_seeding_points', '做种积分', value => formatNumber(value, 0)],
    ['min_seeding', '做种数', value => formatNumber(value, 0)],
    ['min_seeding_size', '做种体积', formatBytes],
    ['min_torrent_uploads', '发布数', value => formatNumber(value, 0)],
    ['min_average_seeding_time_days', '平均做种时间', value => `${formatNumber(value, 1)} 天`],
  ];
  return (level.alternatives || []).map((option, index) => ({
    title: `任务${numerals[index] || index + 1}`,
    requirements: [
      ...fields.filter(([key]) => Number(option[key]) > 0).map(([key, label, formatter]) => (
        `${label} ${option[`${key}_strict`] ? '>' : '≥'} ${formatter(option[key])}`
      )),
      ...(option.unsupported_requirements || []).map(item => (
        `${item.label || '其他要求'} ${item.target || '需人工确认'}`
      )),
    ],
  }))
}

// ---------------------------------------------------------------------------
// 左侧站点列表的独立滚动：左右按钮翻页 + 鼠标按住拖动
// ---------------------------------------------------------------------------

const retirementListRef = ref$4(null);
const retirementListCanScrollLeft = ref$4(false);
const retirementListCanScrollRight = ref$4(false);
const retirementListDragging = ref$4(false);
let retirementListDrag = null;
let retirementListSuppressClick = false;

function updateRetirementListScrollState() {
  const element = retirementListRef.value;
  if (!element) return
  const maxScroll = element.scrollWidth - element.clientWidth;
  retirementListCanScrollLeft.value = element.scrollLeft > 2;
  retirementListCanScrollRight.value = maxScroll > 2 && element.scrollLeft < maxScroll - 2;
}

function scrollRetirementList(direction) {
  const element = retirementListRef.value;
  if (!element) return
  const step = Math.max(Math.round(element.clientWidth * 0.8), 200);
  element.scrollBy({ left: direction * step, behavior: 'smooth' });
  window.setTimeout(updateRetirementListScrollState, 360);
}

function onRetirementListPointerDown(event) {
  const element = retirementListRef.value;
  if (!element || event.pointerType !== 'mouse' || event.button !== 0) return
  if (element.scrollWidth <= element.clientWidth + 1) return
  retirementListDrag = {
    startX: event.clientX,
    startScroll: element.scrollLeft,
    pointerId: event.pointerId,
    moved: false,
  };
  try {
    element.setPointerCapture(event.pointerId);
  } catch {
    // 浏览器不支持指针捕获时忽略，拖动退化为普通滚动
  }
}

function onRetirementListPointerMove(event) {
  const drag = retirementListDrag;
  const element = retirementListRef.value;
  if (!drag || !element || event.pointerId !== drag.pointerId) return
  const delta = event.clientX - drag.startX;
  if (!drag.moved && Math.abs(delta) > 5) {
    drag.moved = true;
    retirementListDragging.value = true;
  }
  if (!drag.moved) return
  element.scrollLeft = drag.startScroll - delta;
  updateRetirementListScrollState();
}

function onRetirementListPointerEnd(event) {
  const drag = retirementListDrag;
  const element = retirementListRef.value;
  retirementListDrag = null;
  retirementListDragging.value = false;
  if (!drag || !element) return
  try {
    element.releasePointerCapture(drag.pointerId);
  } catch {
    // 指针已释放时忽略
  }
  if (drag.moved) {
    // 拖动结束短时间内抑制 click，避免误切换站点
    retirementListSuppressClick = true;
    window.setTimeout(() => {
      retirementListSuppressClick = false;
    }, 320);
  }
}

function selectRetirementSite(site) {
  if (retirementListSuppressClick) return
  selectedRetirementSiteKey.value = retirementSiteKey(site);
}

watch$3(
  () => sortedRetirementSites.value.map(retirementSiteKey).join('|'),
  async () => {
    const sites = sortedRetirementSites.value;
    if (!sites.some(site => retirementSiteKey(site) === selectedRetirementSiteKey.value)) {
      selectedRetirementSiteKey.value = retirementSiteKey(sites[0]);
    }
    await nextTick();
    updateRetirementListScrollState();
  },
  { immediate: true },
);

watch$3(selectedRetirementSiteKey, () => {
  selectedRouteLevelName.value = '';
});

onMounted$2(() => {
  updateRetirementListScrollState();
  window.addEventListener('resize', updateRetirementListScrollState);

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) detailWidth.value = entry.contentRect.width;
    });
    if (detailRef.value) resizeObserver.observe(detailRef.value);
  }

  // 实测筛选条高度，写进变量供面板 calc 使用，保证与总览 Tab 总高一致。
  const summary = document.querySelector('.retirement-summary');
  if (summary) {
    const applySummaryHeight = () => {
      summaryHeight.value = Math.round(summary.getBoundingClientRect().height + 12);
    };
    applySummaryHeight();
    window.requestAnimationFrame(applySummaryHeight);
  }
});

// 窄屏时把总体进度圆盘缩小，给右侧要求表留出空间，避免等级轨道被迫横向滚动。
const detailRef = ref$4(null);
const detailWidth = ref$4(0);
/** 筛选条 + 间距实测高度，用于把养老面板总高对齐到 720px。 */
const summaryHeight = ref$4(39);
// 圆盘尺寸按明细面板实际可用宽度决定：宽度越小圆盘越小，
// 始终把右侧要求表留在可视区内，避免出现横向滚动条。
const scoreSize = computed$5(() => {
  const width = detailWidth.value;
  if (!width) return 124
  if (width < 520) return 64
  if (width < 640) return 76
  if (width < 760) return 88
  if (width < 900) return 100
  return 124
});
const scoreWidth = computed$5(() => (scoreSize.value < 100 ? 8 : 12));

/** 圆盘列宽跟随圆盘尺寸，保证左右两栏总宽不超过明细面板。 */
const overviewStyle = computed$5(() => {
  const size = scoreSize.value;
  return { '--score-column': `${size + 20}px` }
});
let resizeObserver = null;

onBeforeUnmount$1(() => {
  window.removeEventListener('resize', updateRetirementListScrollState);
  resizeObserver?.disconnect();
  resizeObserver = null;
});

return (_ctx, _cache) => {
  const _component_VIcon = _resolveComponent$4("VIcon");
  const _component_VAvatar = _resolveComponent$4("VAvatar");
  const _component_VSelect = _resolveComponent$4("VSelect");
  const _component_VProgressLinear = _resolveComponent$4("VProgressLinear");
  const _component_VChip = _resolveComponent$4("VChip");
  const _component_VProgressCircular = _resolveComponent$4("VProgressCircular");

  return (_openBlock$5(), _createElementBlock$5("div", {
    class: "ptm-retire",
    style: _normalizeStyle$1({ '--summary-height': `${summaryHeight.value}px` })
  }, [
    _createElementVNode$4("section", _hoisted_1$5, [
      _createElementVNode$4("div", _hoisted_2$5, [
        _createElementVNode$4("div", _hoisted_3$5, [
          _createElementVNode$4("span", _hoisted_4$4, [
            _createVNode$4(_component_VIcon, {
              icon: "mdi-crown-outline",
              size: "16"
            })
          ]),
          _cache[3] || (_cache[3] = _createElementVNode$4("strong", null, "十二大进度", -1))
        ]),
        _createElementVNode$4("div", _hoisted_5$4, [
          _createElementVNode$4("span", _hoisted_6$4, [
            _createElementVNode$4("b", null, _toDisplayString$4(twelveJoinedCount.value), 1),
            _createElementVNode$4("em", null, "/ " + _toDisplayString$4(twelveTotalCount.value), 1),
            _cache[4] || (_cache[4] = _createElementVNode$4("small", null, "已加入", -1))
          ]),
          _cache[7] || (_cache[7] = _createElementVNode$4("span", { class: "twelve-panel__divider" }, null, -1)),
          _createElementVNode$4("span", _hoisted_7$4, [
            _createElementVNode$4("b", _hoisted_8$4, _toDisplayString$4(twelvePercent.value) + "%", 1),
            _cache[5] || (_cache[5] = _createElementVNode$4("small", null, "完成进度", -1))
          ]),
          _cache[8] || (_cache[8] = _createElementVNode$4("span", { class: "twelve-panel__divider" }, null, -1)),
          _createElementVNode$4("span", _hoisted_9$3, [
            _createElementVNode$4("b", null, _toDisplayString$4(twelveRemainingCount.value), 1),
            _cache[6] || (_cache[6] = _createElementVNode$4("small", null, "剩余站点", -1))
          ])
        ])
      ]),
      _createElementVNode$4("div", _hoisted_10$3, [
        _createElementVNode$4("div", _hoisted_11$3, [
          _createElementVNode$4("div", _hoisted_12$3, [
            _createElementVNode$4("i", {
              style: _normalizeStyle$1({ width: `${twelveTrackPercent.value}%` })
            }, null, 4)
          ]),
          (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(twelveItems.value, (item, index) => {
            return (_openBlock$5(), _createElementBlock$5("div", {
              key: item.key,
              class: _normalizeClass$3(["twelve-node", `twelve-node--${item.state}`]),
              role: "listitem",
              title: item.state === 'joined' ? `${item.name}${item.join_at ? '，加入于 ' + item.join_at : ''}` : twelveStateMeta(item.state).label
            }, [
              _createElementVNode$4("span", _hoisted_14$3, _toDisplayString$4(index + 1), 1),
              _createElementVNode$4("span", _hoisted_15$3, [
                (item.state === 'joined' && item.site_id)
                  ? (_openBlock$5(), _createBlock$4(_sfc_main$8, {
                      key: 0,
                      api: __props.api,
                      site: { site_id: item.site_id, name: item.name },
                      size: 38
                    }, null, 8, ["api", "site"]))
                  : (_openBlock$5(), _createBlock$4(_component_VAvatar, {
                      key: 1,
                      size: 38,
                      color: "secondary",
                      variant: "tonal"
                    }, {
                      default: _withCtx$4(() => [
                        _createVNode$4(_component_VIcon, {
                          icon: twelveStateMeta(item.state).icon,
                          size: "19"
                        }, null, 8, ["icon"])
                      ]),
                      _: 2
                    }, 1024))
              ]),
              (item.state === 'joined')
                ? (_openBlock$5(), _createElementBlock$5("strong", _hoisted_16$3, _toDisplayString$4(item.name), 1))
                : (_openBlock$5(), _createElementBlock$5("em", _hoisted_17$3, _toDisplayString$4(twelveStateMeta(item.state).label), 1)),
              (item.state === 'joined')
                ? (_openBlock$5(), _createElementBlock$5("small", _hoisted_18$3, _toDisplayString$4(twelveJoinDate(item.join_at)), 1))
                : _createCommentVNode$5("", true)
            ], 10, _hoisted_13$3))
          }), 128))
        ])
      ])
    ]),
    _createElementVNode$4("div", _hoisted_19$3, [
      (_openBlock$5(), _createElementBlock$5(_Fragment$3, null, _renderList$3(STATUS_FILTERS, (item) => {
        return _createElementVNode$4("button", {
          key: item.key,
          type: "button",
          class: _normalizeClass$3(["retirement-chip", {
          'retirement-chip--active': statusFilter.value === item.key,
          'retirement-chip--wealthy': item.key === 'wealthy_retired',
        }]),
          style: _normalizeStyle$1({ '--chip-color': `rgb(var(--v-theme-${item.color}))` }),
          "aria-pressed": statusFilter.value === item.key,
          onClick: $event => (toggleStatusFilter(item.key))
        }, [
          (item.key === 'wealthy_retired')
            ? (_openBlock$5(), _createBlock$4(_component_VIcon, {
                key: 0,
                icon: "mdi-crown",
                size: "14"
              }))
            : _createCommentVNode$5("", true),
          _createTextVNode$4(" " + _toDisplayString$4(item.label) + " " + _toDisplayString$4(statusCount(item.key)), 1)
        ], 14, _hoisted_20$3)
      }), 64))
    ]),
    _createElementVNode$4("section", _hoisted_21$3, [
      _createElementVNode$4("aside", _hoisted_22$2, [
        _createElementVNode$4("div", _hoisted_23$2, [
          _cache[9] || (_cache[9] = _createElementVNode$4("strong", null, "站点列表", -1)),
          _createElementVNode$4("span", null, _toDisplayString$4(listHeadingText.value), 1)
        ]),
        _createVNode$4(_component_VSelect, {
          modelValue: retirementSortKey.value,
          "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((retirementSortKey).value = $event)),
          items: retirementSortOptions,
          label: "排序方式",
          "prepend-inner-icon": "mdi-sort",
          density: "compact",
          variant: "outlined",
          "hide-details": "",
          class: "retirement-site-sort"
        }, null, 8, ["modelValue"]),
        _createElementVNode$4("div", _hoisted_24$2, [
          _createElementVNode$4("button", {
            type: "button",
            class: "retirement-site-nav",
            "aria-label": "向左滚动站点列表",
            disabled: !retirementListCanScrollLeft.value,
            onClick: _cache[1] || (_cache[1] = $event => (scrollRetirementList(-1)))
          }, [
            _createVNode$4(_component_VIcon, {
              icon: "mdi-chevron-left",
              size: "20"
            })
          ], 8, _hoisted_25$2),
          _createElementVNode$4("div", {
            ref_key: "retirementListRef",
            ref: retirementListRef,
            class: _normalizeClass$3(["retirement-site-list__items", { 'is-dragging': retirementListDragging.value }]),
            onScrollPassive: updateRetirementListScrollState,
            onPointerdown: onRetirementListPointerDown,
            onPointermove: onRetirementListPointerMove,
            onPointerup: onRetirementListPointerEnd,
            onPointercancel: onRetirementListPointerEnd,
            onPointerleave: onRetirementListPointerEnd
          }, [
            (!sortedRetirementSites.value.length)
              ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_26$2, [
                  _createVNode$4(_component_VIcon, {
                    icon: "mdi-filter-off-outline",
                    size: "30"
                  }),
                  _cache[10] || (_cache[10] = _createElementVNode$4("span", null, "该状态下没有站点", -1)),
                  _cache[11] || (_cache[11] = _createElementVNode$4("small", null, "点击上方「全部」查看全部站点", -1))
                ]))
              : _createCommentVNode$5("", true),
            (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(sortedRetirementSites.value, (site) => {
              return (_openBlock$5(), _createElementBlock$5("button", {
                key: retirementSiteKey(site),
                type: "button",
                class: _normalizeClass$3(["retirement-site-option", { 'retirement-site-option--selected': retirementSiteKey(site) === retirementSiteKey(selectedRetirementSite.value), 'retirement-site-option--wealthy': site.status === 'wealthy_retired' }]),
                "aria-pressed": retirementSiteKey(site) === retirementSiteKey(selectedRetirementSite.value),
                onClick: $event => (selectRetirementSite(site))
              }, [
                _createVNode$4(_sfc_main$8, {
                  api: __props.api,
                  site: avatarSite(site),
                  size: 42
                }, null, 8, ["api", "site"]),
                _createElementVNode$4("span", _hoisted_28$2, [
                  _createElementVNode$4("span", _hoisted_29$2, [
                    _createElementVNode$4("strong", null, _toDisplayString$4(site.site_name), 1),
                    (site.status !== 'wealthy_retired')
                      ? (_openBlock$5(), _createElementBlock$5("em", {
                          key: 0,
                          class: _normalizeClass$3(`status-${site.status}`)
                        }, _toDisplayString$4(retirementMeta(site.status, site).label), 3))
                      : _createCommentVNode$5("", true)
                  ]),
                  _createElementVNode$4("span", null, _toDisplayString$4(site.current_level || '站点未提供等级'), 1),
                  _createVNode$4(_component_VProgressLinear, {
                    "model-value": nextLevelOverallProgress(site),
                    color: site.status === 'wealthy_retired' ? 'warning' : 'primary',
                    "bg-color": "surface-variant",
                    height: "4",
                    rounded: ""
                  }, null, 8, ["model-value", "color"])
                ]),
                _createElementVNode$4("small", null, _toDisplayString$4(site.status === 'wealthy_retired' ? '富贵养老' : `${nextLevelOverallProgress(site)}%`), 1)
              ], 10, _hoisted_27$2))
            }), 128))
          ], 34),
          _createElementVNode$4("button", {
            type: "button",
            class: "retirement-site-nav",
            "aria-label": "向右滚动站点列表",
            disabled: !retirementListCanScrollRight.value,
            onClick: _cache[2] || (_cache[2] = $event => (scrollRetirementList(1)))
          }, [
            _createVNode$4(_component_VIcon, {
              icon: "mdi-chevron-right",
              size: "20"
            })
          ], 8, _hoisted_30$2)
        ])
      ]),
      (selectedRetirementSite.value)
        ? (_openBlock$5(), _createElementBlock$5("article", {
            key: 0,
            ref_key: "detailRef",
            ref: detailRef,
            class: "retirement-detail"
          }, [
            _createElementVNode$4("header", _hoisted_31$2, [
              _createElementVNode$4("div", _hoisted_32$1, [
                _createVNode$4(_sfc_main$8, {
                  api: __props.api,
                  site: avatarSite(selectedRetirementSite.value),
                  size: 58
                }, null, 8, ["api", "site"]),
                _createElementVNode$4("div", null, [
                  _createElementVNode$4("h3", null, _toDisplayString$4(selectedRetirementSite.value.site_name), 1),
                  _createElementVNode$4("span", null, [
                    _cache[12] || (_cache[12] = _createTextVNode$4("当前等级 ", -1)),
                    _createElementVNode$4("strong", null, _toDisplayString$4(selectedRetirementSite.value.current_level || '站点未提供'), 1)
                  ]),
                  (selectedRetirementSite.value.retirement_level)
                    ? (_openBlock$5(), _createElementBlock$5("span", _hoisted_33$1, [
                        _cache[13] || (_cache[13] = _createTextVNode$4("目标等级 ", -1)),
                        _createElementVNode$4("strong", _hoisted_34$1, _toDisplayString$4(selectedRetirementSite.value.retirement_level) + "（保号）", 1)
                      ]))
                    : _createCommentVNode$5("", true)
                ])
              ]),
              _createElementVNode$4("div", _hoisted_35$1, [
                (selectedRetirementSite.value.status === 'wealthy_retired')
                  ? (_openBlock$5(), _createBlock$4(_component_VChip, {
                      key: 0,
                      class: "wealthy-retirement-badge",
                      "prepend-icon": "mdi-crown",
                      variant: "flat"
                    }, {
                      default: _withCtx$4(() => [...(_cache[14] || (_cache[14] = [
                        _createTextVNode$4("富贵养老", -1)
                      ]))]),
                      _: 1
                    }))
                  : _createCommentVNode$5("", true),
                _createElementVNode$4("div", _hoisted_36$1, [
                  _createElementVNode$4("span", null, [
                    _cache[15] || (_cache[15] = _createTextVNode$4("上传", -1)),
                    _createElementVNode$4("strong", null, _toDisplayString$4(_unref$2(formatBytes)(selectedRetirementSite.value.upload)), 1)
                  ]),
                  _createElementVNode$4("span", null, [
                    _cache[16] || (_cache[16] = _createTextVNode$4("下载", -1)),
                    _createElementVNode$4("strong", null, _toDisplayString$4(_unref$2(formatBytes)(selectedRetirementSite.value.download)), 1)
                  ]),
                  _createElementVNode$4("span", null, [
                    _cache[17] || (_cache[17] = _createTextVNode$4("分享率", -1)),
                    _createElementVNode$4("strong", null, _toDisplayString$4(field(selectedRetirementSite.value.ratio, 2)), 1)
                  ])
                ])
              ])
            ]),
            (selectedRetirementSite.value.status === 'wealthy_retired')
              ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_37$1, [
                  _createElementVNode$4("div", _hoisted_38$1, [
                    _createVNode$4(_component_VIcon, {
                      icon: "mdi-crown",
                      size: "28"
                    })
                  ]),
                  _createElementVNode$4("div", null, [
                    _createElementVNode$4("span", null, _toDisplayString$4(selectedRetirementSite.value.wealthy_retirement_manual ? '手动指定站点' : 'VIP 会员等级'), 1),
                    _cache[18] || (_cache[18] = _createElementVNode$4("strong", null, "富贵养老", -1)),
                    _createElementVNode$4("small", null, _toDisplayString$4(selectedRetirementSite.value.wealthy_retirement_manual ? '已在设置中手动标记；完整等级路线仍可在下方查看。' : '会员等级不强行映射普通等级，完整等级路线仍可在下方查看。'), 1)
                  ])
                ]))
              : (selectedRetirementView.value.route.length)
                ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_39$1, [
                    _createElementVNode$4("div", {
                      class: "retirement-route-rail__track",
                      style: _normalizeStyle$1(selectedRetirementView.value.routeStyle)
                    }, [
                      _createElementVNode$4("div", _hoisted_40$1, [
                        _createVNode$4(_component_VProgressLinear, {
                          "model-value": selectedRetirementView.value.routeProgress,
                          color: "primary",
                          "bg-color": "secondary",
                          "bg-opacity": 0.3,
                          height: "5",
                          rounded: ""
                        }, null, 8, ["model-value"])
                      ]),
                      _createElementVNode$4("div", _hoisted_41$1, [
                        (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(selectedRetirementView.value.route, (level, index) => {
                          return (_openBlock$5(), _createElementBlock$5("button", {
                            key: level.name,
                            type: "button",
                            class: _normalizeClass$3(["retirement-route-node", { 'is-reached': level.reached, 'is-current': level.is_current, 'is-next': level.name === selectedRetirementSite.value.next_level, 'is-retirement': level.is_retirement, 'is-selected': level.name === selectedRetirementView.value.displayedLevel?.name }]),
                            "aria-pressed": level.name === selectedRetirementView.value.displayedLevel?.name,
                            "aria-label": `查看 ${level.name} 等级进度`,
                            onClick: $event => (selectedRouteLevelName.value = level.name)
                          }, [
                            _createElementVNode$4("i", _hoisted_43$1, _toDisplayString$4(index + 1), 1),
                            _createElementVNode$4("strong", _hoisted_44, [
                              _createElementVNode$4("span", null, _toDisplayString$4(splitLevelName(level).local), 1),
                              (splitLevelName(level).english)
                                ? (_openBlock$5(), _createElementBlock$5("span", _hoisted_45, _toDisplayString$4(splitLevelName(level).english), 1))
                                : _createCommentVNode$5("", true)
                            ]),
                            _createElementVNode$4("em", _hoisted_46, _toDisplayString$4(routeNodeStatus(selectedRetirementSite.value, level)), 1)
                          ], 10, _hoisted_42$1))
                        }), 128))
                      ])
                    ], 4)
                  ]))
                : _createCommentVNode$5("", true),
            (selectedRetirementSite.value.status !== 'wealthy_retired' && selectedRetirementView.value.route.length)
              ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_47, [
                  _createElementVNode$4("section", _hoisted_48, [
                    _createElementVNode$4("div", _hoisted_49, [
                      _createElementVNode$4("div", null, [
                        _createVNode$4(_component_VIcon, {
                          icon: "mdi-target",
                          color: "primary",
                          size: "34"
                        }),
                        _createElementVNode$4("span", null, _toDisplayString$4(selectedRetirementView.value.isDefaultLevel ? '下一等级' : '所选等级'), 1),
                        _createElementVNode$4("strong", null, _toDisplayString$4(selectedRetirementView.value.displayedLevel?.name || '已是最高等级'), 1)
                      ]),
                      _cache[19] || (_cache[19] = _createElementVNode$4("div", {
                        class: "requirement-panel__spacer",
                        "aria-hidden": "true"
                      }, null, -1)),
                      _createVNode$4(_component_VChip, {
                        color: selectedRetirementView.value.displayedLevel?.reached ? 'success' : 'warning',
                        size: "small",
                        variant: "tonal",
                        "prepend-icon": selectedRetirementView.value.displayedLevel?.reached ? 'mdi-check-circle-outline' : 'mdi-clock-outline'
                      }, {
                        default: _withCtx$4(() => [
                          _createTextVNode$4(_toDisplayString$4(selectedRetirementView.value.eta.label), 1),
                          (selectedRetirementView.value.eta.days !== null)
                            ? (_openBlock$5(), _createElementBlock$5(_Fragment$3, { key: 0 }, [
                                _createTextVNode$4(" · 约 " + _toDisplayString$4(selectedRetirementView.value.eta.days) + " 天", 1)
                              ], 64))
                            : _createCommentVNode$5("", true)
                        ]),
                        _: 1
                      }, 8, ["color", "prepend-icon"])
                    ]),
                    (selectedRetirementView.value.requirements.length)
                      ? (_openBlock$5(), _createElementBlock$5("div", {
                          key: 0,
                          class: "requirement-overview",
                          style: _normalizeStyle$1(overviewStyle.value)
                        }, [
                          _createElementVNode$4("div", _hoisted_50, [
                            _createVNode$4(_component_VProgressCircular, {
                              "model-value": selectedRetirementView.value.overallProgress,
                              size: scoreSize.value,
                              width: scoreWidth.value,
                              color: "primary"
                            }, {
                              default: _withCtx$4(() => [
                                _createElementVNode$4("strong", null, _toDisplayString$4(selectedRetirementView.value.overallProgress) + "%", 1)
                              ]),
                              _: 1
                            }, 8, ["model-value", "size", "width"]),
                            _cache[20] || (_cache[20] = _createElementVNode$4("span", null, "总体进度", -1)),
                            _createElementVNode$4("b", null, _toDisplayString$4(selectedRetirementView.value.overallProgress) + "%", 1),
                            _createElementVNode$4("small", null, [
                              _createTextVNode$4(" 已完成 " + _toDisplayString$4(selectedRetirementView.value.completedCount) + " 项 · 待完成 " + _toDisplayString$4(selectedRetirementView.value.pendingCount) + " 项", 1),
                              (selectedRetirementView.value.unknownCount)
                                ? (_openBlock$5(), _createElementBlock$5(_Fragment$3, { key: 0 }, [
                                    _createTextVNode$4(" · 未提供 " + _toDisplayString$4(selectedRetirementView.value.unknownCount) + " 项", 1)
                                  ], 64))
                                : _createCommentVNode$5("", true)
                            ])
                          ]),
                          _createElementVNode$4("div", _hoisted_51, [
                            _createElementVNode$4("div", _hoisted_52, [
                              _cache[22] || (_cache[22] = _createElementVNode$4("div", { class: "requirement-table__head" }, [
                                _createElementVNode$4("span", null, "项目"),
                                _createElementVNode$4("span", null, "目标要求"),
                                _createElementVNode$4("span", null, "当前进度"),
                                _createElementVNode$4("span", null, "剩余"),
                                _createElementVNode$4("span", null, "时间"),
                                _createElementVNode$4("span", null, "完成进度")
                              ], -1)),
                              (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(selectedRetirementView.value.requirements, (row) => {
                                return (_openBlock$5(), _createElementBlock$5("div", {
                                  key: row.key,
                                  class: "requirement-row"
                                }, [
                                  _createElementVNode$4("span", _hoisted_53, [
                                    _createVNode$4(_component_VIcon, {
                                      icon: row.icon,
                                      color: "secondary",
                                      size: "22"
                                    }, null, 8, ["icon"]),
                                    _createElementVNode$4("strong", null, _toDisplayString$4(row.label), 1)
                                  ]),
                                  _createElementVNode$4("span", null, _toDisplayString$4(row.target), 1),
                                  _createElementVNode$4("strong", {
                                    class: _normalizeClass$3({ 'text-success': row.complete })
                                  }, _toDisplayString$4(row.current), 3),
                                  _createElementVNode$4("span", {
                                    class: _normalizeClass$3({ 'text-success': row.complete, 'text-warning': row.unavailable })
                                  }, _toDisplayString$4(row.complete ? '—' : row.detail.replace(/^剩余\s*/, '')), 3),
                                  _createElementVNode$4("span", null, _toDisplayString$4(row.eta), 1),
                                  (row.unavailable && !row.complete)
                                    ? (_openBlock$5(), _createElementBlock$5("span", _hoisted_54, [...(_cache[21] || (_cache[21] = [
                                        _createElementVNode$4("span", { class: "requirement-row__unknown" }, "未提供，不计入进度", -1)
                                      ]))]))
                                    : (_openBlock$5(), _createElementBlock$5("span", _hoisted_55, [
                                        _createVNode$4(_component_VProgressLinear, {
                                          "model-value": row.progress,
                                          color: row.complete ? 'success' : 'primary',
                                          "bg-color": "surface-variant",
                                          height: "7",
                                          rounded: ""
                                        }, null, 8, ["model-value", "color"]),
                                        _createElementVNode$4("b", null, _toDisplayString$4(Math.round(row.progress)) + "%", 1)
                                      ]))
                                ]))
                              }), 128))
                            ])
                          ])
                        ], 4))
                      : (_openBlock$5(), _createElementBlock$5("div", _hoisted_56, _toDisplayString$4(selectedRetirementView.value.displayedLevel ? '该等级没有要求数据' : '没有后续等级要求'), 1))
                  ])
                ]))
              : _createCommentVNode$5("", true),
            (selectedRetirementView.value.levels.length)
              ? (_openBlock$5(), _createElementBlock$5("section", _hoisted_57, [
                  _createElementVNode$4("div", _hoisted_58, [
                    _createElementVNode$4("div", null, [
                      _createVNode$4(_component_VIcon, {
                        icon: "mdi-chart-bar",
                        color: "primary"
                      }),
                      _cache[23] || (_cache[23] = _createElementVNode$4("strong", null, "等级路线与要求", -1))
                    ])
                  ]),
                  _createElementVNode$4("div", _hoisted_59, [
                    _createElementVNode$4("div", _hoisted_60, [
                      _cache[27] || (_cache[27] = _createElementVNode$4("div", { class: "retirement-levels__columns" }, [
                        _createElementVNode$4("span", null, "等级"),
                        _createElementVNode$4("span", null, "注册"),
                        _createElementVNode$4("span", null, "流量"),
                        _createElementVNode$4("span", null, "分享率"),
                        _createElementVNode$4("span", null, "做种积分"),
                        _createElementVNode$4("i")
                      ], -1)),
                      (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(selectedRetirementView.value.levels, (level) => {
                        return (_openBlock$5(), _createElementBlock$5("details", {
                          key: level.name,
                          class: _normalizeClass$3(["retirement-level-row", { 'has-detail': levelHasDetails(level) }]),
                          open: levelHasDetails(level) && (level.is_current || level.name === selectedRetirementSite.value.next_level)
                        }, [
                          _createElementVNode$4("summary", {
                            onClick: $event => (!levelHasDetails(level) && $event.preventDefault())
                          }, [
                            _createElementVNode$4("strong", null, _toDisplayString$4(level.name), 1),
                            _createElementVNode$4("span", _hoisted_63, _toDisplayString$4(level.min_join_days ? `${level.min_join_days_strict ? '>' : '≥'} ${durationLabel(level.min_join_days)}` : '无限制'), 1),
                            _createElementVNode$4("span", _hoisted_64, [
                              (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(levelTrafficRequirements(level), (item) => {
                                return (_openBlock$5(), _createElementBlock$5("span", { key: item }, _toDisplayString$4(item), 1))
                              }), 128))
                            ]),
                            _createElementVNode$4("span", _hoisted_65, _toDisplayString$4(levelRatioRequirement(level).replace(/^分享率\s*/, '')), 1),
                            _createElementVNode$4("span", _hoisted_66, _toDisplayString$4(levelPointsRequirement(level).replace(/^做种积分\s*/, '')), 1),
                            (levelHasDetails(level))
                              ? (_openBlock$5(), _createBlock$4(_component_VIcon, {
                                  key: 0,
                                  icon: "mdi-chevron-down",
                                  size: "18"
                                }))
                              : _createCommentVNode$5("", true)
                          ], 8, _hoisted_62),
                          (level.description || level.alternatives?.length)
                            ? (_openBlock$5(), _createElementBlock$5("div", {
                                key: 0,
                                class: _normalizeClass$3(["retirement-level-row__detail", { 'has-alternatives': level.description && level.alternatives?.length }])
                              }, [
                                (level.description)
                                  ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_67, [
                                      _createElementVNode$4("div", _hoisted_68, [
                                        _createVNode$4(_component_VIcon, {
                                          icon: "mdi-text-box-outline",
                                          size: "18"
                                        }),
                                        _cache[24] || (_cache[24] = _createElementVNode$4("strong", null, "等级说明", -1))
                                      ]),
                                      _createElementVNode$4("p", null, _toDisplayString$4(level.description), 1)
                                    ]))
                                  : _createCommentVNode$5("", true),
                                (level.alternatives?.length)
                                  ? (_openBlock$5(), _createElementBlock$5("div", _hoisted_69, [
                                      _createElementVNode$4("div", _hoisted_70, [
                                        _createVNode$4(_component_VIcon, {
                                          icon: "mdi-call-split",
                                          size: "18"
                                        }),
                                        _cache[25] || (_cache[25] = _createElementVNode$4("strong", null, "任选条件", -1))
                                      ]),
                                      _cache[26] || (_cache[26] = _createElementVNode$4("p", null, "满足以下任一任务即可达到该等级", -1)),
                                      _createElementVNode$4("div", _hoisted_71, [
                                        (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(levelAlternativeRequirements(level), (task) => {
                                          return (_openBlock$5(), _createElementBlock$5("div", {
                                            key: task.title,
                                            class: "retirement-level-row__task"
                                          }, [
                                            _createElementVNode$4("strong", null, _toDisplayString$4(task.title), 1),
                                            (_openBlock$5(true), _createElementBlock$5(_Fragment$3, null, _renderList$3(task.requirements, (requirement) => {
                                              return (_openBlock$5(), _createElementBlock$5("span", { key: requirement }, _toDisplayString$4(requirement), 1))
                                            }), 128))
                                          ]))
                                        }), 128))
                                      ])
                                    ]))
                                  : _createCommentVNode$5("", true)
                              ], 2))
                            : _createCommentVNode$5("", true)
                        ], 10, _hoisted_61))
                      }), 128))
                    ])
                  ])
                ]))
              : _createCommentVNode$5("", true)
          ], 512))
        : (_openBlock$5(), _createElementBlock$5("article", _hoisted_72, [
            _createElementVNode$4("div", _hoisted_73, [
              _createVNode$4(_component_VIcon, {
                icon: "mdi-shield-sun-outline",
                size: "42"
              }),
              _cache[28] || (_cache[28] = _createElementVNode$4("strong", null, "没有可展示的站点", -1)),
              _createElementVNode$4("span", null, "当前筛选「" + _toDisplayString$4(currentFilterLabel.value) + "」下没有站点，点击上方「全部」查看全部 " + _toDisplayString$4(retirement.value.sites?.length || 0) + " 个站点。", 1)
            ])
          ]))
    ])
  ], 4))
}
}

};
const RetirementPanel = /*#__PURE__*/_export_sfc(_sfc_main$5, [['__scopeId',"data-v-f7972253"]]);

const {renderList:_renderList$2,Fragment:_Fragment$2,openBlock:_openBlock$4,createElementBlock:_createElementBlock$4,resolveComponent:_resolveComponent$3,createVNode:_createVNode$3,toDisplayString:_toDisplayString$3,createElementVNode:_createElementVNode$3,normalizeClass:_normalizeClass$2,createTextVNode:_createTextVNode$3,withCtx:_withCtx$3,createCommentVNode:_createCommentVNode$4,unref:_unref$1,createBlock:_createBlock$3,withModifiers:_withModifiers$1} = await importShared('vue');


const _hoisted_1$4 = { class: "ptm-invite" };
const _hoisted_2$4 = { class: "ptm-invite__summary" };
const _hoisted_3$4 = {
  key: 0,
  class: "ptm-invite__empty"
};
const _hoisted_4$3 = {
  key: 1,
  class: "ptm-invite__explorer"
};
const _hoisted_5$3 = { class: "ptm-invite__list" };
const _hoisted_6$3 = { class: "ptm-invite__list-head" };
const _hoisted_7$3 = { class: "ptm-invite__filters" };
const _hoisted_8$3 = ["onClick"];
const _hoisted_9$2 = { class: "ptm-invite__items" };
const _hoisted_10$2 = ["onClick"];
const _hoisted_11$2 = { class: "ptm-invite__item-body" };
const _hoisted_12$2 = { class: "ptm-invite__item-title" };
const _hoisted_13$2 = { class: "ptm-invite__item-sub" };
const _hoisted_14$2 = {
  key: 0,
  class: "ptm-invite__empty ptm-invite__empty--inline"
};
const _hoisted_15$2 = {
  key: 0,
  class: "ptm-invite__detail"
};
const _hoisted_16$2 = { class: "ptm-invite__detail-head" };
const _hoisted_17$2 = { class: "ptm-invite__identity" };
const _hoisted_18$2 = { class: "ptm-invite__counters" };
const _hoisted_19$2 = { class: "ptm-invite__counter" };
const _hoisted_20$2 = { class: "ptm-invite__counter" };
const _hoisted_21$2 = { class: "ptm-invite__detail-meta" };
const _hoisted_22$1 = {
  key: 2,
  class: "ptm-invite__time"
};
const _hoisted_23$1 = {
  key: 1,
  class: "ptm-invite__table-wrap"
};
const _hoisted_24$1 = { class: "ptm-invite__table" };
const _hoisted_25$1 = { class: "ptm-invite__member" };
const _hoisted_26$1 = ["href"];
const _hoisted_27$1 = { class: "ptm-invite__muted" };
const _hoisted_28$1 = { class: "ptm-invite__muted" };
const _hoisted_29$1 = {
  key: 2,
  class: "ptm-invite__empty ptm-invite__empty--inline"
};
const _hoisted_30$1 = {
  key: 1,
  class: "ptm-invite__detail"
};
const _hoisted_31$1 = { class: "ptm-invite__empty" };

const {computed: computed$4,ref: ref$3} = await importShared('vue');


const _sfc_main$4 = {
  __name: 'InvitePanel',
  props: {
  invite: { type: Object, default: () => ({ sites: [] }) },
  sites: { type: Array, default: () => [] },
  api: { type: Object, default: () => ({}) },
  collecting: { type: Boolean, default: false },
},
  emits: ['collect'],
  setup(__props, { emit: __emit }) {

/**
 * 后宫（邀请）面板。
 *
 * 左侧站点列表显示成员数与风险数量，右侧展示该站的邀请名额与
 * 被邀者明细（用户名、邮箱、分享率、做种、最后汇报、状态），
 * 参考「后宫管理系统」的信息组织方式。
 */
const props = __props;

const emit = __emit;

const selectedDomain = ref$3('');
// 站点筛选：全部 / 有名额 / 有成员
const filter = ref$3('all');

const inviteSites = computed$4(() => props.invite?.sites || []);

const filteredSites = computed$4(() => {
  const items = inviteSites.value;
  if (filter.value === 'quota') return items.filter(site => Number(site.invites_available || 0) > 0)
  if (filter.value === 'members') return items.filter(site => Number(site.invitee_count || 0) > 0)
  return items
});

const sortedSites = computed$4(() =>
  [...filteredSites.value].sort((left, right) => {
    if (right.danger_count !== left.danger_count) return right.danger_count - left.danger_count
    if (Number(right.invites_available || 0) !== Number(left.invites_available || 0)) {
      return Number(right.invites_available || 0) - Number(left.invites_available || 0)
    }
    if (right.invitee_count !== left.invitee_count) return right.invitee_count - left.invitee_count
    return String(left.site_name).localeCompare(String(right.site_name))
  }),
);

const selectedSite = computed$4(
  () =>
    sortedSites.value.find(site => site.domain === selectedDomain.value)
    || sortedSites.value[0]
    || null,
);

const members = computed$4(() => selectedSite.value?.invitees || []);

/** 汇总卡片数据。 */
const summaryItems = computed$4(() => {
  const data = props.invite || {};
  return [
    { label: '站点', value: formatInteger(data.site_count || 0), icon: 'mdi-server-network', color: 'primary' },
    {
      label: '有名额站点',
      value: formatInteger(data.quota_site_count || 0),
      icon: 'mdi-ticket-confirmation-outline',
      color: 'warning',
    },
    { label: '可用名额', value: formatInteger(data.available_total || 0), icon: 'mdi-ticket-confirmation', color: 'warning' },
    { label: '成员', value: formatInteger(data.invitee_total || 0), icon: 'mdi-account-group', color: 'info' },
    { label: '已发邀请', value: formatInteger(data.sent_total || 0), icon: 'mdi-send-check-outline', color: 'success' },
    {
      label: '风险成员',
      value: formatInteger((data.danger_total || 0) + (data.warning_total || 0)),
      icon: 'mdi-alert-outline',
      color: (data.danger_total || 0) > 0 ? 'error' : 'success',
    },
  ]
});

/** 筛选标签：带数量，点一次切换。 */
const filterChips = computed$4(() => {
  const items = inviteSites.value;
  return [
    { key: 'all', label: '全部', count: items.length, color: 'primary' },
    {
      key: 'quota',
      label: '有名额',
      count: items.filter(site => Number(site.invites_available || 0) > 0).length,
      color: 'warning',
    },
    {
      key: 'members',
      label: '有成员',
      count: items.filter(site => Number(site.invitee_count || 0) > 0).length,
      color: 'info',
    },
  ]
});

/** 名额展示：未采集到显示占位，0 显示 0。 */
function quotaText(site) {
  const value = site?.invites_available;
  return value === null || value === undefined ? '—' : String(value)
}

/** 站点列表右侧的风险徽标文案。 */
function riskText(site) {
  const danger = Number(site.danger_count || 0);
  const warning = Number(site.warning_count || 0);
  if (danger) return `危险 ${danger}`
  if (warning) return `较低 ${warning}`
  if (site.invitee_count) return '正常'
  return '无成员'
}

/** 分享率显示：未提供时显示占位。 */
function ratioText(member) {
  if (member.ratio === null || member.ratio === undefined) {
    if (member.uploaded && !member.downloaded) return '∞'
    return '—'
  }
  return formatNumber(member.ratio, 3)
}

function ratioTone(member) {
  if (member.ratio_health === 'danger') return 'text-error'
  if (member.ratio_health === 'warning') return 'text-warning'
  if (member.ratio_health === 'good' || member.ratio_health === 'excellent') return 'text-success'
  return 'text-medium-emphasis'
}

/** 成员对应的站点头像数据（借用站点图标）。 */
const avatarSite = computed$4(() => {
  const site = selectedSite.value;
  if (!site) return {}
  const base = (props.sites || []).find(item => item.domain === site.domain) || {};
  return { ...base, name: site.site_name, domain: site.domain }
});

function selectSite(site) {
  selectedDomain.value = site.domain;
}

return (_ctx, _cache) => {
  const _component_VIcon = _resolveComponent$3("VIcon");
  const _component_VSpacer = _resolveComponent$3("VSpacer");
  const _component_VBtn = _resolveComponent$3("VBtn");
  const _component_VChip = _resolveComponent$3("VChip");
  const _component_VAlert = _resolveComponent$3("VAlert");

  return (_openBlock$4(), _createElementBlock$4("div", _hoisted_1$4, [
    _createElementVNode$3("div", _hoisted_2$4, [
      (_openBlock$4(true), _createElementBlock$4(_Fragment$2, null, _renderList$2(summaryItems.value, (item) => {
        return (_openBlock$4(), _createElementBlock$4("div", {
          key: item.label,
          class: "ptm-invite__stat"
        }, [
          _createVNode$3(_component_VIcon, {
            icon: item.icon,
            color: item.color,
            size: "18"
          }, null, 8, ["icon", "color"]),
          _createElementVNode$3("div", null, [
            _createElementVNode$3("span", null, _toDisplayString$3(item.label), 1),
            _createElementVNode$3("strong", {
              class: _normalizeClass$2(`text-${item.color}`)
            }, _toDisplayString$3(item.value), 3)
          ])
        ]))
      }), 128)),
      _createVNode$3(_component_VSpacer),
      _createVNode$3(_component_VBtn, {
        size: "small",
        variant: "tonal",
        color: "primary",
        "prepend-icon": "mdi-account-multiple-plus-outline",
        loading: __props.collecting,
        disabled: __props.collecting,
        onClick: _cache[0] || (_cache[0] = $event => (emit('collect')))
      }, {
        default: _withCtx$3(() => [
          _createTextVNode$3(_toDisplayString$3(__props.collecting ? '抓取中' : '采集后宫数据'), 1)
        ]),
        _: 1
      }, 8, ["loading", "disabled"])
    ]),
    (!inviteSites.value.length)
      ? (_openBlock$4(), _createElementBlock$4("div", _hoisted_3$4, [
          _createVNode$3(_component_VIcon, {
            icon: "mdi-account-multiple-outline",
            size: "42"
          }),
          _cache[2] || (_cache[2] = _createElementVNode$3("strong", null, "还没有后宫数据", -1)),
          _cache[3] || (_cache[3] = _createElementVNode$3("span", null, "点击「采集后宫数据」抓取各站邀请页的被邀者列表", -1))
        ]))
      : (_openBlock$4(), _createElementBlock$4("div", _hoisted_4$3, [
          _createElementVNode$3("aside", _hoisted_5$3, [
            _createElementVNode$3("div", _hoisted_6$3, [
              _createElementVNode$3("div", _hoisted_7$3, [
                (_openBlock$4(true), _createElementBlock$4(_Fragment$2, null, _renderList$2(filterChips.value, (chip) => {
                  return (_openBlock$4(), _createElementBlock$4("button", {
                    key: chip.key,
                    type: "button",
                    class: _normalizeClass$2(["ptm-invite__filter", { 'ptm-invite__filter--active': filter.value === chip.key }]),
                    onClick: $event => (filter.value = filter.value === chip.key ? 'all' : chip.key)
                  }, _toDisplayString$3(chip.label) + " " + _toDisplayString$3(chip.count), 11, _hoisted_8$3))
                }), 128))
              ])
            ]),
            _createElementVNode$3("div", _hoisted_9$2, [
              (_openBlock$4(true), _createElementBlock$4(_Fragment$2, null, _renderList$2(sortedSites.value, (site) => {
                return (_openBlock$4(), _createElementBlock$4("button", {
                  key: site.domain,
                  type: "button",
                  class: _normalizeClass$2(["ptm-invite__item", { 'ptm-invite__item--active': site.domain === selectedSite.value?.domain }]),
                  onClick: $event => (selectSite(site))
                }, [
                  _createVNode$3(_sfc_main$8, {
                    api: __props.api,
                    site: { name: site.site_name, domain: site.domain },
                    size: 32
                  }, null, 8, ["api", "site"]),
                  _createElementVNode$3("span", _hoisted_11$2, [
                    _createElementVNode$3("span", _hoisted_12$2, [
                      _createElementVNode$3("strong", null, _toDisplayString$3(site.site_name), 1),
                      _createElementVNode$3("span", {
                        class: _normalizeClass$2(["ptm-invite__quota", { 'ptm-invite__quota--has': Number(site.invites_available || 0) > 0 }])
                      }, " 名额 " + _toDisplayString$3(quotaText(site)), 3)
                    ]),
                    _createElementVNode$3("span", _hoisted_13$2, " 成员 " + _toDisplayString$3(_unref$1(formatInteger)(site.invitee_count || 0)) + " · " + _toDisplayString$3(riskText(site)), 1)
                  ])
                ], 10, _hoisted_10$2))
              }), 128)),
              (!sortedSites.value.length)
                ? (_openBlock$4(), _createElementBlock$4("div", _hoisted_14$2, [...(_cache[4] || (_cache[4] = [
                    _createElementVNode$3("span", null, "没有符合条件的站点", -1)
                  ]))]))
                : _createCommentVNode$4("", true)
            ])
          ]),
          (selectedSite.value)
            ? (_openBlock$4(), _createElementBlock$4("article", _hoisted_15$2, [
                _createElementVNode$3("header", _hoisted_16$2, [
                  _createElementVNode$3("div", _hoisted_17$2, [
                    _createVNode$3(_sfc_main$8, {
                      api: __props.api,
                      site: avatarSite.value,
                      size: 44
                    }, null, 8, ["api", "site"]),
                    _createElementVNode$3("div", null, [
                      _createElementVNode$3("h3", null, _toDisplayString$3(selectedSite.value.site_name), 1),
                      _createElementVNode$3("span", null, [
                        _cache[5] || (_cache[5] = _createTextVNode$3("成员 ", -1)),
                        _createElementVNode$3("strong", null, _toDisplayString$3(_unref$1(formatInteger)(selectedSite.value.invitee_count || 0)), 1)
                      ])
                    ])
                  ]),
                  _createElementVNode$3("div", _hoisted_18$2, [
                    _createElementVNode$3("div", {
                      class: _normalizeClass$2(["ptm-invite__counter", { 'ptm-invite__counter--hot': Number(selectedSite.value.invites_available || 0) > 0 }])
                    }, [
                      _cache[6] || (_cache[6] = _createElementVNode$3("span", null, "可用名额", -1)),
                      _createElementVNode$3("strong", null, _toDisplayString$3(quotaText(selectedSite.value)), 1)
                    ], 2),
                    _createElementVNode$3("div", _hoisted_19$2, [
                      _cache[7] || (_cache[7] = _createElementVNode$3("span", null, "已发邀请", -1)),
                      _createElementVNode$3("strong", null, _toDisplayString$3(selectedSite.value.invites_sent ?? '—'), 1)
                    ]),
                    _createElementVNode$3("div", _hoisted_20$2, [
                      _cache[8] || (_cache[8] = _createElementVNode$3("span", null, "风险成员", -1)),
                      _createElementVNode$3("strong", {
                        class: _normalizeClass$2(selectedSite.value.danger_count ? 'text-error' : '')
                      }, _toDisplayString$3(_unref$1(formatInteger)((selectedSite.value.danger_count || 0) + (selectedSite.value.warning_count || 0))), 3)
                    ])
                  ]),
                  _createElementVNode$3("div", _hoisted_21$2, [
                    (selectedSite.value.danger_count)
                      ? (_openBlock$4(), _createBlock$3(_component_VChip, {
                          key: 0,
                          color: "error",
                          size: "small",
                          variant: "tonal"
                        }, {
                          default: _withCtx$3(() => [
                            _createTextVNode$3(" 危险 " + _toDisplayString$3(selectedSite.value.danger_count), 1)
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode$4("", true),
                    (selectedSite.value.warning_count)
                      ? (_openBlock$4(), _createBlock$3(_component_VChip, {
                          key: 1,
                          color: "warning",
                          size: "small",
                          variant: "tonal"
                        }, {
                          default: _withCtx$3(() => [
                            _createTextVNode$3(" 较低 " + _toDisplayString$3(selectedSite.value.warning_count), 1)
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode$4("", true),
                    (selectedSite.value.collected_at)
                      ? (_openBlock$4(), _createElementBlock$4("span", _hoisted_22$1, " 采集 " + _toDisplayString$3(selectedSite.value.collected_at), 1))
                      : _createCommentVNode$4("", true)
                  ])
                ]),
                (!selectedSite.value.ok && selectedSite.value.error)
                  ? (_openBlock$4(), _createBlock$3(_component_VAlert, {
                      key: 0,
                      type: "warning",
                      variant: "tonal",
                      density: "compact",
                      class: "mb-3"
                    }, {
                      default: _withCtx$3(() => [
                        _createTextVNode$3(" 后宫数据采集失败：" + _toDisplayString$3(selectedSite.value.error), 1)
                      ]),
                      _: 1
                    }))
                  : _createCommentVNode$4("", true),
                (members.value.length)
                  ? (_openBlock$4(), _createElementBlock$4("div", _hoisted_23$1, [
                      _createElementVNode$3("div", _hoisted_24$1, [
                        _cache[9] || (_cache[9] = _createElementVNode$3("div", { class: "ptm-invite__row ptm-invite__row--head" }, [
                          _createElementVNode$3("span", null, "成员"),
                          _createElementVNode$3("span", null, "邮箱"),
                          _createElementVNode$3("span", null, "上传"),
                          _createElementVNode$3("span", null, "下载"),
                          _createElementVNode$3("span", null, "分享率"),
                          _createElementVNode$3("span", null, "做种"),
                          _createElementVNode$3("span", null, "最后汇报"),
                          _createElementVNode$3("span", null, "状态")
                        ], -1)),
                        (_openBlock$4(true), _createElementBlock$4(_Fragment$2, null, _renderList$2(members.value, (member) => {
                          return (_openBlock$4(), _createElementBlock$4("div", {
                            key: member.username + member.email,
                            class: "ptm-invite__row"
                          }, [
                            _createElementVNode$3("span", _hoisted_25$1, [
                              (member.profile_url)
                                ? (_openBlock$4(), _createElementBlock$4("a", {
                                    key: 0,
                                    href: member.profile_url,
                                    target: "_blank",
                                    rel: "noreferrer",
                                    onClick: _cache[1] || (_cache[1] = _withModifiers$1(() => {}, ["stop"]))
                                  }, _toDisplayString$3(member.username), 9, _hoisted_26$1))
                                : (_openBlock$4(), _createElementBlock$4(_Fragment$2, { key: 1 }, [
                                    _createTextVNode$3(_toDisplayString$3(member.username), 1)
                                  ], 64))
                            ]),
                            _createElementVNode$3("span", _hoisted_27$1, _toDisplayString$3(member.email || '—'), 1),
                            _createElementVNode$3("span", null, _toDisplayString$3(_unref$1(formatBytes)(member.uploaded)), 1),
                            _createElementVNode$3("span", null, _toDisplayString$3(_unref$1(formatBytes)(member.downloaded)), 1),
                            _createElementVNode$3("span", {
                              class: _normalizeClass$2(ratioTone(member))
                            }, _toDisplayString$3(ratioText(member)), 3),
                            _createElementVNode$3("span", null, _toDisplayString$3(_unref$1(formatInteger)(member.seeding_count || 0)), 1),
                            _createElementVNode$3("span", _hoisted_28$1, _toDisplayString$3(member.last_seen || '—'), 1),
                            _createElementVNode$3("span", {
                              class: _normalizeClass$2(member.disabled ? 'text-error' : 'ptm-invite__muted')
                            }, _toDisplayString$3(member.status || '—'), 3)
                          ]))
                        }), 128))
                      ])
                    ]))
                  : (_openBlock$4(), _createElementBlock$4("div", _hoisted_29$1, [
                      _createVNode$3(_component_VIcon, {
                        icon: "mdi-account-off-outline",
                        size: "30"
                      }),
                      _cache[10] || (_cache[10] = _createElementVNode$3("span", null, "该站点暂未被邀者", -1))
                    ]))
              ]))
            : (_openBlock$4(), _createElementBlock$4("article", _hoisted_30$1, [
                _createElementVNode$3("div", _hoisted_31$1, [
                  _createVNode$3(_component_VIcon, {
                    icon: "mdi-account-multiple-outline",
                    size: "36"
                  }),
                  _cache[11] || (_cache[11] = _createElementVNode$3("span", null, "请选择左侧站点", -1))
                ])
              ]))
        ]))
  ]))
}
}

};
const InvitePanel = /*#__PURE__*/_export_sfc(_sfc_main$4, [['__scopeId',"data-v-7c803cf2"]]);

const {createElementVNode:_createElementVNode$2,createTextVNode:_createTextVNode$2,resolveComponent:_resolveComponent$2,withCtx:_withCtx$2,createVNode:_createVNode$2,openBlock:_openBlock$3,createBlock:_createBlock$2,createCommentVNode:_createCommentVNode$3,toDisplayString:_toDisplayString$2,createElementBlock:_createElementBlock$3} = await importShared('vue');


const _hoisted_1$3 = { class: "ptm-settings" };
const _hoisted_2$3 = { class: "ptm-settings__grid" };
const _hoisted_3$3 = { class: "ptm-settings__col" };
const _hoisted_4$2 = { class: "ptm-settings__pair" };
const _hoisted_5$2 = { class: "d-flex flex-wrap ga-3" };
const _hoisted_6$2 = { class: "ptm-settings__rules" };
const _hoisted_7$2 = { class: "text-caption text-medium-emphasis" };
const _hoisted_8$2 = { class: "ptm-settings__actions" };

const {computed: computed$3,onMounted: onMounted$1,ref: ref$2,watch: watch$2} = await importShared('vue');

const SELECT_ALL = '__all__';

/** 下拉选项：首项为全选，其后是各站点。 */

const _sfc_main$3 = {
  __name: 'SettingsForm',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  initialSettings: { type: Object, default: () => ({}) },
  hostManagedConfig: { type: Boolean, default: false },
},
  emits: ['save', 'saved', 'close', 'switch', 'message'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const pluginBase = computed$3(() => `plugin/${props.pluginId}`);
const form = ref$2({});
const siteOptions = ref$2([]);
const saving = ref$2(false);

const defaults = {
  enabled: false,
  collect_enabled: false,
  collect_mode: 'custom',
  collect_cron: '0 7 * * *',
  collect_timeout: 25,
  collect_concurrency: 4,
  trend_days: 30,
  collect_domains: [],
  notify_enabled: false,
  notify_cron: '0 9 * * *',
  refresh_before_collect: true,
  site_order: [],
  overview_view: 'table',
  wealthy_retirement_sites: [],
  custom_retirement_rules: [],
};

/** 用给定设置重置表单。 */
function reset(source) {
  form.value = { ...defaults, ...(source || {}) };
  form.value.collect_domains = [...(form.value.collect_domains || [])];
  form.value.wealthy_retirement_sites = [...(form.value.wealthy_retirement_sites || [])];
  form.value.custom_retirement_rules = [...(form.value.custom_retirement_rules || [])];
}

/** 读取站点选项，供采集范围选择使用。 */
async function loadOptions() {
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/settings`, { feedback: 'silent' }));
    if (data?.site_options) siteOptions.value = data.site_options;
    if (!props.hostManagedConfig && data?.settings) reset(data.settings);
  } catch (error) {
    emit('message', { text: `读取设置失败：${error.message}`, color: 'error' });
  }
}

/** 保存设置：宿主管理配置时交由宿主保存，否则调用插件 API。 */
async function submit() {
  saving.value = true;
  try {
    const payload = { ...form.value };
    if (props.hostManagedConfig) {
      emit('save', payload);
      emit('message', { text: '设置已提交', color: 'success' });
      return
    }
    const data = unwrapResponse(await props.api.post(`${pluginBase.value}/settings`, payload));
    if (data?.settings) reset(data.settings);
    emit('saved', payload);
    emit('message', { text: '设置已保存', color: 'success' });
  } catch (error) {
    emit('message', { text: `保存失败：${error.message}`, color: 'error' });
  } finally {
    saving.value = false;
  }
}

watch$2(() => props.initialSettings, value => reset(value), { deep: true });
onMounted$1(async () => {
  reset(props.initialSettings);
  await loadOptions();
});

const siteItems = computed$3(() =>
  siteOptions.value.map(item => ({
    title: `${item.name || item.domain}${item.has_cookie ? '' : '（无 Cookie）'}`,
    value: item.domain,
    props: { disabled: !item.has_cookie },
  })),
);

/** 可按站点 ID、域名或站点名标记富贵养老，供用户直接勾选。 */
const wealthySiteItems = computed$3(() =>
  siteOptions.value.map(item => ({
    title: `${item.name || item.domain}（${item.domain}）`,
    value: String(item.domain || item.name || ''),
  })),
);

const wealthyRuleCount = computed$3(() => (form.value.custom_retirement_rules || []).length);

// 「全选」在下拉列表中的哨兵值，避免与真实域名冲突
const collectScopeItems = computed$3(() => [
  { title: '全选', value: SELECT_ALL },
  ...siteItems.value,
]);

/**
 * 采集范围的双向绑定代理。
 *
 * 站点列表为空在配置语义里表示「全部站点」，对应下拉中的「全选」。
 * 勾/取消全选时清空站点列表；单独挑选站点时自动去掉全选标记。
 */
const collectScope = computed$3({
  get: () => {
    const domains = form.value.collect_domains || [];
    return domains.length ? [...domains] : [SELECT_ALL]
  },
  set: values => {
    const list = Array.isArray(values) ? values : [];
    const picked = list.filter(item => item !== SELECT_ALL);
    // 勾了全选，或把站点全部取消，都归为「全部站点」
    form.value.collect_domains = list.includes(SELECT_ALL) ? [] : picked;
  },
});

/** 抓取时机选项。 */
const collectModeItems = [
  { title: '自定义（按下方 Cron 计划）', value: 'custom' },
  { title: '跟随 MoviePilot 站点数据刷新', value: 'follow_mp' },
];

/** 总览视图选项。 */
const overviewViewItems = [
  { title: '表格', value: 'table' },
  { title: '卡片', value: 'cards' },
];

return (_ctx, _cache) => {
  const _component_VCardText = _resolveComponent$2("VCardText");
  const _component_VCard = _resolveComponent$2("VCard");
  const _component_VCardTitle = _resolveComponent$2("VCardTitle");
  const _component_VSwitch = _resolveComponent$2("VSwitch");
  const _component_VTextField = _resolveComponent$2("VTextField");
  const _component_VSelect = _resolveComponent$2("VSelect");
  const _component_VAlert = _resolveComponent$2("VAlert");
  const _component_VBtn = _resolveComponent$2("VBtn");

  return (_openBlock$3(), _createElementBlock$3("div", _hoisted_1$3, [
    _createVNode$2(_component_VCard, {
      class: "ptm-settings__intro",
      rounded: "lg",
      variant: "tonal",
      color: "primary"
    }, {
      default: _withCtx$2(() => [
        _createVNode$2(_component_VCardText, { class: "text-body-2" }, {
          default: _withCtx$2(() => [...(_cache[14] || (_cache[14] = [
            _createTextVNode$2(" 基础数据（上传、下载、分享率、魔力、做种等）来自 MoviePilot 已采集的站点数据，无需额外配置。 深度采集会使用站点 Cookie 访问 ", -1),
            _createElementVNode$2("code", null, "userdetails.php", -1),
            _createTextVNode$2("，补齐 UID、邀请人、邀请名额、H&R、 认领、做种积分、时魔等字段。 ", -1)
          ]))]),
          _: 1
        })
      ]),
      _: 1
    }),
    _createElementVNode$2("div", _hoisted_2$3, [
      _createElementVNode$2("div", _hoisted_3$3, [
        _createVNode$2(_component_VCard, {
          rounded: "lg",
          variant: "outlined"
        }, {
          default: _withCtx$2(() => [
            _createVNode$2(_component_VCardTitle, { class: "text-subtitle-1" }, {
              default: _withCtx$2(() => [...(_cache[15] || (_cache[15] = [
                _createTextVNode$2("运行设置", -1)
              ]))]),
              _: 1
            }),
            _createVNode$2(_component_VCardText, { class: "d-flex flex-column ga-3" }, {
              default: _withCtx$2(() => [
                _createVNode$2(_component_VSwitch, {
                  modelValue: form.value.enabled,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((form.value.enabled) = $event)),
                  color: "primary",
                  label: "启用插件",
                  "hide-details": ""
                }, null, 8, ["modelValue"]),
                _createElementVNode$2("div", _hoisted_4$2, [
                  _createVNode$2(_component_VTextField, {
                    modelValue: form.value.trend_days,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.value.trend_days) = $event)),
                    modelModifiers: { number: true },
                    type: "number",
                    min: "7",
                    max: "365",
                    label: "趋势展示天数",
                    hint: "详情页趋势图展示的历史天数",
                    "persistent-hint": ""
                  }, null, 8, ["modelValue"]),
                  _createVNode$2(_component_VSelect, {
                    modelValue: form.value.overview_view,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((form.value.overview_view) = $event)),
                    items: overviewViewItems,
                    label: "总览视图",
                    hint: "总览页站点的呈现方式",
                    "persistent-hint": ""
                  }, null, 8, ["modelValue"])
                ])
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        _createVNode$2(_component_VCard, {
          rounded: "lg",
          variant: "outlined"
        }, {
          default: _withCtx$2(() => [
            _createVNode$2(_component_VCardTitle, { class: "text-subtitle-1" }, {
              default: _withCtx$2(() => [...(_cache[16] || (_cache[16] = [
                _createTextVNode$2("采集站点范围", -1)
              ]))]),
              _: 1
            }),
            _createVNode$2(_component_VCardText, null, {
              default: _withCtx$2(() => [
                _createVNode$2(_component_VSelect, {
                  modelValue: collectScope.value,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((collectScope).value = $event)),
                  items: collectScopeItems.value,
                  "hide-details": "",
                  multiple: "",
                  chips: "",
                  "closable-chips": "",
                  "menu-props": { maxHeight: 420 }
                }, null, 8, ["modelValue", "items"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      _createVNode$2(_component_VCard, {
        rounded: "lg",
        variant: "outlined"
      }, {
        default: _withCtx$2(() => [
          _createVNode$2(_component_VCardTitle, { class: "text-subtitle-1" }, {
            default: _withCtx$2(() => [...(_cache[17] || (_cache[17] = [
              _createTextVNode$2("站点页面深度采集", -1)
            ]))]),
            _: 1
          }),
          _createVNode$2(_component_VCardText, { class: "d-flex flex-column ga-3" }, {
            default: _withCtx$2(() => [
              _createVNode$2(_component_VSwitch, {
                modelValue: form.value.collect_enabled,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.value.collect_enabled) = $event)),
                color: "primary",
                label: "启用定时采集",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              _createVNode$2(_component_VSelect, {
                modelValue: form.value.collect_mode,
                "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.value.collect_mode) = $event)),
                items: collectModeItems,
                label: "抓取时机",
                hint: "跟随 MP 会按 MoviePilot 的站点数据刷新间隔自动同频采集",
                "persistent-hint": "",
                disabled: !form.value.collect_enabled
              }, null, 8, ["modelValue", "disabled"]),
              (form.value.collect_mode === 'custom')
                ? (_openBlock$3(), _createBlock$2(_component_VTextField, {
                    key: 0,
                    modelValue: form.value.collect_cron,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.value.collect_cron) = $event)),
                    label: "采集计划（五段式 Cron）",
                    hint: "例如 0 7 * * * 表示每天 07:00 采集一次",
                    "persistent-hint": "",
                    disabled: !form.value.collect_enabled
                  }, null, 8, ["modelValue", "disabled"]))
                : (_openBlock$3(), _createBlock$2(_component_VAlert, {
                    key: 1,
                    type: "info",
                    variant: "tonal",
                    density: "compact"
                  }, {
                    default: _withCtx$2(() => [...(_cache[18] || (_cache[18] = [
                      _createTextVNode$2(" 跟随 MoviePilot：宿主每次刷新站点数据后，同步抓取 UID、邀请、H&R 等页面扩展字段。 ", -1)
                    ]))]),
                    _: 1
                  })),
              _createElementVNode$2("div", _hoisted_5$2, [
                _createVNode$2(_component_VTextField, {
                  modelValue: form.value.collect_timeout,
                  "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((form.value.collect_timeout) = $event)),
                  modelModifiers: { number: true },
                  type: "number",
                  min: "5",
                  max: "120",
                  label: "单站超时（秒）",
                  class: "ptm-settings__number"
                }, null, 8, ["modelValue"]),
                _createVNode$2(_component_VTextField, {
                  modelValue: form.value.collect_concurrency,
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((form.value.collect_concurrency) = $event)),
                  modelModifiers: { number: true },
                  type: "number",
                  min: "1",
                  max: "8",
                  label: "采集并发数",
                  class: "ptm-settings__number"
                }, null, 8, ["modelValue"])
              ]),
              _createVNode$2(_component_VSwitch, {
                modelValue: form.value.notify_enabled,
                "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((form.value.notify_enabled) = $event)),
                color: "primary",
                label: "按计划发送采集结果通知",
                "hide-details": ""
              }, null, 8, ["modelValue"]),
              (form.value.notify_enabled)
                ? (_openBlock$3(), _createBlock$2(_component_VTextField, {
                    key: 2,
                    modelValue: form.value.notify_cron,
                    "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((form.value.notify_cron) = $event)),
                    label: "通知计划（五段式 Cron）",
                    hint: "默认 0 9 * * * 表示每天 09:00 发送一次，与采集频率无关",
                    "persistent-hint": ""
                  }, null, 8, ["modelValue"]))
                : _createCommentVNode$3("", true),
              _createVNode$2(_component_VSwitch, {
                modelValue: form.value.refresh_before_collect,
                "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((form.value.refresh_before_collect) = $event)),
                color: "primary",
                label: "采集前刷新 MoviePilot 站点数据",
                hint: "开启后先让 MoviePilot 重新抓取上传/下载/魔力等基础数据，数值最新但整体耗时较长；关闭则只抓扩展字段，速度快",
                "persistent-hint": ""
              }, null, 8, ["modelValue"])
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      _createVNode$2(_component_VCard, {
        rounded: "lg",
        variant: "outlined"
      }, {
        default: _withCtx$2(() => [
          _createVNode$2(_component_VCardTitle, { class: "text-subtitle-1" }, {
            default: _withCtx$2(() => [...(_cache[19] || (_cache[19] = [
              _createTextVNode$2("养老进度", -1)
            ]))]),
            _: 1
          }),
          _createVNode$2(_component_VCardText, { class: "d-flex flex-column ga-3" }, {
            default: _withCtx$2(() => [
              _createVNode$2(_component_VSelect, {
                modelValue: form.value.wealthy_retirement_sites,
                "onUpdate:modelValue": _cache[12] || (_cache[12] = $event => ((form.value.wealthy_retirement_sites) = $event)),
                items: wealthySiteItems.value,
                label: "富贵养老站点",
                hint: "手动标记已达成富贵养老的站点（无需等级门槛），按域名或站点名匹配",
                "persistent-hint": "",
                multiple: "",
                chips: "",
                "closable-chips": ""
              }, null, 8, ["modelValue", "items"]),
              _createElementVNode$2("div", _hoisted_6$2, [
                _createElementVNode$2("span", _hoisted_7$2, " 自定义等级规则 " + _toDisplayString$2(wealthyRuleCount.value) + " 条（用于修正站点等级门槛） ", 1)
              ])
            ]),
            _: 1
          })
        ]),
        _: 1
      })
    ]),
    _createElementVNode$2("div", _hoisted_8$2, [
      _createVNode$2(_component_VBtn, {
        color: "primary",
        loading: saving.value,
        "prepend-icon": "mdi-content-save",
        onClick: submit
      }, {
        default: _withCtx$2(() => [...(_cache[20] || (_cache[20] = [
          _createTextVNode$2("保存设置", -1)
        ]))]),
        _: 1
      }, 8, ["loading"]),
      (_ctx.$attrs.showClose)
        ? (_openBlock$3(), _createBlock$2(_component_VBtn, {
            key: 0,
            variant: "text",
            "prepend-icon": "mdi-close",
            onClick: _cache[13] || (_cache[13] = $event => (emit('close')))
          }, {
            default: _withCtx$2(() => [...(_cache[21] || (_cache[21] = [
              _createTextVNode$2("关闭", -1)
            ]))]),
            _: 1
          }))
        : _createCommentVNode$3("", true)
    ])
  ]))
}
}

};
const SettingsForm = /*#__PURE__*/_export_sfc(_sfc_main$3, [['__scopeId',"data-v-ad3193ca"]]);

const {openBlock:_openBlock$2,createElementBlock:_createElementBlock$2,createCommentVNode:_createCommentVNode$2} = await importShared('vue');


const _hoisted_1$2 = ["viewBox", "width", "height"];
const _hoisted_2$2 = ["points", "fill"];
const _hoisted_3$2 = ["points", "stroke"];

const {computed: computed$2} = await importShared('vue');



const _sfc_main$2 = {
  __name: 'Sparkline',
  props: {
  points: { type: Array, default: () => [] },
  color: { type: String, default: 'rgb(var(--v-theme-primary))' },
  height: { type: Number, default: 46 },
  width: { type: Number, default: 160 },
},
  setup(__props) {

const props = __props;

/** 计算折线的 SVG 坐标点。 */
const geometry = computed$2(() => {
  const values = (props.points || []).map(value => Number(value) || 0);
  if (values.length < 2) return { line: '', area: '' }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const stepX = props.width / (values.length - 1);
  const coordinates = values.map((value, index) => {
    const x = index * stepX;
    const y = props.height - 3 - ((value - min) / span) * (props.height - 8);
    return [x, y]
  });
  const line = coordinates.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${props.height} ${line} ${props.width},${props.height}`;
  return { line, area }
});

return (_ctx, _cache) => {
  return (_openBlock$2(), _createElementBlock$2("svg", {
    class: "ptm-sparkline",
    viewBox: `0 0 ${__props.width} ${__props.height}`,
    width: __props.width,
    height: __props.height,
    preserveAspectRatio: "none",
    role: "img",
    "aria-label": "趋势图"
  }, [
    (geometry.value.area)
      ? (_openBlock$2(), _createElementBlock$2("polygon", {
          key: 0,
          points: geometry.value.area,
          fill: __props.color,
          opacity: "0.16"
        }, null, 8, _hoisted_2$2))
      : _createCommentVNode$2("", true),
    (geometry.value.line)
      ? (_openBlock$2(), _createElementBlock$2("polyline", {
          key: 1,
          points: geometry.value.line,
          fill: "none",
          stroke: __props.color,
          "stroke-width": "2",
          "stroke-linejoin": "round",
          "stroke-linecap": "round"
        }, null, 8, _hoisted_3$2))
      : _createCommentVNode$2("", true)
  ], 8, _hoisted_1$2))
}
}

};
const Sparkline = /*#__PURE__*/_export_sfc(_sfc_main$2, [['__scopeId',"data-v-8e3677cf"]]);

const {createVNode:_createVNode$1,toDisplayString:_toDisplayString$1,createTextVNode:_createTextVNode$1,resolveComponent:_resolveComponent$1,withCtx:_withCtx$1,openBlock:_openBlock$1,createBlock:_createBlock$1,createCommentVNode:_createCommentVNode$1,createElementVNode:_createElementVNode$1,renderList:_renderList$1,Fragment:_Fragment$1,createElementBlock:_createElementBlock$1,normalizeClass:_normalizeClass$1} = await importShared('vue');


const _hoisted_1$1 = { class: "ptm-detail__head" };
const _hoisted_2$1 = { class: "ptm-detail__title" };
const _hoisted_3$1 = { class: "ptm-detail__name" };
const _hoisted_4$1 = ["href"];
const _hoisted_5$1 = { class: "ptm-detail__hero" };
const _hoisted_6$1 = { class: "ptm-hero__label" };
const _hoisted_7$1 = { class: "ptm-hero__value" };
const _hoisted_8$1 = {
  key: 0,
  class: "ptm-hero__hint"
};
const _hoisted_9$1 = { class: "ptm-detail__chips" };
const _hoisted_10$1 = { class: "ptm-tiles" };
const _hoisted_11$1 = { class: "ptm-tile__label" };
const _hoisted_12$1 = { class: "ptm-tile__value" };
const _hoisted_13$1 = { class: "ptm-tiles" };
const _hoisted_14$1 = { class: "ptm-tile__label" };
const _hoisted_15$1 = { class: "ptm-tile__value" };
const _hoisted_16$1 = {
  key: 0,
  class: "ptm-tile__raw"
};
const _hoisted_17$1 = { class: "ptm-section" };
const _hoisted_18$1 = {
  key: 3,
  class: "ptm-trend"
};
const _hoisted_19$1 = { class: "ptm-trend__label" };
const _hoisted_20$1 = {
  key: 4,
  class: "text-caption text-medium-emphasis"
};
const _hoisted_21$1 = { class: "ptm-detail__raw" };

const {computed: computed$1,ref: ref$1,watch: watch$1} = await importShared('vue');


const _sfc_main$1 = {
  __name: 'SiteDetailDialog',
  props: {
  modelValue: { type: Boolean, default: false },
  site: { type: Object, default: null },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  // 该站点是否正在采集，用于按钮显示加载态
  collecting: { type: Boolean, default: false },
},
  emits: ['update:modelValue', 'collect', 'message'],
  setup(__props, { emit: __emit }) {

/**
 * 单站点详情弹窗。
 *
 * 结构：头部（站点标识 + 操作）→ 核心流量大数（含趋势）→ 指标网格 →
 * 账号信息（紧凑标签）→ 站点页面扩展字段 → 原始字段。
 * 每类指标使用主题色强调，避免此前一片灰底白字、层级不清的问题。
 */
const props = __props;

const emit = __emit;

const pluginBase = computed$1(() => `plugin/${props.pluginId}`);
const trend = ref$1([]);
const loading = ref$1(false);
const showRaw = ref$1(false);

const extended = computed$1(() => props.site?.extended || null);

/** 时魔展示文本：与总览表格同口径，并标注数据来源。 */
const hourlyText = computed$1(() => {
  const site = props.site || {};
  if (site.hourly_bonus === null || site.hourly_bonus === undefined) return '—'
  const source =
    site.hourly_bonus_source === 'page'
      ? '站点页面'
      : site.hourly_bonus_source === 'estimate'
        ? '快照估算'
        : site.hourly_bonus_source === 'daily'
          ? '日均推算'
          : '';
  return `${formatNumber(site.hourly_bonus)}${source ? `（${source}）` : ''}`
});

/** 缺失值统一占位。 */
function value(value, formatter) {
  if (value === null || value === undefined || value === '') return '—'
  return formatter ? formatter(value) : String(value)
}

/** 头部站点摘要标签。 */
const accountChips = computed$1(() => {
  const site = props.site || {};
  const items = [
    { icon: 'mdi-account-outline', text: site.username || '未采集用户名' },
    { icon: 'mdi-identifier', text: site.uid ? `UID ${site.uid}` : 'UID 未知' },
    { icon: 'mdi-calendar-check-outline', text: site.join_at ? `加入 ${shortDate(site.join_at)}` : '加入日期未知' },
  ];
  if (site.career_days !== null && site.career_days !== undefined) {
    items.push({ icon: 'mdi-timer-outline', text: `在册 ${site.career_days} 天` });
  }
  items.push({ icon: 'mdi-bell-outline', text: `未读 ${formatInteger(site.message_unread || 0)}` });
  items.push({ icon: 'mdi-sort-numeric-ascending', text: `优先级 ${value(site.site_priority)}` });
  items.push({ icon: 'mdi-clock-outline', text: `数据 ${shortTime(site.updated_at)}` });
  return items
});

/** 核心流量大数，附趋势曲线。 */
const heroTiles = computed$1(() => {
  const site = props.site || {};
  return [
    {
      label: '上传量',
      value: formatBytes(site.upload),
      color: 'success',
      points: trendStats.value.upload,
      hint: site.daily_upload ? `日均 ${formatBytes(site.daily_upload)}` : '',
    },
    {
      label: '下载量',
      value: formatBytes(site.download),
      color: 'info',
      points: trendStats.value.download,
      hint: site.daily_download ? `日均 ${formatBytes(site.daily_download)}` : '',
    },
    {
      label: '分享率',
      value: formatRatio(site.ratio),
      color: site.ratio === null || site.ratio === undefined ? 'grey' : site.ratio >= 1 ? 'success' : 'error',
      points: [],
      hint: '按站点上传/下载计算',
    },
  ]
});

/** 其余指标网格。 */
const metricTiles = computed$1(() => {
  const site = props.site || {};
  const data = extended.value || {};
  return [
    { label: '做种数', value: formatInteger(site.seeding), icon: 'mdi-seed-outline', color: 'primary' },
    { label: '做种体积', value: formatBytes(site.seeding_size), icon: 'mdi-harddisk', color: 'teal' },
    { label: '下载中', value: formatInteger(site.leeching), icon: 'mdi-download-network-outline', color: 'info' },
    { label: '下载中体积', value: formatBytes(site.leeching_size), icon: 'mdi-swap-vertical', color: 'info' },
    { label: '魔力值', value: value(site.bonus, formatNumber), icon: 'mdi-coin', color: 'amber-darken-2' },
    {
      // 日均魔力 = 时魔 × 24，与上方「时魔」保持同一口径
      label: '日均魔力',
      value: site.daily_bonus ? formatNumber(site.daily_bonus) : '—',
      icon: 'mdi-chart-timeline-variant',
      color: 'amber-darken-1',
    },
    { label: '时魔', value: hourlyText.value, icon: 'mdi-timer-sand', color: 'deep-purple' },
    { label: '页面做种 / 下载中', value: `${value(data.seeding_now, formatInteger)} / ${value(data.leeching_now, formatInteger)}`, icon: 'mdi-access-point', color: 'indigo' },
  ]
});

/** 站点页面扩展字段，按类型分组展示。 */
const extendedTiles = computed$1(() => {
  const data = extended.value;
  if (!data) return []
  const inviteText = (() => {
    const parts = [];
    if (data.invites_available !== null && data.invites_available !== undefined) parts.push(`可用 ${data.invites_available}`);
    if (data.invites_sent !== null && data.invites_sent !== undefined) parts.push(`已发 ${data.invites_sent}`);
    if (!parts.length && data.invite_raw) parts.push(data.invite_raw);
    return parts.join(' · ') || '—'
  })();
  const hr = data.hr === null || data.hr === undefined ? '—' : formatInteger(data.hr);
  return [
    {
      label: 'H&R 未完成',
      value: hr,
      color: Number(data.hr) > 0 ? 'error' : 'success',
      raw: data.hr_raw || '',
    },
    { label: '邀请名额', value: inviteText, color: 'primary', raw: '' },
    { label: '邀请人', value: data.inviter || '—', color: 'cyan-darken-2', raw: '' },
    {
      label: '认领',
      value:
        data.claims_used === null || data.claims_used === undefined
          ? '—'
          : data.claims_total
            ? `${data.claims_used} / ${data.claims_total}`
            : formatInteger(data.claims_used),
      color: 'brown',
      raw: '',
    },
    {
      label: '做种积分',
      value: value(data.seeding_points, formatNumber),
      color: 'indigo',
      raw: '',
    },
    { label: '页面魔力值', value: value(data.bonus, formatNumber), color: 'amber-darken-2', raw: '' },
    { label: '做种时间', value: data.seeding_time || '—', color: 'teal', raw: '' },
    { label: '下载时间', value: data.leeching_time || '—', color: 'info', raw: '' },
    { label: '做种/下载时间比', value: value(data.time_ratio, item => formatNumber(item, 3)), color: 'deep-purple', raw: '' },
    { label: 'BT 客户端', value: data.client || '—', color: 'blue-grey', raw: '' },
    { label: '采集时间', value: shortTime(data.collected_at), color: 'blue-grey', raw: '' },
  ]
});

/** 趋势序列。 */
const trendStats = computed$1(() => {
  const items = trend.value || [];
  const pick = key => items.map(item => Number(item[key]) || 0);
  return {
    upload: pick('upload'),
    download: pick('download'),
    bonus: pick('bonus'),
    seedingSize: pick('seeding_size'),
  }
});

/** 趋势图分组。 */
const trendGroups = computed$1(() => [
  { label: '上传', color: 'rgb(var(--v-theme-success))', points: trendStats.value.upload },
  { label: '下载', color: 'rgb(var(--v-theme-info))', points: trendStats.value.download },
  { label: '魔力', color: 'rgb(var(--v-theme-warning))', points: trendStats.value.bonus },
  { label: '做种体积', color: 'rgb(var(--v-theme-primary))', points: trendStats.value.seedingSize },
]);

/** 拉取当前站点的历史趋势。 */
async function loadTrend() {
  if (!props.site?.domain) return
  loading.value = true;
  try {
    const data = unwrapResponse(
      await props.api.get(withQuery(`${pluginBase.value}/site`, { domain: props.site.domain }), {
        feedback: 'silent',
      }),
    );
    trend.value = data?.trend || [];
  } catch (error) {
    trend.value = [];
    emit('message', { text: `读取趋势失败：${error.message}`, color: 'warning' });
  } finally {
    loading.value = false;
  }
}

watch$1(
  () => [props.modelValue, props.site?.domain],
  ([open]) => {
    if (open) {
      showRaw.value = false;
      loadTrend();
    }
  },
  { immediate: true },
);

/** 关闭对话框。 */
function close() {
  emit('update:modelValue', false);
}

return (_ctx, _cache) => {
  const _component_VChip = _resolveComponent$1("VChip");
  const _component_VIcon = _resolveComponent$1("VIcon");
  const _component_VBtn = _resolveComponent$1("VBtn");
  const _component_VDivider = _resolveComponent$1("VDivider");
  const _component_VAlert = _resolveComponent$1("VAlert");
  const _component_VExpansionPanelTitle = _resolveComponent$1("VExpansionPanelTitle");
  const _component_VExpansionPanelText = _resolveComponent$1("VExpansionPanelText");
  const _component_VExpansionPanel = _resolveComponent$1("VExpansionPanel");
  const _component_VExpansionPanels = _resolveComponent$1("VExpansionPanels");
  const _component_VCardText = _resolveComponent$1("VCardText");
  const _component_VCard = _resolveComponent$1("VCard");
  const _component_VDialog = _resolveComponent$1("VDialog");

  return (_openBlock$1(), _createBlock$1(_component_VDialog, {
    "model-value": __props.modelValue,
    "max-width": "940",
    scrollable: "",
    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => (emit('update:modelValue', $event)))
  }, {
    default: _withCtx$1(() => [
      (__props.site)
        ? (_openBlock$1(), _createBlock$1(_component_VCard, {
            key: 0,
            class: "ptm-detail",
            rounded: "lg"
          }, {
            default: _withCtx$1(() => [
              _createElementVNode$1("div", _hoisted_1$1, [
                _createVNode$1(_sfc_main$8, {
                  api: __props.api,
                  site: __props.site,
                  size: 42
                }, null, 8, ["api", "site"]),
                _createElementVNode$1("div", _hoisted_2$1, [
                  _createElementVNode$1("div", _hoisted_3$1, [
                    _createTextVNode$1(_toDisplayString$1(__props.site.name) + " ", 1),
                    (__props.site.user_level)
                      ? (_openBlock$1(), _createBlock$1(_component_VChip, {
                          key: 0,
                          size: "x-small",
                          variant: "tonal",
                          color: "primary",
                          class: "ml-2"
                        }, {
                          default: _withCtx$1(() => [
                            _createTextVNode$1(_toDisplayString$1(__props.site.user_level), 1)
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode$1("", true),
                    (!__props.site.is_active)
                      ? (_openBlock$1(), _createBlock$1(_component_VChip, {
                          key: 1,
                          size: "x-small",
                          variant: "tonal",
                          color: "grey",
                          class: "ml-1"
                        }, {
                          default: _withCtx$1(() => [...(_cache[3] || (_cache[3] = [
                            _createTextVNode$1(" 未启用 ", -1)
                          ]))]),
                          _: 1
                        }))
                      : _createCommentVNode$1("", true)
                  ]),
                  _createElementVNode$1("a", {
                    class: "ptm-detail__link",
                    href: __props.site.url,
                    target: "_blank",
                    rel: "noreferrer"
                  }, [
                    _createTextVNode$1(_toDisplayString$1(__props.site.domain) + " ", 1),
                    _createVNode$1(_component_VIcon, {
                      icon: "mdi-open-in-new",
                      size: "12"
                    })
                  ], 8, _hoisted_4$1)
                ]),
                _createVNode$1(_component_VBtn, {
                  "prepend-icon": __props.collecting ? 'mdi-loading mdi-spin' : 'mdi-database-sync-outline',
                  disabled: __props.collecting,
                  variant: __props.collecting ? 'tonal' : 'text',
                  color: __props.collecting ? 'primary' : undefined,
                  size: "small",
                  class: "ptm-detail__collect",
                  title: __props.collecting ? '正在抓取该站点数据…' : '重新采集该站点数据（抓取站点页面后刷新趋势）',
                  onClick: _cache[0] || (_cache[0] = $event => (emit('collect', __props.site.domain)))
                }, {
                  default: _withCtx$1(() => [
                    _createTextVNode$1(_toDisplayString$1(__props.collecting ? '抓取中' : '采集'), 1)
                  ]),
                  _: 1
                }, 8, ["prepend-icon", "disabled", "variant", "color", "title"]),
                _createVNode$1(_component_VBtn, {
                  icon: "mdi-close",
                  variant: "text",
                  size: "small",
                  onClick: close
                })
              ]),
              _createVNode$1(_component_VDivider),
              _createVNode$1(_component_VCardText, { class: "ptm-detail__body" }, {
                default: _withCtx$1(() => [
                  (__props.site.err_msg)
                    ? (_openBlock$1(), _createBlock$1(_component_VAlert, {
                        key: 0,
                        type: "warning",
                        variant: "tonal",
                        density: "compact",
                        class: "mb-3"
                      }, {
                        default: _withCtx$1(() => [
                          _createTextVNode$1(" MoviePilot 最近一次采集异常：" + _toDisplayString$1(__props.site.err_msg), 1)
                        ]),
                        _: 1
                      }))
                    : (extended.value && !extended.value.ok)
                      ? (_openBlock$1(), _createBlock$1(_component_VAlert, {
                          key: 1,
                          type: "info",
                          variant: "tonal",
                          density: "compact",
                          class: "mb-3"
                        }, {
                          default: _withCtx$1(() => [
                            _createTextVNode$1(" 站点页面扩展字段尚未采集成功：" + _toDisplayString$1(extended.value.error || '尚未采集'), 1)
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode$1("", true),
                  _createElementVNode$1("div", _hoisted_5$1, [
                    (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(heroTiles.value, (tile) => {
                      return (_openBlock$1(), _createElementBlock$1("div", {
                        key: tile.label,
                        class: _normalizeClass$1(["ptm-hero", `ptm-hero--${tile.color}`])
                      }, [
                        _createElementVNode$1("div", _hoisted_6$1, _toDisplayString$1(tile.label), 1),
                        _createElementVNode$1("div", _hoisted_7$1, _toDisplayString$1(tile.value), 1),
                        (tile.hint)
                          ? (_openBlock$1(), _createElementBlock$1("div", _hoisted_8$1, _toDisplayString$1(tile.hint), 1))
                          : _createCommentVNode$1("", true),
                        (tile.points && tile.points.length)
                          ? (_openBlock$1(), _createBlock$1(Sparkline, {
                              key: 1,
                              points: tile.points,
                              color: `rgb(var(--v-theme-${tile.color}))`
                            }, null, 8, ["points", "color"]))
                          : _createCommentVNode$1("", true)
                      ], 2))
                    }), 128))
                  ]),
                  _createElementVNode$1("div", _hoisted_9$1, [
                    (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(accountChips.value, (chip) => {
                      return (_openBlock$1(), _createElementBlock$1("span", {
                        key: chip.text,
                        class: "ptm-chip"
                      }, [
                        _createVNode$1(_component_VIcon, {
                          icon: chip.icon,
                          size: "13"
                        }, null, 8, ["icon"]),
                        _createTextVNode$1(" " + _toDisplayString$1(chip.text), 1)
                      ]))
                    }), 128))
                  ]),
                  _cache[6] || (_cache[6] = _createElementVNode$1("div", { class: "ptm-section" }, [
                    _createElementVNode$1("span", { class: "ptm-section__dot" }),
                    _createTextVNode$1(" 指标 ")
                  ], -1)),
                  _createElementVNode$1("div", _hoisted_10$1, [
                    (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(metricTiles.value, (tile) => {
                      return (_openBlock$1(), _createElementBlock$1("div", {
                        key: tile.label,
                        class: "ptm-tile"
                      }, [
                        _createVNode$1(_component_VIcon, {
                          icon: tile.icon,
                          size: "15",
                          color: tile.color
                        }, null, 8, ["icon", "color"]),
                        _createElementVNode$1("span", _hoisted_11$1, _toDisplayString$1(tile.label), 1),
                        _createElementVNode$1("span", _hoisted_12$1, _toDisplayString$1(tile.value), 1)
                      ]))
                    }), 128))
                  ]),
                  (extendedTiles.value.length)
                    ? (_openBlock$1(), _createElementBlock$1(_Fragment$1, { key: 2 }, [
                        _cache[4] || (_cache[4] = _createElementVNode$1("div", { class: "ptm-section" }, [
                          _createElementVNode$1("span", { class: "ptm-section__dot ptm-section__dot--accent" }),
                          _createTextVNode$1(" 站点页面扩展 "),
                          _createElementVNode$1("span", { class: "ptm-section__hint" }, "来自 userdetails.php 深度采集")
                        ], -1)),
                        _createElementVNode$1("div", _hoisted_13$1, [
                          (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(extendedTiles.value, (tile) => {
                            return (_openBlock$1(), _createElementBlock$1("div", {
                              key: tile.label,
                              class: _normalizeClass$1(["ptm-tile", `ptm-tile--${tile.color}`])
                            }, [
                              _createElementVNode$1("span", _hoisted_14$1, _toDisplayString$1(tile.label), 1),
                              _createElementVNode$1("span", _hoisted_15$1, _toDisplayString$1(tile.value), 1),
                              (tile.raw)
                                ? (_openBlock$1(), _createElementBlock$1("span", _hoisted_16$1, _toDisplayString$1(tile.raw), 1))
                                : _createCommentVNode$1("", true)
                            ], 2))
                          }), 128))
                        ])
                      ], 64))
                    : _createCommentVNode$1("", true),
                  _createElementVNode$1("div", _hoisted_17$1, [
                    _cache[5] || (_cache[5] = _createElementVNode$1("span", { class: "ptm-section__dot" }, null, -1)),
                    _createTextVNode$1(" 历史趋势（" + _toDisplayString$1(trend.value.length) + " 天） ", 1)
                  ]),
                  (trend.value.length)
                    ? (_openBlock$1(), _createElementBlock$1("div", _hoisted_18$1, [
                        (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(trendGroups.value, (group) => {
                          return (_openBlock$1(), _createElementBlock$1("div", {
                            key: group.label,
                            class: "ptm-trend__item"
                          }, [
                            _createElementVNode$1("div", _hoisted_19$1, _toDisplayString$1(group.label), 1),
                            _createVNode$1(Sparkline, {
                              points: group.points,
                              color: group.color
                            }, null, 8, ["points", "color"])
                          ]))
                        }), 128))
                      ]))
                    : (_openBlock$1(), _createElementBlock$1("div", _hoisted_20$1, "暂无历史数据")),
                  (extended.value?.raw?.length)
                    ? (_openBlock$1(), _createBlock$1(_component_VExpansionPanels, {
                        key: 5,
                        modelValue: showRaw.value,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((showRaw).value = $event)),
                        variant: "accordion",
                        class: "mt-4"
                      }, {
                        default: _withCtx$1(() => [
                          _createVNode$1(_component_VExpansionPanel, null, {
                            default: _withCtx$1(() => [
                              _createVNode$1(_component_VExpansionPanelTitle, { class: "text-body-2" }, {
                                default: _withCtx$1(() => [
                                  _createTextVNode$1(" 页面原始字段（" + _toDisplayString$1(extended.value.raw.length) + "） ", 1)
                                ]),
                                _: 1
                              }),
                              _createVNode$1(_component_VExpansionPanelText, null, {
                                default: _withCtx$1(() => [
                                  _createElementVNode$1("div", _hoisted_21$1, [
                                    (_openBlock$1(true), _createElementBlock$1(_Fragment$1, null, _renderList$1(extended.value.raw, (item) => {
                                      return (_openBlock$1(), _createElementBlock$1("div", { key: item }, _toDisplayString$1(item), 1))
                                    }), 128))
                                  ])
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["modelValue"]))
                    : _createCommentVNode$1("", true)
                ]),
                _: 1
              })
            ]),
            _: 1
          }))
        : _createCommentVNode$1("", true)
    ]),
    _: 1
  }, 8, ["model-value"]))
}
}

};
const SiteDetailDialog = /*#__PURE__*/_export_sfc(_sfc_main$1, [['__scopeId',"data-v-d0c7e14b"]]);

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,createElementVNode:_createElementVNode,unref:_unref,toDisplayString:_toDisplayString,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass,mergeProps:_mergeProps,withModifiers:_withModifiers,normalizeStyle:_normalizeStyle} = await importShared('vue');


const _hoisted_1 = { class: "ptm-tabbar" };
const _hoisted_2 = { class: "ptm-overview" };
const _hoisted_3 = { class: "ptm-toolbar" };
const _hoisted_4 = { class: "ptm-toolbar__info" };
const _hoisted_5 = { class: "ptm-toolbar__actions" };
const _hoisted_6 = { class: "ptm-summary" };
const _hoisted_7 = { class: "ptm-attention" };
const _hoisted_8 = { class: "ptm-attention__text" };
const _hoisted_9 = { class: "ptm-attention__value" };
const _hoisted_10 = { class: "ptm-attention__hint" };
const _hoisted_11 = { class: "ptm-attention__more" };
const _hoisted_12 = { class: "ptm-attention__text" };
const _hoisted_13 = { class: "ptm-attention__value" };
const _hoisted_14 = { class: "ptm-attention__hint" };
const _hoisted_15 = { class: "ptm-attention__more" };
const _hoisted_16 = { class: "ptm-filters" };
const _hoisted_17 = { class: "ptm-sortcard__head" };
const _hoisted_18 = { class: "ptm-sortcard__grid" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = { class: "ptm-colcard__rows" };
const _hoisted_21 = { class: "ptm-colcard__moves" };
const _hoisted_22 = ["disabled", "onClick"];
const _hoisted_23 = ["disabled", "onClick"];
const _hoisted_24 = { class: "ptm-site-card__head" };
const _hoisted_25 = ["onPointerdown"];
const _hoisted_26 = { class: "ptm-site-card__title" };
const _hoisted_27 = { class: "ptm-site-card__name" };
const _hoisted_28 = { class: "font-weight-medium" };
const _hoisted_29 = ["title"];
const _hoisted_30 = { class: "text-caption text-medium-emphasis" };
const _hoisted_31 = { class: "ptm-site-card__grid" };
const _hoisted_32 = { class: "ptm-site-card__label" };
const _hoisted_33 = {
  key: 1,
  class: "ptm-table"
};
const _hoisted_34 = ["onClick"];
const _hoisted_35 = ["onClick"];
const _hoisted_36 = { class: "ptm-row__site" };
const _hoisted_37 = ["onPointerdown"];
const _hoisted_38 = { class: "ptm-row__name" };
const _hoisted_39 = { class: "ptm-row__domain" };
const _hoisted_40 = ["title"];
const _hoisted_41 = ["title"];
const _hoisted_42 = {
  key: 0,
  class: "ptm-hourly__tag"
};
const _hoisted_43 = ["title"];

const {computed,onBeforeUnmount,onMounted,ref,watch} = await importShared('vue');

const {useDisplay} = await importShared('vuetify');


const _sfc_main = {
  __name: 'PTManagerWorkbench',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  navKey: { type: String, default: 'main' },
  initialSettings: { type: Object, default: () => ({}) },
  hostManagedConfig: { type: Boolean, default: false },
  initialTab: { type: String, default: 'overview' },
  compact: { type: Boolean, default: false },
  showClose: { type: Boolean, default: false },
},
  emits: ['action', 'close', 'save', 'switch'],
  setup(__props, { expose: __expose, emit: __emit }) {

const props = __props;

const emit = __emit;

const display = useDisplay();
const pluginBase = computed(() => `plugin/${props.pluginId}`);

const loading = ref(false);
const collecting = ref(false);
// 正在采集的单个站点域名，用于按钮显示加载态
const collectingDomain = ref('');
const summary = ref({});
const sites = ref([]);
const retirement = ref({});
const twelve = ref({ joined: 0, total: 12, percent: 0, items: [] });
// 后宫（邀请）数据与采集状态
const invite = ref({ sites: [] });
const inviteCollecting = ref(false);
const generatedAt = ref('');
const mpDataAt = ref('');
const extendedAt = ref('');
const tab = ref(props.initialTab === 'config' ? 'config' : 'overview');
const keyword = ref('');
const filter = ref('all');
const sortKey = ref('seeding_size');
const sortDesc = ref(true);
const customOrder = ref([]);
const detailOpen = ref(false);
const activeSite = ref(null);
const attentionOpen = ref(false);
const attentionTab = ref('hr');
const snackbar = ref({ show: false, text: '', color: 'success' });
const bodyRef = ref(null);
const dragFrom = ref(-1);
const dragTo = ref(-1);
const dragging = ref(false);
let pollTimer = null;
// 采集进度（阶段 + 已完成/总数），用于把「采集中」变成可观测的进度
const collectProgress = ref({ phase: '', done: 0, total: 0 });

/** 采集进度的展示文案。 */
const collectProgressText = computed(() => {
  const info = collectProgress.value;
  if (!info.phase) return '采集中'
  const phase = info.phase === 'refresh' ? '刷新账号数据' : '抓取页面';
  if (!info.total) return `采集中 · ${phase}`
  return `采集中 · ${phase} ${info.done}/${info.total}`
});

/** 展示一次性提示。 */
function notify(text, color = 'success') {
  snackbar.value = { show: true, text, color };
}

const allColumns = [
  { key: 'inviter', title: '邀请人', min: 96 },
  { key: 'upload', title: '上传', min: 90, numeric: true, strong: true },
  { key: 'download', title: '下载', min: 90, numeric: true, strong: true },
  { key: 'ratio', title: '分享率', min: 78, numeric: true },
  { key: 'seeding_size', title: '做种体积', min: 92, numeric: true, strong: true },
  { key: 'seeding', title: '做种数', min: 68, numeric: true },
  { key: 'bonus', title: '魔力', min: 92, numeric: true },
  { key: 'hourly', title: '时魔', min: 88, numeric: true },
  { key: 'seeding_points', title: '做种积分', min: 92, numeric: true },
  { key: 'invites', title: '邀请', min: 84 },
  { key: 'hr', title: 'H&R', min: 64, numeric: true },
  { key: 'claims', title: '认领', min: 88 },
  { key: 'leeching', title: '下载中', min: 72, numeric: true },
  { key: 'join_at', title: '加入', min: 92 },
  { key: 'updated_at', title: '数据时间', min: 88 },
];
const visibleColumns = ref([
  'inviter',
  'upload',
  'download',
  'ratio',
  'seeding_size',
  'seeding',
  'bonus',
  'hourly',
  'updated_at',
]);

/** 用户自定义的列顺序（列 key 数组），空表示使用默认顺序。 */
const customColumnOrder = ref([]);

/** 按自定义顺序重排后的列定义。 */
const orderedAllColumns = computed(() => {
  const order = customColumnOrder.value;
  if (!order.length) return allColumns
  const byKey = new Map(allColumns.map(column => [column.key, column]));
  const ordered = order.map(key => byKey.get(key)).filter(Boolean);
  // 追加尚未纳入顺序的新列，保证升级后新增列不会消失
  const rest = allColumns.filter(column => !order.includes(column.key));
  return [...ordered, ...rest]
});

const activeColumns = computed(() =>
  orderedAllColumns.value.filter(column => visibleColumns.value.includes(column.key)),
);

// 可见列变化时自动保存（首次加载不算用户操作）。
const columnsReady = ref(false);
watch(
  visibleColumns,
  () => {
    if (columnsReady.value) saveViewState();
  },
  { deep: true },
);

/**
 * 卡片视图展示的字段：完全跟随「列」菜单的选择。
 * 勾选多少就显示多少，按 3 列自动往下换行扩展。
 */
const cardColumns = computed(() => activeColumns.value);

const gridTemplate = computed(
  () =>
    `minmax(220px, 1.5fr) ${activeColumns.value
      .map(column => `minmax(${column.min}px, 1fr)`)
      .join(' ')}`,
);

/**
 * 表格最小总宽：站点列下限 + 各列下限 + 列间距。
 *
 * grid 的 fr 单位在空间不足时会把列压到下限以下导致内容被切，
 * 因此显式给出行宽，让外层横向滚动能滚到最后一列。
 */
const tableMinWidth = computed(() => {
  // 站点列下限与 gridTemplate 保持一致，保证失败标签不会被挤掉
  const siteMin = 220;
  const columnsMin = activeColumns.value.reduce((sum, column) => sum + (column.min || 80), 0);
  const gaps = (activeColumns.value.length + 1) * 8;
  return siteMin + columnsMin + gaps
});

const tableStyle = computed(() => ({ minWidth: `${tableMinWidth.value}px` }));

// 只有真正的窄屏才切换卡片；插件详情页（compact）也保留表格，
// 因为表格才能横向对比各站点的上传/下载/分享率等数据。
// 视图模式由插件设置决定（优先用接口读到的值，其次 props）；
// 极窄屏（<760px）强制卡片，保证手机上也能正常阅读。
const overviewViewMode = ref(props.initialSettings?.overview_view === 'cards' ? 'cards' : 'table');

const overviewView = computed(() => overviewViewMode.value);

const isCardView = computed(() => {
  if (overviewView.value === 'cards') return true
  return display.width.value ? display.width.value < 760 : display.smAndDown.value
});

/** 可选的排序字段，覆盖各站点的关键指标。 */
const sortFields = [
  { key: 'custom', title: '自定义顺序' },
  { key: 'name', title: '站点名' },
  { key: 'inviter', title: '邀请人' },
  { key: 'upload', title: '上传量' },
  { key: 'download', title: '下载量' },
  { key: 'ratio', title: '分享率' },
  { key: 'seeding_size', title: '做种体积' },
  { key: 'seeding', title: '做种数' },
  { key: 'bonus', title: '魔力' },
  { key: 'hourly', title: '时魔' },
  { key: 'seeding_points', title: '做种积分' },
  { key: 'invites', title: '邀请名额' },
  { key: 'hr', title: 'H&R' },
  { key: 'claims', title: '认领' },
  { key: 'leeching', title: '下载中' },
  { key: 'join_at', title: '加入日期' },
  { key: 'updated_at', title: '数据时间' },
];
const sortLabel = computed(
  () => sortFields.find(field => field.key === sortKey.value)?.title || '排序',
);

/** 读取总览数据。 */
async function load(silent = false) {
  if (!silent) loading.value = true;
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/overview`, { feedback: 'silent' }));
    summary.value = data?.summary || {};
    sites.value = data?.sites || [];
    retirement.value = data?.retirement || {};
    twelve.value = data?.twelve || { joined: 0, total: 12, percent: 0, items: [] };
    invite.value = data?.invite || { sites: [] };
    generatedAt.value = data?.generated_at || '';
    mpDataAt.value = data?.mp_data_at || '';
    extendedAt.value = data?.extended_at || '';
    collecting.value = Boolean(data?.collecting);
    // 打开页面时若采集已在跑，直接接上进度轮询，避免只显示静态「采集中」
    if (collecting.value && !pollTimer) startPolling();
  } catch (error) {
    notify(`读取站点数据失败：${error.message}`, 'error');
  } finally {
    loading.value = false;
  }
}

/** 读取插件设置里的自定义顺序（总览页需要据此排序）。 */
async function loadOrder() {
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/settings`, { feedback: 'silent' }));
    const order = data?.settings?.site_order;
    if (Array.isArray(order)) customOrder.value = order;
    // 总览视图模式以插件设置为准；插件详情页不会传 initialSettings，
    // 所以必须在这里读取，否则选项改了也不生效。
    const view = data?.settings?.overview_view;
    if (view === 'cards' || view === 'table') overviewViewMode.value = view;
    // 列顺序同样以插件设置为准
    const columnOrder = data?.settings?.column_order;
    if (Array.isArray(columnOrder) && columnOrder.length) customColumnOrder.value = columnOrder;
    // 排序与可见列也按已保存状态恢复
    const saved = data?.settings || {};
    if (saved.sort_key) sortKey.value = saved.sort_key;
    if (typeof saved.sort_desc === 'boolean') sortDesc.value = saved.sort_desc;
    if (Array.isArray(saved.visible_columns) && saved.visible_columns.length) {
      visibleColumns.value = saved.visible_columns;
    }
  } catch {
    // 设置读取失败不影响总览展示
  }
}

/** 生成站点表格某列的展示文本。 */
function cellText(site, key) {
  const data = site.extended || {};
  switch (key) {
    case 'upload':
      return formatBytes(site.upload)
    case 'download':
      return formatBytes(site.download)
    case 'ratio':
      return formatRatio(site.ratio)
    case 'seeding_size':
      return formatBytes(site.seeding_size)
    case 'seeding':
      return formatInteger(site.seeding)
    case 'leeching':
      return formatInteger(site.leeching)
    case 'bonus':
      return site.bonus === null || site.bonus === undefined ? '—' : formatNumber(site.bonus)
    case 'hourly':
      return site.hourly_bonus === null || site.hourly_bonus === undefined
        ? '—'
        : formatNumber(site.hourly_bonus)
    case 'seeding_points':
      return data.seeding_points === null || data.seeding_points === undefined
        ? '—'
        : formatNumber(data.seeding_points)
    case 'invites': {
      if (data.invites_available === null || data.invites_available === undefined) {
        return data.invite_raw ? data.invite_raw.slice(0, 6) : '—'
      }
      return data.invites_sent ? `${data.invites_available} / ${data.invites_sent}` : String(data.invites_available)
    }
    case 'hr':
      return data.hr === null || data.hr === undefined ? '—' : formatInteger(data.hr)
    case 'claims':
      if (data.claims_used === null || data.claims_used === undefined) return '—'
      return data.claims_total ? `${data.claims_used}/${data.claims_total}` : formatInteger(data.claims_used)
    case 'join_at':
      return shortDate(site.join_at)
    case 'updated_at':
      return shortTime(site.updated_at)
    case 'inviter':
      // 站点未提供邀请人时统一显示「官方」，便于识别直邀/开放注册账号。
      return String(data.inviter || '').trim() || '官方'
    default:
      return site[key] || '—'
  }
}

/**
 * 采集失败的简短标注（站点名后面那个小标签）。
 *
 * 只保留几个字，避免撑破列宽；完整原因放在悬停提示里。
 */
function failureLabel(site) {
  const detail = failureDetail(site);
  if (!detail) return ''
  const status = detail.match(/HTTP\s*(\d{3})/i);
  if (status) {
    // 常见状态码给出更直观的说法，其余只显示码
    const map = {
      '401': '未授权',
      '403': '无权限',
      '404': '未找到',
      '429': '请求过多',
      '500': '服务异常',
      '502': '网关错误',
      '503': '维护中',
      '504': '网关超时',
    };
    return map[status[1]] || `HTTP ${status[1]}`
  }
  if (/未解析到|需要重新登录|登录/.test(detail)) return '需登录'
  if (/超时|timeout|Timeout/i.test(detail)) return '超时'
  if (/请求失败/.test(detail)) return '连接失败'
  if (/未配置 Cookie|未配置Cookie/i.test(detail)) return '无Cookie'
  if (/缺少用户 UID|缺少UID/i.test(detail)) return '无UID'
  return '采集失败'
}

/** 采集失败的完整原因（悬停提示用），优先站点页面采集的错误。 */
function failureDetail(site) {
  const extended = site.extended || {};
  if (extended.ok === false && extended.error) return String(extended.error)
  // 已成功采集的站点即使 MP 快照报错，也不按失败展示
  if (extended.ok === true) return ''
  return String(site.err_msg || '')
}

/** 时魔数据来源说明，用于悬停提示。 */
function hourlySourceText(site) {
  switch (site?.hourly_bonus_source) {
    case 'page':
      return '站点页面给出的真实时魔'
    case 'estimate':
      return '按 MoviePilot 相邻两次快照的魔力增量估算'
    case 'daily':
      return '按历史日均魔力推算（快照差值不可用时）'
    default:
      return '暂无时魔数据'
  }
}

/** 排序取值，数字列使用数值、其它列使用文本。 */
function sortValue(site, key) {
  const data = site.extended || {};
  switch (key) {
    case 'inviter':
      // 「官方」在排序时按空串处理，让有邀请人的排在前面。
      return String(data.inviter || '')
    case 'hourly':
      return Number(site.hourly_bonus) || 0
    case 'seeding_points':
      return Number(data.seeding_points) || 0
    case 'hr':
      return Number(data.hr) || 0
    case 'claims':
      return Number(data.claims_used) || 0
    case 'invites':
      return Number(data.invites_available) || 0
    case 'join_at':
      return String(site.join_at || '')
    case 'updated_at':
      return String(site.updated_at || '')
    case 'user_level':
      return String(site.user_level || '')
    case 'name':
      return String(site.name || '')
    default:
      return Number(site[key]) || 0
  }
}

/** 过滤 + 排序后的站点列表。 */
const orderedSites = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  let items = sites.value;
  // 「数据异常」同时覆盖 MP 快照错误与站点页面采集失败
  if (filter.value === 'error') items = items.filter(site => Boolean(failureDetail(site)));
  else if (filter.value === 'no_extended') items = items.filter(site => !site.extended?.ok);
  else if (filter.value === 'inactive') items = items.filter(site => !site.is_active);
  else if (filter.value === 'hr') items = items.filter(site => Number(site.extended?.hr) > 0);
  else if (filter.value === 'claims') items = items.filter(site => Number(site.extended?.claims_used) > 0);
  else if (filter.value === 'invite') items = items.filter(site => Number(site.extended?.invites_available) > 0);
  if (text) {
    items = items.filter(
      site =>
        String(site.name || '').toLowerCase().includes(text)
        || String(site.domain || '').toLowerCase().includes(text)
        || String(site.username || '').toLowerCase().includes(text)
        || String(site.uid || '').toLowerCase().includes(text),
    );
  }
  const sorted = [...items];
  if (sortKey.value === 'custom') {
    const index = new Map(customOrder.value.map((domain, position) => [domain, position]));
    sorted.sort((left, right) => {
      const a = index.has(left.domain) ? index.get(left.domain) : Number.MAX_SAFE_INTEGER;
      const b = index.has(right.domain) ? index.get(right.domain) : Number.MAX_SAFE_INTEGER;
      if (a === b) return String(left.name || '').localeCompare(String(right.name || ''))
      return a - b
    });
    return sorted
  }
  sorted.sort((left, right) => {
    const a = sortValue(left, sortKey.value);
    const b = sortValue(right, sortKey.value);
    if (a === b) return String(left.name || '').localeCompare(String(right.name || ''))
    return (a > b ? 1 : -1) * (sortDesc.value ? -1 : 1)
  });
  return sorted
});

/** 顶部合计：只保留上传、下载、做种数与做种体积。 */
const summaryCards = computed(() => {
  const data = summary.value || {};
  const count = Number(data.site_count) || 0;
  return [
    {
      label: '上传合计',
      value: formatBytes(data.upload),
      hint: `综合分享率 ${formatRatio(data.ratio)}（按全部站点流量加权）`,
      icon: 'mdi-upload',
      color: 'success',
    },
    {
      label: '下载合计',
      value: formatBytes(data.download),
      hint: data.leeching ? `下载中 ${formatInteger(data.leeching)} 个` : '当前没有下载中的任务',
      icon: 'mdi-download',
      color: 'info',
    },
    {
      label: '做种数',
      value: formatInteger(data.seeding),
      hint: `来自 ${formatInteger(count)} 个站点`,
      icon: 'mdi-seed-outline',
      color: 'primary',
    },
    {
      label: '做种体积合计',
      value: formatBytes(data.seeding_size),
      hint: count ? `平均 ${formatBytes(Math.round((Number(data.seeding_size) || 0) / count))} / 站` : '',
      icon: 'mdi-harddisk',
      color: 'teal',
    },
  ]
});

/** H&R 与邀请的关注入口数据。 */
const attention = computed(() => {
  const items = sites.value || [];
  const hrSites = items.filter(site => Number(site.extended?.hr) > 0);
  const hrTotal = items.reduce((sum, site) => sum + (Number(site.extended?.hr) || 0), 0);
  const available = items.reduce((sum, site) => sum + (Number(site.extended?.invites_available) || 0), 0);
  const sent = items.reduce((sum, site) => sum + (Number(site.extended?.invites_sent) || 0), 0);
  const inviteSites = items.filter(
    site =>
      Number(site.extended?.invites_available) > 0 || Number(site.extended?.invites_sent) > 0,
  );
  const known = items.filter(site => site.extended?.hr !== null && site.extended?.hr !== undefined).length;
  return {
    hrTotal,
    hrCount: hrSites.length,
    known,
    available,
    sent,
    inviteCount: inviteSites.length,
  }
});

/** 切换排序字段。 */
function toggleSort(key) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value;
    saveViewState();
    return
  }
  sortKey.value = key;
  sortDesc.value = true;
  saveViewState();
}

/** 选择排序字段（菜单里点击）。 */
function chooseSort(key) {
  if (key === 'custom') {
    sortKey.value = 'custom';
    saveViewState();
    notify('已切换为自定义顺序，可拖拽左侧手柄调整', 'info');
    return
  }
  toggleSort(key);
}

/**
 * 保存总览视图状态（排序字段、方向、可见列、列顺序）。
 *
 * 防抖合并连续操作，避免连点箭头时打出多次请求。
 */
let viewSaveTimer = null;
function saveViewState() {
  window.clearTimeout(viewSaveTimer);
  viewSaveTimer = window.setTimeout(async () => {
    try {
      await props.api.post(`${pluginBase.value}/view`, {
        sort_key: sortKey.value,
        sort_desc: sortDesc.value,
        visible_columns: [...visibleColumns.value],
        column_order: [...customColumnOrder.value],
      });
    } catch {
      // 保存失败不影响当前浏览，下次操作会再次尝试
    }
  }, 350);
}

/** 打开站点详情。 */
function openDetail(site) {
  activeSite.value = site;
  detailOpen.value = true;
}

/** 打开 H&R / 邀请明细。 */
function openAttention(which) {
  attentionTab.value = which;
  attentionOpen.value = true;
}

/** 从明细弹窗跳转到站点详情。 */
function openSiteFromAttention(site) {
  attentionOpen.value = false;
  openDetail(site);
}

/** 拖拽手柄按下：只有鼠标才接管，触摸保留原生滚动。 */
function onHandleDown(event, index) {
  if (event.pointerType === 'touch') return
  event.preventDefault();
  event.stopPropagation();
  dragFrom.value = index;
  dragTo.value = index;
  dragging.value = true;
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

/** 拖拽中：按指针位置确定目标行。 */
function onPointerMove(event) {
  if (!dragging.value || !bodyRef.value) return
  // 表格与卡片两种视图共用同一套拖拽逻辑，按实际渲染的元素取行。
  const rows = Array.from(bodyRef.value.querySelectorAll('.ptm-row, .ptm-site-card'));
  let target = dragTo.value;
  rows.forEach((row, index) => {
    const rect = row.getBoundingClientRect();
    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      target = index;
    }
  });
  if (target !== dragTo.value) dragTo.value = target;
}

/** 拖拽结束：落位并保存自定义顺序。 */
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  window.removeEventListener('pointercancel', onPointerUp);
  const from = dragFrom.value;
  const to = dragTo.value;
  dragging.value = false;
  dragFrom.value = -1;
  dragTo.value = -1;
  if (from >= 0 && to >= 0 && from !== to) applyReorder(from, to);
}

/** 把当前展示顺序落为自定义顺序并持久化。 */
function applyReorder(from, to) {
  const visible = orderedSites.value.map(site => site.domain);
  if (from >= visible.length || to >= visible.length) return
  const moved = visible.splice(from, 1)[0];
  visible.splice(to, 0, moved);
  const rest = sites.value.map(site => site.domain).filter(domain => !visible.includes(domain));
  const next = [...visible, ...rest];
  customOrder.value = next;
  sortKey.value = 'custom';
  persistOrder(next);
}

/** 保存自定义顺序到插件配置。 */
async function persistOrder(order) {
  try {
    const data = unwrapResponse(await props.api.post(`${pluginBase.value}/order`, { order }));
    if (Array.isArray(data?.order)) customOrder.value = data.order;
    notify(data?.message || '自定义顺序已保存', 'success');
  } catch (error) {
    notify(`保存自定义顺序失败：${error.message}`, 'error');
  }
}

/** 上移/下移列，并持久化列顺序。 */
async function moveColumn(index, delta) {
  const keys = orderedAllColumns.value.map(column => column.key);
  const target = index + delta;
  if (target < 0 || target >= keys.length) return
  const next = [...keys];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  customColumnOrder.value = next;
  saveViewState();
}

/** 触发采集：指定域名时同步采集，否则后台全量采集。 */
async function collect(domain) {
  if (domain) collectingDomain.value = domain;
  try {
    const path = domain
      ? withQuery(`${pluginBase.value}/collect`, { domain })
      : `${pluginBase.value}/collect`;
    const data = unwrapResponse(await props.api.post(path, {}));
    if (domain) {
      notify(data?.message || '采集完成', data?.ok ? 'success' : 'warning');
      await load(true);
      if (activeSite.value) {
        activeSite.value = sites.value.find(item => item.domain === activeSite.value.domain) || activeSite.value;
      }
      return
    }
    notify(data?.message || '已开始后台采集', 'info');
    collecting.value = true;
    startPolling();
  } catch (error) {
    notify(`采集失败：${error.message}`, 'error');
  } finally {
    if (domain) collectingDomain.value = '';
  }
}

/** 轮询采集状态，完成后刷新数据。 */
async function pollStatus() {
  try {
    const status = unwrapResponse(
      await props.api.get(`${pluginBase.value}/collect/status`, { feedback: 'silent' }),
    );
    if (status?.running) {
      collectProgress.value = {
        phase: status?.phase || '',
        done: Number(status?.done || 0),
        total: Number(status?.total || 0),
      };
      collecting.value = true;
    }
    if (!status?.running) {
      stopPolling();
      collecting.value = false;
      collectProgress.value = { phase: '', done: 0, total: 0 };
      notify(
        `采集完成：成功 ${status?.ok_count || 0} 个，失败 ${status?.fail_count || 0} 个`,
        (status?.fail_count || 0) > 0 ? 'warning' : 'success',
      );
      await load(true);
    }
  } catch {
    stopPolling();
    collecting.value = false;
  }
}

/** 启动采集状态轮询。 */
function startPolling() {
  stopPolling();
  // 先立即取一次，避免按钮先显示没有数字的「采集中」再跳变
  pollStatus();
  pollTimer = window.setInterval(pollStatus, 4000);
}

/** 停止采集状态轮询。 */
function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
}

/** 保存设置（宿主管理配置时由宿主接管）。 */
function handleSave(payload) {
  emit('save', payload);
}

/**
 * 判断到底由谁滚动。
 *
 * MoviePilot 不同端（桌面 / 手机网页 / 侧栏页）给插件的容器高度不一样：
 * - 宿主限高时，可用高度小于内容高度 → 插件自己开滚动；
 * - 宿主不限高时，内容自然撑开、整页滚动；此时不能再套一层滚动容器，
 *   否则滚轮会被空容器吞掉，表现为「页面划不动」。
 */
const rootRef = ref(null);
const innerScroll = ref(false);

function syncScrollMode() {
  const el = rootRef.value;
  if (!el) return
  innerScroll.value = false;
  window.requestAnimationFrame(() => {
    const node = rootRef.value;
    if (!node) return
    // 根节点自身被压缩到比内容矮，说明宿主限高 → 启用内部滚动
    const clipped = node.scrollHeight > node.clientHeight + 2;
    innerScroll.value = clipped;
  });
}

/** 设置保存后刷新数据，并重新读取视图模式等展示类设置。 */
async function onSettingsSaved() {
  await Promise.all([load(true), loadOrder()]);
}

/** 采集后宫（邀请）数据：抓取各站邀请页的被邀者列表。 */
async function collectInvite() {
  if (inviteCollecting.value) return
  inviteCollecting.value = true;
  try {
    const data = unwrapResponse(
      await props.api.post(`${pluginBase.value}/invite/collect`, {}),
    );
    notify(data?.message || '后宫数据采集完成', data?.ok ? 'success' : 'warning');
    await load(true);
  } catch (error) {
    notify(`后宫采集失败：${error.message}`, 'error');
  } finally {
    inviteCollecting.value = false;
  }
}

/**
 * 按窗口在页面中的真实位置计算可用高度。
 *
 * 用 100vh 估算会在插件页（有宿主头部/侧栏）里算得过高，导致窗口底部超出
 * 可视区、内容被裁掉且滚不到。这里直接测量窗口顶部到视口底部的距离。
 */


onMounted(async () => {
  await Promise.all([load(), loadOrder()]);
  // 首次加载完成后再开启自动保存，避免把默认值覆盖掉已保存的设置
  columnsReady.value = true;
  syncScrollMode();
  window.addEventListener('resize', syncScrollMode);
});
onBeforeUnmount(() => {
  stopPolling();
  window.removeEventListener('resize', syncScrollMode);
});

__expose({ load, collect });

return (_ctx, _cache) => {
  const _component_VTab = _resolveComponent("VTab");
  const _component_VTabs = _resolveComponent("VTabs");
  const _component_VBtn = _resolveComponent("VBtn");
  const _component_VProgressCircular = _resolveComponent("VProgressCircular");
  const _component_VChip = _resolveComponent("VChip");
  const _component_VIcon = _resolveComponent("VIcon");
  const _component_VTextField = _resolveComponent("VTextField");
  const _component_VChipGroup = _resolveComponent("VChipGroup");
  const _component_VBtnGroup = _resolveComponent("VBtnGroup");
  const _component_VCardText = _resolveComponent("VCardText");
  const _component_VCard = _resolveComponent("VCard");
  const _component_VMenu = _resolveComponent("VMenu");
  const _component_VCheckbox = _resolveComponent("VCheckbox");
  const _component_VWindowItem = _resolveComponent("VWindowItem");
  const _component_VWindow = _resolveComponent("VWindow");
  const _component_VSnackbar = _resolveComponent("VSnackbar");

  return (_openBlock(), _createElementBlock("div", {
    ref_key: "rootRef",
    ref: rootRef,
    class: _normalizeClass(["ptm-root", { 'ptm-root--compact': __props.compact, 'ptm-root--inner-scroll': innerScroll.value }])
  }, [
    _createElementVNode("div", _hoisted_1, [
      _createVNode(_component_VTabs, {
        modelValue: tab.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((tab).value = $event)),
        density: "comfortable",
        color: "primary",
        class: "ptm-tabs"
      }, {
        default: _withCtx(() => [
          _createVNode(_component_VTab, {
            value: "overview",
            "prepend-icon": "mdi-view-dashboard-variant-outline"
          }, {
            default: _withCtx(() => [...(_cache[19] || (_cache[19] = [
              _createTextVNode("总览", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_VTab, {
            value: "retirement",
            "prepend-icon": "mdi-shield-sun-outline"
          }, {
            default: _withCtx(() => [...(_cache[20] || (_cache[20] = [
              _createTextVNode("养老进度", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_VTab, {
            value: "invite",
            "prepend-icon": "mdi-account-multiple-outline"
          }, {
            default: _withCtx(() => [...(_cache[21] || (_cache[21] = [
              _createTextVNode("后宫", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_VTab, {
            value: "config",
            "prepend-icon": "mdi-cog-outline"
          }, {
            default: _withCtx(() => [...(_cache[22] || (_cache[22] = [
              _createTextVNode("设置", -1)
            ]))]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      (__props.showClose)
        ? (_openBlock(), _createBlock(_component_VBtn, {
            key: 0,
            class: "ptm-tabbar__close",
            icon: "mdi-close",
            size: "small",
            variant: "text",
            onClick: _cache[1] || (_cache[1] = $event => (emit('close')))
          }))
        : _createCommentVNode("", true)
    ]),
    _createVNode(_component_VWindow, {
      modelValue: tab.value,
      "onUpdate:modelValue": _cache[14] || (_cache[14] = $event => ((tab).value = $event)),
      class: "ptm-window"
    }, {
      default: _withCtx(() => [
        _createVNode(_component_VWindowItem, { value: "overview" }, {
          default: _withCtx(() => [
            _createElementVNode("div", _hoisted_2, [
              _createElementVNode("div", _hoisted_3, [
                _createElementVNode("div", _hoisted_4, [
                  _createElementVNode("span", null, "站点数据 " + _toDisplayString(_unref(shortTime)(mpDataAt.value) || '—'), 1),
                  _cache[23] || (_cache[23] = _createElementVNode("span", { class: "ptm-dot" }, null, -1)),
                  _createElementVNode("span", null, "扩展采集 " + _toDisplayString(_unref(shortTime)(extendedAt.value) || '未采集'), 1),
                  _cache[24] || (_cache[24] = _createElementVNode("span", { class: "ptm-dot" }, null, -1)),
                  _createElementVNode("span", null, "页面生成 " + _toDisplayString(_unref(shortTime)(generatedAt.value) || '—'), 1)
                ]),
                _createElementVNode("div", _hoisted_5, [
                  (collecting.value)
                    ? (_openBlock(), _createBlock(_component_VChip, {
                        key: 0,
                        color: "info",
                        size: "small",
                        variant: "tonal"
                      }, {
                        default: _withCtx(() => [
                          _createVNode(_component_VProgressCircular, {
                            indeterminate: "",
                            size: "14",
                            class: "mr-2"
                          }),
                          _createTextVNode(" " + _toDisplayString(collectProgressText.value), 1)
                        ]),
                        _: 1
                      }))
                    : _createCommentVNode("", true),
                  _createVNode(_component_VBtn, {
                    size: "small",
                    variant: "tonal",
                    color: "secondary",
                    "prepend-icon": "mdi-database-sync-outline",
                    disabled: collecting.value,
                    onClick: _cache[2] || (_cache[2] = $event => (collect()))
                  }, {
                    default: _withCtx(() => [...(_cache[25] || (_cache[25] = [
                      _createTextVNode(" 采集全部站点 ", -1)
                    ]))]),
                    _: 1
                  }, 8, ["disabled"])
                ])
              ]),
              _createElementVNode("div", _hoisted_6, [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(summaryCards.value, (card) => {
                  return (_openBlock(), _createBlock(MetricCard, {
                    key: card.label,
                    label: card.label,
                    value: card.value,
                    hint: card.hint,
                    icon: card.icon,
                    color: card.color
                  }, null, 8, ["label", "value", "hint", "icon", "color"]))
                }), 128))
              ]),
              _createElementVNode("div", _hoisted_7, [
                _createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass(["ptm-attention__tile", attention.value.hrTotal > 0 ? 'ptm-attention__tile--alert' : 'ptm-attention__tile--ok']),
                  onClick: _cache[3] || (_cache[3] = $event => (openAttention('hr')))
                }, [
                  _createVNode(_component_VIcon, {
                    icon: attention.value.hrTotal > 0 ? 'mdi-alert-octagon' : 'mdi-check-circle-outline',
                    size: "22"
                  }, null, 8, ["icon"]),
                  _createElementVNode("span", _hoisted_8, [
                    _cache[26] || (_cache[26] = _createElementVNode("span", { class: "ptm-attention__label" }, "H&R 未完成", -1)),
                    _createElementVNode("span", _hoisted_9, _toDisplayString(_unref(formatInteger)(attention.value.hrTotal)), 1),
                    _createElementVNode("span", _hoisted_10, _toDisplayString(attention.value.hrCount ? `${attention.value.hrCount} 个站点需要处理` : `已采集 ${attention.value.known} 个站点，全部正常`), 1)
                  ]),
                  _createElementVNode("span", _hoisted_11, [
                    _cache[27] || (_cache[27] = _createTextVNode(" 查看站点 ", -1)),
                    _createVNode(_component_VIcon, {
                      icon: "mdi-chevron-right",
                      size: "18"
                    })
                  ])
                ], 2),
                _createElementVNode("button", {
                  type: "button",
                  class: _normalizeClass(["ptm-attention__tile", { 'ptm-attention__tile--info': attention.value.available > 0 }]),
                  onClick: _cache[4] || (_cache[4] = $event => (openAttention('invite')))
                }, [
                  _createVNode(_component_VIcon, {
                    icon: "mdi-account-plus-outline",
                    size: "22"
                  }),
                  _createElementVNode("span", _hoisted_12, [
                    _cache[28] || (_cache[28] = _createElementVNode("span", { class: "ptm-attention__label" }, "邀请名额", -1)),
                    _createElementVNode("span", _hoisted_13, _toDisplayString(_unref(formatInteger)(attention.value.available)), 1),
                    _createElementVNode("span", _hoisted_14, " 已发送 " + _toDisplayString(_unref(formatInteger)(attention.value.sent)) + " · " + _toDisplayString(attention.value.inviteCount) + " 个站点有名额或已发 ", 1)
                  ]),
                  _createElementVNode("span", _hoisted_15, [
                    _cache[29] || (_cache[29] = _createTextVNode(" 查看站点 ", -1)),
                    _createVNode(_component_VIcon, {
                      icon: "mdi-chevron-right",
                      size: "18"
                    })
                  ])
                ], 2)
              ]),
              _createElementVNode("div", _hoisted_16, [
                _createVNode(_component_VTextField, {
                  modelValue: keyword.value,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((keyword).value = $event)),
                  density: "compact",
                  variant: "outlined",
                  "hide-details": "",
                  clearable: "",
                  "prepend-inner-icon": "mdi-magnify",
                  placeholder: "搜索站点、用户名或 UID",
                  class: "ptm-filters__search"
                }, null, 8, ["modelValue"]),
                _createVNode(_component_VChipGroup, {
                  modelValue: filter.value,
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((filter).value = $event)),
                  mandatory: "",
                  density: "comfortable",
                  class: "ptm-filters__chips"
                }, {
                  default: _withCtx(() => [
                    _createVNode(_component_VChip, {
                      value: "all",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[30] || (_cache[30] = [
                        _createTextVNode("全部", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "error",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[31] || (_cache[31] = [
                        _createTextVNode("数据异常", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "no_extended",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[32] || (_cache[32] = [
                        _createTextVNode("未采集扩展", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "hr",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[33] || (_cache[33] = [
                        _createTextVNode("有 H&R", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "invite",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[34] || (_cache[34] = [
                        _createTextVNode("有名额", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "claims",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[35] || (_cache[35] = [
                        _createTextVNode("有认领", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_VChip, {
                      value: "inactive",
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [...(_cache[36] || (_cache[36] = [
                        _createTextVNode("未启用", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                _createVNode(_component_VMenu, {
                  "close-on-content-click": false,
                  location: "bottom end"
                }, {
                  activator: _withCtx(({ props: activatorProps }) => [
                    _createVNode(_component_VBtn, _mergeProps(activatorProps, {
                      size: "small",
                      variant: "tonal",
                      "prepend-icon": "mdi-sort",
                      class: "ptm-filters__action"
                    }), {
                      default: _withCtx(() => [
                        _createTextVNode(" 排序：" + _toDisplayString(sortLabel.value) + " ", 1),
                        _createVNode(_component_VIcon, {
                          icon: sortDesc.value ? 'mdi-arrow-down' : 'mdi-arrow-up',
                          size: "16",
                          class: "ml-1"
                        }, null, 8, ["icon"])
                      ]),
                      _: 1
                    }, 16)
                  ]),
                  default: _withCtx(() => [
                    _createVNode(_component_VCard, {
                      "min-width": "470",
                      "max-width": "560"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_VCardText, { class: "ptm-sortcard" }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_17, [
                              _cache[39] || (_cache[39] = _createElementVNode("span", { class: "ptm-menu__title" }, "排序字段", -1)),
                              _createVNode(_component_VBtnGroup, {
                                density: "compact",
                                variant: "tonal"
                              }, {
                                default: _withCtx(() => [
                                  _createVNode(_component_VBtn, {
                                    size: "x-small",
                                    variant: sortDesc.value ? 'flat' : 'tonal',
                                    onClick: _cache[7] || (_cache[7] = $event => (sortDesc.value = true))
                                  }, {
                                    default: _withCtx(() => [...(_cache[37] || (_cache[37] = [
                                      _createTextVNode(" 降序 ", -1)
                                    ]))]),
                                    _: 1
                                  }, 8, ["variant"]),
                                  _createVNode(_component_VBtn, {
                                    size: "x-small",
                                    variant: sortDesc.value ? 'tonal' : 'flat',
                                    onClick: _cache[8] || (_cache[8] = $event => (sortDesc.value = false))
                                  }, {
                                    default: _withCtx(() => [...(_cache[38] || (_cache[38] = [
                                      _createTextVNode(" 升序 ", -1)
                                    ]))]),
                                    _: 1
                                  }, 8, ["variant"])
                                ]),
                                _: 1
                              })
                            ]),
                            _createElementVNode("div", _hoisted_18, [
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(sortFields, (field) => {
                                return _createElementVNode("button", {
                                  key: field.key,
                                  type: "button",
                                  class: _normalizeClass(["ptm-sortcard__item", { 'ptm-sortcard__item--active': sortKey.value === field.key }]),
                                  onClick: $event => (chooseSort(field.key))
                                }, [
                                  _createTextVNode(_toDisplayString(field.title) + " ", 1),
                                  (sortKey.value === field.key && field.key !== 'custom')
                                    ? (_openBlock(), _createBlock(_component_VIcon, {
                                        key: 0,
                                        icon: sortDesc.value ? 'mdi-arrow-down' : 'mdi-arrow-up',
                                        size: "13"
                                      }, null, 8, ["icon"]))
                                    : _createCommentVNode("", true)
                                ], 10, _hoisted_19)
                              }), 64))
                            ]),
                            _cache[40] || (_cache[40] = _createElementVNode("div", { class: "ptm-sortcard__foot" }, "拖拽列表行首手柄可直接调整「自定义顺序」", -1))
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }),
                _createVNode(_component_VMenu, {
                  "close-on-content-click": false,
                  location: "bottom end"
                }, {
                  activator: _withCtx(({ props: activatorProps }) => [
                    _createVNode(_component_VBtn, _mergeProps(activatorProps, {
                      size: "small",
                      variant: "tonal",
                      "prepend-icon": "mdi-table-column",
                      class: "ptm-filters__action"
                    }), {
                      default: _withCtx(() => [...(_cache[41] || (_cache[41] = [
                        _createTextVNode(" 列 ", -1)
                      ]))]),
                      _: 1
                    }, 16)
                  ]),
                  default: _withCtx(() => [
                    _createVNode(_component_VCard, { "min-width": "340" }, {
                      default: _withCtx(() => [
                        _createVNode(_component_VCardText, { class: "ptm-colcard" }, {
                          default: _withCtx(() => [
                            _cache[42] || (_cache[42] = _createElementVNode("div", { class: "ptm-colcard__head" }, [
                              _createElementVNode("span", { class: "ptm-menu__title" }, "显示列"),
                              _createElementVNode("span", { class: "ptm-colcard__hint" }, "用 ↑↓ 调整顺序")
                            ], -1)),
                            _createElementVNode("div", _hoisted_20, [
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(orderedAllColumns.value, (column, index) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: column.key,
                                  class: "ptm-colcard__row"
                                }, [
                                  _createVNode(_component_VCheckbox, {
                                    modelValue: visibleColumns.value,
                                    "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((visibleColumns).value = $event)),
                                    value: column.key,
                                    label: column.title,
                                    density: "compact",
                                    "hide-details": ""
                                  }, null, 8, ["modelValue", "value", "label"]),
                                  _createElementVNode("span", _hoisted_21, [
                                    _createElementVNode("button", {
                                      type: "button",
                                      class: "ptm-colcard__move",
                                      title: "上移",
                                      disabled: index === 0,
                                      onClick: $event => (moveColumn(index, -1))
                                    }, [
                                      _createVNode(_component_VIcon, {
                                        icon: "mdi-arrow-up",
                                        size: "13"
                                      })
                                    ], 8, _hoisted_22),
                                    _createElementVNode("button", {
                                      type: "button",
                                      class: "ptm-colcard__move",
                                      title: "下移",
                                      disabled: index === orderedAllColumns.value.length - 1,
                                      onClick: $event => (moveColumn(index, 1))
                                    }, [
                                      _createVNode(_component_VIcon, {
                                        icon: "mdi-arrow-down",
                                        size: "13"
                                      })
                                    ], 8, _hoisted_23)
                                  ])
                                ]))
                              }), 128))
                            ])
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _createVNode(_component_VCard, {
                rounded: "lg",
                variant: "outlined",
                class: "ptm-table-card"
              }, {
                default: _withCtx(() => [
                  (isCardView.value)
                    ? (_openBlock(), _createElementBlock("div", {
                        key: 0,
                        ref_key: "bodyRef",
                        ref: bodyRef,
                        class: "ptm-cards"
                      }, [
                        (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(orderedSites.value, (site, index) => {
                          return (_openBlock(), _createBlock(_component_VCard, {
                            key: site.domain,
                            class: _normalizeClass(["ptm-site-card", {
                'ptm-site-card--dragging': dragging.value && dragFrom.value === index,
                'ptm-site-card--drop': dragging.value && dragTo.value === index && dragFrom.value !== index,
              }]),
                            variant: "tonal",
                            onClick: $event => (openDetail(site))
                          }, {
                            default: _withCtx(() => [
                              _createVNode(_component_VCardText, { class: "ptm-site-card__body" }, {
                                default: _withCtx(() => [
                                  _createElementVNode("div", _hoisted_24, [
                                    _createElementVNode("span", {
                                      class: "ptm-site-card__handle",
                                      title: "按住拖动调整顺序",
                                      onPointerdown: $event => (onHandleDown($event, index)),
                                      onClick: _cache[10] || (_cache[10] = _withModifiers(() => {}, ["stop"]))
                                    }, [
                                      _createVNode(_component_VIcon, {
                                        icon: "mdi-drag-vertical",
                                        size: "16"
                                      })
                                    ], 40, _hoisted_25),
                                    _createVNode(_sfc_main$8, {
                                      api: __props.api,
                                      site: site,
                                      size: 28
                                    }, null, 8, ["api", "site"]),
                                    _createElementVNode("div", _hoisted_26, [
                                      _createElementVNode("div", _hoisted_27, [
                                        _createElementVNode("span", _hoisted_28, _toDisplayString(site.name), 1),
                                        (failureLabel(site))
                                          ? (_openBlock(), _createElementBlock("span", {
                                              key: 0,
                                              class: "ptm-row__fail",
                                              title: failureDetail(site)
                                            }, _toDisplayString(failureLabel(site)), 9, _hoisted_29))
                                          : _createCommentVNode("", true)
                                      ]),
                                      _createElementVNode("div", _hoisted_30, _toDisplayString(site.user_level || '—'), 1)
                                    ]),
                                    (Number(site.extended?.hr) > 0)
                                      ? (_openBlock(), _createBlock(_component_VChip, {
                                          key: 0,
                                          color: "error",
                                          size: "x-small",
                                          variant: "tonal"
                                        }, {
                                          default: _withCtx(() => [
                                            _createTextVNode(" H&R " + _toDisplayString(_unref(formatInteger)(site.extended.hr)), 1)
                                          ]),
                                          _: 2
                                        }, 1024))
                                      : _createCommentVNode("", true),
                                    _createVNode(_component_VChip, {
                                      color: _unref(freshness)(site.updated_at).color,
                                      size: "x-small",
                                      variant: "tonal"
                                    }, {
                                      default: _withCtx(() => [
                                        _createTextVNode(_toDisplayString(_unref(freshness)(site.updated_at).label), 1)
                                      ]),
                                      _: 2
                                    }, 1032, ["color"])
                                  ]),
                                  _createElementVNode("div", _hoisted_31, [
                                    (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(cardColumns.value, (column) => {
                                      return (_openBlock(), _createElementBlock("div", {
                                        key: column.key
                                      }, [
                                        _createElementVNode("span", _hoisted_32, _toDisplayString(column.title), 1),
                                        _createElementVNode("span", {
                                          class: _normalizeClass(["ptm-site-card__value", column.key === 'ratio' ? `ptm-tone--${_unref(ratioColor)(site.ratio)}` : ''])
                                        }, _toDisplayString(cellText(site, column.key)), 3)
                                      ]))
                                    }), 128))
                                  ])
                                ]),
                                _: 2
                              }, 1024)
                            ]),
                            _: 2
                          }, 1032, ["class", "onClick"]))
                        }), 128))
                      ], 512))
                    : (_openBlock(), _createElementBlock("div", _hoisted_33, [
                        _createElementVNode("div", {
                          class: "ptm-table__head",
                          style: _normalizeStyle({ gridTemplateColumns: gridTemplate.value, ...tableStyle.value })
                        }, [
                          _cache[43] || (_cache[43] = _createElementVNode("div", { class: "ptm-table__cell ptm-table__cell--site" }, [
                            _createTextVNode(" 站点 "),
                            _createElementVNode("span", { class: "ptm-table__hint" }, "可拖拽排序")
                          ], -1)),
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeColumns.value, (column) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: column.key,
                              class: _normalizeClass(["ptm-table__cell ptm-table__cell--sortable", { 'ptm-table__cell--numeric': column.numeric }]),
                              onClick: $event => (toggleSort(column.key))
                            }, [
                              _createTextVNode(_toDisplayString(column.title) + " ", 1),
                              (sortKey.value === column.key)
                                ? (_openBlock(), _createBlock(_component_VIcon, {
                                    key: 0,
                                    size: "14",
                                    icon: sortDesc.value ? 'mdi-arrow-down' : 'mdi-arrow-up'
                                  }, null, 8, ["icon"]))
                                : _createCommentVNode("", true)
                            ], 10, _hoisted_34))
                          }), 128))
                        ], 4),
                        _createElementVNode("div", {
                          ref_key: "bodyRef",
                          ref: bodyRef,
                          class: "ptm-table__body"
                        }, [
                          (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(orderedSites.value, (site, index) => {
                            return (_openBlock(), _createElementBlock("div", {
                              key: site.domain,
                              class: _normalizeClass(["ptm-row", {
                  'ptm-row--dragging': dragging.value && dragFrom.value === index,
                  'ptm-row--drop': dragging.value && dragTo.value === index && dragFrom.value !== index,
                  'ptm-row--error': Boolean(failureDetail(site)),
                }]),
                              style: _normalizeStyle({ gridTemplateColumns: gridTemplate.value, ...tableStyle.value }),
                              onClick: $event => (openDetail(site))
                            }, [
                              _createElementVNode("div", _hoisted_36, [
                                _createElementVNode("span", {
                                  class: "ptm-row__handle",
                                  title: "按住拖动调整顺序",
                                  onPointerdown: $event => (onHandleDown($event, index)),
                                  onClick: _cache[11] || (_cache[11] = _withModifiers(() => {}, ["stop"]))
                                }, [
                                  _createVNode(_component_VIcon, {
                                    icon: "mdi-drag-vertical",
                                    size: "14"
                                  })
                                ], 40, _hoisted_37),
                                _createVNode(_sfc_main$8, {
                                  api: __props.api,
                                  site: site,
                                  size: 30
                                }, null, 8, ["api", "site"]),
                                _createElementVNode("span", _hoisted_38, _toDisplayString(site.name), 1),
                                _createElementVNode("span", _hoisted_39, _toDisplayString(site.domain), 1),
                                (failureLabel(site))
                                  ? (_openBlock(), _createElementBlock("span", {
                                      key: 0,
                                      class: "ptm-row__fail",
                                      title: failureDetail(site)
                                    }, _toDisplayString(failureLabel(site)), 9, _hoisted_40))
                                  : _createCommentVNode("", true)
                              ]),
                              (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(activeColumns.value, (column) => {
                                return (_openBlock(), _createElementBlock("div", {
                                  key: column.key,
                                  class: _normalizeClass(["ptm-row__cell", {
                    'ptm-row__cell--numeric': column.numeric,
                    'ptm-row__cell--strong': column.strong,
                  }])
                                }, [
                                  (column.key === 'ratio')
                                    ? (_openBlock(), _createBlock(_component_VChip, {
                                        key: 0,
                                        color: _unref(ratioColor)(site.ratio),
                                        size: "x-small",
                                        variant: "tonal"
                                      }, {
                                        default: _withCtx(() => [
                                          _createTextVNode(_toDisplayString(cellText(site, column.key)), 1)
                                        ]),
                                        _: 2
                                      }, 1032, ["color"]))
                                    : (column.key === 'hr' && Number(site.extended?.hr) > 0)
                                      ? (_openBlock(), _createBlock(_component_VChip, {
                                          key: 1,
                                          color: "error",
                                          size: "x-small",
                                          variant: "tonal"
                                        }, {
                                          default: _withCtx(() => [
                                            _createTextVNode(_toDisplayString(cellText(site, column.key)), 1)
                                          ]),
                                          _: 2
                                        }, 1024))
                                      : (column.key === 'hourly')
                                        ? (_openBlock(), _createElementBlock("span", {
                                            key: 2,
                                            class: "ptm-hourly",
                                            title: hourlySourceText(site)
                                          }, [
                                            _createTextVNode(_toDisplayString(cellText(site, column.key)) + " ", 1),
                                            (site.hourly_bonus_source && site.hourly_bonus_source !== 'page')
                                              ? (_openBlock(), _createElementBlock("span", _hoisted_42, _toDisplayString(site.hourly_bonus_source === 'daily' ? '推算' : '估算'), 1))
                                              : _createCommentVNode("", true)
                                          ], 8, _hoisted_41))
                                        : (column.key === 'updated_at' && failureLabel(site))
                                          ? (_openBlock(), _createElementBlock("span", {
                                              key: 3,
                                              class: "ptm-row__time ptm-row__time--fail",
                                              title: failureDetail(site)
                                            }, _toDisplayString(cellText(site, column.key)), 9, _hoisted_43))
                                          : (_openBlock(), _createElementBlock("span", {
                                              key: 4,
                                              class: _normalizeClass({ 'ptm-row__muted': cellText(site, column.key) === '—' })
                                            }, _toDisplayString(cellText(site, column.key)), 3))
                                ], 2))
                              }), 128))
                            ], 14, _hoisted_35))
                          }), 128))
                        ], 512)
                      ])),
                  (!orderedSites.value.length)
                    ? (_openBlock(), _createBlock(_component_VCardText, {
                        key: 2,
                        class: "text-center text-medium-emphasis"
                      }, {
                        default: _withCtx(() => [...(_cache[44] || (_cache[44] = [
                          _createTextVNode(" 没有符合条件的站点 ", -1)
                        ]))]),
                        _: 1
                      }))
                    : _createCommentVNode("", true)
                ]),
                _: 1
              })
            ])
          ]),
          _: 1
        }),
        _createVNode(_component_VWindowItem, { value: "retirement" }, {
          default: _withCtx(() => [
            _createVNode(RetirementPanel, {
              retirement: retirement.value,
              sites: sites.value,
              api: __props.api,
              twelve: twelve.value
            }, null, 8, ["retirement", "sites", "api", "twelve"])
          ]),
          _: 1
        }),
        _createVNode(_component_VWindowItem, { value: "invite" }, {
          default: _withCtx(() => [
            _createVNode(InvitePanel, {
              invite: invite.value,
              sites: sites.value,
              api: __props.api,
              collecting: inviteCollecting.value,
              onCollect: collectInvite
            }, null, 8, ["invite", "sites", "api", "collecting"])
          ]),
          _: 1
        }),
        _createVNode(_component_VWindowItem, { value: "config" }, {
          default: _withCtx(() => [
            _createVNode(SettingsForm, {
              api: __props.api,
              "plugin-id": __props.pluginId,
              "initial-settings": __props.initialSettings,
              "host-managed-config": __props.hostManagedConfig,
              "show-close": __props.showClose,
              onSave: handleSave,
              onSaved: onSettingsSaved,
              onClose: _cache[12] || (_cache[12] = $event => (emit('close'))),
              onMessage: _cache[13] || (_cache[13] = $event => (notify($event.text, $event.color)))
            }, null, 8, ["api", "plugin-id", "initial-settings", "host-managed-config", "show-close"])
          ]),
          _: 1
        })
      ]),
      _: 1
    }, 8, ["modelValue"]),
    _createVNode(SiteDetailDialog, {
      modelValue: detailOpen.value,
      "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((detailOpen).value = $event)),
      site: activeSite.value,
      api: __props.api,
      "plugin-id": __props.pluginId,
      collecting: Boolean(activeSite.value) && collectingDomain.value === activeSite.value.domain,
      onCollect: collect,
      onMessage: _cache[16] || (_cache[16] = $event => (notify($event.text, $event.color)))
    }, null, 8, ["modelValue", "site", "api", "plugin-id", "collecting"]),
    _createVNode(AttentionDialog, {
      modelValue: attentionOpen.value,
      "onUpdate:modelValue": _cache[17] || (_cache[17] = $event => ((attentionOpen).value = $event)),
      sites: sites.value,
      "initial-tab": attentionTab.value,
      api: __props.api,
      onOpenSite: openSiteFromAttention
    }, null, 8, ["modelValue", "sites", "initial-tab", "api"]),
    _createVNode(_component_VSnackbar, {
      modelValue: snackbar.value.show,
      "onUpdate:modelValue": _cache[18] || (_cache[18] = $event => ((snackbar.value.show) = $event)),
      color: snackbar.value.color,
      timeout: 4000,
      location: "bottom"
    }, {
      default: _withCtx(() => [
        _createTextVNode(_toDisplayString(snackbar.value.text), 1)
      ]),
      _: 1
    }, 8, ["modelValue", "color"])
  ], 2))
}
}

};
const PTManagerWorkbench = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-874b802b"]]);

export { PTManagerWorkbench as P };
