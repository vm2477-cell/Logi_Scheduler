export class Modals {
    static render() {
        return `
            ${this.#renderConfirmationModal()}
            ${this.#renderAgencyEditModal()}
            ${this.#renderDeleteAgencyModal()}
            ${this.#renderDeleteCourseModal()}
            ${this.#renderDeleteDriverModal()}
            ${this.#renderLoadScheduleModal()}
            ${this.#renderDeleteHistoryModal()}
            ${this.#renderRestoreModal()}
            ${this.#renderCorrectionModal()}
            ${this.#renderSendSmsModal()}
            ${this.#renderSendDepartureSmsModal()}
            ${this.#renderApplyCameraDataModal()}
            ${this.#renderDirectionsModal()}
            ${this.#renderCompleteScheduleModal()}
            ${this.#renderReleaseNotesModal()}
            ${this.#renderMemoModal()}
            ${this.#renderImageViewerModal()}
            ${this.#renderHardReloadModal()}
            ${this.#renderGroupModal()}
            ${this.#renderAgencySelectorModal()}
            ${this.#renderAdminPasswordModal()}
        `;
    }

    static #createModal(config) {
        if (!config.show) return '';

        const buttonContainerClasses = `grid gap-2 w-full ${config.buttons.length > 2 ? 'grid-cols-2' : ''}`;
        
        return `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto ${config.textAlign || 'text-center'}" onclick="if (!event.target.closest('button[data-action]')) { event.stopPropagation(); }">
                    <h3 class="text-lg font-bold mb-4">${config.title}</h3>
                    <div class="text-gray-600 dark:text-gray-300 mb-6">${config.body}</div>
                    <div class="${buttonContainerClasses}">
                        ${config.buttons.map(btn => `
                            <button data-action="${btn.action}" class="${btn.class}">
                                ${btn.text}
                            </button>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    static #renderConfirmationModal() {
        return this.#createModal({
            show: App.state.showConfirmationModal,
            title: '주의',
            body: '<p>읽기 전용 상태를 해제하면 스케줄이 변경될 수 있으며, 자동 저장 기능이 활성화됩니다. 계속하시겠습니까?</p>',
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'close-all-modals' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '확인', action: 'confirm-unlock-editing' }
            ]
        });
    }

    static #renderDeleteAgencyModal() {
        return this.#createModal({
            show: App.state.showDeleteAgencyModal,
            title: '대리점 삭제',
            body: `<p>'${App.state.agencyToDelete?.name}' 대리점을 삭제하시겠습니까? 이 대리점은 스케줄에서도 제거됩니다.</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-delete-agency' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '삭제', action: 'confirm-delete-agency' }
            ]
        });
    }

    static #renderAgencyEditModal() {
        if (!App.state.showAgencyEditModal || !App.state.agencyToEdit) return '';

        const agency = App.state.agencyToEdit;

        const body = `
            <form data-action="save-agency-changes" class="space-y-4 text-left">
                <input type="hidden" id="edit-agency-id" value="${agency.id}">
                <div>
                    <label for="edit-agency-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">대리점명</label>
                    <input type="text" id="edit-agency-name" name="name" value="${agency.name || ''}" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label for="edit-agency-address" class="block text-sm font-medium text-gray-700 dark:text-gray-300">주소</label>
                    <div class="flex gap-1 mt-1">
                        <input type="text" id="edit-agency-address" name="address" value="${agency.address || ''}" class="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <button type="button" data-action="find-coordinates-for-modal" class="bg-blue-500 text-white px-3 py-2 rounded-md text-xs hover:bg-blue-600 whitespace-nowrap flex-shrink-0">좌표찾기</button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label for="edit-agency-latitude" class="block text-sm font-medium text-gray-700 dark:text-gray-300">위도</label>
                        <input type="number" step="any" id="edit-agency-latitude" name="latitude" value="${agency.latitude || ''}" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="예: 36.7834">
                    </div>
                    <div>
                        <label for="edit-agency-longitude" class="block text-sm font-medium text-gray-700 dark:text-gray-300">경도</label>
                        <input type="number" step="any" id="edit-agency-longitude" name="longitude" value="${agency.longitude || ''}" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="예: 127.0000">
                    </div>
                </div>
                <div>
                    <label for="edit-agency-geofence-radius" class="block text-sm font-medium text-gray-700 dark:text-gray-300">지오펜스 반경 (m)</label>
                    <input type="number" id="edit-agency-geofence-radius" name="geofenceRadius" value="${agency.geofenceRadius || 20}" min="10" step="10" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <div class="flex gap-1 mt-1">
                        <button type="button" onclick="const input = document.getElementById('edit-agency-geofence-radius'); input.value=20; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-gray-800 dark:text-gray-200">일반(20)</button>
                        <button type="button" onclick="const input = document.getElementById('edit-agency-geofence-radius'); input.value=150; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-gray-800 dark:text-gray-200">대형(150)</button>
                        <button type="button" onclick="const input = document.getElementById('edit-agency-geofence-radius'); input.value=300; input.dispatchEvent(new Event('input', { bubbles: true }));" class="flex-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded text-gray-800 dark:text-gray-200">물류(300)</button>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">GPS 자동 기록 시 도착/출발을 인식하는 반경입니다.</p>
                </div>
                <div>
                    <label for="edit-agency-phone" class="block text-sm font-medium text-gray-700 dark:text-gray-300">전화번호</label>
                    <input type="tel" id="edit-agency-phone" name="phone" value="${agency.phone || ''}" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                </div>
                <div>
                    <label for="edit-agency-unloading-method" class="block text-sm font-medium text-gray-700 dark:text-gray-300">하차방법</label>
                    <select id="edit-agency-unloading-method" name="unloadingMethod" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <option value="수작업" ${agency.unloadingMethod === '수작업' ? 'selected' : ''}>수작업</option>
                        <option value="지게차" ${agency.unloadingMethod === '지게차' ? 'selected' : ''}>지게차</option>
                    </select>
                </div>
                <div>
                    <label for="edit-agency-door-location" class="block text-sm font-medium text-gray-700 dark:text-gray-300">하차시 문위치</label>
                    <select id="edit-agency-door-location" name="doorLocation" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                        <option value="옆문" ${agency.doorLocation === '옆문' ? 'selected' : ''}>옆문</option>
                        <option value="뒷문" ${agency.doorLocation === '뒷문' ? 'selected' : ''}>뒷문</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">코스</label>
                    <input type="text" id="edit-agency-course-search" placeholder="코스 검색 (초성 가능)..." 
                           value="${App.state.agencyEditModalSearchQuery || ''}"
                           class="mb-2 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <div id="edit-agency-courses" class="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-600 p-2 space-y-3 bg-white dark:bg-gray-700">
                        ${[...App.state.courses]
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
                            }).join('')}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">각 코스별로 대리점의 우선순위를 입력하세요. (작은 숫자가 먼저 방문)</p>
                </div>
            </form>
        `;

        return this.#createModal({
            show: true,
            title: '대리점 정보 수정',
            textAlign: 'text-left',
            body: body,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'close-agency-edit-modal' },
                { class: 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600', text: '저장', action: 'save-agency-changes' }
            ]
        });
    }


    static #renderDeleteCourseModal() {
        return this.#createModal({
            show: App.state.showDeleteCourseModal,
            title: '코스 삭제',
            body: `<p>'${App.state.courseToDelete?.name}' 코스를 삭제하시겠습니까? 이 코스에 속한 대리점은 '코스 미지정'으로 변경됩니다.</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-delete-course' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '삭제', action: 'confirm-delete-course' }
            ]
        });
    }

    static #renderDeleteDriverModal() {
        return this.#createModal({
            show: App.state.showDeleteDriverModal,
            title: '배송기사 삭제',
            body: `<p>'${App.state.driverToDelete?.name}' 기사를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-delete-driver' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '삭제', action: 'confirm-delete-driver' }
            ]
        });
    }

    static #renderLoadScheduleModal() {
        return this.#createModal({
            show: App.state.showLoadScheduleModal,
            title: '스케줄 불러오기',
            body: `<p>현재 날짜 스케줄이 '<strong>${App.state.dateToLoad}</strong>' 스케줄으로 덮어쓰기됩니다. 계속하시겠습니까?</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-load-schedule' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '확인', action: 'confirm-load-schedule' }
            ]
        });
    }

    static #renderReleaseNotesModal() {
        if (!App.state.showReleaseNotesModal) return '';

        const body = `
            <div class="max-h-96 overflow-y-auto text-left space-y-4 pr-2">
                ${(App.state.releaseNotes && Array.isArray(App.state.releaseNotes) ? App.state.releaseNotes : []).map(note => `
                    <div class="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                        <div class="flex justify-between items-center mb-1">
                            <h4 class="font-bold text-lg text-indigo-600 dark:text-indigo-400">${note.version}</h4>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${note.date}</span>
                        </div>
                        <ul class="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 space-y-1">
                            ${(note.changes || []).map(change => `<li>${change}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
        `;

        return this.#createModal({
            show: true,
            title: '릴리즈 노트',
            body: body,
            buttons: [
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 w-full', text: '닫기', action: 'close-release-notes-modal' }
            ]
        });
    }

    static #renderDeleteHistoryModal() {
        return this.#createModal({
            show: App.state.showDeleteHistoryModal,
            title: '스케줄 기록 삭제',
            body: `<p>'${App.state.historyDateToDelete}' 스케줄 기록을 삭제하시겠습니까?<br>이 작업은 되돌릴 수 없습니다.</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-delete-history' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '삭제', action: 'confirm-delete-history' }
            ]
        });
    }

    static #renderRestoreModal() {
        return this.#createModal({
            show: App.state.showRestoreModal,
            title: '데이터 복원',
            body: '<p>파일을 복원하면 현재 모든 데이터가 삭제되고 백업 데이터로 대체됩니다. 계속하시겠습니까?</p>',
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-restore' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '복원', action: 'confirm-restore' }
            ]
        });
    }

    static #renderMemoModal() {
        if (!App.state.showMemoModal || !App.state.memoModalData) return '';
        
        const { isEditing, editedMemoText, memo, editedPhotos, photos } = App.state.memoModalData;
        const currentPhotos = isEditing ? editedPhotos : photos;

        const buttons = isEditing ? 
            [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-edit-memo' },
                { class: 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600', text: '저장', action: 'save-memo' }
            ] : [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '닫기', action: 'close-memo-modal' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '수정', action: 'start-edit-memo' }
            ];

        let body = '';
        
        if (isEditing) {
            body += `
                <textarea data-action="update-edited-memo" class="w-full h-32 p-2 border rounded bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 mb-4" placeholder="메모 내용 입력...">${editedMemoText || ''}</textarea>
                <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">사진 첨부</label>
                    <input type="file" accept="image/*" id="memo-photo-input" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-gray-700 dark:file:text-gray-300">
                </div>
            `;
        } else {
            body += `
                <div class="max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-700 p-3 rounded mb-4">
                    <p class="whitespace-pre-wrap text-gray-800 dark:text-gray-200">${memo || '<span class="text-gray-400">메모 없음</span>'}</p>
                </div>
            `;
        }

        if (currentPhotos && currentPhotos.length > 0) {
            body += `
                <div class="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    ${currentPhotos.map(photo => `
                        <div class="relative group">
                            <img src="${photo.data}" data-action="open-image-viewer" alt="메모 사진" class="w-full h-24 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80 transition-opacity">
                            ${isEditing ? `
                                <button type="button" data-action="remove-memo-photo" data-photo-id="${photo.id}" class="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 opacity-90">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else if (!isEditing) {
            body += `<p class="text-xs text-gray-500 dark:text-gray-400">첨부된 사진 없음</p>`;
        }

        return this.#createModal({
            show: true,
            title: `${App.state.memoModalData.agencyName || '대리점'} 메모`,
            textAlign: 'text-left',
            body: body,
            buttons: buttons
        });
    }

    static #renderImageViewerModal() {
        if (!App.state.showImageViewerModal || !App.state.imageViewerSrc) return '';

        return `
            <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 modal-overlay" onclick="App.actions.closeImageViewer()">
                <div class="relative max-w-full max-h-full p-4 flex flex-col items-center">
                    <button class="absolute top-4 right-4 text-white text-4xl font-bold focus:outline-none z-50 drop-shadow-md" onclick="App.actions.closeImageViewer()">&times;</button>
                    <img src="${App.state.imageViewerSrc}" class="max-w-full max-h-[90vh] object-contain rounded shadow-lg" alt="확대 이미지" onclick="event.stopPropagation()">
                </div>
            </div>
        `;
    }

    static #renderCorrectionModal() {
        if (!App.state.showCorrectionModal || !App.state.correctionData) return '';
        
        return this.#createModal({
            show: true,
            title: '이동 시간 보정',
            body: `
                <p class="mb-2"><strong>경로:</strong> ${App.state.correctionData?.fromLocationName} → ${App.state.correctionData?.toLocationName}</p>
                <p class="mb-2"><strong>기존 설정 시간:</strong> ${App.state.correctionData?.existingTime}분</p>
                <p class="text-lg font-semibold text-indigo-600 dark:text-indigo-400"><strong>측정된 시간:</strong> ${App.state.correctionData?.measuredTime}분</p>
            `,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-save-correction' },
                { class: 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600', text: '새 시간으로 저장', action: 'confirm-save-correction' }
            ]
        });
    }

    static #renderSendSmsModal() {
        return this.#createModal({
            show: App.state.showSendSmsConfirmationModal,
            title: '문자 메시지 발송',
            textAlign: 'text-left',
            body: `
                <p class="text-center mb-6">출발 메시지를 발송하시겠습니까?</p>
                <div class="flex items-center">
                    <input type="checkbox" id="always-send-sms-checkbox" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600">
                    <label for="always-send-sms-checkbox" class="ml-2 block text-sm text-gray-900 dark:text-gray-200">다시 묻지 않고 항상 발송</label>
                </div>
            `,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-send-sms' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '발송', action: 'confirm-send-sms' }
            ]
        });
    }

    static #renderSendDepartureSmsModal() {
        if (!App.state.showSendDepartureSmsModal || !App.state.departureSmsData) return '';

        const nextAgencyName = App.state.departureSmsData.name;
        const message = App.state.departureSmsMessage || `[배송알림] 지금 ${nextAgencyName}(으)로 출발합니다.`;
        
        return this.#createModal({
            show: true,
            title: '출발 문자 발송 확인',
            body: `
                <p class="mb-2">'<strong>${nextAgencyName}</strong>'(으)로 출발 문자를 발송하시겠습니까?</p>
                <textarea class="w-full p-2 border rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                          rows="3"
                          oninput="App.actions.updateDepartureSmsMessage(event, this)">${message}</textarea>
            `,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'close-all-modals' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '발송', action: 'confirm-send-departure-sms' }
            ]
        });
    }

    static #renderHardReloadModal() {
        return this.#createModal({
            show: App.state.showHardReloadModal,
            title: '앱 강제 새로고침',
            body: `<p>모든 캐시를 지우고 앱을 완전히 새로고침합니다. 저장되지 않은 변경사항이 유실될 수 있습니다. 계속하시겠습니까?</p>`,
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'close-all-modals' },
                { class: 'bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600', text: '새로고침', action: 'confirm-hard-reload' }
            ]
        });
    }

    static #renderApplyCameraDataModal() {
        return this.#createModal({
            show: App.state.showApplyCameraDataModal,
            title: '스케줄 적용',
            body: '<p>배차표 분석 결과를 현재 스케줄에 적용하시겠습니까? 기존에 입력된 모든 경유지는 삭제됩니다.</p>',
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-apply-camera-data' },
                { class: 'bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600', text: '확인', action: 'confirm-apply-camera-data' }
            ]
        });
    }

    static #renderDirectionsModal() {
        return this.#createModal({
            show: App.state.showDirectionsModal,
            title: '내비게이션 앱 선택',
            textAlign: 'text-left',
            body: `
                <p class="text-center mb-4">"<strong>${App.state.directionsInfo?.destinationName || ''}</strong>"(으)로 길안내를 시작할 앱을 선택하세요.</p>
                <div class="flex items-center justify-center mb-6">
                    <input type="checkbox" id="always-use-nav-app" class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600">
                    <label for="always-use-nav-app" class="ml-2 block text-sm text-gray-900 dark:text-gray-200">항상 이 앱 사용</label>
                </div>
            `,
            buttons: [ // 카카오맵 -> 카카오내비 변경
                { class: 'w-full bg-yellow-400 text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors', text: '카카오내비', action: 'open-kakao-navi' },
                { class: 'w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors', text: '네이버지도', action: 'open-naver-map' },
                { class: 'w-full bg-red-500 text-white font-bold py-3 rounded-lg hover:bg-red-600 transition-colors', text: 'TMAP', action: 'open-tmap' },
                { class: 'w-full bg-sky-500 text-white font-bold py-3 rounded-lg hover:bg-sky-600 transition-colors', text: '아틀란', action: 'open-atlan' },
                { class: 'w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 col-span-2', text: '취소', action: 'close-all-modals' }
            ]
        });
    }

    static #renderCompleteScheduleModal() {
        return this.#createModal({
            show: App.state.showCompleteScheduleModal,
            title: '스케줄 완료',
            body: '<p>스케줄을 완료 처리하시겠습니까? 완료된 스케줄은 편집할 수 없습니다.</p>',
            buttons: [
                { class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500', text: '취소', action: 'cancel-complete-schedule' },
                { class: 'bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600', text: '완료', action: 'confirm-complete-schedule' }
            ]
        });
    }

    static #renderGroupModal() {
        if (!App.state.showGroupModal) return '';
        
        const selectedIds = App.state.selectedStopsForGrouping;
        const selectedStops = App.state.editableStops.filter(stop => selectedIds.has(stop.id));
        
        const stopsList = selectedStops.map(stop => {
            const agency = App.state.cache.agenciesMap.get(stop.agencyId);
            const agencyName = agency ? agency.name : '알 수 없음';
            const isGrouped = !!stop.groupId;
            return `
                <div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded mb-1">
                    <span class="text-sm text-gray-700 dark:text-gray-200">${agencyName}</span>
                    <span class="text-xs ${isGrouped ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}">
                        ${isGrouped ? '그룹됨' : '미그룹'}
                    </span>
                </div>
            `;
        }).join('');

        const groupedCount = selectedStops.filter(s => s.groupId).length;
        const ungroupedCount = selectedStops.filter(s => !s.groupId).length;

        return `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 class="text-lg font-bold mb-4">그룹 관리 (${selectedIds.size}개 선택)</h3>
                    
                    <div class="mb-4 text-sm text-gray-600 dark:text-gray-300">
                        <p>모달을 닫지 않고 체크박스를 추가로 선택할 수 있습니다.</p>
                        <div class="flex gap-4 mt-2">
                            <span class="text-indigo-600 dark:text-indigo-400">그룹됨: ${groupedCount}개</span>
                            <span class="text-gray-500 dark:text-gray-400">미그룹: ${ungroupedCount}개</span>
                        </div>
                    </div>

                    <div class="mb-4 max-h-48 overflow-y-auto">
                        ${stopsList}
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <button data-action="group-selected-stops" class="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-bold">
                            묶기
                        </button>
                        <button data-action="ungroup-selected-stops" class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 font-bold">
                            해제
                        </button>
                    </div>
                    
                    <button data-action="close-group-modal" class="mt-2 w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500">
                        취소
                    </button>
                </div>
            </div>
        `;
    }

    static #renderAgencySelectorModal() {
        if (!App.state.showAgencySelectorModal) return '';

        const query = App.state.agencySelectorSearchQuery || '';
        const availableAgencies = App.state.agencies.filter(a => !a.isDeleted);
        const filteredAgencies = query ? 
            availableAgencies.filter(a => App.utils.matchText(a.name, query)) : 
            availableAgencies;

        const agenciesList = filteredAgencies
            .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99) || a.name.localeCompare(b.name, 'ko-KR'))
            .map(agency => `
                <button data-action="select-agency-from-modal" 
                        data-agency-id="${agency.id}" 
                        class="block w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-700 rounded">
                    ${agency.name}
                </button>
            `).join('');

        return `
            <div class="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto touch-manipulation">
                    <h3 class="text-lg font-bold mb-4">대리점 선택</h3>
                    
                    <div class="mb-4">
                        <input type="text" 
                               id="agency-modal-search-input"
                               placeholder="대리점 검색 (초성)" 
                               value="${query}" 
                               oninput="App.state.agencySelectorSearchQuery = this.value; document.getElementById('agency-modal-list').innerHTML = App.getAgencyModalListContent();"
                               inputmode="search"
                               autocomplete="off"
                               autocapitalize="off"
                               spellcheck="false"
                               class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm min-h-[44px]">
                    </div>

                    <div id="agency-modal-list" class="mb-4 max-h-60 overflow-y-auto rounded-md border border-gray-300 dark:border-gray-600 p-2 space-y-1 bg-white dark:bg-gray-700">
                        <button data-action="select-agency-from-modal" 
                                data-agency-id="" 
                                class="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-700 rounded min-h-[44px] touch-manipulation">
                            - 대리점 선택 해제 -
                        </button>
                        ${filteredAgencies.length > 0 ? agenciesList : '<div class="px-3 py-2 text-sm text-gray-500">결과 없음</div>'}
                    </div>
                    
                    <button data-action="close-agency-selector-modal" class="w-full bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 min-h-[44px] touch-manipulation">
                        취소
                    </button>
                </div>
            </div>
        `;
    }

    static #renderAdminPasswordModal() {
        return this.#createModal({
            show: App.state.showAdminPasswordModal,
            title: '관리자 모드',
            body: `
                <div class="space-y-4">
                    <p class="text-sm text-gray-600 dark:text-gray-300">관리자 비밀번호를 입력하세요.</p>
                    <input type="password" id="admin-password-input"
                           placeholder="비밀번호"
                           class="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm min-h-[44px]">
                </div>
            `,
            buttons: [
                { action: 'cancel-admin-password', text: '취소', class: 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500' },
                { action: 'confirm-admin-password', text: '확인', class: 'bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700' }
            ]
        });
    }

    static update() {
        const modalsContainer = document.getElementById('modals-container');
        if (modalsContainer) {
            modalsContainer.innerHTML = this.render();
        }
    }
}