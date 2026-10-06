const EMOJI_CATEGORIES = {
  "😀": ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  "👋": ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄"],
  "❤️": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","♥️","💯","🔥","✨","⭐","🌟","💫","⚡","💥","💢","💦","💨"],
  "🍔": ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥠","🥮","🍢","🍡","🍧","🍨","🍦","🥧","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","☕","🍵","🧋","🥤","🍶","🍺","🍻","🥂","🍷","🥃"],
  "🎮": ["🎮","🕹","🎲","♟","🎯","🎳","🎰","🧩","🎨","🎭","🎬","🎤","🎧","🎼","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🥁","📣","📢","🔔","🔕","🚨","🏁","🏴","🏳️","🏆","🥇","🥈","🥉","⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","⛳","⛸","🎿","🛷","🥌"],
  "💻": ["💻","🖥","⌨️","🖱","🖨","📱","☎️","📞","📺","📻","🎙","🎚","🎛","🧭","⏱","⏲","⏰","🕰","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯","💸","💵","💰","💳","💎","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🔮","📿","💈","⚗️","🔭","🔬","💊","💉","🧬","🦠","🧪","🌡","🔑","🗝","🚪","🪑","🛋","🛏","🧸","🖼","🛍","🛒","🎁","🎈","🎏","🎀","🪄","🎊","🎉","🎎","🏮","🎐"],
  "⭐": ["✅","❌","❓","❗","⚠️","🚫","♻️","🔰","✔️","☑️","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤"]
};

const STORAGE_KEY = "korda_recent_emojis";

function getRecent() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function pushRecent(emoji) {
  const list = getRecent().filter(e => e !== emoji);
  list.unshift(emoji);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 24))); }
  catch {}
}

export function renderEmojiPicker(container, onPick) {
  container.innerHTML = "";
  const recent = getRecent();
  const cats = { "🕐": recent, ...EMOJI_CATEGORIES };

  const tabs = document.createElement("div");
  tabs.className = "emoji-tabs";

  const grid = document.createElement("div");
  grid.className = "emoji-grid";

  let current = Object.keys(cats)[0];

  function renderGrid(cat) {
    grid.innerHTML = "";
    const list = cats[cat] || [];
    if (!list.length) {
      grid.innerHTML = `<div class="emoji-empty">Nenhum recente ainda</div>`;
      return;
    }
    list.forEach(e => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "emoji-item";
      b.textContent = e;
      b.addEventListener("click", (ev) => {
        ev.preventDefault();
        pushRecent(e);
        onPick(e);
      });
      grid.appendChild(b);
    });
  }

  Object.keys(cats).forEach(cat => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "emoji-tab" + (cat === current ? " active" : "");
    tab.textContent = cat;
    tab.title = cat;
    tab.addEventListener("click", (ev) => {
      ev.preventDefault();
      current = cat;
      tabs.querySelectorAll(".emoji-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      renderGrid(cat);
    });
    tabs.appendChild(tab);
  });

  container.appendChild(tabs);
  container.appendChild(grid);
  renderGrid(current);
}