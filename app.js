import { Renderer } from "./vendor/ogl/src/core/Renderer.js";
import { Program } from "./vendor/ogl/src/core/Program.js";
import { Mesh } from "./vendor/ogl/src/core/Mesh.js";
import { Color } from "./vendor/ogl/src/math/Color.js";
import { Triangle } from "./vendor/ogl/src/extras/Triangle.js";
// Keep the local preview's ES-module graph fresh after animation edits. The
// dev server sends no-store headers, but a few embedded Chromium profiles can
// still retain module records for the lifetime of a tab.
import { createThreeCardStack } from "./three-card-stack.js?preview=20260914-3d-stack-v2";

const APP = document.querySelector("#app");
const TOAST = document.querySelector("#toast");
const GALAXY = document.querySelector("#galaxy");
const CARD_ANIMATION = window.gsap;
const API_BASE = String(window.ASTERIA_API_BASE || "").replace(/\/+$/, "");

function apiUrl(pathname) {
  return `${API_BASE}${pathname}`;
}

if (CARD_ANIMATION) {
  const cardPlugins = [window.Flip, window.MotionPathPlugin].filter(Boolean);
  if (cardPlugins.length) CARD_ANIMATION.registerPlugin(...cardPlugins);
}

const KEYS = {
  readings: "tarot.readings.v1",
  profiles: "tarot.profiles.v1",
  preferences: "tarot.preferences.v1",
  usage: "tarot.usage.v1"
};

const spreads = {
  yesno: {
    id: "yesno",
    name: "是非题",
    en: "YES / NO",
    positions: ["共同判断", "共同判断", "共同判断"],
    desc: "观察当下更接近肯定、否定，还是暂未可知。"
  },
  relationship: {
    id: "relationship",
    name: "人际关系",
    en: "RELATIONSHIP",
    positions: ["我的心态", "对方的心态", "过去", "现在", "未来发展", "环境"],
    desc: "梳理一段关系里的双方视角、变化与外部影响。"
  },
  core: {
    id: "core",
    name: "直指核心",
    en: "CORE",
    positions: ["问题核心", "障碍和短处", "资源和长处", "对策"],
    desc: "看清瓶颈的根源、可用资源和下一步方向。"
  }
};

const majorData = [
  ["愚人", "The Fool", "新的开始、自由尝试，以及先迈出一步再认识道路"],
  ["魔术师", "The Magician", "主动性、专注，以及把现有能力真正调动起来"],
  ["女祭司", "The High Priestess", "直觉、沉默观察，以及尚未浮到表面的信息"],
  ["皇后", "The Empress", "滋养、丰盛，以及允许需要被看见和照顾"],
  ["皇帝", "The Emperor", "边界、秩序，以及用稳定结构承接现实"],
  ["教皇", "The Hierophant", "规则、传统，以及从成熟经验中寻找参照"],
  ["恋人", "The Lovers", "关系、选择，以及行动是否和真实价值一致"],
  ["战车", "The Chariot", "方向、意志，以及在拉扯中保持控制"],
  ["力量", "Strength", "耐心、柔韧，以及不靠压制也能稳定局面"],
  ["隐士", "The Hermit", "独处、审视，以及先听清自己的真实声音"],
  ["命运之轮", "Wheel of Fortune", "周期、变化，以及识别正在转动的机会"],
  ["正义", "Justice", "事实、平衡，以及为选择与后果负责"],
  ["吊人", "The Hanged Man", "暂停、换位，以及放下旧视角后重新理解"],
  ["死神", "Death", "结束、转化，以及为下一阶段腾出空间"],
  ["节制", "Temperance", "调和、节奏，以及让不同部分形成新的配合"],
  ["恶魔", "The Devil", "依赖、执念，以及看见难以放下的惯性"],
  ["高塔", "The Tower", "旧结构被打破，以及无法继续回避的真实"],
  ["星星", "The Star", "希望、修复，以及在混乱后重新相信方向"],
  ["月亮", "The Moon", "不确定、投射，以及需要慢慢辨认的情绪"],
  ["太阳", "The Sun", "清晰、活力，以及让真实状态被充分看见"],
  ["审判", "Judgement", "回望、醒悟，以及回应内心真正的召唤"],
  ["世界", "The World", "完成、整合，以及一个阶段走向成熟闭环"]
];

const suitData = [
  { id: "wands", zh: "权杖", en: "Wands", theme: "行动、意愿与正在升温的动力" },
  { id: "cups", zh: "圣杯", en: "Cups", theme: "感受、连接与关系中的情绪流动" },
  { id: "swords", zh: "宝剑", en: "Swords", theme: "判断、沟通与不得不面对的事实" },
  { id: "pentacles", zh: "星币", en: "Pentacles", theme: "现实条件、资源与长期投入" }
];

const rankData = [
  ["王牌", "Ace", "一股刚出现、仍需被接住的可能性"],
  ["二", "Two", "两种力量之间的选择与平衡"],
  ["三", "Three", "关系展开、协作或初步成果"],
  ["四", "Four", "维持稳定，同时也可能停留过久"],
  ["五", "Five", "碰撞、失落，以及暴露出来的缺口"],
  ["六", "Six", "从旧阶段过渡，并重新分配关注"],
  ["七", "Seven", "评估处境，坚持真正重要的部分"],
  ["八", "Eight", "节奏加快，限制或推进都变得明显"],
  ["九", "Nine", "接近完成时的积累、警觉与压力"],
  ["十", "Ten", "一个周期达到顶点，也带来责任或负荷"],
  ["侍从", "Page", "新的消息、学习姿态与还在成形的表达"],
  ["骑士", "Knight", "强烈推进、追求目标，以及速度带来的偏差"],
  ["皇后", "Queen", "成熟的内在掌握与稳定承接"],
  ["国王", "King", "把经验落实为决定、边界与影响力"]
];

const deck = [
  ...majorData.map(([name, en, meaning], index) => ({
    id: `major-${index}`,
    name,
    en,
    meaning,
    group: "大阿尔卡那",
    image: `assets/tarot/major-${index}.jpg`
  })),
  ...suitData.flatMap((suit) =>
    rankData.map(([rank, enRank, rankMeaning], index) => ({
      id: `${suit.id}-${index + 1}`,
      name: `${suit.zh}${rank}`,
      en: `${enRank} of ${suit.en}`,
      meaning: `${suit.theme}，并呈现出${rankMeaning}`,
      group: suit.zh,
      image: `assets/tarot/${suit.id}-${index + 1}.jpg`
    }))
  )
];

const deckById = new Map(deck.map((card) => [card.id, card]));
const SHUFFLE_VISUAL_CARD_COUNT = Math.floor(deck.length * (2 / 3));

const homeCards = [
  { cardId: "major-9", feature: "guide", label: "塔罗怎么问问题", edge: "top" },
  { cardId: "major-17", edge: "top" },
  { cardId: "pentacles-2", feature: "profiles", label: "信息档案", edge: "top" },
  { cardId: "major-2", edge: "right" },
  { cardId: "wands-8", feature: "feedback", label: "反馈与客服", edge: "right" },
  { cardId: "major-18", edge: "right" },
  { cardId: "cups-6", feature: "history", label: "历史记录", edge: "bottom" },
  { cardId: "major-19", edge: "bottom" },
  { cardId: "major-11", feature: "policy", label: "使用说明", edge: "bottom" },
  { cardId: "major-3", edge: "left" },
  { cardId: "major-10", feature: "theme", label: "昼夜切换", edge: "left" },
  { cardId: "major-21", edge: "left" }
];

const state = {
  screen: "home",
  selectedSpread: "core",
  question: "",
  selectedProfiles: [],
  context: {
    gender: "",
    zodiac: "",
    relationshipStatus: "",
    optionalText: ""
  },
  validationMessage: "",
  deckOrder: [],
  picks: [],
  currentReading: null,
  homeArmed: null,
  shuffleFinishing: false,
  openShuffledDeck: null,
  drawEntrance: null
};

let screenCleanup = () => {};
let galaxyController = null;
const activeCardFlights = new Set();
let galaxyPausedForCardFlight = false;
const activeAiReadingIds = new Set();

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;"
  })[character]);
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function notify(message) {
  TOAST.textContent = message;
  TOAST.classList.add("show");
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => TOAST.classList.remove("show"), 3000);
}

function getPreferences() {
  const saved = read(KEYS.preferences, {});
  return {
    theme: ["system", "light", "dark"].includes(saved.theme) ? saved.theme : "system",
    keyboardGuideSeen: Boolean(saved.keyboardGuideSeen)
  };
}

function effectiveTheme() {
  const preference = getPreferences().theme;
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return preference;
}

function applyTheme() {
  const isLight = effectiveTheme() === "light";
  document.body.classList.toggle("light", isLight);
  document.querySelector('meta[name="theme-color"]').content = isLight ? "#ffffff" : "#08080f";
  galaxyController?.setLightMode(isLight);
}

function toggleTheme(source) {
  source?.classList.add("theme-spinning");
  const next = effectiveTheme() === "light" ? "dark" : "light";
  write(KEYS.preferences, { ...getPreferences(), theme: next });
  window.setTimeout(() => {
    applyTheme();
    source?.classList.remove("theme-spinning");
  }, 150);
}

function getUsage() {
  const today = new Date().toISOString().slice(0, 10);
  const saved = read(KEYS.usage, {});
  if (saved.date !== today) return { date: today, completedCount: 0 };
  return { date: today, completedCount: Number(saved.completedCount) || 0 };
}

function getProfiles() {
  const saved = read(KEYS.profiles, { self: null, guests: [] });
  const normalize = (profile, type) => profile ? {
    id: profile.id || uid(),
    type: profile.type || type,
    nickname: profile.nickname ?? profile.name ?? "",
    gender: profile.gender || "",
    zodiac: profile.zodiac || "",
    relationshipStatus: profile.relationshipStatus || "",
    createdAt: profile.createdAt || new Date().toISOString(),
    updatedAt: profile.updatedAt || profile.createdAt || new Date().toISOString()
  } : null;
  return {
    self: normalize(saved.self, "self"),
    guests: Array.isArray(saved.guests) ? saved.guests.map((profile) => normalize(profile, "guest")).filter(Boolean) : []
  };
}

function allProfiles() {
  const profiles = getProfiles();
  return [profiles.self, ...profiles.guests].filter(Boolean);
}

function pruneReadings(readings) {
  const now = Date.now();
  return readings.filter((reading) => !reading.expiresAt || new Date(reading.expiresAt).getTime() > now);
}

function getReadings() {
  return pruneReadings(read(KEYS.readings, []).filter((reading) => reading && reading.id)).map((reading) => {
    if (reading.aiStatus !== "loading" || activeAiReadingIds.has(reading.id)) return reading;
    return { ...reading, aiStatus: "fallback", aiError: "上一次本地 AI 生成过程已中断" };
  });
}

function cardFor(item) {
  return deckById.get(item.cardId || item.card?.id) || item.card || deck[0];
}

function classicCard(card, options = {}) {
  const reversedClass = options.orientation === "reversed" ? " is-reversed" : "";
  const loading = options.eager ? "eager" : "lazy";
  return `<span class="classic-card">
    <span class="card-art-wrap"><img class="card-art${reversedClass}" src="${card.image}" alt="" loading="${loading}" draggable="false" /></span>
    <span class="card-title">${escapeHTML(card.en)}</span>
  </span>`;
}

function subpageTopbar() {
  return `<header class="topbar">
    <button class="brand" data-action="home" aria-label="返回 ASTERIA 首页">ASTERIA</button>
    <button class="text-link home-link" data-action="home">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.25 10H3.75m5-5-5 5 5 5" /></svg>
      <span>返回主界面</span>
    </button>
  </header>`;
}

function pageShell(content, options = {}) {
  return `<section class="page ${options.className || ""}">
    ${subpageTopbar()}
    ${content}
  </section>`;
}

function renderHome() {
  const cards = homeCards.map((item, index) => {
    const card = deckById.get(item.cardId);
    const content = `${classicCard(card, { eager: true })}${item.feature ? `<span class="feature-label">${item.label}</span>` : ""}`;
    if (!item.feature) {
      return `<div class="home-card-shell edge-${item.edge}" data-home-index="${index}" aria-hidden="true">${content}</div>`;
    }
    const armed = state.homeArmed === item.feature ? " is-armed" : "";
    return `<button class="home-card-shell edge-${item.edge}${armed}" data-home-index="${index}" data-action="home-feature" data-feature="${item.feature}" aria-label="${item.label}，${card.en}">${content}</button>`;
  }).join("");

  return `<section class="home" aria-label="ASTERIA 首页">
    <div class="home-stage">
      ${cards}
      <div class="home-center">
        <h1 class="brand-word">ASTERIA</h1>
        <p class="home-tagline">LET THE CARDS MEET THE QUESTION</p>
        <button class="continue-link" data-action="start">CONTINUE</button>
      </div>
    </div>
  </section>`;
}

