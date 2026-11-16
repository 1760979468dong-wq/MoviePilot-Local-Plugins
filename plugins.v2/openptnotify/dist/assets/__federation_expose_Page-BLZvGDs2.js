import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const {createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,toDisplayString:_toDisplayString,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,createElementVNode:_createElementVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass} = await importShared('vue');


const _hoisted_1 = { class: "d-flex flex-wrap align-center ga-2 mb-1" };
const _hoisted_2 = { class: "text-caption text-medium-emphasis" };
const _hoisted_3 = { class: "d-flex align-center ga-2" };
const _hoisted_4 = ["src", "onError"];
const _hoisted_5 = {
  key: 1,
  class: "text-body-2"
};
const _hoisted_6 = {
  class: "flex-grow-1",
  style: {"min-width":"0"}
};
const _hoisted_7 = ["title"];
const _hoisted_8 = ["title"];
const _hoisted_9 = { class: "d-flex flex-wrap align-center ga-2 mt-2" };

const {computed,onMounted,ref} = await importShared('vue');



const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'OpenPTNotify' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
},
  emits: ['action', 'switch', 'close'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

// MoviePilot 主题下 v-card 的 outlined 边框过淡，改用主题变量自绘，明暗主题都清晰
const cardStyle = {
  background: 'rgba(var(--v-theme-on-surface), 0.04)',
  border: '1px solid rgba(var(--v-theme-on-surface), 0.14)',
  borderRadius: '10px',
};

const loading = ref(false);
const running = ref(false);
const result = ref({});
const config = ref({});
const error = ref('');
const filter = ref('all');
const logoFailed = ref({});

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const response = unwrap(
      await props.api.get(`plugin/${props.pluginId}/latest`, { feedback: 'silent' }),
    );
    result.value = response?.result || {};
    config.value = response?.config || {};
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    loading.value = false;
  }
}

