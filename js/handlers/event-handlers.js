import { App } from '../app.js';
import { showNotification, AgenciesTab, CourseManager, AgencySelector, SystemTab, CoursesTab } from '../components/index.js';

export function initEventHandlers() {
    const appContainer = document.getElementById('app');
    const modalsContainer = document.getElementById('modals-container');
    
    if (!appContainer || !modalsContainer) {
        console.error('필요한 DOM 요소를 찾을 수 없습니다.');
        return;
    }

    // 기본 클릭 이벤트
    appContainer.addEventListener('click', handleAppClick);
    modalsContainer.addEventListener('click', handleModalClick);
    modalsContainer.addEventListener('change', handleModalChange);
    
    // 폼 제출 이벤트
    appContainer.addEventListener('submit', handleFormSubmit);
    
    // 입력 변경 이벤트
    appContainer.addEventListener('change', handleInputChange);
    appContainer.addEventListener('input', handleAppInput);
    modalsContainer.addEventListener('input', handleModalInput);
    
    // 키보드 이벤트
    appContainer.addEventListener('keyup', handleAppKeyup);
    
    // 휠 이벤트
    appContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    // 파일 입력 이벤트
    const restoreFileInput = document.getElementById('restore-file-input');
    if (restoreFileInput) {
        restoreFileInput.addEventListener('change', handleFileInputChange);
    }

    // 메모 사진 입력 이벤트
    appContainer.addEventListener('change', handleMemoPhotoInput);
    modalsContainer.addEventListener('change', handleMemoPhotoInput);

    // 그룹 호버 효과 (UI/UX 개선)
    appContainer.addEventListener('mouseover', handleGroupHover);
    appContainer.addEventListener('mouseout', handleGroupHoverOut);

    // Iframe으로부터의 메시지 수신 리스너 (확장성 확보)
    window.addEventListener('message', (e) => {
        if (e.data && e.data.type === 'APPLY_CAMERA_DATA') {
            App.actions.applyCameraData(e.data.payload);
        }
    });
}

// 앱 클릭 이벤트 핸들러
function handleAppClick(e) {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // 폼 요소에 대한 클릭이 의도치 않은 액션을 트리거하는 것을 방지
    const isFormElement = ['SELECT', 'TEXTAREA'].includes(target.tagName) || 
                         (target.tagName === 'INPUT' && !['button', 'submit', 'checkbox', 'radio'].includes(target.type));
                         
    if (isFormElement && !target.closest('[data-action]')) {
        return;
    }

    // 외부 클릭 처리 (드롭다운 닫기)
    handleOutsideClick(target);
    
    // 액션 버튼 처리
    const actionTarget = target.closest('[data-action]');

    if (!actionTarget) return;

    // 모바일 디버깅
    const debugIndicator = document.getElementById('mobile-debug-indicator');
    if (debugIndicator) {
        debugIndicator.textContent = `클릭됨: ${actionTarget.dataset.action} ${new Date().toLocaleTimeString()}`;
    }

    if (actionTarget.tagName === 'FORM') return;
    if (['checkbox', 'radio', 'select-one', 'month', 'date'].includes(actionTarget.type) || isFormElement) return;

    e.preventDefault();
    const action = actionTarget.dataset.action;
    const camelCaseAction = App.utils.toCamelCase(action);

    if (App.actions && App.actions[camelCaseAction]) {
        App.actions[camelCaseAction](e, actionTarget);
    }

    // secondary action 처리 (같은 버튼에 두 개의 액션)
    const secondaryAction = actionTarget.dataset.actionSecondary;
    if (secondaryAction) {
        const camelCaseSecondaryAction = App.utils.toCamelCase(secondaryAction);
        if (App.actions && App.actions[camelCaseSecondaryAction]) {
            App.actions[camelCaseSecondaryAction](e, actionTarget);
        }
    }
}

