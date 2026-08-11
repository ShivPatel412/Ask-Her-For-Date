const data = JSON.parse(document.querySelector("#invitation-data").textContent),
  app = document.querySelector("#app");
const screens = data.content.screens,
  features = data.features,
  theme = data.theme;
const state = {
  screen: "intro",
  previous: "",
  nickname: localStorage.getItem(`hl-nick-${data.token}`) || "",
  mood: "",
  moodChosen: false,
  availability: "",
  date: "",
  mainVisits: 0,
  found: new Set(),
  tinyClicks: 0,
  visitorId: localStorage.getItem(`hl-visitor-${data.token}`) || "",
  sessionReady: false,
  musicMinimized: false,
};
let musicAudio = null;
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const vars = (s) =>
  String(s ?? "").replace(
    /{{\s*(inviterName|recipientName|nickname|selectedMood)\s*}}/g,
    (_, k) =>
      ({
        inviterName: data.inviterName,
        recipientName: data.recipientName,
        nickname: state.nickname || data.recipientName,
        selectedMood: state.mood,
      })[k],
  );
const text = (s) => esc(vars(s)).replace(/\n/g, "<br>");
const css = `--bg:${theme.background};--primary:${theme.primary};--secondary:${theme.secondary};--text:${theme.text};--muted:${theme.muted};--card:${theme.card};--heading:${JSON.stringify(theme.heading)};--body:${JSON.stringify(theme.body)}`;

