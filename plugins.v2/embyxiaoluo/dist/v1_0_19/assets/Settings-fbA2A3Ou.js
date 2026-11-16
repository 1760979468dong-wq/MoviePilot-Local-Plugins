import { importShared } from './__federation_fn_import-JrT3xvdd.js';

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const {toDisplayString:_toDisplayString,createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,createVNode:_createVNode,createElementVNode:_createElementVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,normalizeClass:_normalizeClass} = await importShared('vue');


const _hoisted_1 = { class: "en-wrap" };
const _hoisted_2 = { class: "d-flex align-center" };
const _hoisted_3 = { class: "en-switch-row" };
const _hoisted_4 = { class: "en-sub mt-2" };
const _hoisted_5 = { class: "d-flex align-center flex-wrap ga-4 mb-3" };
const _hoisted_6 = { class: "d-flex align-center mb-2" };
const _hoisted_7 = { class: "d-flex align-center flex-wrap ga-2 mb-3" };
const _hoisted_8 = { class: "en-var-grid__label" };
const _hoisted_9 = { class: "en-var-grid__items" };
const _hoisted_10 = ["onClick"];
const _hoisted_11 = { class: "en-style-row mt-1" };
const _hoisted_12 = ["onClick"];
const _hoisted_13 = { class: "en-style-row mt-2" };
const _hoisted_14 = ["onClick"];
const _hoisted_15 = { class: "d-flex align-center mb-2 ga-2" };
const _hoisted_16 = { class: "en-preview" };
const _hoisted_17 = { class: "en-bubble en-bubble--tg" };
const _hoisted_18 = ["innerHTML"];
const _hoisted_19 = ["innerHTML"];
const _hoisted_20 = { class: "d-flex align-center flex-wrap ga-4 mb-3" };
const _hoisted_21 = { class: "d-flex align-center mb-2" };
const _hoisted_22 = { class: "d-flex align-center flex-wrap ga-2 mb-3" };
const _hoisted_23 = { class: "en-var-grid__label" };
const _hoisted_24 = { class: "en-var-grid__items" };
const _hoisted_25 = ["onClick"];
const _hoisted_26 = { class: "en-style-row mt-1" };
const _hoisted_27 = ["onClick"];
const _hoisted_28 = { class: "en-style-row mt-2" };
const _hoisted_29 = ["onClick"];
const _hoisted_30 = { class: "en-style-row mt-2" };
const _hoisted_31 = ["onClick"];
const _hoisted_32 = { class: "d-flex align-center mb-2 ga-2" };
const _hoisted_33 = { class: "en-preview" };
const _hoisted_34 = { class: "en-bubble en-bubble--fs" };
const _hoisted_35 = ["innerHTML"];
const _hoisted_36 = ["innerHTML"];

const {computed,nextTick,onMounted,ref,watch} = await importShared('vue');


const ORIGINAL_PRESET = '__original__';