// 모달 클릭 이벤트 핸들러
function handleModalClick(e) {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // 모달 배경 클릭 (e.target이 modal-overlay 자체일 때만)
    if (target.classList.contains('modal-overlay') && e.target === target) {
        App.actions.closeAllModals();
        return; // 오버레이 클릭 시 버튼 액션과 중복 실행 방지
    }

    // 모달 내 액션 버튼
    const actionTarget = target.closest('[data-action]');
    if (actionTarget) {
        if (actionTarget.tagName === 'FORM') return;
        if (actionTarget.type === 'checkbox') return;

        e.preventDefault();
        const action = actionTarget.dataset.action;
        const camelCaseAction = App.utils.toCamelCase(action);
        
        if (App.actions && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, actionTarget);
        }
    }
}

// 외부 클릭 처리 (드롭다운 닫기)
function handleOutsideClick(target) {
    // 코스 매니저 닫기
    // 입력 요소를 클릭했을 때는 렌더링을 방지하여 드롭다운이 닫히지 않게 함
    const isInputClick = ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);

    if (App.state.isCourseManagerOpen && !target.closest('[data-course-manager-container]') && !isInputClick) {
        App.state.isCourseManagerOpen = false;
        App.state.courseManagerSearchQuery = '';
        App.render();
    }

    // 에이전시 셀렉터 닫기
    const activeStopId = App.state.activeAgencySelectorStopId;
    if (activeStopId !== null && !target.closest(`[data-custom-select-id="${activeStopId}"]`)) {
        if (!target.closest('[data-action="open-agency-selector"]')) {
            App.state.activeAgencySelectorStopId = null;
            App.state.agencySelectorSearchQuery = '';
            AgencySelector.updateForRow(activeStopId);
        }
    }

    // 대리점 또는 코스 수정 인라인 폼 닫기
    const isEditingAgency = App.state.editingAgencyId !== null;
    const isEditingCourse = App.state.editingCourseId !== null;

    if (isEditingAgency && !target.closest('[data-editing-row="true"]')) {
        if (!target.closest('[data-action="start-edit-agency-inline"]') && !target.closest('[data-action="add-new-agency-row"]')) {
            App.actions.cancelEditAgencyInline();
        }
    }
    
    if (isEditingCourse && !target.closest('[data-editing-course-row="true"]')) {
        if (!target.closest('[data-action="start-edit-course-inline"]') && !target.closest('[data-action="add-new-course-row"]')) {
            App.actions.cancelEditCourseInline();
        }
    }
}

// 폼 제출 이벤트 핸들러
function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const action = form.dataset.action;
    if (!action) return;

    const camelCaseAction = App.utils.toCamelCase(action);
    if (App.actions && App.actions[camelCaseAction]) {
        App.actions[camelCaseAction](e, form);
    }
}

// 입력 변경 이벤트 핸들러
function handleInputChange(e) {
    const target = e.target;
    
    // 체크박스인 경우 change 이벤트에서도 data-action 처리
    if (target.type === 'checkbox' && target.dataset.action) {
        const camelCaseAction = App.utils.toCamelCase(target.dataset.action);
        if (App.actions && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, target);
            return;
        }
    }
    
    // data-action 속성이 있는 경우 해당 액션 실행 (범용 처리)
    if (target.dataset.action) {
        const camelCaseAction = App.utils.toCamelCase(target.dataset.action);
        if (App.actions && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, target); // 오타 수정: App.actions[camelCaseAction]
            return;
        }
    }

    // 날짜 선택
    if (target.id === 'selected-date') {
        App.selectDateAndLoad(target.value);
    }
    // 출발 시간 변경
    else if (target.classList.contains('departure-time-input')) {
        handleDepartureTimeChange(target);
    }
    // 기사 선택
    else if (target.id === 'driverName') {
        handleDriverNameChange(target);
    }
    // 코스 선택기
    else if (target.id === 'additional-message-course-selector') {
        handleMessageCourseSelectorChange(target);
    }
    // 경유지 수량 입력
    else if (target.classList.contains('stop-input')) {
        handleStopInputChange(target);
    }
    // 경유지 시간 입력
    else if (target.classList.contains('stop-time-input')) {
        handleStopTimeChange(target);
    }
    // 코스 필터
    else if (target.id === 'agency-course-filter') {
        handleAgencyCourseFilterChange(target);
    }
    // 히스토리 월 필터
    else if (target.id === 'history-month-filter') {
        handleHistoryMonthFilterChange(target);
    }
    // 이동 시간 입력
    else if (target.classList.contains('travel-time-input')) {
        handleTravelTimeChange(target);
    }
    // 내비게이션 앱 설정
    else if (target.id === 'preferred-nav-app') {
        handlePreferredNavAppChange(target);
    }
    // 코스 선택 (에이전시 편집)
    else if (target.closest('#agency-course-selector-list') && target.name === 'courseIds') {
        handleAgencyCourseSelection(target);
    }
}

