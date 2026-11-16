import { importShared } from './__federation_fn_import-JrT3xvdd.js';

/** PT管家前端共用的格式化与请求工具。 */

/** 按 1024 进制把字节数格式化为容量文本。 */
function formatBytes(value) {
  let bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  let index = 0;
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index += 1;
  }
  if (index === 0) return `${Math.round(bytes)} ${units[index]}`
  const digits = bytes < 100 ? 2 : 1;
  return `${bytes.toFixed(digits)} ${units[index]}`
}

/** 兼容宿主 API、标准业务响应与 Axios 响应的常见包装形式。 */
function unwrapResponse(response) {
  let value = response;
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== 'object') return value
    if (Object.prototype.hasOwnProperty.call(value, 'success')) {
      if (value.success === false) throw new Error(value.message || '操作失败')
      value = value.data;
      continue
    }
    if (Object.prototype.hasOwnProperty.call(value, 'data')) {
      value = value.data;
      continue
    }
    break
  }
  return value
}

/** 格式化普通数值，缺失时返回占位文本。 */
function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '未提供'
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(number)
}

/** 格式化整数，缺失时返回占位文本。 */
function formatInteger(value) {
  if (value === null || value === undefined || value === '') return '未提供'
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(number)
}

/** 格式化分享率，保留三位小数。 */
function formatRatio(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—'
  return number.toFixed(3)
}

/** 把时间文本裁剪为「月-日 时:分」，便于表格展示。 */
function shortTime(value) {
  const text = String(value || '').trim();
  if (!text) return '—'
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}:\d{2})?/);
  if (!match) return text
  return `${match[2]}-${match[3]}${match[4] ? ` ${match[4]}` : ''}`
}

/** 把加入日期裁剪为日期部分。 */
function shortDate(value) {
  const text = String(value || '').trim();
  if (!text) return '—'
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : text
}

/** 创建包含重复查询参数的 URL。 */
function withQuery(path, query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const suffix = params.toString();
  return suffix ? `${path}?${suffix}` : path
}

const iconCache = new Map();

/** 通过宿主站点图标 API 获取图标并跨组件缓存。 */
async function getSiteIcon(api, siteId) {
  if (!siteId) return ''
  if (iconCache.has(siteId)) return iconCache.get(siteId)
  try {
    const response = await api.get(`site/icon/${siteId}`, { feedback: 'silent' });
    const data = unwrapResponse(response);
    const icon = typeof data === 'string' ? data : data?.icon || data?.base64 || data?.url || '';
    iconCache.set(siteId, icon);
    return icon
  } catch {
    iconCache.set(siteId, '');
    return ''
  }
}

/** 分享率对应的语义配色。 */
function ratioColor(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'grey'
  if (number >= 2) return 'success'
  if (number >= 1) return 'primary'
  if (number >= 0.6) return 'warning'
  return 'error'
}

/** 站点数据新鲜度文案与配色。 */
function freshness(updatedAt) {
  const text = String(updatedAt || '').trim();
  if (!text) return { label: '无数据', color: 'error' }
  const parsed = new Date(text.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return { label: text, color: 'grey' }
  const hours = (Date.now() - parsed.getTime()) / 3600000;
  if (hours <= 26) return { label: shortTime(text), color: 'success' }
  if (hours <= 72) return { label: shortTime(text), color: 'warning' }
  return { label: shortTime(text), color: 'error' }
}

const {resolveComponent:_resolveComponent,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,toDisplayString:_toDisplayString,createElementBlock:_createElementBlock,withCtx:_withCtx} = await importShared('vue');


const _hoisted_1 = {
  key: 1,
  class: "font-weight-bold"
};

const {computed,onMounted,ref,watch} = await importShared('vue');


const _sfc_main = {
  __name: 'SiteAvatar',
  props: {
  api: { type: Object, default: () => ({}) },
  site: { type: Object, default: () => ({}) },
  size: { type: [Number, String], default: 34 },
},
  setup(__props) {

const props = __props;

const icon = ref('');
const fallback = computed(() =>
  String(props.site?.name || props.site?.domain || '?').trim().slice(0, 1).toUpperCase(),
);

async function loadIcon() {
  icon.value = await getSiteIcon(props.api, props.site?.site_id);
}

watch(() => props.site?.site_id, loadIcon);
onMounted(loadIcon);

return (_ctx, _cache) => {
  const _component_VImg = _resolveComponent("VImg");
  const _component_VAvatar = _resolveComponent("VAvatar");

  return (_openBlock(), _createBlock(_component_VAvatar, {
    size: __props.size,
    color: "primary",
    variant: "tonal",
    rounded: "lg"
  }, {
    default: _withCtx(() => [
      (icon.value)
        ? (_openBlock(), _createBlock(_component_VImg, {
            key: 0,
            src: icon.value,
            alt: __props.site.name
          }, null, 8, ["src", "alt"]))
        : (_openBlock(), _createElementBlock("span", _hoisted_1, _toDisplayString(fallback.value), 1))
    ]),
    _: 1
  }, 8, ["size"]))
}
}

};

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

export { _export_sfc as _, formatRatio as a, formatInteger as b, _sfc_main as c, formatNumber as d, shortTime as e, formatBytes as f, freshness as g, ratioColor as r, shortDate as s, unwrapResponse as u, withQuery as w };
