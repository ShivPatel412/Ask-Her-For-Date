
function needsTimeScreen() {
  const s = screens.needsTime || { eyebrow: "Choice Respected 🌿", heading: "Take all the time you need.", body: "Thank you for being honest. No pressure and no rush.", primary: "Send response" };
  return `
    <button class="back" data-action="main">← Go back</button>
    <span class="eyebrow">${text(s.eyebrow)}</span>
    <h1>${text(s.heading)}</h1>
    <div class="copy-note"><span>🌿</span><div>${text(s.body)}</div></div>
    <div class="status-chip">✓ Boundaries respected · No pressure</div>
    <div class="action-stack" style="margin-top:20px;">
      <button type="button" class="choice primary" data-action="sendNeedsTime">${text(s.primary)}</button>
      <button type="button" class="choice ghost" data-action="main">Go back</button>
    </div>
  `;
}

const data = JSON.parse(document.querySelector("#invitation-data").textContent),
  app = document.querySelector("#app");
const screens = data.content?.screens || data.content || {},
  features = data.features || {},
  theme = data.theme || {};
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
  selectedLocation: "",
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
    /{{\s*(creatorName|inviterName|recipientName|nickname|selectedMood|activity|date|time|location)\s*}}/g,
    (_, k) =>
      ({
        creatorName: data.inviterName,
        inviterName: data.inviterName,
        recipientName: data.recipientName,
        nickname: state.nickname || data.recipientName,
        selectedMood: state.mood,
        activity: state.mood,
        date: state.date ? formatDate(state.date.slice(0, 10)) : "",
        time: state.selectedTime || "",
        location: state.selectedLocation || "",
      })[k],
  );
const text = (s) => esc(vars(s)).replace(/\n/g, "<br>");
const cleanFont = (f) => String(f ?? "").replace(/['"]/g, "");
function getLuminance(hex) {
  let c = String(hex || "").replace("#", "").trim();
  if (c.length === 3 || c.length === 4) c = c.split("").map((x) => x + x).join("");
  if (c.length >= 6) {
    const r = parseInt(c.slice(0, 2), 16) || 0;
    const g = parseInt(c.slice(2, 4), 16) || 0;
    const b = parseInt(c.slice(4, 6), 16) || 0;
    const a = [r / 255, g / 255, b / 255].map((v) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  return 0.5;
}
function resolveReadableForeground(bgHex) {
  return getLuminance(bgHex) > 0.55 ? "#1E1417" : "#FFFFFF";
}
const defaultBtnText = resolveReadableForeground(theme.primary || "#E6496F");
const defaultHeadingColor = resolveReadableForeground(theme.background || "#FCFAF6");
const css = `--bg:${theme.background || '#FCFAF6'};--primary:${theme.primary || '#E6496F'};--secondary:${theme.secondary || '#F4E9DD'};--accent:${theme.accent || theme.primary || '#FF7B94'};--text:${theme.text || '#282223'};--heading-color:${theme.headingColor || theme.heading_color || defaultHeadingColor};--muted:${theme.muted || '#70686A'};--card:${theme.card || '#FFFFFFEE'};--button-text:${theme.buttonText || defaultBtnText};--border:${theme.border || '#EADFE1'};--heading:'${cleanFont(theme.heading || 'DM Serif Display')}';--body:'${cleanFont(theme.body || 'Poppins')}'`;

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
    } catch { }
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
    } catch { }
    if (i === 0) await new Promise((r) => setTimeout(r, 350));
  }
}
function shell(content) {
  const modal404 = (state.screen === "finalAttempt" && state.evasionStage >= 4)
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

  return `<main class="invite-shell screen-${state.screen}" style='${css}'><div class="ambient a"></div><div class="ambient b"></div>${musicControl()}${features.mascots && features.mascotPack !== "none" ? mascots() : ""}<section class="invite-card" aria-live="polite">${content}</section>${features.collection ? collectibles() : ""}<footer class="invite-footer" role="contentinfo"><div class="footer-left"><button class="footer-privacy-btn" data-modal="privacy" type="button">Privacy</button>${features.collection ? `<span class="footer-cute-count">Cute things found: <b>${state.found.size}/5</b></span>` : ""}</div><div class="footer-credits"><span>© ${new Date().getFullYear()} Ask Her Out</span><span class="footer-sep" aria-hidden="true">·</span><span>Designed and developed by <a href="https://shivpatel.in" target="_blank" rel="noopener noreferrer">SastaTengo</a></span></div></footer><div id="toast" role="status"></div>${modal("privacy", "Privacy", `This invitation records interactions within this website, such as which options are selected and date preferences. It does not access your contacts, precise location, camera, microphone, or browsing history.`, "Got it")}${modal("secret", screens.secret.heading, screens.secret.body, screens.secret.primary)}${modal404}</main>`;
}
let synthCtx = null;
let synthGain = null;
let synthTimer = null;

function playAmbientPreset(key, volume = 0.35) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!synthCtx) synthCtx = new AudioCtx();
    if (synthCtx.state === "suspended") synthCtx.resume();

    if (synthGain) {
      synthGain.gain.setValueAtTime(volume, synthCtx.currentTime);
      state.musicPlaying = true;
      updateMusicUI();
      return;
    }

    synthGain = synthCtx.createGain();
    synthGain.gain.setValueAtTime(0.001, synthCtx.currentTime);
    synthGain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), synthCtx.currentTime + 1.2);
    synthGain.connect(synthCtx.destination);

    const chordProgressions = {
      "preset:lofi": [[261.63, 329.63, 392.00, 493.88], [220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [196.00, 246.94, 293.66, 349.23]],
      "preset:acoustic": [[261.63, 329.63, 392.00], [196.00, 246.94, 293.66], [220.00, 261.63, 329.63], [174.61, 220.00, 261.63]],
      "preset:piano": [[329.63, 392.00, 493.88, 587.33], [261.63, 329.63, 392.00, 523.25], [220.00, 261.63, 329.63, 440.00], [174.61, 220.00, 261.63, 349.23]],
      "preset:ukulele": [[261.63, 329.63, 392.00], [329.63, 392.00, 493.88], [220.00, 261.63, 329.63], [174.61, 220.00, 261.63]],
      "preset:jazz": [[261.63, 311.13, 392.00, 466.16], [196.00, 233.08, 293.66, 349.23], [174.61, 207.65, 261.63, 311.13], [220.00, 261.63, 329.63, 392.00]],
      "preset:ballad": [[220.00, 261.63, 329.63, 392.00], [174.61, 220.00, 261.63, 329.63], [130.81, 164.81, 196.00, 246.94], [146.83, 174.61, 220.00, 261.63]],
      "preset:dreamy": [[369.99, 440.00, 554.37, 659.25], [293.66, 369.99, 440.00, 587.33], [246.94, 329.63, 369.99, 493.88], [277.18, 369.99, 440.00, 554.37]]
    };

    const chords = chordProgressions[key] || chordProgressions["preset:lofi"];
    let step = 0;

    function playChord() {
      if (!synthGain || !synthCtx || synthCtx.state === "closed") return;
      const currentNotes = chords[step % chords.length];
      const now = synthCtx.currentTime;

      currentNotes.forEach((freq, i) => {
        const osc = synthCtx.createOscillator();
        const noteGain = synthCtx.createGain();
        osc.type = key === "preset:acoustic" || key === "preset:ukulele" ? "triangle" : (key === "preset:dreamy" ? "sine" : "triangle");
        osc.frequency.setValueAtTime(freq, now + i * 0.08);

        noteGain.gain.setValueAtTime(0.0001, now + i * 0.08);
        noteGain.gain.linearRampToValueAtTime(0.07, now + i * 0.08 + 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 2.2);

        osc.connect(noteGain);
        noteGain.connect(synthGain);

        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 2.4);
      });
      step++;
      synthTimer = setTimeout(playChord, 2400);
    }
    playChord();
    state.musicPlaying = true;
    updateMusicUI();
  } catch (err) { }
}

function stopAmbientPreset() {
  if (synthTimer) clearTimeout(synthTimer);
  if (synthGain && synthCtx) {
    try {
      synthGain.gain.setValueAtTime(0.0001, synthCtx.currentTime);
    } catch { }
  }
  synthGain = null;
  state.musicPlaying = false;
  updateMusicUI();
}

function getPlaylist() {
  if (features.tracks && Array.isArray(features.tracks) && features.tracks.length > 0) {
    return features.tracks.filter(s => s.enabled !== false);
  }
  if (features.playlist && Array.isArray(features.playlist) && features.playlist.length > 0) {
    return features.playlist.filter(s => s.enabled !== false);
  }
  if (features.musicUrl) {
    return [{
      id: 'default',
      name: features.musicName || 'Romantic soundtrack',
      title: features.musicName || 'Romantic soundtrack',
      artist: 'Romantic soundtrack',
      mood: features.musicMood || 'romantic',
      url: features.musicUrl,
      startTime: features.musicStartOffset || 0,
      endTime: null,
      default: true
    }];
  }
  return [];
}

function getCurrentSong() {
  const list = getPlaylist();
  if (!list.length) return null;
  if (state.playlistIndex === undefined || state.playlistIndex < 0 || state.playlistIndex >= list.length) {
    const defIdx = list.findIndex(s => s.default);
    state.playlistIndex = defIdx >= 0 ? defIdx : 0;
  }
  return list[state.playlistIndex];
}

function playSongAtIndex(idx) {
  const list = getPlaylist();
  if (!list.length) return;
  state.playlistIndex = (idx + list.length) % list.length;
  const song = list[state.playlistIndex];
  if (song && song.url) {
    if (song.url.startsWith("preset:")) {
      playAmbientPreset(song.url, savedMusicVolume || 0.35);
    } else if (musicAudio) {
      musicAudio.src = song.url;
      const start = Number(song.startTime) || 0;
      musicAudio.currentTime = start;
      musicAudio.play().catch(() => { });
    }
    updateMusicUI();
    render();
  }
}