// 입력 이벤트 핸들러
function handleAppInput(e) {
    const target = e.target;

    // 시간 입력 필드 24시간 형식 자동 포맷팅
    if (target.dataset.timeInput === 'true') {
        handleTimeInput(target);
        return;
    }

    // data-action 속성이 있는 경우 해당 액션 실행 (히스토리 검색 등 실시간 입력 처리)
    if (target.dataset.action) {
        // 날짜/월 선택기는 입력 도중 렌더링이 발생하면 피커가 닫히므로 input 액션에서 제외합니다.
        if (['month', 'date'].includes(target.type)) return;

        const camelCaseAction = App.utils.toCamelCase(target.dataset.action);
        if (App.actions && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, target); // 오타 수정: App.actions[camelCaseAction]
            return;
        }
    }

    // 추가 메시지
    if (target.id === 'additionalMessage') {
        handleAdditionalMessageInput(target);
    }
    // 검색 입력
    else if (target.id === 'course-manager-search') {
        handleCourseManagerSearch(target);
    }
    // 검색 입력
    else if (target.id === 'agency-course-search') {
        handleAgencyCourseSearch(target);
    }
    else if (target.id === 'agency-settings-search') {
        handleAgencySettingsSearch(target);
    }
    else if (target.id === 'course-settings-search') {
        handleCourseSettingsSearch(target);
    }
    else if (target.id.startsWith('agency-search-input-')) {
        handleAgencySelectorSearch(target);
    }
    else if (target.id === 'agency-modal-search-input' || target.dataset.action === 'agency-modal-search') {
        handleAgencyModalSearch(target);
    }
    // 모달 내 코스 검색
    else if (target.id === 'edit-agency-course-search') {
        handleModalCourseSearch(target);
    }
    // 글로벌 폰트 크기 슬라이더
    else if (target.id === 'global-font-size-slider') {
        handleGlobalFontSizeSlider(target);
    }
    // 에이전시 편집 입력
    else {
        const editingAgencyRow = target.closest('[data-editing-row="true"]');
        const editingCourseRow = target.closest('[data-editing-course-row="true"]');
        const editingMileageRow = target.closest('[data-editing-mileage-row="true"]');
        const editingMaintenanceRow = target.closest('[data-editing-maintenance-row="true"]');

        if (editingAgencyRow && App.state.editingAgencyData) {
            handleAgencyEditingInput(target);
        } else if (editingCourseRow && App.state.editingCourseData) {
            handleCourseEditingInput(target);
        }
        else if (editingMileageRow && App.state.editingMileageData) {
            handleMileageEditingInput(target);
        }
        else if (editingMaintenanceRow && App.state.editingMaintenanceData) {
            handleMaintenanceEditingInput(target);
        }
    }
}

// 키보드 업 이벤트 핸들러 (모바일 검색 호환성)
function handleAppKeyup(e) {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // data-action 속성이 있는 경우 해당 액션 실행 (검색창 등 키보드 입력 실시간 처리)
    if (target.dataset.action) {
        // 날짜/월 선택기 예외 처리
        if (['month', 'date'].includes(target.type)) return;

        const camelCaseAction = App.utils.toCamelCase(target.dataset.action);
        if (App.actions && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, target); // 오타 수정: App.actions[camelCaseAction]
            return;
        }
    }

    // 검색창에서 엔터키 입력 시 검색 실행
    if (e.key === 'Enter' && target.id === 'history-search-input') {
        App.actions.searchHistory();
    }

    // 검색 입력 필드에 대한 핸들러
    if (target.id === 'course-manager-search') {
        handleCourseManagerSearch(target);
    } else if (target.id === 'agency-course-search') {
        handleAgencyCourseSearch(target);
    } else if (target.id === 'agency-settings-search') {
        handleAgencySettingsSearch(target);
    } else if (target.id === 'course-settings-search') {
        handleCourseSettingsSearch(target);
    } else if (target.id.startsWith('agency-search-input-')) {
        handleAgencySelectorSearch(target);
    }
}