async function runNow() {
  running.value = true;
  error.value = '';
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/run`));
    result.value = response?.result || {};
    emit('action');
  } catch (err) {
    error.value = err?.message || String(err);
  } finally {
    running.value = false;
  }
}

const sites = computed(() => (Array.isArray(result.value?.sites) ? result.value.sites : []));
const ownedSites = computed(() => sites.value.filter(site => site.owned));
const unownedSites = computed(() => sites.value.filter(site => !site.owned));
const newSites = computed(() => sites.value.filter(site => site.is_new));

const filteredSites = computed(() => {
  if (filter.value === 'owned') return ownedSites.value
  if (filter.value === 'unowned') return unownedSites.value
  if (filter.value === 'new') return newSites.value
  return sites.value
});

const fetchedAt = computed(() => result.value?.fetched_at || '尚未执行');

function toggleFilter(name) {
  filter.value = filter.value === name ? 'all' : name;
}

function siteKey(site, index) {
  return `${site.domain || site.name || 'site'}-${index}`
}

function logoKey(site) {
  return site.domain || site.name || ''
}

function markLogoFailed(site) {
  logoFailed.value = { ...logoFailed.value, [logoKey(site)]: true };
}

function initial(site) {
  const text = String(site.name || site.domain || '?').trim();
  return text ? text.charAt(0).toUpperCase() : '?'
}

onMounted(load);

return (_ctx, _cache) => {
  const _component_v_toolbar_title = _resolveComponent("v-toolbar-title");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_toolbar = _resolveComponent("v-toolbar");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_avatar = _resolveComponent("v-avatar");
  const _component_v_icon = _resolveComponent("v-icon");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_card_text = _resolveComponent("v-card-text");

  return (_openBlock(), _createBlock(_component_v_card, { flat: "" }, {
    default: _withCtx(() => [
      _createVNode(_component_v_toolbar, {
        density: "comfortable",
        color: "transparent",
        flat: ""
      }, {
        default: _withCtx(() => [
          _createVNode(_component_v_toolbar_title, { class: "text-h6" }, {
            default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
              _createTextVNode("PT开注提醒", -1)
            ]))]),
            _: 1
          }),
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            color: "primary",
            variant: "tonal",
            size: "small",
            loading: running.value,
            "prepend-icon": "mdi-send",
            class: "mr-2",
            onClick: runNow
          }, {
            default: _withCtx(() => [...(_cache[7] || (_cache[7] = [
              _createTextVNode(" 立即抓取并推送 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading"]),
          _createVNode(_component_v_btn, {
            icon: "mdi-refresh",
            variant: "text",
            size: "small",
            title: "刷新",
            onClick: load
          }),
          _createVNode(_component_v_btn, {
            icon: "mdi-cog-outline",
            variant: "text",
            size: "small",
            title: "设置",
            onClick: _cache[0] || (_cache[0] = $event => (emit('switch')))
          }),
          _createVNode(_component_v_btn, {
            icon: "mdi-close",
            variant: "text",
            size: "small",
            title: "关闭",
            onClick: _cache[1] || (_cache[1] = $event => (emit('close')))
          })
        ]),
        _: 1
      }),
      _createVNode(_component_v_card_text, { class: "pt-0" }, {
        default: _withCtx(() => [
          _createElementVNode("div", _hoisted_1, [
            _createVNode(_component_v_chip, {
              size: "small",
              color: filter.value === 'all' ? 'primary' : 'grey',
              variant: filter.value === 'all' ? 'flat' : 'tonal',
              onClick: _cache[2] || (_cache[2] = $event => (filter.value = 'all'))
            }, {
              default: _withCtx(() => [
                _createTextVNode(" 全部 " + _toDisplayString(sites.value.length), 1)
              ]),
              _: 1
            }, 8, ["color", "variant"]),
            _createVNode(_component_v_chip, {
              size: "small",
              "prepend-icon": "mdi-check-circle",
              color: filter.value === 'owned' ? 'primary' : 'grey',
              variant: filter.value === 'owned' ? 'flat' : 'tonal',
              onClick: _cache[3] || (_cache[3] = $event => (toggleFilter('owned')))
            }, {
              default: _withCtx(() => [
                _createTextVNode(" 已拥有 " + _toDisplayString(ownedSites.value.length), 1)
              ]),
              _: 1
            }, 8, ["color", "variant"]),
            _createVNode(_component_v_chip, {
              size: "small",
              "prepend-icon": "mdi-circle-outline",
              color: filter.value === 'unowned' ? 'primary' : 'grey',
              variant: filter.value === 'unowned' ? 'flat' : 'tonal',
              onClick: _cache[4] || (_cache[4] = $event => (toggleFilter('unowned')))
            }, {
              default: _withCtx(() => [
                _createTextVNode(" 未拥有 " + _toDisplayString(unownedSites.value.length), 1)
              ]),
              _: 1
            }, 8, ["color", "variant"]),
            (newSites.value.length)
              ? (_openBlock(), _createBlock(_component_v_chip, {
                  key: 0,
                  size: "small",
                  "prepend-icon": "mdi-star-plus",
                  color: filter.value === 'new' ? 'primary' : 'grey',
                  variant: filter.value === 'new' ? 'flat' : 'tonal',
                  onClick: _cache[5] || (_cache[5] = $event => (toggleFilter('new')))
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(" 新增 " + _toDisplayString(newSites.value.length), 1)
                  ]),
                  _: 1
                }, 8, ["color", "variant"]))
              : _createCommentVNode("", true),
            _createVNode(_component_v_spacer),
            _createElementVNode("span", _hoisted_2, "最近抓取：" + _toDisplayString(fetchedAt.value), 1),
            (config.value?.enabled)
              ? (_openBlock(), _createBlock(_component_v_chip, {
                  key: 1,
                  size: "small",
                  variant: "text"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(" 定时：" + _toDisplayString(config.value.cron), 1)
                  ]),
                  _: 1
                }))
              : (_openBlock(), _createBlock(_component_v_chip, {
                  key: 2,
                  size: "small",
                  color: "warning",
                  variant: "tonal"
                }, {
                  default: _withCtx(() => [...(_cache[8] || (_cache[8] = [
                    _createTextVNode("插件未启用", -1)
                  ]))]),
                  _: 1
                }))
          ]),
          _cache[10] || (_cache[10] = _createElementVNode("div", { class: "text-caption text-medium-emphasis mb-3" }, " 是否「已拥有」依据该站点域名是否已在 MoviePilot「站点管理」中配置来判断，可点击上方标签筛选。 ", -1)),
          (error.value)
            ? (_openBlock(), _createBlock(_component_v_alert, {
                key: 0,
                type: "error",
                variant: "tonal",
                density: "comfortable",
                class: "mb-3"
              }, {
                default: _withCtx(() => [
                  _createTextVNode(_toDisplayString(error.value), 1)
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (result.value?.error)
            ? (_openBlock(), _createBlock(_component_v_alert, {
                key: 1,
                type: "warning",
                variant: "tonal",
                density: "comfortable",
                class: "mb-3"
              }, {
                default: _withCtx(() => [
                  _createTextVNode(" 最近一次抓取失败：" + _toDisplayString(result.value.error), 1)
                ]),
                _: 1
              }))
            : _createCommentVNode("", true),
          (filteredSites.value.length)
            ? (_openBlock(), _createBlock(_component_v_row, {
                key: 2,
                dense: ""
              }, {
                default: _withCtx(() => [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(filteredSites.value, (site, index) => {
                    return (_openBlock(), _createBlock(_component_v_col, {
                      key: siteKey(site, index),
                      cols: "12",
                      sm: "6",
                      md: "4",
                      lg: "3"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_card, {
                          class: "pa-2 h-100",
                          style: cardStyle
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_3, [
                              _createVNode(_component_v_avatar, {
                                size: "34",
                                color: site.owned ? 'grey' : 'primary',
                                variant: "tonal"
                              }, {
                                default: _withCtx(() => [
                                  (site.logo && !logoFailed.value[logoKey(site)])
                                    ? (_openBlock(), _createElementBlock("img", {
                                        key: 0,
                                        src: site.logo,
                                        alt: "",
                                        onError: $event => (markLogoFailed(site))
                                      }, null, 40, _hoisted_4))
                                    : (_openBlock(), _createElementBlock("span", _hoisted_5, _toDisplayString(initial(site)), 1))
                                ]),
                                _: 2
                              }, 1032, ["color"]),
                              _createElementVNode("div", _hoisted_6, [
                                _createElementVNode("div", {
                                  class: "text-body-2 font-weight-medium text-truncate",
                                  title: site.name
                                }, _toDisplayString(site.name), 9, _hoisted_7),
                                _createElementVNode("div", {
                                  class: "text-caption text-medium-emphasis text-truncate",
                                  title: site.domain
                                }, _toDisplayString(site.domain), 9, _hoisted_8)
                              ]),
                              (site.register_url)
                                ? (_openBlock(), _createBlock(_component_v_btn, {
                                    key: 0,
                                    href: site.register_url,
                                    target: "_blank",
                                    rel: "noopener",
                                    icon: "mdi-open-in-new",
                                    size: "x-small",
                                    variant: "text",
                                    color: "primary",
                                    title: `打开 ${site.name} 注册页`
                                  }, null, 8, ["href", "title"]))
                                : _createCommentVNode("", true)
                            ]),
                            _createElementVNode("div", _hoisted_9, [
                              (site.is_new)
                                ? (_openBlock(), _createBlock(_component_v_chip, {
                                    key: 0,
                                    size: "x-small",
                                    color: "success",
                                    variant: "tonal"
                                  }, {
                                    default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
                                      _createTextVNode(" 新增 ", -1)
                                    ]))]),
                                    _: 1
                                  }))
                                : _createCommentVNode("", true),
                              _createElementVNode("span", {
                                class: _normalizeClass(["text-caption d-inline-flex align-center", site.owned ? 'text-success' : 'text-medium-emphasis'])
                              }, [
                                _createVNode(_component_v_icon, {
                                  size: "14",
                                  class: "mr-1",
                                  icon: site.owned ? 'mdi-check-circle' : 'mdi-circle-outline'
                                }, null, 8, ["icon"]),
                                _createTextVNode(" " + _toDisplayString(site.owned ? '已拥有' : '未拥有'), 1)
                              ], 2)
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
              }))
            : (!loading.value)
              ? (_openBlock(), _createBlock(_component_v_alert, {
                  key: 3,
                  type: "info",
                  variant: "tonal",
                  density: "comfortable"
                }, {
                  default: _withCtx(() => [
                    _createTextVNode(_toDisplayString(sites.value.length
            ? '当前筛选下没有站点，点击上方「全部」查看所有开注站点。'
            : '暂无数据。启用插件后点击「立即抓取并推送」即可获取当前开注站点。'), 1)
                  ]),
                  _: 1
                }))
              : _createCommentVNode("", true)
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