function playNextSong() {
  playSongAtIndex((state.playlistIndex || 0) + 1);
}

function playPrevSong() {
  playSongAtIndex((state.playlistIndex || 0) - 1);
}

function handleTrackFinished() {
  const mode = features.musicPlaybackMode || 'playlist';
  const playlist = getPlaylist();
  const currentSong = getCurrentSong();

  if (mode === 'loop-track') {
    if (musicAudio) {
      musicAudio.currentTime = Number(currentSong?.startTime) || 0;
      musicAudio.play().catch(() => { });
    }
    return;
  }

  if (mode === 'once') {
    if (musicAudio) {
      musicAudio.pause();
      musicAudio.currentTime = Number(currentSong?.startTime) || 0;
    }
    state.musicPlaying = false;
    updateMusicUI();
    return;
  }

  if (playlist.length > 1) {
    const isLast = (state.playlistIndex || 0) >= playlist.length - 1;
    if (isLast && mode === 'playlist') {
      if (musicAudio) {
        musicAudio.pause();
        musicAudio.currentTime = Number(currentSong?.startTime) || 0;
      }
      state.musicPlaying = false;
      updateMusicUI();
    } else {
      playNextSong();
    }
  } else {
    if (musicAudio) {
      musicAudio.currentTime = Number(currentSong?.startTime) || 0;
      musicAudio.play().catch(() => { });
    }
  }
}

function setupMusic() {
  if (!features.music) return;
  savedMusicVolume = (features.musicVolume ? features.musicVolume / 100 : 0.35);
  if (features.musicSource === 'spotify') return;

  const song = getCurrentSong();
  if (!song || !song.url) return;
  if (song.url.startsWith("preset:")) return;

  if (
    !song.url.startsWith("/media/") &&
    !song.url.startsWith("data:audio/") &&
    !song.url.startsWith("http://") &&
    !song.url.startsWith("https://")
  )
    return;

  if (!musicAudio) {
    musicAudio = document.createElement("audio");
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
    musicAudio.addEventListener("ended", () => {
      handleTrackFinished();
    });
    musicAudio.addEventListener("timeupdate", () => {
      const curSong = getCurrentSong();
      if (curSong && curSong.endTime !== undefined && curSong.endTime !== null && Number(curSong.endTime) > 0) {
        if (musicAudio.currentTime >= Number(curSong.endTime)) {
          handleTrackFinished();
          return;
        }
      }
      updateMusicUI();
    });
    musicAudio.addEventListener("loadedmetadata", updateMusicUI);
  }

  musicAudio.src = song.url;
  musicAudio.preload = "metadata";
  musicAudio.volume = savedMusicVolume;
  const start = Number(song.startTime) || (features.musicStartOffset ? Number(features.musicStartOffset) : 0);
  musicAudio.currentTime = start;
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
  voiceAudio.addEventListener("timeupdate", updateVoiceUI);
  voiceAudio.addEventListener("loadedmetadata", updateVoiceUI);
  voiceAudio.addEventListener("waiting", () => {
    const status = document.querySelector("#voice-note-player .voice-status");
    if (status) status.textContent = "Buffering audio…";
  });
  voiceAudio.addEventListener("error", () => {
    state.voicePlaying = false;
    const status = document.querySelector("#voice-note-player .voice-status");
    if (status) status.textContent = "Audio unavailable";
  });
}
function duckMusic() {
  if (features.musicUrl && features.musicUrl.startsWith("preset:") && synthGain && synthCtx) {
    try { synthGain.gain.setValueAtTime(0.015, synthCtx.currentTime); } catch { }
    return;
  }
  if (!musicAudio) return;
  savedMusicVolume = musicAudio.volume || 0.35;
  musicAudio.volume = Math.min(0.08, savedMusicVolume * 0.25);
}
function restoreMusic() {
  if (features.musicUrl && features.musicUrl.startsWith("preset:") && synthGain && synthCtx) {
    try { synthGain.gain.setValueAtTime(savedMusicVolume || 0.35, synthCtx.currentTime); } catch { }
    return;
  }
  if (!musicAudio) return;
  musicAudio.volume = savedMusicVolume || 0.35;
}
function updateVoiceUI() {
  const card = document.querySelector("#voice-note-player");
  if (!card) return;
  card.classList.toggle("playing", state.voicePlaying);
  const btn = card.querySelector(".voice-play-btn");
  if (btn) {
    btn.textContent = state.voicePlaying ? "⏸" : "▶";
    btn.setAttribute("aria-label", state.voicePlaying ? "Pause voice note" : "Play voice note");
  }
  const status = card.querySelector(".voice-status");
  if (status && voiceAudio) {
    const cur = clock(voiceAudio.currentTime);
    const dur = voiceAudio.duration ? clock(voiceAudio.duration) : "0:00";
    status.textContent = state.voicePlaying ? `Playing… ${cur} / ${dur}` : (voiceAudio.currentTime > 0 ? `Paused · ${cur} / ${dur}` : "Tap to listen");
  }
}
function toggleVoiceNote() {
  if (!voiceAudio) return;
  if (voiceAudio.paused) {
    voiceAudio.play().catch(() => { });
  } else {
    voiceAudio.pause();
  }
}
function voiceNoteWidget() {
  if (!features.voiceNoteUrl) return "";
  const cur = voiceAudio ? clock(voiceAudio.currentTime) : "0:00";
  const dur = voiceAudio && voiceAudio.duration ? clock(voiceAudio.duration) : "0:00";
  const statusText = state.voicePlaying ? `Playing… ${cur} / ${dur}` : "Tap to listen";
  return `<div class="voice-note-card ${state.voicePlaying ? "playing" : ""}" id="voice-note-player" role="region" aria-label="Voice note player"><button class="voice-play-btn" data-voice="toggle" type="button" aria-label="Play voice note">${state.voicePlaying ? "⏸" : "▶"}</button><div class="voice-meta"><b>🎙️ Voice note from ${esc(data.inviterName)}</b><small class="voice-status">${statusText}</small></div><div class="voice-waveform" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></div></div>`;
}
function musicControl() {

  const playlist = getPlaylist();
  const currentSong = getCurrentSong();
  const isPreset = Boolean(currentSong?.url && currentSong.url.startsWith("preset:"));
  const empty = !musicAudio && !isPreset && !currentSong;
  if (empty && !(data.preview && features.music)) return "";
  const disabled = empty ? "disabled" : "";
  const style = features.musicPlayerStyle || "romantic";
  const name = currentSong?.name || features.musicName || (isPreset ? "Romantic Ambient Soundtrack" : "Romantic soundtrack");
  const hasMultiple = playlist.length > 1;

  if (style === "ambient") {
    return `
      <div class="music-player style-ambient ${empty ? "music-empty" : ""}" role="group" aria-label="Ambient music">
        <button class="ambient-music-btn" data-music="toggle" type="button" aria-label="${state.musicPlaying ? "Mute ambient music" : "Play ambient music"}" ${disabled}>
          <span>${state.musicPlaying ? "♫" : "♪"}</span>
        </button>
      </div>
    `;
  }

  if (style === "minimal") {
    return `
      <div class="music-player style-minimal ${empty ? "music-empty" : ""} ${state.musicPlaying ? "playing" : ""}" role="group" aria-label="Music player">
        ${hasMultiple ? `<button class="minimal-nav-btn" data-music="prev" type="button" aria-label="Previous track" style="border:none;background:transparent;cursor:pointer;font-size:0.85rem;">⏮</button>` : ''}
        <button class="music-play minimal-play-btn" data-music="toggle" type="button" aria-label="${state.musicPlaying ? "Pause music" : "Play music"}" ${disabled}>
          ${state.musicPlaying ? "❚❚" : "▶"}
        </button>
        ${hasMultiple ? `<button class="minimal-nav-btn" data-music="next" type="button" aria-label="Next track" style="border:none;background:transparent;cursor:pointer;font-size:0.85rem;">⏭</button>` : ''}
        <span class="minimal-title">${text(empty ? "No song selected" : name)}</span>
        <button class="minimal-vol-btn" data-music="mute" type="button" aria-label="Toggle sound" ${disabled}>
          ${musicAudio?.muted ? "🔇" : "🔊"}
        </button>
      </div>
    `;
  }

  if (style === "floating") {
    return `
      <div class="music-player style-floating ${empty ? "music-empty" : ""} ${state.musicPlaying ? "playing" : ""}" role="group" aria-label="Floating music player">
        <button class="floating-heart-btn" data-music="toggle" type="button" aria-label="${state.musicPlaying ? "Pause music" : "Play music"}" ${disabled}>
          <span class="heart-icon">♥</span>
        </button>
        <span class="floating-tooltip">${text(empty ? "Music" : name)}</span>
      </div>
    `;
  }

  if (style === "glass") {
    return `
      <div class="music-player style-glass ${empty ? "music-empty" : ""} ${state.musicMinimized ? "minimized" : ""}" role="group" aria-label="Glass music player">
        <div class="music-head">
          <button class="music-minimize" data-music="minimize" aria-label="Minimize player">⌄</button>
          <span class="music-cover" aria-hidden="true">✨</span>
          <div class="music-meta">
            <b>${text(empty ? "Add a song in editor" : name)}</b>
            <small>${state.musicPlaying ? (hasMultiple ? `${(state.playlistIndex || 0) + 1}/${playlist.length} · Now playing` : "Now playing") : "Paused"}</small>
          </div>
          <button data-music="mute" aria-label="Mute music" ${disabled}>${musicAudio?.muted ? "🔇" : "🔊"}</button>
        </div>
        <div class="music-progress">
          <time data-current>0:00</time>
          <input data-music="seek" type="range" min="0" max="100" value="0" aria-label="Song progress" ${disabled || isPreset ? "disabled" : ""}>
          <time data-duration>${empty || isPreset ? "--:--" : "0:00"}</time>
        </div>
        <div class="music-controls">
          ${hasMultiple ? `<button data-music="prev" aria-label="Previous song">⏮</button>` : `<button data-music="back" aria-label="Go back 10 seconds" ${disabled || isPreset ? "disabled" : ""}>↶</button>`}
          <button class="music-play" data-music="toggle" aria-label="Play music" ${disabled}>${state.musicPlaying ? "❚❚" : "▶"}</button>
          ${hasMultiple ? `<button data-music="next" aria-label="Next song">⏭</button>` : `<button data-music="forward" aria-label="Go forward 10 seconds" ${disabled || isPreset ? "disabled" : ""}>↷</button>`}
          <label class="music-volume">
            <span aria-hidden="true">🔉</span>
            <input data-music="volume" type="range" min="0" max="100" value="${features.musicVolume || 35}" aria-label="Music volume" ${disabled}>
          </label>
        </div>
      </div>
    `;
  }

  if (style === "compact") {
    const artist = currentSong?.artist || "Romantic vibes";
    return `
      <div class="music-player style-compact ${empty ? "music-empty" : ""} ${state.musicPlaying ? "playing" : ""}" role="group" aria-label="Compact music player">
        <span class="compact-disc ${state.musicPlaying ? "spin" : ""}" aria-hidden="true">♫</span>
        <div class="compact-info">
          <b class="compact-title">${text(empty ? "No song selected" : name)}</b>
          <small class="compact-artist">${text(artist)}</small>
        </div>
        ${hasMultiple ? `<button class="compact-btn" data-music="prev" type="button" aria-label="Previous track">⏮</button>` : ''}
        <button class="compact-btn music-play" data-music="toggle" type="button" aria-label="${state.musicPlaying ? "Pause music" : "Play music"}" ${disabled}>
          ${state.musicPlaying ? "❚❚" : "▶"}
        </button>
        ${hasMultiple ? `<button class="compact-btn" data-music="next" type="button" aria-label="Next track">⏭</button>` : ''}
        <button class="compact-btn" data-music="mute" type="button" aria-label="Mute sound" ${disabled}>
          ${musicAudio?.muted ? "🔇" : "🔊"}
        </button>
      </div>
    `;
  }

  // Default: Romantic Vinyl Player
  return `
    <div class="music-player style-romantic ${empty ? "music-empty" : ""} ${state.musicMinimized ? "minimized" : ""}" role="group" aria-label="Romantic music player">
      <div class="music-head">
        <button class="music-minimize" data-music="minimize" aria-label="Minimize player">⌄</button>
        <span class="music-cover vinyl-disc ${state.musicPlaying ? "spin" : ""}" aria-hidden="true">💿</span>
        <div class="music-meta">
          <b>${text(empty ? "Add a song in the editor" : name)}</b>
          <small>${state.musicPlaying ? (hasMultiple ? `${(state.playlistIndex || 0) + 1}/${playlist.length} · Playing vibes ❤️` : "Playing romantic vibes ❤️") : "Tap play to listen"}</small>
        </div>
        <i class="music-bars ${state.musicPlaying ? "animated" : ""}" aria-hidden="true"><b></b><b></b><b></b><b></b></i>
        <button data-music="mute" aria-label="Mute music" ${disabled}>${musicAudio?.muted ? "🔇" : "🔊"}</button>
      </div>
      <div class="music-progress">
        <time data-current>0:00</time>
        <input data-music="seek" type="range" min="0" max="100" value="0" aria-label="Song progress" ${disabled || isPreset ? "disabled" : ""}>
        <time data-duration>${empty || isPreset ? "--:--" : "0:00"}</time>
      </div>
      <div class="music-controls">
        ${hasMultiple ? `<button data-music="prev" aria-label="Previous song">⏮</button>` : `<button data-music="back" aria-label="Go back 10 seconds" ${disabled || isPreset ? "disabled" : ""}>↶</button>`}
        <button class="music-play" data-music="toggle" aria-label="Play music" ${disabled}>${state.musicPlaying ? "❚❚" : "▶"}</button>
        ${hasMultiple ? `<button data-music="next" aria-label="Next song">⏭</button>` : `<button data-music="forward" aria-label="Go forward 10 seconds" ${disabled || isPreset ? "disabled" : ""}>↷</button>`}
        <label class="music-volume">
          <span aria-hidden="true">🔉</span>
          <input data-music="volume" type="range" min="0" max="100" value="${features.musicVolume || 35}" aria-label="Music volume" ${disabled}>
        </label>
      </div>
    </div>
  `;
}