// 모달 입력 이벤트 핸들러
function handleModalInput(e) {
    const target = e.target;
    if (!(target instanceof Element)) return;

    // 시간 입력 필드 24시간 형식 자동 포맷팅
    if (target.dataset.timeInput === 'true') {
        handleTimeInput(target);
        return;
    }

    // 모달 내 코스 검색
    if (target.id === 'edit-agency-course-search') {
        handleModalCourseSearch(target);
        return;
    }

    // 모달 내 대리점 검색
    if (target.id === 'agency-modal-search-input' || target.dataset.action === 'agency-modal-search') {
        handleAgencyModalSearch(target);
        return;
    }

    const actionTarget = target.closest('[data-action]');

    // data-action이 있는 요소 중 FORM이 아닌 경우에만 특정 액션 처리 (예: 메모 수정 textarea)
    if (actionTarget && actionTarget.tagName !== 'FORM') {
        const action = actionTarget.dataset.action;
        const camelCaseAction = App.utils.toCamelCase(action);

        if (action === 'update-edited-memo' && App.actions[camelCaseAction]) {
            App.actions[camelCaseAction](e, actionTarget);
            return;
        }
    }

    // 대리점 수정 모달의 일반 입력 필드 핸들링 (폼 내부의 입력)
    const agencyEditModal = target.closest('.modal-overlay form[data-action="save-agency-changes"]');
    if (agencyEditModal && App.state.agencyToEdit) {
        const property = target.name;

        // 코스별 개별 우선순위 입력 처리
        if (property && property.startsWith('coursePriority-')) {
            const courseId = property.replace('coursePriority-', '');
            if (!App.state.agencyToEdit.coursePriorities) App.state.agencyToEdit.coursePriorities = {};
            App.state.agencyToEdit.coursePriorities[courseId] = target.value;
            // App.render()를 제거하여 타이핑 중 포커스 유지 (저장 시 최종 반영됨)
            return;
        }

        if (property) {
            App.state.agencyToEdit[property] = target.value;
            // App.render()를 제거하여 타이핑 중 포커스 유지
        }
    }
}

// 모달 변경 이벤트 핸들러
function handleModalChange(e) {
    const target = e.target;
    // 모달 편집 코스 선택
    if (target.name === 'courseIds' && target.closest('#edit-agency-courses')) {
        handleModalAgencyCourseSelection(target);
    }
}

// 휠 이벤트 핸들러
function handleWheel(e) {
    const target = e.target;
    
    // 출발 시간 휠 조정
    if (target.classList.contains('departure-time-input') || target.dataset.timeInputWheel === 'true') {
        handleDepartureTimeWheel(e, target);
    }
}

// 파일 입력 변경 핸들러
function handleFileInputChange(e) {
    const target = e.target;
    if (target.files && target.files.length > 0) {
        App.state.fileToRestore = target.files[0];
        App.state.showRestoreModal = true;
        target.value = '';
        App.render();
    }
}

// 메모 사진 입력 핸들러
function handleMemoPhotoInput(e) {
    const target = e.target;
    if (target.id === 'memo-photo-input') {
        App.actions.addMemoPhoto(e, target);
    }
}

// 그룹 호버 효과 핸들러
function handleGroupHover(e) {
    const row = e.target.closest('.schedule-row');
    if (!row || !row.dataset.groupId) return;
    
    const groupId = row.dataset.groupId;
    const groupRows = document.querySelectorAll(`.schedule-row[data-group-id="${groupId}"]`);
    groupRows.forEach(r => r.classList.add('ring-2', 'ring-indigo-400', 'z-10'));
}