function renderQuestion() {
  const usage = getUsage();
  const profiles = allProfiles();
  const detailsOpen = state.selectedProfiles.length || Object.values(state.context).some(Boolean);
  const profileOptions = profiles.length
    ? profiles.map((profile) => {
      const selected = state.selectedProfiles.includes(profile.id);
      const title = profile.nickname || (profile.type === "self" ? "本人档案" : "未命名嘉宾");
      return `<button class="profile-option${selected ? " selected" : ""}" data-action="select-profile" data-id="${profile.id}" aria-pressed="${selected}">
        <span class="check">${selected ? "✓" : ""}</span>
        <span>${escapeHTML(title)}${profile.zodiac ? ` · ${escapeHTML(profile.zodiac)}` : ""}</span>
      </button>`;
    }).join("")
    : '<span class="help-text">还没有本地档案。</span><button class="text-link" data-action="profiles">创建档案</button>';

  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">STEP 01 · ASK</p>
      <h2>这次，你想看清什么？</h2>
      <p class="page-lead">选择一种牌阵，再把问题说得具体一些。内容只在当前浏览器与本机 AI 服务中使用。</p>
    </div>
    <div class="content-panel">
      <section class="form-section" aria-labelledby="spread-label">
        <p class="field-label" id="spread-label">选择牌阵</p>
        <div class="spread-grid">
          ${Object.values(spreads).map((spread) => `<button class="spread-choice${state.selectedSpread === spread.id ? " selected" : ""}" data-action="spread" data-spread="${spread.id}" aria-pressed="${state.selectedSpread === spread.id}">
            <span class="spread-meta">${spread.en} · ${spread.positions.length} CARDS</span>
            <strong>${spread.name}</strong>
            <span>${spread.desc}</span>
          </button>`).join("")}
        </div>
      </section>
      <section class="form-section">
        <div class="field">
          <label for="question">占卜问题</label>
          <textarea id="question" maxlength="300" placeholder="例如：我现在该如何理解这段关系里的距离感？">${escapeHTML(state.question)}</textarea>
          <small>避免填写姓名、联系方式、地址或其他可识别个人的信息。</small>
        </div>
      </section>
      <section class="form-section">
        <details class="context-details" ${detailsOpen ? "open" : ""}>
          <summary>补充身份与背景（选填）</summary>
          <div class="context-inner">
            <p class="field-label">使用已保存档案，最多选择 3 个</p>
            <div class="profile-options">${profileOptions}</div>
            <div class="form-grid">
              ${contextDropdown("zodiac", "星座", ["", ...zodiacOptions()], state.context.zodiac, "✦", true)}
              ${contextDropdown("relationship", "情感状态", ["", "单身", "暧昧中", "恋爱中", "已婚", "分手后", "关系复杂"], state.context.relationshipStatus, "♡")}
              ${contextDropdown("gender", "性别", ["", "女性", "男性", "非二元", "不便说明"], state.context.gender, "◌")}
            </div>
            <div class="field">
              <label for="optional-context">自由补充</label>
              <textarea id="optional-context" maxlength="240" placeholder="写下你愿意提供的背景，不必填写敏感信息。">${escapeHTML(state.context.optionalText)}</textarea>
            </div>
          </div>
        </details>
      </section>
      <div class="notice">今日本机已完成 ${usage.completedCount} / 3 次。本地计数仅用于原型体验，正式版还需服务端限流。</div>
      ${state.validationMessage ? `<div class="notice warning" role="alert">${escapeHTML(state.validationMessage)}</div>` : ""}
      <div class="form-actions">
        <button class="secondary" data-action="home">返回</button>
        <button class="primary" data-action="to-shuffle">进入洗牌</button>
      </div>
    </div>
  `);
}

function contextDropdown(key, label, options, current, icon, searchable = false, scope = "context") {
  const menuId = `context-menu-${key}`;
  const normalizedOptions = options.map((option) => typeof option === "string"
    ? { value: option, label: option || "不填写" }
    : { value: String(option.value ?? ""), label: option.label || option.value || "不填写" });
  const currentOption = normalizedOptions.find((option) => option.value === current);
  const valueLabel = currentOption?.label || current || "不填写";
  const optionMarkup = normalizedOptions.map(({ value, label: optionLabel }) => {
    const selected = value === current;
    return `<button type="button" class="context-option${selected ? " selected" : ""}" data-action="select-context" data-context="${key}" data-context-value="${escapeHTML(value)}" data-context-label="${escapeHTML(optionLabel)}" role="option" aria-selected="${selected}">
      <span>${escapeHTML(optionLabel)}</span><span class="context-option-check" aria-hidden="true">${selected ? "✓" : ""}</span>
    </button>`;
  }).join("");
  const profileInput = scope === "profile"
    ? `<input type="hidden" id="${key}" value="${escapeHTML(current)}" data-profile-input />`
    : "";
  return `<div class="field context-dropdown" data-context-dropdown="${key}" data-dropdown-scope="${scope}">
    <label id="context-label-${key}">${label}</label>
    <button type="button" class="context-trigger" data-action="toggle-context-dropdown" data-context="${key}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${menuId}">
      <span class="context-value-wrap"><span class="context-glyph" aria-hidden="true">${icon}</span><span class="context-value">${escapeHTML(valueLabel)}</span></span>
      <span class="context-chevrons" aria-hidden="true"><i></i><i></i></span>
    </button>
    <div class="context-menu" id="${menuId}" role="listbox" aria-labelledby="context-label-${key}" hidden>
      ${searchable ? `<label class="context-search-wrap"><span class="context-search-icon" aria-hidden="true">⌕</span><input class="context-search" type="search" placeholder="搜索星座" aria-label="搜索星座" data-context-search="${key}" /></label>` : ""}
      <div class="context-options">${optionMarkup}</div>
    </div>${profileInput}
  </div>`;
}

function optionList(options, current, emptyLabel) {
  return options.map((value) => `<option value="${escapeHTML(value)}" ${value === current ? "selected" : ""}>${value || emptyLabel}</option>`).join("");
}

function zodiacOptions() {
  return ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
}

function renderShuffle() {
  const cards = Array.from({ length: SHUFFLE_VISUAL_CARD_COUNT }, (_, index) => (
    `<div class="shuffle-card card-back${index === SHUFFLE_VISUAL_CARD_COUNT - 1 ? " is-stack-top" : ""}" data-shuffle-index="${index}" aria-hidden="true"></div>`
  )).join("");

  return pageShell(`
    <div class="page-heading shuffle-heading">
      <p class="eyebrow">STEP 02 · SHUFFLE</p>
      <h2 id="shuffle-title">按住牌群，慢慢搓洗</h2>
      <p class="page-lead" id="shuffle-lead">用鼠标或手指画圈。你想洗多久都可以，松手或点击“结束洗牌”即可收拢牌堆。</p>
    </div>
    <div class="shuffle-scene" id="shuffle-scene" aria-label="牌组洗牌区域">
      <div class="shuffle-deck" id="shuffle-deck" aria-hidden="true">
        <div class="shuffle-stack-base card-back"></div>
        ${cards}
      </div>
      <div class="three-card-stack" id="three-card-stack" aria-hidden="true"></div>
      <button class="shuffle-stack-trigger" type="button" data-action="open-shuffled-deck" aria-label="展开牌堆并进入选牌" disabled></button>
      <div class="shuffle-controls">
        <p class="shuffle-hint">按住并移动 · 让牌群随直觉流动</p>
        <button class="primary" data-action="finish-shuffle">结束洗牌</button>
      </div>
    </div>
  `, { className: "shuffle-page" });
}

function renderDraw() {
  const spread = spreads[state.selectedSpread];
  return `<section class="draw-page">
    ${subpageTopbar()}
    <div class="rotate-device" role="status">
      <span class="device-icon" aria-hidden="true"></span>
      <p>请横屏抽牌</p>
    </div>
    <div class="draw-workspace" id="draw-workspace">
      <div class="card-fan" id="card-fan" tabindex="0" aria-label="可拖动、滚动或使用方向键浏览的 78 张背面牌">
        <div class="card-fan-track" id="card-fan-track">
          ${state.deckOrder.map((cardId, index) => `<div class="fan-card-slot" data-fan-index="${index}"><button class="fan-card card-back" data-action="fan-pick" data-card="${cardId}" aria-label="选择第 ${index + 1} 张背面牌"></button></div>`).join("")}
        </div>
      </div>
      <div class="draw-center-copy">
        <h2>${spread.name}</h2>
        <p id="remaining-copy">${remainingCopy()}</p>
      </div>
      <div class="selection-zone selection-${spread.positions.length}" id="selection-zone" aria-label="已抽取的背面牌"></div>
      <button class="primary draw-confirm" id="draw-confirm" data-action="confirm-draw" disabled>确认并翻牌</button>
    </div>
  </section>`;
}

function remainingCopy() {
  const count = spreads[state.selectedSpread].positions.length - state.picks.length;
  return count > 0 ? `再凭直觉选择 ${count} 张牌` : "牌已就位，可以翻开";
}

function readingCopyMarkup(reading) {
  const paragraphs = String(reading.aiReading || "").split(/\n\s*\n/).filter(Boolean);
  const loading = reading.aiStatus === "loading";
  const success = reading.aiStatus === "success";
  const modelDisplay = reading.aiModelDisplay || "AI";
  const status = loading ? "AI · 正在生成解读" : success ? `AI · ${modelDisplay}` : "基础牌义兜底 · AI 暂不可用";
  const body = loading
    ? '<div class="reading-loading" role="status"><p>AI 正在结合问题、牌位与正逆位生成解读…</p><span></span><span></span><span></span></div>'
    : `<div class="reading-paragraphs">${paragraphs.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join("")}</div>`;
  const disclaimer = loading
    ? ""
    : success
      ? modelDisplay.includes("Cloudflare")
        ? "以上内容由 Cloudflare Workers AI 托管的 Qwen 生成，只用于自我反思，不构成对未来的承诺，也不能替代医疗、法律、心理或财务等专业意见。"
        : "以上内容由本机 Ollama / Qwen 生成，只用于自我反思，不构成对未来的承诺，也不能替代医疗、法律、心理或财务等专业意见。"
      : "本次 AI 未能完成生成，以上内容由浏览器内的基础牌义组合生成。它只用于自我反思，不构成对未来的承诺，也不能替代医疗、法律、心理或财务等专业意见。";

  return `
    <div class="reading-status${loading ? " is-loading" : ""}" aria-live="polite"><span class="status-dot"></span>${escapeHTML(status)}</div>
    ${body}
    <p class="disclaimer">${escapeHTML(disclaimer)}</p>
    <div class="reading-actions">
      <button class="secondary" data-action="history">查看历史记录</button>
      <button class="primary" data-action="start-again">再次占卜</button>
    </div>`;
}

function renderResult(reading) {
  const hydrated = hydrateReading(reading);
  const spread = spreads[hydrated.spreadId] || spreads.core;
  return pageShell(`
    <header class="result-header">
      <div>
        <p class="eyebrow">STEP 04 · REFLECT</p>
        <h2>${spread.name} · 你的牌面</h2>
        <p class="result-question">${escapeHTML(hydrated.question)}<br />${formatDate(hydrated.createdAt)}</p>
      </div>
    </header>
    <section class="result-spread spread-${spread.id}" aria-label="${spread.name}结果牌阵">
      ${hydrated.cards.map((item, index) => `<article class="result-card" data-reveal-index="${index}">
        <p class="position-label">${escapeHTML(item.position)}</p>
        <div class="reveal-card">
          <div class="reveal-face card-back" aria-hidden="true"></div>
          <div class="reveal-face card-front">${classicCard(item.card, { orientation: item.orientation, eager: true })}</div>
        </div>
        <p class="basic-name">${escapeHTML(item.card.name)}</p>
      </article>`).join("")}
    </section>
    <article class="reading-copy" id="reading-copy">${readingCopyMarkup(hydrated)}</article>
  `, { className: "result-page" });
}

function hydrateReading(reading) {
  return {
    ...reading,
    cards: (reading.cards || []).map((item, index) => ({
      ...item,
      position: item.position || spreads[reading.spreadId]?.positions[index] || `第 ${index + 1} 张`,
      orientation: item.orientation === "reversed" ? "reversed" : "upright",
      card: cardFor(item)
    }))
  };
}

function renderGuide() {
  const rules = [
    "不探讨与健康、年龄相关的话题。",
    "不涉及任何形式的博彩、抽奖类内容，不预测考试结果、抽奖运势等。",
    "已有明确答案的问题不建议重复提出。",
    "不承接过于长远的未来预测，塔罗更适用于短期趋势分析，通常为几个月内，最长不超过两年。",
    "同一问题请避免短期内多次询问。",
    "情绪不稳定或身体不适时不建议进行占卜。"
  ];
  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">ASK WITH CLARITY</p>
      <h2>塔罗怎么问问题</h2>
      <p class="page-lead">一个靠近当下、能由你采取行动的问题，通常比追问确定结局更有帮助。</p>
    </div>
    <div class="guide-list">${rules.map((rule) => `<div class="guide-rule">${rule}</div>`).join("")}</div>
    <p class="guide-closing">塔罗仅作为一种辅助工具，帮助使用者更好地了解自身现状与短期发展趋势。请理性看待结果，避免过度投入情绪。</p>
  `);
}

