// 판정 로그: 콘솔과 화면 구석 토글 패널에 남긴다.
// 항목 형식: { step, cueAt, inputAt, errorMs, result, ...추가 필드, line(패널 표시용 한 줄) }
const Log = (() => {
  const entries = [];
  let panel = null;

  function init(panelEl, toggleEl) {
    panel = panelEl;
    panel.style.whiteSpace = 'pre-wrap';
    toggleEl.addEventListener('pointerdown', (e) => e.stopPropagation());
    toggleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
    });
    render();
  }

  function add(entry) {
    entries.push(entry);
    const { line, ...data } = entry;
    console.log('[판정]', data);
    render();
  }

  function render() {
    if (!panel) return;
    if (entries.length === 0) {
      panel.innerHTML = '<div class="empty">아직 판정 없음</div>';
      return;
    }
    panel.textContent = entries.map((e) => e.line || JSON.stringify(e)).join('\n');
    panel.scrollTop = panel.scrollHeight;
  }

  return { init, add, entries };
})();
