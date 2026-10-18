// DOM HUD: hearts, lives, collectables, boss bar, messages, dialog box, menus.
export class HUD {
  constructor() {
    this.p1 = document.getElementById('p1hud'); this.p2 = document.getElementById('p2hud');
    this.zone = document.getElementById('zone-label'); this.bossBar = document.getElementById('boss-bar'); this.msg = document.getElementById('msg');
    this.dialog = document.getElementById('dialog'); this.menu = document.getElementById('menu'); this.help = document.getElementById('help'); this.fade = document.getElementById('fade');
    this._toastT = 0; this._typing = null;
  }
  setPlayers(players, progress, names) {
    const render = (p, el, label) => {
      if (!p) { el.innerHTML = ''; return; }
      let hearts = ''; for (let i = 0; i < 3; i++) hearts += `<span class="${i < p.hearts ? '' : 'empty'}"></span>`;
      el.innerHTML = `<span>${label}</span><span class="hearts">${hearts}</span><span class="hud-item">×${progress.lives}</span>` +
        (el === this.p1 ? `<span class="hud-item hud-flower"><i></i>${progress.flowers}</span><span class="hud-item hud-star"><i></i>${progress.stars}</span>` + (progress.act === 2 ? `<span class="hud-item hud-gear"><i></i>${progress.gears}</span>` : '') : '');
    };
    render(players[0], this.p1, names[0] || ''); render(players[1], this.p2, names[1] || '');
  }
  clearPlayers() { this.p1.innerHTML = ''; this.p2.innerHTML = ''; }
  setZone(text) { this.zone.textContent = text || ''; }
  setBoss(boss) { if (!boss) { this.bossBar.style.display = 'none'; return; } this.bossBar.style.display = 'block'; this.bossBar.firstElementChild.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%'; }
  showMessage(text) { this.msg.textContent = text || ''; }
  toast(text, ms = 1800) { this.msg.textContent = text; this._toastT = ms; }
  update(dt) { if (this._toastT > 0) { this._toastT -= dt * 1000; if (this._toastT <= 0) this.msg.textContent = ''; } if (this._typing) this._typeStep(dt); }
  // Dialog
  showDialog(who, text, onDone) {
    this.dialog.style.display = 'block'; this.dialog.querySelector('.who').textContent = who; this.dialog.querySelector('.who').style.display = who ? 'inline-block' : 'none';
    const tEl = this.dialog.querySelector('.text'); tEl.textContent = ''; this._typing = { text, i: 0, el: tEl, acc: 0, onDone }; this.dialog.querySelector('.next').style.visibility = 'hidden';
  }
  _typeStep(dt) { const t = this._typing; t.acc += dt * 45; while (t.acc >= 1 && t.i < t.text.length) { t.i++; t.acc -= 1; } t.el.textContent = t.text.slice(0, t.i); if (t.i >= t.text.length) { this.dialog.querySelector('.next').style.visibility = 'visible'; const cb = t.onDone; this._typing = null; if (cb) cb(); } }
  dialogDone() { return !this._typing; }
  skipTyping() { if (this._typing) { this._typing.i = this._typing.text.length; this._typeStep(0); } }
  hideDialog() { this.dialog.style.display = 'none'; this._typing = null; }
  // Menu
  showMenu(items, sel) { this.menu.style.display = 'block'; this.menu.innerHTML = items.map((it, i) => `<div class="item ${i === sel ? 'sel' : ''}">${it}</div>`).join(''); }
  hideMenu() { this.menu.style.display = 'none'; }
  setHelp(text) { this.help.textContent = text || ''; }
  setFade(v) { this.fade.style.opacity = v; }
}
