import { App } from '../app.js';

export function initResizeHandlers() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    // 마우스 다운 이벤트 (리사이즈 시작)
    appContainer.addEventListener('mousedown', handleResizeStart);
    
    // 마우스 이동 이벤트 (리사이즈 중)
    window.addEventListener('mousemove', handleResizeMove);
    
    // 마우스 업 이벤트 (리사이즈 종료)
    window.addEventListener('mouseup', handleResizeEnd);
    
    // 컬럼 자동 리사이즈 핸들러
    initAutoResize();
}

// 리사이즈 시작
function handleResizeStart(e) {
    const handle = e.target.closest('.resize-handle');
    if (!handle) return;

    e.preventDefault();
    
    App.state.isResizing = true;
    App.state.resizingStartX = e.clientX;
    App.state.resizingColumn = handle.dataset.column;
    App.state.resizingInitialWidth = App.state.columnWidths[App.state.resizingColumn];
    
    document.body.classList.add('select-none', 'cursor-col-resize');
}

// 리사이즈 이동
function handleResizeMove(e) {
    if (!App.state.isResizing) return;

    const dx = e.clientX - App.state.resizingStartX;
    const column = App.state.resizingColumn;
    
    if (column && App.state.columnWidths[column] !== undefined) {
        const newWidth = Math.max(50, App.state.resizingInitialWidth + dx); // 최소 너비 50px
        App.state.columnWidths[column] = newWidth;
        
        App.updaters.updateSchedule();
    }
}

// 리사이즈 종료
function handleResizeEnd() {
    if (App.state.isResizing) {
        App.state.isResizing = false;
        
        // 컬럼 너비 저장
        App.services.storage.saveColumnWidths(App.state.columnWidths);
        
        // 스타일 정리
        document.body.classList.remove('select-none', 'cursor-col-resize');
        
        // 상태 초기화
        App.state.resizingStartX = 0;
        App.state.resizingInitialWidth = 0;
        App.state.resizingColumn = null;
    }
}

// 자동 리사이즈 초기화
function initAutoResize() {
    // 자동 리사이즈 기능을 App 핸들러에 연결
    if (!App.handlers) App.handlers = {};
    
    App.handlers.autoResizeColumns = function() {
        if (App.state.viewMode !== 'schedule') return;

        const scheduleContent = document.getElementById('schedule-content-area');
        if (!scheduleContent) return;

        const columnKeys = Object.keys(App.state.columnWidths);
        const PADDING = 32; // 패딩
        const MIN_WIDTHS = {
            group: 40,
            agency: 150,
            travelTime: 80,
            arrivalTime: 80,
            workTime: 80,
            departureTime: 80,
            priority: 40,
            actions: 120
        };

        // 측정용 요소 생성
        const ruler = document.createElement('span');
        ruler.style.visibility = 'hidden';
        ruler.style.position = 'absolute';
        ruler.style.whiteSpace = 'nowrap';
        document.body.appendChild(ruler);

        try {
            const newWidths = { ...App.state.columnWidths };

            // 각 컬럼 너비 계산
            columnKeys.forEach(key => {
                let maxWidth = 0;
                const headerDiv = scheduleContent.querySelector(`.resize-handle[data-column="${key}"]`)?.parentElement;
                
                if (headerDiv) {
                    // 헤더 텍스트 측정
                    ruler.style.font = getComputedStyle(headerDiv).font;
                    ruler.textContent = headerDiv.textContent.trim();
                    maxWidth = Math.max(maxWidth, ruler.offsetWidth);

                    // 셀 내용 측정
                    const cells = scheduleContent.querySelectorAll(
                        `[data-value="${key}"], .stop-input[data-property="${key}"]`
                    );
                    
                    // 샘플 셀에서 폰트 스타일 가져오기
                    const sampleCell = scheduleContent.querySelector(`[data-value="${key}"]`) || 
                                     scheduleContent.querySelector(`.stop-input[data-property="${key}"]`);
                    ruler.style.font = sampleCell ? 
                        getComputedStyle(sampleCell).font : 
                        getComputedStyle(headerDiv).font.replace('bold', 'normal');

                    cells.forEach(cell => {
                        let content = '';
                        if (cell.tagName === 'INPUT') {
                            content = cell.value || cell.placeholder;
                        } else {
                            content = cell.textContent.trim();
                        }
                        ruler.textContent = content;
                        maxWidth = Math.max(maxWidth, ruler.offsetWidth);
                    });

                    // 대리점 이름 특별 처리 (아이콘 공간 고려)
                    if (key === 'agency') {
                        const agencyCells = scheduleContent.querySelectorAll('[data-custom-select-id] button');
                        agencyCells.forEach(cell => {
                            const mainText = cell.querySelector('span:not(.block)');
                            if (mainText) {
                                ruler.style.font = getComputedStyle(mainText).font;
                                ruler.textContent = mainText.textContent.trim();
                                // 아이콘 공간 추가 (드래그 핸들, 메모 아이콘 등)
                                maxWidth = Math.max(maxWidth, ruler.offsetWidth + 60);
                            }
                        });
                    }
                }

                // 최소 너비 적용
                if (maxWidth > 0) {
                    newWidths[key] = Math.max(MIN_WIDTHS[key] || 80, maxWidth + PADDING);
                }
            });

            // 변경사항 확인 및 적용
            const hasChanged = columnKeys.some(key => 
                Math.abs(App.state.columnWidths[key] - newWidths[key]) > 2
            );

            if (hasChanged) {
                App.state.columnWidths = newWidths;
                App.services.storage.saveColumnWidths(newWidths);
                
                // 직접 스타일 적용 (리렌더링 루프 방지)
                applyColumnWidthsDirectly(newWidths);
                
                App.showNotification('컬럼 너비가 자동으로 조절되었습니다.', 'success');
            }
        } finally {
            // 측정용 요소 제거 (에러 발생 시에도 실행됨)
            if (document.body.contains(ruler)) {
                document.body.removeChild(ruler);
            }
        }
    };
}

// 컬럼 너비 직접 적용
function applyColumnWidthsDirectly(widths) {
    const keys = ['group', 'agency', 'travelTime', 'arrivalTime', 'workTime', 'departureTime', 'priority', 'actions'];
    const gridTemplateColumns = keys.map(k => `${widths[k] || 80}px`).join(' ');
    const scheduleContent = document.getElementById('schedule-content-area');
    
    if (scheduleContent) {
        const gridElements = scheduleContent.querySelectorAll('.md\\:grid');
        gridElements.forEach(el => {
            el.style.gridTemplateColumns = gridTemplateColumns;
        });
    }
}

// 윈도우 리사이즈 이벤트 (반응형 대응)
window.addEventListener('resize', () => {
    // 모바일 감지 업데이트
    App.state.isMobile = window.innerWidth < 768;
    
    // 필요한 경우 자동 리사이즈 트리거
    if (App.state.viewMode === 'schedule' && window.innerWidth >= 768) {
        setTimeout(() => {
            if (App.handlers.autoResizeColumns) {
                App.handlers.autoResizeColumns();
            }
        }, 100);
    }
});