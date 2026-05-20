// hostBridge.ts — postMessage bridge for communication with Iris Studio host

function initHostBridge() {
  if (window.self === window.top) return; // not in iframe, skip

  // Listen for messages from the host
  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data;
    if (!data || !data.type) return;

    if (data.type === 'emailEditor:navigate') {
      // Host requests navigation to a specific page (e.g. '/gallery', '/editor')
      const target = data.page || '/gallery';
      window.location.hash = `#${target}`;
    }

    if (data.type === 'emailEditor:getHtml') {
      // TODO: wire up to actual editor state
      const html = document.querySelector('[data-editor-content]')?.innerHTML || '';
      window.parent.postMessage({
        type: 'emailEditor:getHtml:response',
        requestId: data.requestId,
        html,
        subject: '',
      }, '*');
    }

    if (data.type === 'emailEditor:setHtml') {
      const editorEl = document.querySelector('[data-editor-content]');
      if (editorEl) {
        editorEl.innerHTML = data.html || '';
      }
      window.parent.postMessage({
        type: 'emailEditor:setHtml:response',
        requestId: data.requestId,
      }, '*');
    }
  });

  // Signal ready to host
  window.parent.postMessage({ type: 'emailEditor:ready' }, '*');
}

export default initHostBridge;