function handleGroupHoverOut(e) {
    const row = e.target.closest('.schedule-row');
    if (!row || !row.dataset.groupId) return;
    
    const groupId = row.dataset.groupId;
    const groupRows = document.querySelectorAll(`.schedule-row[data-group-id="${groupId}"]`);
    groupRows.forEach(r => r.classList.remove('ring-2', 'ring-indigo-400', 'z-10'));
}

// --- 세부 핸들러 함수들 ---

function handleDepartureTimeChange(target) {
    const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId, 10);
    App.state.departureTimesByCourse[courseId] = target.value;
    App.updaters.updateSchedule();
    App.debouncedSave();
}

function handleDriverNameChange(target) {
    App.state.driverName = target.value;
    App.services.storage.saveDriverName(target.value);
    App.updaters.updateMessagePreview();
    App.debouncedSave();
}

function handleMessageCourseSelectorChange(target) {
    const newCourseId = target.value === 'null' ? null : parseInt(target.value, 10);
    App.state.messagePreviewFilterCourseId = newCourseId;
    App.updaters.updateView();
}

function handleStopInputChange(target) {
    const stopId = parseFloat(target.closest('.schedule-row').dataset.stopId);
    const property = target.dataset.property;
    let value = target.value;

    const stopIndex = App.state.editableStops.findIndex(s => s.id === stopId);
    if (stopIndex === -1) return;

    App.state.editableStops[stopIndex][property] = value;
    App.updaters.updateSchedule();
    App.debouncedSave();
}

function handleStopTimeChange(target) {
    const stopId = parseFloat(target.closest('.schedule-row').dataset.stopId);
    const property = target.dataset.property;
    let value = target.value;

    // 보정 모드에서의 도착/출발 시간 입력은 별도 핸들러로 처리
    if (property === 'correctionArrivalTime' || property === 'correctionDepartureTime') {
        App.actions.handleCorrectionTimeInput(null, target);
        return;
    }

    const stopIndex = App.state.editableStops.findIndex(s => s.id === stopId);
    if (stopIndex === -1) return;

    if (property === 'manualTravelTimeInMinutes') {
        value = value !== '' ? Math.max(0, parseInt(value, 10)) : null;
    } else {
        value = value || null; // 빈 문자열이면 null로 저장하여 수동 입력을 제거
    }
    
    App.state.editableStops[stopIndex][property] = value;
    App.updaters.updateSchedule();
    App.debouncedSave();
}

function handleAgencyCourseFilterChange(target) {
    App.state.agencySettingsCourseFilterId = target.value;
    AgenciesTab.updateList();
}

function handleHistoryMonthFilterChange(target) {
    App.state.historySelectedMonth = target.value;
    App.render();
}

function handleTravelTimeChange(target) {
    const fromIdStr = target.dataset.from;
    const toIdStr = target.dataset.to;
    const minutes = target.value !== '' ? parseInt(target.value, 10) : null;

    const key1 = `${fromIdStr}-${toIdStr}`;
    const key2 = `${toIdStr}-${fromIdStr}`;

    if (minutes === null || isNaN(minutes) || minutes < 0) {
        delete App.state.travelTimes[key1];
        delete App.state.travelTimes[key2];
    } else {
        App.state.travelTimes[key1] = minutes;
        App.state.travelTimes[key2] = minutes;
    }

    App.services.storage.saveTravelTimes(App.state.travelTimes);
    App.updaters.updateSettingsContent();
    App.updaters.updateSchedule();
}

function handlePreferredNavAppChange(target) {
    App.state.preferredNavApp = target.value;
    App.services.storage.savePreferredNavApp(target.value);
    showNotification('기본 길안내 앱이 설정되었습니다.', 'success');
}

function handleAgencyCourseSelection(target) {
    const courseId = parseInt(target.value, 10);
    const isChecked = target.checked;
    
    if (App.state.editingAgencyData) {
        let currentIds = [...(App.state.editingAgencyData.courseIds || [])];
        
        if (isChecked) {
            if (!currentIds.includes(courseId)) currentIds.push(courseId);
        } else {
            currentIds = currentIds.filter(id => id !== courseId);
            // 코스 선택 해제 시 해당 코스의 개별 우선순위 데이터도 삭제
            if (App.state.editingAgencyData.coursePriorities) {
                delete App.state.editingAgencyData.coursePriorities[courseId];
            }
        }
        
        App.state.editingAgencyData.courseIds = currentIds;
    }
}

