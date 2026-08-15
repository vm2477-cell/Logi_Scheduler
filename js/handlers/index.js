export { initEventHandlers } from './event-handlers.js';
export { initDragDropHandlers } from './drag-drop.js';
export { initResizeHandlers } from './resize-handlers.js';
export { ActionHandlers } from './action-handlers.js'

// 모든 핸들러 초기화
export function initAllHandlers() {
    initEventHandlers();
    initDragDropHandlers();
    initResizeHandlers();
}