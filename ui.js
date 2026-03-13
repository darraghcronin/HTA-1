/**
 * ui.js — All HUD, dialog, notification logic
 */
const UI = (() => {
  let notifTimeout = null;
  let dialogCallback = null;
  let dialogLines = [];
  let dialogLineIndex = 0;

  function notification(msg, duration=2500, color=null) {
    const el = document.getElementById('notif-banner');
    el.textContent = msg;
    el.style.color = color || 'var(--col-gold)';
    el.classList.add('show');
    clearTimeout(notifTimeout);
    notifTimeout = setTimeout(() => el.classList.remove('show'), duration);
  }

  function updateHealth(hp, maxHp, armor, maxArmor, stamina, maxStamina) {
    document.getElementById('hp-bar').style.width = Math.max(0,hp/maxHp*100)+'%';
    document.getElementById('hp-val').textContent = Math.max(0,Math.floor(hp));
    document.getElementById('armor-bar').style.width = Math.max(0,armor/maxArmor*100)+'%';
    document.getElementById('armor-val').textContent = Math.floor(armor);
    document.getElementById('stamina-bar').style.width = Math.max(0,stamina/maxStamina*100)+'%';
  }

  function updateWanted(wanted) {
    for(let i=1;i<=5;i++){
      const el = document.getElementById('star'+i);
      el.className = 'star';
      if(i<=wanted) el.classList.add(wanted>=4?'hot':'active');
    }
  }

  function updateScore(score) {
    document.getElementById('score-val').textContent = score.toLocaleString();
  }

  function updateCash(cash) {
    document.getElementById('cash-val').textContent = cash.toLocaleString();
  }

  function updateQuestPanel(quest, stageIdx, progress, goal) {
    document.getElementById('quest-name').textContent = quest ? quest.name : '—';
    document.getElementById('quest-obj').textContent = quest ? (quest.stages[stageIdx]?.desc||'') : 'Walk to a mission marker to begin.';
    const pw = document.getElementById('quest-progress-wrap');
    if(quest && goal>1) {
      pw.style.display='block';
      document.getElementById('quest-progress-fill').style.width = Math.min(100,progress/goal*100)+'%';
    } else {
      pw.style.display='none';
    }
  }

  function missionComplete(name, reward) {
    const el = document.getElementById('mission-complete');
    document.getElementById('mc-name').textContent = name;
    document.getElementById('mc-reward').textContent = `+$${reward.cash.toLocaleString()}`;
    document.getElementById('mc-score-final').textContent = `+${reward.score.toLocaleString()} SCORE`;
    el.style.display='flex';
    setTimeout(()=>{ el.style.display='none'; }, 4000);
    notification('MISSION COMPLETE! ' + name, 5000, '#2ecc71');
  }

  function showGameOver(score) {
    document.getElementById('gameover-screen').style.display='flex';
    document.getElementById('go-score-val').textContent = score.toLocaleString();
  }

  function hideGameOver() {
    document.getElementById('gameover-screen').style.display='none';
  }

  function showDialog(speaker, lines, onFinish) {
    dialogLines = lines;
    dialogLineIndex = 0;
    dialogCallback = onFinish;
    const box = document.getElementById('dialog-box');
    if(!box) {
      // Create dialog box if not present
      const d = document.createElement('div');
      d.id='dialog-box';
      d.innerHTML=`<div id="dialog-speaker"></div><div id="dialog-text"></div><div id="dialog-continue">[E] CONTINUE</div>`;
      document.getElementById('hud').appendChild(d);
    }
    document.getElementById('dialog-speaker').textContent = speaker;
    document.getElementById('dialog-text').textContent = lines[0];
    document.getElementById('dialog-box').style.display='block';
  }

  function advanceDialog() {
    dialogLineIndex++;
    if(dialogLineIndex >= dialogLines.length) {
      closeDialog();
      if(dialogCallback) dialogCallback();
    } else {
      document.getElementById('dialog-text').textContent = dialogLines[dialogLineIndex];
    }
  }

  function closeDialog() {
    const box = document.getElementById('dialog-box');
    if(box) box.style.display='none';
    dialogCallback=null;
  }

  function isDialogOpen() {
    const box = document.getElementById('dialog-box');
    return box && box.style.display==='block';
  }

  // Draw world-space objective markers on canvas
  function drawObjectiveMarker(ctx, wx, wy, camX, camY, scale, label) {
    const sx = (wx-camX)*scale, sy = (wy-camY)*scale;
    const t = Date.now()/600;
    const bob = Math.sin(t)*5;
    // Outer ring
    ctx.save();
    ctx.strokeStyle='#f5c518';
    ctx.lineWidth=2.5;
    ctx.beginPath();
    ctx.arc(sx, sy+bob, 18*scale, 0, Math.PI*2);
    ctx.stroke();
    // Inner fill
    ctx.fillStyle='rgba(245,197,24,0.15)';
    ctx.beginPath();
    ctx.arc(sx, sy+bob, 18*scale, 0, Math.PI*2);
    ctx.fill();
    // Arrow pointing down
    ctx.fillStyle='#f5c518';
    ctx.beginPath();
    ctx.moveTo(sx-8*scale, sy+bob-28*scale);
    ctx.lineTo(sx+8*scale, sy+bob-28*scale);
    ctx.lineTo(sx, sy+bob-14*scale);
    ctx.closePath();
    ctx.fill();
    // Label
    if(label) {
      ctx.fillStyle='rgba(0,0,0,0.6)';
      const tw = label.length*5+8;
      ctx.fillRect(sx-tw/2, sy+bob-48*scale, tw, 12*scale);
      ctx.fillStyle='#f5c518';
      ctx.font=`${Math.max(7,9*scale)}px Bebas Neue, sans-serif`;
      ctx.textAlign='center';
      ctx.fillText(label, sx, sy+bob-38*scale);
    }
    ctx.restore();
  }

  function drawQuestGiverMarker(ctx, wx, wy, camX, camY, scale, name) {
    const sx=(wx-camX)*scale, sy=(wy-camY)*scale;
    const t=Date.now()/400;
    const bob=Math.sin(t)*4;
    ctx.save();
    ctx.fillStyle='#f5c518';
    ctx.font=`${Math.max(10,18*scale)}px sans-serif`;
    ctx.textAlign='center';
    ctx.shadowColor='#000'; ctx.shadowBlur=6;
    ctx.fillText('!', sx, sy+bob-24*scale);
    ctx.font=`${Math.max(6,8*scale)}px Bebas Neue, sans-serif`;
    ctx.fillStyle='rgba(245,197,24,0.9)';
    ctx.fillText(name, sx, sy+bob-34*scale);
    ctx.restore();
  }

  return {
    notification, updateHealth, updateWanted, updateScore, updateCash,
    updateQuestPanel, missionComplete, showGameOver, hideGameOver,
    showDialog, advanceDialog, isDialogOpen, closeDialog,
    drawObjectiveMarker, drawQuestGiverMarker,
  };
})();