function initDraggableMusicPlayer() {
  const player = document.querySelector('.music-player');
  if (!player) return;

  const pos = features.musicPlayerPosition || 'bottom-right';
  const custom = features.musicCustomPosition;

  player.classList.remove('pos-bottom-right', 'pos-bottom-left', 'pos-top-right', 'pos-top-left', 'pos-center-right', 'pos-center-left', 'pos-custom');
  if (pos === 'custom' && custom && typeof custom.x === 'number' && typeof custom.y === 'number') {
    player.classList.add('pos-custom');
    const safeW = window.innerWidth - player.offsetWidth - 24;
    const safeH = window.innerHeight - player.offsetHeight - 24;
    const initX = 12 + custom.x * Math.max(0, safeW);
    const initY = 12 + custom.y * Math.max(0, safeH);
    player.style.left = `${Math.round(initX)}px`;
    player.style.top = `${Math.round(initY)}px`;
    player.style.right = 'auto';
    player.style.bottom = 'auto';
  } else {
    player.classList.add(`pos-${pos}`);
  }

  let isDragging = false;
  let startX = 0, startY = 0;
  let elemLeft = 0, elemTop = 0;

  const onPointerDown = (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a') || e.target.closest('iframe')) {
      return;
    }
    const rect = player.getBoundingClientRect();
    isDragging = true;
    startX = e.clientX || 0;
    startY = e.clientY || 0;
    elemLeft = rect.left;
    elemTop = rect.top;

    player.classList.add('is-dragging');
    player.style.position = 'fixed';
    player.style.left = `${elemLeft}px`;
    player.style.top = `${elemTop}px`;
    player.style.right = 'auto';
    player.style.bottom = 'auto';

    try {
      player.setPointerCapture(e.pointerId);
    } catch { }
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || 0;
    const clientY = e.clientY || 0;
    const dx = clientX - startX;
    const dy = clientY - startY;

    const margin = window.innerWidth <= 600 ? 12 : 16;
    const maxLeft = window.innerWidth - player.offsetWidth - margin;
    const maxTop = window.innerHeight - player.offsetHeight - margin;

    const newLeft = Math.max(margin, Math.min(maxLeft, elemLeft + dx));
    const newTop = Math.max(margin, Math.min(maxTop, elemTop + dy));

    player.style.left = `${newLeft}px`;
    player.style.top = `${newTop}px`;
  };

  const onPointerUp = (e) => {
    if (!isDragging) return;
    isDragging = false;
    player.classList.remove('is-dragging');
    try {
      player.releasePointerCapture(e.pointerId);
    } catch { }
  };

  player.addEventListener('pointerdown', onPointerDown);
  player.addEventListener('pointermove', onPointerMove);
  player.addEventListener('pointerup', onPointerUp);
  player.addEventListener('pointercancel', onPointerUp);
}

function showAutoplayBanner() {
  if (document.getElementById("autoplay-prompt") || state.musicPlaying) return;
  const prompt = document.createElement("button");
  prompt.id = "autoplay-prompt";
  prompt.type = "button";
  prompt.className = "autoplay-prompt-pill";
  prompt.innerHTML = `<span>🎵 Tap to play romantic music ❤️</span>`;
  prompt.addEventListener("click", () => {
    startMusic();
    prompt.remove();
  });
  document.body.appendChild(prompt);
  setTimeout(() => {
    if (prompt && !state.musicPlaying) {
      prompt.classList.add("show");
    }
  }, 800);
}