function renderPolicy() {
  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">TERMS & CARE</p>
      <h2>使用说明</h2>
      <p class="page-lead">关于你的数据、解读来源和这项工具的边界。</p>
    </div>
    <div class="policy-sections">
      <section class="policy-section"><h3>隐私政策</h3><p>占卜记录、身份档案、昼夜偏好和每日次数保存在当前浏览器；生成解读时，本次问题、牌面和你主动选择的补充信息会发送到这台电脑上的本地服务。记录最多保留两年；清除浏览器数据或更换设备后无法恢复。请不要输入姓名、联系方式、地址、证件号码、账号或其他可识别个人的信息。</p></section>
      <section class="policy-section"><h3>AI 服务说明</h3><p>正式发布版本使用 Cloudflare Workers AI 托管的 Qwen 生成解读；本地预览则使用本机 Ollama 与 Qwen。若 AI 服务暂时不可用，页面会保留基础牌义解读。问题、牌面和主动填写的补充信息会发送到对应的 AI 服务，请不要输入可识别个人的信息。</p></section>
      <section class="policy-section"><h3>内容免责声明</h3><p>ASTERIA 用于自我反思和梳理当下，不预知未来，不替代医疗、法律、心理、财务或其他专业意见。医疗、年龄、博彩、考试结果、抽奖、法律、投资、自伤和他人安全类问题不会进入常规解读。</p></section>
    </div>
  `);
}

function renderProfiles() {
  const profiles = allProfiles();
  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">LOCAL PROFILES</p>
      <h2>信息档案</h2>
      <p class="page-lead">无需登录。所有字段均为选填，档案只保存在当前浏览器；本人档案最多一个，嘉宾档案可创建多个。</p>
    </div>
    <div class="content-panel">
      <div class="profile-form">
        ${contextDropdown("profile-type", "档案类型", [{ value: "self", label: "本人" }, { value: "guest", label: "嘉宾" }], "self", "◈", false, "profile")}
        <div class="field"><label for="profile-nickname">自定义昵称</label><input id="profile-nickname" maxlength="20" placeholder="选填" /></div>
        ${contextDropdown("profile-zodiac", "星座", ["", ...zodiacOptions()], "", "✦", true, "profile")}
        ${contextDropdown("profile-gender", "性别", ["", "女性", "男性", "非二元", "不便说明"], "", "◌", false, "profile")}
        ${contextDropdown("profile-relationship", "情感状态", ["", "单身", "暧昧中", "恋爱中", "已婚", "分手后", "关系复杂"], "", "♡", false, "profile")}
        <button class="primary" data-action="save-profile">保存档案</button>
      </div>
      <div class="profile-list" id="profile-list">
        ${profiles.length ? profiles.map(profileRow).join("") : '<div class="empty-state">还没有档案。你可以先创建一个，也可以直接开始占卜。</div>'}
      </div>
    </div>
  `);
}

function profileRow(profile) {
  const title = profile.nickname || (profile.type === "self" ? "本人档案" : "未命名嘉宾");
  const details = [profile.type === "self" ? "本人" : "嘉宾", profile.gender, profile.zodiac, profile.relationshipStatus].filter(Boolean).join(" · ");
  return `<article class="profile-row">
    <span class="profile-avatar">${escapeHTML(profile.zodiac?.slice(0, 1) || (profile.type === "self" ? "我" : "客"))}</span>
    <div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(details)}</p></div>
    <button class="small-action delete" data-action="delete-profile" data-id="${profile.id}">删除</button>
  </article>`;
}

