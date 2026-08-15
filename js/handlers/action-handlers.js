/**
 * 이 파일은 하위 호환성을 위해 유지되거나, 
 * 도메인별 핸들러(ScheduleHandler, SettingsHandler 등)를 통합하는 역할을 수행합니다.
 */
import { DEFAULT_MAINTENANCE_CATEGORIES } from '../state.js';
import * as Supabase from '../supabase.js';
import { App } from '../app.js';
import { showNotification as _showNotification, AgencySelector, TimePicker } from '../components/index.js';
import { versionManager } from '../utils/version-manager.js';

const showNotification = (message, type = 'info', duration = 10000) => {
    _showNotification(message, type, duration);
};

let isDailyBackupScheduled = false; // 일일 백업 중복 실행 방지 플래그

// 도메인별 핸들러를 임포트하여 하나로 통합 (예시 구조)
export const ActionHandlers = {
    // --- 시스템 및 뷰 제어 ---
    switchView(e, target) {
        const view = target.dataset.view;
        if (view && view !== App.state.viewMode) {
            // 뷰 전환 시 진행 중이던 편집 상태나 열려있던 드롭다운 상태를 초기화합니다.
            // 이는 새로운 뷰에서 요소를 클릭했을 때 handleOutsideClick이 불필요한 렌더링을 일으키는 것을 방지합니다.
            App.state.editingAgencyId = null;
            App.state.editingCourseId = null;
            App.state.activeAgencySelectorStopId = null;
            App.state.isCourseManagerOpen = false;
            App.state.activeCorrectionCourseId = null;

            App.state.viewMode = view;
            App.render();

            // 파일 분석 뷰로 전환 시 기사 목록 및 폰트 크기 업데이트
            if (view === 'analysis') {
                this.syncAnalysisSettings();
            }
        }
    },
    switchSettingsTab(e, target) {
        const tab = target.dataset.tab;
        if (tab && tab !== App.state.activeTab) {
            App.state.activeTab = tab;
            App.updaters.updateSettingsContent();
        }
    },
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error('전체화면 실패:', err);
            });
        } else {
            document.exitFullscreen();
        }
    },

    // 시간 선택 다이얼 열기
    openTimePicker(e, target) {
        const targetId = target.dataset.target;
        if (!targetId) return;

        const inputElement = document.getElementById(targetId);
        if (!inputElement) return;

        TimePicker.show(inputElement, (selectedTime) => {
            inputElement.value = selectedTime;
            // 입력 이벤트 발생시켜 기존 로직 실행
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        });
    },
    toggleCourseManager() {
        App.state.isCourseManagerOpen = !App.state.isCourseManagerOpen;
        if (App.state.isCourseManagerOpen) {
            App.state.courseManagerSearchQuery = '';
        }
        App.render();
        
        if (App.state.isCourseManagerOpen) {
            const searchInput = document.getElementById('course-manager-search');
            if (searchInput) searchInput.focus();
        }
    },

    // 파일 분석 iframe 설정 동기화 통합
    syncAnalysisSettings() {
        console.log('파일 분석 설정 동기화 시작');
        // App.render()가 DOM을 업데이트할 때까지 약간의 지연 시간을 둡니다.
        setTimeout(() => {
            const iframe = document.querySelector('iframe[title="파일 분석"]');
            if (!iframe) {
                console.warn('파일 분석 iframe을 찾을 수 없습니다.');
                return;
            }

            console.log('파일 분석 iframe 찾음, 상태:', iframe.contentDocument?.readyState);

            const apply = () => {
                try {
                    if (iframe.contentDocument && iframe.contentDocument.documentElement) {
                        // 1. 폰트 크기 적용
                        const fontSize = App.state.globalFontSize || 100;
                        iframe.contentDocument.documentElement.style.fontSize = `${fontSize}%`;
                        console.log('폰트 크기 동기화:', fontSize, '%');
                        
                        // 2. 기사 목록 업데이트
                        this.updateAnalysisDrivers();
                    }
                } catch (error) {
                    console.error("파일 분석 iframe 동기화 실패:", error);
                }
            };

            if (iframe.contentDocument?.readyState === 'complete') {
                console.log('iframe 이미 로드됨, 즉시 적용');
                apply();
            } else {
                console.log('iframe 로드 대기 중...');
                iframe.addEventListener('load', apply, { once: true });
            }
        }, 50);
    },

    // --- 스케줄 관리 (ScheduleHandler.js로 분리 권장) ---
    updateDailyCourses(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId, 10);
        const isChecked = target.checked;
        
        let currentOrder = [...App.state.selectedCourseOrder];

        if (isChecked) {
            // 코스에 속한 대리점들을 찾아서 스케줄에 추가
            const agenciesForCourse = App.state.agencies.filter(agency => 
                agency.courseIds && agency.courseIds.includes(courseId)
            );

            const newStops = agenciesForCourse
                .filter(agency => {
                    // 이미 해당 코스로 등록된 대리점인지 확인 (중복 방지)
                    return !App.state.editableStops.some(stop => 
                        stop.agencyId === agency.id && stop.courseId === courseId
                    );
                })
                .map(agency => ({
                    id: Date.now() + Math.random(),
                    agencyId: agency.id,
                    courseId: courseId
                }));

            if (newStops.length > 0) {
                App.state.editableStops.push(...newStops);
                showNotification(`코스에 등록된 ${newStops.length}개 대리점을 추가했습니다.`, 'success');
            }
            
            // 선택 순서 배열에 추가 (중복 방지)
            if (!currentOrder.includes(courseId)) {
                currentOrder.push(courseId);
            }

        } else {
            // 해당 코스에 속한 경유지들을 스케줄에서 제거
            const initialStopCount = App.state.editableStops.length;
            App.state.editableStops = App.state.editableStops.filter(stop => stop.courseId !== courseId);
            const removedCount = initialStopCount - App.state.editableStops.length;
            if (removedCount > 0) {
                showNotification(`코스에서 ${removedCount}개 대리점을 제거했습니다.`, 'info');
            }

            // 선택 순서 배열에서 제거
            currentOrder = currentOrder.filter(id => id !== courseId);
        }

        // 코스 순서 상태 업데이트
        App.state.selectedCourseOrder = currentOrder;

        App.render();
        App.updaters.updateSchedule();
        App.debouncedSave();
    },
    openAgencySelectorModal(e, target) {
        const stopId = parseFloat(target.dataset.stopId);
        App.state.activeAgencySelectorStopId = stopId;
        App.state.agencySelectorSearchQuery = '';
        App.state.showAgencySelectorModal = true;
        App.updateModals();
        
        // 모바일 디버깅 정보 업데이트
        const debugIndicator = document.getElementById('mobile-debug-indicator');
        if (debugIndicator) {
            debugIndicator.textContent = `모달 열림: ${new Date().toLocaleTimeString()}`;
        }
        
        // 모바일 키보드가 열리는 시간을 고려하여 포커스 설정
        const focusInput = () => {
            const input = document.getElementById('agency-modal-search-input');
            if (input) {
                input.focus();
                // iOS에서 키보드가 확실히 열리도록 클릭 이벤트 트리거
                input.click();
            }
        };
        
        requestAnimationFrame(() => {
            setTimeout(focusInput, 300);
        });
    },
    closeAgencySelectorModal() {
        App.state.showAgencySelectorModal = false;
        App.state.activeAgencySelectorStopId = null;
        App.state.agencySelectorSearchQuery = '';
        App.updateModals();
    },
    selectAgencyFromModal(e, target) {
        const agencyIdStr = target.dataset.agencyId;
        const agencyId = agencyIdStr ? parseInt(agencyIdStr, 10) : 0;
        const stopId = App.state.activeAgencySelectorStopId;

        if (stopId === null) return;

        const stopIndex = App.state.editableStops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
            App.state.editableStops[stopIndex].agencyId = agencyId;
            App.updaters.updateSchedule();
            App.debouncedSave();
        }

        this.closeAgencySelectorModal();
    },
    selectAgency(e, target) {
        const agencyIdStr = target.dataset.agencyId;
        const agencyId = agencyIdStr ? parseInt(agencyIdStr, 10) : 0;
        const stopId = App.state.activeAgencySelectorStopId;

        if (stopId === null) return;

        const stopIndex = App.state.editableStops.findIndex(s => s.id === stopId);
        if (stopIndex !== -1) {
            App.state.editableStops[stopIndex].agencyId = agencyId;
            
            App.state.activeAgencySelectorStopId = null;
            App.state.agencySelectorSearchQuery = '';
            
            App.updaters.updateSchedule();
            App.debouncedSave();
        }
    },
    agencySearchInput(e, target) {
        App.state.agencySelectorSearchQuery = target.value;
        AgencySelector.updateForRow(App.state.activeAgencySelectorStopId);
    },
    addStop(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId, 10);
        const countInput = document.getElementById(`add-stop-count-${courseId}`);
        const count = countInput ? parseInt(countInput.value) || 1 : 1;

        for (let i = 0; i < count; i++) {
            App.state.editableStops.push({
                id: Date.now() + Math.random(),
                agencyId: 0,
                courseId: courseId
            });
        }

        App.updaters.updateSchedule();
        App.debouncedSave();
        
        if (count > 1) {
            showNotification(`${count}개의 경유지를 추가했습니다.`, 'success');
        }
    },
    removeStop(e, target) {
        const row = target.closest('.schedule-row');
        if (!row) return;

        const stopId = parseFloat(row.dataset.stopId);
        const stopIndex = App.state.editableStops.findIndex(s => s.id === stopId);
        
        if (stopIndex !== -1) {
            App.state.editableStops.splice(stopIndex, 1);
            App.updaters.updateSchedule();
            App.debouncedSave();
            showNotification('경유지를 삭제했습니다.', 'success');
        }
    },

    toggleGroupSelection(e, target) {
        if (App.state.isEditingLocked) {
            target.checked = !target.checked; // 되돌리기
            showNotification('스케줄이 잠겨있어 수정할 수 없습니다.', 'warning');
            return;
        }
        const stopId = parseFloat(target.dataset.stopId);
        if (isNaN(stopId)) return;

        if (target.checked) {
            App.state.selectedStopsForGrouping.add(stopId);
        } else {
            App.state.selectedStopsForGrouping.delete(stopId);
        }
        
        // 모달이 열려있는 경우에는 모달만 업데이트
        if (App.state.showGroupModal) {
            App.updaters.updateModals();
        } else {
            App.render(); // Re-render to show/hide the toolbar and update checkbox states
        }
    },

    openGroupModal() {
        if (App.state.selectedStopsForGrouping.size === 0) {
            showNotification('그룹 관리할 경유지를 선택해주세요.', 'warning');
            return;
        }
        App.state.showGroupModal = true;
        App.render();
    },

    closeGroupModal() {
        App.state.showGroupModal = false;
        App.state.selectedStopsForGrouping.clear();
        App.render();
    },

    groupSelectedStops() {
        const selectedIds = App.state.selectedStopsForGrouping;
        if (selectedIds.size < 2) {
            showNotification('그룹으로 묶으려면 2개 이상의 경유지를 선택해야 합니다.', 'warning');
            return;
        }

        const newGroupId = `group-${Date.now()}`;
        let updatedCount = 0;
        App.state.editableStops.forEach(stop => {
            if (selectedIds.has(stop.id)) {
                stop.groupId = newGroupId;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            showNotification(`${updatedCount}개의 경유지를 그룹으로 묶었습니다.`, 'success');
            App.state.selectedStopsForGrouping.clear();
            App.state.showGroupModal = false;
            App.debouncedSave();
            App.render();
        }
    },

    ungroupSelectedStops() {
        const selectedIds = App.state.selectedStopsForGrouping;
        if (selectedIds.size === 0) {
            showNotification('그룹을 해제할 경유지를 선택해주세요.', 'warning');
            return;
        }

        let updatedCount = 0;
        App.state.editableStops.forEach(stop => {
            if (selectedIds.has(stop.id) && stop.groupId) {
                console.log(`그룹 해제: stop.id=${stop.id}, stop.groupId=${stop.groupId}`);
                stop.groupId = null;
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            showNotification(`${updatedCount}개의 경유지 그룹을 해제했습니다.`, 'success');
            App.state.selectedStopsForGrouping.clear();
            App.state.showGroupModal = false;
            App.debouncedSave();
            App.render();
        } else {
            showNotification('선택한 경유지 중 그룹화된 항목이 없습니다.', 'warning');
        }
    },

    // --- 설정 관리 (SettingsHandler.js로 분리 권장) ---
    sortCourse(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId, 10);

        // 정렬할 경유지와 나머지 경유지를 분리
        const stopsToSort = App.state.editableStops.filter(stop => stop.courseId === courseId);
        const otherStops = App.state.editableStops.filter(stop => stop.courseId !== courseId);

        // 경유지를 대리점 우선순위에 따라 정렬
        stopsToSort.sort((a, b) => {
            const agencyA = a.agencyId ? App.state.cache.agenciesMap.get(a.agencyId) : null;
            const agencyB = b.agencyId ? App.state.cache.agenciesMap.get(b.agencyId) : null;

            const priorityA = agencyA ? agencyA.priority : 999;
            const priorityB = agencyB ? agencyB.priority : 999;

            // 코스별 우선순위 적용 로직 추가
            let effectivePriorityA = priorityA;
            const keyA = courseId === null ? 'null' : courseId;
            if (agencyA?.coursePriorities && agencyA.coursePriorities[keyA] !== undefined) {
                effectivePriorityA = agencyA.coursePriorities[keyA];
            }

            let effectivePriorityB = priorityB;
            const keyB = courseId === null ? 'null' : courseId;
            if (agencyB?.coursePriorities && agencyB.coursePriorities[keyB] !== undefined) {
                effectivePriorityB = agencyB.coursePriorities[keyB];
            }

            return effectivePriorityA - effectivePriorityB;
        });

        // 분리했던 경유지들을 다시 합침
        App.state.editableStops = [...otherStops, ...stopsToSort];

        App.updaters.updateSchedule();
        App.debouncedSave();
        showNotification('경유지를 우선순위 순으로 정렬했습니다.', 'success');
    },

    autoResizeColumns() {
        if (App.handlers.autoResizeColumns) {
            App.handlers.autoResizeColumns();
        }
    },

    changeFontSize(e, target) {
        const amount = parseInt(target.dataset.amount);
        const newSize = Math.max(50, Math.min(200, App.state.messageFontSize + amount));
        App.state.messageFontSize = newSize;
        App.services.storage.saveMessageFontSize(newSize.toString());
        App.updaters.updateMessagePreview();
    },

    changeGlobalFontSize(e, target) {
        const amount = parseInt(target.dataset.amount);
        const newSize = Math.max(50, Math.min(150, App.state.globalFontSize + amount));
        App.state.globalFontSize = newSize;
        App.services.storage.saveGlobalFontSize(newSize.toString());
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
        
        App.render();
    },

    // --- 커뮤니케이션 (SmsHandler.js로 분리 권장) ---
    sendSms() {
        const alwaysSend = App.services.storage.getAlwaysSendSms();
        if (alwaysSend) {
            this.confirmSendSms();
        } else {
            App.state.showSendSmsConfirmationModal = true;
            App.render();
        }
    },

    confirmSendSms() {
        const messageText = document.getElementById('message-preview')?.textContent;
        if (!messageText) {
            showNotification('전송할 메시지 내용이 없습니다.', 'error');
            return;
        }

        // 현재 필터 상태에 따라 수신자 전화번호 수집
        let rotations = App.getters.getRotationsForDay();
        const filterCourseId = App.state.messagePreviewFilterCourseId;

        if (filterCourseId !== null) {
            rotations = rotations.filter(r => r.course.id == filterCourseId);
        }

        const allStopsInRotations = rotations.flatMap(r => r.stops);

        const phoneNumbers = allStopsInRotations
            .map(stop => App.state.cache.agenciesMap.get(stop.agencyId))
            .filter(agency => agency && agency.phone)
            .map(agency => agency.phone.replace(/-/g, '')); // 하이픈 제거

        const uniquePhoneNumbers = [...new Set(phoneNumbers)];
        const recipients = uniquePhoneNumbers.join(',');

        const url = `sms:${recipients}?body=${encodeURIComponent(messageText)}`;
        window.location.href = url;

        const alwaysSendCheckbox = document.getElementById('always-send-sms-checkbox');
        if (alwaysSendCheckbox && alwaysSendCheckbox.checked) {
            App.services.storage.setAlwaysSendSms(true);
        }

        this.closeAllModals();
    },
    cancelSendSms() {
        this.closeAllModals();
    },

    toggleArrivalTimeInMessage(e, target) {
        App.state.showMessageArrivalTime = target.checked;
        App.services.storage.saveShowMessageArrivalTime(target.checked);
        App.updaters.updateMessagePreview();
    },

    // --- 운행 및 보정 (CorrectionHandler.js로 분리 권장) ---
    toggleCourseCompletion(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId);
        App.state.courseCompletionStatus[courseId] = !App.state.courseCompletionStatus[courseId];
        App.updaters.updateSchedule();
        App.debouncedSave();
    },

    toggleCorrectionMode(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId, 10);

        if (App.state.activeCorrectionCourseId !== null && App.state.activeCorrectionCourseId !== courseId) {
            showNotification('다른 코스의 이동시간 기록이 진행 중입니다. 먼저 해당 기록을 종료해주세요.', 'error');
            return;
        }

        if (App.state.activeCorrectionCourseId === courseId) {
            // 현재 활성화된 코스를 다시 클릭하면 보정 모드 종료
            App.services.storage.clearCorrectionState(App.state.selectedDate);
            delete App.state.correctionStatesByCourse[courseId];
            App.state.activeCorrectionCourseId = null;
            showNotification('이동시간 기록을 중단했습니다.', 'info');
        } else {
            // 경유지가 없거나 대리점이 하나도 지정되지 않은 코스는 기록을 시작할 수 없음
            const stopsForCourse = App.state.editableStops.filter(stop => stop.courseId === courseId && stop.agencyId > 0);
            if (stopsForCourse.length === 0) {
                showNotification('경유지가 없는 코스는 이동시간을 기록할 수 없습니다.', 'warning');
                return;
            }

            // 새 코스에 대한 보정 모드 시작 또는 재개
            App.state.activeCorrectionCourseId = courseId;
            const savedState = App.services.storage.loadCorrectionState(App.state.selectedDate);

            if (savedState && savedState.courseId === courseId && (Object.keys(savedState.recordedTimes).length > 0 || savedState.currentStep.type !== 'depart' || savedState.currentStep.locationId !== App.calculations.ASAN_FACTORY.id)) {
                App.state.correctionStatesByCourse[courseId] = savedState;
                showNotification('이전 기록에 이어서 시작합니다.', 'info');
            } else {
                // 새로 시작
                App.state.correctionStatesByCourse[courseId] = {
                    courseId: courseId,
                    startLocationId: App.calculations.ASAN_FACTORY.id,
                    currentStep: { type: 'depart', locationId: App.calculations.ASAN_FACTORY.id },
                    recordedTimes: {},
                    startTime: Date.now()
                };
                App.services.storage.saveCorrectionState(App.state.selectedDate, App.state.correctionStatesByCourse[courseId]);
                showNotification('이동시간 기록 모드를 시작했습니다. 공장 출발 버튼을 누르세요.', 'info');
            }
        }
        App.render();
    },
    correctionArrive(e, target) {
        const courseId = App.state.activeCorrectionCourseId;
        if (courseId === null) return;

        const locationId = parseInt(target.dataset.locationId, 10);
        const state = App.state.correctionStatesByCourse[courseId];

        if (!state) return;

        // 사용자가 순서와 다른 경유지의 '도착' 버튼을 눌렀을 경우,
        // GPS 자동 기록과 마찬가지로 사용자의 수동 입력을 우선하여 현재 상태를 강제로 업데이트합니다.
        if (state.currentStep.type !== 'arrive' || state.currentStep.locationId !== locationId) {
            showNotification(`경로 순서 변경: '${App.state.cache.agenciesMap.get(locationId)?.name}' 도착을 기록합니다.`, 'info');
            state.currentStep = { type: 'arrive', locationId: locationId };
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (!state.recordedTimes[locationId]) {
            state.recordedTimes[locationId] = {};
        }
        state.recordedTimes[locationId].arrival = timeString;

        // 현재 코스의 스케줄 데이터 업데이트
        const stopsInCourse = App.state.editableStops.filter(s => s.courseId === courseId && s.agencyId > 0);
        const targetStop = stopsInCourse.find(s => s.agencyId === locationId);

        if (targetStop) {
            // 그룹인 경우: 첫 번째 멤버에만 도착 시간을 설정하여 흐름을 만듭니다.
            if (targetStop.groupId) {
                const groupStops = stopsInCourse.filter(s => s.groupId === targetStop.groupId);
                const firstMember = groupStops[0];
                firstMember.manualArrivalTime = timeString;
                
                // 모든 멤버의 기록용 시간 업데이트
                groupStops.forEach(s => {
                    if (!state.recordedTimes[s.agencyId]) state.recordedTimes[s.agencyId] = {};
                    state.recordedTimes[s.agencyId].arrival = timeString;
                });
                showNotification(`그룹 도착 기록됨 (${groupStops.length}개 대리점)`, 'success');
            } else {
                targetStop.manualArrivalTime = timeString;
                showNotification(`${App.state.cache.agenciesMap.get(locationId)?.name} 도착 기록됨`, 'success');
            }
            App.debouncedSave();
        }

        if (locationId === App.calculations.ASAN_FACTORY.id) {
            const courseStops = App.getters.getRotationsForDay().find(r => r.course.id === courseId)?.stops || [];
            const newTravelTimes = App.calculations.updateAverageTravelTimes(
                state.recordedTimes,
                App.state.travelTimes,
                courseStops,
                App.calculations.ASAN_FACTORY.id
            );

            App.state.travelTimes = newTravelTimes;
            App.services.storage.saveTravelTimes(newTravelTimes);
            showNotification(`'${App.state.cache.coursesMap.get(courseId)?.name}' 코스의 평균 이동시간이 업데이트되었습니다.`, 'success');

            App.services.storage.clearCorrectionState(App.state.selectedDate);
            showNotification('코스 기록이 완료되었습니다. 업데이트된 시간이 적용됩니다.', 'success');
            App.state.activeCorrectionCourseId = null; // 현재 코스 기록 종료
        } else {
            state.currentStep = { type: 'depart', locationId: locationId };
            App.services.storage.saveCorrectionState(App.state.selectedDate, state);
        }

        App.render();
    },

    sendDepartureSmsToNextStop(nextAgency, customMessage = null) {
        const message = customMessage || `[배송알림] 출발합니다.`; // 기본값 fallback
        const phoneNumber = nextAgency.phone.replace(/-/g, '');
        const url = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
        
        // 모바일 환경 호환성을 위해 location.href 사용
        window.location.href = url;
        
        showNotification(`'${nextAgency.name}'(으)로 출발 문자를 발송합니다.`, 'info');
    },

    confirmSendDepartureSms() {
        const nextAgency = App.state.departureSmsData;
        const message = App.state.departureSmsMessage;
        if (nextAgency) {
            this.sendDepartureSmsToNextStop(nextAgency, message);
        }
        // 문자 발송 후 모달 자동 닫기
        App.state.showSendDepartureSmsModal = false;
        App.state.departureSmsData = null;
        App.state.departureSmsMessage = null;
        App.render();
    },

    correctionDepart(e, target) {
        const courseId = App.state.activeCorrectionCourseId;
        if (courseId === null) return;

        const locationId = parseInt(target.dataset.locationId, 10);
        const state = App.state.correctionStatesByCourse[courseId];

        if (!state || state.currentStep.type !== 'depart' || state.currentStep.locationId !== locationId) {
            showNotification('잘못된 순서입니다.', 'error');
            return;
        }

        const now = new Date();
        const timeString = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (!state.recordedTimes[locationId]) {
            state.recordedTimes[locationId] = {};
        }
        state.recordedTimes[locationId].departure = timeString;

        const stopsInCourse = App.state.editableStops.filter(s => s.courseId === courseId && s.agencyId > 0);
        const targetStop = stopsInCourse.find(s => s.agencyId === locationId);

        if (targetStop) {
            // 그룹인 경우: 마지막 멤버에 출발 시간을 설정합니다.
            if (targetStop.groupId) {
                const groupStops = stopsInCourse.filter(s => s.groupId === targetStop.groupId);
                const lastMember = groupStops[groupStops.length - 1];
                lastMember.manualDepartureTime = timeString;
                
                groupStops.forEach(s => {
                    if (!state.recordedTimes[s.agencyId]) state.recordedTimes[s.agencyId] = {};
                    state.recordedTimes[s.agencyId].departure = timeString;
                });
                showNotification(`그룹 출발 기록됨`, 'success');
            } else {
                targetStop.manualDepartureTime = timeString;
                showNotification(`${App.state.cache.agenciesMap.get(locationId)?.name} 출발 기록됨`, 'success');
            }
            App.debouncedSave();
        }

        if (locationId !== App.calculations.ASAN_FACTORY.id) {
            const record = state.recordedTimes[locationId];
            if (record.arrival && record.departure) {
                const arrivalMinutes = App.calculations.timeStringToMinutes(record.arrival);
                const departureMinutes = App.calculations.timeStringToMinutes(record.departure);
                
                if (arrivalMinutes !== null && departureMinutes !== null) {
                    let actualWorkTimeInSeconds = (departureMinutes - arrivalMinutes) * 60;
                    if (actualWorkTimeInSeconds < 0) {
                        actualWorkTimeInSeconds += 24 * 60 * 60;
                    }

                    // Find the stop in the current schedule and update its actualWorkTimeInSeconds
                    const stopIndex = App.state.editableStops.findIndex(s => s.agencyId === locationId && s.courseId === courseId);
                    if (stopIndex > -1) {
                        App.state.editableStops[stopIndex].actualWorkTimeInSeconds = actualWorkTimeInSeconds;
                        App.debouncedSave();
                    }

                    const agencyIndex = App.state.agencies.findIndex(a => a.id === locationId);
                    if (agencyIndex > -1) {
                        const agency = App.state.agencies[agencyIndex];
                        const oldAverage = agency.avgWorkTimeInSeconds;
                        
                        let newAverage;
                        if (oldAverage !== undefined && oldAverage !== null) {
                            newAverage = Math.round((oldAverage + actualWorkTimeInSeconds) / 2);
                        } else {
                            newAverage = actualWorkTimeInSeconds;
                        }
                        
                        agency.avgWorkTimeInSeconds = newAverage;
                        
                        App.services.storage.saveAgencies(App.state.agencies);
                        App.buildCache();
                        showNotification(`${agency.name} 평균 작업시간 업데이트됨: ${App.calculations.formatMinutes(newAverage)}`, 'info');
                    }
                }
            }
        }

        const rotation = App.getters.getRotationsForDay().find(r => r.course.id === courseId);
        const courseStops = rotation ? rotation.stops : [];
        const currentStopIndex = courseStops.findIndex(s => s.agencyId === locationId);
        
        let nextStop = null;
        if (locationId === App.calculations.ASAN_FACTORY.id) { // 공장에서 출발
            if (courseStops.length > 0) {
                nextStop = courseStops[0];
                // 공장에서 첫 경유지로 출발 시에는 문자 발송 안 함
            }
        } else if (currentStopIndex !== -1) { // 경유지에서 출발
            // 현재 경유지가 그룹에 속해 있다면, 해당 그룹의 마지막 경유지 이후를 찾습니다.
            const currentStop = courseStops[currentStopIndex];
            const currentGroupId = currentStop.groupId;
            
            let nextIndex = currentStopIndex + 1;
            if (currentGroupId) {
                while (nextIndex < courseStops.length && courseStops[nextIndex].groupId === currentGroupId) {
                    nextIndex++;
                }
            }

            if (nextIndex < courseStops.length) {
                nextStop = courseStops[nextIndex];

                // 다음 경유지로 문자 발송 로직
                const nextAgency = App.state.cache.agenciesMap.get(nextStop.agencyId);
                if (nextAgency && nextAgency.phone) {
                    const now = new Date();
                    const timeString = `${now.getHours()}시 ${now.getMinutes()}분`;
                    const departureName = App.state.cache.agenciesMap.get(locationId)?.name || '출발지';
                    const message = `${departureName}에서 ${timeString}에 출발 하였습니다.`;

                    if (App.state.isAutoSmsOnDepartureEnabled) {
                        // 자동 발송 기능이 켜져 있으면 바로 발송
                        this.sendDepartureSmsToNextStop(nextAgency, message);
                    } else {
                        // 자동 발송 기능이 꺼져 있으면 확인 모달 표시
                        App.state.departureSmsData = nextAgency;
                        App.state.departureSmsMessage = message;
                        App.state.showSendDepartureSmsModal = true;
                    }
                }
            }
        }

        if (nextStop && nextStop.agencyId) {
            state.currentStep = { type: 'arrive', locationId: nextStop.agencyId };
        } else {
            // 마지막 경유지이거나 다음 경유지가 없으면 공장으로 복귀
            state.currentStep = { type: 'arrive', locationId: App.calculations.ASAN_FACTORY.id };
        }

        App.services.storage.saveCorrectionState(App.state.selectedDate, state);
        App.render();
    },

    setDepartureNow(e, target) {
        const courseId = target.dataset.courseId === 'null' ? null : parseInt(target.dataset.courseId);
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        App.state.departureTimesByCourse[courseId] = timeString;
        App.updaters.updateSchedule();
        App.debouncedSave();
        showNotification(`출발시간을 ${timeString}으로 설정했습니다.`, 'success');
    },

    // 보정 모드에서 도착/출발 시간 수동 입력 처리
    handleCorrectionTimeInput(e, target) {
        const property = target.dataset.property;
        const stopId = parseFloat(target.dataset.stopId);
        const value = target.value.trim();

        if (!property || !stopId) return;
        if (!value || !/^\d{1,2}:\d{2}$/.test(value)) {
            showNotification('시간 형식이 올바르지 않습니다. (HH:MM)', 'warning');
            return;
        }

        const stop = App.state.editableStops.find(s => s.id === stopId);
        if (!stop) return;

        const courseId = stop.courseId;
        const correctionState = App.state.correctionStatesByCourse[courseId];
        if (!correctionState) {
            showNotification('보정 모드가 활성화되지 않았습니다.', 'error');
            return;
        }

        const agencyId = stop.agencyId;
        if (!agencyId) return;

        if (!correctionState.recordedTimes[agencyId]) {
            correctionState.recordedTimes[agencyId] = {};
        }

        if (property === 'correctionArrivalTime') {
            correctionState.recordedTimes[agencyId].arrival = value;
            stop.manualArrivalTime = value;
            showNotification('도착 시간이 수정되었습니다.', 'success');
        } else if (property === 'correctionDepartureTime') {
            correctionState.recordedTimes[agencyId].departure = value;
            stop.manualDepartureTime = value;
            showNotification('출발 시간이 수정되었습니다.', 'success');
        }

        // 그룹인 경우 그룹 전체에 시간 적용
        if (stop.groupId) {
            const groupStops = App.state.editableStops.filter(s => s.groupId === stop.groupId && s.courseId === courseId);
            groupStops.forEach(s => {
                if (s.agencyId && s.agencyId !== agencyId) {
                    if (!correctionState.recordedTimes[s.agencyId]) {
                        correctionState.recordedTimes[s.agencyId] = {};
                    }
                    if (property === 'correctionArrivalTime') {
                        correctionState.recordedTimes[s.agencyId].arrival = value;
                        s.manualArrivalTime = value;
                    } else if (property === 'correctionDepartureTime') {
                        correctionState.recordedTimes[s.agencyId].departure = value;
                        s.manualDepartureTime = value;
                    }
                }
            });
        }

        App.services.storage.saveCorrectionState(App.state.selectedDate, correctionState);
        App.debouncedSave();
        App.render();
    },

    updateAgencyPriority(e, target) {
        const agencyId = parseInt(target.dataset.agencyId, 10);
        const courseIdRaw = target.dataset.courseId;
        const courseId = (courseIdRaw === 'null' || courseIdRaw === 'undefined') ? 'null' : parseInt(courseIdRaw, 10);
        const newPriority = parseInt(target.value, 10);

        if (isNaN(agencyId)) return;

        const agencyIndex = App.state.agencies.findIndex(a => a.id === agencyId);
        if (agencyIndex !== -1) {
            const agency = App.state.agencies[agencyIndex];
            if (!agency.coursePriorities) agency.coursePriorities = {};
            
            if (isNaN(newPriority)) {
                delete agency.coursePriorities[courseId];
            } else {
                agency.coursePriorities[courseId] = newPriority;
            }

            App.services.storage.saveAgencies(App.state.agencies);
            App.buildCache();
            App.debouncedSave(); // 스케줄에 즉시 반영되도록 저장 트리거
        }
    },

    updateDepartureSmsMessage(e, target) {
        App.state.departureSmsMessage = target.value; 
    },

    // --- 공통 UI ---
    closeAllModals() {
        Object.keys(App.state).forEach(key => {
            if (key.startsWith('show') && key.endsWith('Modal')) {
                App.state[key] = false;
            }
        });
        App.state.showImageViewerModal = false;
        App.state.imageViewerSrc = null;
        App.state.agencyToDelete = null;
        App.state.courseToDelete = null;
        App.state.driverToDelete = null;
        App.state.dateToLoad = null;
        App.state.fileToRestore = null;
        App.state.correctionData = null;
        App.state.cameraDataToApply = null;
        App.state.departureSmsData = null;
        App.state.departureSmsMessage = null;
        App.state.memoModalData = null;
        App.state.historyDateToDelete = null;
        App.render();
    },

    // 대리점 추가 행 표시
    addNewAgencyRow() {
        if (App.state.editingAgencyId !== null) return;

        App.state.editingAgencyId = 'new';
        App.state.editingAgencyData = {
            id: 'new',
            name: '',
            priority: 99,
            type: '일반',
            coursePriorities: {}, // 코스별 우선순위 필드 추가
            palletMethod: 'manual',
            unloadingDoor: 'rear',
            address: '',
            phone: '',
            memo: '',
            unavailableTimes: '',
            courseIds: [],
            lastSearchedAddress: null,
            geofenceRadius: 20,
        };
        App.updaters.updateSettingsContent();
    },

    // 대리점 인라인 수정 시작
    startEditAgencyInline(e, target) {
        const agencyId = parseInt(target.closest('tr[data-agency-id], div[data-agency-id]').dataset.agencyId, 10);
        const agency = App.state.agencies.find(a => a.id === agencyId);

        if (agency) {
            App.state.editingAgencyId = agencyId;
            App.state.editingAgencyData = JSON.parse(JSON.stringify(agency)); // Deep copy
            App.state.editingAgencyData.lastSearchedAddress = agency.address;
            App.updaters.updateSettingsContent();
        }
    },

    // 대리점 인라인 수정 취소
    cancelEditAgencyInline() {
        App.state.editingAgencyId = null;
        App.state.editingAgencyData = null;
        App.state.agencyCourseSearchQuery = '';
        App.updaters.updateSettingsContent();
    },

    // 대리점 인라인 저장
    saveAgencyInline() {
        const data = App.state.editingAgencyData;
        if (!data || !data.name?.trim()) {
            showNotification('대리점 이름은 필수 항목입니다.', 'error');
            return;
        }

        const cleanedData = this._prepareAgencyData(data);

        if (App.state.editingAgencyId === 'new') {
            // 새 대리점 추가
            const newAgency = { ...cleanedData, id: Date.now() };
            App.state.agencies.push(newAgency);
            showNotification(`'${newAgency.name}' 대리점이 추가되었습니다.`, 'success');
        } else {
            // 기존 대리점 수정
            const index = App.state.agencies.findIndex(a => a.id === App.state.editingAgencyId);
            if (index !== -1) {
                App.state.agencies[index] = cleanedData;
                showNotification(`'${cleanedData.name}' 정보가 수정되었습니다.`, 'success');
            }
        }

        App.services.storage.saveAgencies(App.state.agencies);
        App.buildCache();
        this.cancelEditAgencyInline(); // 상태 초기화 및 리렌더링
    },

    // 대리점 삭제 요청 (모달 열기)
    deleteAgency(e, target) {
        const agencyId = parseInt(target.closest('tr[data-agency-id], div[data-agency-id]').dataset.agencyId, 10);
        const agency = App.state.agencies.find(a => a.id === agencyId);
        if (agency) {
            App.state.agencyToDelete = agency;
            App.state.showDeleteAgencyModal = true;
            App.render();
        }
    },

    // 대리점 삭제 확인
    confirmDeleteAgency() {
        const agencyId = App.state.agencyToDelete?.id;
        if (!agencyId) return;

        // 실제로는 isDeleted 플래그를 설정하여 논리적 삭제를 수행할 수 있습니다.
        // 여기서는 배열에서 완전히 제거합니다.
        App.state.agencies = App.state.agencies.filter(a => a.id !== agencyId);
        
        App.services.storage.saveAgencies(App.state.agencies);
        App.buildCache();
        showNotification(`'${App.state.agencyToDelete.name}' 대리점이 삭제되었습니다.`, 'success');
        this.closeAllModals();
    },
    // 대리점 삭제 취소
    cancelDeleteAgency() {
        this.closeAllModals();
    },

    // 코스 추가 행 표시
    addNewCourseRow() {
        if (App.state.editingCourseId !== null) return;

        App.state.editingCourseId = 'new';
        App.state.editingCourseData = {
            id: 'new',
            name: '',
            midRangeMinStops: null,
            longRangeMinStops: null,
            memo: ''
        };
        App.updaters.updateSettingsContent();
    },

    // 코스 인라인 수정 시작
    startEditCourseInline(e, target) {
        const courseId = parseInt(target.closest('tr[data-course-id], div[data-course-id]').dataset.courseId, 10);
        const course = App.state.courses.find(c => c.id === courseId);

        if (course) {
            App.state.editingCourseId = courseId;
            App.state.editingCourseData = JSON.parse(JSON.stringify(course)); // Deep copy
            App.updaters.updateSettingsContent();
        }
    },

    // 코스 인라인 수정 취소
    cancelEditCourseInline() {
        App.state.editingCourseId = null;
        App.state.editingCourseData = null;
        App.updaters.updateSettingsContent();
    },

    // 코스 인라인 저장
    saveCourseInline() {
        const data = App.state.editingCourseData;
        if (!data || !data.name?.trim()) {
            showNotification('코스 이름은 필수 항목입니다.', 'error');
            return;
        }

        // 데이터 타입 변환
        data.midRangeMinStops = (data.midRangeMinStops && data.midRangeMinStops !== '') ? parseInt(data.midRangeMinStops, 10) : null;
        data.longRangeMinStops = (data.longRangeMinStops && data.longRangeMinStops !== '') ? parseInt(data.longRangeMinStops, 10) : null;

        if (App.state.editingCourseId === 'new') {
            const newCourse = { ...data, id: Date.now() };
            App.state.courses.push(newCourse);
            showNotification(`'${newCourse.name}' 코스가 추가되었습니다.`, 'success');
        } else {
            const index = App.state.courses.findIndex(c => c.id === App.state.editingCourseId);
            if (index !== -1) {
                App.state.courses[index] = { ...data };
                showNotification(`'${data.name}' 코스 정보가 수정되었습니다.`, 'success');
            }
        }

        App.services.storage.saveCourses(App.state.courses);
        App.buildCache();
        this.cancelEditCourseInline();
    },

    // 코스 삭제 요청 (모달 열기)
    deleteCourse(e, target) {
        const courseId = parseInt(target.closest('tr[data-course-id], div[data-course-id]').dataset.courseId, 10);
        const course = App.state.courses.find(c => c.id === courseId);
        if (course) {
            App.state.courseToDelete = course;
            App.state.showDeleteCourseModal = true;
            App.render();
        }
    },

    // 코스 삭제 취소
    cancelDeleteCourse() {
        this.closeAllModals();
    },

    // 코스 삭제 확인
    confirmDeleteCourse() {
        const courseToDelete = App.state.courseToDelete;
        if (!courseToDelete) return;

        // 1. 코스 목록에서 해당 코스 제거
        App.state.courses = App.state.courses.filter(c => c.id !== courseToDelete.id);

        // 2. 이 코스를 포함하는 모든 대리점에서 해당 코스 ID 제거
        App.state.agencies.forEach(agency => {
            if (agency.courseIds && agency.courseIds.includes(courseToDelete.id)) {
                agency.courseIds = agency.courseIds.filter(id => id !== courseToDelete.id);
            }
        });

        App.services.storage.saveCourses(App.state.courses);
        App.services.storage.saveAgencies(App.state.agencies);
        App.buildCache();
        showNotification(`'${courseToDelete.name}' 코스가 삭제되었습니다.`, 'success');
        this.closeAllModals();
    },

    // 대리점 정렬
    sortAgencies(e, target) {
        const key = target.dataset.key;
        if (!key) return;

        const currentSort = App.state.agencySort;
        let newOrder;

        if (currentSort.key === key) {
            newOrder = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            newOrder = 'asc';
        }

        App.state.agencySort = { key, order: newOrder };
        App.updaters.updateSettingsContent();
    },

    // 코스 정렬
    sortCourses(e, target) {
        const key = target.dataset.key;
        if (!key) return;

        const currentSort = App.state.courseSort;
        let newOrder;

        if (currentSort.key === key) {
            newOrder = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            newOrder = 'asc';
        }

        App.state.courseSort = { key, order: newOrder };
        App.updaters.updateSettingsContent();
    },

    // 배송기사 추가
    addDriver(e, form) {
        const input = form.querySelector('input[name="name"]');
        const name = input.value.trim();
        if (!name) {
            showNotification('기사 이름을 입력하세요.', 'error');
            return;
        }

        if (App.state.drivers.some(d => d.name === name)) {
            showNotification('이미 등록된 기사 이름입니다.', 'error');
            return;
        }

        const newDriver = { id: Date.now(), name };
        App.state.drivers.push(newDriver);
        App.services.storage.saveDrivers(App.state.drivers);
        input.value = '';
        showNotification(`'${name}' 기사가 추가되었습니다.`, 'success');
        App.updaters.updateSettingsContent();
    },

    // 배송기사 수정 시작
    editDriver(e, target) {
        const driverId = parseInt(target.dataset.driverId, 10);
        const driver = App.state.drivers.find(d => d.id === driverId);
        if (driver) {
            App.state.editingDriverId = driverId;
            App.state.editingDriverData = { ...driver };
            App.updaters.updateSettingsContent();
        }
    },

    // 배송기사 수정 취소
    cancelEditDriver() {
        App.state.editingDriverId = null;
        App.state.editingDriverData = null;
        App.updaters.updateSettingsContent();
    },

    // 배송기사 저장
    saveDriver(e, form) {
        const driverId = parseInt(form.dataset.driverId, 10);
        const input = form.querySelector('input[name="name"]');
        const newName = input.value.trim();

        const index = App.state.drivers.findIndex(d => d.id === driverId);
        if (index !== -1) {
            App.state.drivers[index].name = newName;
            App.services.storage.saveDrivers(App.state.drivers);
            showNotification('기사 이름이 수정되었습니다.', 'success');
            this.cancelEditDriver();
        }
    },

    // 배송기사 삭제 요청 (모달 열기)
    requestDeleteDriver(e, target) {
        const driverId = parseInt(target.dataset.driverId, 10);
        const driver = App.state.drivers.find(d => d.id === driverId);
        if (driver) {
            App.state.driverToDelete = driver;
            App.state.showDeleteDriverModal = true;
            App.render();
        }
    },

    // 배송기사 삭제 취소
    cancelDeleteDriver() {
        this.closeAllModals();
    },

    // 배송기사 삭제 확인
    confirmDeleteDriver() {
        const driverToDelete = App.state.driverToDelete;
        if (!driverToDelete) return;

        // 드라이버 목록에서 해당 기사 제거
        App.state.drivers = App.state.drivers.filter(d => d.id !== driverToDelete.id);

        // 변경사항 저장
        App.services.storage.saveDrivers(App.state.drivers);
        
        showNotification(`'${driverToDelete.name}' 기사가 삭제되었습니다.`, 'success');
        this.closeAllModals();
    },

    // 자동 백업 토글
    toggleAutoBackup(e, target) {
        App.state.isAutoBackupEnabled = target.checked;
        App.services.storage.saveAutoBackupSettings({
            enabled: App.state.isAutoBackupEnabled,
            trigger: App.state.autoBackupTrigger,
            lastDate: App.state.lastAutoBackupDate
        });
        App.updaters.updateSettingsContent();
        showNotification(`자동 백업이 ${target.checked ? '활성화' : '비활성화'}되었습니다.`, 'info');
    },

    // 자동 백업 시점 설정
    setAutoBackupTrigger(e, target) {
        App.state.autoBackupTrigger = target.value;
        App.services.storage.saveAutoBackupSettings({
            enabled: App.state.isAutoBackupEnabled,
            trigger: App.state.autoBackupTrigger,
            lastDate: App.state.lastAutoBackupDate
        });
        showNotification(`자동 백업 시점이 '${target.nextElementSibling.textContent}'(으)로 설정되었습니다.`, 'info');
    },

    // Google Maps API 키 저장
    saveGoogleMapsApiKey() {
        const apiKeyInput = document.getElementById('google-maps-api-key');
        if (apiKeyInput) {
            const apiKey = apiKeyInput.value.trim();
            App.state.googleMapsApiKey = apiKey;
            App.services.storage.saveGoogleMapsApiKey(apiKey); // storage-service에 해당 함수 필요
            showNotification('Google Maps API 키가 저장되었습니다.', 'success');
        }
    },

    // 한국 주소 파싱 헬퍼 함수 - 구조화된 쿼리를 위해 주소를 분리
    _parseKoreanAddress(address) {
        const parsed = {
            street: '',
            county: '',
            city: '',
            state: '',
            country: '대한민국'
        };

        // 주소 정규화
        let normalized = address.trim();
        
        // 시/도 패턴 (서울특별시, 부산광역시, 경기도 등)
        const cityStatePattern = /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/;
        const cityStateMatch = normalized.match(cityStatePattern);
        
        if (cityStateMatch) {
            const matched = cityStateMatch[1];
            parsed.state = matched;
            // 특별시/광역시는 city와 state가 같음
            if (matched.includes('시') && !matched.includes('도')) {
                parsed.city = matched;
            }
            normalized = normalized.replace(matched, '').trim();
        }

        // 구/군 패턴 (강남구, 수원시 등)
        const countyPattern = /([가-힣]+구|[가-힣]+군|[가-힣]+시(?!\s+특별시))/;
        const countyMatch = normalized.match(countyPattern);
        
        if (countyMatch) {
            parsed.county = countyMatch[1];
            normalized = normalized.replace(countyMatch[1], '').trim();
        }

        // 도로명 주소 패턴 (테헤란로 517, 화성로2365번길42 등)
        const streetPattern = /([가-힣]+로\s*\d+\s*번길\s*\d*|[가-힣]+로\s*\d+)/;
        const streetMatch = normalized.match(streetPattern);
        
        if (streetMatch) {
            parsed.street = streetMatch[1].replace(/\s+/g, ''); // 띄어쓰기 제거
            normalized = normalized.replace(streetMatch[1], '').trim();
        } else {
            // 도로명이 없으면 나머지 전체를 street로 처리
            if (normalized) {
                parsed.street = normalized.replace(/\s+/g, '');
            }
        }

        // city가 설정되지 않았고 state가 도인 경우, 시 이름 추정
        if (!parsed.city && parsed.state && parsed.state.includes('도')) {
            // 경기도 -> 경기도 (city 없음), 강원도 -> 강원도 (city 없음)
            // 구체적인 시 이름이 필요한 경우 추가 로직 필요
        }

        return parsed;
    },

    // Nominatim 검색을 위한 주소 정규화 헬퍼 함수
    _normalizeAddressForNominatim(address) {
        let normalizedAddress = address;
        // 한글과 숫자 사이에 공백 추가 (예: "서울시강남구123번지" -> "서울시강남구 123번지")
        normalizedAddress = normalizedAddress.replace(/([가-힣])(\d)/g, '$1 $2');
        // 숫자와 한글 사이에 공백 추가 (예: "123번지서울시" -> "123번지 서울시")
        normalizedAddress = normalizedAddress.replace(/(\d)([가-힣])/g, '$1 $2');
        // 한글과 영어 사이에 공백 추가
        normalizedAddress = normalizedAddress.replace(/([가-힣])([a-zA-Z])/g, '$1 $2');
        // 영어와 한글 사이에 공백 추가
        normalizedAddress = normalizedAddress.replace(/([a-zA-Z])([가-힣])/g, '$1 $2');
        // 여러 공백을 하나의 공백으로 대체하고 앞뒤 공백 제거
        normalizedAddress = normalizedAddress.replace(/\s+/g, ' ').trim();
        // *로*번길 패턴에서 띄어쓰기 제거 (예: "로 2365 번길" -> "로2365번길")
        normalizedAddress = normalizedAddress.replace(/로\s+(\d+)\s+번길/g, '로$1번길');
        return normalizedAddress;
    },

    // 주소로 좌표를 검색하는 내부 헬퍼 함수
    async _findCoordinatesForAddress(address) {
        if (!address || address.trim().length === 0) {
            showNotification('주소를 입력해주세요.', 'error');
            return null;
        }
        try {
            showNotification('좌표를 검색 중입니다...', 'info');
            console.log('🔍 [지오코딩] 주소 검색 시작:', address);
            console.log('🔑 [지오코딩] VWorld API 키 상태:', App.state.vworldApiKey ? '설정됨' : '설정안됨');
            console.log('🔑 [지오코딩] Google API 키 상태:', App.state.googleMapsApiKey ? '설정됨' : '설정안됨');

            // 1. VWorld API 시도 (한국 주소 최우선)
            if (App.state.vworldApiKey) {
                try {
                    console.log('🌐 [지오코딩] VWorld API 시도...');
                    const vworldUrl = `https://api.vworld.kr/req/address?service=address&request=search&version=2.0&format=json&key=${App.state.vworldApiKey}&address=${encodeURIComponent(address)}`;
                    console.log('🔗 [지오코딩] VWorld API URL:', vworldUrl.replace(App.state.vworldApiKey, '***API_KEY***'));
                    
                    const response = await fetch(vworldUrl);
                    console.log('📊 [지오코딩] VWorld API 응답 상태:', response.status, response.statusText);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📦 [지오코딩] VWorld API 응답 데이터:', data);
                        
                        if (data.response && data.response.status === 'OK' && data.response.result && data.response.result.length > 0) {
                            const result = data.response.result[0];
                            const location = result.point;
                            console.log('✅ [지오코딩] VWorld API 성공:', location);
                            showNotification('좌표를 찾았습니다. (VWorld)', 'success');
                            return { lat: parseFloat(location.y), lon: parseFloat(location.x) };
                        } else {
                            console.warn('❌ [지오코딩] VWorld API 실패:', data.response?.status || 'Unknown');
                        }
                    } else {
                        console.error('❌ [지오코딩] VWorld API HTTP 오류:', response.status, response.statusText);
                    }
                } catch (vworldErr) {
                    console.error('❌ [지오코딩] VWorld API 호출 중 네트워크 오류:', vworldErr);
                }
            } else {
                console.log('⏭️ [지오코딩] VWorld API 키가 없어 Google으로 넘어감');
            }

            // 2. Google Maps API 시도 (VWorld 실패 시 백업)
            if (App.state.googleMapsApiKey) {
                try {
                    console.log('🌐 [지오코딩] Google API 시도...');
                    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${App.state.googleMapsApiKey}`;
                    console.log('🔗 [지오코딩] Google API URL:', googleUrl.replace(App.state.googleMapsApiKey, '***API_KEY***'));
                    
                    const response = await fetch(googleUrl);
                    console.log('📊 [지오코딩] Google API 응답 상태:', response.status, response.statusText);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('📦 [지오코딩] Google API 응답 데이터:', data);
                        
                        if (data.status === 'OK' && data.results.length > 0) {
                            const location = data.results[0].geometry.location;
                            console.log('✅ [지오코딩] Google API 성공:', location);
                            showNotification('좌표를 찾았습니다. (Google)', 'success');
                            return { lat: location.lat, lon: location.lng };
                        } else {
                            console.warn('❌ [지오코딩] Google Geocoding API 실패:', data.status, data.error_message || '');
                        }
                    } else {
                        console.error('❌ [지오코딩] Google API HTTP 오류:', response.status, response.statusText);
                    }
                } catch (googleErr) {
                    console.error('❌ [지오코딩] Google API 호출 중 네트워크 오류:', googleErr);
                }
            } else {
                console.log('⏭️ [지오코딩] Google API 키가 없어 OSM으로 넘어감');
            }

            // 3. VWorld와 Google API를 사용하지 않거나, 모두 실패한 경우 Nominatim(OSM)으로 대체 시도
            console.log('🌐 [지오코딩] OSM (Nominatim) 시도...');
            
            // 3-1. 구조화된 쿼리 시도 (한국 주소 최적화)
            const parsedAddress = this._parseKoreanAddress(address);
            console.log('📝 [지오코딩] 파싱된 주소:', parsedAddress);
            
            const structuredParams = new URLSearchParams();
            if (parsedAddress.street) structuredParams.append('street', parsedAddress.street);
            if (parsedAddress.county) structuredParams.append('county', parsedAddress.county);
            if (parsedAddress.city) structuredParams.append('city', parsedAddress.city);
            if (parsedAddress.state) structuredParams.append('state', parsedAddress.state);
            if (parsedAddress.country) structuredParams.append('country', parsedAddress.country);
            structuredParams.append('countrycodes', 'kr');
            structuredParams.append('accept-language', 'ko');
            structuredParams.append('format', 'jsonv2');
            structuredParams.append('addressdetails', '1');
            structuredParams.append('limit', '1');
            
            const structuredUrl = `https://nominatim.openstreetmap.org/search?${structuredParams.toString()}`;
            console.log('🔗 [지오코딩] OSM 구조화 쿼리 URL:', structuredUrl);
            
            try {
                const structuredResponse = await fetch(structuredUrl);
                console.log('📊 [지오코딩] OSM 구조화 쿼리 응답 상태:', structuredResponse.status, structuredResponse.statusText);
                
                if (structuredResponse.ok) {
                    const structuredData = await structuredResponse.json();
                    console.log('📦 [지오코딩] OSM 구조화 쿼리 응답 데이터:', structuredData);
                    
                    if (structuredData && structuredData.length > 0) {
                        const { lat, lon } = structuredData[0];
                        console.log('✅ [지오코딩] OSM 구조화 쿼리 성공:', { lat, lon });
                        showNotification('좌표를 찾았습니다. (OSM)', 'success');
                        return { lat: parseFloat(lat), lon: parseFloat(lon) };
                    } else {
                        console.log('⚠️ [지오코딩] OSM 구조화 쿼리 결과 없음, 자유 형식 쿼리 시도...');
                    }
                } else {
                    console.error('❌ [지오코딩] OSM 구조화 쿼리 HTTP 오류:', structuredResponse.status, structuredResponse.statusText);
                }
            } catch (structuredErr) {
                console.error('❌ [지오코딩] OSM 구조화 쿼리 호출 중 네트워크 오류:', structuredErr);
            }
            
            // 3-2. 구조화 쿼리 실패 시 자유 형식 쿼리 폴백
            console.log('🌐 [지오코딩] OSM 자유 형식 쿼리 시도...');
            const normalizedAddress = this._normalizeAddressForNominatim(address);
            console.log('📝 [지오코딩] 정규화된 주소:', normalizedAddress);
            
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedAddress)}&countrycodes=kr&accept-language=ko&limit=1`;
            console.log('🔗 [지오코딩] OSM 자유 형식 쿼리 URL:', nominatimUrl);
            
            const response = await fetch(nominatimUrl);
            console.log('📊 [지오코딩] OSM 자유 형식 쿼리 응답 상태:', response.status, response.statusText);
            
            if (!response.ok) {
                console.error(`❌ [지오코딩] Nominatim API 오류 (${response.status}):`, await response.text());
                throw new Error(`Network response was not ok: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 [지오코딩] OSM 자유 형식 쿼리 응답 데이터:', data);
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                console.log('✅ [지오코딩] OSM 자유 형식 쿼리 성공:', { lat, lon });
                showNotification('좌표를 찾았습니다. (OSM)', 'success');
                return { lat: parseFloat(lat), lon: parseFloat(lon) };
            } else {
                console.log('❌ [지오코딩] OSM 자유 형식 쿼리 결과 없음');
                showNotification('해당 주소의 좌표를 찾을 수 없습니다.', 'error');
                return null;
            }
        } catch (error) {
            console.error('❌ [지오코딩] 좌표 검색 실패:', error);
            showNotification('좌표 검색 중 오류가 발생했습니다.', 'error');
            return null;
        }
    },

    // 좌표 찾기 (주소 -> 위도/경도 변환)
    async findCoordinates(e, target) {
        const row = target.closest('[data-editing-row="true"]');
        if (!row) return;

        const addressInput = row.querySelector('input[name="address"]');
        const address = addressInput.value.trim();

        if (!address) {
            showNotification('주소를 입력해주세요.', 'error');
            return;
        }

        // For blur events, only search if the address has changed since the last successful search.
        // Button clicks always force a search.
        if (e.type === 'blur' && App.state.editingAgencyData && address === App.state.editingAgencyData.lastSearchedAddress) {
            return;
        }

        const coords = await this._findCoordinatesForAddress(address);

        if (coords) {
            const latInput = row.querySelector('input[name="latitude"]');
            const lonInput = row.querySelector('input[name="longitude"]');
            
            if (latInput) latInput.value = coords.lat.toFixed(6);
            if (lonInput) lonInput.value = coords.lon.toFixed(6);
            
            App.state.editingAgencyData.latitude = coords.lat;
            App.state.editingAgencyData.longitude = coords.lon;
            App.state.editingAgencyData.lastSearchedAddress = address;
        }
    },

    // 좌표 찾기 (모달용)
    async findCoordinatesForModal(e, target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        const addressInput = modal.querySelector('#edit-agency-address');
        const address = addressInput.value.trim();
        
        const coords = await this._findCoordinatesForAddress(address);

        if (coords) {
            const latInput = modal.querySelector('#edit-agency-latitude');
            const lonInput = modal.querySelector('#edit-agency-longitude');
            
            if (latInput) latInput.value = coords.lat.toFixed(6);
            if (lonInput) lonInput.value = coords.lon.toFixed(6);

            // 상태(State) 동기화 - 저장 시 반영되도록 함
            if (App.state.agencyToEdit) {
                App.state.agencyToEdit.latitude = coords.lat;
                App.state.agencyToEdit.longitude = coords.lon;
            }
        }
    },

    // GPS 자동 기록 토글
    async toggleGpsAutoRecord(e, target) {
        const isEnabled = target.checked;

        if (isEnabled) {
            // HTTPS 보안 컨텍스트 확인
            if (!window.isSecureContext) {
                showNotification('GPS 기능은 보안 연결(HTTPS)에서만 사용할 수 있습니다.', 'error');
                target.checked = false;
                App.state.isGpsAutoRecordEnabled = false;
                return;
            }

            try {
                // 권한 상태 미리 확인 (가능한 경우)
                if (navigator.permissions && navigator.permissions.query) {
                    try {
                        const result = await navigator.permissions.query({ name: 'geolocation' });
                        if (result.state === 'denied') {
                            throw new Error('denied');
                        }
                    } catch (permErr) {
                        // 권한 쿼리 실패는 무시하고 requestPermission 진행
                    }
                }

                await App.services.geolocation.requestPermission();
                const watcherId = App.services.geolocation.startWatching(
                    (position) => this.handleGpsUpdate(position),
                    (error) => {
                        console.error('GPS 위치 추적 오류:', error);
                        
                        let errorMsg = `GPS 오류: ${error.message}`;
                        if (error.code === 1) { // PERMISSION_DENIED
                            errorMsg = '위치 정보 접근 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.';
                        }
                        showNotification(errorMsg, 'error', 5000);

                        if (App.state.isGpsAutoRecordEnabled) {
                            App.state.isGpsAutoRecordEnabled = false;
                            App.services.storage.saveGpsAutoRecordEnabled(false);
                            App.render();
                        }
                    }
                );
                App.state.gpsWatcherId = watcherId;
                App.state.isGpsAutoRecordEnabled = true;
                App.services.storage.saveGpsAutoRecordEnabled(true);
                App.requestWakeLock();
                showNotification('GPS 자동 기록이 활성화되었습니다. 이동시간 기록 모드에서 동작합니다.', 'success');
                App.render(); // UI 업데이트
            } catch (error) {
                let errorMsg = '위치 정보 접근 권한이 필요합니다.';
                if (error.message === 'denied' || (error.code && error.code === 1)) {
                    errorMsg = '위치 정보 접근 권한이 차단되어 있습니다. 브라우저 주소창의 자물쇠 아이콘을 눌러 위치 권한을 허용해주세요.';
                }
                showNotification(errorMsg, 'error', 5000);
                
                App.state.isGpsAutoRecordEnabled = false;
                App.services.storage.saveGpsAutoRecordEnabled(false);
                App.render(); // 상태에 따라 UI가 올바르게 업데이트되도록 렌더링
            }
        } else {
            App.services.geolocation.stopWatching();
            App.state.gpsWatcherId = null;
            App.state.isGpsAutoRecordEnabled = false;
            App.services.storage.saveGpsAutoRecordEnabled(false);
            App.releaseWakeLock();
            
            // 스케줄 화면의 플로팅 버튼 상태 동기화
            const floatingCheckbox = document.getElementById('floating-gps-toggle');
            if (floatingCheckbox) {
                floatingCheckbox.checked = false;
            }
            showNotification('GPS 자동 기록이 비활성화되었습니다.', 'info');
            App.render(); // UI 업데이트
        }
    },

    // 출발 시 자동 문자 발송 토글
    toggleAutoSmsOnDeparture(e, target) {
        const isEnabled = target.checked;
        App.state.isAutoSmsOnDepartureEnabled = isEnabled;
        App.services.storage.saveAutoSmsOnDepartureEnabled(isEnabled);
        showNotification(`출발 시 자동 문자 발송 기능이 ${isEnabled ? '활성화' : '비활성화'}되었습니다.`, 'info');
    },

    // GPS 위치 업데이트 처리
    handleGpsUpdate(position) {
        if (!App.state.isGpsAutoRecordEnabled || App.state.activeCorrectionCourseId === null) {
            return;
        }

        // GPS 정확도 체크 (150m 이상 오차 시 무시하여 신뢰도 확보)
        const accuracy = position.coords?.accuracy || 0;
        if (accuracy > 150) {
            console.warn(`[GPS] 낮은 정확도(${Math.round(accuracy)}m)로 인해 위치 업데이트를 무시합니다.`);
            return;
        }

        const { latitude, longitude } = position.coords;
        const courseId = App.state.activeCorrectionCourseId;
        
        if (courseId === null) return;
        const state = App.state.correctionStatesByCourse[courseId];

        if (!state) return;

        // 마지막 액션 시간 기록용 상태 초기화
        if (!App.state.lastActionTime) {
            App.state.lastActionTime = {};
        }

        // 현재 코스의 모든 경유지(공장 포함) 가져오기
        const rotation = App.getters.getRotationsForDay().find(r => r.course.id === courseId);
        if (!rotation) return;

        // 감시 대상: 아산공장 + 코스 내 모든 대리점
        const allLocations = [
            App.calculations.ASAN_FACTORY,
            ...rotation.stops.map(s => App.state.cache.agenciesMap.get(s.agencyId)).filter(Boolean)
        ];

        allLocations.forEach(location => {
            if (!location.latitude || !location.longitude) return;

            // [Reliability] 기본 인식 반경을 50m로 확대하고 이탈 반경에 여유를 둠 (Hysteresis)
            const entryRadius = location.geofenceRadius || 50; 
            const exitRadius = entryRadius * 1.5; 

            const distance = App.services.geolocation.calculateDistance(
                latitude, longitude, location.latitude, location.longitude
            );

            const previousStatus = App.state.geofenceStatus[location.id] || 'outside';
            let currentStatus = previousStatus;

            // 상태 결정: 진입은 entryRadius 기준, 이탈은 exitRadius 기준으로 판단하여 Jitter 방지
            if (previousStatus === 'outside' && distance <= entryRadius) {
                currentStatus = 'inside';
            } else if (previousStatus === 'inside' && distance > exitRadius) {
                currentStatus = 'outside';
            }

            const mockTarget = { dataset: { locationId: location.id, courseId: courseId } };
            
            // 쿨다운 타임 설정 (밀리초)
            const ARRIVAL_COOLDOWN = 180 * 1000; // 출발 후 3분간 재도착 금지
            const DEPARTURE_COOLDOWN = 180 * 1000; // 도착 후 3분간 출발 금지
            const now = Date.now();
            const lastAction = App.state.lastActionTime[location.id] || { time: 0, type: '' };

            // 지오펜스 진입 (도착)
            if (currentStatus === 'inside' && previousStatus === 'outside') {
                
                // 쿨다운 체크: 방금 출발했으면 다시 도착 찍지 않음
                if (lastAction.type === 'depart' && (now - lastAction.time < ARRIVAL_COOLDOWN)) {
                    return;
                }

                // 1. 현재 '도착' 대기 중일 때 (순서 무관하게 처리)
                if (state.currentStep.type === 'arrive') {
                    // 예상된 장소가 아니더라도 현재 위치로 목표 수정
                    if (state.currentStep.locationId !== location.id) {
                        state.currentStep.locationId = location.id;
                        showNotification(`GPS: 순서 변경됨 - '${location.name}' 도착`, 'info');
                    }
                    
                    showNotification(`GPS: '${location.name}' 도착 자동 기록`, 'success');
                    this.correctionArrive(null, mockTarget);
                    App.state.lastActionTime[location.id] = { time: now, type: 'arrive' };
                }
                // 2. '출발' 대기 중인데 다른 장소에 도착했을 때 (이전 출발 누락)
                else if (state.currentStep.type === 'depart' && state.currentStep.locationId !== location.id) {
                    state.currentStep = { type: 'arrive', locationId: location.id };
                    showNotification(`GPS: 이전 출발 미감지 - '${location.name}' 도착 기록`, 'warning');
                    this.correctionArrive(null, mockTarget);
                    App.state.lastActionTime[location.id] = { time: now, type: 'arrive' };
                }

                // 상태 업데이트
                App.state.geofenceStatus[location.id] = currentStatus;
            } 
            // 지오펜스 이탈 (출발)
            else if (currentStatus === 'outside' && previousStatus === 'inside') {
                
                // 쿨다운 체크: 방금 도착했으면 바로 출발 찍지 않음 (GPS 튐 방지)
                if (lastAction.type === 'arrive' && (now - lastAction.time < DEPARTURE_COOLDOWN)) {
                    return;
                }

                // 현재 머물던 장소에서 나갈 때만 출발 처리
                if (state.currentStep.type === 'depart' && state.currentStep.locationId === location.id) {
                    showNotification(`GPS: '${location.name}' 출발 자동 기록`, 'success');
                    this.correctionDepart(null, mockTarget);
                    App.state.lastActionTime[location.id] = { time: now, type: 'depart' };
                }

                // 상태 업데이트
                App.state.geofenceStatus[location.id] = currentStatus;
            }
        });
    },

    // 자동 백업 실행 로직
    triggerAutoBackup(reason) {
        if (!App.state.isAutoBackupEnabled) return;

        const trigger = App.state.autoBackupTrigger;
        const today = App.utils.formatDate(new Date());

        let shouldBackup = false;
        switch (trigger) {
            case 'daily':
                if (reason === 'appInit') {
                    // 중복 실행 방지
                    if (isDailyBackupScheduled) return;

                    // App.state.lastAutoBackupDate는 앱 초기화 시점에 로드되므로, 상태값을 직접 사용합니다.
                    if (App.state.lastAutoBackupDate !== today) {
                        shouldBackup = true;
                        isDailyBackupScheduled = true; // 백업이 스케줄되었음을 표시
                        console.log('일일 자동 백업을 실행합니다.');
                    }
                }
                break;
            case 'onComplete':
                if (reason === 'completeSchedule') {
                    shouldBackup = true;
                    console.log('스케줄 완료 자동 백업을 실행합니다.');
                }
                break;
            case 'onSave':
                if (reason === 'saveSchedule') {
                    if (App.state.autoBackupTimer) clearTimeout(App.state.autoBackupTimer);
                    App.state.autoBackupTimer = setTimeout(() => {
                        console.log('스케줄 저장 자동 백업을 실행합니다.');
                        this._executeBackup(true);
                    }, 5000); // 5초 후 백업
                    // 'onSave' 트리거는 자체 타이머로 백업을 처리하므로, 여기서 함수를 종료합니다.
                    return;
                }
                break;
        }

        if (shouldBackup) {
            setTimeout(() => this._executeBackup(true), 500);
        }
    },

    // 데이터 백업
    async backupData() {
        const isCloudEnabled = App.state.isSupabaseEnabled && App.state.currentUser;
        
        if (isCloudEnabled) {
            // 로그인 사용자: 클라우드 백업
            await this._executeCloudBackup();
        } else {
            // 로그인하지 않은 사용자: 파일 다운로드 방식
            this._executeBackup(false);
        }
    },

    async _executeCloudBackup() {
        App.showLoadingOverlay('클라우드 백업 중...');
        try {
            
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();
            
            // 활성 개정 확인
            let activeRevision = await supabaseStorage.getActiveRevision();
            if (!activeRevision) {
                console.log('활성 개정이 없어서 기존 개정을 확인합니다.');
                // 기존 개정 목록 확인
                const revisions = await supabaseStorage.loadRevisions();
                if (revisions.length > 0) {
                    // 기존 개정이 있으면 가장 최신 개정을 활성화
                    const latestRevision = revisions[0]; // 이미 내림차순 정렬됨
                    await supabaseStorage.setActiveRevision(latestRevision.id);
                    activeRevision = latestRevision;
                    console.log('✅ 기존 개정을 활성화했습니다:', latestRevision.name);
                } else {
                    // 기존 개정이 없으면 새 개정 생성
                    const revision = await supabaseStorage.createRevision('백업', '클라우드 백업');
                    if (revision) {
                        await supabaseStorage.setActiveRevision(revision.id);
                        activeRevision = revision;
                        console.log('✅ 새 백업 개정이 생성되었습니다:', revision.name);
                    } else {
                        showNotification('활성 개정 생성에 실패했습니다.', 'error');
                        return;
                    }
                }
            }

            let savedCount = 0;

            // 스케줄 데이터 저장
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('schedule_')) {
                    const date = key.replace('schedule_', '');
                    const scheduleData = localStorage.getItem(key);
                    if (scheduleData) {
                        const { error } = await supabaseStorage.saveSchedule(date, JSON.parse(scheduleData));
                        if (!error) {
                            savedCount++;
                        }
                    }
                }
            }

            // 기타 데이터 (대리점, 코스, 기사 등)
            const agencies = App.services.storage.loadAgencies();
            if (agencies && agencies.length > 0) {
                await supabaseStorage.saveAgencies(agencies);
            }

            const courses = App.services.storage.loadCourses();
            if (courses && courses.length > 0) {
                await supabaseStorage.saveCourses(courses);
            }

            const drivers = App.services.storage.loadDrivers();
            if (drivers && drivers.length > 0) {
                await supabaseStorage.saveDrivers(drivers);
            }

            const vehicleLog = App.services.storage.loadVehicleLog();
            if (vehicleLog) {
                await supabaseStorage.saveVehicleLog(vehicleLog);
            }

            // 설정 데이터 저장
            const settingsToSave = {
                columnWidths: App.state.columnWidths,
                showMessageArrivalTime: App.state.showMessageArrivalTime,
                preferredNavApp: App.state.preferredNavApp,
                driverName: App.state.driverName,
                messageFontSize: App.state.messageFontSize,
                googleMapsApiKey: App.state.googleMapsApiKey,
                globalFontSize: App.state.globalFontSize,
                isAutoSmsOnDepartureEnabled: App.state.isAutoSmsOnDepartureEnabled,
                isAutoBackupEnabled: App.state.isAutoBackupEnabled,
                autoBackupTrigger: App.state.autoBackupTrigger,
                lastAutoBackupDate: App.state.lastAutoBackupDate,
                theme: App.state.theme,
                travelTimes: App.services.storage.loadTravelTimes(),
                alwaysSendSms: App.services.storage.getAlwaysSendSms(),
                isGpsAutoRecordEnabled: App.state.isGpsAutoRecordEnabled
            };
            await supabaseStorage.saveSettings('app_settings', settingsToSave);

            showNotification(`클라우드 백업 완료! (${savedCount}개 스케줄)`, 'success');
        } catch (error) {
            console.error('클라우드 백업 오류:', error);
            showNotification('클라우드 백업 중 오류가 발생했습니다.', 'error');
        } finally {
            App.hideLoadingOverlay();
        }
    },

    async _executeBackup(isAuto = false) {
        console.log(`[Backup] _executeBackup called. isAuto: ${isAuto}`);
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('logistics_') || key.startsWith('schedule_')) {
                data[key] = localStorage.getItem(key);
            }
        }
        console.log(`[Backup] Data collected. Keys found: ${Object.keys(data).length}`);
        const today = new Date().toISOString().slice(0, 10);
        const fileName = `배송스케줄러_백업_${today}${isAuto ? '_자동' : ''}.json`;
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });

        console.log(`[Backup] File name: ${fileName}, Blob size: ${blob.size} bytes`);

        // 수동 백업이고 공유 기능(Web Share API)을 지원하는 경우 (주로 모바일)
        if (!isAuto && navigator.canShare && navigator.canShare({ files: [new File([blob], fileName, { type: 'application/json' })] })) {
            try {
                const file = new File([blob], fileName, { type: 'application/json' });
                await navigator.share({
                    files: [file],
                    title: '배송스케줄러 데이터 백업',
                    text: `${today}자 전체 데이터 백업 파일입니다.`
                });
                console.log('[Backup] Web Share API successful.');
                showNotification('공유 창을 통해 백업을 완료했습니다.', 'success');
                return; // 공유 성공 시 아래 다운로드 로직 건너뜀
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('[Backup] Web Share API failed:', err);
                    console.error('공유 실패:', err);
                }
            }
        }

        // 기존 다운로드 방식 (공유 미지원 환경 또는 자동 백업 시)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        console.log('[Backup] Attempting a.click() for download...');
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('[Backup] Download initiated.');
        if (isAuto) {
            console.log(`자동 백업 완료: ${new Date().toLocaleString()}`);
            App.state.lastAutoBackupDate = today;
            App.services.storage.saveAutoBackupSettings({
                enabled: App.state.isAutoBackupEnabled,
                trigger: App.state.autoBackupTrigger,
                lastDate: today
            });
        } else {
            showNotification('모든 데이터가 백업되었습니다.', 'success');
        }
    },

    // 데이터 복원
    async restoreData() {
        const isCloudEnabled = App.state.isSupabaseEnabled && App.state.currentUser;
        
        if (isCloudEnabled) {
            // 로그인 사용자: 클라우드 복원
            await this._executeCloudRestore();
        } else {
            // 로그인하지 않은 사용자: 파일 업로드 방식
            const fileInput = document.getElementById('restore-file-input');
            if (fileInput) {
                fileInput.click();
            }
        }
    },

    async _executeCloudRestore() {
        if (!confirm('클라우드에서 데이터를 복원하시겠습니까?\n현재 로컬 데이터는 덮어씌워집니다.')) {
            return;
        }

        App.showLoadingOverlay('클라우드에서 데이터 복원 중...');
        try {

            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();

            // 활성 개정 확인
            let activeRevision = await supabaseStorage.getActiveRevision();
            if (!activeRevision) {
                console.log('활성 개정이 없어서 기존 개정을 확인합니다.');
                // 기존 개정 목록 확인
                const revisions = await supabaseStorage.loadRevisions();
                if (revisions.length > 0) {
                    // 기존 개정이 있으면 가장 최신 개정을 활성화
                    const latestRevision = revisions[0]; // 이미 내림차순 정렬됨
                    await supabaseStorage.setActiveRevision(latestRevision.id);
                    activeRevision = latestRevision;
                    console.log('✅ 기존 개정을 활성화했습니다:', latestRevision.name);
                } else {
                    // 활성 개정이 없으면 복원 불가
                    showNotification('복원할 활성 개정이 없습니다. 먼저 클라우드 백업을 실행하세요.', 'error');
                    return;
                }
            }

            // Supabase에서 기본 데이터 로드 (대리점, 코스, 기사, 차계부, 설정)
            // 복원 시에는 모든 스케줄 데이터를 강제로 로드
            await App.loadFromSupabase(true);

            // 현재 선택된 날짜의 스케줄 다시 로드
            if (App.state.selectedDate) {
                App.loadScheduleForDate(App.state.selectedDate);
                console.log('✅ 현재 날짜 스케줄 로드 완료:', App.state.selectedDate);
            }

            // 히스토리 다시 로드
            App.loadHistory();
            console.log('✅ 히스토리 로드 완료');

            showNotification('클라우드 복원 완료! 페이지를 새로고침합니다.', 'success');
            App.render();

            // 페이지 새로고침하여 모든 데이터가 완전히 로드되도록 함
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            console.error('클라우드 복원 오류:', error);
            showNotification('클라우드 복원 중 오류가 발생했습니다.', 'error');
        } finally {
            App.hideLoadingOverlay();
        }
    },

    // 데이터 복원 취소
    cancelRestore() {
        App.state.showRestoreModal = false;
        App.state.fileToRestore = null;
        App.render();
    },

    // 데이터 복원 실행
    confirmRestore() {
        const file = App.state.fileToRestore;
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);

                // 기존 데이터 삭제 (logistics_ 또는 schedule_ 로 시작하는 키)
                Object.keys(localStorage)
                    .filter(key => key.startsWith('logistics_') || key.startsWith('schedule_'))
                    .forEach(key => localStorage.removeItem(key));
                
                // 중첩된 형식 { settings, schedules } 또는 플랫 형식 확인
                if (data.settings || data.schedules) {
                    console.log('복원: 중첩된 백업 파일 형식 감지됨.');

                    if (data.settings) {
                        // 설정 복원 (더 간결하게)
                        const settingsMap = {
                            agencies: 'saveAgencies', courses: 'saveCourses', drivers: 'saveDrivers',
                            travelTimes: 'saveTravelTimes', columnWidths: 'saveColumnWidths',
                            showMessageArrivalTime: 'saveShowMessageArrivalTime', preferredNavApp: 'savePreferredNavApp',
                            driverName: 'saveDriverName', messageFontSize: 'saveMessageFontSize',
                            globalFontSize: 'saveGlobalFontSize', theme: 'saveTheme', vehicleLog: 'saveVehicleLog'
                        };
                        for (const key in data.settings) {
                            if (settingsMap[key] && data.settings[key] !== undefined) {
                                let valueToSave = data.settings[key];
                                if (key === 'messageFontSize' || key === 'globalFontSize') valueToSave = valueToSave.toString();
                                App.services.storage[settingsMap[key]](valueToSave);
                            }
                        }
                    }

                    // 스케줄(히스토리) 복원
                    if (data.schedules) {
                        for (const key in data.schedules) {
                            if (key.startsWith('schedule_')) {
                                const date = key.substring('schedule_'.length);
                                const scheduleData = data.schedules[key];
                                App.services.storage.saveSchedule(date, scheduleData);
                            }
                        }
                    }
                } else { // 플랫 형식 처리
                    console.log('복원: 플랫 백업 파일 형식 감지됨.');
                    Object.keys(data).forEach(key => {
                        if (key.startsWith('logistics_') || key.startsWith('schedule_')) {
                            // logistics_vehicleLog는 이미 JSON 문자열이므로 그대로 저장
                            // 다른 키들도 마찬가지로 백업 파일에 저장된 형태 그대로 복원
                            localStorage.setItem(key, data[key]);
                        }
                    });
                }

                showNotification('데이터가 성공적으로 복원되었습니다. 페이지를 새로고침합니다.', 'success');
                setTimeout(() => window.location.reload(), 2000);

            } catch (err) {
                console.error('데이터 복원 실패:', err);
                showNotification('파일을 읽는 중 오류가 발생했습니다. 파일 형식이 올바른지 확인하세요.', 'error');
            }
        };
        reader.readAsText(file);
    },

    // 과거 스케줄 보기
    viewPast(e, target) {
        const date = target.dataset.date;
        if (date) {
            App.state.viewMode = 'schedule';
            App.selectDateAndLoad(date);
        }
    },

    // 과거 스케줄 불러오기 요청 (모달 열기)
    loadPast(e, target) {
        const date = target.dataset.date;
        if (date) {
            App.state.dateToLoad = date;
            App.state.showLoadScheduleModal = true;
            App.render();
        }
    },

    // 스케줄 불러오기 취소
    cancelLoadSchedule() {
        this.closeAllModals();
    },

    // 스케줄 불러오기 확인
    confirmLoadSchedule() {
        const dateToLoad = App.state.dateToLoad;
        const currentSelectedDate = App.state.selectedDate;

        if (dateToLoad && currentSelectedDate) {
            const pastSchedule = App.services.storage.loadScheduleForDate(dateToLoad);
            if (pastSchedule) {
                App.services.storage.saveSchedule(currentSelectedDate, pastSchedule);
                showNotification(`'${dateToLoad}' 스케줄을 현재 날짜로 불러왔습니다.`, 'success');
                this.closeAllModals();
                // 스케줄 화면으로 자동 전환하여 불러온 데이터 확인
                App.state.viewMode = 'schedule';
                App.selectDateAndLoad(currentSelectedDate); // 화면 새로고침
            }
        }
    },

    // 히스토리 삭제 요청 (모달 열기)
    requestDeleteHistory(e, target) {
        const date = target.dataset.date;
        if (date) {
            App.state.historyDateToDelete = date;
            App.state.showDeleteHistoryModal = true;
            App.render();
        }
    },

    // 히스토리 삭제 취소
    cancelDeleteHistory() {
        this.closeAllModals();
    },

    // 히스토리 삭제 확인
    confirmDeleteHistory() {
        const dateToDelete = App.state.historyDateToDelete;
        if (!dateToDelete) return;

        App.services.storage.deleteSchedule(dateToDelete);
        App.loadHistory(); // 히스토리 목록 새로고침
        showNotification(`'${dateToDelete}' 스케줄 기록이 삭제되었습니다.`, 'success');
        this.closeAllModals();
    },

    // 차계부 주행거리 기록 추가
    async addMileageRecord(e, target) {
        const form = target.closest('form');
        const date = form.querySelector('#mileage-date').value;
        const valueStr = form.querySelector('#mileage-value').value;
        const fuelAmountStr = form.querySelector('#mileage-fuel-amount')?.value;
        const fuelCostStr = form.querySelector('#mileage-fuel-cost')?.value;

        if (!date || !valueStr) {
            showNotification('날짜와 주행거리를 모두 입력하세요.', 'error');
            return;
        }

        const value = parseInt(valueStr, 10);
        if (isNaN(value)) {
            showNotification('주행거리는 숫자만 입력 가능합니다.', 'error');
            return;
        }

        const fuelAmount = (fuelAmountStr && fuelAmountStr.trim() !== '') ? parseFloat(fuelAmountStr) : null;
        const fuelCost = (fuelCostStr && fuelCostStr.trim() !== '') ? parseInt(fuelCostStr, 10) : null;

        App.state.vehicleLog.mileage.push({
            id: Date.now(),
            date,
            value: value,
            fuelAmount: isNaN(fuelAmount) ? null : fuelAmount,
            fuelCost: isNaN(fuelCost) ? null : fuelCost
        });
        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('주행거리가 기록되었습니다.', 'success');
        App.render();
    },

    // 차계부 주행거리 기록 수정 시작
    startEditMileageRecord(e, target) {
        const recordId = parseInt(target.dataset.id, 10);
        const record = App.state.vehicleLog.mileage.find(r => r.id === recordId);
        if (record) {
            App.state.editingMileageId = recordId;
            App.state.editingMileageData = { ...record };
            App.render();
        }
    },

    // 차계부 주행거리 기록 수정 취소
    cancelEditMileageRecord() {
        App.state.editingMileageId = null;
        App.state.editingMileageData = null;
        App.render();
    },

    // 차계부 주행거리 기록 저장
    async saveMileageRecord() {
        const data = App.state.editingMileageData;
        if (!data) return;

        const value = parseInt(data.value, 10);
        if (!data.date || isNaN(value)) {
            showNotification('날짜와 주행거리를 모두 입력하세요.', 'error');
            return;
        }

        const index = App.state.vehicleLog.mileage.findIndex(r => r.id === App.state.editingMileageId);
        if (index !== -1) {
            const fuelAmount = (data.fuelAmount && String(data.fuelAmount).trim() !== '') ? parseFloat(data.fuelAmount) : null;
            const fuelCost = (data.fuelCost && String(data.fuelCost).trim() !== '') ? parseInt(data.fuelCost, 10) : null;

            App.state.vehicleLog.mileage[index] = {
                ...App.state.vehicleLog.mileage[index],
                date: data.date,
                value: value,
                fuelAmount: isNaN(fuelAmount) ? null : fuelAmount,
                fuelCost: isNaN(fuelCost) ? null : fuelCost
            };

            App.services.storage.saveVehicleLog(App.state.vehicleLog);

            // Supabase에도 저장
            if (App.state.isSupabaseEnabled) {
                await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
            }

            showNotification('주행거리 기록이 수정되었습니다.', 'success');
            this.cancelEditMileageRecord();
        }
    },

    // 차계부 주행거리 기록 삭제
    async deleteMileage(e, target) {
        const recordId = parseInt(target.dataset.id, 10);
        App.state.vehicleLog.mileage = App.state.vehicleLog.mileage.filter(r => r.id !== recordId);
        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('주행거리 기록이 삭제되었습니다.', 'success');
        App.render();
    },

    // 차계부 정비 기록 추가
    async addMaintenanceRecord(e, target) {
        const form = target.closest('form');
        const date = form.querySelector('#maint-date').value;
        const itemSelect = form.querySelector('#maint-item-select');
        let item = itemSelect.value;
        if (item === '기타') {
            const otherItemInput = form.querySelector('#maint-item-other');
            item = otherItemInput.value.trim();
        }

        const cost = form.querySelector('#maint-cost').value;
        const mileage = form.querySelector('#maint-mileage').value;
        const notes = form.querySelector('#maint-notes').value;

        if (!date || !item.trim()) {
            showNotification('날짜와 정비 항목은 필수입니다.', 'error');
            return;
        }

        App.state.vehicleLog.maintenance.push({
            id: Date.now(),
            date,
            item,
            cost: cost ? parseInt(cost) : null,
            mileage: mileage ? parseInt(mileage) : null,
            notes
        });
        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('정비 내역이 추가되었습니다.', 'success');
        App.render();
    },

    // 차계부 정비 기록 수정 시작
    startEditMaintenanceRecord(e, target) {
        const recordId = parseInt(target.dataset.id, 10);
        const record = App.state.vehicleLog.maintenance.find(r => r.id === recordId);
        if (record) {
            App.state.editingMaintenanceId = recordId;
            App.state.editingMaintenanceData = { ...record };
            App.render();
        }
    },

    // 차계부 정비 기록 수정 취소
    cancelEditMaintenanceRecord() {
        App.state.editingMaintenanceId = null;
        App.state.editingMaintenanceData = null;
        App.render();
    },

    // 차계부 정비 기록 저장
    async saveMaintenanceRecord(e, target) {
        const data = App.state.editingMaintenanceData;
        if (!data) return;

        // Validate
        if (!data.date || !data.item?.trim()) {
            showNotification('날짜와 정비 항목은 필수입니다.', 'error');
            return;
        }

        const cost = (data.cost && String(data.cost).trim() !== '') ? parseInt(data.cost, 10) : null;
        const mileage = (data.mileage && String(data.mileage).trim() !== '') ? parseInt(data.mileage, 10) : null;

        // Coerce types
        const updatedRecord = {
            ...data,
            item: data.item.trim(),
            cost: isNaN(cost) ? null : cost,
            mileage: isNaN(mileage) ? null : mileage,
            notes: data.notes || ''
        };

        const index = App.state.vehicleLog.maintenance.findIndex(r => r.id === App.state.editingMaintenanceId);
        if (index !== -1) {
            App.state.vehicleLog.maintenance[index] = updatedRecord;
            App.services.storage.saveVehicleLog(App.state.vehicleLog);

            // Supabase에도 저장
            if (App.state.isSupabaseEnabled) {
                await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
            }

            showNotification('정비 기록이 수정되었습니다.', 'success');
            this.cancelEditMaintenanceRecord();
        }
    },

    // 차계부 정비 기록 삭제
    async deleteMaintenance(e, target) {
        const recordId = parseInt(target.dataset.id, 10);
        App.state.vehicleLog.maintenance = App.state.vehicleLog.maintenance.filter(r => r.id !== recordId);
        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('정비 기록이 삭제되었습니다.', 'success');
        App.render();
    },

    // 차계부 정비 주기 설정 저장
    async saveMaintenanceIntervals(e, target) {
        const form = target.closest('form');
        const formData = new FormData(form);
        const newIntervals = {};

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('interval-km-')) {
                const item = key.replace('interval-km-', '');
                if (!newIntervals[item]) newIntervals[item] = {};
                newIntervals[item].km = parseInt(value, 10) || 0;
            } else if (key.startsWith('interval-months-')) {
                const item = key.replace('interval-months-', '');
                if (!newIntervals[item]) newIntervals[item] = {};
                newIntervals[item].months = parseInt(value, 10) || 0;
            }
        }

        App.state.vehicleLog.settings.maintenanceIntervals = newIntervals;
        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('정비 주기가 저장되었습니다.', 'success');
        App.render();
    },

    // 정비 항목 추가 (사용자 정의)
    async addMaintenanceCategory() {
        const name = prompt("새로운 정비 항목의 이름을 입력해주세요:");
        if (!name || !name.trim()) return;

        const categoryName = name.trim();

        // 중복 확인
        if (App.state.maintenanceCategories.includes(categoryName)) {
            showNotification("이미 존재하는 항목입니다.", 'warning');
            return;
        }

        const intervalInput = prompt(`'${categoryName}' 항목의 정비 주기(km)를 입력해주세요 (숫자만 입력):`, "10000");
        if (intervalInput === null) return; // 취소 시 중단

        const monthInput = prompt(`'${categoryName}' 항목의 정비 기간(개월)을 입력해주세요 (숫자만 입력):`, "12");
        if (monthInput === null) return;

        const kmValue = parseInt(intervalInput, 10);
        const monthValue = parseInt(monthInput, 10);

        // customCategories 초기화 확인
        if (!App.state.vehicleLog.settings.customCategories) {
            App.state.vehicleLog.settings.customCategories = [];
        }

        // 추가
        App.state.vehicleLog.settings.customCategories.push(categoryName);

        // 정비 주기 설정 반영
        App.state.vehicleLog.settings.maintenanceIntervals[categoryName] = {
            km: isNaN(kmValue) ? 0 : kmValue,
            months: isNaN(monthValue) ? 0 : monthValue
        };

        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        // maintenanceCategories 다시 계산
        const { DEFAULT_MAINTENANCE_CATEGORIES } = await import('../state.js');
        const deletedDefaults = App.state.vehicleLog.settings.deletedDefaultCategories || [];
        const availableDefaults = DEFAULT_MAINTENANCE_CATEGORIES.filter(c => !deletedDefaults.includes(c));
        const uniqueCustom = App.state.vehicleLog.settings.customCategories.filter(c => !DEFAULT_MAINTENANCE_CATEGORIES.includes(c));
        App.state.maintenanceCategories = [...availableDefaults, ...uniqueCustom, '기타'];

        showNotification('정비 항목이 추가되었습니다.', 'success');
        App.render();
    },

    // 정비 항목 삭제
    async deleteMaintenanceCategory(e, target) {
        const category = target.dataset.category;
        if (!category) return;

        if (!confirm(`'${category}' 항목을 삭제하시겠습니까?`)) {
            return;
        }

        const { DEFAULT_MAINTENANCE_CATEGORIES } = await import('../state.js');

        // deletedDefaultCategories 초기화
        if (!App.state.vehicleLog.settings.deletedDefaultCategories) {
            App.state.vehicleLog.settings.deletedDefaultCategories = [];
        }

        // 기본 항목인지 확인
        if (DEFAULT_MAINTENANCE_CATEGORIES.includes(category)) {
            // 기본 항목이면 deletedDefaultCategories에 추가
            if (!App.state.vehicleLog.settings.deletedDefaultCategories.includes(category)) {
                App.state.vehicleLog.settings.deletedDefaultCategories.push(category);
            }
        } else {
            // 사용자 정의 항목이면 customCategories에서 제거
            if (App.state.vehicleLog.settings.customCategories) {
                App.state.vehicleLog.settings.customCategories = App.state.vehicleLog.settings.customCategories.filter(c => c !== category);
            }
        }

        // 정비 주기 설정에서 제거
        delete App.state.vehicleLog.settings.maintenanceIntervals[category];

        // maintenanceCategories 다시 계산
        const deletedDefaults = App.state.vehicleLog.settings.deletedDefaultCategories || [];
        const availableDefaults = DEFAULT_MAINTENANCE_CATEGORIES.filter(c => !deletedDefaults.includes(c));
        const uniqueCustom = App.state.vehicleLog.settings.customCategories.filter(c => !DEFAULT_MAINTENANCE_CATEGORIES.includes(c));
        App.state.maintenanceCategories = [...availableDefaults, ...uniqueCustom, '기타'];

        App.services.storage.saveVehicleLog(App.state.vehicleLog);

        // Supabase에도 저장
        if (App.state.isSupabaseEnabled) {
            await App.services.supabaseStorage.saveVehicleLog(App.state.vehicleLog);
        }

        showNotification('정비 항목이 삭제되었습니다.', 'success');
        App.render();
    },

    // 차계부 정비 기록 필터 변경
    changeMaintenanceFilter(e, target) {
        App.state.selectedMaintenanceFilter = target.value;
        App.render();
    },

    // 정비 주기 설정 섹션 접기/펼치기
    toggleMaintenanceIntervals() {
        App.state.isMaintenanceIntervalsCollapsed = !App.state.isMaintenanceIntervalsCollapsed;
        App.render();
    },


    // 스케줄 수정 잠금 (완료 처리)
    completeSchedule() {
        App.state.showCompleteScheduleModal = true;
        App.render();
    },

    // 스케줄 완료 확인
    confirmCompleteSchedule() {
        App.state.isCompleted = true;
        App.state.isEditingLocked = true;
        App.saveSchedule(); // 현재 상태 저장
        this.closeAllModals();
        showNotification('스케줄이 완료 처리되어 잠금 상태로 변경되었습니다.', 'success');
        this.triggerAutoBackup('completeSchedule');
    },

    // 스케줄 완료 취소
    cancelCompleteSchedule() {
        this.closeAllModals();
    },

    // 스케줄 다시 열기
    reopenSchedule() {
        // 1. Modify state
        App.state.isCompleted = false;

        const courseIdsInSchedule = [...new Set(App.state.editableStops.map(s => s.courseId))];
        courseIdsInSchedule.forEach(courseId => {
            if (App.state.courseCompletionStatus[courseId]) {
                App.state.courseCompletionStatus[courseId] = false;
            }
        });
        
        // 2. Save the modified state
        App.saveSchedule();

        // 3. Reload and re-render
        App.selectDateAndLoad(App.state.selectedDate); 

        showNotification('스케줄을 다시 열었습니다.', 'info');
    },

    // 길안내 모달 열기
    getDirections(e, target) {
        const stopId = parseFloat(target.closest('.schedule-row').dataset.stopId);
        const stop = App.state.editableStops.find(s => s.id === stopId);
        const agency = stop ? App.state.cache.agenciesMap.get(stop.agencyId) : null;

        if (agency && (agency.address || (agency.latitude && agency.longitude))) {
            const directionsInfo = {
                destinationName: agency.name,
                destinationAddress: agency.address,
                destinationLat: agency.latitude,
                destinationLon: agency.longitude
            };
            this._handleDirections(directionsInfo);
        }
    },

    // 공장 길안내
    getFactoryDirections() {
        const factory = App.calculations.ASAN_FACTORY;
        if (factory && (factory.address || (factory.latitude && factory.longitude))) {
            const directionsInfo = {
                destinationName: factory.name,
                destinationAddress: factory.address,
                destinationLat: factory.latitude,
                destinationLon: factory.longitude
            };
            this._handleDirections(directionsInfo);
        }
    },

    // 길안내 처리 헬퍼
    _handleDirections(directionsInfo) {
        App.state.directionsInfo = directionsInfo;
        const preferredApp = App.state.preferredNavApp;

        if (preferredApp) {
            switch (preferredApp) {
                case 'kakao-navi': return this.openKakaoNavi();
                case 'naver-map':  return this.openNaverMap();
                case 'tmap':       return this.openTmap();
                case 'atlan':      return this.openAtlan();
            }
        }

        // 선호 앱이 없으면 모달 표시
        App.state.showDirectionsModal = true;
        App.render();
    },

    // 기본 앱 저장 헬퍼
    _savePreferredNavAppIfChecked(appName) {
        const checkbox = document.getElementById('always-use-nav-app');
        if (checkbox && checkbox.checked) {
            App.state.preferredNavApp = appName;
            App.services.storage.savePreferredNavApp(appName);
            
            const appNames = {
                'kakao-navi': '카카오내비',
                'naver-map': '네이버지도',
                'tmap': 'TMAP',
                'atlan': '아틀란'
            };
            showNotification(`기본 길안내 앱이 '${appNames[appName]}'(으)로 설정되었습니다.`, 'success');
        }
    },

    // 카카오내비 길안내 (카카오맵에서 변경)
    openKakaoNavi() {
        this._savePreferredNavAppIfChecked('kakao-navi');
        const { destinationName, destinationAddress, destinationLat, destinationLon } = App.state.directionsInfo;
        let url;
        if (destinationLat && destinationLon) {
            // Kakao Navi deep link for car route with destination coordinates
            url = `kakaonavi://navigate?coord_type=wgs84&x=${destinationLon}&y=${destinationLat}&rp=${encodeURIComponent(destinationName)}`;
        } else if (destinationAddress) {
            // Fallback for address only (Kakao Navi might search for the address using d_name)
            url = `kakaonavi://search?q=${encodeURIComponent(destinationAddress)}`;        }
        
        if (url) {
            window.location.href = url;
            this.closeAllModals();
        }
    },

    // 네이버지도 길안내
    openNaverMap() {
        this._savePreferredNavAppIfChecked('naver-map');
        const { destinationName, destinationAddress, destinationLat, destinationLon } = App.state.directionsInfo;
        let url;
        if (destinationLat && destinationLon) {
            url = `nmap://route/car?dlat=${destinationLat}&dlng=${destinationLon}&dname=${encodeURIComponent(destinationName)}&appname=배송스케줄러`;
        } else if (destinationAddress) {
            url = `nmap://search?query=${encodeURIComponent(destinationAddress)}&appname=배송스케줄러`;
        }
        
        if (url) {
            window.location.href = url;
            this.closeAllModals();
        }
    },

    // TMAP 길안내
    openTmap() {
        this._savePreferredNavAppIfChecked('tmap');
        const { destinationName, destinationAddress, destinationLat, destinationLon } = App.state.directionsInfo;
        let url;
        if (destinationLat && destinationLon) {
            url = `tmap://route?goalx=${destinationLon}&goaly=${destinationLat}&goalname=${encodeURIComponent(destinationName)}`;
        } else if (destinationAddress) {
            url = `tmap://search?name=${encodeURIComponent(destinationAddress)}`;
        }

        if (url) {
            window.location.href = url;
            this.closeAllModals();
        }
    },

    // 아틀란 길안내
    openAtlan() {
        this._savePreferredNavAppIfChecked('atlan');
        const { destinationName, destinationAddress, destinationLat, destinationLon } = App.state.directionsInfo;
        let url;
        if (destinationLat && destinationLon) {
            // Atlan deep link for car route with destination coordinates
            url = `atlan://navi?dest_name=${encodeURIComponent(destinationName)}&dest_lat=${destinationLat}&dest_lon=${destinationLon}`;
        } else if (destinationAddress) {
            // Fallback for address only
            url = `atlan://search?query=${encodeURIComponent(destinationAddress)}`;
        }
        
        if (url) {
            window.location.href = url;
            this.closeAllModals();
        }
    },
    
    // 전화걸기
    makeCall(e, target) {
        const stopId = parseFloat(target.closest('.schedule-row').dataset.stopId);
        const stop = App.state.editableStops.find(s => s.id === stopId);
        const agency = stop ? App.state.cache.agenciesMap.get(stop.agencyId) : null;

        if (agency && agency.phone) {
            window.open(`tel:${agency.phone}`);
        }
    },

    // 수정 잠금 해제 요청 (모달 열기)
    unlockEditing() {
        App.state.showConfirmationModal = true;
        App.render();
    },

    // 수정 잠금 해제 확인
    confirmUnlockEditing() {
        App.state.isEditingLocked = false;
        this.closeAllModals();
        App.render();
        showNotification('스케줄 수정 잠금이 해제되었습니다. 이제 편집할 수 있습니다.', 'success');
    },

    // 대리점 수정 모달 열기
    openAgencyEditModal(e, target) {
        const agencyId = parseInt(target.dataset.agencyId, 10);
        if (!agencyId) return;

        const agency = App.state.agencies.find(a => a.id === agencyId);
        if (agency) {
            App.state.agencyToEdit = JSON.parse(JSON.stringify(agency)); // Deep copy
            App.state.agencyEditModalSearchQuery = '';
            App.state.showAgencyEditModal = true;
            App.render();
        }
    },

    // 대리점 수정 모달 닫기
    closeAgencyEditModal() {
        App.state.showAgencyEditModal = false;
        App.state.agencyToEdit = null;
        App.render();
    },

    // 대리점 변경사항 저장
    saveAgencyChanges(e, target) {
        const modal = target.closest('.modal-overlay');
        if (!modal) return;

        const agencyData = App.state.agencyToEdit;
        if (!agencyData) return;

        const agencyIndex = App.state.agencies.findIndex(a => a.id === agencyData.id);
        if (agencyIndex === -1) return;

        const cleanedData = this._prepareAgencyData(agencyData);
        
        if (!cleanedData.name) {
            showNotification('대리점 이름은 필수 항목입니다.', 'error');
            return;
        }

        App.state.agencies[agencyIndex] = cleanedData;
        
        App.services.storage.saveAgencies(App.state.agencies);
        App.buildCache();
        
        showNotification(`'${cleanedData.name}' 정보가 수정되었습니다.`, 'success');
        
        this.closeAgencyEditModal();
        App.updaters.updateSchedule();
    },

    // 대리점 데이터 정제 헬퍼
    _prepareAgencyData(data) {
        const cleaned = { ...data };
        cleaned.name = (data.name || '').trim();
        cleaned.address = (data.address || '').trim();
        cleaned.phone = (data.phone || '').trim();
        cleaned.priority = parseInt(data.priority, 10) || 99;
        cleaned.latitude = data.latitude ? parseFloat(data.latitude) : null;
        cleaned.longitude = data.longitude ? parseFloat(data.longitude) : null;
        cleaned.geofenceRadius = parseInt(data.geofenceRadius, 10) || 20;

        // coursePriorities 정리
        const cleanPriorities = {};
        if (data.coursePriorities && typeof data.coursePriorities === 'object') {
            Object.entries(data.coursePriorities).forEach(([cId, prio]) => {
                const val = parseInt(prio, 10);
                if (!isNaN(val)) {
                    // cId가 'null' 문자열이거나 유효하지 않은 숫자면 'null' 키 사용, 아니면 숫자로 변환
                    const isUnassigned = cId === 'null' || cId === 'NaN' || cId === null;
                    const key = isUnassigned ? 'null' : parseInt(cId, 10);
                    if (key === 'null' || !isNaN(key)) {
                        cleanPriorities[key] = val;
                    }
                }
            });
        }
        cleaned.coursePriorities = cleanPriorities;
        return cleaned;
    },

    // 메모 모달 열기
    showMemo(e, target) {
        const stopId = parseFloat(target.closest('.schedule-row').dataset.stopId);
        const stop = App.state.editableStops.find(s => s.id === stopId);
        if (!stop || !stop.agencyId) return;

        const agency = App.state.cache.agenciesMap.get(stop.agencyId);
        if (agency) {
            this._openMemoModal('agency', agency);
        }
    },

    // 코스 메모 모달 열기
    showCourseMemo(e, target) {
        const courseId = parseInt(target.dataset.courseId, 10);
        const course = App.state.courses.find(c => c.id === courseId);
        if (course) {
            this._openMemoModal('course', course);
        }
    },

    // 메모 모달 열기 공통
    _openMemoModal(type, data) {
        // 사진 데이터 안전하게 복사 (참조 끊기)
        const currentPhotos = data.memoPhotos ? JSON.parse(JSON.stringify(data.memoPhotos)) : [];

        App.state.memoModalData = {
            type: type,
            targetId: data.id,
            agencyId: data.id, // 호환성 유지
            agencyName: data.name, // 호환성 유지 (제목 표시용)
            memo: data.memo,
            photos: currentPhotos,
            isEditing: false,
            editedMemoText: data.memo || '',
            editedPhotos: [...currentPhotos] // 편집용 복사본
        };
        App.state.showMemoModal = true;
        App.render();
    },

    // 메모 모달 닫기
    closeMemoModal() {
        App.state.showMemoModal = false;
        App.state.memoModalData = null;
        App.render();
    },

    // 메모 사진 추가
    addMemoPhoto(e, target) {
        if (!App.state.memoModalData || !target.files || target.files.length === 0) return;
        
        const file = target.files[0];
        // 원본 파일 용량 제한 (10MB) - 압축 전 너무 큰 파일 방지
        if (file.size > 10 * 1024 * 1024) {
            showNotification('10MB 이하의 사진만 첨부할 수 있습니다.', 'error');
            target.value = ''; // 입력 초기화
            return;
        }

        showNotification('사진을 압축 중입니다...', 'info', 1000);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 캔버스 생성 및 리사이징 (최대 1280px)
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1280;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 압축 (JPEG, 품질 0.7)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

                App.state.memoModalData.editedPhotos.push({
                    id: Date.now(),
                    data: dataUrl,
                    name: file.name
                });
                App.render();
                showNotification('사진이 첨부되었습니다.', 'success');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // 입력 초기화
        target.value = '';
    },

    // 메모 사진 삭제
    removeMemoPhoto(e, target) {
        const photoId = parseInt(target.dataset.photoId, 10);
        if (App.state.memoModalData) {
            App.state.memoModalData.editedPhotos = App.state.memoModalData.editedPhotos.filter(p => p.id !== photoId);
            App.render();
        }
    },

    // 메모 수정 시작
    startEditMemo() {
        if (App.state.memoModalData) {
            App.state.memoModalData.isEditing = true;
            App.render();
        }
    },

    // 메모 수정 취소
    cancelEditMemo() {
        if (App.state.memoModalData) {
            App.state.memoModalData.isEditing = false;
            App.state.memoModalData.editedMemoText = App.state.memoModalData.memo || '';
            App.state.memoModalData.editedPhotos = [...(App.state.memoModalData.photos || [])];
            App.render();
        }
    },

    // 수정 중인 메모 내용 업데이트
    updateEditedMemo(e, target) {
        if (App.state.memoModalData) {
            App.state.memoModalData.editedMemoText = target.value;
        }
    },

    // 메모 저장
    saveMemo() {
        const { type, targetId, agencyId, editedMemoText, editedPhotos } = App.state.memoModalData;

        if (type === 'course') {
            const courseIndex = App.state.courses.findIndex(c => c.id === targetId);
            if (courseIndex !== -1) {
                App.state.courses[courseIndex].memo = editedMemoText;
                App.state.courses[courseIndex].memoPhotos = [...editedPhotos];
                
                try {
                    App.services.storage.saveCourses(App.state.courses);
                    showNotification('코스 메모가 저장되었습니다.', 'success');
                } catch (error) {
                    console.error('코스 메모 저장 실패:', error);
                    showNotification('저장 중 오류가 발생했습니다.', 'error');
                }
                App.buildCache();
                App.updaters.updateSettingsContent();
            }
        } else {
            const id = targetId || agencyId;
            const agencyIndex = App.state.agencies.findIndex(a => a.id === id);

            if (agencyIndex !== -1) {
                App.state.agencies[agencyIndex].memo = editedMemoText;
                // 배열을 복사하여 저장 (참조 끊기)
                App.state.agencies[agencyIndex].memoPhotos = [...editedPhotos];
                
                try {
                    App.services.storage.saveAgencies(App.state.agencies);
                    showNotification('메모가 저장되었습니다.', 'success');
                } catch (error) {
                    console.error('메모 저장 실패:', error);
                    showNotification('저장 중 오류가 발생했습니다. (용량 초과 가능성)', 'error');
                }

                App.buildCache();
            }
        }
        
        App.updaters.updateSchedule();
        this.closeMemoModal();
    },

    // 이미지 뷰어 열기
    openImageViewer(e, target) {
        let src = null;

        // 1. data-src 속성이 있으면 최우선 사용 (원본 이미지 URL 등)
        if (target.dataset.src) {
            src = target.dataset.src;
        }
        // 2. 클릭된 요소 자체가 이미지인 경우
        else if (target.tagName === 'IMG' && target.src) {
            src = target.src;
        }
        // 3. 내부에서 이미지를 찾음
        else {
            const img = target.querySelector('img');
            if (img && img.src) {
                src = img.src;
            }
        }

        if (src) {
            App.state.imageViewerSrc = src;
            App.state.showImageViewerModal = true;
            App.render();
        }
    },

    // 이미지 뷰어 닫기
    closeImageViewer() {
        App.state.showImageViewerModal = false;
        App.state.imageViewerSrc = null;
        App.render();
    },

    // 히스토리 검색
    searchHistory(e, target) { // e, target 매개변수 추가 (버튼 클릭 시 target이 넘어옴)
        const input = document.getElementById('history-search-input');
        if (input) {
            App.state.historySearchQuery = input.value;
        }
        
        // 히스토리 검색 결과 즉시 반영
        if (App.state.viewMode === 'history') {
            App.render(); 
        }
    },

    // 히스토리 검색 초기화
    clearHistorySearch() {
        App.state.historySearchQuery = '';
        const input = document.getElementById('history-search-input');
        if (input) {
            input.value = '';
            input.focus();
        }
        App.render();
    },

    // 히스토리 월 필터
    filterHistoryByMonth(e, target) {
        const month = target.value;
        App.state.historySelectedMonth = month;
        if (App.state.viewMode === 'history') {
            App.render(); // 즉시 렌더링
        }
    },

    // 차계부 월 필터
    changeVehicleLogMonth(e, target) {
        App.state.selectedVehicleLogMonth = target.value;
        App.render();
    },

    // 차계부 전체 보기
    showAllVehicleLogRecords(e, target) {
        App.state.selectedVehicleLogMonth = 'all';
        App.render();
    },

    // 차계부 월 필터 모달 토글
    toggleVehicleLogMonthFilter(e, target) {
        App.state.showVehicleLogMonthFilterModal = !App.state.showVehicleLogMonthFilterModal;
        App.render();
    },

    // 차계부 월 필터 모달 닫기
    closeVehicleLogMonthFilterModal(e, target) {
        App.state.showVehicleLogMonthFilterModal = false;
        App.render();
    },

    // 차계부 년 선택기 모달 닫기
    closeVehicleLogYearPickerModal(e, target) {
        App.state.showVehicleLogYearPickerModal = false;
        App.render();
    },

    // 차계부 월 선택기 모달 닫기
    closeVehicleLogMonthPickerModal(e, target) {
        App.state.showVehicleLogMonthPickerModal = false;
        App.render();
    },

    // 차계부 특정 월 선택
    selectVehicleLogSpecificMonth(e, target) {
        const year = target.dataset.year;
        const month = target.dataset.month;
        App.state.selectedVehicleLogMonth = `${year}-${month}`;
        App.state.showVehicleLogMonthPickerModal = false;
        App.render();
    },

    // 차계부 이번 달 선택
    selectVehicleLogCurrentMonth(e, target) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        App.state.selectedVehicleLogMonth = `${year}-${month}`;
        App.state.showVehicleLogMonthFilterModal = false;
        App.render();
    },

    // 차계부 년 선택기 (년 직접 선택)
    selectVehicleLogYearPicker(e, target) {
        console.log('selectVehicleLogYearPicker called');
        // 모달을 년 선택 모드로 변경
        App.state.vehicleLogFilterMode = 'year-picker';
        App.state.showVehicleLogYearPickerModal = true;
        App.state.showVehicleLogMonthFilterModal = false;
        console.log('showVehicleLogYearPickerModal:', App.state.showVehicleLogYearPickerModal);
        App.render();
    },

    // 차계부 특정 년 선택
    selectVehicleLogSpecificYear(e, target) {
        const year = target.dataset.year;
        App.state.vehicleLogSelectedYear = parseInt(year);
        App.state.vehicleLogFilterMode = 'year';
        App.state.selectedVehicleLogMonth = `year-${year}`;
        App.state.showVehicleLogYearPickerModal = false;
        App.render();
    },

    // 차계부 년 선택 (현재 년도)
    selectVehicleLogYear(e, target) {
        const now = new Date();
        const year = now.getFullYear();
        // 년도만 선택한 경우 그 해의 모든 기록을 표시
        App.state.vehicleLogSelectedYear = year;
        App.state.vehicleLogFilterMode = 'year';
        App.state.showVehicleLogMonthFilterModal = false;
        // 년 필터로 표시되도록 state 수정
        App.state.selectedVehicleLogMonth = `year-${year}`;
        App.render();
    },

    // 차계부 월 선택기 (월 직접 선택)
    selectVehicleLogMonthPicker(e, target) {
        // 모달을 월 선택 모드로 변경
        App.state.vehicleLogFilterMode = 'month-picker';
        App.state.showVehicleLogMonthPickerModal = true;
        App.state.showVehicleLogMonthFilterModal = false;
        App.render();
    },

    // 차계부 전체 선택
    selectVehicleLogAll(e, target) {
        App.state.selectedVehicleLogMonth = 'all';
        App.state.showVehicleLogMonthFilterModal = false;
        App.render();
    },

    // 앱 업데이트 확인
    async checkForUpdate() {
        if (!('serviceWorker' in navigator)) {
            showNotification('이 브라우저는 앱 업데이트 기능을 지원하지 않습니다.', 'error');
            return;
        }

        if (!navigator.onLine) {
            showNotification('오프라인 상태에서는 업데이트를 확인할 수 없습니다.', 'warning');
            return;
        }

        try {
            showNotification('업데이트를 확인하는 중...', 'info');
            const updateInfo = await versionManager.checkForUpdates();

            if (updateInfo.hasUpdate) {
                versionManager.notifyUpdateAvailable(updateInfo);
            } else {
                showNotification('현재 최신 버전입니다.', 'success');
                App.state.showHardReloadModal = true; // 최신 버전이지만 강제 새로고침 옵션 제공
                App.debouncedRender();
            }

        } catch (error) {
            console.error('업데이트 확인 실패:', error);
            showNotification('업데이트 확인 중 오류가 발생했습니다.', 'error');
        }
    },

    // 앱 업데이트
    async updateApp() {
        if (!('serviceWorker' in navigator)) {
            showNotification('이 브라우저는 앱 업데이트 기능을 지원하지 않습니다.', 'error');
            return;
        }

        if (!navigator.onLine) {
            showNotification('오프라인 상태에서는 업데이트를 진행할 수 없습니다.', 'warning');
            return;
        }

        try {
            showNotification('업데이트 확인 중...', 'info');
            const updateInfo = await versionManager.checkForUpdates();

            if (updateInfo.hasUpdate) {
                // 새 버전이 있으면 업데이트 모달 표시
                versionManager.showUpdateModal(updateInfo);
            } else {
                // 최신 버전이면 강제 새로고침 모달 표시
                App.state.showHardReloadModal = true;
                App.render();
            }
        } catch (error) {
            console.error('업데이트 확인 실패:', error);
            showNotification('업데이트 확인 중 오류가 발생했습니다.', 'error');
        }
    },

    // 릴리즈 노트 보기
    showReleaseNotes() {
        // versionManager에서 가져온 릴리즈 노트를 사용
        App.state.releaseNotes = versionManager.versionHistory; // This will be the full history
        App.state.showReleaseNotesModal = true; 
        App.render(); 
    },

    // 릴리즈 노트 닫기
    closeReleaseNotesModal() {
        App.state.showReleaseNotesModal = false;
        App.render();
    },

    // 강제 새로고침 요청 (모달 열기)
    requestHardReload() {
        App.state.showHardReloadModal = true;
        App.render();
    },

    // 강제 새로고침 확인
    async confirmHardReload() {
        this.closeAllModals();
        showNotification('앱을 강제로 새로고침합니다...', 'info', 5000);
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                if (registrations) {
                    for (const registration of registrations) {
                        await registration.unregister();
                        console.log('Service Worker un-registered.');
                    }
                }
            }

            if (window.caches) {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
                console.log('All caches cleared.');
            }

            setTimeout(() => window.location.reload(), 500);

        } catch (error) {
            console.error('Hard reload failed:', error);
            showNotification('강제 새로고침에 실패했습니다. 수동으로 새로고침 해주세요.', 'error');
            setTimeout(() => window.location.reload(), 1000);
        }
    },

    // --- Supabase 클라우드 동기화 관련 액션 ---

    saveSupabaseConfig() {
        console.log('=== saveSupabaseConfig START ===');
        const url = document.getElementById('supabase-url')?.value.trim();
        const key = document.getElementById('supabase-anon-key')?.value.trim();

        console.log('URL:', url);
        console.log('Key:', key);
        console.log('App.services:', App.services);
        console.log('App.services.storage:', App.services?.storage);

        if (!url || !key) {
            console.log('URL or Key is empty');
            showNotification('Supabase URL과 Anon Key를 모두 입력해주세요.', 'warning');
            return;
        }

        App.state.supabaseUrl = url;
        App.state.supabaseAnonKey = key;
        
        if (App.services && App.services.storage && App.services.storage.saveSupabaseUrl && App.services.storage.saveSupabaseAnonKey) {
            console.log('Saving to storage...');
            App.services.storage.saveSupabaseUrl(url);
            App.services.storage.saveSupabaseAnonKey(key);
            showNotification('Supabase 설정이 저장되었습니다.', 'success');
            console.log('=== saveSupabaseConfig SUCCESS ===');
        } else {
            console.error('Storage service methods not available');
            showNotification('저장 실패: Storage service 오류', 'error');
            return;
        }
        
        App.render();
    },

    async testSupabaseConnection() {
        const url = document.getElementById('supabase-url')?.value.trim();
        const key = document.getElementById('supabase-anon-key')?.value.trim();

        if (!url || !key) {
            showNotification('Supabase URL과 Anon Key를 모두 입력해주세요.', 'warning');
            return;
        }

        showNotification('연결 테스트 중...', 'info');

        const initialized = initSupabase(url, key);
        if (!initialized || !isSupabaseConfigured()) {
            showNotification('Supabase 초기화에 실패했습니다.', 'error');
            return;
        }

        try {
            // 간단한 연결 테스트 (revisions 테이블 조회)
            const supabaseClient = window.supabaseClient;
            const { data, error } = await getSupabaseClient()
                .from('revisions')
                .select('count')
                .limit(1);

            if (error) {
                console.error('Supabase 연결 테스트 실패:', error);
                showNotification('연결 테스트 실패: ' + error.message, 'error');
            } else {
                showNotification('Supabase 연결 성공!', 'success');
            }
        } catch (error) {
            console.error('Supabase 연결 테스트 오류:', error);
            showNotification('연결 테스트 중 오류가 발생했습니다.', 'error');
        }
    },

    async toggleSupabase(e, target) {
        const isEnabled = target.checked;
        App.state.isSupabaseEnabled = isEnabled;
        App.services.storage.saveSupabaseEnabled(isEnabled);

        if (isEnabled) {
            // Supabase 활성화
            const initialized = Supabase.initSupabase(App.state.supabaseUrl, App.state.supabaseAnonKey);
            if (initialized) {
                showNotification('클라우드 동기화가 활성화되었습니다.', 'success');

                // 첫 번째 개정 자동 생성
                await this.createInitialRevision();

                // 기존 실시간 구독 해제 후 재설정
                App.cleanupRealtimeSync();
                // 실시간 동기화 구독 설정
                await App.setupRealtimeSync();
            } else {
                showNotification('Supabase 초기화에 실패했습니다. 설정을 확인해주세요.', 'error');
                App.state.isSupabaseEnabled = false;
                target.checked = false;
            }
        } else {
            showNotification('클라우드 동기화가 비활성화되었습니다.', 'info');
            // 실시간 구독 해제
            App.cleanupRealtimeSync();
        }

        App.render();
    },

    async createInitialRevision() {
        if (!Supabase.isSupabaseConfigured()) return;

        try {
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();

            // 활성 개정 확인
            const activeRevision = await supabaseStorage.getActiveRevision();
            if (!activeRevision) {
                console.log('활성 개정이 없어서 기존 개정을 확인합니다.');
                // 기존 개정 목록 확인
                const revisions = await supabaseStorage.loadRevisions();
                if (revisions.length > 0) {
                    // 기존 개정이 있으면 가장 최신 개정을 활성화
                    const latestRevision = revisions[0]; // 이미 내림차순 정렬됨
                    await supabaseStorage.setActiveRevision(latestRevision.id);
                    console.log('✅ 기존 개정을 활성화했습니다:', latestRevision.name);
                } else {
                    // 기존 개정이 없으면 새 개정 생성
                    const revision = await supabaseStorage.createRevision('기본 개정', '자동 생성된 기본 개정');
                    if (revision) {
                        await supabaseStorage.setActiveRevision(revision.id);
                        console.log('✅ 첫 번째 개정이 생성되었습니다:', revision);
                    }
                }
            }
        } catch (error) {
            console.error('개정 생성 실패:', error);
        }
    },

    async createNewRevision() {
        const name = prompt('새 개정 이름을 입력하세요:', '새 개정');
        if (!name) return;

        const description = prompt('설명을 입력하세요 (선택사항):', '') || '';

        try {
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();
            
            const revision = await supabaseStorage.createRevision(name, description);
            if (revision) {
                showNotification('새 개정이 생성되었습니다.', 'success');
                await this.loadRevisions();
            } else {
                showNotification('개정 생성에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('개정 생성 실패:', error);
            showNotification('개정 생성 중 오류가 발생했습니다.', 'error');
        }
    },

    async loadRevisions() {
        try {
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();
            
            const revisions = await supabaseStorage.loadRevisions();
            const activeRevision = await supabaseStorage.getActiveRevision();
            
            const revisionsList = document.getElementById('revisions-list');
            if (!revisionsList) return;

            if (revisions.length === 0) {
                revisionsList.innerHTML = '<p class="text-xs text-gray-500 dark:text-gray-400">개정이 없습니다.</p>';
                return;
            }

            revisionsList.innerHTML = revisions.map(rev => `
                <div class="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border ${rev.id === activeRevision?.id ? 'border-green-500' : 'border-gray-200 dark:border-gray-600'}">
                    <div class="flex-1">
                        <div class="text-sm font-medium ${rev.id === activeRevision?.id ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}">
                            ${rev.name}
                            ${rev.id === activeRevision?.id ? '(활성)' : ''}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${rev.description || '설명 없음'}</div>
                        <div class="text-xs text-gray-400 dark:text-gray-500">${new Date(rev.created_at).toLocaleString()}</div>
                    </div>
                    <div class="flex space-x-1">
                        ${rev.id !== activeRevision?.id ? `
                            <button data-action="activate-revision" data-revision-id="${rev.id}" class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600">활성화</button>
                        ` : ''}
                        <button data-action="delete-revision" data-revision-id="${rev.id}" class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">삭제</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('개정 목록 로드 실패:', error);
            showNotification('개정 목록 로드에 실패했습니다.', 'error');
        }
    },

    async activateRevision(e, target) {
        const revisionId = target.dataset.revisionId;
        if (!revisionId) return;

        try {
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();
            
            const success = await supabaseStorage.setActiveRevision(revisionId);
            if (success) {
                showNotification('개정이 활성화되었습니다.', 'success');
                await this.loadRevisions();
            } else {
                showNotification('개정 활성화에 실패했습니다.', 'error');
            }
        } catch (error) {
            console.error('개정 활성화 실패:', error);
            showNotification('개정 활성화 중 오류가 발생했습니다.', 'error');
        }
    },

    async deleteRevision(e, target) {
        const revisionId = target.dataset.revisionId;
        if (!revisionId) return;

        if (!confirm('정말로 이 개정을 삭제하시겠습니까? 관련 데이터도 모두 삭제됩니다.')) {
            return;
        }

        try {
            const { SupabaseStorageService } = await import('../services/supabase-storage-service.js');
            const supabaseStorage = new SupabaseStorageService();
            
            // SupabaseStorageService에 deleteRevision 메서드가 없으므로 직접 구현
            const supabase = Supabase.getSupabaseClient();
            const { error } = await supabase
                .from('revisions')
                .delete()
                .eq('id', revisionId);

            if (error) {
                console.error('개정 삭제 실패:', error);
                showNotification('개정 삭제에 실패했습니다.', 'error');
            } else {
                showNotification('개정이 삭제되었습니다.', 'success');
                await this.loadRevisions();
            }
        } catch (error) {
            console.error('개정 삭제 실패:', error);
            showNotification('개정 삭제 중 오류가 발생했습니다.', 'error');
        }
    },

    // 메뉴얼 화면용: 시스템 정보 복사 (문제 신고용)
    copySystemInfo() {
        const info = {
            appVersion: App.state.appVersion,
            userAgent: navigator.userAgent,
            storageSize: `${(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB`,
            agencies: App.state.agencies.length,
            courses: App.state.courses.length,
            selectedDate: App.state.selectedDate,
            viewMode: App.state.viewMode
        };
        
        const text = `[배송스케줄러 시스템 정보]\n${JSON.stringify(info, null, 2)}`;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('시스템 정보가 복사되었습니다. 개발자에게 전달해주세요.', 'success');
        }).catch(() => {
            showNotification('정보 복사에 실패했습니다.', 'error');
        });
    },

    // --- 파일 분석 관련 액션 ---

    // 분석 결과를 스케줄에 적용 (iframe에서 호출)
    applyCameraData(data) {
        if (!data || !data.stops || data.stops.length === 0) {
            showNotification('적용할 데이터가 없습니다.', 'error');
            return;
        }
        App.state.cameraDataToApply = data;
        App.state.showApplyCameraDataModal = true;
        App.render();
    },

    // 분석 결과 적용 취소
    cancelApplyCameraData() {
        this.closeAllModals();
    },

    // 관리자 모드 클릭 카운터
    incrementAdminClick() {
        const CLICK_THRESHOLD = 5;
        const CLICK_TIMEOUT = 2000; // 2초 내에 클릭해야 함

        // 기존 타임아웃 클리어
        if (App.state.adminModeClickTimeout) {
            clearTimeout(App.state.adminModeClickTimeout);
        }

        // 클릭 카운터 증가
        App.state.adminModeClickCount++;

        // 타임아웃 설정 (2초 후 카운터 리셋)
        App.state.adminModeClickTimeout = setTimeout(() => {
            App.state.adminModeClickCount = 0;
        }, CLICK_TIMEOUT);

        // 5회 클릭 도달 시 비밀번호 모달 표시
        if (App.state.adminModeClickCount >= CLICK_THRESHOLD) {
            App.state.adminModeClickCount = 0;
            App.state.showAdminPasswordModal = true;
            App.render();
        }
    },

    // 관리자 비밀번호 확인
    confirmAdminPassword() {
        const passwordInput = document.getElementById('admin-password-input');
        const password = passwordInput ? passwordInput.value.trim() : '';

        if (password === '519451') {
            App.state.isAdminMode = true;
            App.state.showAdminPasswordModal = false;
            showNotification('관리자 모드가 활성화되었습니다.', 'success');
            App.render();
        } else {
            showNotification('비밀번호가 올바르지 않습니다.', 'error');
            passwordInput.value = '';
        }
    },

    // 관리자 모드 취소
    cancelAdminPassword() {
        App.state.showAdminPasswordModal = false;
        App.state.adminModeClickCount = 0;
        App.render();
    },

    // 관리자 모드 비활성화
    disableAdminMode() {
        App.state.isAdminMode = false;
        showNotification('관리자 모드가 비활성화되었습니다.', 'info');
        App.render();
    },

    // 클라우드 백업
    async cloudBackup() {
        await this._executeCloudBackup();
    },

    // 클라우드 복원
    async cloudRestore() {
        await this._executeCloudRestore();
    },

    // 글로벌 폰트 크기 증가
    increaseGlobalFontSize() {
        if (App.state.globalFontSize < 150) {
            App.state.globalFontSize += 5;
            this.applyGlobalFontSize();
        }
    },

    // 글로벌 폰트 크기 감소
    decreaseGlobalFontSize() {
        if (App.state.globalFontSize > 80) {
            App.state.globalFontSize -= 5;
            this.applyGlobalFontSize();
        }
    },

    // 글로벌 폰트 크기 적용
    applyGlobalFontSize() {
        const newSize = App.state.globalFontSize;
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

        if (App.services.storage) {
            App.services.storage.saveGlobalFontSize(newSize);
        }
        SystemTab.updateGlobalFontSizeDisplay();
    },

    // 분석 결과 적용 확인
    confirmApplyCameraData() {
        const data = App.state.cameraDataToApply;
        if (!data) return;

        // 1. 코스 매칭 (이름에서 공백 제거 후 비교)
        const targetCourseName = (data.courseName || '').replace(/\s+/g, '');
        const course = App.state.courses.find(c => c.name.replace(/\s+/g, '') === targetCourseName);
        
        // 2. 기존 해당 코스 경유지 제거
        if (course) {
            App.state.editableStops = App.state.editableStops.filter(s => s.courseId !== course.id);
            App.state.selectedCourseOrder = [course.id];
        } else {
            showNotification(`'${data.courseName}' 코스를 찾을 수 없어 미지정 코스로 추가합니다.`, 'warning');
        }

        // 3. 경유지 매칭 및 추가
        let successCount = 0;
        let failCount = 0;

        data.stops.forEach(stopName => {
            const cleanStopName = stopName.trim();
            const agency = App.state.agencies.find(a => 
                (a.name === cleanStopName || a.name.includes(cleanStopName)) && !a.isDeleted
            );

            if (agency) {
                App.state.editableStops.push({ 
                    id: Date.now() + Math.random(), 
                    agencyId: agency.id, 
                    courseId: course ? course.id : null 
                });
                successCount++;
            } else {
                failCount++;
                console.warn(`대리점 매칭 실패: ${stopName}`);
            }
        });

        const message = failCount > 0 
            ? `분석 완료: ${successCount}개 적용, ${failCount}개 대리점 미매칭` 
            : `분석 결과 ${successCount}개 대리점이 스케줄에 적용되었습니다.`;
        
        showNotification(message, failCount > 0 ? 'warning' : 'success', 5000);
        this.closeAllModals();
        App.render();
    },

    // 파일 분석 탭(iframe)에 기사 목록 주입
    updateAnalysisDrivers() {
        const iframe = document.querySelector('iframe[title="파일 분석"]');
        if (!iframe) {
            console.warn('파일 분석 iframe을 찾을 수 없습니다.');
            return;
        }

        const populate = () => {
            try {
                const doc = iframe.contentDocument;
                if (!doc) return;

                // 기사 입력 필드 찾기 (ID: driver-select 또는 driver-name)
                const driverInput = doc.getElementById('driver-select') || doc.getElementById('driver-name');
                if (!driverInput) {
                    console.warn('기사 입력 필드를 찾을 수 없습니다.');
                    return;
                }

                const drivers = App.state.drivers || [];
                console.log('기사 목록 동기화:', drivers.length, '명');

                if (driverInput.tagName === 'SELECT') {
                    const currentVal = driverInput.value;
                    let html = '<option value="">기사 선택</option>';
                    drivers.forEach(d => {
                        html += `<option value="${d.name}">${d.name}</option>`;
                    });
                    driverInput.innerHTML = html;
                    if (currentVal && drivers.some(d => d.name === currentVal)) {
                        driverInput.value = currentVal;
                    }
                    
                    // iframe 내부 상태 동기화를 위해 change 이벤트 발생
                    driverInput.dispatchEvent(new Event('change', { bubbles: true }));
                } else if (driverInput.tagName === 'INPUT') {
                    let listId = driverInput.getAttribute('list');
                    if (!listId) {
                        listId = 'drivers-datalist';
                        driverInput.setAttribute('list', listId);
                    }
                    
                    let dataList = doc.getElementById(listId);
                    if (!dataList) {
                        dataList = doc.createElement('datalist');
                        dataList.id = listId;
                        doc.body.appendChild(dataList);
                    }
                    
                    dataList.innerHTML = drivers.map(d => `<option value="${d.name}">`).join('');
                }
            } catch (e) {
                console.warn('iframe 접근 불가 또는 오류:', e);
            }
        };

        if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
            populate();
        } else {
            iframe.onload = populate;
        }
    },

    // Supabase 로그인
    async supabaseSignIn() {
        const email = document.getElementById('auth-email')?.value.trim();
        const password = document.getElementById('auth-password')?.value.trim();

        if (!email || !password) {
            showNotification('이메일과 비밀번호를 모두 입력해주세요.', 'warning');
            return;
        }

        App.showLoadingOverlay('로그인 중...');
        try {
            const { data, error } = await Supabase.supabaseAuth.signIn(email, password);
            
            if (error) {
                showNotification(`로그인 실패: ${error}`, 'error');
                App.hideLoadingOverlay();
                return;
            }

            App.state.currentUser = data.user;
            showNotification('로그인 성공! 데이터를 불러오는 중...', 'success');
            
            // Supabase에서 데이터 자동 로드 (이 함수 내에서 오버레이를 관리합니다)
            await App.loadFromSupabase();
            
            App.updateLoginStatusDisplay(); // 로그인 상태 업데이트
            App.render();
        } catch (error) {
            console.error('로그인 오류:', error);
            showNotification('로그인 중 오류가 발생했습니다.', 'error');
            App.hideLoadingOverlay();
        }
    },

    // Supabase 회원가입
    async supabaseSignUp() {
        const email = document.getElementById('auth-email')?.value.trim();
        const password = document.getElementById('auth-password')?.value.trim();

        if (!email || !password) {
            showNotification('이메일과 비밀번호를 모두 입력해주세요.', 'warning');
            return;
        }

        if (password.length < 6) {
            showNotification('비밀번호는 최소 6자 이상이어야 합니다.', 'warning');
            return;
        }

        try {
            const { data, error } = await Supabase.supabaseAuth.signUp(email, password);
            
            if (error) {
                showNotification(`회원가입 실패: ${error}`, 'error');
                return;
            }

            showNotification('회원가입 성공! 이메일을 확인해주세요.', 'success');
            App.updateLoginStatusDisplay(); // 로그인 상태 업데이트
            App.render();
        } catch (error) {
            console.error('회원가입 오류:', error);
            showNotification('회원가입 중 오류가 발생했습니다.', 'error');
        }
    },

    // Supabase 로그아웃
    async supabaseSignOut() {
        try {
            const { error } = await Supabase.supabaseAuth.signOut();
            
            if (error) {
                showNotification(`로그아웃 실패: ${error}`, 'error');
                return;
            }

            App.state.currentUser = null;
            showNotification('로그아웃 성공!', 'success');
            App.updateLoginStatusDisplay(); // 로그인 상태 업데이트
            App.render();
        } catch (error) {
            console.error('로그아웃 오류:', error);
            showNotification('로그아웃 중 오류가 발생했습니다.', 'error');
        }
    },
};