function startMusic() {
  if (features.musicUrl && features.musicUrl.startsWith("preset:")) {
    if (!state.musicPlaying) playAmbientPreset(features.musicUrl, savedMusicVolume || 0.35);
    return;
  }
  if (!musicAudio || !musicAudio.paused) return;
  musicAudio.play().catch(() => {
    showAutoplayBanner();
  });
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
  if (minimize) {
    minimize.textContent = state.musicMinimized ? "⌃" : "⌄";
    minimize.setAttribute(
      "aria-label",
      state.musicMinimized ? "Expand player" : "Minimize player",
    );
  }
  const isPreset = Boolean(features.musicUrl && features.musicUrl.startsWith("preset:"));
  if (!musicAudio && !isPreset) return;
  player.classList.toggle("playing", Boolean(state.musicPlaying));
  const play = player.querySelector('[data-music="toggle"]');
  if (play) {
    play.textContent = state.musicPlaying ? "❚❚" : "▶";
    play.setAttribute(
      "aria-label",
      state.musicPlaying ? "Pause music" : "Play music",
    );
  }
  if (musicAudio) {
    const mute = player.querySelector('[data-music="mute"]'),
      seek = player.querySelector('[data-music="seek"]'),
      volume = player.querySelector('[data-music="volume"]');
    if (mute) {
      mute.textContent = musicAudio.muted ? "🔇" : "🔊";
      mute.setAttribute(
        "aria-label",
        musicAudio.muted ? "Unmute music" : "Mute music",
      );
    }
    if (seek) {
      seek.value = musicAudio.duration
        ? (musicAudio.currentTime / musicAudio.duration) * 100
        : 0;
      seek.style.setProperty("--music-progress", `${seek.value}%`);
    }
    if (volume) volume.value = musicAudio.muted ? 0 : musicAudio.volume * 100;
    const cur = player.querySelector("[data-current]");
    if (cur) cur.textContent = clock(musicAudio.currentTime);
    const dur = player.querySelector("[data-duration]");
    if (dur) dur.textContent = clock(musicAudio.duration);
  }
}
function mascotPackData(pack = "original") {
  const packs = {
    original: { yFace: "✦", yName: "Yellow", bFace: "•ᴗ•", bName: "Blue", yBg: "#FFDC00", bBg: "#0074D9" },
    yellow: { yFace: "✦", yName: "Sunny", bFace: "★", bName: "Goldie", yBg: "#F59E0B", bBg: "#D97706" },
    blue: { yFace: "•ᴗ•", yName: "Sky", bFace: "•ω•", bName: "Navy", yBg: "#38BDF8", bBg: "#1D4ED8" },
    pink: { yFace: "ᐡ-ﻌ•ᐡ", yName: "Bunny", bFace: "✿", bName: "Peach", yBg: "#F472B6", bBg: "#E11D48" },
    bears: { yFace: "ʕ•ᴥ•ʔ", yName: "Honey", bFace: "ʕ·ᴥ·ʔ", bName: "Panda", yBg: "#B45309", bBg: "#374151" },
    cats: { yFace: "ฅ^•ﻌ•^ฅ", yName: "Mochi", bFace: "(^._.^)", bName: "Luna", yBg: "#FBBF24", bBg: "#8B5CF6" },
    bunnies: { yFace: "( •_•)", yName: "Pip", bFace: "(>.<)", bName: "Pop", yBg: "#FB7185", bBg: "#A855F7" },
  };
  return packs[pack] || packs.original;
}
function mascots() {
  const pack = mascotPackData(features.mascotPack);
  const lines = {
    thinking: [`${pack.bName} says: “Bhai nervous hai 😭”`, `${pack.yName} says: “Obviously.”`],
    convince: [
      `${pack.bName} says: “Say something impressive!”`,
      `${pack.yName} says: “Usko aata hi nahi 😂”`,
    ],
    finalAttempt: [
      `${pack.bName} says: “One last try?”`,
      `${pack.yName} says: “Food mention kar.”`,
    ],
  }[state.screen];
  return `<button class="mascot mascot-yellow" data-tiny style="background:${pack.yBg};" aria-label="A cheerful ${pack.yName} mascot"><span>${pack.yFace}</span><i></i></button><div class="mascot mascot-blue" style="background:${pack.bBg};" aria-hidden="true"><span>${pack.bFace}</span></div>${lines ? `<div class="mascot-banter" aria-hidden="true"><span>${lines[0]}</span><span>${lines[1]}</span></div>` : ""}`;
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
  if (state.screen === "intro") content = copy(s, btn(s.primary, "open", "primary"));
  else if (state.screen === "analysis") content = analysisScreen();
  else if (state.screen === "main") content = mainScreen();
  else if (state.screen === "memories") content = memoriesScreen();
  else if (state.screen === "thinking") content = thinkingScreen();
  else if (state.screen === "convince") content = convinceScreen();
  else if (state.screen === "benefits") content = benefitsScreen();
  else if (state.screen === "mood") content = moodScreen();
  else if (state.screen === "moodConfirm") content = `<button class="back" data-action="mood">← Back</button><span class="eyebrow">DATE VIBE SELECTED ✓</span><h1>${text(state.mood)}</h1><div class="reaction-card"><span>✨</span><b>${moodReaction()}</b></div><div class="action-stack">${btn(screens.mood?.primary || "Continue", "yes", "primary")}${btn(screens.mood?.secondary || "Choose another", "mood")}</div>`;
  else if (state.screen === "needsTime") content = needsTimeScreen();
  else if (state.screen === "finalAttempt") content = finalAttemptScreen();
  else if (state.screen === "yes") content = yesScreen();
  else if (state.screen === "availability") content = availabilityScreen();
  else if (state.screen === "success") content = successScreen();
  else if (state.screen === "decline") content = declineScreen();
  else if (state.screen === "space") content = spaceScreen();
  else content = mainScreen();
  app.innerHTML = shell(content);
  bind();
  initDraggableMusicPlayer();
  updateMusicUI();
  if (state.screen === "analysis")
    requestAnimationFrame(() =>
      document
        .querySelectorAll(".bar i")
        .forEach((el) => (el.style.width = el.dataset.width)),
    );
  if (state.screen === "yes" && !features.respectfulMode) {
    playCelebrationChime();
    if (features.confetti && !sessionStorage.getItem(`hl-confetti-${data.token}`)) {
      confetti();
      sessionStorage.setItem(`hl-confetti-${data.token}`, "1");
    }
  }
}

function thinkingScreen() {
  const s = screens.thinking;
  if (features.respectfulMode) {
    return `${back(s.eyebrow || "Back")}${copy({ ...s, eyebrow: "" })}<div class="action-stack">${btn(s.primary, "readyToTalk", "primary")}${btn(s.secondary, "needsTime", "respect")}${btn(s.tertiary, "requestSpace", "ghost")}${s.quaternary ? btn(s.quaternary, "benefits") : ""}</div>`;
  }
  return `${back(s.eyebrow || "Back")}${copy({ ...s, eyebrow: "" })}<div class="talk-points"><span>🥹 Come on ${text(state.nickname)}… ek date hi toh maang raha hoon</span><span>✨ I promise, achhi jagah leke jaunga</span></div><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "convince")}${btn(s.quaternary, "finalAttempt")}</div>`;
}
function convinceScreen() {
  const s = screens.convince;
  if (features.respectfulMode) {
    return `${back(s.eyebrow || "Back")}${copy({ ...s, eyebrow: "" })}<div class="action-stack">${btn(s.primary, "readyToTalk", "primary")}${btn(s.secondary, "mood")}${btn(s.tertiary, "requestSpace", "ghost")}</div>`;
  }
  return `${back(s.eyebrow || "Back")}${copy({ ...s, eyebrow: "" })}<div class="reason-grid"><span><b>😌</b>Good company</span><span><b>🍕</b>Food involved</span><span><b>😂</b>Unlimited bakwaas</span><span><b>👀</b>Zero boring moments</span><span class="wide"><b>❤️</b>I really want to take YOU out</span></div><div class="action-stack">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "benefits")}${s.tertiary ? btn(s.tertiary, "mood") : ""}${s.quaternary ? btn(s.quaternary, "finalAttempt") : ""}</div>`;
}
function spaceScreen() {
  return `
    <span class="eyebrow">Choice respected 🌿</span>
    <h1>I will respect your space.</h1>
    <div class="copy-note">
      <span>🌿</span>
      <div>Thank you for being honest. I will not pressure you, and I will not send follow-up messages. Take all the time you need.</div>
    </div>
    <div class="status-chip">✓ Boundaries respected · No pressure</div>
    <div class="action-stack" style="margin-top:20px;">
      <button type="button" class="choice primary" data-action="complete">Done 🌿</button>
    </div>
  `;
}