const _sfc_main = {
  __name: 'Settings',
  props: {
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'embyxiaoluo' },
  initialConfig: { type: Object, default: () => ({}) },
  hostManagedConfig: { type: Boolean, default: false },
},
  emits: ['save', 'action', 'layout'],
  setup(__props, { emit: __emit }) {

const props = __props;
const emit = __emit;

const base = computed(() => `plugin/${props.pluginId}`);
const cfg = ref({});
const channels = ref({ telegram: [], feishu: [] });
const servers = ref([]);
const tab = ref('basic');
const sample = ref('tv');
// 本地兜底样例：打开页面立即能渲染预览，后端样例（含 TMDB 元数据）随后覆盖
const LOCAL_SAMPLES = {
  tv: {
    item_name: '诛仙', episode_text: '第1季：第5集', library: '国产剧',
    genres: '动画, 动作冒险', rating: '8.0', release_date: '2022-08-15',
    cast: '曾蓉, 白雪岑, 王婧儿', overview: '齐昊暗送田灵儿清凉珠，大竹峰众人前往通天峰。',
    server_name: '测试服务器', status_text: '测试通知', tmdb_id: '206484',
    season: '1', episode: '5', season_id: '1', episode_id: '5',
    original_title: '诛仙', duration: '24', year: '2022', type_text: '剧集',
    file_path: '/影视城/电视剧/诛仙 (2022)/Season 01/诛仙.S01E05.mkv',
    added_at: '2026-11-16 20:00:00', channel: 'emby',
    tmdb_url: 'https://www.themoviedb.org/tv/206484?language=zh-CN', play_url: '',
    detail_url: 'http://emby.local:8096/web/index.html#!/item?id=1809684',
  },
  movie: {
    item_name: '复仇者联盟4：终局之战', episode_text: '', library: '电影',
    genres: '冒险, 科幻, 动作', rating: '8.4', release_date: '2019-04-24',
    cast: '小罗伯特·唐尼, 克里斯·埃文斯', overview: '复仇者联盟与灭霸的终局之战。',
    server_name: '测试服务器', status_text: '测试通知', tmdb_id: '299534',
    season: '', episode: '', season_id: null, episode_id: null,
    original_title: 'Avengers: Endgame', duration: '181', year: '2019', type_text: '电影',
    file_path: '/影视城/电影/复仇者联盟4：终局之战 (2019)/Avengers.Endgame.2019.mkv',
    added_at: '2026-11-16 20:00:00', channel: 'emby',
    tmdb_url: 'https://www.themoviedb.org/movie/299534?language=zh-CN', play_url: '',
    detail_url: 'http://emby.local:8096/web/index.html#!/item?id=1993597',
  },
};
const mediaCache = ref({ tv: { ...LOCAL_SAMPLES.tv }, movie: { ...LOCAL_SAMPLES.movie } });
const sampleLoaded = ref({ tv: false, movie: false });
const loading = ref(false);
const saving = ref(false);
const testing = ref('');
const error = ref('');
const toast = ref('');
const toastType = ref('success');

const tgTitle = ref('');
const tgBody = ref('');
const fsTitle = ref('');
const fsBody = ref('');

const variableGroups = [
  {
    title: '基础',
    items: [
      { label: '标题', token: '{{item_name}}' },
      { label: '原名', token: '{{original_title}}' },
      { label: '年份', token: '{{year}}' },
      { label: '时长', token: '{{duration}}' },
      { label: '状态', token: '{{status_text}}' },
    ],
  },
  {
    title: '季集',
    items: [
      { label: '季集(中)', token: '{{episode_text}}' },
      { label: '季集(英)', token: '{{episode_code}}' },
      { label: '季(中)', token: '{{season_cn}}' },
      { label: '季(英)', token: '{{season_en}}' },
      { label: '集(中)', token: '{{episode_cn}}' },
      { label: '集(英)', token: '{{episode_en}}' },
    ],
  },
  {
    title: '影片',
    items: [
      { label: '分类', token: '{{library}}' },
      { label: '类型', token: '{{genres}}' },
      { label: '评分', token: '{{rating}}' },
      { label: '发行', token: '{{release_date}}' },
      { label: '主演', token: '{{cast}}' },
      { label: '简介', token: '{{overview}}' },
    ],
  },
  {
    title: '来源',
    items: [
      { label: '服务器', token: '{{server_name}}' },
      { label: '文件', token: '{{file_path}}' },
      { label: '入库时间', token: '{{added_at}}' },
      { label: 'TMDB ID', token: '{{tmdb_id}}' },
    ],
  },
  {
    title: '事件',
    items: [
      { label: '事件', token: '{{event_text}}' },
      { label: '事件名', token: '{{event}}' },
      { label: '用户', token: '{{user_name}}' },
      { label: '设备', token: '{{device_name}}' },
      { label: '客户端', token: '{{client}}' },
      { label: 'IP', token: '{{ip}}' },
      { label: 'IP(带标识)', token: '{{ip_text}}' },
      { label: '进度', token: '{{progress}}' },
    ],
  },
  {
    title: '网址',
    items: [
      { label: '详情URL', token: '{{detail_url}}' },
      { label: '播放URL', token: '{{play_url}}' },
      { label: 'TMDB链接', token: '{{tmdb_url}}' },
    ],
  },
];
const sampleItems = [
  { title: '电视剧样例', value: 'tv' },
  { title: '电影样例', value: 'movie' },
];
const coverStrategies = [
  { title: '剧集背景图优先（横版宣传图）', value: 'series_backdrop' },
  { title: '单集剧照优先（当集画面）', value: 'episode_still' },
  { title: '竖版海报优先', value: 'poster' },
];
const tgItems = computed(() => channels.value.telegram || []);
const feishuItems = computed(() => channels.value.feishu || []);
const isWebhook = computed(() => (cfg.value.feishu_mode || 'mp') === 'webhook');
const isTg = computed(() => tab.value === 'telegram');
const currentMedia = computed(() => mediaCache.value[sample.value] || {});

const webhookUrl = computed(() => {
  const origin = (typeof window !== 'undefined' && window.location) ? window.location.origin : 'http://MP地址:3000';
  return `${origin}/api/v1/plugin/${props.pluginId}/webhook?apikey=你的API密钥`
});

// 飞书样式片段：正文（加粗 + 三种彩色文字）与标签分两组
const feishuTextSnippets = [
  { label: '加粗', tone: 'bold', snippet: '**重点文字**' },
  { label: '红字', tone: 'red', snippet: "<font color='red'>重点文字</font>" },
  { label: '绿字', tone: 'green', snippet: "<font color='green'>重点文字</font>" },
  { label: '灰字', tone: 'grey', snippet: "<font color='grey'>次要文字</font>" },
];
const feishuTagSnippets = [
  { label: '红', tone: 'red', snippet: "<text_tag color='red'>小标题</text_tag>" },
  { label: '绿', tone: 'green', snippet: "<text_tag color='green'>小标题</text_tag>" },
  { label: '蓝', tone: 'blue', snippet: "<text_tag color='blue'>小标题</text_tag>" },
  { label: '橙', tone: 'orange', snippet: "<text_tag color='orange'>小标题</text_tag>" },
  { label: '紫', tone: 'purple', snippet: "<text_tag color='purple'>小标题</text_tag>" },
  { label: '黄', tone: 'yellow', snippet: "<text_tag color='yellow'>小标题</text_tag>" },
  { label: '青', tone: 'turquoise', snippet: "<text_tag color='turquoise'>小标题</text_tag>" },
  { label: '灰', tone: 'grey', snippet: "<text_tag color='neutral'>小标题</text_tag>" },
];
// 链接片段：飞书用 Markdown，TG 用 HTML，各自独立
const feishuLinkSnippets = [
  { label: '查看详情', snippet: '[查看详情]({{detail_url}})' },
  { label: '立即观看', snippet: '[立即观看]({{play_url}})' },
  { label: 'TMDB', snippet: '[TMDB]({{tmdb_url}})' },
];
const tgLinkSnippets = [
  { label: '查看详情', snippet: '<a href="{{detail_url}}">查看详情</a>' },
  { label: '立即观看', snippet: '<a href="{{play_url}}">立即观看</a>' },
  { label: 'TMDB', snippet: '<a href="{{tmdb_url}}">TMDB</a>' },
];

// Telegram 只支持这些格式，没有文字颜色
const eventDefault = {
  feishuTitle: '📢 {{event_text}} · {{item_name}}',
  feishuBody: '📺 条目：{{item_name}}{{episode_text}}\n👤 用户：{{user_name}}\n🖥️ 设备：{{device_name}}\n🌐 IP：{{ip_text}}\n⏱️ 进度：{{progress}}\n📝 剧情：{{overview}}\n🕐 时间：{{added_at}}',
  tgTitle: '📢 <b>{{event_text}}</b> · {{item_name}}',
  tgBody: '📺 {{item_name}}{{episode_text}}\n👤 用户：{{user_name}}\n🖥️ 设备：{{device_name}}\n🌐 IP：{{ip_text}}\n⏱️ 进度：{{progress}}\n📝 剧情：{{overview}}\n🕐 时间：{{added_at}}',
};

const tgTextSnippets = [
  { label: '加粗', kind: 'bold', snippet: '<b>重点文字</b>' },
  { label: '斜体', kind: 'italic', snippet: '<i>文字</i>' },
  { label: '下划线', kind: 'underline', snippet: '<u>文字</u>' },
  { label: '删除线', kind: 'strike', snippet: '<s>文字</s>' },
  { label: '引用', kind: 'quote', snippet: '<blockquote>引用内容</blockquote>' },
  { label: '等宽', kind: 'code', snippet: '<code>文字</code>' },
];

const TEXT_KEYS = ['item_name', 'episode_text', 'library', 'genres', 'rating', 'release_date',
  'cast', 'overview', 'original_title', 'duration', 'year', 'type_text', 'server_name',
  'file_path', 'added_at', 'status_text'];

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const ALIAS_KEYS = { season: 'season_id', episode: 'episode_id' };

function episodeCode(media) {
  const m = media || {};
  const pad = (n) => String(n).padStart(2, '0');
  const season = parseInt(m.season_id ?? m.season, 10);
  const episode = parseInt(m.episode_id ?? m.episode, 10);
  const range = String(m.episode_range || '').replace(/–/g, '-');
  const prefix = Number.isFinite(season) ? `S${pad(season)}` : '';
  if (range) {
    const parts = range.split('-').map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n));
    if (parts.length) {
      const start = parts[0];
      const end = parts[parts.length - 1];
      return start === end ? `${prefix}E${pad(start)}` : `${prefix}E${pad(start)}-E${pad(end)}`
    }
  }
  return Number.isFinite(episode) ? `${prefix}E${pad(episode)}` : prefix
}

const httpOnly = (value) => (/^https?:/i.test(String(value || '')) ? String(value) : '');

function seasonEpisode(media) {
  const m = media || {};
  const toNum = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return null
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null
  };
  const pad = (n) => String(n).padStart(2, '0');
  const season = toNum(m.season_id ?? m.season);
  const episode = toNum(m.episode_id ?? m.episode);
  const range = String(m.episode_range || '').replace(/–/g, '-');
  let start = null;
  let end = null;
  if (range) {
    const parts = range.split('-').map(toNum).filter((n) => n !== null);
    if (parts.length) {
      start = parts[0];
      end = parts[parts.length - 1];
    }
  }
  if (start === null) {
    start = episode;
    end = episode;
  }
  return {
    season_cn: season !== null ? `第${season}季` : '',
    season_en: season !== null ? `S${pad(season)}` : '',
    episode_cn: start === null ? '' : (end !== null && end !== start ? `第${start}-${end}集` : `第${start}集`),
    episode_en: start === null ? '' : (end !== null && end !== start ? `E${pad(start)}-E${pad(end)}` : `E${pad(start)}`),
  }
}

function renderTpl(tpl, media, channel) {
  if (!tpl) return ''
  const source = media || {};
  const playUrl = httpOnly(source.play_url);
  const tmdbUrl = httpOnly(source.tmdb_url);
  const detailUrl = httpOnly(source.detail_url) || playUrl || tmdbUrl;
  return String(tpl).replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (key === 'episode_code') return episodeCode(source)
    if (['season_cn', 'season_en', 'episode_cn', 'episode_en'].includes(key)) return seasonEpisode(source)[key]
    if (key === 'detail_url') return detailUrl
    if (key === 'detail_link') return detailUrl ? `[查看详情](${detailUrl})` : ''
    if (key === 'detail_link_html') return detailUrl ? `<a href="${detailUrl}">查看详情</a>` : ''
    if (key === 'play_link') return playUrl ? `[立即观看](${playUrl})` : ''
    if (key === 'play_link_html') return playUrl ? `<a href="${playUrl}">立即观看</a>` : ''
    if (key === 'tmdb_link') return tmdbUrl ? `[TMDB](${tmdbUrl})` : ''
    if (key === 'tmdb_link_html') return tmdbUrl ? `<a href="${tmdbUrl}">TMDB</a>` : ''
    let value = source[key] ?? source[ALIAS_KEYS[key]] ?? '';
    if (channel === 'telegram' && TEXT_KEYS.includes(key)) value = escapeHtml(value);
    return value
  })
}

