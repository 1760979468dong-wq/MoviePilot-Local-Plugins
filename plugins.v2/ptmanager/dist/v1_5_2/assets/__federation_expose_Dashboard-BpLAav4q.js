import { importShared } from './__federation_fn_import-JrT3xvdd.js';
import { _ as _export_sfc, f as formatBytes, a as formatRatio, b as formatInteger, c as _sfc_main$1, u as unwrapResponse } from './_plugin-vue_export-helper-CA6bBm6b.js';

const {createElementVNode:_createElementVNode,unref:_unref,toDisplayString:_toDisplayString,resolveComponent:_resolveComponent,createVNode:_createVNode,renderList:_renderList,Fragment:_Fragment,openBlock:_openBlock,createElementBlock:_createElementBlock,createCommentVNode:_createCommentVNode} = await importShared('vue');


const _hoisted_1 = { class: "ptm-dashboard" };
const _hoisted_2 = { class: "ptm-dashboard__totals" };
const _hoisted_3 = { class: "ptm-dashboard__value" };
const _hoisted_4 = { class: "ptm-dashboard__value" };
const _hoisted_5 = { class: "ptm-dashboard__value" };
const _hoisted_6 = { class: "ptm-dashboard__value" };
const _hoisted_7 = { class: "ptm-dashboard__value" };
const _hoisted_8 = { class: "ptm-dashboard__list" };
const _hoisted_9 = { class: "ptm-dashboard__name" };
const _hoisted_10 = { class: "ptm-dashboard__metric" };
const _hoisted_11 = { class: "ptm-dashboard__metric" };
const _hoisted_12 = {
  key: 0,
  class: "text-caption text-medium-emphasis"
};

const {computed,onMounted,onUnmounted,ref,watch} = await importShared('vue');


const _sfc_main = {
  __name: 'Dashboard',
  props: {
  api: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
  allowRefresh: { type: Boolean, default: true },
},
  setup(__props) {

const props = __props;

const pluginBase = computed(() => `plugin/${props.pluginId || 'PTManager'}`);
const loading = ref(false);
const summary = ref({});
const topSites = ref([]);
let refreshTimer = null;

/** 读取总览数据并挑出做种体积最大的站点。 */
async function loadOverview() {
  if (!props.allowRefresh && Object.keys(summary.value).length) return
  loading.value = true;
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/overview`, { feedback: 'silent' }));
    summary.value = data?.summary || {};
    const sites = [...(data?.sites || [])];
    sites.sort((left, right) => Number(right.seeding_size || 0) - Number(left.seeding_size || 0));
    topSites.value = sites.slice(0, 5);
  } catch {
    // 仪表盘加载失败时保持上一次结果
  } finally {
    loading.value = false;
  }
}

watch(() => props.allowRefresh, enabled => enabled && loadOverview());

onMounted(() => {
  loadOverview();
  refreshTimer = window.setInterval(loadOverview, 120000);
});

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer);
});

return (_ctx, _cache) => {
  const _component_VDivider = _resolveComponent("VDivider");

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    _createElementVNode("div", _hoisted_2, [
      _createElementVNode("div", null, [
        _cache[0] || (_cache[0] = _createElementVNode("span", { class: "ptm-dashboard__label" }, "上传合计", -1)),
        _createElementVNode("span", _hoisted_3, _toDisplayString(_unref(formatBytes)(summary.value.upload)), 1)
      ]),
      _createElementVNode("div", null, [
        _cache[1] || (_cache[1] = _createElementVNode("span", { class: "ptm-dashboard__label" }, "下载合计", -1)),
        _createElementVNode("span", _hoisted_4, _toDisplayString(_unref(formatBytes)(summary.value.download)), 1)
      ]),
      _createElementVNode("div", null, [
        _cache[2] || (_cache[2] = _createElementVNode("span", { class: "ptm-dashboard__label" }, "分享率", -1)),
        _createElementVNode("span", _hoisted_5, _toDisplayString(_unref(formatRatio)(summary.value.ratio)), 1)
      ]),
      _createElementVNode("div", null, [
        _cache[3] || (_cache[3] = _createElementVNode("span", { class: "ptm-dashboard__label" }, "做种体积", -1)),
        _createElementVNode("span", _hoisted_6, _toDisplayString(_unref(formatBytes)(summary.value.seeding_size)), 1)
      ]),
      _createElementVNode("div", null, [
        _cache[4] || (_cache[4] = _createElementVNode("span", { class: "ptm-dashboard__label" }, "站点数", -1)),
        _createElementVNode("span", _hoisted_7, _toDisplayString(_unref(formatInteger)(summary.value.site_count)), 1)
      ])
    ]),
    _createVNode(_component_VDivider, { class: "my-2" }),
    _createElementVNode("div", _hoisted_8, [
      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(topSites.value, (site) => {
        return (_openBlock(), _createElementBlock("div", {
          key: site.domain,
          class: "ptm-dashboard__row"
        }, [
          _createVNode(_sfc_main$1, {
            api: __props.api,
            site: site,
            size: 26
          }, null, 8, ["api", "site"]),
          _createElementVNode("span", _hoisted_9, _toDisplayString(site.name), 1),
          _createElementVNode("span", _hoisted_10, _toDisplayString(_unref(formatBytes)(site.seeding_size)), 1),
          _createElementVNode("span", _hoisted_11, _toDisplayString(_unref(formatInteger)(site.seeding)) + " 种", 1)
        ]))
      }), 128)),
      (!topSites.value.length && !loading.value)
        ? (_openBlock(), _createElementBlock("div", _hoisted_12, " 暂无站点数据 "))
        : _createCommentVNode("", true)
    ])
  ]))
}
}

};
const Dashboard = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-ffb729bf"]]);

export { Dashboard as default };