function memoriesScreen() {
  const list = features.memoriesList || [];
  const items = list.map((m, i) => `
    <div class="story-timeline-item" data-memory-idx="${i}">
      <div class="story-timeline-node" aria-hidden="true">
        <span class="story-node-dot">💖</span>
        ${i < list.length - 1 ? '<span class="story-node-line"></span>' : ''}
      </div>
      <article class="story-timeline-card">
        ${m.date ? `<time class="story-date-badge">🗓️ ${esc(m.date)}</time>` : ''}
        ${m.photoUrl ? `
          <div class="story-photo-frame">
            <img src="${esc(m.photoUrl)}" alt="${esc(m.title || 'Memory photo')}" class="story-photo-img" loading="lazy" onerror="this.parentElement.style.display='none'">
          </div>
        ` : ''}
        <div class="story-text-wrap">
          <h3 class="story-title">${esc(m.title || `Moment #${i + 1}`)}</h3>
          ${m.caption ? `<p class="story-description">${esc(m.caption)}</p>` : ''}
        </div>
      </article>
    </div>
  `).join('');

  return `
    ${back("← Back to question")}
    <span class="eyebrow">Our Special Journey ✨</span>
    <h1>Our Story ❤️</h1>
    <p class="body-copy">A few of the sweetest moments that make this invitation special. 😌❤️</p>
    <div class="story-timeline-container" role="region" aria-label="Our story memory timeline">
      ${items || '<p class="body-copy">No memories added yet.</p>'}
    </div>
    <div class="action-stack" style="margin-top:24px;">
      ${btn("Haan, chalo 😌❤️", "yes", "primary")}
      ${btn("← Back to question", "main")}
    </div>
  `;
}
function finalAttemptScreen() {
  const s = screens.finalAttempt;
  return `
    <button class="back" data-action="main">${text(s.eyebrow || "Return to question")}</button>
    <span class="eyebrow">FINAL PLAYFUL QUESTION ✨</span>
    <h1 class="closing-question">${text(s.heading)}</h1>
    <div class="copy-note"><span>🧸</span><div>${text(s.body)}</div></div>
    <div class="action-stack" style="margin-top:16px;">
      ${btn(s.primary || "Chal theek hai! 💖", "yes", "primary")}
      ${s.secondary ? btn(s.secondary, "surpriseYes", "primary") : ""}
      ${s.tertiary ? btn(s.tertiary, "needsTime", "respect") : ""}
      ${s.quaternary ? btn(s.quaternary, "decline", "ghost") : ""}
      ${s.quinary ? btn(s.quinary, "decline", "ghost") : ""}
    </div>
  `;
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
  const memoriesBtn = (features.memories && features.memoriesList && features.memoriesList.length > 0)
    ? btn(`📸 Our Memories (${features.memoriesList.length})`, "memories", "ghost")
    : "";
  if (features.respectfulMode) {
    return `<span class="eyebrow">${text(revisit)}</span><h1>${text(s.heading)}</h1><div class="copy-note"><span>💐</span><div>${text(s.body)}</div></div><div class="question-actions">${btn(s.primary, "readyToTalk", "primary")}${btn(s.secondary, "needsTime", "respect")}${btn(s.tertiary, "requestSpace", "ghost")}${memoriesBtn}</div>`;
  }
  return `<span class="eyebrow">${text(revisit)}</span><h1>${text(s.heading)}</h1><div class="copy-note"><span>✉️</span><div>${text(s.body)}</div></div><div class="love-envelope" aria-hidden="true"><i></i><span>✦</span></div><div class="question-actions">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "thinking")}${btn(s.tertiary, "convince")}${s.quaternary ? btn(s.quaternary, "mood") : ""}${memoriesBtn}</div>`;
}
function benefitsScreen() {
  const s = screens.benefits;
  const items = [
    ["🍕", "Favorite food"],
    ["💬", "Good conversation"],
    ["🍰", "Dessert included"],
    ["🌿", "Zero pressure"],
  ];
  return `<button class="back" data-action="convince">${text(s.eyebrow || "Back")}</button>${copy({ ...s, eyebrow: "" })}<div class="benefit-grid">${items.map(([icon, label]) => `<span><b>✓</b>${label}</span>`).join("")}</div><div class="stat-pills"><span><b>100%</b> Fun</span><span><b>100%</b> Food</span><span><b>127%</b> Bakwaas</span></div><div class="terms"><span>🍰</span><small>Dessert is included.</small></div><div class="action-stack" style="margin-top:18px;">${btn(s.primary, "yes", "primary")}${btn(s.secondary, "finalAttempt")}</div>`;
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
  return `${back(s.eyebrow)}${copy({ ...s, eyebrow: "" })}<div class="selected-mood"><div><span class="selected-label">${selected.favorite ? "★ My favorite" : "Your Favourite"}</span><br><b>${text(selected.title)}</b><br><small>${text(selected.description)}</small></div><div class="mood-mascots" aria-hidden="true"><i>•ᴗ•</i><i>•ᴗ•</i></div></div><span class="mood-change-label">Want a different option? 👀</span><div class="mood-grid">${others.map((m) => `<button class="mood-card" data-action="pickMood" data-value="${esc(m.title)}"><i class="mood-icon" aria-hidden="true">${moodIcon(m.title)}</i><span><b>${text(m.title)}</b><br><small>${text(m.description)}</small></span></button>`).join("")}</div><button class="choice primary favorite-continue" data-action="pickMood" data-value="${esc(selected.title)}">${text(s.primary)}</button>`;
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
  const quote = s.body || "I knew you would.";
  return `
    <div class="celebration-hero">
      <div class="celebration-heart-badge" aria-hidden="true">
        <span class="heart-pulse">💖</span>
        <span class="sparkle-orbit s1">✨</span>
        <span class="sparkle-orbit s2">✨</span>
        <span class="sparkle-orbit s3">✨</span>
      </div>
      <div class="celebration-banner-tag">✨ IT'S A DATE! 💖 ✨</div>
      <h1 class="celebration-title">${text(s.heading || "IT'S A DATE! 💖")}</h1>
      <div class="celebration-emoji-stage" aria-hidden="true">🥹 💖 ✨</div>
      <p class="celebration-quote">“${text(quote)}”</p>
      <p class="celebration-subquote">Our next chapter starts here. ✨</p>
      <div class="answer-chips">
        <span>👀 ${text(state.nickname || data.recipientName)}</span>
        <span>✨ 100% Date Locked! 💖</span>
      </div>
    </div>
    ${datePass("Official Date Pass", `${state.nickname || data.recipientName} + ${data.inviterName}`, state.mood || "Dinner + Dessert 🍝", state.date ? formatDateTime(state.date) : "Pick date & time below 😌")}
    ${voiceNoteWidget()}
    <div class="action-stack" style="margin-top:18px;">
      ${btn(s.primary || "Choose date and time", "availability", "primary")}
      <button type="button" class="choice ghost" data-action="letThemPlan">${text(s.secondary || `Let ${data.inviterName} plan it`)}</button>
    </div>
  `;
}
function locationOptions() {
  const customLocs = data.content?.locations || [
    { title: "Surprise me 😏", desc: "You pick the spot, I’ll just show up and look cute." },
    { title: "Cozy Dinner 🍝", desc: "Italian or candlelit fine dining." },
    { title: "Cafe & Dessert ☕🍰", desc: "Specialty coffee, matcha, and cheesecake." },
    { title: "Fun Activity / Outdoor 🎡", desc: "Arcade, bowling, or sunset walk." }
  ];

  return customLocs.map((loc, idx) => {
    const title = typeof loc === 'string' ? loc : loc.title;
    const isSelected = state.selectedLocation ? (state.selectedLocation === title) : (idx === 0);
    return `
      <label class="location-option-card ${isSelected ? 'selected' : ''}">
        <input type="radio" name="date-location" value="${esc(title)}" ${isSelected ? 'checked' : ''} data-location>
        <span class="location-radio-circle"></span>
        <div class="location-text">
          <b>${esc(title)}</b>
          ${loc.desc ? `<small>${esc(loc.desc)}</small>` : ''}
        </div>
      </label>
    `;
  }).join('');
}
function availabilityScreen() {
  const s = screens.availability;
  return `
    ${copy(s)}
    <div id="date-pick" class="date-time-pick">
      <section class="date-field">
        <div class="picker-label">
          <span>📅 Pick a date ❤️</span>
          <b>${state.selectedDate ? formatDate(state.selectedDate) : "Choose a day"}</b>
        </div>
        ${calendar()}
      </section>
      <fieldset class="time-field" style="margin-top:14px;">
        <legend style="margin-bottom:8px;font-size:0.84rem;font-weight:700;color:var(--heading-color, var(--text));">⏰ What time works best?</legend>
        <div class="time-options">
          ${timeOptions()}
        </div>
      </fieldset>
      <fieldset class="location-field" style="margin-top:14px;">
        <legend style="margin-bottom:8px;font-size:0.84rem;font-weight:700;color:var(--heading-color, var(--text));">📍 Where should we go?</legend>
        <div class="location-options">
          ${locationOptions()}
        </div>
      </fieldset>
      <button class="choice primary" data-action="submitDate" style="margin-top:18px;min-height:48px;">
        Confirm Date & Location ❤️
      </button>
    </div>
  `;
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
    const value = `${String(hour).padStart(2, "0")}:00:00`;
    return `<label class="time-option"><input data-time type="radio" name="date-time" value="${value}" ${state.selectedTime === value ? "checked" : ""}><span>${label}</span></label>`;
  }).join("");
}
function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function datePass(title, people, plan, when) {
  return `<div class="date-pass" id="date-pass-card"><div class="pass-title">✦ ${text(title)} ✦ <small>DATE #001</small></div><div><span>👫</span><b>${text(people)}</b></div><div><span>🗓️</span><b>${text(when)}</b></div><div><span>🍔</span><b>${text(plan)}</b></div><div><span>😎</span><b>Admits: two cute idiots 😂</b></div></div>`;
}
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
async function generateDateCardCanvas() {
  const cardWidth = 1080;
  const cardHeight = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = cardWidth;
  canvas.height = cardHeight;
  const ctx = canvas.getContext("2d");

  const bg = theme.background || "#FCFAF6";
  const primary = theme.primary || "#E6496F";
  const headingColor = theme.headingColor || "#20191B";
  const textColor = theme.text || "#282223";
  const mutedColor = theme.muted || "#70686A";
  const cardBg = theme.card && theme.card.startsWith("#") ? theme.card.slice(0, 7) : "#FFFFFF";
  const borderColor = theme.border || "#EADFE1";
  const accentColor = theme.accent || primary;

  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cardWidth, cardHeight);

  // Soft Ambient Glow Circles
  const grad1 = ctx.createRadialGradient(200, 200, 50, 200, 200, 450);
  grad1.addColorStop(0, primary + "28");
  grad1.addColorStop(1, "transparent");
  ctx.fillStyle = grad1;
  ctx.beginPath();
  ctx.arc(200, 200, 450, 0, Math.PI * 2);
  ctx.fill();

  const grad2 = ctx.createRadialGradient(880, 1150, 50, 880, 1150, 450);
  grad2.addColorStop(0, accentColor + "28");
  grad2.addColorStop(1, "transparent");
  ctx.fillStyle = grad2;
  ctx.beginPath();
  ctx.arc(880, 1150, 450, 0, Math.PI * 2);
  ctx.fill();

  // Outer Ticket Container Card
  const padX = 80;
  const padY = 90;
  const w = cardWidth - padX * 2;
  const h = cardHeight - padY * 2;
  const rad = 48;

  ctx.save();
  ctx.shadowColor = "rgba(40, 20, 30, 0.12)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = cardBg;
  roundRect(ctx, padX, padY, w, h, rad);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  roundRect(ctx, padX, padY, w, h, rad);
  ctx.stroke();

  // Header Pill: DATE CONFIRMED
  const pillY = padY + 70;
  ctx.fillStyle = primary + "18";
  roundRect(ctx, cardWidth / 2 - 170, pillY, 340, 58, 29);
  ctx.fill();
  ctx.strokeStyle = primary + "40";
  ctx.lineWidth = 2;
  roundRect(ctx, cardWidth / 2 - 170, pillY, 340, 58, 29);
  ctx.stroke();

  ctx.font = "bold 22px sans-serif";
  ctx.fillStyle = primary;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("❤️ DATE CONFIRMED ❤️", cardWidth / 2, pillY + 29);

  // Big Title
  ctx.font = "bold 68px serif";
  ctx.fillStyle = headingColor;
  ctx.fillText("IT'S A DATE.", cardWidth / 2, pillY + 122);

  // Subtitle / Names
  const names = `${state.nickname || data.recipientName}  ❤️  ${data.inviterName}`;
  ctx.font = "bold 38px sans-serif";
  ctx.fillStyle = primary;
  ctx.fillText(names, cardWidth / 2, pillY + 195);

  // Perforated Dashed Line with Notches
  const dashY = pillY + 265;
  ctx.beginPath();
  ctx.setLineDash([14, 12]);
  ctx.strokeStyle = primary + "40";
  ctx.lineWidth = 3;
  ctx.moveTo(padX + 40, dashY);
  ctx.lineTo(padX + w - 40, dashY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Ticket Side Notches
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(padX, dashY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(padX + w, dashY, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Information Grid
  const when = state.date ? formatDateTime(state.date) : "We decide 😌";
  const plan = state.mood || "Food + Fun + Unlimited Bakwaas";

  const rows = [
    { icon: "👫", label: "WHO", val: `${state.nickname || data.recipientName} + ${data.inviterName}` },
    { icon: "🗓️", label: "WHEN", val: when },
    { icon: "🍔", label: "VIBE / PLAN", val: plan },
    { icon: "😎", label: "ENTRY", val: "Admits: Two cute idiots 😂" },
  ];

  let currentY = dashY + 65;
  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? bg + "88" : "transparent";
    roundRect(ctx, padX + 36, currentY - 8, w - 72, 94, 20);
    ctx.fill();

    ctx.font = "38px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(r.icon, padX + 80, currentY + 40);

    ctx.font = "bold 18px sans-serif";
    ctx.fillStyle = mutedColor;
    ctx.textAlign = "left";
    ctx.fillText(r.label, padX + 130, currentY + 24);

    ctx.font = "600 30px sans-serif";
    ctx.fillStyle = textColor;
    ctx.fillText(r.val, padX + 130, currentY + 62);

    currentY += 105;
  });

  // Footer Quote & Watermark
  const footerY = padY + h - 105;
  ctx.font = "italic 26px sans-serif";
  ctx.fillStyle = mutedColor;
  ctx.textAlign = "center";
  ctx.fillText("“Screenshot this. Evidence secured 😂”", cardWidth / 2, footerY);

  ctx.font = "bold 20px sans-serif";
  ctx.fillStyle = primary;
  ctx.fillText("✦ ASK HER FOR DATE ✦", cardWidth / 2, footerY + 42);

  return canvas;
}
async function downloadDateCard() {
  try {
    toast("Preparing your Date Card... 📸");
    const canvas = await generateDateCardCanvas();
    const link = document.createElement("a");
    const slug = (data.recipientName || "date").toLowerCase().replace(/[^a-z0-9]/g, "-");
    link.download = `date-confirmed-${slug}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast("Date Card downloaded! ❤️");
    track("button_clicked", state.screen, "download_date_card");
  } catch (err) {
    toast("Could not download date card. Screenshot this page instead! 😂");
  }
}
function fallbackShare(shareText) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      toast("Confirmation copied to clipboard! 💌");
      downloadDateCard();
    }).catch(() => {
      downloadDateCard();
    });
  } else {
    downloadDateCard();
  }
}
async function shareDateCard() {
  const when = state.date ? formatDateTime(state.date) : "We decide 😌";
  const plan = state.mood || "Food + Fun";
  const shareText = `Hey ${data.inviterName}! I said YES 😌❤️ It's a date! Plan: ${plan} (${when}).`;
  try {
    const canvas = await generateDateCardCanvas();
    if (navigator.share) {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "date-pass.png", { type: "image/png" })] })) {
          const file = new File([blob], "date-pass.png", { type: "image/png" });
          try {
            await navigator.share({
              title: "Official Date Confirmation ❤️",
              text: shareText,
              files: [file]
            });
            track("button_clicked", state.screen, "share_date_card");
            return;
          } catch { }
        }
        try {
          await navigator.share({
            title: "Official Date Confirmation ❤️",
            text: shareText,
            url: window.location.href
          });
          track("button_clicked", state.screen, "share_date_card");
        } catch {
          fallbackShare(shareText);
        }
      }, "image/png");
    } else {
      fallbackShare(shareText);
    }
  } catch {
    fallbackShare(shareText);
  }
}
function googleCalendarUrl(dateTimeStr, inviterName, mood) {
  if (!dateTimeStr) return '#';
  try {
    const start = new Date(dateTimeStr);
    const end = new Date(start.getTime() + 2 * 3600 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const text = encodeURIComponent(`Date with ${inviterName || 'Someone'} ❤️ (${mood || 'Special Date'})`);
    const details = encodeURIComponent(`Our special date! Vibe: ${mood || 'Fun + Food'}. Planned on Ask Her Out.`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${fmt(start)}/${fmt(end)}&details=${details}`;
  } catch {
    return '#';
  }
}

function downloadIcsFile() {
  if (!state.date) return toast("No date selected to export.");
  try {
    const startDate = new Date(state.date);
    const endDate = new Date(startDate.getTime() + 2 * 3600 * 1000);
    const formatIcsDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Ask Her Out//Romantic Date Invitation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `SUMMARY:Date with ${data.inviterName || 'Someone'} ❤️ (${state.mood || 'Special Date'})`,
      `DESCRIPTION:Our date! Vibe: ${state.mood || 'Food + Fun'}. Planned with Ask Her Out.`,
      `DTSTART:${formatIcsDate(startDate)}`,
      `DTEND:${formatIcsDate(endDate)}`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `date-with-${(data.inviterName || 'date').toLowerCase().replace(/\s+/g, '-')}.ics`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast('📅 Calendar event (.ics) downloaded!');
  } catch (err) {
    toast('Could not generate calendar file.');
  }
}

function successScreen() {
  const s = screens.success,
    when = state.date ? formatDateTime(state.date) : "We decide 😌",
    plan = state.mood || "Food + Fun + Unlimited Bakwaas";
  const message = encodeURIComponent(features.respectfulMode ? `Hey ${data.inviterName}, I'm ready to talk. I chose ${plan} and ${when}.` : `Hey ${data.inviterName}! I said yes 😌❤️ Let's plan it now. I chose ${plan} and ${when}.`),
    whatsapp = data.whatsappNumber
      ? `<a class="choice primary whatsapp-plan" data-action="complete" href="https://wa.me/${data.whatsappNumber}?text=${message}" target="_blank" rel="noopener noreferrer">Plan on WhatsApp 💬</a>`
      : "";
  const calButtons = state.date ? `
    <div class="calendar-actions">
      <a class="cal-action-btn cal-google" href="${googleCalendarUrl(state.date, data.inviterName, plan)}" target="_blank" rel="noopener noreferrer">
        <span>📅</span> Add to Google Calendar
      </a>
      <button type="button" class="cal-action-btn cal-ics" data-action="downloadIcs">
        <span>🍏</span> Add to Apple / Outlook (.ics)
      </button>
    </div>
  ` : "";
  return `<div class="celebration-hero"><div class="celebration-heart-badge small" aria-hidden="true"><span class="heart-pulse">💖</span><span class="sparkle-orbit s1">✨</span><span class="sparkle-orbit s2">✨</span></div><span class="celebration-kicker">Date Planning Unlocked ✨</span><h1 class="celebration-title">${text(s.heading || "Baaki planning meri.")}</h1><p class="celebration-quote">“${text(s.body || "You picked the timing. You picked the vibe. You just have to show up. 😂❤️")}”</p></div>${datePass("Official date pass", `${state.nickname} + ${data.inviterName}`, plan, when)}${calButtons}${voiceNoteWidget()}<div class="evidence-note">📸 Screenshot this. Evidence secured 😂</div><div class="action-stack"><button class="choice primary" data-action="downloadCard" type="button">Download Date Card 📸</button><button class="choice" data-action="shareCard" type="button">Share Date Card 💌</button>${whatsapp}<button class="choice ghost" data-modal="secret" type="button">One more thing… 👀</button></div>`;
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
      if (el.dataset.music === "toggle") {
        if (features.musicUrl && features.musicUrl.startsWith("preset:")) {
          if (state.musicPlaying) stopAmbientPreset();
          else playAmbientPreset(features.musicUrl, savedMusicVolume || 0.35);
          return;
        }
        if (musicAudio) {
          musicAudio.paused ? musicAudio.play().catch(() => { }) : musicAudio.pause();
        }
      }
      if (el.dataset.music === "mute") {
        if (features.musicUrl && features.musicUrl.startsWith("preset:") && synthGain && synthCtx) {
          state.musicMuted = !state.musicMuted;
          synthGain.gain.setValueAtTime(state.musicMuted ? 0.0001 : (savedMusicVolume || 0.35), synthCtx.currentTime);
          el.textContent = state.musicMuted ? "🔇" : "🔊";
          return;
        }
        if (musicAudio) {
          musicAudio.muted = !musicAudio.muted;
          updateMusicUI();
        }
      }
      if (el.dataset.music === "prev") {
        playPrevSong();
      }
      if (el.dataset.music === "next") {
        playNextSong();
      }
      if (musicAudio && el.dataset.music === "back")
        musicAudio.currentTime = Math.max(0, musicAudio.currentTime - 10);
      if (musicAudio && el.dataset.music === "forward")
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
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReducedMotion) {
      const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      let currentOffset = { x: 0, y: 0 };
      let lastMoveTime = 0;

      const getSafePosition = (pointerX, pointerY) => {
        const btnRect = teleportBtn.getBoundingClientRect();
        const originLeft = btnRect.left - currentOffset.x;
        const originTop = btnRect.top - currentOffset.y;
        const originWidth = btnRect.width;
        const originHeight = btnRect.height;
        const originCenterX = originLeft + originWidth / 2;
        const originCenterY = originTop + originHeight / 2;

        const card = teleportBtn.closest(".invite-card") || document.body;
        const cardRect = card.getBoundingClientRect();
        const yesBtn = card.querySelector('[data-action="yes"]');
        const yesRect = yesBtn ? yesBtn.getBoundingClientRect() : null;
        const moodBtn = card.querySelector('[data-action="mood"]');
        const moodRect = moodBtn ? moodBtn.getBoundingClientRect() : null;
        const heading = card.querySelector(".closing-question") || card.querySelector("h2");
        const headingRect = heading ? heading.getBoundingClientRect() : null;
        const fallbackLink = card.querySelector(".fallback-friend-link");
        const fallbackRect = fallbackLink ? fallbackLink.getBoundingClientRect() : null;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const minMargin = 16;
        const safeLeft = Math.max(minMargin, cardRect.left + 12);
        const safeRight = Math.min(vw - minMargin, cardRect.right - 12);
        const safeTop = Math.max(minMargin, cardRect.top + 12);
        const safeBottom = Math.min(vh - minMargin, cardRect.bottom - 12);

        const availableWidth = safeRight - safeLeft - originWidth;
        const stepX = Math.min(65, Math.max(20, availableWidth * 0.35));
        const stepY = vw < 480 ? 36 : 46;

        const candidates = [
          { x: -stepX, y: -stepY, rot: -2 },
          { x: stepX, y: -stepY, rot: 2 },
          { x: -stepX * 1.1, y: stepY * 0.85, rot: -1.5 },
          { x: stepX * 1.1, y: stepY * 0.85, rot: 1.5 },
          { x: 0, y: stepY * 1.1, rot: 0 },
          { x: -stepX * 0.7, y: stepY * 1.2, rot: -2.5 },
          { x: stepX * 0.7, y: stepY * 1.2, rot: 2.5 },
          { x: -stepX * 1.2, y: -stepY * 0.5, rot: -1.5 },
          { x: stepX * 1.2, y: -stepY * 0.5, rot: 1.5 },
          { x: 0, y: -stepY * 0.85, rot: 0 }
        ];

        let bestCandidate = null;
        let highestScore = -Infinity;

        for (const cand of candidates) {
          // Prevent immediately repeating the previous position
          if (Math.hypot(cand.x - currentOffset.x, cand.y - currentOffset.y) < 25) continue;

          const candLeft = originLeft + cand.x;
          const candRight = candLeft + originWidth;
          const candTop = originTop + cand.y;
          const candBottom = candTop + originHeight;
          const candCenterX = originCenterX + cand.x;
          const candCenterY = originCenterY + cand.y;

          // 1. Strict Boundary Check (stays inside card and viewport)
          if (candLeft < safeLeft || candRight > safeRight || candTop < safeTop || candBottom > safeBottom) {
            continue;
          }

          // 2. Overlap Check with Yes Button
          if (yesRect) {
            const hasOverlap = candLeft < yesRect.right + 6 && candRight > yesRect.left - 6 && candTop < yesRect.bottom + 6 && candBottom > yesRect.top - 6;
            if (hasOverlap) continue;
          }

          // 3. Overlap Check with Mood Button
          if (moodRect) {
            const hasOverlap = candLeft < moodRect.right && candRight > moodRect.left && candTop < moodRect.bottom && candBottom > moodRect.top;
            if (hasOverlap) continue;
          }

          // 4. Overlap Check with Heading
          if (headingRect) {
            const hasOverlap = candLeft < headingRect.right && candRight > headingRect.left && candTop < headingRect.bottom && candBottom > headingRect.top;
            if (hasOverlap) continue;
          }

          // 5. Overlap Check with Fallback Link
          if (fallbackRect) {
            const hasOverlap = candLeft < fallbackRect.right && candRight > fallbackRect.left && candTop < fallbackRect.bottom && candBottom > fallbackRect.top;
            if (hasOverlap) continue;
          }

          let distFromPointer = 180;
          if (pointerX != null && pointerY != null) {
            distFromPointer = Math.hypot(candCenterX - pointerX, candCenterY - pointerY);
          }

          const distFromCardCenter = Math.hypot(
            candCenterX - (cardRect.left + cardRect.width / 2),
            candCenterY - (cardRect.top + cardRect.height / 2)
          );

          const score = distFromPointer * 1.6 - distFromCardCenter * 0.25;
          if (score > highestScore) {
            highestScore = score;
            bestCandidate = cand;
          }
        }

        if (!bestCandidate) {
          const clampedX = Math.max(safeLeft - originLeft, Math.min(safeRight - (originLeft + originWidth), -20));
          const clampedY = Math.max(safeTop - originTop, Math.min(safeBottom - (originTop + originHeight), 20));
          bestCandidate = { x: clampedX, y: clampedY, rot: -1.5 };
        }

        return bestCandidate;
      };

      const moveBtn = (px, py) => {
        const now = Date.now();
        if (now - lastMoveTime < 130) return;
        lastMoveTime = now;

        const next = getSafePosition(px, py);
        currentOffset = { x: next.x, y: next.y };
        teleportBtn.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.rot || 0}deg) scale(0.98)`;
        setTimeout(() => {
          if (teleportBtn.isConnected) {
            teleportBtn.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.rot || 0}deg) scale(1)`;
          }
        }, 160);
      };

      if (canHover) {
        const onProximity = (e) => {
          if (!teleportBtn.isConnected) {
            window.removeEventListener("pointermove", onProximity);
            return;
          }
          const rect = teleportBtn.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          if (Math.hypot(e.clientX - cx, e.clientY - cy) < 80) {
            moveBtn(e.clientX, e.clientY);
          }
        };
        window.addEventListener("pointermove", onProximity, { passive: true });
        teleportBtn.addEventListener("pointerenter", (e) => moveBtn(e.clientX, e.clientY));
      }

      teleportBtn.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          moveBtn(e.clientX, e.clientY);
        }
      }, { passive: true });
      state.musicMuted = !state.musicMuted;
      synthGain.gain.setValueAtTime(state.musicMuted ? 0.0001 : (savedMusicVolume || 0.35), synthCtx.currentTime);
      el.textContent = state.musicMuted ? "🔇" : "🔊";
      return;
    }
    if (musicAudio) {
      musicAudio.muted = !musicAudio.muted;
      updateMusicUI();
    }
  }
  if (el.dataset.music === "prev") {
    playPrevSong();
  }
  if (el.dataset.music === "next") {
    playNextSong();
  }
  if (musicAudio && el.dataset.music === "back")
    musicAudio.currentTime = Math.max(0, musicAudio.currentTime - 10);
  if (musicAudio && el.dataset.music === "forward")
    musicAudio.currentTime = Math.min(
      musicAudio.duration || Infinity,
      musicAudio.currentTime + 10,
    );
}
;
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
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReducedMotion) {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    let currentOffset = { x: 0, y: 0 };
    let lastMoveTime = 0;

    const getSafePosition = (pointerX, pointerY) => {
      const btnRect = teleportBtn.getBoundingClientRect();
      const originLeft = btnRect.left - currentOffset.x;
      const originTop = btnRect.top - currentOffset.y;
      const originWidth = btnRect.width;
      const originHeight = btnRect.height;
      const originCenterX = originLeft + originWidth / 2;
      const originCenterY = originTop + originHeight / 2;

      const card = teleportBtn.closest(".invite-card") || document.body;
      const cardRect = card.getBoundingClientRect();
      const yesBtn = card.querySelector('[data-action="yes"]');
      const yesRect = yesBtn ? yesBtn.getBoundingClientRect() : null;
      const moodBtn = card.querySelector('[data-action="mood"]');
      const moodRect = moodBtn ? moodBtn.getBoundingClientRect() : null;
      const heading = card.querySelector(".closing-question") || card.querySelector("h2");
      const headingRect = heading ? heading.getBoundingClientRect() : null;
      const fallbackLink = card.querySelector(".fallback-friend-link");
      const fallbackRect = fallbackLink ? fallbackLink.getBoundingClientRect() : null;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const minMargin = 16;
      const safeLeft = Math.max(minMargin, cardRect.left + 12);
      const safeRight = Math.min(vw - minMargin, cardRect.right - 12);
      const safeTop = Math.max(minMargin, cardRect.top + 12);
      const safeBottom = Math.min(vh - minMargin, cardRect.bottom - 12);

      const availableWidth = safeRight - safeLeft - originWidth;
      const stepX = Math.min(65, Math.max(20, availableWidth * 0.35));
      const stepY = vw < 480 ? 36 : 46;

      const candidates = [
        { x: -stepX, y: -stepY, rot: -2 },
        { x: stepX, y: -stepY, rot: 2 },
        { x: -stepX * 1.1, y: stepY * 0.85, rot: -1.5 },
        { x: stepX * 1.1, y: stepY * 0.85, rot: 1.5 },
        { x: 0, y: stepY * 1.1, rot: 0 },
        { x: -stepX * 0.7, y: stepY * 1.2, rot: -2.5 },
        { x: stepX * 0.7, y: stepY * 1.2, rot: 2.5 },
        { x: -stepX * 1.2, y: -stepY * 0.5, rot: -1.5 },
        { x: stepX * 1.2, y: -stepY * 0.5, rot: 1.5 },
        { x: 0, y: -stepY * 0.85, rot: 0 }
      ];

      let bestCandidate = null;
      let highestScore = -Infinity;

      for (const cand of candidates) {
        // Prevent immediately repeating the previous position
        if (Math.hypot(cand.x - currentOffset.x, cand.y - currentOffset.y) < 25) continue;

        const candLeft = originLeft + cand.x;
        const candRight = candLeft + originWidth;
        const candTop = originTop + cand.y;
        const candBottom = candTop + originHeight;
        const candCenterX = originCenterX + cand.x;
        const candCenterY = originCenterY + cand.y;

        // 1. Strict Boundary Check (stays inside card and viewport)
        if (candLeft < safeLeft || candRight > safeRight || candTop < safeTop || candBottom > safeBottom) {
          continue;
        }

        // 2. Overlap Check with Yes Button
        if (yesRect) {
          const hasOverlap = candLeft < yesRect.right + 6 && candRight > yesRect.left - 6 && candTop < yesRect.bottom + 6 && candBottom > yesRect.top - 6;
          if (hasOverlap) continue;
        }

        // 3. Overlap Check with Mood Button
        if (moodRect) {
          const hasOverlap = candLeft < moodRect.right && candRight > moodRect.left && candTop < moodRect.bottom && candBottom > moodRect.top;
          if (hasOverlap) continue;
        }

        // 4. Overlap Check with Heading
        if (headingRect) {
          const hasOverlap = candLeft < headingRect.right && candRight > headingRect.left && candTop < headingRect.bottom && candBottom > headingRect.top;
          if (hasOverlap) continue;
        }

        // 5. Overlap Check with Fallback Link
        if (fallbackRect) {
          const hasOverlap = candLeft < fallbackRect.right && candRight > fallbackRect.left && candTop < fallbackRect.bottom && candBottom > fallbackRect.top;
          if (hasOverlap) continue;
        }

        let distFromPointer = 180;
        if (pointerX != null && pointerY != null) {
          distFromPointer = Math.hypot(candCenterX - pointerX, candCenterY - pointerY);
        }

        const distFromCardCenter = Math.hypot(
          candCenterX - (cardRect.left + cardRect.width / 2),
          candCenterY - (cardRect.top + cardRect.height / 2)
        );

        const score = distFromPointer * 1.6 - distFromCardCenter * 0.25;
        if (score > highestScore) {
          highestScore = score;
          bestCandidate = cand;
        }
      }

      if (!bestCandidate) {
        const clampedX = Math.max(safeLeft - originLeft, Math.min(safeRight - (originLeft + originWidth), -20));
        const clampedY = Math.max(safeTop - originTop, Math.min(safeBottom - (originTop + originHeight), 20));
        bestCandidate = { x: clampedX, y: clampedY, rot: -1.5 };
      }

      return bestCandidate;
    };

    const moveBtn = (px, py) => {
      const now = Date.now();
      if (now - lastMoveTime < 130) return;
      lastMoveTime = now;

      const next = getSafePosition(px, py);
      currentOffset = { x: next.x, y: next.y };
      teleportBtn.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.rot || 0}deg) scale(0.98)`;
      setTimeout(() => {
        if (teleportBtn.isConnected) {
          teleportBtn.style.transform = `translate3d(${next.x}px, ${next.y}px, 0) rotate(${next.rot || 0}deg) scale(1)`;
        }
      }, 160);
    };

    if (canHover) {
      const onProximity = (e) => {
        if (!teleportBtn.isConnected) {
          window.removeEventListener("pointermove", onProximity);
          return;
        }
        const rect = teleportBtn.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) < 80) {
          moveBtn(e.clientX, e.clientY);
        }
      };
      window.addEventListener("pointermove", onProximity, { passive: true });
      teleportBtn.addEventListener("pointerenter", (e) => moveBtn(e.clientX, e.clientY));
    }

    teleportBtn.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        moveBtn(e.clientX, e.clientY);
      }
    }, { passive: true });

    teleportBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.clientX || e.clientY) {
        moveBtn(e.clientX, e.clientY);
      }
      act("rejectAttempt", "evasion_intercepted");
    });

    const onResize = () => {
      if (!teleportBtn.isConnected) {
        window.removeEventListener("resize", onResize);
        return;
      }
      currentOffset = { x: 0, y: 0 };
      teleportBtn.style.transform = "translate3d(0px, 0px, 0)";
    };
    window.addEventListener("resize", onResize, { passive: true });
  }
}