function tidyBody(text) {
  // 与后端 _tidy_feishu_body 保持一致：抹掉空样式标签、丢空字段行、保留用户换行
  let cleaned = String(text || '').replace(/<\/?blockquote[^>]*>/gi, '');
  cleaned = cleaned.replace(/<font\b[^>]*>\s*<\/font>/gi, '');
  cleaned = cleaned.replace(/<text_tag\b[^>]*>\s*<\/text_tag>/gi, '');
  const rows = [];
  cleaned.split('\n').forEach((line) => {
    const raw = line.trim();
    if (!raw) { rows.push(''); return }
    const plain = raw.replace(/<\/?(?:font|text_tag)\b[^>]*>/gi, '').trim().replace(/^\*+/, '').replace(/\*+$/, '').trim();
    if (!plain) return
    if (/[:：]$/.test(plain) && plain.length <= 20) return
    if (!/[0-9a-zA-Z\u4e00-\u9fff]/.test(plain)) return
    rows.push(raw);
  });
  const out = [];
  rows.forEach((row) => {
    if (!row && (!out.length || !out[out.length - 1])) return
    out.push(row);
  });
  while (out.length && !out[out.length - 1]) out.pop();
  return out.join('\n').trim()
}

const FONT_COLORS = { red: '#d83931', green: '#2ea121', grey: '#8f959e', gray: '#8f959e' };
const TAG_COLORS = {
  red: '#fde2e2', green: '#d9f5d6', blue: '#ddebfd', orange: '#feead2',
  purple: '#eee2fd', yellow: '#fef7d6', violet: '#eee2fd', carmine: '#fde2ea',
  turquoise: '#d9f4f2', lime: '#e9f7d6', indigo: '#e2e6fd', wathet: '#d9eefd',
  neutral: '#eff0f1',
};

function feishuHtml(raw) {
  const text = String(raw || '');
  if (!text) return ''
  const slots = [];
  const hold = (html) => {
    slots.push(html);
    return `\u0001${slots.length - 1}\u0001`
  };
  let out = text.replace(
    /<font\s+color=['"]?(red|green|grey|gray)['"]?\s*>([\s\S]*?)<\/font>/gi,
    (_, color, inner) => {
      const key = String(color).toLowerCase();
      const hex = FONT_COLORS[key] || FONT_COLORS.grey;
      return hold(`<span style="color:${hex};font-weight:600">${escapeHtml(inner)}</span>`)
    },
  );
  out = out.replace(
    /<text_tag\s+color=['"]?([a-zA-Z]+)['"]?\s*>([\s\S]*?)<\/text_tag>/gi,
    (_, color, inner) => {
      const key = String(color).toLowerCase();
      const bg = TAG_COLORS[key] || TAG_COLORS.neutral;
      return hold(
        `<span style="display:inline-block;padding:1px 8px;border-radius:6px;background:${bg};`
        + `font-size:12px;font-weight:600;white-space:normal;word-break:break-word;`
        + `max-width:100%;vertical-align:middle">${escapeHtml(inner)}</span>`,
      )
    },
  );
  // [文字](链接) 渲染成可点文字，预览里不暴露网址
  out = out.replace(/\[([^\]\n]{1,80})\]\((https?:\/\/[^\s)]+)\)/g, (_, text, url) =>
    hold(`<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(text)}</a>`));
  out = escapeHtml(out);
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\u0001(\d+)\u0001/g, (_, index) => slots[Number(index)] || '');
  return out.replace(/\n/g, '<br>')
}

const previewTitle = computed(() => renderTpl(isTg.value ? tgTitle.value : fsTitle.value, currentMedia.value, tab.value).trim());
const previewBody = computed(() => {
  const raw = renderTpl(isTg.value ? tgBody.value : fsBody.value, currentMedia.value, tab.value);
  return isTg.value ? raw.trim() : tidyBody(raw)
});
const feishuPreviewTitle = computed(() => feishuHtml(previewTitle.value));
const feishuPreviewBody = computed(() => feishuHtml(previewBody.value));
const charCount = computed(() => ((isTg.value ? tgBody.value : fsBody.value) || '').length);

function notify(message, type = 'success') {
  toast.value = message;
  toastType.value = type;
  window.setTimeout(() => { toast.value = ''; }, 4000);
}

function unwrap(res) {
  if (!res) return {}
  return res.data !== undefined ? (res.data || {}) : (res || {})
}

async function loadSample(kind, force = false) {
  if (!force && sampleLoaded.value[kind]) return mediaCache.value[kind]
  try {
    const data = unwrap(await props.api.get(`${base.value}/sample?kind=${kind}`, { feedback: 'silent' }));
    const media = (data && data.media) || {};
    if (media && Object.keys(media).length) {
      mediaCache.value = { ...mediaCache.value, [kind]: { ...(mediaCache.value[kind] || {}), ...media } };
    }
    sampleLoaded.value = { ...sampleLoaded.value, [kind]: true };
  } catch (err) {
    // 后端样例拿不到就继续用本地兜底样例
  }
  return mediaCache.value[kind]
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const data = unwrap(await props.api.get(`${base.value}/ui_config`, { feedback: 'silent' }));
    cfg.value = { ...(data.config || {}), ...(props.initialConfig || {}) };
    if (cfg.value.tg_enabled === undefined) cfg.value.tg_enabled = true;
    if (cfg.value.feishu_enabled === undefined) cfg.value.feishu_enabled = true;
    channels.value = data.channels || { telegram: [], feishu: [] };
    presets.value = data.presets || { feishu: [], telegram: [] };
    if (data.defaults) defaults.value = data.defaults;
    suppressPreset = true;
    presetName.value = (isTg.value ? cfg.value.tg_preset : cfg.value.feishu_preset) || ORIGINAL_PRESET;
    nextTick(() => { suppressPreset = false; });
    servers.value = (data.servers || []).map((name) => ({ title: name, value: name }));
    tgTitle.value = cfg.value.tg_title_template || '';
    tgBody.value = cfg.value.tg_body_template || '';
    if (!cfg.value.cover_strategy) cfg.value.cover_strategy = 'series_backdrop';
    fsTitle.value = cfg.value.feishu_title_template || '';
    fsBody.value = cfg.value.feishu_body_template || '';
    // 后端样例在后台刷新，界面先用本地样例渲染，避免进入设置页要等 TMDB
    loadSample('tv');
    loadSample('movie');
  } catch (err) {
    error.value = err?.message || '加载配置失败';
  } finally {
    loading.value = false;
  }
}

const presets = ref({ feishu: [], telegram: [] });
const presetName = ref(ORIGINAL_PRESET);
const presetDialog = ref(false);
const presetNameInput = ref('');

const defaults = ref({ feishu: { title: '', body: '' }, telegram: { title: '', body: '' } });
const presetChannel = computed(() => (isTg.value ? 'telegram' : 'feishu'));
const presetKey = computed(() => (isTg.value ? 'tg_preset' : 'feishu_preset'));
let suppressPreset = false;
const presetList = computed(() => presets.value[presetChannel.value] || []);
const presetItems = computed(() => [
  { title: '原版', value: ORIGINAL_PRESET },
  ...presetList.value.map((item) => ({ title: item.name, value: item.name })),
]);

function applyPreset(name) {
  if (name === ORIGINAL_PRESET) {
    // 原版 = 当前正在使用的模板，可以直接在上面编辑
    if (presetChannel.value === 'telegram') {
      tgTitle.value = cfg.value.tg_title_template || '';
      tgBody.value = cfg.value.tg_body_template || '';
    } else {
      fsTitle.value = cfg.value.feishu_title_template || '';
      fsBody.value = cfg.value.feishu_body_template || '';
    }
    cfg.value[presetKey.value] = '';
    return
  }
  const item = presetList.value.find((entry) => entry.name === name);
  if (!item) return
  if (presetChannel.value === 'telegram') {
    tgTitle.value = item.title;
    tgBody.value = item.body;
  } else {
    fsTitle.value = item.title;
    fsBody.value = item.body;
  }
  cfg.value[presetKey.value] = name;
}

watch(presetName, (name) => {
  if (suppressPreset || !name) return
  applyPreset(name);
});

// 切渠道：回到该渠道上次保存时使用的模板
watch(tab, () => {
  const saved = isTg.value ? cfg.value.tg_preset : cfg.value.feishu_preset;
  suppressPreset = true;
  presetName.value = saved || ORIGINAL_PRESET;
  nextTick(() => { suppressPreset = false; });
});

