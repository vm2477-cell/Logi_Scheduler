import { App } from '../app.js';
import { showNotification } from '../components/index.js';

let scrollInterval = null;

function startScrolling(direction) {
    if (scrollInterval) return;
    const scrollAmount = 15;
    scrollInterval = setInterval(() => {
        window.scrollBy(0, scrollAmount * direction);
    }, 16);
}

function stopScrolling() {
    clearInterval(scrollInterval);
    scrollInterval = null;
}

function handleDragScroll(clientY) {
    const scrollZone = 80;
    if (clientY < scrollZone) {
        startScrolling(-1);
    } else if (clientY > window.innerHeight - scrollZone) {
        startScrolling(1);
    } else {
        stopScrolling();
    }
}

export function initDragDropHandlers() {
    const appContainer = document.getElementById('app');
    if (!appContainer) return;

    // 모바일 롱프레스 시 시스템 컨텍스트 메뉴(우클릭 메뉴) 방지
    appContainer.addEventListener('contextmenu', e => {
        if (e.target.closest('.schedule-row')) {
            e.preventDefault();
        }
    });

    initDesktopDragDrop(appContainer);
    initMobileTouchDrag(appContainer);
}

function reorderStopsFromDOM(container) {
    const stopElements = Array.from(container.querySelectorAll('.schedule-row'));
    if (stopElements.length === 0) return;

    const stopMap = new Map(App.state.editableStops.map(s => [s.id.toString(), s]));
    const visibleStopIds = stopElements.map(row => row.dataset.stopId);
    
    // 현재 DOM에 보이는 순서대로 데이터 추출 및 코스 업데이트
    const reorderedVisibleStops = [];
    stopElements.forEach(row => {
        const stopId = row.dataset.stopId;
        const data = stopMap.get(stopId);
        if (data) {
            const courseContainer = row.closest('.schedule-rows');
            const courseIdStr = courseContainer?.dataset.courseId;
            const newCourseId = (courseIdStr === 'null' || courseIdStr === undefined) ? null : parseInt(courseIdStr, 10);
            
            if (data.courseId !== newCourseId) {
                const oldCourseName = data.courseId ? App.state.cache.coursesMap.get(data.courseId)?.name : '미지정';
                const newCourseName = newCourseId ? App.state.cache.coursesMap.get(newCourseId)?.name : '미지정';
                const agencyName = App.state.cache.agenciesMap.get(data.agencyId)?.name || '경유지';
                
                if (oldCourseName !== newCourseName) {
                    showNotification(`'${agencyName}'를 '${newCourseName}' 코스로 이동했습니다.`, 'info');
                }
                data.courseId = newCourseId;
            }
            reorderedVisibleStops.push(data);
        }
    });

    // 필터링 상태에서도 마스터 배열이 부분적으로 업데이트 되도록 개선
    const newMasterStops = [...App.state.editableStops];
    let visibleIdx = 0;
    for (let i = 0; i < newMasterStops.length; i++) {
        if (visibleStopIds.includes(newMasterStops[i].id.toString())) {
            newMasterStops[i] = reorderedVisibleStops[visibleIdx++];
        }
    }

    App.state.editableStops = newMasterStops;
    App.updaters.updateSchedule();
    App.debouncedSave();
}


