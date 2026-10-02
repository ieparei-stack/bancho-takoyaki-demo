// 판정 로그: 콘솔과 화면 구석 토글 패널에 남긴다.
// 항목 형식: { step, cueAt, inputAt, errorMs, result, ...추가 필드 }
const Log = (() => {
  const entries = [];
  let panel = null;

  function init(panelEl, toggleEl) {
    panel = panelEl;
    toggleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
    });
    render();
  }

  function add(entry) {
    entries.push(entry);
    console.log('[판정]', entry);
    render();
  }

  function render() {
    if (!panel) return;
    if (entries.length === 0) {
      panel.innerHTML = '<div class="empty">아직 판정 없음</div>';
      return;
    }
    panel.textContent = entries.map((e) => JSON.stringify(e)).join('\n');
    panel.style.whiteSpace = 'pre-wrap';
    panel.scrollTop = panel.scrollHeight;
  }

  return { init, add, entries };
})();