function openSavePreset() {
  presetNameInput.value = presetName.value || '';
  presetDialog.value = true;
}

async function confirmSavePreset() {
  const name = presetNameInput.value.trim();
  if (!name) return
  try {
    const data = unwrap(await props.api.post(`${base.value}/presets`, {
      action: 'save',
      channel: presetChannel.value,
      name,
      title: isTg.value ? tgTitle.value : fsTitle.value,
      body: isTg.value ? tgBody.value : fsBody.value,
    }));
    if (data && data.presets) presets.value = data.presets;
    presetName.value = name;
    presetDialog.value = false;
    // 同时把当前模板保存为正在使用的配置，避免只存了预设没生效
    cfg.value[presetKey.value] = name;
    const saved = unwrap(await props.api.post(`${base.value}/ui_config`, {
      tg_title_template: tgTitle.value,
      tg_body_template: tgBody.value,
      feishu_title_template: fsTitle.value,
      feishu_body_template: fsBody.value,
    }));
    if (saved && saved.config) cfg.value = { ...cfg.value, ...saved.config };
    notify(`模板「${name}」已保存并应用`);
  } catch (err) {
    notify(err?.message || '保存模板失败', 'error');
  }
}

async function restoreOriginal() {
  const builtin = defaults.value[presetChannel.value] || {};
  if (presetChannel.value === 'telegram') {
    tgTitle.value = builtin.title || '';
    tgBody.value = builtin.body || '';
  } else {
    fsTitle.value = builtin.title || '';
    fsBody.value = builtin.body || '';
  }
  cfg.value[presetKey.value] = '';
  suppressPreset = true;
  presetName.value = ORIGINAL_PRESET;
  nextTick(() => { suppressPreset = false; });
  try {
    const data = unwrap(await props.api.post(`${base.value}/ui_config`, buildPayload()));
    if (data && data.config) cfg.value = { ...cfg.value, ...data.config };
    notify('已恢复原版模板');
  } catch (err) {
    notify(err?.message || '恢复原版失败', 'error');
  }
}

async function deletePreset() {
  const name = presetName.value;
  if (!name) return
  try {
    const data = unwrap(await props.api.post(`${base.value}/presets`, {
      action: 'delete', channel: presetChannel.value, name,
    }));
    if (data && data.presets) presets.value = data.presets;
    suppressPreset = true;
    presetName.value = ORIGINAL_PRESET;
    nextTick(() => { suppressPreset = false; });
    notify(`模板「${name}」已删除`);
  } catch (err) {
    notify(err?.message || '删除模板失败', 'error');
  }
}

const caret = ref({ telegram: 0, feishu: 0 });

function syncCaret(event, channel) {
  const pos = event?.target?.selectionStart;
  if (typeof pos === 'number') caret.value[channel] = pos;
}

function insertVar(token) {
  const channel = isTg.value ? 'telegram' : 'feishu';
  const model = isTg.value ? tgBody : fsBody;
  const text = String(model.value || '');
  const pos = Math.min(Math.max(caret.value[channel] ?? text.length, 0), text.length);
  model.value = text.slice(0, pos) + token + text.slice(pos);
  caret.value[channel] = pos + token.length;
  nextTick(() => {
    const ta = document.querySelector('.en-editor textarea');
    if (ta) {
      ta.focus();
      ta.setSelectionRange(caret.value[channel], caret.value[channel]);
    }
  });
}

function buildPayload() {
  return {
    ...cfg.value,
    tg_title_template: tgTitle.value,
    tg_body_template: tgBody.value,
    feishu_title_template: fsTitle.value,
    feishu_body_template: fsBody.value,
  }
}

async function save() {
  saving.value = true;
  try {
    // 选中的是自定义模板时，先把编辑后的内容写回这个模板（不碰「原版」）
    if (presetName.value && presetName.value !== ORIGINAL_PRESET) {
      const presetData = unwrap(await props.api.post(`${base.value}/presets`, {
        action: 'save',
        channel: presetChannel.value,
        name: presetName.value,
        title: isTg.value ? tgTitle.value : fsTitle.value,
        body: isTg.value ? tgBody.value : fsBody.value,
      }));
      if (presetData && presetData.presets) presets.value = presetData.presets;
      cfg.value[presetKey.value] = presetName.value;
    }
    const payload = buildPayload();
    const data = unwrap(await props.api.post(`${base.value}/ui_config`, payload));
    cfg.value = { ...cfg.value, ...(data.config || {}) };
    notify('设置已保存');
    if (props.hostManagedConfig) emit('save', payload);
    else emit('action');
  } catch (err) {
    notify(err?.message || '保存失败', 'error');
  } finally {
    saving.value = false;
  }
}

async function sendTest(channel) {
  testing.value = channel;
  try {
    const data = unwrap(await props.api.post(`${base.value}/test_send`, {
      channel,
      sample: sample.value,
      title_template: channel === 'telegram' ? tgTitle.value : fsTitle.value,
      body_template: channel === 'telegram' ? tgBody.value : fsBody.value,
    }));
    notify(data.message || '已发送测试消息');
  } catch (err) {
    notify(err?.message || '发送失败', 'error');
  } finally {
    testing.value = '';
  }
}

watch(sample, (value) => { loadSample(value); });

onMounted(() => {
  emit('layout', { maxWidth: '80rem' });
  load();
});