function initDesktopDragDrop(container) {
    let draggedElement = null;
    let placeholder = null;

    container.addEventListener('dragstart', e => {
        const row = e.target.closest('.schedule-row');
        if (!row || !row.draggable) {
            e.preventDefault();
            return;
        }

        draggedElement = row;
        App.state.draggedStopId = parseFloat(row.dataset.stopId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', App.state.draggedStopId);

        placeholder = document.createElement('div');
        placeholder.style.height = `${draggedElement.offsetHeight}px`;
        placeholder.style.margin = getComputedStyle(draggedElement).margin;
        placeholder.className = 'placeholder-row bg-indigo-100 dark:bg-indigo-900/30 rounded-lg';
        
        draggedElement.parentElement.insertBefore(placeholder, draggedElement);
        
        // 드래그 중인 요소가 레이아웃은 차지하되 보이지 않게 하여(invisible), 
        // elementFromPoint가 아래에 있는 행을 감지할 수 있도록 함
        // opacity-50 대신 invisible 사용 권장
        setTimeout(() => {
            if (draggedElement) {
                draggedElement.classList.add('invisible');
            }
        }, 0);
    });

    container.addEventListener('dragover', e => {
        if (!draggedElement) return;
        e.preventDefault();
        handleDragScroll(e.clientY);

        const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
        if (!elementBelow) return;

        const targetRow = elementBelow.closest('.schedule-row:not(.opacity-50)');
        const targetContainer = elementBelow.closest('.schedule-rows');

        if (targetRow) {
            const rect = targetRow.getBoundingClientRect();
            const isAfter = e.clientY > rect.top + rect.height / 2;
            targetRow.parentElement.insertBefore(placeholder, isAfter ? targetRow.nextSibling : targetRow);
        } else if (targetContainer && targetContainer.children.length === 0) {
             targetContainer.appendChild(placeholder);
        }
    });
    
    function cleanupDrag() {
        stopScrolling();
        if (placeholder && placeholder.parentElement) {
            placeholder.remove();
        }
        if (draggedElement) {
            draggedElement.classList.remove('invisible');
        }
        draggedElement = null;
        placeholder = null;
        App.state.draggedStopId = null;
    }

    container.addEventListener('drop', e => {
        if (!draggedElement || !placeholder) return;
        e.preventDefault();
        
        const draggedId = App.state.draggedStopId;
        const draggedStop = App.state.editableStops.find(s => s.id === draggedId);

        if (draggedStop && draggedStop.groupId) {
            const groupId = draggedStop.groupId;
            // 그룹에 속한 모든 DOM 요소 찾기
            const allRows = Array.from(container.querySelectorAll('.schedule-row'));
            const groupRows = allRows.filter(row => {
                const sId = parseFloat(row.dataset.stopId);
                const s = App.state.editableStops.find(stop => stop.id === sId);
                return s && s.groupId === groupId;
            });

            // 원래 순서대로 정렬 (상대적 순서 유지)
            groupRows.sort((a, b) => {
                const idA = parseFloat(a.dataset.stopId);
                const idB = parseFloat(b.dataset.stopId);
                const idxA = App.state.editableStops.findIndex(s => s.id === idA);
                const idxB = App.state.editableStops.findIndex(s => s.id === idB);
                return idxA - idxB;
            });

            // placeholder 위치로 그룹 전체 이동
            const parent = placeholder.parentElement;
            if (parent) {
                groupRows.forEach(row => {
                    row.classList.remove('invisible');
                    parent.insertBefore(row, placeholder);
                });
                placeholder.remove();
            }
        } else {
            placeholder.parentElement.replaceChild(draggedElement, placeholder);
        }
        
        reorderStopsFromDOM(container);
        cleanupDrag();
    });

    container.addEventListener('dragend', e => {
        cleanupDrag();
    });
}

function initMobileTouchDrag(container) {
    let draggedElement = null, placeholder = null, startY = 0, startX = 0;
    let longPressTimer = null;
    let isDragging = false;
    let originalStyles = ''; // 드래그 전 원래 스타일 저장용
    let lastSecondTouchY = null; // 두 번째 터치 Y 좌표 저장용
    const LONG_PRESS_DURATION = 700; // 0.7초로 단축 
    const MOVE_THRESHOLD = 15; // 움직임 허용 오차 (픽셀)

    container.addEventListener('touchstart', e => {
        lastSecondTouchY = null; // 초기화
        // 멀티 터치 무시
        if (e.touches.length > 1) return;
        
        // 입력 필드 터치 시 무시 (버튼은 허용 - 대리점 이름이 버튼임)
        if (e.target.closest('input, select, textarea')) return;

        const row = e.target.closest('.schedule-row');
        if (!row) return;
        
        // 편집 잠금 상태 확인 (draggable 속성 체크)
        if (row.getAttribute('draggable') === 'false') return;

        draggedElement = row;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        
        // 롱 프레스 타이머 시작
        longPressTimer = setTimeout(() => {
            isDragging = true;
            App.state.draggedStopId = parseFloat(draggedElement.dataset.stopId);
            
            // 드래그 시작 전 원래 스타일 저장 (grid-template-columns 등 유지)
            originalStyles = draggedElement.style.cssText;

            // 햅틱 피드백 (진동)
            if (navigator.vibrate) navigator.vibrate(50);

            const rect = draggedElement.getBoundingClientRect();

            // 플레이스홀더 생성
            placeholder = document.createElement('div');
            placeholder.style.height = `${rect.height}px`;
            placeholder.style.marginBottom = '0.5rem';
            placeholder.className = 'placeholder-row bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border-2 border-dashed border-indigo-300';
            placeholder.style.pointerEvents = 'none'; // 터치 이벤트 통과
            
            draggedElement.parentNode.insertBefore(placeholder, draggedElement);
            
            // 드래그 요소 스타일 설정 (플로팅)
            Object.assign(draggedElement.style, {
                position: 'fixed',
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                zIndex: '1000',
                opacity: '0.9',
                pointerEvents: 'none', // 터치 이벤트가 아래 요소로 전달되도록 함
                transform: 'scale(1.02)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                transition: 'none'
            });
            
            document.body.classList.add('overflow-hidden'); // 스크롤 방지
        }, LONG_PRESS_DURATION);
    }, { passive: true });

    container.addEventListener('touchmove', e => {
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;

        if (!isDragging) {
            // 드래그 시작 전 움직임이 감지되면 타이머 취소 (일반 스크롤 허용)
            if (longPressTimer) {
                if (Math.abs(currentY - startY) > MOVE_THRESHOLD || Math.abs(currentX - startX) > MOVE_THRESHOLD) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }
            return;
        }

        // 드래그 중일 때
        if (e.cancelable) e.preventDefault(); // 스크롤 방지
        
        // 멀티 터치 스크롤 지원 (두 번째 손가락으로 스크롤)
        if (e.touches.length > 1) {
            const secondTouchY = e.touches[1].clientY;
            if (lastSecondTouchY !== null) {
                const delta = lastSecondTouchY - secondTouchY;
                window.scrollBy(0, delta);
            }
            lastSecondTouchY = secondTouchY;
            stopScrolling(); // 자동 스크롤 중지
        } else {
            lastSecondTouchY = null;
            handleDragScroll(currentY); // 싱글 터치 시 자동 스크롤
        }
        
        // 요소 이동
        const deltaY = currentY - startY;
        draggedElement.style.transform = `translateY(${deltaY}px) scale(1.02)`;
        
        // 드롭 위치 계산
        const elementBelow = document.elementFromPoint(currentX, currentY);        
        let targetRow = elementBelow ? elementBelow.closest('.schedule-row') : null;

        // 정확한 행을 찾지 못한 경우(배경이나 틈새), Y좌표를 기준으로 가장 가까운 행을 찾음
        if (!targetRow) {
            const rows = Array.from(container.querySelectorAll('.schedule-row:not(.placeholder-row)'));
            // 드래그 중인 요소와 fixed된 요소 제외
            const validRows = rows.filter(r => r !== draggedElement && r.style.position !== 'fixed');
            
            let minDist = Infinity;
            let closest = null;
            
            validRows.forEach(row => {
                const rect = row.getBoundingClientRect();
                const rowCenterY = rect.top + rect.height / 2;
                const dist = Math.abs(currentY - rowCenterY);
                
                if (dist < minDist && dist < 150) { // 150px 이내의 요소만 고려
                    minDist = dist;
                    closest = row;
                }
            });
            if (closest) targetRow = closest;
        }
        
        if (targetRow && targetRow !== draggedElement && targetRow !== placeholder) {
            const targetRect = targetRow.getBoundingClientRect();
            const mid = targetRect.top + targetRect.height / 2;
            
            if (currentY < mid) {
                targetRow.parentNode.insertBefore(placeholder, targetRow);
            } else {
                targetRow.parentNode.insertBefore(placeholder, targetRow.nextSibling);
            }
        }
    }, { passive: false });

    function cleanupTouchDrag() {
        lastSecondTouchY = null; // 초기화
        stopScrolling();
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        if (draggedElement) {
            // 원래 스타일로 복구 (레이아웃 깨짐 방지)
            draggedElement.style.cssText = originalStyles;
        }
        if (placeholder && placeholder.parentNode) {
            placeholder.remove();
        }
        
        isDragging = false;
        draggedElement = null;
        placeholder = null;
        App.state.draggedStopId = null;
        originalStyles = '';
        document.body.classList.remove('overflow-hidden');
    }

    container.addEventListener('touchend', e => {
        if (longPressTimer) clearTimeout(longPressTimer);

        if (isDragging) {
            // 드래그가 실제로 발생했을 때만 상위 이벤트(클릭, 스와이프 등)를 차단합니다.
            if (e.cancelable) {
                e.preventDefault();
                e.stopPropagation();
            }
        }

        const draggedId = App.state.draggedStopId;
        const draggedStop = App.state.editableStops.find(s => s.id === draggedId);

        if (draggedStop && draggedStop.groupId) {
            const groupId = draggedStop.groupId;
            const allRows = Array.from(container.querySelectorAll('.schedule-row'));
            const groupRows = allRows.filter(row => {
                const sId = parseFloat(row.dataset.stopId);
                const s = App.state.editableStops.find(stop => stop.id === sId);
                return s && s.groupId === groupId;
            });

            groupRows.sort((a, b) => {
                const idA = parseFloat(a.dataset.stopId);
                const idB = parseFloat(b.dataset.stopId);
                const idxA = App.state.editableStops.findIndex(s => s.id === idA);
                const idxB = App.state.editableStops.findIndex(s => s.id === idB);
                return idxA - idxB;
            });

            const parent = placeholder.parentNode;
            if (parent) {
                groupRows.forEach(row => {
                    parent.insertBefore(row, placeholder);
                });
                placeholder.remove();
            }
        } else {
            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.insertBefore(draggedElement, placeholder);
                placeholder.remove();
            }
        }

        reorderStopsFromDOM(container);
        cleanupTouchDrag();
    });
    
    container.addEventListener('touchcancel', cleanupTouchDrag);
}