function renderFeedback() {
  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">FEEDBACK & SUPPORT</p>
      <h2>反馈与客服</h2>
      <p class="page-lead">告诉我们哪里不顺手，或你希望 ASTERIA 接下来变得怎样。邮箱不是必填项。</p>
    </div>
    <div class="content-panel feedback-form">
      <div class="field">
        <label for="feedback-content">反馈内容</label>
        <textarea id="feedback-content" maxlength="1000" placeholder="请尽量描述你遇到的页面、操作和实际情况。"></textarea>
        <small><span id="feedback-count">0</span> / 1000</small>
      </div>
      <div id="feedback-status" class="notice">本地预览尚未配置反馈后台。提交时会如实检查服务状态，不会伪造“已收到”。</div>
      <div class="form-actions"><button class="primary" id="feedback-submit" data-action="submit-feedback">提交反馈</button></div>
    </div>
  `);
}

function renderHistory() {
  return pageShell(`
    <div class="page-heading">
      <p class="eyebrow">YOUR ARCHIVE</p>
      <h2>历史记录</h2>
      <p class="page-lead">记录按时间倒序保存在当前浏览器，最长保留两年。</p>
    </div>
    <div class="content-panel">
      <div class="history-toolbar">
        <input id="history-search" type="search" placeholder="搜索问题关键词" aria-label="搜索问题关键词" />
        <select id="history-filter" aria-label="按牌阵筛选">
          <option value="all">全部牌阵</option>
          ${Object.values(spreads).map((spread) => `<option value="${spread.id}">${spread.name}</option>`).join("")}
        </select>
        <button class="danger" data-action="clear-history">清空全部</button>
      </div>
      <div class="history-list" id="history-list">${historyItems(getReadings())}</div>
    </div>
  `);
}

function historyItems(readings) {
  const sorted = [...readings].sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  if (!sorted.length) return '<div class="empty-state">还没有记录。完成第一次抽牌后，它会出现在这里。</div>';
  return sorted.map((reading) => {
    const hydrated = hydrateReading(reading);
    const thumbnails = hydrated.cards.slice(0, 4).map((item) => `<span class="history-thumb"><img src="${item.card.image}" alt="" loading="lazy" /></span>`).join("");
    const spread = spreads[hydrated.spreadId] || spreads.core;
    return `<article class="history-item">
      <div class="history-thumbs" aria-hidden="true">${thumbnails}</div>
      <div><h3>${escapeHTML(hydrated.question.slice(0, 42))}${hydrated.question.length > 42 ? "…" : ""}</h3><p class="history-meta">${formatDate(hydrated.createdAt)} · ${spread.name} · ${hydrated.aiStatus === "success" ? "AI 解读" : hydrated.aiStatus === "loading" ? "AI 生成中" : "基础牌义兜底"}</p></div>
      <button class="small-action" data-action="open-reading" data-id="${hydrated.id}">查看</button>
      <button class="small-action delete" data-action="delete-reading" data-id="${hydrated.id}">删除</button>
    </article>`;
  }).join("");
}

function render() {
  screenCleanup();
  screenCleanup = () => {};
  document.body.dataset.screen = state.screen;

  const renderers = {
    home: renderHome,
    question: renderQuestion,
    shuffle: renderShuffle,
    draw: renderDraw,
    result: () => renderResult(state.currentReading),
    guide: renderGuide,
    policy: renderPolicy,
    profiles: renderProfiles,
    feedback: renderFeedback,
    history: renderHistory
  };

  APP.innerHTML = (renderers[state.screen] || renderHome)();
  APP.focus({ preventScroll: true });

  if (state.screen === "shuffle") initShuffleScene();
  if (state.screen === "draw") initDrawScene();
  if (state.screen === "result") initReveal();
  if (state.screen === "question") initQuestionDetails();
  if (state.screen === "profiles") initContextDropdowns();
}

function navigate(screen) {
  state.screen = screen;
  state.validationMessage = "";
  window.scrollTo({ top: 0, behavior: "instant" });
  render();
}

function startSession() {
  state.question = "";
  state.selectedProfiles = [];
  state.context = { gender: "", zodiac: "", relationshipStatus: "", optionalText: "" };
  state.picks = [];
  state.deckOrder = [];
  state.currentReading = null;
  state.drawEntrance = null;
  navigate("question");
}

function activateFeature(feature) {
  if (feature === "theme") {
    toggleTheme(document.querySelector('[data-feature="theme"]'));
    return;
  }
  navigate(feature);
}

function initQuestionDetails() {
  const details = APP.querySelector(".context-details");
  if (details) {
    const summary = details.querySelector("summary");
    let openedByHover = false;
    details.addEventListener("mouseenter", () => {
      if (!details.open) {
        details.open = true;
        openedByHover = true;
      }
    });
    details.addEventListener("mouseleave", () => {
      if (openedByHover && !details.contains(document.activeElement)) {
        details.open = false;
        openedByHover = false;
      }
    });
    details.addEventListener("focusin", () => {
      details.open = true;
      if (!details.matches(":hover")) openedByHover = false;
    });
    summary?.addEventListener("click", (event) => {
      if (openedByHover) {
        event.preventDefault();
        openedByHover = false;
      }
    });
  }
  initContextDropdowns();
}

function getContextDropdown(key) {
  return APP.querySelector(`[data-context-dropdown="${CSS.escape(key)}"]`);
}

function closeContextDropdowns(exceptKey = "") {
  APP.querySelectorAll(".context-dropdown.is-open").forEach((dropdown) => {
    if (dropdown.dataset.contextDropdown === exceptKey) return;
    dropdown.classList.remove("is-open");
    const trigger = dropdown.querySelector(".context-trigger");
    const menu = dropdown.querySelector(".context-menu");
    trigger?.setAttribute("aria-expanded", "false");
    if (menu) {
      menu.hidden = true;
      menu.classList.remove("is-above");
    }
  });
}

function positionContextMenu(dropdown) {
  const menu = dropdown?.querySelector(".context-menu");
  const trigger = dropdown?.querySelector(".context-trigger");
  if (!menu || !trigger || menu.hidden) return;

  const triggerRect = trigger.getBoundingClientRect();
  const dropdownRect = dropdown.getBoundingClientRect();
  const viewportPadding = 12;
  const menuGap = 8;
  const roomAbove = triggerRect.top - viewportPadding - menuGap;
  const roomBelow = window.innerHeight - triggerRect.bottom - viewportPadding - menuGap;
  const baseMaxHeight = Math.min(330, window.innerHeight * 0.48);
  const desiredHeight = Math.min(menu.scrollHeight, baseMaxHeight);
  // Base the direction on available space rather than the menu's current
  // position. This keeps an already-upward menu stable while the page scrolls.
  const shouldOpenAbove = roomBelow < desiredHeight && roomAbove > roomBelow;
  const availableHeight = shouldOpenAbove ? roomAbove : roomBelow;
  menu.style.maxHeight = `${Math.max(120, Math.min(baseMaxHeight, availableHeight))}px`;
  menu.style.setProperty("--context-menu-above-offset", `${dropdownRect.bottom - triggerRect.top + menuGap}px`);
  menu.classList.toggle("is-above", shouldOpenAbove);
}

function repositionOpenContextMenus() {
  APP.querySelectorAll(".context-dropdown.is-open").forEach(positionContextMenu);
}

function openContextDropdown(key, focusOption = false) {
  const dropdown = getContextDropdown(key);
  if (!dropdown) return;
  closeContextDropdowns(key);
  dropdown.classList.add("is-open");
  const trigger = dropdown.querySelector(".context-trigger");
  const menu = dropdown.querySelector(".context-menu");
  trigger?.setAttribute("aria-expanded", "true");
  if (menu) {
    menu.hidden = false;
    positionContextMenu(dropdown);
  }
  if (focusOption) {
    const current = menu?.querySelector(".context-option.selected") || menu?.querySelector(".context-option");
    window.setTimeout(() => current?.focus(), 0);
  }
}

function toggleContextDropdown(key) {
  const dropdown = getContextDropdown(key);
  if (!dropdown) return;
  if (dropdown.classList.contains("is-open")) closeContextDropdowns();
  else openContextDropdown(key);
}

function selectContextValue(key, value) {
  const dropdown = getContextDropdown(key);
  const scope = dropdown?.dataset.dropdownScope || "context";
  if (scope === "profile") {
    const profileInput = dropdown?.querySelector("[data-profile-input]");
    if (profileInput) profileInput.value = value;
  } else {
    if (key === "gender") state.context.gender = value;
    if (key === "zodiac") state.context.zodiac = value;
    if (key === "relationship") state.context.relationshipStatus = value;
  }

  if (!dropdown) return;
  const selectedOption = dropdown.querySelector(`.context-option[data-context-value="${CSS.escape(value)}"]`);
  dropdown.querySelector(".context-value").textContent = selectedOption?.dataset.contextLabel || value || "不填写";
  dropdown.querySelectorAll(".context-option").forEach((option) => {
    const selected = option.dataset.contextValue === value;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
    const check = option.querySelector(".context-option-check");
    if (check) check.textContent = selected ? "✓" : "";
  });
  const search = dropdown.querySelector(".context-search");
  if (search) {
    search.value = "";
    filterContextOptions(search);
  }
  closeContextDropdowns();
  dropdown.querySelector(".context-trigger")?.focus();
}

function filterContextOptions(searchInput) {
  const dropdown = searchInput.closest(".context-dropdown");
  if (!dropdown) return;
  const query = searchInput.value.trim().toLowerCase();
  dropdown.querySelectorAll(".context-option").forEach((option) => {
    option.hidden = query && !option.textContent.trim().toLowerCase().includes(query);
  });
}

function initContextDropdowns() {
  const onPointerDown = (event) => {
    if (!event.target.closest(".context-dropdown")) closeContextDropdowns();
  };
  const onKeyDown = (event) => {
    const trigger = event.target.closest(".context-trigger");
    const option = event.target.closest(".context-option");
    if (event.key === "Escape") {
      closeContextDropdowns();
      return;
    }
    if (trigger && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      const key = trigger.dataset.context;
      if (!trigger.closest(".context-dropdown")?.classList.contains("is-open")) {
        openContextDropdown(key, event.key === "ArrowDown" || event.key === "ArrowUp");
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const options = [...trigger.closest(".context-dropdown").querySelectorAll(".context-option:not([hidden])")];
        const selectedIndex = Math.max(0, options.findIndex((item) => item.classList.contains("selected")));
        options[selectedIndex + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
      }
      return;
    }
    if (option && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const options = [...option.closest(".context-options").querySelectorAll(".context-option:not([hidden])")];
      const index = options.indexOf(option);
      options[index + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
    }
  };
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("keydown", onKeyDown);
  const onViewportChange = () => repositionOpenContextMenus();
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);
  const previousCleanup = screenCleanup;
  screenCleanup = () => {
    previousCleanup();
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onViewportChange);
    window.removeEventListener("scroll", onViewportChange, true);
  };
}

function validateQuestion() {
  const question = state.question.trim();
  if (!question) return "请先写下这次想探索的问题。";
  if (getUsage().completedCount >= 3) return "今天在这个浏览器中已经完成 3 次占卜，请明天再来。";

  const categories = [
    ["医疗或身体状况", /医疗|疾病|生病|诊断|治疗|手术|用药|怀孕|癌症|身体不适/],
    ["年龄或寿命", /年龄|多大年纪|寿命|活多久/],
    ["博彩、抽奖或考试结果", /博彩|赌博|下注|彩票|中奖|抽奖|考试结果|能否考上|能不能考上|录取结果/],
    ["法律或投资决定", /法律|诉讼|官司|判决|投资|股票|基金|期货|虚拟币|加密货币/],
    ["自伤或他人安全", /自杀|自伤|伤害自己|伤害他人|他人安全|想死|不想活/]
  ];
  const found = categories.find(([, pattern]) => pattern.test(question));
  if (found) return `这个问题涉及${found[0]}，不适合进入塔罗解读。请优先寻求对应的专业帮助或可信赖的现实支持。`;
  return "";
}

function beginShuffle() {
  const error = validateQuestion();
  if (error) {
    state.validationMessage = error;
    render();
    APP.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  state.deckOrder = shuffled(deck.map((card) => card.id));
  state.picks = [];
  state.shuffleFinishing = false;
  state.openShuffledDeck = null;
  navigate("shuffle");
}

function initShuffleScene() {
  const scene = document.querySelector("#shuffle-scene");
  const animation = CARD_ANIMATION;
  if (!scene || !animation) {
    if (!animation) console.error("GSAP failed to load; the shuffle scene cannot start.");
    return;
  }
  const cards = [...scene.querySelectorAll(".shuffle-card")];
  const deckObject = scene.querySelector("#shuffle-deck");
  const controls = scene.querySelector(".shuffle-controls");
  const stackBase = scene.querySelector(".shuffle-stack-base");
  const stackTrigger = scene.querySelector(".shuffle-stack-trigger");
  const threeStackHost = scene.querySelector("#three-card-stack");
  const heading = document.querySelector("#shuffle-title");
  const lead = document.querySelector("#shuffle-lead");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  galaxyController?.pause?.();
  const tau = Math.PI * 2;
  const motion = {
    phase: 0,
    gesturePhase: 0,
    targetGesturePhase: 0,
    intro: reduceMotion ? 1 : 0.02,
    energy: reduceMotion ? 0.16 : 0.12,
    pointerX: 0.5,
    pointerY: 0.5,
    targetX: 0.5,
    targetY: 0.5
  };
  const layouts = cards.map((_, index) => {
    const depth = ((index * 7) % 19) / 18;
    return {
      angle: (index / cards.length) * tau * 3.25 + ((index * 17) % 11) * 0.12,
      delay: (index % 9) * 0.012,
      depth,
      direction: index % 2 ? -1 : 1,
      gestureWeight: 0.48 + depth * 0.42,
      pointerXWeight: 0.42 + depth * 0.58,
      pointerYWeight: 0.38 + depth * 0.62,
      radiusX: 0.17 + (((index * 13) % 23) / 22) * 0.26,
      radiusY: 0.13 + (((index * 11) % 17) / 16) * 0.24,
      speed: 0.52 + ((index * 5) % 13) * 0.026,
      tilt: ((index * 29) % 58) - 29,
      wobble: ((index * 19) % 31) / 31 * tau
    };
  });
  // Keep one setter per transform property. Passing a CSS object every frame
  // makes CSSPlugin re-parse all properties for all 52 cards on every tick.
  const setters = cards.map((card) => ({
    x: animation.quickSetter(card, "x", "px"),
    y: animation.quickSetter(card, "y", "px"),
    rotation: animation.quickSetter(card, "rotation", "deg"),
    scaleX: animation.quickSetter(card, "scaleX"),
    scaleY: animation.quickSetter(card, "scaleY")
  }));
  let sceneRect = scene.getBoundingClientRect();
  let cardWidth = cards[0]?.offsetWidth || 60;
  let cardHeight = cards[0]?.offsetHeight || 90;
  let active = false;
  let pointerId = null;
  let lastGestureAngle = null;
  let gathering = false;
  let inspecting = false;
  let opening = false;
  let inspectPointerId = null;
  let inspectStartX = 0;
  let inspectStartY = 0;
  let inspectStartRotationX = 0;
  let inspectStartRotationY = 0;
  let entranceTimeline = null;
  let finishTimeline = null;
  let handoffTimer = 0;
  let handoffTimeline = null;
  let sceneCleanedUp = false;
  let handoffStarted = false;
  let currentStackGeometry = null;
  const stackRotation = { x: 0, y: 0 };
  const threeStack = createThreeCardStack(threeStackHost, { cardCount: SHUFFLE_VISUAL_CARD_COUNT });

  const updateMetrics = () => {
    sceneRect = scene.getBoundingClientRect();
    cardWidth = cards[0]?.offsetWidth || cardWidth;
    cardHeight = cards[0]?.offsetHeight || cardHeight;
  };

  const stackGeometry = () => {
    const targetWidth = Math.max(116, Math.min(sceneRect.width * (sceneRect.width >= 700 ? 0.17 : 0.3), 210));
    const layerDepth = sceneRect.width >= 700 ? 0.56 : 0.48;
    scene.style.setProperty("--shuffle-stack-width", `${targetWidth}px`);
    return {
      targetWidth,
      cardScale: targetWidth / cardWidth,
      baseScale: 1,
      layerDepth
    };
  };

  const settleInspection = () => {
    scene.classList.remove("is-inspect-dragging");
    if (threeStack) {
      animation.to(stackRotation, {
        x: 0,
        y: 0,
        duration: reduceMotion ? 0 : 0.72,
        ease: "power3.out",
        overwrite: "auto",
        onUpdate: () => threeStack.setRotation(stackRotation.y, stackRotation.x)
      });
      return;
    }
    animation.to(deckObject, {
      rotationX: 0,
      rotationY: 0,
      duration: reduceMotion ? 0 : 0.72,
      ease: "power3.out",
      overwrite: "auto"
    });
  };

  const renderFrame = (_, deltaTime = 16.67) => {
    if (gathering) return;
    const frameScale = Math.min(deltaTime, 34) / 16.67;
    const pointerEase = 1 - Math.pow(active ? 0.72 : 0.86, frameScale);
    const gestureEase = 1 - Math.pow(active ? 0.62 : 0.78, frameScale);
    motion.pointerX += (motion.targetX - motion.pointerX) * pointerEase;
    motion.pointerY += (motion.targetY - motion.pointerY) * pointerEase;
    motion.gesturePhase += (motion.targetGesturePhase - motion.gesturePhase) * gestureEase;
    motion.phase += frameScale * (0.008 + motion.energy * 0.026);

    const width = Math.max(1, sceneRect.width - cardWidth * 1.25);
    const height = Math.max(1, sceneRect.height - cardHeight * 1.45);
    const pointerOffsetX = (motion.pointerX - 0.5) * sceneRect.width * motion.energy * 0.26;
    const pointerOffsetY = (motion.pointerY - 0.5) * sceneRect.height * motion.energy * 0.2;

    for (let index = 0; index < layouts.length; index += 1) {
      const layout = layouts[index];
      const localIntro = Math.max(0, Math.min(1, motion.intro * 1.12 - layout.delay));
      const spread = 1 - Math.pow(1 - localIntro, 3);
      const angle = layout.angle
        + motion.phase * layout.speed * layout.direction
        + motion.gesturePhase * layout.gestureWeight;
      const pulse = Math.sin(angle * 1.7 + layout.wobble);
      const wash = Math.sin(angle * 2 + layout.wobble) * width * (0.018 + motion.energy * 0.018);
      const x = (
        Math.cos(angle) * width * layout.radiusX
        + wash
        + pointerOffsetX * layout.pointerXWeight
      ) * spread;
      const y = (
        Math.sin(angle) * height * layout.radiusY
        + Math.cos(angle * 1.35 + layout.wobble) * height * (0.018 + motion.energy * 0.02)
        + pointerOffsetY * layout.pointerYWeight
      ) * spread;
      const rotation = (layout.tilt + pulse * (8 + motion.energy * 18)) * spread;
      const scale = (1.08 - layout.depth * 0.16 + motion.energy * 0.025) * (0.94 + spread * 0.06);
      const setter = setters[index];
      setter.x(x);
      setter.y(y);
      setter.rotation(rotation);
      setter.scaleX(scale);
      setter.scaleY(scale);
    }
  };

  const setPointer = (event, trackGesture = false) => {
    const samples = event.getCoalescedEvents?.() || [event];
    const sample = samples.at(-1) || event;
    const nextX = Math.max(0, Math.min(1, (sample.clientX - sceneRect.left) / sceneRect.width));
    const nextY = Math.max(0, Math.min(1, (sample.clientY - sceneRect.top) / sceneRect.height));

    if (trackGesture) {
      const dx = nextX - 0.5;
      const dy = nextY - 0.5;
      if (Math.hypot(dx, dy) > 0.075) {
        const angle = Math.atan2(dy, dx);
        if (lastGestureAngle !== null) {
          let delta = angle - lastGestureAngle;
          if (delta > Math.PI) delta -= tau;
          if (delta < -Math.PI) delta += tau;
          motion.targetGesturePhase += Math.max(-0.32, Math.min(0.32, delta)) * 0.9;
        }
        lastGestureAngle = angle;
      } else {
        lastGestureAngle = null;
      }
    }

    motion.targetX = nextX;
    motion.targetY = nextY;
  };

  const onDown = (event) => {
    if (event.isPrimary === false || event.button > 0 || event.target.closest(".shuffle-controls")) return;
    if (inspecting) {
      if (event.target.closest(".shuffle-stack-trigger")) return;
      event.preventDefault();
      inspectPointerId = event.pointerId;
      inspectStartX = event.clientX;
      inspectStartY = event.clientY;
      inspectStartRotationX = threeStack ? stackRotation.x : Number(animation.getProperty(deckObject, "rotationX")) || 0;
      inspectStartRotationY = threeStack ? stackRotation.y : Number(animation.getProperty(deckObject, "rotationY")) || 0;
      animation.killTweensOf(threeStack ? stackRotation : deckObject);
      scene.classList.add("is-inspect-dragging");
      scene.setPointerCapture?.(event.pointerId);
      return;
    }
    if (gathering || opening) return;
    event.preventDefault();
    active = true;
    pointerId = event.pointerId;
    lastGestureAngle = null;
    updateMetrics();
    scene.classList.add("is-shuffling");
    scene.setPointerCapture?.(event.pointerId);
    setPointer(event, true);
    animation.to(motion, { energy: 1, duration: reduceMotion ? 0 : 0.42, ease: "power3.out", overwrite: "auto" });
  };
  const onMove = (event) => {
    if (inspecting && event.pointerId === inspectPointerId) {
      event.preventDefault();
      const deltaX = event.clientX - inspectStartX;
      const deltaY = event.clientY - inspectStartY;
      let rotationX = Math.max(-24, Math.min(24, inspectStartRotationX - deltaY / Math.max(1, sceneRect.height) * 82));
      let rotationY = Math.max(-32, Math.min(32, inspectStartRotationY + deltaX / Math.max(1, sceneRect.width) * 82));
      const combinedRotation = Math.hypot(rotationX, rotationY);
      if (combinedRotation > 32) {
        const rotationScale = 32 / combinedRotation;
        rotationX *= rotationScale;
        rotationY *= rotationScale;
      }
      if (threeStack) {
        stackRotation.x = rotationX;
        stackRotation.y = rotationY;
        threeStack.setRotation(rotationY, rotationX);
        return;
      }
      animation.set(deckObject, {
        rotationX,
        rotationY,
        force3D: true
      });
      return;
    }
    if (!active || event.pointerId !== pointerId) return;
    event.preventDefault();
    setPointer(event, true);
  };
  const onUp = (event) => {
    if (inspectPointerId != null && event?.pointerId === inspectPointerId) {
      const releasedPointerId = inspectPointerId;
      inspectPointerId = null;
      if (scene.hasPointerCapture?.(releasedPointerId)) scene.releasePointerCapture?.(releasedPointerId);
      settleInspection();
      return;
    }
    if (!active || gathering || (event?.pointerId != null && event.pointerId !== pointerId)) return;
    event?.preventDefault();
    const releasedPointerId = pointerId;
    active = false;
    pointerId = null;
    lastGestureAngle = null;
    if (releasedPointerId != null && scene.hasPointerCapture?.(releasedPointerId)) {
      scene.releasePointerCapture?.(releasedPointerId);
    }
    scene.classList.remove("is-shuffling");
    animation.to(motion, { energy: 0.16, duration: reduceMotion ? 0 : 0.5, ease: "power2.out", overwrite: "auto" });
    finishShuffle();
  };

  animation.set(cards, {
    xPercent: -50,
    yPercent: -50,
    autoAlpha: reduceMotion ? 1 : 0,
    force3D: true,
    transformOrigin: "50% 50%",
    zIndex: (index) => index + 2
  });
  animation.set(deckObject, {
    rotationX: 0,
    rotationY: 0,
    transformOrigin: "50% 50%",
    transformStyle: "preserve-3d",
    force3D: true
  });
  animation.set(stackBase, {
    xPercent: -50,
    yPercent: -43,
    rotation: -1.2,
    scale: 1,
    autoAlpha: 0,
    force3D: true
  });
  animation.set(threeStackHost, { autoAlpha: 0 });
  renderFrame(0, 16.67);

  if (!reduceMotion) {
    entranceTimeline = animation.timeline();
    entranceTimeline
      .to(cards, { autoAlpha: 1, duration: 0.24, stagger: { amount: 0.22, from: "center" }, ease: "power1.out" }, 0)
      .to(motion, { intro: 1, duration: 1.05, ease: "power3.out" }, 0);
    animation.ticker.add(renderFrame);
  }

  const resizeObserver = new ResizeObserver(() => {
    updateMetrics();
    if (!inspecting) return;
    const geometry = stackGeometry();
    currentStackGeometry = geometry;
    animation.set(cards, {
      z: (index) => -(cards.length - 1 - index) * geometry.layerDepth,
      scale: geometry.cardScale
    });
    animation.set(stackBase, {
      z: -(cards.length * geometry.layerDepth + 1),
      scale: geometry.baseScale
    });
  });
  resizeObserver.observe(scene);
  scene.addEventListener("pointerdown", onDown);
  scene.addEventListener("pointermove", onMove);
  scene.addEventListener("pointerup", onUp);
  scene.addEventListener("pointercancel", onUp);
  scene.addEventListener("lostpointercapture", onUp);

  screenCleanup = () => {
    sceneCleanedUp = true;
    gathering = true;
    animation.ticker.remove(renderFrame);
    animation.killTweensOf(motion);
    animation.killTweensOf(cards);
    animation.killTweensOf(deckObject);
    animation.killTweensOf(stackBase);
    animation.killTweensOf(stackRotation);
    animation.killTweensOf(threeStackHost);
    window.clearTimeout(handoffTimer);
    handoffTimer = 0;
    entranceTimeline?.kill();
    finishTimeline?.kill();
    handoffTimeline?.kill();
    resizeObserver.disconnect();
    threeStack?.dispose();
    galaxyController?.resume?.();
    scene.removeEventListener("pointerdown", onDown);
    scene.removeEventListener("pointermove", onMove);
    scene.removeEventListener("pointerup", onUp);
    scene.removeEventListener("pointercancel", onUp);
    scene.removeEventListener("lostpointercapture", onUp);
    state.finishShuffleScene = null;
    state.openShuffledDeck = null;
  };

  state.finishShuffleScene = () => {
    if (gathering) return;
    gathering = true;
    active = false;
    animation.ticker.remove(renderFrame);
    animation.killTweensOf(motion);
    entranceTimeline?.kill();
    scene.classList.remove("is-shuffling");
    scene.classList.add("is-gathering");
    scene.querySelector('[data-action="finish-shuffle"]')?.setAttribute("disabled", "");

    const geometry = stackGeometry();
    currentStackGeometry = geometry;
    const gatherDuration = reduceMotion ? 0.01 : 0.78;
    const gatherStagger = reduceMotion ? 0 : 0.006;
    // Build the transition paused. The WebGL texture is asynchronous; waiting
    // for it before hiding the DOM cards prevents a dark, untextured frame.
    finishTimeline = animation.timeline({ paused: true, defaults: { overwrite: "auto" } });
    finishTimeline.to(controls, { autoAlpha: 0, y: 8, duration: reduceMotion ? 0.01 : 0.2, ease: "power1.out" }, 0);

    // Keep gather transform-only. A single GSAP tween with function-based
    // values avoids creating 52 timeline children and keeps compositor work
    // predictable on every frame.
    const gatherTargets = cards.map((card, index) => {
      const layer = cards.length - 1 - index;
      return {
        card,
        x: Math.sin(index * 1.73) * 0.34,
        y: layer * 0.035 + Math.cos(index * 1.27) * 0.12,
        z: -layer * geometry.layerDepth,
        rotation: Math.sin(index * 1.41) * 0.18,
        zIndex: index + 10
      };
    });
    finishTimeline.to(cards, {
      x: (index) => gatherTargets[index].x,
      y: (index) => gatherTargets[index].y,
      z: (index) => gatherTargets[index].z,
      rotation: (index) => gatherTargets[index].rotation,
      scale: geometry.cardScale,
      zIndex: (index) => gatherTargets[index].zIndex,
      duration: gatherDuration,
      ease: "power3.inOut",
      overwrite: "auto",
      stagger: gatherStagger
    }, 0);

    const gatherCompleteAt = reduceMotion
      ? 0.02
      : (cards.length - 1) * gatherStagger + gatherDuration;
    if (threeStack) {
      // Capture the exact DOM transforms once, then let the same Three.js
      // instance animate those cards into the final stack. There is no layer
      // swap at the end: the WebGL deck is already visible and moving.
      const cardStates = cards.map((card) => ({
        x: Number(animation.getProperty(card, "x")) || 0,
        y: Number(animation.getProperty(card, "y")) || 0,
        rotation: Number(animation.getProperty(card, "rotation")) || 0,
        scale: Number(animation.getProperty(card, "scaleX")) || 1
      }));
      threeStack.prepareGather(cardStates, {
        cardWidth,
        duration: gatherDuration,
        stagger: gatherStagger
      });
      animation.set(stackBase, { autoAlpha: 0 });
      animation.set(threeStackHost, { autoAlpha: 0 });
      animation.set(cards, { autoAlpha: 1 });
      const gatherClock = { value: 0 };
      finishTimeline.to(gatherClock, {
        value: gatherCompleteAt,
        duration: gatherCompleteAt,
        ease: "none",
        onUpdate: () => threeStack.setGatherProgress(gatherClock.value),
        onComplete: () => {
          threeStack.setGatherProgress(gatherCompleteAt);
          window.clearTimeout(handoffTimer);
          handoffTimer = 0;
          scene.classList.add("is-stacked");
          gathering = false;
          inspecting = true;
          scene.classList.remove("is-gathering");
          scene.classList.add("is-inspecting");
          scene.setAttribute("aria-label", "洗好的牌堆，可在牌堆外上下左右拖动查看厚度");
          stackTrigger.disabled = false;
          if (heading) heading.textContent = "牌已归位";
          if (lead) lead.textContent = "在牌堆外上下左右拖动查看厚度，点击牌堆进入选牌。";
        }
      }, 0);
      // Reveal the WebGL scene only after its texture has been uploaded. The
      // DOM cards stay visible while waiting, so there is no blank or blurry
      // placeholder frame even on a cold cache.
      threeStack.ready.then((textureReady) => {
        if (sceneCleanedUp || handoffStarted || opening) return;
        if (!textureReady) console.warn("Three.js card texture was unavailable; continuing with the renderer fallback.");
        handoffStarted = true;
        threeStack.setGatherProgress(0);
        animation.killTweensOf(cards);
        animation.set(threeStackHost, { autoAlpha: 1 });
        animation.set(cards, { autoAlpha: 0 });
        finishTimeline.play(0);

        // Keep a bounded safety net for throttled tabs; it only completes the
        // same Three.js transition and never resurrects the DOM fallback.
        handoffTimer = window.setTimeout(() => {
          if (!gathering || opening || sceneCleanedUp) return;
          threeStack.setGatherProgress(gatherCompleteAt);
          gathering = false;
          inspecting = true;
          scene.classList.add("is-stacked", "is-inspecting");
          scene.classList.remove("is-gathering");
          stackTrigger.disabled = false;
          if (heading) heading.textContent = "牌已归位";
          if (lead) lead.textContent = "在牌堆外上下左右拖动查看厚度，点击牌堆进入选牌。";
        }, (gatherCompleteAt + 0.3) * 1000);
      });
    } else {
      finishTimeline.add(() => {
        animation.set(cards, { autoAlpha: 0 });
        animation.set(stackBase, {
          autoAlpha: 1,
          z: -(cards.length * geometry.layerDepth + 1),
          scale: geometry.baseScale
        });
        gathering = false;
        inspecting = true;
        scene.classList.remove("is-gathering");
        scene.classList.add("is-inspecting");
        scene.setAttribute("aria-label", "洗好的牌堆，可在牌堆外上下左右拖动查看厚度");
        stackTrigger.disabled = false;
        if (heading) heading.textContent = "牌已归位";
        if (lead) lead.textContent = "在牌堆外上下左右拖动查看厚度，点击牌堆进入选牌。";
      }, gatherCompleteAt);
      finishTimeline.play(0);
    }
  };

  state.openShuffledDeck = () => {
    if (!inspecting || opening) return;
    opening = true;
    inspecting = false;
    inspectPointerId = null;
    animation.killTweensOf(deckObject);
    animation.killTweensOf(stackRotation);
    stackTrigger.disabled = true;
    state.deckOrder = shuffled(state.deckOrder);
    const sourceRect = stackTrigger.getBoundingClientRect();
    state.drawEntrance = {
      centerX: sourceRect.left + sourceRect.width / 2,
      centerY: sourceRect.top + sourceRect.height / 2,
      width: sourceRect.width,
      height: sourceRect.height
    };
    navigate("draw");
  };
}

function finishShuffle() {
  if (state.shuffleFinishing || state.screen !== "shuffle") return;
  state.shuffleFinishing = true;
  state.finishShuffleScene?.();
}

function initDrawScene() {
  const zone = document.querySelector("#card-fan");
  const track = document.querySelector("#card-fan-track");
  const animation = window.gsap;
  if (!zone || !track || !animation) {
    if (!animation) console.error("GSAP failed to load; the card fan cannot start.");
    return;
  }
  renderDrawSelection();

  const slots = [...track.querySelectorAll(".fan-card-slot")];
  const fanCards = slots.map((slot) => slot.querySelector(".fan-card"));
  const cardCount = slots.length;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const entranceSource = state.drawEntrance;
  state.drawEntrance = null;
  const autoRotationSpeed = 0.54;
  const fanState = { progress: 0 };
  const autoState = { speed: autoRotationSpeed };
  let visibleHalf = 0;
  let pixelsPerCard = 1;
  let circleRadius = 1;
  let circleCenterY = 0;
  let centerCardY = 0;
  let entranceTimeline = null;
  let settleTween = null;
  let wheelTween = null;
  let resizeFrame = 0;
  let wheelSettleTimer = 0;
  let autoResumeTimer = 0;
  let autoSpeedTween = null;
  let hasOpened = false;
  let wheelActive = false;
  let autoRunning = false;
  let hoveringFan = false;
  let wheelTarget = 0;
  let pointerId = null;
  let startX = 0;
  let startProgress = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let dragged = false;
  let suppressClickUntil = 0;

  const setters = slots.map((slot) => ({
    x: animation.quickSetter(slot, "x", "px"),
    y: animation.quickSetter(slot, "y", "px"),
    rotation: animation.quickSetter(slot, "rotation", "deg"),
    opacity: animation.quickSetter(slot, "opacity")
  }));

  const wrapProgress = (value) => ((value % cardCount) + cardCount) % cardCount;
  const clamp = animation.utils.clamp;
  const cyclicDistance = (index, progress) => {
    const wrapped = ((index - progress + cardCount / 2) % cardCount + cardCount) % cardCount;
    return wrapped - cardCount / 2;
  };

  const cardGeometry = (relative) => {
    const x = relative * pixelsPerCard;
    const safeX = Math.max(-circleRadius + 1, Math.min(circleRadius - 1, x));
    const y = circleCenterY + Math.sqrt(Math.max(0, circleRadius * circleRadius - safeX * safeX));
    const rotation = -Math.asin(safeX / circleRadius) * 180 / Math.PI;
    return { x, y, rotation };
  };

  const renderProgress = () => {
    const visibleCount = Math.min(cardCount, Math.max(1, Math.round(visibleHalf * 2 + 1)));
    const visibleIndices = new Set(slots
      .map((slot, index) => ({ index, distance: Math.abs(cyclicDistance(index, fanState.progress)) }))
      .sort((left, right) => left.distance - right.distance || left.index - right.index)
      .slice(0, visibleCount)
      .map((item) => item.index));

    slots.forEach((slot, index) => {
      const card = fanCards[index];
      const relative = cyclicDistance(index, fanState.progress);
      const distance = Math.abs(relative);
      const visible = visibleIndices.has(index);
      const picked = card.classList.contains("is-picked");
      const geometry = cardGeometry(relative);
      const edgeFade = Math.max(0.35, 1 - Math.max(0, distance - visibleHalf + 0.9) * 0.28);
      setters[index].x(geometry.x);
      setters[index].y(geometry.y);
      setters[index].rotation(geometry.rotation);
      setters[index].opacity(visible ? edgeFade : 0);
      slot.style.visibility = visible ? "visible" : "hidden";
      slot.style.pointerEvents = visible && !picked ? "auto" : "none";
      slot.style.zIndex = String(1000 - Math.round(distance * 10));
      card.style.pointerEvents = visible && !picked ? "auto" : "none";
      card.tabIndex = visible && !picked ? 0 : -1;
      card.setAttribute("aria-hidden", String(!visible));
    });
  };

  const tweenAutoSpeed = (speed, duration = 0.55) => {
    autoSpeedTween?.kill();
    if (reduceMotion || duration <= 0) {
      autoState.speed = speed;
      autoSpeedTween = null;
      return;
    }
    autoSpeedTween = animation.to(autoState, {
      speed,
      duration,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => {
        autoSpeedTween = null;
      }
    });
  };

  const pauseAutoRotation = () => {
    autoRunning = false;
    window.clearTimeout(autoResumeTimer);
    autoResumeTimer = 0;
    autoSpeedTween?.kill();
    autoSpeedTween = null;
    autoState.speed = 0;
  };

  const scheduleAutoRotation = (delay = 0, { force = false } = {}) => {
    if (reduceMotion) return;
    window.clearTimeout(autoResumeTimer);
    autoResumeTimer = window.setTimeout(() => {
      autoResumeTimer = 0;
      if (pointerId !== null || zone.classList.contains("is-opening") || document.hidden) {
        scheduleAutoRotation();
        return;
      }
      autoRunning = true;
      tweenAutoSpeed(hoveringFan && !force ? 0 : autoRotationSpeed);
    }, delay);
  };

  state.pauseFanAutoRotation = pauseAutoRotation;
  state.resumeFanAutoRotation = scheduleAutoRotation;

  const renderAutoRotation = (time, deltaTime) => {
    if (!autoRunning || document.hidden || autoState.speed <= 0) return;
    const elapsedSeconds = Math.min(deltaTime, 50) / 1000;
    fanState.progress = wrapProgress(fanState.progress + autoState.speed * elapsedSeconds);
    renderProgress();
  };

  const layoutFan = (animateEntrance = false) => {
    const rect = zone.getBoundingClientRect();
    const cardWidth = fanCards[0]?.offsetWidth || 60;
    const cardHeight = fanCards[0]?.offsetHeight || cardWidth * 1.5;
    const visibleCount = rect.width >= 1100 ? 17 : rect.width >= 700 ? 13 : 9;
    visibleHalf = (visibleCount - 1) / 2;
    pixelsPerCard = rect.width / Math.max(1, visibleHalf * 2);
    const halfSpan = pixelsPerCard * visibleHalf;
    centerCardY = Math.max(44, rect.height - cardHeight - 22);
    const desiredCurveRise = rect.width >= 700
      ? Math.min(rect.height * 0.46, rect.width * 0.16)
      : Math.min(rect.height * 0.34, cardHeight * 0.58);
    const curveRise = Math.min(desiredCurveRise, Math.max(48, centerCardY - 12));
    circleRadius = (halfSpan * halfSpan + curveRise * curveRise) / (2 * curveRise);
    circleCenterY = centerCardY - circleRadius;

    animation.set(slots, { xPercent: -50, force3D: true });
    animation.set(track, { clearProps: "transform" });
    renderProgress();

    entranceTimeline?.kill();
    if (animateEntrance && !reduceMotion) {
      zone.classList.add("is-opening");
      const visibleSlots = slots
        .filter((slot) => slot.style.visibility !== "hidden")
        .sort((left, right) => {
          const leftRelative = cyclicDistance(Number(left.dataset.fanIndex), fanState.progress);
          const rightRelative = cyclicDistance(Number(right.dataset.fanIndex), fanState.progress);
          return leftRelative - rightRelative;
        });
      const sourceX = entranceSource
        ? entranceSource.centerX - (rect.left + rect.width / 2)
        : 0;
      const sourceY = entranceSource
        ? entranceSource.centerY - rect.top - cardHeight / 2
        : centerCardY;
      const sourceScale = entranceSource
        ? clamp(0.35, 2.4, entranceSource.width / cardWidth)
        : 0.92;
      const pageChrome = entranceSource
        ? [
            document.querySelector(".draw-page .topbar"),
            document.querySelector(".draw-center-copy"),
            document.querySelector(".draw-confirm")
          ].filter(Boolean)
        : [];
      entranceTimeline = animation.timeline({
        onComplete: () => {
          zone.classList.remove("is-opening");
          renderProgress();
          if (entranceSource) {
            autoState.speed = autoRotationSpeed * 0.28;
            autoRunning = true;
            tweenAutoSpeed(autoRotationSpeed, 0.55);
          } else {
            scheduleAutoRotation();
          }
        }
      });
      entranceTimeline
        .fromTo(visibleSlots, {
        x: sourceX,
        y: sourceY,
        rotation: 0,
        autoAlpha: entranceSource ? 1 : 0,
        scale: sourceScale,
        transformOrigin: "50% 50%"
      }, {
        x: (item, slot) => cardGeometry(cyclicDistance(Number(slot.dataset.fanIndex), fanState.progress)).x,
        y: (item, slot) => cardGeometry(cyclicDistance(Number(slot.dataset.fanIndex), fanState.progress)).y,
        rotation: (item, slot) => cardGeometry(cyclicDistance(Number(slot.dataset.fanIndex), fanState.progress)).rotation,
        autoAlpha: 1,
        scale: 1,
        duration: entranceSource ? 0.9 : 0.82,
        ease: entranceSource ? "power3.inOut" : "power3.out",
        stagger: { amount: entranceSource ? 0.34 : 0.22, from: "center" }
      }, 0);
      if (pageChrome.length) {
        entranceTimeline.fromTo(pageChrome, {
          autoAlpha: 0,
          y: 8
        }, {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          ease: "power2.out",
          stagger: 0.04
        }, entranceSource ? 0.56 : 0.16);
      }
    }
  };

  const settleTo = (value, { duration = 0.62, onComplete } = {}) => {
    const destination = Math.round(value);
    settleTween?.kill();
    if (reduceMotion) {
      fanState.progress = wrapProgress(destination);
      renderProgress();
      onComplete?.();
      return;
    }
    settleTween = animation.to(fanState, {
      progress: destination,
      duration,
      ease: "power3.out",
      overwrite: true,
      onUpdate: renderProgress,
      onComplete: () => {
        settleTween = null;
        fanState.progress = wrapProgress(fanState.progress);
        renderProgress();
        onComplete?.();
      }
    });
  };

  const onPointerDown = (event) => {
    if (event.button !== 0 || zone.classList.contains("is-opening")) return;
    pauseAutoRotation();
    settleTween?.kill();
    wheelTween?.kill();
    window.clearTimeout(wheelSettleTimer);
    wheelActive = false;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startProgress = fanState.progress;
    lastTime = performance.now();
    velocity = 0;
    dragged = false;
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== pointerId) return;
    const now = performance.now();
    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) > 4 && !dragged) {
      dragged = true;
      zone.classList.add("is-dragging");
      zone.setPointerCapture?.(pointerId);
    }
    velocity = velocity * 0.62 + ((event.clientX - lastX) / Math.max(8, now - lastTime)) * 0.38;
    lastX = event.clientX;
    lastTime = now;
    fanState.progress = startProgress - deltaX / pixelsPerCard;
    renderProgress();
    if (dragged) event.preventDefault();
  };

  const endPointer = (event) => {
    if (event.pointerId !== pointerId) return;
    if (zone.hasPointerCapture?.(pointerId)) zone.releasePointerCapture(pointerId);
    pointerId = null;
    zone.classList.remove("is-dragging");
    if (dragged) {
      suppressClickUntil = performance.now() + 260;
      const staleTime = Math.max(0, performance.now() - lastTime - 32);
      const releaseVelocity = velocity * Math.exp(-staleTime / 90);
      const projectedCards = clamp(-6, 6, -releaseVelocity * 320 / pixelsPerCard);
      settleTo(fanState.progress + projectedCards, {
        duration: clamp(0.48, 0.92, 0.5 + Math.abs(projectedCards) * 0.075),
        onComplete: () => scheduleAutoRotation()
      });
    } else {
      scheduleAutoRotation(0, { force: true });
    }
  };

  const onWheel = (event) => {
    if (event.ctrlKey || zone.classList.contains("is-opening")) return;
    event.preventDefault();
    pauseAutoRotation();
    settleTween?.kill();
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 18
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? zone.clientWidth
        : 1;
    const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const delta = clamp(-240, 240, rawDelta * unit);
    if (!wheelActive) {
      wheelActive = true;
      wheelTarget = fanState.progress;
    }
    wheelTarget += delta / Math.max(90, pixelsPerCard * 1.25);
    wheelTween?.kill();
    wheelTween = animation.to(fanState, {
      progress: wheelTarget,
      duration: 0.24,
      ease: "power2.out",
      overwrite: true,
      onUpdate: renderProgress
    });
    window.clearTimeout(wheelSettleTimer);
    wheelSettleTimer = window.setTimeout(() => {
      wheelSettleTimer = 0;
      wheelActive = false;
      wheelTween?.kill();
      wheelTween = null;
      settleTo(wheelTarget, {
        duration: 0.5,
        onComplete: () => scheduleAutoRotation()
      });
    }, 150);
  };

  const onKeyDown = (event) => {
    const amounts = { ArrowLeft: -1, ArrowRight: 1, PageUp: -5, PageDown: 5 };
    if (!(event.key in amounts)) return;
    pauseAutoRotation();
    wheelTween?.kill();
    window.clearTimeout(wheelSettleTimer);
    wheelActive = false;
    settleTo(fanState.progress + amounts[event.key], {
      onComplete: () => scheduleAutoRotation()
    });
    event.preventDefault();
  };

  const onPointerEnter = (event) => {
    if (event.pointerType !== "mouse") return;
    hoveringFan = true;
    window.clearTimeout(autoResumeTimer);
    autoResumeTimer = 0;
    if (pointerId === null && !document.hidden && !zone.classList.contains("is-opening")) {
      autoRunning = true;
      tweenAutoSpeed(0);
    }
  };

  const onPointerLeave = (event) => {
    if (event.pointerType !== "mouse") return;
    hoveringFan = false;
    scheduleAutoRotation();
  };

  const onVisibilityChange = () => {
    if (document.hidden) pauseAutoRotation();
    else scheduleAutoRotation();
  };

  const suppressDraggedClick = (event) => {
    if (performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onResize = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => layoutFan(false));
  };

  zone.addEventListener("pointerdown", onPointerDown);
  zone.addEventListener("pointermove", onPointerMove);
  zone.addEventListener("pointerup", endPointer);
  zone.addEventListener("pointercancel", endPointer);
  zone.addEventListener("pointerenter", onPointerEnter);
  zone.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("wheel", onWheel, { passive: false });
  zone.addEventListener("keydown", onKeyDown);
  zone.addEventListener("click", suppressDraggedClick, true);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibilityChange);
  animation.ticker.add(renderAutoRotation);
  layoutFan(!hasOpened);
  hasOpened = true;
  if (!entranceTimeline) scheduleAutoRotation();

  screenCleanup = () => {
    cancelAnimationFrame(resizeFrame);
    window.clearTimeout(wheelSettleTimer);
    window.clearTimeout(autoResumeTimer);
    entranceTimeline?.kill();
    settleTween?.kill();
    wheelTween?.kill();
    autoSpeedTween?.kill();
    if (state.pauseFanAutoRotation === pauseAutoRotation) {
      delete state.pauseFanAutoRotation;
      delete state.resumeFanAutoRotation;
    }
    stopCardFlights();
    animation.killTweensOf([fanState, ...slots]);
    animation.ticker.remove(renderAutoRotation);
    zone.removeEventListener("pointerdown", onPointerDown);
    zone.removeEventListener("pointermove", onPointerMove);
    zone.removeEventListener("pointerup", endPointer);
    zone.removeEventListener("pointercancel", endPointer);
    zone.removeEventListener("pointerenter", onPointerEnter);
    zone.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("wheel", onWheel);
    zone.removeEventListener("keydown", onKeyDown);
    zone.removeEventListener("click", suppressDraggedClick, true);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

function renderDrawSelection({ arrivingCardId = "", leavingCardId = "", animateLayout = true } = {}) {
  const zone = document.querySelector("#selection-zone");
  if (!zone) return null;

  const existingCards = [...zone.querySelectorAll(".selected-draw-card")];
  const retainedCards = existingCards.filter((card) => card.dataset.card !== leavingCardId);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const flipState = animateLayout && !reduceMotion && window.Flip && retainedCards.length
    ? window.Flip.getState(retainedCards)
    : null;
  const cardsById = new Map(existingCards.map((card) => [card.dataset.card, card]));
  const nextCardIds = new Set(state.picks.map((pick) => pick.cardId));

  state.picks.forEach((pick, index) => {
    let card = cardsById.get(pick.cardId);
    if (!card) {
      card = document.createElement("button");
      card.className = "selected-draw-card card-back";
      card.dataset.action = "return-pick";
      card.dataset.card = pick.cardId;
    }
    card.setAttribute("aria-label", `放回第 ${index + 1} 张牌`);
    if (pick.cardId === arrivingCardId) card.classList.add("is-flight-target");
    zone.appendChild(card);
  });

  existingCards.forEach((card) => {
    if (!nextCardIds.has(card.dataset.card)) card.remove();
  });

  if (flipState) {
    window.Flip.from(flipState, {
      duration: 0.56,
      ease: "power3.inOut",
      simple: true,
      absolute: false,
      overwrite: "auto"
    });
  }

  document.querySelectorAll(".fan-card").forEach((element) => {
    const picked = state.picks.some((item) => item.cardId === element.dataset.card);
    const slot = element.closest(".fan-card-slot");
    element.classList.toggle("is-picked", picked);
    element.disabled = picked;
    if (slot) slot.style.pointerEvents = picked || slot.style.visibility === "hidden" ? "none" : "auto";
  });

  const copy = document.querySelector("#remaining-copy");
  if (copy) copy.textContent = remainingCopy();
  const confirm = document.querySelector("#draw-confirm");
  if (confirm) confirm.disabled = state.picks.length !== spreads[state.selectedSpread].positions.length;
  return arrivingCardId
    ? zone.querySelector(`.selected-draw-card[data-card="${CSS.escape(arrivingCardId)}"]`)
    : null;
}

function cardFlightMetrics(element) {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  const slot = element.closest(".fan-card-slot");
  const scale = Number(CARD_ANIMATION?.getProperty(element, "scaleX")) || 1;
  return {
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
    width: element.offsetWidth || rect.width,
    height: element.offsetHeight || rect.height,
    scale,
    rotation: slot ? Number(CARD_ANIMATION?.getProperty(slot, "rotation")) || 0 : 0
  };
}

function stopCardFlights() {
  activeCardFlights.forEach((flight) => {
    flight.timeline.kill();
    flight.clone.remove();
    flight.target?.classList.remove("is-flight-target");
  });
  activeCardFlights.clear();
  if (galaxyPausedForCardFlight) {
    galaxyController?.resume?.();
    galaxyPausedForCardFlight = false;
  }
}

function pauseGalaxyForCardFlight() {
  if (activeCardFlights.size > 0 || galaxyPausedForCardFlight) return;
  galaxyController?.pause?.();
  galaxyPausedForCardFlight = true;
}

function resumeGalaxyAfterCardFlight() {
  if (activeCardFlights.size > 0 || !galaxyPausedForCardFlight) return;
  galaxyController?.resume?.();
  galaxyPausedForCardFlight = false;
}

function animateCardFlight(sourceMetrics, targetMetrics, target) {
  if (!sourceMetrics || !targetMetrics || !target || !CARD_ANIMATION) {
    target?.classList.remove("is-flight-target");
    return;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    target.classList.remove("is-flight-target");
    CARD_ANIMATION.set(target, { clearProps: "transform,opacity,visibility" });
    return;
  }

  pauseGalaxyForCardFlight();

  const clone = document.createElement("div");
  clone.className = "flying-card card-back";
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    left: `${sourceMetrics.centerX - sourceMetrics.width / 2}px`,
    top: `${sourceMetrics.centerY - sourceMetrics.height / 2}px`,
    width: `${sourceMetrics.width}px`,
    height: `${sourceMetrics.height}px`
  });
  document.body.appendChild(clone);

  const dx = targetMetrics.centerX - sourceMetrics.centerX;
  const dy = targetMetrics.centerY - sourceMetrics.centerY;
  const targetScale = targetMetrics.width / sourceMetrics.width;
  const travelDistance = Math.hypot(dx, dy);
  // Keep the flight on one monotonic line. The previous multi-point path
  // changed direction near the start, which made a dropped frame feel like a
  // deliberate pause even when the browser was rendering at 60fps.
  const travelDuration = Math.min(1.08, Math.max(0.78, 0.62 + travelDistance / 1450));
  const flight = { timeline: null, clone, target };
  const cleanup = () => {
    target.classList.remove("is-flight-target");
    CARD_ANIMATION.set(target, { clearProps: "transform,opacity,visibility" });
    clone.remove();
    activeCardFlights.delete(flight);
    resumeGalaxyAfterCardFlight();
  };
  const timeline = CARD_ANIMATION.timeline({ onComplete: cleanup, onInterrupt: cleanup });
  flight.timeline = timeline;
  activeCardFlights.add(flight);

  CARD_ANIMATION.set(clone, {
    x: 0,
    y: 0,
    scale: sourceMetrics.scale,
    rotation: sourceMetrics.rotation,
    autoAlpha: 1,
    force3D: true
  });

  timeline.to(clone, {
    x: dx,
    y: dy,
    scale: targetScale,
    rotation: `${targetMetrics.rotation}_short`,
    duration: travelDuration,
    // Keep only a restrained acceleration/deceleration: enough inertia to
    // feel physical, without the pronounced rush-and-stall of power2.out.
    ease: "power1.inOut",
    autoRound: false,
    force3D: true
  });
}

function pickOrbitCard(cardId, source) {
  const limit = spreads[state.selectedSpread].positions.length;
  if (state.picks.length >= limit || state.picks.some((item) => item.cardId === cardId)) return;
  const sourceMetrics = cardFlightMetrics(source);
  const orientation = crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? "upright" : "reversed";
  state.picks.push({ cardId, orientation });
  const target = renderDrawSelection({ arrivingCardId: cardId });
  animateCardFlight(sourceMetrics, cardFlightMetrics(target), target);
  // A deliberate selection overrides the fan hover slowdown, even when the
  // pointer remains over the fan while the card flies to the selection zone.
  state.resumeFanAutoRotation?.(0, { force: true });
}

function returnPickedCard(cardId, source) {
  const sourceMetrics = cardFlightMetrics(source);
  const target = document.querySelector(`.fan-card[data-card="${CSS.escape(cardId)}"]`);
  target?.classList.add("is-flight-target");
  state.picks = state.picks.filter((item) => item.cardId !== cardId);
  renderDrawSelection({ leavingCardId: cardId });
  animateCardFlight(sourceMetrics, cardFlightMetrics(target), target);
  state.resumeFanAutoRotation?.(0, { force: true });
}

function yesNoTag(cardId) {
  const no = new Set(["swords-3", "swords-5", "swords-6", "swords-7", "swords-8", "swords-9", "swords-10", "swords-12", "cups-5", "cups-7", "cups-8", "major-13", "major-15", "major-16", "major-18"]);
  const neutral = new Set(["swords-4", "cups-4", "major-9", "major-12"]);
  const unknown = new Set(["swords-2", "wands-10"]);
  const effort = new Set(["wands-5", "wands-7"]);
  if (no.has(cardId)) return "否定";
  if (neutral.has(cardId)) return "中性";
  if (unknown.has(cardId)) return "暂未可知";
  if (effort.has(cardId)) return "倾向肯定，但需努力争取";
  return "肯定";
}

function fallbackReading(reading) {
  const items = reading.cards.map((item) => ({ ...item, card: deckById.get(item.cardId) }));
  const first = items[0].card;
  const last = items[items.length - 1].card;
  let opening;

  if (reading.spreadId === "yesno") {
    const tags = items.map((item) => yesNoTag(item.cardId));
    const yesCount = tags.filter((tag) => tag.startsWith("肯定") || tag.startsWith("倾向")).length;
    const noCount = tags.filter((tag) => tag === "否定").length;
    const verdict = yesCount > noCount ? "整体更偏向肯定，但条件仍需要你主动推动" : noCount > yesCount ? "整体更偏向否定，眼下并不是硬推结果的好时机" : "现在的条件还没有形成单一答案";
    opening = `${verdict}。${first.name}把起点落在${first.meaning}，而${last.name}让结尾回到${last.meaning}；真正值得看的，是这两股力量之间有没有现实支撑。`;
  } else if (reading.spreadId === "relationship") {
    opening = `这段关系目前最明显的不是一个简单的“靠近或离开”，而是双方节奏与真实需求能不能被看见。${first.name}和${last.name}一前一后出现，让${first.meaning}与${last.meaning}同时成为局面的关键。`;
  } else {
    opening = `这组牌把重点指向一个很实际的矛盾：你已经感觉到问题需要变化，但真正的突破不只靠更用力，而要先看清力量应该放在哪里。${first.name}定下了${first.meaning}的主调，${last.name}则把出口引向${last.meaning}。`;
  }

  const middle = items.map((item, index) => {
    const inward = item.orientation === "reversed"
      ? "这股力量目前更像是被压住、被过度使用，或还没有找到合适的出口"
      : "这股力量已经浮到台前，可以被你更清楚地辨认和使用";
    const relation = index === 0
      ? ""
      : `它也在回应前一张${items[index - 1].card.name}：前者强调的${items[index - 1].card.meaning}，会直接改变这里的表达方式。`;
    return `${item.position}落在${item.card.name}。它关注的是${item.card.meaning}。${inward}。${relation}`;
  });

  const ending = reading.spreadId === "yesno"
    ? "别急着把这次结果当成盖章。先确认关键条件是否真的存在，再做一个可以观察后果的小决定；条件改变，趋势也会随之改变。"
    : reading.spreadId === "relationship"
      ? "接下来最有用的动作，是把猜测改成一次具体沟通：只说事实、感受和你的边界，不替对方预设答案。给关系一点验证真实的空间，再决定投入多少。"
      : "接下来先做一件能在一周内完成的小事：砍掉一个分散注意力的动作，使用已经存在的资源，并给结果设一个可观察的节点。你需要的不是一次性解决全部，而是让局面开始移动。";

  return [opening, ...middle, ending].join("\n\n");
}

function aiRequestPayload(reading) {
  const hydrated = hydrateReading(reading);
  const profiles = allProfiles().filter((profile) => reading.selectedProfiles.includes(profile.id));
  return {
    question: hydrated.question,
    spreadId: hydrated.spreadId,
    cards: hydrated.cards.map((item) => ({
      cardId: item.card.id,
      position: item.position,
      orientation: item.orientation,
      name: item.card.name,
      englishName: item.card.en,
      meaning: item.card.meaning
    })),
    optionalContext: hydrated.optionalContext,
    profiles
  };
}

function persistReading(reading) {
  const readings = getReadings().map((item) => item.id === reading.id ? reading : item);
  write(KEYS.readings, readings);
}

function updateVisibleReading(reading) {
  if (state.currentReading?.id !== reading.id) return;
  state.currentReading = reading;
  if (state.screen !== "result") return;
  const copy = document.querySelector("#reading-copy");
  if (copy) copy.innerHTML = readingCopyMarkup(hydrateReading(reading));
}

async function requestAiReading(reading) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 185_000);
  try {
    const response = await fetch(apiUrl("/api/reading"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(aiRequestPayload(reading)),
      signal: controller.signal
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.reading) {
      throw new Error(result.error?.message || `本地 AI 请求失败（${response.status}）`);
    }

    const updated = {
      ...reading,
      aiReading: result.reading,
      aiStatus: "success",
      aiModel: result.model || "qwen2.5:3b",
      aiModelDisplay: result.displayModel || "QWEN2.5 3B",
      aiError: ""
    };
    persistReading(updated);
    updateVisibleReading(updated);
  } catch (error) {
    const updated = {
      ...reading,
      aiStatus: "fallback",
      aiError: error.name === "AbortError" ? "本地 AI 生成超时" : (error.message || "本地 AI 暂时不可用")
    };
    persistReading(updated);
    updateVisibleReading(updated);
    console.warn("Local AI reading unavailable; using the browser fallback.", error);
  } finally {
    window.clearTimeout(timeout);
    activeAiReadingIds.delete(reading.id);
  }
}

function confirmDraw() {
  const spread = spreads[state.selectedSpread];
  if (state.picks.length !== spread.positions.length) return;
  const usage = getUsage();
  if (usage.completedCount >= 3) {
    notify("今天在这个浏览器中已经完成 3 次占卜。");
    return;
  }

  const createdAt = new Date();
  const reading = {
    id: uid(),
    createdAt: createdAt.toISOString(),
    question: state.question.trim(),
    spreadId: spread.id,
    cards: state.picks.map((pick, index) => ({
      cardId: pick.cardId,
      position: spread.positions[index],
      orientation: pick.orientation
    })),
    selectedProfiles: [...state.selectedProfiles],
    optionalContext: { ...state.context },
    aiReading: "",
    aiStatus: "loading",
    aiError: "",
    expiresAt: new Date(createdAt.setFullYear(createdAt.getFullYear() + 2)).toISOString()
  };
  reading.aiReading = fallbackReading(reading);

  activeAiReadingIds.add(reading.id);
  const readings = getReadings();
  readings.push(reading);
  write(KEYS.readings, readings);
  write(KEYS.usage, { date: usage.date, completedCount: usage.completedCount + 1 });
  state.currentReading = reading;
  navigate("result");
  void requestAiReading(reading);
}

function initReveal() {
  const cards = [...document.querySelectorAll(".result-card")];
  const timers = cards.map((card, index) => window.setTimeout(() => card.classList.add("revealed"), 160 + index * 150));
  const previousCleanup = screenCleanup;
  screenCleanup = () => {
    previousCleanup();
    timers.forEach(window.clearTimeout);
  };
}

function saveProfile() {
  const profiles = getProfiles();
  const type = document.querySelector("#profile-type")?.value || "self";
  const now = new Date().toISOString();
  const profile = {
    id: type === "self" && profiles.self ? profiles.self.id : uid(),
    type,
    nickname: document.querySelector("#profile-nickname")?.value.trim() || "",
    gender: document.querySelector("#profile-gender")?.value || "",
    zodiac: document.querySelector("#profile-zodiac")?.value || "",
    relationshipStatus: document.querySelector("#profile-relationship")?.value || "",
    createdAt: type === "self" && profiles.self ? profiles.self.createdAt : now,
    updatedAt: now
  };
  if (type === "self") profiles.self = profile;
  else profiles.guests.push(profile);
  write(KEYS.profiles, profiles);
  notify(type === "self" && profiles.self ? "本人档案已保存到当前浏览器。" : "档案已保存到当前浏览器。");
  render();
}

function deleteProfile(id) {
  const profiles = getProfiles();
  if (profiles.self?.id === id) profiles.self = null;
  profiles.guests = profiles.guests.filter((profile) => profile.id !== id);
  state.selectedProfiles = state.selectedProfiles.filter((profileId) => profileId !== id);
  write(KEYS.profiles, profiles);
  notify("档案已从当前浏览器删除。");
  render();
}

function filterHistory() {
  const search = document.querySelector("#history-search")?.value.trim().toLowerCase() || "";
  const spreadId = document.querySelector("#history-filter")?.value || "all";
  const filtered = getReadings().filter((reading) => {
    const matchesSearch = !search || String(reading.question).toLowerCase().includes(search);
    const matchesSpread = spreadId === "all" || reading.spreadId === spreadId;
    return matchesSearch && matchesSpread;
  });
  const list = document.querySelector("#history-list");
  if (list) list.innerHTML = historyItems(filtered);
}

function deleteReading(id) {
  write(KEYS.readings, getReadings().filter((reading) => reading.id !== id));
  notify("这条记录已从当前浏览器删除。");
  filterHistory();
}

function clearHistory() {
  if (!getReadings().length) return;
  const confirmed = window.confirm("确定清空当前浏览器中的全部占卜记录吗？此操作无法撤销。");
  if (!confirmed) return;
  write(KEYS.readings, []);
  notify("历史记录已清空。");
  filterHistory();
}

async function submitFeedback() {
  const content = document.querySelector("#feedback-content")?.value.trim() || "";
  const status = document.querySelector("#feedback-status");
  const button = document.querySelector("#feedback-submit");
  if (!content) {
    if (status) {
      status.className = "notice warning";
      status.textContent = "请先写下反馈内容。";
    }
    return;
  }

  button.disabled = true;
  button.textContent = "正在提交…";
  status.className = "notice";
  status.textContent = "正在连接反馈服务…";
  try {
    const response = await fetch(apiUrl("/api/feedback"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.className = "notice success";
    status.textContent = "反馈已由服务器确认保存。谢谢你的说明。";
    document.querySelector("#feedback-content").value = "";
    document.querySelector("#feedback-count").textContent = "0";
  } catch {
    status.className = "notice warning";
    status.textContent = "反馈服务暂时不可用，内容尚未发送。请稍后再试。";
  } finally {
    button.disabled = false;
    button.textContent = "提交反馈";
  }
}

APP.addEventListener("click", (event) => {
  const control = event.target.closest("[data-action]");
  if (!control) return;
  const action = control.dataset.action;

  if (action === "home") navigate("home");
  if (action === "start") startSession();
  if (action === "start-again") startSession();
  if (action === "profiles") navigate("profiles");
  if (action === "history") navigate("history");
  if (action === "spread") {
    state.selectedSpread = control.dataset.spread;
    APP.querySelectorAll(".spread-choice").forEach((choice) => {
      const selected = choice.dataset.spread === state.selectedSpread;
      choice.classList.toggle("selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
  }
  if (action === "select-profile") {
    const id = control.dataset.id;
    if (state.selectedProfiles.includes(id)) {
      state.selectedProfiles = state.selectedProfiles.filter((profileId) => profileId !== id);
    } else if (state.selectedProfiles.length < 3) {
      state.selectedProfiles.push(id);
    } else {
      notify("最多选择 3 个档案。");
      return;
    }
    control.classList.toggle("selected", state.selectedProfiles.includes(id));
    control.setAttribute("aria-pressed", String(state.selectedProfiles.includes(id)));
    control.querySelector(".check").textContent = state.selectedProfiles.includes(id) ? "✓" : "";
  }
  if (action === "toggle-context-dropdown") toggleContextDropdown(control.dataset.context);
  if (action === "select-context") selectContextValue(control.dataset.context, control.dataset.contextValue || "");
  if (action === "to-shuffle") beginShuffle();
  if (action === "finish-shuffle") finishShuffle();
  if (action === "open-shuffled-deck") state.openShuffledDeck?.();
  if (action === "fan-pick") pickOrbitCard(control.dataset.card, control);
  if (action === "return-pick") returnPickedCard(control.dataset.card, control);
  if (action === "confirm-draw") confirmDraw();
  if (action === "save-profile") saveProfile();
  if (action === "delete-profile") deleteProfile(control.dataset.id);
  if (action === "delete-reading") deleteReading(control.dataset.id);
  if (action === "clear-history") clearHistory();
  if (action === "open-reading") {
    const reading = getReadings().find((item) => item.id === control.dataset.id);
    if (reading) {
      state.currentReading = reading;
      navigate("result");
    }
  }
  if (action === "submit-feedback") submitFeedback();
  if (action === "home-feature") {
    const feature = control.dataset.feature;
    const touchFirst = window.matchMedia("(hover: none)").matches;
    if (touchFirst && state.homeArmed !== feature) {
      state.homeArmed = feature;
      APP.querySelectorAll(".home-card-shell").forEach((card) => card.classList.toggle("is-armed", card === control));
      return;
    }
    state.homeArmed = null;
    activateFeature(feature);
  }
});

APP.addEventListener("input", (event) => {
  if (event.target.id === "question") state.question = event.target.value;
  if (event.target.id === "optional-context") state.context.optionalText = event.target.value;
  if (event.target.id === "context-gender") state.context.gender = event.target.value;
  if (event.target.id === "context-zodiac") state.context.zodiac = event.target.value;
  if (event.target.id === "context-relationship") state.context.relationshipStatus = event.target.value;
  if (event.target.matches(".context-search")) filterContextOptions(event.target);
  if (event.target.id === "history-search" || event.target.id === "history-filter") filterHistory();
  if (event.target.id === "feedback-content") {
    const count = document.querySelector("#feedback-count");
    if (count) count.textContent = String(event.target.value.length);
  }
});

window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
  if (getPreferences().theme === "system") applyTheme();
});

function syncHomeGeometryScale() {
  if (window.innerWidth < 901) {
    document.documentElement.style.setProperty("--home-geometry-scale", "1");
    document.documentElement.style.setProperty("--home-stage-width", "100%");
    document.documentElement.style.setProperty("--home-stage-x-offset", "0px");
    return;
  }

  // Keep the reference composition's width as the primary scale. The design
  // intentionally lets edge cards crop on wide screens, so the cards retain
  // their visual weight instead of shrinking to fit the shortest dimension.
  const scale = Math.max(window.innerWidth / 1280, window.innerHeight / 810);
  const stageWidth = window.innerWidth / scale;
  const stageXOffset = (stageWidth - 1280) / 2;
  document.documentElement.style.setProperty("--home-geometry-scale", scale.toFixed(4));
  document.documentElement.style.setProperty("--home-stage-width", `${stageWidth.toFixed(2)}px`);
  document.documentElement.style.setProperty("--home-stage-x-offset", `${stageXOffset.toFixed(2)}px`);
}

window.addEventListener("resize", syncHomeGeometryScale, { passive: true });
syncHomeGeometryScale();

const galaxyVertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const galaxyFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;
uniform float uLightMode;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float ValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = Hash21(i);
  float b = Hash21(i + vec2(1.0, 0.0));
  float c = Hash21(i + vec2(0.0, 1.0));
  float d = Hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float Fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 octaveRotation = mat2(0.80, -0.60, 0.60, 0.80);
  for (int octave = 0; octave < 5; octave++) {
    value += amplitude * ValueNoise(p);
    p = octaveRotation * p * 2.03 + vec2(7.1, 3.7);
    amplitude *= 0.5;
  }
  return value;
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 si = id + vec2(float(x), float(y));
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;

      float red = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 1.0)) + STAR_COLOR_CUTOFF;
      float blu = smoothstep(STAR_COLOR_CUTOFF, 1.0, Hash21(si + 3.0)) + STAR_COLOR_CUTOFF;
      float grn = min(red, blu) * seed;
      vec3 base = vec3(red, grn, blu);

      float hue = atan(base.g - base.r, base.b - base.r) / (2.0 * 3.14159) + 0.5;
      hue = fract(hue + uHueShift / 360.0);
      float sat = length(base - vec3(dot(base, vec3(0.299, 0.587, 0.114)))) * uSaturation;
      float val = max(max(base.r, base.g), base.b);
      base = hsv2rgb(vec3(hue, sat, val));
      base = mix(vec3(0.92, 0.90, 1.0), base, 0.16);

      vec2 pad = vec2(
        tris(seed * 34.0 + uTime * uSpeed / 10.0),
        tris(seed * 38.0 + uTime * uSpeed / 30.0)
      ) - 0.5;

      float star = Star(gv - offset - pad, flareSize);
      float twinkle = trisn(uTime * uSpeed + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      star *= twinkle;
      col += star * size * base;
    }
  }
  return col;
}

void main() {
  vec2 focalPx = uFocal * uResolution.xy;
  vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
  vec2 mouseNorm = uMouse - vec2(0.5);

  if (uAutoCenterRepulsion > 0.0) {
    vec2 centerUV = vec2(0.0, 0.0);
    float centerDist = length(uv - centerUV);
    vec2 repulsion = normalize(uv - centerUV) * (uAutoCenterRepulsion / (centerDist + 0.1));
    uv += repulsion * 0.05;
  } else if (uMouseRepulsion) {
    vec2 mousePosUV = (uMouse * uResolution.xy - focalPx) / uResolution.y;
    float mouseDist = length(uv - mousePosUV);
    vec2 repulsion = normalize(uv - mousePosUV) * (uRepulsionStrength / (mouseDist + 0.1));
    uv += repulsion * 0.05 * uMouseActiveFactor;
  } else {
    vec2 mouseOffset = mouseNorm * 0.1 * uMouseActiveFactor;
    uv += mouseOffset;
  }

  float autoRotAngle = uTime * uRotationSpeed;
  mat2 autoRot = mat2(cos(autoRotAngle), -sin(autoRotAngle), sin(autoRotAngle), cos(autoRotAngle));
  uv = autoRot * uv;
  uv = mat2(uRotation.x, -uRotation.y, uRotation.y, uRotation.x) * uv;

  vec3 col = vec3(0.0);
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + uStarSpeed * uSpeed);
    float scale = mix(20.0 * uDensity, 0.5 * uDensity, depth);
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.32) * fade;
  }

  vec2 nebulaUV = (vUv - vec2(0.5)) * vec2(uResolution.z, 1.0);
  float nebulaAngle = -0.15;
  mat2 nebulaRotation = mat2(cos(nebulaAngle), -sin(nebulaAngle), sin(nebulaAngle), cos(nebulaAngle));
  nebulaUV = nebulaRotation * nebulaUV;
  nebulaUV.x += uTime * 0.0025;

  float broadWarp = Fbm(nebulaUV * 1.55 + vec2(-2.4, 0.8));
  float bandDistance = abs(nebulaUV.y + 0.08 * sin(nebulaUV.x * 2.7) + (broadWarp - 0.5) * 0.34);
  float band = exp(-bandDistance * 3.6);
  float cloud = Fbm(nebulaUV * 3.3 + vec2(4.2, -1.7));
  float detail = Fbm(nebulaUV * 8.0 + vec2(-0.5, 6.4));
  float nebulaMask = smoothstep(0.22, 0.82, band * (0.48 + cloud * 0.82));
  nebulaMask *= 0.64 + detail * 0.42;

  vec3 nebulaShadow = vec3(0.11, 0.075, 0.16);
  vec3 nebulaMid = vec3(0.34, 0.24, 0.43);
  vec3 nebulaLight = vec3(0.57, 0.43, 0.64);
  vec3 nebulaColor = mix(nebulaShadow, nebulaMid, cloud);
  nebulaColor = mix(nebulaColor, nebulaLight, smoothstep(0.63, 0.94, cloud * band));
  col += nebulaColor * nebulaMask * 0.74;

  if (uLightMode > 0.5) {
    float energy = max(max(col.r, col.g), col.b);
    float coverage = clamp(smoothstep(0.0, 0.42, energy) * 0.92, 0.0, 0.92);
    vec3 ink = clamp(col * 0.48, 0.0, 0.82);
    gl_FragColor = vec4(mix(vec3(1.0), ink, coverage), 1.0);
  } else if (uTransparent) {
    float alpha = smoothstep(0.0, 0.3, length(col));
    gl_FragColor = vec4(col, min(alpha, 1.0));
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

function initGalaxy(container) {
  if (!container) return { setLightMode() {}, pause() {}, resume() {}, destroy() {} };
  try {
    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5)
    });
    const gl = renderer.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const targetMouse = { x: 0.5, y: 0.5 };
    const smoothMouse = { x: 0.5, y: 0.5 };
    let targetActive = 0;
    let smoothActive = 0;

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: galaxyVertexShader,
      fragment: galaxyFragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new Color(1, 1, 1) },
        uFocal: { value: new Float32Array([0.5, 0.5]) },
        uRotation: { value: new Float32Array([1, 0]) },
        uStarSpeed: { value: 0.5 },
        uDensity: { value: 1.08 },
        uHueShift: { value: 268 },
        uSpeed: { value: 0.09 },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity: { value: 0.29 },
        uSaturation: { value: 0.28 },
        uMouseRepulsion: { value: true },
        uTwinkleIntensity: { value: 0.2 },
        uRotationSpeed: { value: 0.012 },
        uRepulsionStrength: { value: 0.28 },
        uMouseActiveFactor: { value: 0 },
        uAutoCenterRepulsion: { value: 0 },
        uTransparent: { value: true },
        uLightMode: { value: 0 }
      }
    });
    const mesh = new Mesh(gl, { geometry, program });

    const resize = () => {
      renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
      program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / Math.max(1, gl.canvas.height)
      );
    };

    const move = (event) => {
      targetMouse.x = Math.max(0, Math.min(1, event.clientX / window.innerWidth));
      targetMouse.y = 1 - Math.max(0, Math.min(1, event.clientY / window.innerHeight));
      targetActive = 1;
    };
    const leave = () => { targetActive = 0; };

    let frameId = 0;
    let running = true;
    let timeOffset = 0;
    let pausedAt = 0;
    const update = (time) => {
      if (!running) return;
      frameId = requestAnimationFrame(update);
      // Keep the shader clock continuous across a deliberately paused render
      // loop. Without this compensation, resuming after a card flight makes
      // the background jump by the entire pause duration on one frame.
      const adjustedTime = Math.max(0, time - timeOffset) * 0.001;
      program.uniforms.uTime.value = adjustedTime;
      program.uniforms.uStarSpeed.value = (adjustedTime * 0.5) / 10;
      smoothMouse.x += (targetMouse.x - smoothMouse.x) * 0.05;
      smoothMouse.y += (targetMouse.y - smoothMouse.y) * 0.05;
      smoothActive += (targetActive - smoothActive) * 0.05;
      program.uniforms.uMouse.value[0] = smoothMouse.x;
      program.uniforms.uMouse.value[1] = smoothMouse.y;
      program.uniforms.uMouseActiveFactor.value = smoothActive;
      renderer.render({ scene: mesh });
    };

    container.appendChild(gl.canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    resize();
    frameId = requestAnimationFrame(update);

    return {
      setLightMode(isLight) {
        program.uniforms.uLightMode.value = isLight ? 1 : 0;
      },
      pause() {
        if (!running) return;
        running = false;
        pausedAt = performance.now();
        cancelAnimationFrame(frameId);
      },
      resume() {
        if (running) return;
        if (pausedAt) {
          timeOffset += Math.max(0, performance.now() - pausedAt);
          pausedAt = 0;
        }
        running = true;
        frameId = requestAnimationFrame(update);
      },
      destroy() {
        running = false;
        pausedAt = 0;
        cancelAnimationFrame(frameId);
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", move);
        document.documentElement.removeEventListener("pointerleave", leave);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      }
    };
  } catch (error) {
    console.warn("Galaxy background could not start; CSS background remains active.", error);
    return { setLightMode() {}, pause() {}, resume() {}, destroy() {} };
  }
}

applyTheme();
galaxyController = initGalaxy(GALAXY);
applyTheme();
render();