return (_ctx, _cache) => {
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_tab = _resolveComponent("v-tab");
  const _component_v_tabs = _resolveComponent("v-tabs");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_divider = _resolveComponent("v-divider");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_card_text = _resolveComponent("v-card-text");
  const _component_v_tabs_window_item = _resolveComponent("v-tabs-window-item");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_textarea = _resolveComponent("v-textarea");
  const _component_v_tabs_window = _resolveComponent("v-tabs-window");
  const _component_v_card_actions = _resolveComponent("v-card-actions");
  const _component_v_card_title = _resolveComponent("v-card-title");
  const _component_v_card = _resolveComponent("v-card");
  const _component_v_dialog = _resolveComponent("v-dialog");

  return (_openBlock(), _createElementBlock("div", _hoisted_1, [
    (error.value)
      ? (_openBlock(), _createBlock(_component_v_alert, {
          key: 0,
          type: "error",
          variant: "tonal",
          density: "compact",
          class: "mb-3"
        }, {
          default: _withCtx(() => [
            _createTextVNode(_toDisplayString(error.value), 1)
          ]),
          _: 1
        }))
      : _createCommentVNode("", true),
    _createVNode(_component_v_card, {
      variant: "flat",
      class: "en-card"
    }, {
      default: _withCtx(() => [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_v_tabs, {
            modelValue: tab.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => ((tab).value = $event)),
            color: "primary",
            density: "comfortable",
            class: "en-tabs"
          }, {
            default: _withCtx(() => [
              _createVNode(_component_v_tab, { value: "basic" }, {
                default: _withCtx(() => [...(_cache[47] || (_cache[47] = [
                  _createTextVNode("基础", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_v_tab, { value: "telegram" }, {
                default: _withCtx(() => [...(_cache[48] || (_cache[48] = [
                  _createTextVNode("TG", -1)
                ]))]),
                _: 1
              }),
              _createVNode(_component_v_tab, { value: "feishu" }, {
                default: _withCtx(() => [...(_cache[49] || (_cache[49] = [
                  _createTextVNode("飞书", -1)
                ]))]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          _createVNode(_component_v_spacer),
          _createVNode(_component_v_btn, {
            icon: "mdi-close",
            variant: "text",
            density: "comfortable",
            class: "me-2",
            onClick: _cache[1] || (_cache[1] = $event => (emit('close')))
          })
        ]),
        _createVNode(_component_v_divider),
        _createVNode(_component_v_tabs_window, {
          modelValue: tab.value,
          "onUpdate:modelValue": _cache[41] || (_cache[41] = $event => ((tab).value = $event))
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_tabs_window_item, { value: "basic" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_card_text, null, {
                  default: _withCtx(() => [
                    _createElementVNode("div", _hoisted_3, [
                      _createVNode(_component_v_switch, {
                        modelValue: cfg.value.enabled,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((cfg.value.enabled) = $event)),
                        color: "primary",
                        density: "compact",
                        "hide-details": "",
                        label: "启用插件"
                      }, null, 8, ["modelValue"])
                    ]),
                    _createVNode(_component_v_row, {
                      dense: "",
                      class: "mt-1"
                    }, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "4"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_v_select, {
                              modelValue: cfg.value.emby_server_name,
                              "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((cfg.value.emby_server_name) = $event)),
                              items: servers.value,
                              label: "媒体服务器（封面/详情来源）",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              hint: "列表来自 MoviePilot 已添加的 Emby 服务器",
                              "persistent-hint": ""
                            }, null, 8, ["modelValue", "items"])
                          ]),
                          _: 1
                        }),
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "4"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_v_select, {
                              modelValue: cfg.value.cover_strategy,
                              "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((cfg.value.cover_strategy) = $event)),
                              items: coverStrategies,
                              "item-title": "title",
                              "item-value": "value",
                              label: "封面图来源",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              hint: "剧集默认用剧集背景图（横版宣传图），可改成单集截图或竖版海报",
                              "persistent-hint": ""
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }),
                    _cache[51] || (_cache[51] = _createElementVNode("div", { class: "en-section-title mt-2" }, "插件说明", -1)),
                    _cache[52] || (_cache[52] = _createElementVNode("div", { class: "en-text" }, " 监听 Emby / Jellyfin 的 Webhook 入库与删除事件，用 Emby API 补全条目信息（原名、时长、类型、年份、分类、评分）， 再按你自定义的模板推送到 Telegram 与飞书。支持剧集合并（30 秒内多集合并为一条）、消息去重（60 秒）与 TMDB 兜底。 ", -1)),
                    _cache[53] || (_cache[53] = _createElementVNode("div", { class: "en-section-title mt-6" }, "连接 Emby（Webhook 配置）", -1)),
                    _cache[54] || (_cache[54] = _createElementVNode("ol", { class: "en-steps" }, [
                      _createElementVNode("li", null, [
                        _createTextVNode("Emby → 设置 → "),
                        _createElementVNode("b", null, "通知"),
                        _createTextVNode(" → "),
                        _createElementVNode("b", null, "Webhooks"),
                        _createTextVNode(" → 添加 Webhook")
                      ]),
                      _createElementVNode("li", null, [
                        _createTextVNode("Webhook 地址填下面这条（把 "),
                        _createElementVNode("code", null, "你的API密钥"),
                        _createTextVNode(" 换成 MoviePilot「设置 → 认证 → API密钥」里的值）")
                      ]),
                      _createElementVNode("li", null, [
                        _createTextVNode("请求内容类型选 "),
                        _createElementVNode("b", null, "application/json")
                      ]),
                      _createElementVNode("li", null, [
                        _createTextVNode("事件勾选 "),
                        _createElementVNode("b", null, "新媒体入库"),
                        _createTextVNode("（library.new）；需要删除通知再勾 "),
                        _createElementVNode("b", null, "媒体移除"),
                        _createTextVNode("（library.deleted）")
                      ]),
                      _createElementVNode("li", null, "保存后可在 Telegram / 飞书 页签里各点一次「发送测试消息」确认")
                    ], -1)),
                    _createVNode(_component_v_text_field, {
                      "model-value": webhookUrl.value,
                      label: "Webhook 地址",
                      readonly: "",
                      density: "compact",
                      variant: "outlined",
                      "hide-details": "",
                      class: "mt-3 en-mono"
                    }, null, 8, ["model-value"]),
                    _createElementVNode("div", _hoisted_4, " 格式：http(s)://MP地址:3000/api/v1/plugin/" + _toDisplayString(__props.pluginId) + "/webhook?apikey=你的API密钥 ", 1),
                    _createVNode(_component_v_alert, {
                      type: "info",
                      variant: "tonal",
                      density: "compact",
                      class: "mt-3"
                    }, {
                      default: _withCtx(() => [...(_cache[50] || (_cache[50] = [
                        _createTextVNode(" Jellyfin 用户请在「通知 → Webhooks」里选择 ", -1),
                        _createElementVNode("b", null, "Generic Destination", -1),
                        _createTextVNode("，事件类型选 ", -1),
                        _createElementVNode("b", null, "Item Added", -1),
                        _createTextVNode(" / ", -1),
                        _createElementVNode("b", null, "Item Removed", -1),
                        _createTextVNode("。 ", -1)
                      ]))]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }),
            _createVNode(_component_v_tabs_window_item, { value: "telegram" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_card_text, null, {
                  default: _withCtx(() => [
                    _createElementVNode("div", _hoisted_5, [
                      _createVNode(_component_v_switch, {
                        modelValue: cfg.value.tg_enabled,
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((cfg.value.tg_enabled) = $event)),
                        color: "primary",
                        density: "compact",
                        "hide-details": "",
                        label: "启用 TG 通知"
                      }, null, 8, ["modelValue"]),
                      _createVNode(_component_v_switch, {
                        modelValue: cfg.value.use_mp_tg,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((cfg.value.use_mp_tg) = $event)),
                        color: "primary",
                        density: "compact",
                        "hide-details": "",
                        label: "使用 MP 内置 TG 配置"
                      }, null, 8, ["modelValue"]),
                      (cfg.value.use_mp_tg)
                        ? (_openBlock(), _createBlock(_component_v_select, {
                            key: 0,
                            modelValue: cfg.value.mp_tg_channel,
                            "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((cfg.value.mp_tg_channel) = $event)),
                            items: tgItems.value,
                            label: "TG 渠道",
                            density: "compact",
                            variant: "outlined",
                            "hide-details": "",
                            style: {"max-width":"220px"}
                          }, null, 8, ["modelValue", "items"]))
                        : _createCommentVNode("", true)
                    ]),
                    (!cfg.value.use_mp_tg)
                      ? (_openBlock(), _createBlock(_component_v_row, {
                          key: 0,
                          dense: "",
                          class: "mb-2"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_v_col, {
                              cols: "12",
                              md: "4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_text_field, {
                                  modelValue: cfg.value.tg_bot_token,
                                  "onUpdate:modelValue": _cache[8] || (_cache[8] = $event => ((cfg.value.tg_bot_token) = $event)),
                                  label: "Bot Token",
                                  density: "compact",
                                  variant: "outlined",
                                  "hide-details": ""
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            }),
                            _createVNode(_component_v_col, {
                              cols: "12",
                              md: "4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_text_field, {
                                  modelValue: cfg.value.tg_chat_id,
                                  "onUpdate:modelValue": _cache[9] || (_cache[9] = $event => ((cfg.value.tg_chat_id) = $event)),
                                  label: "Chat ID",
                                  density: "compact",
                                  variant: "outlined",
                                  "hide-details": ""
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            }),
                            _createVNode(_component_v_col, {
                              cols: "12",
                              md: "4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_text_field, {
                                  modelValue: cfg.value.tg_api_host,
                                  "onUpdate:modelValue": _cache[10] || (_cache[10] = $event => ((cfg.value.tg_api_host) = $event)),
                                  label: "API Host",
                                  placeholder: "https://api.telegram.org",
                                  density: "compact",
                                  variant: "outlined",
                                  "hide-details": ""
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode("", true),
                    _createVNode(_component_v_row, null, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "7"
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_6, [
                              _cache[55] || (_cache[55] = _createElementVNode("span", { class: "en-label" }, "模板内容", -1)),
                              _createVNode(_component_v_spacer),
                              _createVNode(_component_v_chip, {
                                size: "x-small",
                                color: "success",
                                variant: "tonal"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(charCount.value) + " 字符", 1)
                                ]),
                                _: 1
                              })
                            ]),
                            _createElementVNode("div", _hoisted_7, [
                              _createVNode(_component_v_select, {
                                modelValue: presetName.value,
                                "onUpdate:modelValue": _cache[11] || (_cache[11] = $event => ((presetName).value = $event)),
                                items: presetItems.value,
                                label: "模板选项",
                                density: "compact",
                                variant: "outlined",
                                "hide-details": "",
                                style: {"max-width":"220px"}
                              }, null, 8, ["modelValue", "items"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "tonal",
                                "prepend-icon": "mdi-content-save",
                                onClick: _cache[12] || (_cache[12] = $event => (openSavePreset()))
                              }, {
                                default: _withCtx(() => [...(_cache[56] || (_cache[56] = [
                                  _createTextVNode("保存为模板", -1)
                                ]))]),
                                _: 1
                              }),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "text",
                                color: "error",
                                disabled: !presetName.value || presetName.value === ORIGINAL_PRESET,
                                onClick: _cache[13] || (_cache[13] = $event => (deletePreset()))
                              }, {
                                default: _withCtx(() => [...(_cache[57] || (_cache[57] = [
                                  _createTextVNode("删除模板", -1)
                                ]))]),
                                _: 1
                              }, 8, ["disabled"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "text",
                                "prepend-icon": "mdi-restore",
                                onClick: _cache[14] || (_cache[14] = $event => (restoreOriginal()))
                              }, {
                                default: _withCtx(() => [...(_cache[58] || (_cache[58] = [
                                  _createTextVNode("恢复原版", -1)
                                ]))]),
                                _: 1
                              })
                            ]),
                            _createVNode(_component_v_text_field, {
                              modelValue: tgTitle.value,
                              "onUpdate:modelValue": _cache[15] || (_cache[15] = $event => ((tgTitle).value = $event)),
                              label: "标题模板",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mb-3"
                            }, null, 8, ["modelValue"]),
                            _createVNode(_component_v_textarea, {
                              ref: "tgBodyRef",
                              modelValue: tgBody.value,
                              "onUpdate:modelValue": _cache[16] || (_cache[16] = $event => ((tgBody).value = $event)),
                              rows: "15",
                              density: "compact",
                              variant: "outlined",
                              onClick: _cache[17] || (_cache[17] = $event => (syncCaret($event, 'telegram'))),
                              onKeyup: _cache[18] || (_cache[18] = $event => (syncCaret($event, 'telegram'))),
                              onSelect: _cache[19] || (_cache[19] = $event => (syncCaret($event, 'telegram'))),
                              "hide-details": "",
                              class: "en-editor",
                              label: "正文模板（支持 TG HTML）"
                            }, null, 8, ["modelValue"]),
                            _cache[61] || (_cache[61] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("变量"),
                              _createElementVNode("span", { class: "en-block-hint" }, "点击插入")
                            ], -1)),
                            (_openBlock(), _createElementBlock(_Fragment, null, _renderList(variableGroups, (g) => {
                              return _createElementVNode("div", {
                                key: g.title,
                                class: "en-var-grid"
                              }, [
                                _createElementVNode("div", _hoisted_8, _toDisplayString(g.title), 1),
                                _createElementVNode("div", _hoisted_9, [
                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(g.items, (v) => {
                                    return (_openBlock(), _createElementBlock("span", {
                                      key: v.token,
                                      class: "en-var",
                                      onClick: $event => (insertVar(v.token))
                                    }, [
                                      _createTextVNode(_toDisplayString(v.label) + " ", 1),
                                      _createElementVNode("code", null, _toDisplayString(v.token), 1)
                                    ], 8, _hoisted_10))
                                  }), 128))
                                ])
                              ])
                            }), 64)),
                            _cache[62] || (_cache[62] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("样式"),
                              _createElementVNode("span", { class: "en-block-hint" }, "点击插入，TG 支持")
                            ], -1)),
                            _createElementVNode("div", _hoisted_11, [
                              _cache[59] || (_cache[59] = _createElementVNode("span", { class: "en-style-label" }, "格式", -1)),
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(tgTextSnippets, (s) => {
                                return _createElementVNode("span", {
                                  key: s.label,
                                  class: _normalizeClass(['en-style', `en-format en-format--${s.kind}`]),
                                  onClick: $event => (insertVar(s.snippet))
                                }, _toDisplayString(s.label), 11, _hoisted_12)
                              }), 64))
                            ]),
                            _createElementVNode("div", _hoisted_13, [
                              _cache[60] || (_cache[60] = _createElementVNode("span", { class: "en-style-label" }, "链接", -1)),
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(tgLinkSnippets, (s) => {
                                return _createElementVNode("span", {
                                  key: s.label,
                                  class: "en-style en-style--blue",
                                  onClick: $event => (insertVar(s.snippet))
                                }, _toDisplayString(s.label), 9, _hoisted_14)
                              }), 64))
                            ]),
                            _cache[63] || (_cache[63] = _createElementVNode("div", { class: "en-block-title mt-3" }, "说明", -1)),
                            _cache[64] || (_cache[64] = _createElementVNode("div", { class: "en-tips mt-1" }, [
                              _createTextVNode(" TG 官方"),
                              _createElementVNode("b", null, "不支持设置文字颜色"),
                              _createTextVNode("，只能用上面的格式；消息背景色由客户端主题决定，两边无法指定。"),
                              _createElementVNode("br"),
                              _createTextVNode(" 示例："),
                              _createElementVNode("code", null, "<b>重点</b>"),
                              _createElementVNode("code", null, "<blockquote>引用内容</blockquote>"),
                              _createElementVNode("br"),
                              _createElementVNode("b", null, "链接"),
                              _createTextVNode("（只显示文字、不显示网址，点击才跳转）：「查看详情」= Emby 里这部片/这集的"),
                              _createElementVNode("b", null, "详情界面"),
                              _createTextVNode("；「立即观看」= "),
                              _createElementVNode("b", null, "直接播放"),
                              _createTextVNode("（地址里带 Emby API Key，别转发给外人）；「TMDB」= TMDB 资料页。 ")
                            ], -1)),
                            _cache[65] || (_cache[65] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("事件模板"),
                              _createElementVNode("span", { class: "en-block-hint" }, "播放 / 系统 / 用户等事件")
                            ], -1)),
                            _cache[66] || (_cache[66] = _createElementVNode("div", { class: "en-tips mt-1" }, "Emby 里勾选哪些事件，插件就推哪些；会带上封面与剧情。下面留空则使用内置默认文案。", -1)),
                            _createVNode(_component_v_text_field, {
                              modelValue: cfg.value.event_tg_title_template,
                              "onUpdate:modelValue": _cache[20] || (_cache[20] = $event => ((cfg.value.event_tg_title_template) = $event)),
                              label: "事件标题模板",
                              placeholder: eventDefault.tgTitle,
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mt-2"
                            }, null, 8, ["modelValue", "placeholder"]),
                            _createVNode(_component_v_textarea, {
                              modelValue: cfg.value.event_tg_body_template,
                              "onUpdate:modelValue": _cache[21] || (_cache[21] = $event => ((cfg.value.event_tg_body_template) = $event)),
                              label: "事件正文模板",
                              placeholder: eventDefault.tgBody,
                              rows: "6",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mt-2"
                            }, null, 8, ["modelValue", "placeholder"])
                          ]),
                          _: 1
                        }),
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "5"
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_15, [
                              _cache[68] || (_cache[68] = _createElementVNode("span", { class: "en-label" }, "TG 预览", -1)),
                              _createVNode(_component_v_spacer),
                              _createVNode(_component_v_select, {
                                modelValue: sample.value,
                                "onUpdate:modelValue": _cache[22] || (_cache[22] = $event => ((sample).value = $event)),
                                items: sampleItems,
                                density: "compact",
                                variant: "plain",
                                "hide-details": "",
                                class: "en-sample"
                              }, null, 8, ["modelValue"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                color: "primary",
                                variant: "flat",
                                "prepend-icon": "mdi-send",
                                loading: testing.value === 'telegram',
                                onClick: _cache[23] || (_cache[23] = $event => (sendTest('telegram')))
                              }, {
                                default: _withCtx(() => [...(_cache[67] || (_cache[67] = [
                                  _createTextVNode("发送测试消息", -1)
                                ]))]),
                                _: 1
                              }, 8, ["loading"])
                            ]),
                            _createElementVNode("div", _hoisted_16, [
                              _createElementVNode("div", _hoisted_17, [
                                (previewTitle.value)
                                  ? (_openBlock(), _createElementBlock("div", {
                                      key: 0,
                                      class: "en-bubble__title",
                                      innerHTML: previewTitle.value
                                    }, null, 8, _hoisted_18))
                                  : _createCommentVNode("", true),
                                _createElementVNode("div", {
                                  class: "en-bubble__body",
                                  innerHTML: previewBody.value
                                }, null, 8, _hoisted_19)
                              ])
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
              _: 1
            }),
            _createVNode(_component_v_tabs_window_item, { value: "feishu" }, {
              default: _withCtx(() => [
                _createVNode(_component_v_card_text, null, {
                  default: _withCtx(() => [
                    _createElementVNode("div", _hoisted_20, [
                      _createVNode(_component_v_switch, {
                        modelValue: cfg.value.feishu_enabled,
                        "onUpdate:modelValue": _cache[24] || (_cache[24] = $event => ((cfg.value.feishu_enabled) = $event)),
                        color: "primary",
                        density: "compact",
                        "hide-details": "",
                        label: "启用飞书通知"
                      }, null, 8, ["modelValue"]),
                      _createVNode(_component_v_select, {
                        modelValue: cfg.value.feishu_mode,
                        "onUpdate:modelValue": _cache[25] || (_cache[25] = $event => ((cfg.value.feishu_mode) = $event)),
                        items: [{title:'复用 MP 飞书应用',value:'mp'},{title:'群机器人 Webhook',value:'webhook'}],
                        label: "发送方式",
                        density: "compact",
                        variant: "outlined",
                        "hide-details": "",
                        style: {"max-width":"220px"}
                      }, null, 8, ["modelValue"]),
                      (!isWebhook.value)
                        ? (_openBlock(), _createBlock(_component_v_select, {
                            key: 0,
                            modelValue: cfg.value.mp_feishu_channel,
                            "onUpdate:modelValue": _cache[26] || (_cache[26] = $event => ((cfg.value.mp_feishu_channel) = $event)),
                            items: feishuItems.value,
                            label: "飞书渠道",
                            density: "compact",
                            variant: "outlined",
                            "hide-details": "",
                            style: {"max-width":"220px"}
                          }, null, 8, ["modelValue", "items"]))
                        : _createCommentVNode("", true)
                    ]),
                    (isWebhook.value)
                      ? (_openBlock(), _createBlock(_component_v_row, {
                          key: 0,
                          dense: "",
                          class: "mb-2"
                        }, {
                          default: _withCtx(() => [
                            _createVNode(_component_v_col, { cols: "12" }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_text_field, {
                                  modelValue: cfg.value.feishu_webhook,
                                  "onUpdate:modelValue": _cache[27] || (_cache[27] = $event => ((cfg.value.feishu_webhook) = $event)),
                                  label: "群机器人 Webhook 地址",
                                  placeholder: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx",
                                  density: "compact",
                                  variant: "outlined",
                                  "hide-details": ""
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }))
                      : _createCommentVNode("", true),
                    _createVNode(_component_v_row, null, {
                      default: _withCtx(() => [
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "7"
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_21, [
                              _cache[69] || (_cache[69] = _createElementVNode("span", { class: "en-label" }, "模板内容", -1)),
                              _createVNode(_component_v_spacer),
                              _createVNode(_component_v_chip, {
                                size: "x-small",
                                color: "success",
                                variant: "tonal"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(charCount.value) + " 字符", 1)
                                ]),
                                _: 1
                              })
                            ]),
                            _createElementVNode("div", _hoisted_22, [
                              _createVNode(_component_v_select, {
                                modelValue: presetName.value,
                                "onUpdate:modelValue": _cache[28] || (_cache[28] = $event => ((presetName).value = $event)),
                                items: presetItems.value,
                                label: "模板选项",
                                density: "compact",
                                variant: "outlined",
                                "hide-details": "",
                                style: {"max-width":"220px"}
                              }, null, 8, ["modelValue", "items"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "tonal",
                                "prepend-icon": "mdi-content-save",
                                onClick: _cache[29] || (_cache[29] = $event => (openSavePreset()))
                              }, {
                                default: _withCtx(() => [...(_cache[70] || (_cache[70] = [
                                  _createTextVNode("保存为模板", -1)
                                ]))]),
                                _: 1
                              }),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "text",
                                color: "error",
                                disabled: !presetName.value || presetName.value === ORIGINAL_PRESET,
                                onClick: _cache[30] || (_cache[30] = $event => (deletePreset()))
                              }, {
                                default: _withCtx(() => [...(_cache[71] || (_cache[71] = [
                                  _createTextVNode("删除模板", -1)
                                ]))]),
                                _: 1
                              }, 8, ["disabled"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                variant: "text",
                                "prepend-icon": "mdi-restore",
                                onClick: _cache[31] || (_cache[31] = $event => (restoreOriginal()))
                              }, {
                                default: _withCtx(() => [...(_cache[72] || (_cache[72] = [
                                  _createTextVNode("恢复原版", -1)
                                ]))]),
                                _: 1
                              })
                            ]),
                            _createVNode(_component_v_text_field, {
                              modelValue: fsTitle.value,
                              "onUpdate:modelValue": _cache[32] || (_cache[32] = $event => ((fsTitle).value = $event)),
                              label: "标题模板",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mb-3"
                            }, null, 8, ["modelValue"]),
                            _createVNode(_component_v_textarea, {
                              ref: "fsBodyRef",
                              modelValue: fsBody.value,
                              "onUpdate:modelValue": _cache[33] || (_cache[33] = $event => ((fsBody).value = $event)),
                              rows: "15",
                              density: "compact",
                              variant: "outlined",
                              onClick: _cache[34] || (_cache[34] = $event => (syncCaret($event, 'feishu'))),
                              onKeyup: _cache[35] || (_cache[35] = $event => (syncCaret($event, 'feishu'))),
                              onSelect: _cache[36] || (_cache[36] = $event => (syncCaret($event, 'feishu'))),
                              "hide-details": "",
                              class: "en-editor",
                              label: "正文模板（支持飞书 Markdown）"
                            }, null, 8, ["modelValue"]),
                            _cache[76] || (_cache[76] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("变量"),
                              _createElementVNode("span", { class: "en-block-hint" }, "点击插入")
                            ], -1)),
                            (_openBlock(), _createElementBlock(_Fragment, null, _renderList(variableGroups, (g) => {
                              return _createElementVNode("div", {
                                key: g.title,
                                class: "en-var-grid"
                              }, [
                                _createElementVNode("div", _hoisted_23, _toDisplayString(g.title), 1),
                                _createElementVNode("div", _hoisted_24, [
                                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(g.items, (v) => {
                                    return (_openBlock(), _createElementBlock("span", {
                                      key: v.token,
                                      class: "en-var",
                                      onClick: $event => (insertVar(v.token))
                                    }, [
                                      _createTextVNode(_toDisplayString(v.label) + " ", 1),
                                      _createElementVNode("code", null, _toDisplayString(v.token), 1)
                                    ], 8, _hoisted_25))
                                  }), 128))
                                ])
                              ])
                            }), 64)),
                            _cache[77] || (_cache[77] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("样式"),
                              _createElementVNode("span", { class: "en-block-hint" }, "点击插入，飞书卡片支持")
                            ], -1)),
                            _createElementVNode("div", _hoisted_26, [
                              _cache[73] || (_cache[73] = _createElementVNode("span", { class: "en-style-label" }, "正文", -1)),
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(feishuTextSnippets, (s) => {
                                return _createElementVNode("span", {
                                  key: s.label,
                                  class: _normalizeClass(["en-style", `en-style--${s.tone}`]),
                                  onClick: $event => (insertVar(s.snippet))
                                }, _toDisplayString(s.label), 11, _hoisted_27)
                              }), 64))
                            ]),
                            _createElementVNode("div", _hoisted_28, [
                              _cache[74] || (_cache[74] = _createElementVNode("span", { class: "en-style-label" }, "标签", -1)),
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(feishuTagSnippets, (s) => {
                                return _createElementVNode("span", {
                                  key: s.label,
                                  class: _normalizeClass(["en-style", `en-style--${s.tone}`]),
                                  onClick: $event => (insertVar(s.snippet))
                                }, _toDisplayString(s.label), 11, _hoisted_29)
                              }), 64))
                            ]),
                            _createElementVNode("div", _hoisted_30, [
                              _cache[75] || (_cache[75] = _createElementVNode("span", { class: "en-style-label" }, "链接", -1)),
                              (_openBlock(), _createElementBlock(_Fragment, null, _renderList(feishuLinkSnippets, (s) => {
                                return _createElementVNode("span", {
                                  key: s.label,
                                  class: "en-style en-style--blue",
                                  onClick: $event => (insertVar(s.snippet))
                                }, _toDisplayString(s.label), 9, _hoisted_31)
                              }), 64))
                            ]),
                            _cache[78] || (_cache[78] = _createElementVNode("div", { class: "en-block-title mt-3" }, "说明", -1)),
                            _cache[79] || (_cache[79] = _createElementVNode("div", { class: "en-tips mt-1" }, [
                              _createElementVNode("b", null, "正文"),
                              _createTextVNode("："),
                              _createElementVNode("code", null, "**文字**"),
                              _createTextVNode(" 表示加粗；"),
                              _createElementVNode("code", null, "<font color='red'>"),
                              _createTextVNode(" 只有红 / 绿 / 灰三色，可正常换行，适合简介这类长文本。"),
                              _createElementVNode("br"),
                              _createElementVNode("b", null, "标签"),
                              _createTextVNode("：显示为单行小色块，内容过长会被飞书截断，只适合「影片信息」这类短标题；长文本请改用彩色文字。"),
                              _createElementVNode("br"),
                              _createElementVNode("b", null, "链接"),
                              _createTextVNode("（只显示文字、不显示网址，点击才跳转）：「查看详情」= Emby 里这部片/这集的"),
                              _createElementVNode("b", null, "详情界面"),
                              _createTextVNode("；「立即观看」= "),
                              _createElementVNode("b", null, "直接播放"),
                              _createTextVNode("（地址里带 Emby API Key，别转发给外人）；「TMDB」= TMDB 资料页。 ")
                            ], -1)),
                            _cache[80] || (_cache[80] = _createElementVNode("div", { class: "en-block-title mt-4" }, [
                              _createTextVNode("事件模板"),
                              _createElementVNode("span", { class: "en-block-hint" }, "播放 / 系统 / 用户等事件")
                            ], -1)),
                            _cache[81] || (_cache[81] = _createElementVNode("div", { class: "en-tips mt-1" }, "Emby 里勾选哪些事件，插件就推哪些；会带上封面与剧情。下面留空则使用内置默认文案。", -1)),
                            _createVNode(_component_v_text_field, {
                              modelValue: cfg.value.event_feishu_title_template,
                              "onUpdate:modelValue": _cache[37] || (_cache[37] = $event => ((cfg.value.event_feishu_title_template) = $event)),
                              label: "事件标题模板",
                              placeholder: eventDefault.feishuTitle,
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mt-2"
                            }, null, 8, ["modelValue", "placeholder"]),
                            _createVNode(_component_v_textarea, {
                              modelValue: cfg.value.event_feishu_body_template,
                              "onUpdate:modelValue": _cache[38] || (_cache[38] = $event => ((cfg.value.event_feishu_body_template) = $event)),
                              label: "事件正文模板",
                              placeholder: eventDefault.feishuBody,
                              rows: "6",
                              density: "compact",
                              variant: "outlined",
                              "hide-details": "",
                              class: "mt-2"
                            }, null, 8, ["modelValue", "placeholder"])
                          ]),
                          _: 1
                        }),
                        _createVNode(_component_v_col, {
                          cols: "12",
                          md: "5"
                        }, {
                          default: _withCtx(() => [
                            _createElementVNode("div", _hoisted_32, [
                              _cache[83] || (_cache[83] = _createElementVNode("span", { class: "en-label" }, "飞书预览", -1)),
                              _createVNode(_component_v_spacer),
                              _createVNode(_component_v_select, {
                                modelValue: sample.value,
                                "onUpdate:modelValue": _cache[39] || (_cache[39] = $event => ((sample).value = $event)),
                                items: sampleItems,
                                density: "compact",
                                variant: "plain",
                                "hide-details": "",
                                class: "en-sample"
                              }, null, 8, ["modelValue"]),
                              _createVNode(_component_v_btn, {
                                size: "small",
                                color: "primary",
                                variant: "flat",
                                "prepend-icon": "mdi-send",
                                loading: testing.value === 'feishu',
                                onClick: _cache[40] || (_cache[40] = $event => (sendTest('feishu')))
                              }, {
                                default: _withCtx(() => [...(_cache[82] || (_cache[82] = [
                                  _createTextVNode("发送测试消息", -1)
                                ]))]),
                                _: 1
                              }, 8, ["loading"])
                            ]),
                            _createElementVNode("div", _hoisted_33, [
                              _createElementVNode("div", _hoisted_34, [
                                _createElementVNode("div", {
                                  class: "en-fs-head",
                                  innerHTML: feishuPreviewTitle.value || '新媒体入库'
                                }, null, 8, _hoisted_35),
                                _createElementVNode("div", {
                                  class: "en-bubble__body en-fs-body",
                                  innerHTML: feishuPreviewBody.value
                                }, null, 8, _hoisted_36)
                              ])
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
              _: 1
            })
          ]),
          _: 1
        }, 8, ["modelValue"]),
        _createVNode(_component_v_divider),
        _createVNode(_component_v_card_actions, { class: "px-4 py-3 justify-end" }, {
          default: _withCtx(() => [
            (toast.value)
              ? (_openBlock(), _createElementBlock("span", {
                  key: 0,
                  class: _normalizeClass(["text-caption me-3", toastType.value === 'error' ? 'text-error' : 'text-success'])
                }, _toDisplayString(toast.value), 3))
              : _createCommentVNode("", true),
            _createVNode(_component_v_btn, {
              variant: "text",
              class: "me-2",
              onClick: _cache[42] || (_cache[42] = $event => (emit('close')))
            }, {
              default: _withCtx(() => [...(_cache[84] || (_cache[84] = [
                _createTextVNode("关闭", -1)
              ]))]),
              _: 1
            }),
            _createVNode(_component_v_btn, {
              color: "primary",
              variant: "flat",
              loading: saving.value,
              onClick: save
            }, {
              default: _withCtx(() => [...(_cache[85] || (_cache[85] = [
                _createTextVNode("保存设置", -1)
              ]))]),
              _: 1
            }, 8, ["loading"])
          ]),
          _: 1
        }),
        _createVNode(_component_v_dialog, {
          modelValue: presetDialog.value,
          "onUpdate:modelValue": _cache[46] || (_cache[46] = $event => ((presetDialog).value = $event)),
          "max-width": "400"
        }, {
          default: _withCtx(() => [
            _createVNode(_component_v_card, null, {
              default: _withCtx(() => [
                _createVNode(_component_v_card_title, { class: "text-subtitle-1" }, {
                  default: _withCtx(() => [...(_cache[86] || (_cache[86] = [
                    _createTextVNode("保存为模板", -1)
                  ]))]),
                  _: 1
                }),
                _createVNode(_component_v_card_text, null, {
                  default: _withCtx(() => [
                    _createVNode(_component_v_text_field, {
                      modelValue: presetNameInput.value,
                      "onUpdate:modelValue": _cache[43] || (_cache[43] = $event => ((presetNameInput).value = $event)),
                      label: "模板名称",
                      density: "compact",
                      variant: "outlined",
                      "hide-details": "",
                      autofocus: "",
                      hint: "同名模板会被覆盖",
                      "persistent-hint": ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }),
                _createVNode(_component_v_card_actions, null, {
                  default: _withCtx(() => [
                    _createVNode(_component_v_spacer),
                    _createVNode(_component_v_btn, {
                      variant: "text",
                      onClick: _cache[44] || (_cache[44] = $event => (presetDialog.value = false))
                    }, {
                      default: _withCtx(() => [...(_cache[87] || (_cache[87] = [
                        _createTextVNode("取消", -1)
                      ]))]),
                      _: 1
                    }),
                    _createVNode(_component_v_btn, {
                      color: "primary",
                      variant: "flat",
                      disabled: !presetNameInput.value.trim(),
                      onClick: _cache[45] || (_cache[45] = $event => (confirmSavePreset()))
                    }, {
                      default: _withCtx(() => [...(_cache[88] || (_cache[88] = [
                        _createTextVNode("保存", -1)
                      ]))]),
                      _: 1
                    }, 8, ["disabled"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["modelValue"])
      ]),
      _: 1
    })
  ]))
}
}

};
const Settings = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-33c94c26"]]);

export { Settings as S };
