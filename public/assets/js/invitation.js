const data = JSON.parse(document.querySelector("#invitation-data").textContent),
  app = document.querySelector("#app");
const screens = data.content.screens,
  features = data.features,
  theme = data.theme;
const state = {
  screen: "intro",
  previous: "",
  nickname: data.recipientName,
  mood: "",
  moodChosen: false,
  availability: "",
  date: "",
  selectedDate: "",
  selectedTime: "",
  calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  mainVisits: 0,
  found: new Set(),
  cutePositions: randomCutePositions(),
  tinyClicks: 0,
  visitorId: localStorage.getItem(`hl-visitor-${data.token}`) || "",
  sessionReady: false,
  musicMinimized: false,
  evasionStage: 0,
  voicePlaying: false,
};
let musicAudio = null;
let voiceAudio = null;
let savedMusicVolume = 0.35;
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
const cleanFont = (f) => String(f ?? "").replace(/['"]/g, "");
const css = `--bg:${theme.background};--primary:${theme.primary};--secondary:${theme.secondary};--text:${theme.text};--muted:${theme.muted};--card:${theme.card};--heading:'${cleanFont(theme.heading)}';--body:'${cleanFont(theme.body)}'`;

async function initialize() {
  setupMusic();
  setupVoiceNote();
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
  const modal404 = (state.screen === "finalAttempt" && state.evasionStage === 3)
    ? `<div class="evasion-modal-overlay">
        <div class="retro-error-card">
          <div class="retro-header"><b>⚠️ SYSTEM ERROR 404</b><span aria-hidden="true">[!]</span></div>
          <div class="retro-body">
            <h3>REJECTION NOT FOUND</h3>
            <p>Saying 'NO / Best Friend' to <b>${esc(data.inviterName)}</b> is currently deprecated on this server. 😂</p>
            <code>Status: 404 Not Supported<br>Action: Please select YES to continue 😌❤️</code>
            <button class="retro-btn" data-action="yes" type="button">Okay Fineee, YES 😂❤️</button>
            <button class="fallback-friend-link" data-action="forceDecline" type="button" style="color:#a8a3b5;margin-top:6px;text-align:center;">Sach me best friend hi rehna hai 🤝</button>
          </div>
        </div>
      </div>`
    : "";

  return `<main class="invite-shell screen-${state.screen}" style='${css}'><div class="ambient a"></div><div class="ambient b"></div>${musicControl()}${features.mascots && features.mascotPack !== "none" ? mascots() : ""}<section class="invite-card" aria-live="polite">${content}</section>${features.collection ? collectibles() : ""}<footer><button data-modal="privacy">Privacy</button><span>Cute things found: ${state.found.size}/5</span><small class="invite-credit">© ${new Date().getFullYear()} Ask Her Out · Designed and developed by <a href="https://shivpatel.in" target="_blank" rel="noopener noreferrer">SastaTengo</a></small></footer><div id="toast" role="status"></div>${modal("privacy", "Privacy", `This invitation records interactions within this website, such as which options are selected and date preferences. It does not access your contacts, precise location, camera, microphone, or browsing history.`, "Got it")}${modal("secret", screens.secret.heading, screens.secret.body, screens.secret.primary)}${modal404}</main>`;
}
function setupMusic() {
  if (
    !features.music ||
    (!features.musicUrl?.startsWith("/media/") &&
      !features.musicUrl?.startsWith("data:audio/"))
  )
    return;
  musicAudio = document.createElement("audio");
  musicAudio.src = features.musicUrl;
  musicAudio.loop = true;
  musicAudio.preload = "metadata";
  musicAudio.volume = savedMusicVolume;
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
function setupVoiceNote() {
  if (
    !features.voiceNoteUrl ||
    (!features.voiceNoteUrl.startsWith("/media/") &&
      !features.voiceNoteUrl.startsWith("data:audio/"))
  )
    return;
  voiceAudio = document.createElement("audio");
  voiceAudio.src = features.voiceNoteUrl;
  voiceAudio.preload = "metadata";
  document.body.append(voiceAudio);
  voiceAudio.addEventListener("play", () => {
    state.voicePlaying = true;
    updateVoiceUI();
    duckMusic();
    track("voice_note_played", state.screen, features.voiceNoteName || "voice_note");
  });
  voiceAudio.addEventListener("pause", () => {
    state.voicePlaying = false;
    updateVoiceUI();
    restoreMusic();
  });
  voiceAudio.addEventListener("ended", () => {
    state.voicePlaying = false;
    updateVoiceUI();
    restoreMusic();
  });
}
function duckMusic() {
  if (!musicAudio) return;
  savedMusicVolume = musicAudio.volume || 0.35;
  musicAudio.volume = Math.min(0.08, savedMusicVolume * 0.25);
}
function restoreMusic() {
  if (!musicAudio) return;
  musicAudio.volume = savedMusicVolume || 0.35;
}
function updateVoiceUI() {
  const card = document.querySelector("#voice-note-player");
  if (!card) return;
  card.classList.toggle("playing", state.voicePlaying);
  const btn = card.querySelector(".voice-play-btn");
  if (btn) btn.textContent = state.voicePlaying ? "⏸" : "▶";
  const status = card.querySelector(".voice-status");
  if (status) status.textContent = state.voicePlaying ? "Playing message…" : "Tap to listen";
}
function toggleVoiceNote() {
  if (!voiceAudio) return;
  if (voiceAudio.paused) {
    voiceAudio.play().catch(() => {});
  } else {
    voiceAudio.pause();
  }
}
function voiceNoteWidget() {
  if (!features.voiceNoteUrl) return "";
  return `<div class="voice-note-card ${state.voicePlaying ? "playing" : ""}" id="voice-note-player"><button class="voice-play-btn" data-voice="toggle" type="button" aria-label="Play voice note">${state.voicePlaying ? "⏸" : "▶"}</button><div class="voice-meta"><b>🎙️ Voice note from ${esc(data.inviterName)}</b><small class="voice-status">${state.voicePlaying ? "Playing message…" : "Tap to listen"}</small></div><div class="voice-waveform" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></div></div>`;
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
    .map((x, i) => {
      const position = state.cutePositions[i];
      return `<button class="collectible c${i} ${state.found.has(String(i)) ? "found" : ""}" style="left:${position.left}%;top:${position.top}%" data-cute="${i}" aria-label="Hidden cute thing ${i + 1}">${x}</button>`;
    })
    .join("");
}
function randomCutePositions() {
  const zones = [
    [3, 13, 10, 26],
    [87, 96, 12, 30],
    [2, 11, 38, 66],
    [89, 97, 38, 66],
    [18, 78, 72, 80],
  ];
  return zones.map(([leftMin, leftMax, topMin, topMax]) => ({
    left: (leftMin + Math.random() * (leftMax - leftMin)).toFixed(1),
    top: (topMin + Math.random() * (topMax - topMin)).toFixed(1),
  }));
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
    content = finalAttemptScreen();
  if (state.screen === "yes") content = yesScreen();
  if (state.screen === "availability") content = availabilityScreen();
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
function finalAttemptScreen() {
  const s = screens.finalAttempt;
  const isEvasion = state.evasionStage >= 1;
  const yesScale = state.evasionStage === 1 ? 1.2 : state.evasionStage >= 2 ? 1.38 : 1;
  const yesClass = isEvasion ? "primary evasion-growing-yes" : "primary";
  const yesStyle = isEvasion ? `style="--yes-scale:${yesScale};"` : "";
  
  let rejectBtnText = s.tertiary;
  let rejectBtnClass = "respect";
  let rejectBtnAction = "rejectAttempt";
  if (state.evasionStage === 1) {
    rejectBtnText = "Wait... ek baar aur socho 🥺";
    rejectBtnClass = "respect evasion-teleport";
  } else if (state.evasionStage >= 2) {
    rejectBtnText = "Pakad ke dikhao 😂🏃";
    rejectBtnClass = "respect evasion-teleport";
  }

  const fallback = isEvasion
    ? `<button class="fallback-friend-link" data-action="forceDecline" type="button">Sach me friendzone karna hai? Click here 🤝</button>`
  return `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="promise"><span><b>🔍</b>You know me already</span><span><b>💬</b>You survive my bakwaas</span><span><b>🙌</b>We have fun together</span></div><h2 class="closing-question">${isEvasion ? "Saying YES is recommended 😌❤️" : "Final answer? 👀"}</h2><div class="action-stack"><button class="choice ${yesClass}" data-action="yes" type="button" ${yesStyle}>${text(s.primary)}</button>${btn(s.secondary, "mood")}<button class="choice ${rejectBtnClass}" data-action="${rejectBtnAction}" type="button">${text(rejectBtnText)}</button></div>${fallback}`;
}
function back(label) {
  return `<button class="back" data-action="main">${text(label)}</button>`;
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
  return `<span class="eyebrow">${text(s.eyebrow)}</span><div class="answer-chips"><span>👀 Sach mein, ${text(state.nickname)}?</span><span>😂 Like… actually yes?</span></div><h1>${text(s.heading)}</h1><div class="celebration-pair" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i><span>✦</span><span>●</span><span>✦</span></div>${datePass("Official date pass", `${state.nickname} + ${data.inviterName}`, "Food + fun", "We decide")}${voiceNoteWidget()}<div class="evidence-note">Screenshot this. Evidence secured 😂</div>${btn(s.primary, "availability", "primary")}`;
}
function availabilityScreen() {
  const s = screens.availability;
  return `${copy(s)}<div id="date-pick" class="date-time-pick"><section class="date-field"><div class="picker-label"><span>📅 Pick the date</span><b>${state.selectedDate ? formatDate(state.selectedDate) : "Choose a day"}</b></div>${calendar()}</section><fieldset class="time-field"><legend>⏰ Pick the time</legend><div class="time-options">${timeOptions()}</div></fieldset><button class="choice primary" data-action="submitDate">Confirm date & time ❤️</button></div>`;
}
function minDate() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00`));
}
function calendar() {
  const month = state.calendarMonth,
    year = month.getFullYear(),
    monthIndex = month.getMonth(),
    firstDay = new Date(year, monthIndex, 1).getDay(),
    days = new Date(year, monthIndex + 1, 0).getDate(),
    currentMonth = minDate().slice(0, 7),
    monthValue = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const dates = Array.from({ length: firstDay + days }, (_, i) => {
    const day = i - firstDay + 1;
    if (day < 1) return '<span class="calendar-blank"></span>';
    const value = `${monthValue}-${String(day).padStart(2, "0")}`,
      classes = [value === minDate() ? "today" : "", value === state.selectedDate ? "selected" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-action="selectDate" data-value="${value}" ${value < minDate() ? "disabled" : ""}>${day}</button>`;
  }).join("");
  return `<div class="calendar"><header><button type="button" data-action="calendarPrev" aria-label="Previous month" ${monthValue <= currentMonth ? "disabled" : ""}>‹</button><strong>${month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong><button type="button" data-action="calendarNext" aria-label="Next month">›</button></header><div class="weekdays" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div><div class="calendar-days">${dates}</div></div>`;
}
function timeOptions() {
  return Array.from({ length: 11 }, (_, i) => {
    const hour = i + 10;
    const label = `${hour > 12 ? hour - 12 : hour}:00 ${hour < 12 ? "AM" : "PM"}`;
    const value = `${String(hour).padStart(2, "0")}:00`;
    return `<label class="time-option"><input data-time type="radio" name="date-time" value="${value}" ${state.selectedTime === value ? "checked" : ""}><span>${label}</span></label>`;
  }).join("");
}
function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function datePass(title, people, plan, when) {
  return `<div class="date-pass"><div class="pass-title">✦ ${text(title)} ✦ <small>DATE #001</small></div><div><span>👫</span><b>${text(people)}</b></div><div><span>🍔</span><b>${text(plan)}</b></div><div><span>🗓️</span><b>${text(when)}</b></div><div><span>😎</span><b>Admits: two cute idiots 😂</b></div></div>`;
}
function successScreen() {
  const s = screens.success,
    when = state.date ? formatDateTime(state.date) : "We decide",
    plan = state.mood || "Food + fun";
  const message=encodeURIComponent(`Hey ${data.inviterName}! I said yes 😌❤️ Let's plan it now. I chose ${plan} and ${when}.`),whatsapp=data.whatsappNumber?`<a class="choice primary whatsapp-plan" data-action="complete" href="https://wa.me/${data.whatsappNumber}?text=${message}" target="_blank" rel="noopener noreferrer">${text(s.primary)}</a>`:btn(s.primary,"complete","primary");
  return `<span class="eyebrow">Perfect. Date planning unlocked ✨</span><h1>${text(s.heading)}</h1><div class="celebration-pair small" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i><span>✦</span><span>●</span><span>✦</span></div>${datePass("Official date pass", `${state.nickname} + ${data.inviterName}`, plan, when)}${voiceNoteWidget()}<div class="evidence-note">Screenshot this. Evidence secured 😂</div><div class="action-stack">${whatsapp}<button class="choice" data-modal="secret">One more thing… 👀</button></div>`;
}
function declineScreen() {
  const s = screens.decline,
    message = encodeURIComponent(`Hey ${data.inviterName}, I think we're better as best friends 🤝 I hope that's okay—our friendship still matters to me.`),
    whatsapp = data.whatsappNumber ? `<a class="choice respect whatsapp-plan" data-action="declineComplete" href="https://wa.me/${data.whatsappNumber}?text=${message}" target="_blank" rel="noopener noreferrer">${text(s.primary)}</a>` : btn(s.primary, "declineComplete", "respect");
  return `<span class="eyebrow">Choice respected 🤝</span><h1>${text(s.heading)}</h1><div class="status-chip">✓ No awkwardness · No pressure</div><div class="privilege-grid"><span><b>😂</b>Unlimited bakwaas</span><span><b>🍕</b>Food plans</span><span><b>📱</b>Memes continue</span><span><b>🤝</b>Besties remain</span></div><div class="reaction-card"><span>🤝</span><b>I'm still glad I asked.</b></div>${whatsapp}`;
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
  
  const teleportBtn = app.querySelector(".evasion-teleport");
  if (teleportBtn) {
    let lastMove = 0;
    const moveBtn = () => {
      const nowTime = Date.now();
      if (nowTime - lastMove < 90) return;
      lastMove = nowTime;
      const x = (Math.random() > 0.5 ? 1 : -1) * (110 + Math.random() * 140);
      const y = (Math.random() > 0.5 ? 1 : -1) * (70 + Math.random() * 110);
      teleportBtn.style.transform = `translate(${x}px, ${y}px)`;
    };
    teleportBtn.addEventListener("mouseenter", moveBtn);
    teleportBtn.addEventListener("touchstart", moveBtn, { passive: true });
    teleportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      moveBtn();
      act("rejectAttempt", "evasion_intercepted");
    });
    const checkProximity = (e) => {
      if (!teleportBtn.isConnected) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      if (clientX == null || clientY == null) return;
      const rect = teleportBtn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - centerX, clientY - centerY);
      if (dist < 140) {
        moveBtn();
      }
    };
    window.addEventListener("pointermove", checkProximity);
    window.addEventListener("touchmove", checkProximity, { passive: true });
  }
  
  app.querySelectorAll("[data-voice]").forEach((el) => {
    el.addEventListener("click", toggleVoiceNote);
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
    go("main", "button_clicked", value);
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
    state.evasionStage = 0;
    track("final_yes", state.screen, value);
    go("yes", "screen_view", value);
  } else if (action === "rejectAttempt") {
    if (state.evasionStage === 0) {
      state.evasionStage = 1;
      toast("Arre ruko ruko! Itna jaldi friendzone? Ek baar aur socho 😂");
      track("evasion_triggered", "finalAttempt", "reject_attempt_1");
      render();
    } else if (state.evasionStage === 1) {
      state.evasionStage = 2;
      toast("Button bhaag raha hai, sign samjho! 🏃💨😂");
      track("evasion_teleport", "finalAttempt", "reject_attempt_2");
      render();
    } else {
      state.evasionStage = 3;
      track("evasion_error_modal", "finalAttempt", "reject_attempt_3");
      render();
    }
  } else if (action === "forceDecline") {
    state.evasionStage = 0;
    track("best_friend_result", "finalAttempt", "force_decline");
    go("decline", "screen_view", "decline");
  } else if (action === "decline") {
    track("best_friend_result", "finalAttempt", value);
    go("decline", "screen_view", value);
  } else if (action === "availability")
    go("availability", "button_clicked", value);
  else if (action === "calendarPrev" || action === "calendarNext") {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + (action === "calendarNext" ? 1 : -1), 1);
    render();
  } else if (action === "selectDate") {
    state.selectedTime = document.querySelector("[data-time]:checked")?.value || state.selectedTime;
    state.selectedDate = value;
    render();
  }
  else if (action === "submitDate") {
    const date = state.selectedDate;
    const time = document.querySelector("[data-time]:checked")?.value || state.selectedTime;
    const dateTime = date && time ? `${date}T${time}` : "";
    if (!dateTime) return toast("Please choose both a date and time.");
    if (new Date(dateTime) <= new Date()) return toast("Please choose a future date and time.");
    state.date = dateTime;
    track("availability_selected", "availability", formatDateTime(dateTime), {
      selectedDate: dateTime,
    });
    go("success");
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