function handleModalAgencyCourseSelection(target) {
    const courseId = parseInt(target.value, 10);
    const isChecked = target.checked;
    
    if (App.state.agencyToEdit) {
        let currentIds = [...(App.state.agencyToEdit.courseIds || [])];
        
        if (isChecked) {
            if (!currentIds.includes(courseId)) currentIds.push(courseId);
        } else {
            currentIds = currentIds.filter(id => id !== courseId);
            // 코스 선택 해제 시 해당 코스의 개별 우선순위 데이터도 삭제
            if (App.state.agencyToEdit.coursePriorities) {
                delete App.state.agencyToEdit.coursePriorities[courseId];
            }
        }
        
        App.state.agencyToEdit.courseIds = currentIds;
    }
}

function handleAdditionalMessageInput(target) {
    const selectedCourseId = App.state.messagePreviewFilterCourseId;
    App.state.additionalMessagesByCourse[selectedCourseId] = target.value;
    App.updaters.updateMessagePreview();
    App.debouncedSave();
}

function handleCourseManagerSearch(target) {
    App.state.courseManagerSearchQuery = target.value;
    CourseManager.updateList();
}

function handleAgencyCourseSearch(target) {
    App.state.agencyCourseSearchQuery = target.value;
    AgenciesTab.updateCourseSelectorList(target);
}

function handleAgencySettingsSearch(target) {
    App.state.agencySettingsSearchQuery = target.value;
    AgenciesTab.updateList();
}

function handleCourseSettingsSearch(target) {
    App.state.courseSettingsSearchQuery = target.value;
    CoursesTab.updateList();
}

function handleAgencySelectorSearch(target) {
    console.log('🔍 대리점 검색 입력:', target.value);
    App.state.agencySelectorSearchQuery = target.value;
    AgencySelector.updateList();
}

function handleAgencyModalSearch(target) {
    App.state.agencySelectorSearchQuery = target.value;
    // 즉시 리스트 업데이트를 위해 직접 DOM 조작
    const listContainer = document.getElementById('agency-modal-list');
    if (listContainer) {
        listContainer.innerHTML = App.getAgencyModalListContent();
    }
}

function handleTimeInput(target) {
    let value = target.value.replace(/[^0-9]/g, '');
    
    if (value.length >= 2) {
        let hours = parseInt(value.substring(0, 2), 10);
        if (hours > 23) hours = 23;
        const hoursStr = hours.toString().padStart(2, '0');
        
        if (value.length >= 4) {
            let minutes = parseInt(value.substring(2, 4), 10);
            if (minutes > 59) minutes = 59;
            const minutesStr = minutes.toString().padStart(2, '0');
            value = hoursStr + ':' + minutesStr;
        } else {
            value = hoursStr + (value.length > 2 ? ':' + value.substring(2) : ':');
        }
    } else if (value.length > 0) {
        value = value;
    }
    
    target.value = value;
    
    // 기존 시간 입력 처리 로직 호출
    handleStopTimeChange(target);
}

function handleModalCourseSearch(target) {
    App.state.agencyEditModalSearchQuery = target.value;
    // 전체 모달을 다시 렌더링하면 입력 필드의 포커스가 잃으므로
    // 코스 목록 부분만 업데이트
    updateModalCourseList();
}