app.querySelectorAll("[data-voice]").forEach((el) => {
  el.addEventListener("click", toggleVoiceNote);
});

updateMusicUI();
function go(screen, event = "screen_view", option = "") {
  state.previous = state.screen;
  state.screen = screen;
  if (screen === "main") state.mainVisits++;
  render();
  track(screen === "main" ? "main_question_view" : event, screen, option);
}
function act(action, value) {
  if (action === "surpriseYes") {
    state.mood = "Surprise Me ✨";
    state.moodChosen = true;
    go("yes", "button_clicked", "Surprise me 🎁");
    return;
  }
  if (action === "letThemPlan") {
    state.date = new Date(Date.now() + 86400000 * 2).toISOString();
    state.selectedTime = "Flexible";
    state.selectedLocation = state.mood || "Dinner + Dessert 🍝";
    go("success", "button_clicked", `Let ${data.inviterName} plan it`);
    return;
  }
  if (action === "sendNeedsTime") {
    track("response_needs_time", "needsTime", "Needs more time");
    toast("Response sent: You need more time 🌿");
    go("space", "screen_view", "Needs more time");
    return;
  }
  if (action === "sendDecline") {
    track("response_declined", "decline", "Friends only");
    toast("Response sent: Friends only 🤝");
    go("decline", "screen_view", "Friends only");
    return;
  }

  if (action === "open") {
    startMusic();
    go("main", "button_clicked", value);
  } else if (action === "main") {
    go("main", "back_to_main", value);
  } else if (
    ["thinking", "convince", "benefits", "finalAttempt"].includes(action)
  ) {
    go(action, "button_clicked", value);
  } else if (action === "mood") {
    go("mood", "button_clicked", value);
  } else if (action === "pickMood") {
    const changed = state.moodChosen;
    state.mood = value;
    state.moodChosen = true;
    go("moodConfirm", changed ? "mood_changed" : "mood_selected", value);
  } else if (action === "readyToTalk") {
    state.evasionStage = 0;
    track("response_ready_to_talk", state.screen, value || "Ready to talk");
    go("yes", "screen_view", value || "Ready to talk");
  } else if (action === "yes") {
    state.evasionStage = 0;
    track("final_yes", state.screen, value || "Accepted");
    go("yes", "screen_view", value || "Accepted");
  } else if (action === "needsTime") {
    state.evasionStage = 0;
    track("response_needs_time", state.screen, value || "Needs more time");
    go("decline", "screen_view", value || "Needs more time");
  } else if (action === "requestSpace") {
    state.evasionStage = 0;
    track("response_requested_space", state.screen, value || "Requested space");
    go("space", "screen_view", value || "Requested space");
  } else if (action === "messageOnly") {
    state.selectedLocation = "Message only";
    track("response_message_only", state.screen, "Message only");
    go("success", "screen_view", "Message only");
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
    } else if (state.evasionStage === 2) {
      state.evasionStage = 3;
      toast("Pakad ke dikhao! 😜🏃💨");
      track("evasion_teleport", "finalAttempt", "reject_attempt_3");
      render();
    } else {
      state.evasionStage = 4;
      track("evasion_error_modal", "finalAttempt", "reject_attempt_4");
      render();
    }
  } else if (action === "forceDecline") {
    state.evasionStage = 0;
    track("response_declined", "finalAttempt", "force_decline");
    go("decline", "screen_view", "decline");
  } else if (action === "decline") {
    track("response_declined", "finalAttempt", value || "Declined");
    go("decline", "screen_view", value || "Declined");
  } else if (action === "memories") {
    go("memories", "screen_view", "memories");
  } else if (action === "availability") {
    go("availability", "button_clicked", value);
  } else if (action === "calendarPrev" || action === "calendarNext") {
    state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + (action === "calendarNext" ? 1 : -1), 1);
    render();
  } else if (action === "selectDate") {
    state.selectedTime = document.querySelector("[data-time]:checked")?.value || state.selectedTime;
    state.selectedDate = value;
    render();
  } else if (action === "submitDate") {
    const date = state.selectedDate;
    const time = document.querySelector("[data-time]:checked")?.value || state.selectedTime;
    state.selectedLocation = document.querySelector("[data-location]:checked")?.value || state.selectedLocation;
    const dateTime = date && time ? `${date}T${time}` : "";
    if (!dateTime) return toast("Please choose both a date and time.");
    if (new Date(dateTime) <= new Date()) return toast("Please choose a future date and time.");
    state.date = dateTime;
    track("availability_selected", "availability", formatDateTime(dateTime), {
      selectedDate: dateTime,
    });
    go("success");
  } else if (action === "downloadCard") {
    downloadDateCard();
  } else if (action === "shareCard") {
    shareDateCard();
  } else if (action === "downloadIcs") {
    downloadIcsFile();
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
function playCelebrationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime + idx * 0.09;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.3);
    });
  } catch { }
}

function confetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const emojis = ["💖", "✨", "🎉", "💕", "✦", "🌸", "🧸", "❤️", "🥂", "💫"];
  const count = window.innerWidth < 600 ? 32 : 54;
  for (let i = 0; i < count; i++) {
    const x = document.createElement("i");
    x.className = `confetti-particle p-${i % 4}`;
    const left = (Math.random() * 96 + 2).toFixed(1);
    const duration = (2.2 + Math.random() * 2.4).toFixed(2);
    const delay = (Math.random() * 0.9).toFixed(2);
    const rotation = (Math.random() * 360).toFixed(0);
    const size = (0.85 + Math.random() * 0.85).toFixed(2);
    x.style.cssText = `--x:${left}vw;--d:${duration}s;--delay:${delay}s;--r:${rotation}deg;--s:${size};`;
    x.textContent = emojis[i % emojis.length];
    document.body.append(x);
    setTimeout(() => x.remove(), 5200);
  }
}
initialize();