async function initialize() {
  setupMusic();
  if (!data.preview) {
    if (!state.visitorId) {
      state.visitorId = crypto.randomUUID().replaceAll("-", "");
      localStorage.setItem(`hl-visitor-${data.token}`, state.visitorId);
    }
    try {
      const r = await fetch(`/api/invitations/${data.token}/session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitorId: state.visitorId }),
      });
      state.sessionReady = r.ok;
    } catch {}
    track("invitation_opened", "intro");
  }
  render();
}
async function track(
  eventName,
  screen = state.screen,
  optionValue = "",
  extra = {},
) {
  if (data.preview) return;
  const body = {
    visitorId: state.visitorId,
    eventName,
    screen,
    previousScreen: state.previous,
    optionValue,
    ...extra,
  };
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(`/api/invitations/${data.token}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) return;
    } catch {}
    if (i === 0) await new Promise((r) => setTimeout(r, 350));
  }
}
function shell(content) {
  return `<main class="invite-shell screen-${state.screen}" style='${css}'><div class="ambient a"></div><div class="ambient b"></div>${musicControl()}${data.preview ? '<span class="preview-badge">Preview · analytics off</span>' : ""}${features.mascots && features.mascotPack !== "none" ? mascots() : ""}<section class="invite-card" aria-live="polite">${content}</section>${features.collection ? collectibles() : ""}<footer><button data-modal="privacy">Privacy</button><span>Cute things found: ${state.found.size}/5</span><small class="invite-credit">© ${new Date().getFullYear()} Ask Her Out · Designed and developed by <a href="https://shivpatel.in" target="_blank" rel="noopener noreferrer">SastaTengo</a></small></footer><div id="toast" role="status"></div>${modal("privacy", "Privacy", `This invitation records interactions within this website, such as which options are selected and date preferences. It does not access your contacts, precise location, camera, microphone, or browsing history.`, "Got it")}${modal("secret", screens.secret.heading, screens.secret.body, screens.secret.primary)}</main>`;
}
function setupMusic() {
  if (
    !features.music ||
    !/^\/media\/[a-f0-9]{32}\.(mp3|ogg|wav|m4a)$/.test(features.musicUrl || "")
  )
    return;
  musicAudio = document.createElement("audio");
  musicAudio.src = features.musicUrl;
  musicAudio.loop = true;
  musicAudio.preload = "metadata";
  musicAudio.volume = 0.35;
  document.body.append(musicAudio);
  musicAudio.addEventListener("play", () => {
    state.musicPlaying = true;
    updateMusicUI();
    track("music_play");
  });
  musicAudio.addEventListener("pause", () => {
    state.musicPlaying = false;
    updateMusicUI();
    track("music_pause");
  });
  musicAudio.addEventListener("timeupdate", updateMusicUI);
  musicAudio.addEventListener("loadedmetadata", updateMusicUI);
}
function musicControl() {
  const empty = !musicAudio;
  if (empty && !(data.preview && features.music)) return "";
  const disabled = empty ? "disabled" : "";
  return `<div class="music-player ${empty ? "music-empty" : ""} ${state.musicMinimized ? "minimized" : ""}" role="group" aria-label="Music player">
  <div class="music-head">
    <button class="music-minimize" data-music="minimize" aria-label="Minimize player"></button>
      <span class="music-cover" aria-hidden="true">🎧</span>
        <div class="music-meta"><b>${text(empty ? "Add a song in the editor" : features.musicName || "Favorite song")}</b>
        <small>${empty ? "Music is enabled" : "Currently vibing"}</small></div><i class="music-bars" aria-hidden="true"><b></b><b></b><b></b><b></b></i>
        <button data-music="mute" aria-label="Mute music" ${disabled}>🔊</button></div>
        <div class="music-progress"><time data-current>0:00</time><input data-music="seek" type="range" min="0" max="100" value="0" aria-label="Song progress" ${disabled}><time data-duration>${empty ? "--:--" : "0:00"}</time></div><div class="music-controls"><button data-music="back" aria-label="Go back 10 seconds" ${disabled}>↶</button><button class="music-play" data-music="toggle" aria-label="Play music" ${disabled}>▶</button><button data-music="forward" aria-label="Go forward 10 seconds" ${disabled}>↷</button><label class="music-volume"><span aria-hidden="true">🔉</span><input data-music="volume" type="range" min="0" max="100" value="25" aria-label="Music volume" ${disabled}></label></div></div>`;
}
function startMusic() {
  if (!musicAudio || !musicAudio.paused) return;
  musicAudio.play().catch(() => {});
}
function clock(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
function updateMusicUI() {
  const player = document.querySelector(".music-player");
  if (!player) return;
  player.classList.toggle("minimized", state.musicMinimized);
  const minimize = player.querySelector('[data-music="minimize"]');
  minimize.textContent = state.musicMinimized ? "⌃" : "⌄";
  minimize.setAttribute(
    "aria-label",
    state.musicMinimized ? "Expand player" : "Minimize player",
  );
  if (!musicAudio) return;
  player.classList.toggle("playing", Boolean(state.musicPlaying));
  const play = player.querySelector('[data-music="toggle"]'),
    mute = player.querySelector('[data-music="mute"]'),
    seek = player.querySelector('[data-music="seek"]'),
    volume = player.querySelector('[data-music="volume"]');
  play.textContent = state.musicPlaying ? "❚❚" : "▶";
  play.setAttribute(
    "aria-label",
    state.musicPlaying ? "Pause music" : "Play music",
  );
  mute.textContent = musicAudio.muted ? "🔇" : "🔊";
  mute.setAttribute(
    "aria-label",
    musicAudio.muted ? "Unmute music" : "Mute music",
  );
  seek.value = musicAudio.duration
    ? (musicAudio.currentTime / musicAudio.duration) * 100
    : 0;
  seek.style.setProperty("--music-progress", `${seek.value}%`);
  volume.value = musicAudio.muted ? 0 : musicAudio.volume * 100;
  player.querySelector("[data-current]").textContent = clock(
    musicAudio.currentTime,
  );
  player.querySelector("[data-duration]").textContent = clock(
    musicAudio.duration,
  );
}
function mascots() {
  const lines = {
    thinking: ["Blue says: “Bhai nervous hai 😭”", "Yellow says: “Obviously.”"],
    convince: [
      "Blue says: “Say something impressive!”",
      "Yellow says: “Usko aata hi nahi 😂”",
    ],
    finalAttempt: [
      "Blue says: “One last try?”",
      "Yellow says: “Food mention kar.”",
    ],
  }[state.screen];
  return `<button class="mascot mascot-yellow" data-tiny aria-label="A cheerful yellow mascot"><span>✦</span><i></i></button><div class="mascot mascot-blue" aria-hidden="true"><span>•ᴗ•</span></div>${lines ? `<div class="mascot-banter" aria-hidden="true"><span>${lines[0]}</span><span>${lines[1]}</span></div>` : ""}`;
}
function collectibles() {
  return ["✦", "🧸", "★", "●", "〰"]
    .map(
      (x, i) =>
        `<button class="collectible c${i}" data-cute="${i}" aria-label="Hidden cute thing ${i + 1}">${x}</button>`,
    )
    .join("");
}
function modal(id, heading, body, button) {
  return `<dialog id="${id}-modal" class="${id}-dialog"><div class="modal-inner">${id === "privacy" ? '<div class="privacy-icon" aria-hidden="true">✓</div><span class="modal-kicker">Your privacy matters</span>' : ""}<button class="modal-x" data-close aria-label="Close">×</button><h2>${text(heading)}</h2><p>${text(body)}</p><button class="choice primary modal-action" data-close>${text(button)}</button></div></dialog>`;
}
const btn = (label, action, kind = "") =>
  `<button class="choice ${kind}" data-action="${action}">${text(label)}</button>`;
const copy = (obj, buttons = "") =>
  `<span class="eyebrow">${text(obj.eyebrow)}</span><h1>${text(obj.heading)}</h1>${obj.body ? `<div class="copy-note"><span>✦</span><div>${text(obj.body)}</div></div>` : ""}${buttons}`;
function render() {
  let content = "";
  const s = screens[state.screen] || screens.intro;
  if (state.screen === "intro")
    content = copy(s, btn(s.primary, "open", "primary"));
  if (state.screen === "nickname") content = nicknameScreen();
  if (state.screen === "nicknameConfirm")
    content = `<span class="eyebrow">Choice detected</span><h1>So it's “${text(state.nickname)}” now? 👀😂</h1><div class="reaction-card"><span>💬</span><b>${nicknameReaction()}</b></div>${btn(screens.nickname.primary, "nicknameApprove", "primary")}${btn(screens.nickname.secondary, "nicknameChange")}`;
  if (state.screen === "analysis") content = analysisScreen();
  if (state.screen === "main") content = mainScreen();
  if (state.screen === "thinking")
    content = `${back(s.eyebrow)}${copy({ ...s, eyebrow: "", body: "" })}<div class="talk-points"><span>🥹 Come on ${text(state.nickname)}… ek date hi toh maang raha hoon</span><span>✨ I promise, achhi jagah leke jaunga</span></div><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "convince")}${btn(s.quaternary, "finalAttempt")}</div>`;
  if (state.screen === "convince")
    content = `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="reason-grid"><span><b>😌</b>Good company</span><span><b>🍕</b>Food involved</span><span><b>😂</b>Unlimited bakwaas</span><span><b>👀</b>Zero boring moments</span><span class="wide"><b>❤️</b>I really want to take YOU out</span></div><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "benefits")}</div>`;
  if (state.screen === "benefits") content = benefitsScreen();
  if (state.screen === "mood") content = moodScreen();
  if (state.screen === "moodConfirm")
    content = `<span class="eyebrow">Vibe selected ✨</span><h1>${text(state.mood)}</h1><div class="reaction-card"><span>✨</span><b>${moodReaction()}</b></div>${btn(screens.mood.primary, "yes", "primary")}${btn(screens.mood.secondary, "mood")}`;
  if (state.screen === "finalAttempt")
    content = `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="promise"><span><b>🔍</b>You know me already</span><span><b>💬</b>You survive my bakwaas</span><span><b>🙌</b>We have fun together</span></div><h2 class="closing-question">Final answer? 👀</h2><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "decline", "respect")}</div>`;
  if (state.screen === "yes") content = yesScreen();
  if (state.screen === "availability") content = availabilityScreen();
  if (state.screen === "finalMood") content = finalMoodScreen();
  if (state.screen === "success") content = successScreen();
  if (state.screen === "decline") content = declineScreen();
  app.innerHTML = shell(content);
  bind();
  if (state.screen === "analysis")
    requestAnimationFrame(() =>
      document
        .querySelectorAll(".bar i")
        .forEach((el) => (el.style.width = el.dataset.width)),
    );
  if (
    state.screen === "yes" &&
    features.confetti &&
    !sessionStorage.getItem(`hl-confetti-${data.token}`)
  ) {
    confetti();
    sessionStorage.setItem(`hl-confetti-${data.token}`, "1");
  }
}
function back(label) {
  return `<button class="back" data-action="main">${text(label)}</button>`;
}
function nicknameScreen() {
  const s = screens.nickname;
  return `${copy(s)}<div class="choices compact">${data.content.nicknames.map((n) => btn(n, "pickNickname")).join("")}${features.customNickname ? btn("I'll choose my own 👀", "customNickname") : ""}</div><div id="custom-nick" hidden><label>Type what I should call you…<input maxlength="25" autocomplete="off"></label><button class="choice primary" data-action="submitNickname">Use this name</button></div>`;
}
function nicknameReaction() {
  const n = state.nickname.replace(/[^\p{L}\s]/gu, "").trim();
  return (
    {
      "Madam Ji": "Understood, Madam Ji. 🫡😂",
      Cutie: "Bold choice. Can't really disagree though. 😌❤️",
      Chotu: "Okay okay, height jokes officially unlocked 😂",
      Princess: "Royal treatment requested. Noted. 👑😂",
      "Drama Queen": "Finally, an accurate option. 😭😂",
      "My Favorite Human": "Okay… this one is dangerously wholesome. ❤️",
      "Cute Trouble": "Yeah… that sounds suspiciously accurate. 😂",
    }[n] || `${state.nickname} it is. 😌`
  );
}
function analysisScreen() {
  const s = screens.analysis;
  return `${copy(s)}<div class="stats"><div><span>Bakwaas compatibility <b>100%</b></span><div class="bar"><i data-width="100%"></i></div></div><div><span>Food compatibility <b>94%</b></span><div class="bar"><i data-width="94%"></i></div></div><div><span>Cute things compatibility <b>100%</b></span><div class="bar"><i data-width="100%"></i></div></div><div><span>Chance I'm nervous <b>100% 😭</b></span><div class="bar"><i data-width="100%"></i></div></div></div><div class="system"><span>😂</span><div>Height difference detected<br><b>Still compatible</b></div></div>${btn(s.primary, "main", "primary")}`;
}
function mainScreen() {
  const s = screens.main,
    revisit =
      [
        s.eyebrow,
        `We meet again, ${state.nickname} 👀😂`,
        `${state.nickname} reconsider kar rahi hain? 😌`,
        `Okay okay ${state.nickname}, take your time 😂`,
      ][Math.min(state.mainVisits - 1, 3)] || s.eyebrow;
  return `<span class="eyebrow">${text(revisit)}</span><h1>${text(s.heading)}</h1><div class="copy-note"><span>✉️</span><div>${text(s.body)}</div></div><div class="love-envelope" aria-hidden="true"><i></i><span>✦</span></div><div class="question-actions">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "thinking")}${btn(s.tertiary, "convince")}</div>`;
}
function benefitsScreen() {
  const s = screens.benefits,
    items = [
      ["🍕", "Your favorite food"],
      ["👀", "My full attention"],
      ["😂", "Unlimited gossip"],
      ["🎤", "Terrible jokes included free"],
      ["🍰", "Dessert is mandatory"],
      ["🧸", "Cute things may become yours"],
      ["📸", "Cute-photo potential"],
      ["✨", "A date worth remembering"],
      ["🚶", "Walking speed optimized"],
    ];
  return `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="benefit-grid">${items.map(([icon, label]) => `<span><b>${icon}</b>${label}</span>`).join("")}</div><div class="stat-pills"><span><b>100%</b> Fun</span><span><b>100%</b> Food</span><span><b>127%</b> Bakwaas</span></div><div class="terms"><span>🍰</span><small>Dessert cannot be skipped.</small></div><h2 class="closing-question">Thoda sa YES ban raha hai na? 👀😂</h2><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "finalAttempt")}</div>`;
}
function moodIcon(title) {
  return title.includes("Drive")
    ? "🚗"
    : title.includes("Coffee")
      ? "☕"
      : title.includes("Dinner")
        ? "🍮"
        : title.includes("Movie")
          ? "🎬"
          : title.includes("Activity")
            ? "🎳"
            : title.includes("Drinks")
              ? "🍹"
              : "✨";
}
function moodScreen() {
  const s = screens.mood,
    moods = [...data.content.moods].sort(
      (a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)),
    ),
    favorite = moods.find((m) => m.favorite) || moods[0];
  if (!state.mood && favorite) state.mood = favorite.title;
  const selected = moods.find((m) => m.title === state.mood) || favorite,
    others = moods.filter((m) => m !== selected);
  return `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="selected-mood"><div><span class="selected-label">${selected.favorite ? "★ My favorite" : "Your Favourite"}</span><b>${text(selected.title)}</b><small>${text(selected.description)}</small></div><div class="mood-mascots" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i></div></div><span class="mood-change-label">Want a different option? 👀</span><div class="mood-grid">${others.map((m) => `<button class="mood-card" data-action="pickMood" data-value="${esc(m.title)}"><i class="mood-icon" aria-hidden="true">${moodIcon(m.title)}</i><span><b>${text(m.title)}</b><small>${text(m.description)}</small></span></button>`).join("")}</div><button class="choice primary favorite-continue" data-action="pickMood" data-value="${esc(selected.title)}">${text(s.primary)}</button>`;
}
function moodReaction() {
  const n = state.mood;
  return n.includes("Coffee")
    ? "Simple, peaceful and plenty of time for our unlimited bakwaas. 😂"
    : n.includes("Dinner")
      ? `Excellent choice, ${state.nickname}. 😌 Good food + dessert + you? Solid plan. 😂❤️`
      : n.includes("Movie")
        ? "Movie, food and judging each other's movie choices. 😂"
        : n.includes("Activity")
          ? "Ohhh, competitive date? 👀 Loser buys dessert. 😂❤️"
          : n.includes("Drinks")
            ? "Okayyy… Party mode activated. Drinks, music, food and questionable dancing. 🍸💃😂"
            : "You're trusting ME with the plan? 👀 Risky decision. 😂 Challenge accepted. 😌❤️";
}
function yesScreen() {
  const s = screens.yes;
  return `<span class="eyebrow">${text(s.eyebrow)}</span><div class="answer-chips"><span>👀 Sach mein, ${text(state.nickname)}?</span><span>😂 Like… actually yes?</span></div><h1>${text(s.heading)}</h1><div class="celebration-pair" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i><span>✦</span><span>●</span><span>✦</span></div>${datePass("Official date pass", `${state.nickname} + ${data.inviterName}`, "Food + fun", "We decide")}<div class="evidence-note">Screenshot this. Evidence secured 😂</div>${btn(s.primary, "availability", "primary")}`;
}
function availabilityScreen() {
  const s = screens.availability;
  return `${copy(s)}<div class="choices">${data.content.availability.map((a) => btn(a, "pickAvailability")).join("")}</div><div id="date-pick" hidden><label>Pick a date<input type="date" min="${new Date().toISOString().slice(0, 10)}"></label><button class="choice primary" data-action="submitDate">Use this date</button></div>`;
}
function finalMoodScreen() {
  if (state.mood)
    return `<span class="eyebrow">Final vibe check</span><h1>Still feeling ${text(state.mood)}? 👀</h1>${btn("Yep 😌❤️", "success", "primary")}${btn("Change it 😂", "mood")}`;
  return moodScreen();
}
function datePass(title, people, plan, when) {
  return `<div class="date-pass"><div class="pass-title">✦ ${text(title)} ✦ <small>DATE #001</small></div><div><span>👫</span><b>${text(people)}</b></div><div><span>🍔</span><b>${text(plan)}</b></div><div><span>🗓️</span><b>${text(when)}</b></div><div><span>😎</span><b>Admits: two cute idiots 😂</b></div></div>`;
}
function successScreen() {
  const s = screens.success,
    when = state.date || state.availability || "We decide",
    plan = state.mood || "Food + fun";
  return `<span class="eyebrow">Perfect. Date planning unlocked ✨</span><h1>${text(s.heading)}</h1><div class="celebration-pair small" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i><span>✦</span><span>●</span><span>✦</span></div>${datePass("Official date pass", `${state.nickname} + ${data.inviterName}`, plan, when)}<div class="evidence-note">Screenshot this. Evidence secured 😂</div><div class="action-stack">${btn(s.primary, "complete", "primary")}<button class="choice" data-modal="secret">One more thing… 👀</button></div>`;
}
function declineScreen() {
  const s = screens.decline;
  return `<span class="eyebrow">Choice respected 🤝</span><h1>${text(s.heading)}</h1><div class="status-chip">✓ No awkwardness · No pressure</div><div class="privilege-grid"><span><b>😂</b>Unlimited bakwaas</span><span><b>🍕</b>Food plans</span><span><b>📱</b>Memes continue</span><span><b>🤝</b>Besties remain</span></div><div class="reaction-card"><span>🤝</span><b>I'm still glad I asked.</b></div>${btn(s.primary, "declineComplete", "respect")}`;
}
function bind() {
  app
    .querySelectorAll("[data-action]")
    .forEach((el) =>
      el.addEventListener("click", () =>
        act(el.dataset.action, el.dataset.value || el.textContent.trim()),
      ),
    );
  app
    .querySelectorAll("[data-modal]")
    .forEach((el) =>
      el.addEventListener("click", () =>
        document.querySelector(`#${el.dataset.modal}-modal`).showModal(),
      ),
    );
  app
    .querySelectorAll("[data-close]")
    .forEach((el) =>
      el.addEventListener("click", () => el.closest("dialog").close()),
    );
  app
    .querySelectorAll("[data-cute]")
    .forEach((el) => el.addEventListener("click", () => cute(el)));
  app.querySelector("[data-tiny]")?.addEventListener("click", tiny);
  app.querySelectorAll("button[data-music]").forEach((el) =>
    el.addEventListener("click", () => {
      if (el.dataset.music === "minimize") {
        state.musicMinimized = !state.musicMinimized;
        return updateMusicUI();
      }
      if (el.dataset.music === "toggle")
        musicAudio.paused
          ? musicAudio.play().catch(() => {})
          : musicAudio.pause();
      if (el.dataset.music === "mute") {
        musicAudio.muted = !musicAudio.muted;
        updateMusicUI();
      }
      if (el.dataset.music === "back")
        musicAudio.currentTime = Math.max(0, musicAudio.currentTime - 10);
      if (el.dataset.music === "forward")
        musicAudio.currentTime = Math.min(
          musicAudio.duration || Infinity,
          musicAudio.currentTime + 10,
        );
    }),
  );
  app.querySelector('[data-music="seek"]')?.addEventListener("input", (e) => {
    e.target.style.setProperty("--music-progress", `${e.target.value}%`);
    if (musicAudio.duration)
      musicAudio.currentTime = (musicAudio.duration * e.target.value) / 100;
  });
  app.querySelector('[data-music="volume"]')?.addEventListener("input", (e) => {
    musicAudio.volume = e.target.value / 100;
    musicAudio.muted = false;
    updateMusicUI();
  });
  updateMusicUI();
}
function go(screen, event = "screen_view", option = "") {
  state.previous = state.screen;
  state.screen = screen;
  if (screen === "main") state.mainVisits++;
  render();
  track(screen === "main" ? "main_question_view" : event, screen, option);
}
function act(action, value) {
  if (action === "open") {
    startMusic();
    go(
      features.nickname ? "nickname" : features.analysis ? "analysis" : "main",
      "button_clicked",
      value,
    );
  } else if (action === "pickNickname") {
    state.nickname = value;
    go("nicknameConfirm", "nickname_selected", value);
  } else if (action === "customNickname") {
    document.querySelector("#custom-nick").hidden = false;
    document.querySelector("#custom-nick input").focus();
  } else if (action === "submitNickname") {
    const v = document
      .querySelector("#custom-nick input")
      .value.trim()
      .slice(0, 25);
    if (v) {
      state.nickname = v;
      go("nicknameConfirm", "nickname_selected", v);
    }
  } else if (action === "nicknameApprove") {
    localStorage.setItem(`hl-nick-${data.token}`, state.nickname);
    go(features.analysis ? "analysis" : "main", "button_clicked", value);
  } else if (action === "nicknameChange") {
    state.nickname = "";
    go("nickname", "nickname_changed", value);
  } else if (action === "main") go("main", "back_to_main", value);
  else if (
    ["thinking", "convince", "benefits", "finalAttempt"].includes(action)
  )
    go(action, "button_clicked", value);
  else if (action === "mood") go("mood", "button_clicked", value);
  else if (action === "pickMood") {
    const changed = state.moodChosen;
    state.mood = value;
    state.moodChosen = true;
    go("moodConfirm", changed ? "mood_changed" : "mood_selected", value);
  } else if (action === "yes") {
    track("final_yes", state.screen, value);
    go("yes", "screen_view", value);
  } else if (action === "decline") {
    track("best_friend_result", "finalAttempt", value);
    go("decline", "screen_view", value);
  } else if (action === "availability")
    go("availability", "button_clicked", value);
  else if (action === "pickAvailability") {
    if (value.includes("pick a date")) {
      document.querySelector("#date-pick").hidden = false;
      document.querySelector("#date-pick input").focus();
    } else {
      state.availability = value;
      track("availability_selected", "availability", value);
      go("finalMood");
    }
  } else if (action === "submitDate") {
    const date = document.querySelector("#date-pick input").value;
    if (date) {
      state.date = date;
      state.availability = "Custom date";
      track("availability_selected", "availability", "Custom date", {
        selectedDate: date,
      });
      go("finalMood");
    }
  } else if (action === "success") go("success", "screen_view", value);
  else if (action === "complete" || action === "declineComplete") {
    track("completion", state.screen, value);
    toast("Answer saved. You can close this tab ❤️");
  }
}
function cute(el) {
  if (state.found.has(el.dataset.cute)) return;
  state.found.add(el.dataset.cute);
  track("cute_item_found", state.screen, el.textContent);
  el.classList.add("found");
  const messages = [
    "Found one 👀",
    "Why are you clicking everything? 😂",
    "Okay, curious madam.",
    "One more tiny thing ✨",
    "Obviously you found all the cute things 😂❤️ Collector level: Expert",
  ];
  toast(messages[state.found.size - 1]);
  app.querySelector("footer span").textContent =
    `Cute things found: ${state.found.size}/5`;
}
function tiny() {
  state.tinyClicks++;
  if (state.tinyClicks === 3) {
    document.querySelector(".invite-card").classList.add("tiny-mode");
    toast(
      "Tiny Mode Activated 😂 — Made specially for one very cute person 😌❤️",
    );
    track("tiny_mode");
    setTimeout(
      () =>
        document.querySelector(".invite-card")?.classList.remove("tiny-mode"),
      2500,
    );
    state.tinyClicks = 0;
  }
}
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3200);
}
function confetti() {
  const shapes = ["✦", "●", "▰"];
  for (let i = 0; i < 22; i++) {
    const x = document.createElement("i");
    x.className = `confetti confetti-${i % 4}`;
    x.style.cssText = `--x:${Math.random() * 100}vw;--d:${2.2 + Math.random() * 2}s;--r:${Math.random() * 360}deg`;
    x.textContent = shapes[i % shapes.length];
    document.body.append(x);
    setTimeout(() => x.remove(), 4500);
  }
}
initialize();