function updateModalCourseList() {
    const coursesContainer = document.getElementById('edit-agency-courses');
    if (!coursesContainer) return;

    const agency = App.state.agencyToEdit; // 모달이 열릴 때 저장된 대리점 정보
    if (!agency) return;

    coursesContainer.innerHTML = [...App.state.courses]
        .filter(c => App.utils.matchText(c.name, App.state.agencyEditModalSearchQuery))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'))
        .map(course => {
            const isSelected = (agency.courseIds || []).includes(course.id);
            const priority = agency.coursePriorities ? agency.coursePriorities[course.id] : '';
            return `
                <div class="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <input type="checkbox" name="courseIds" value="${course.id}"
                           ${isSelected ? 'checked' : ''}
                           class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-500">
                    <span class="text-sm flex-1">${course.name}</span>
                    <input type="number"
                           name="coursePriority-${course.id}"
                           placeholder="우선순위"
                           value="${priority || ''}"
                           ${!isSelected ? 'disabled' : ''}
                           class="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                </div>
            `;
        }).join('');
}

function handleGlobalFontSizeSlider(target) {
    const newSize = parseInt(target.value, 10);
    App.state.globalFontSize = newSize;
    document.documentElement.style.fontSize = `${newSize}%`;

    // 파일 분석 탭(iframe)에도 적용
    const iframe = document.querySelector('iframe[title="파일 분석"]');
    if (iframe && iframe.contentDocument) {
        try {
            iframe.contentDocument.documentElement.style.fontSize = `${newSize}%`;
        } catch (error) {
            console.error("파일 분석 iframe에 폰트 크기를 적용하는 중 오류 발생:", error);
        }
    }

    if (App.state.fontSizeSaveTimer) {
        clearTimeout(App.state.fontSizeSaveTimer);
    }
    App.state.fontSizeSaveTimer = setTimeout(() => {
        App.services.storage.saveGlobalFontSize(newSize.toString());
    }, 500);

    SystemTab.updateGlobalFontSizeDisplay();
}

function handleAgencyEditingInput(target) {
    if (target.name === 'courseIds') return; // 코스 체크박스는 'change' 이벤트에서 별도 처리

    if (target.name === 'unavailableTimes') {
        const formatted = App.utils.formatTimeRangeInput(target.value);
        target.value = formatted;
        App.state.editingAgencyData.unavailableTimes = formatted;
        return;
    }

    // 코스별 개별 우선순위 입력 처리 (인라인 편집)
    if (target.name && target.name.startsWith('coursePriority-')) {
        const courseId = target.name.replace('coursePriority-', '');
        if (!App.state.editingAgencyData.coursePriorities) {
            App.state.editingAgencyData.coursePriorities = {};
        }
        App.state.editingAgencyData.coursePriorities[courseId] = target.value;
        return;
    }

    const property = target.name;
    if (property) {
        App.state.editingAgencyData[property] = target.value;
    }
}

function handleCourseEditingInput(target) {
    const property = target.name;
    if (property) {
        App.state.editingCourseData[property] = target.value;
    }
}

function handleMaintenanceEditingInput(target) {
    const property = target.name;
    if (!property || !App.state.editingMaintenanceData) return;

    if (property === 'item-select') {
        // 사용자가 '기타'가 아닌 다른 것을 선택하면 항목을 업데이트합니다.
        if (target.value !== '기타') {
            App.state.editingMaintenanceData.item = target.value;
        }
    } else if (property === 'item-other') {
        // 사용자가 '기타'에 입력하면 항목을 업데이트합니다.
        App.state.editingMaintenanceData.item = target.value;
    } else {
        // 다른 모든 입력(날짜, 비용, 주행거리, 메모)의 경우
        App.state.editingMaintenanceData[property] = target.value;
    }
}

function handleMileageEditingInput(target) {
    const property = target.name;
    if (property && App.state.editingMileageData) {
        App.state.editingMileageData[property] = target.value;
    }
}

function handleDepartureTimeWheel(e, target) {
    e.preventDefault();
    if (!target.value) return;

    const [hours, minutes] = target.value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    const stepMinutes = 10;
    if (e.deltaY < 0) { // 위로 스크롤
        date.setMinutes(date.getMinutes() + stepMinutes);
    } else { // 아래로 스크롤
        date.setMinutes(date.getMinutes() - stepMinutes);
    }

    const newHours = String(date.getHours()).padStart(2, '0');
    const newMinutes = String(date.getMinutes()).padStart(2, '0');
    target.value = `${newHours}:${newMinutes}`;
    target.dispatchEvent(new Event('change', { bubbles: true }));
};
