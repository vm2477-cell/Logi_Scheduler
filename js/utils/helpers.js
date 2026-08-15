// js/utils/helpers.js

export const Helpers = {
    // ... (기존에 Helpers 객체에 다른 유틸리티 함수들이 있었다면 여기에 포함됩니다.)

    /**
     * 텍스트가 검색어와 일치하는지 확인합니다.
     * - 대소문자를 구분하지 않습니다.
     * - 한글 초성 검색을 지원합니다.
     * @param {string} text 검색 대상 텍스트
     * @param {string} query 검색어
     * @returns {boolean} 일치하면 true, 아니면 false
     */
    matchText(text, query) {
        if (!text) return false;
        if (!query) return true;

        const lowerText = String(text).toLowerCase();
        const lowerQuery = String(query).toLowerCase();

        // 1. 직접적인 부분 문자열 일치 확인
        if (lowerText.includes(lowerQuery)) {
            return true;
        }

        // 2. 한글 초성 검색 확인
        // 검색어에 완성된 한글(가-힣)이 포함되어 있다면 초성 검색을 수행하지 않음
        if (/[가-힣]/.test(lowerQuery)) {
            return false;
        }

        // 초성 리스트
        const cho = [
            'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
        ];

        /**
         * 한글 문자의 초성을 추출합니다.
         * @param {string} char 한글 문자
         * @returns {string} 초성 또는 빈 문자열 (한글이 아니거나 초성이 없는 경우)
         */
        const getChosung = (char) => {
            const code = char.charCodeAt(0);
            // 한글 유니코드 범위 (가-힣)
            if (code >= 0xAC00 && code <= 0xD7A3) {
                const uni = code - 0xAC00;
                const chosungIndex = Math.floor(uni / (21 * 28));
                return cho[chosungIndex];
            }
            // 문자가 자음 자체일 수 있음
            if (cho.includes(char)) {
                return char;
            }
            return ''; // 한글이 아니면 빈 문자열 반환
        };

        // 검색 대상 텍스트의 모든 한글 초성 추출
        const textChosung = Array.from(lowerText).map(getChosung).join('');
        // 검색어의 모든 한글 초성 추출
        const queryChosung = Array.from(lowerQuery).map(getChosung).join('');

        // 검색어에 초성이 포함되어 있고, 텍스트의 초성에 검색어의 초성이 포함되는지 확인
        if (queryChosung.length > 0 && textChosung.includes(queryChosung)) {
            return true;
        }

        return false;
    },

    // 날짜를 YYYY-MM-DD 형식으로 포맷
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 시간 범위 문자열이 유효한지 확인
    isTimeInUnavailableRange(timeString, unavailableTimesString) {
        if (!unavailableTimesString || !timeString) return false;

        const [checkHour, checkMinute] = timeString.split(':').map(Number);
        const checkTimeInMinutes = checkHour * 60 + checkMinute;

        const ranges = unavailableTimesString.split(',').map(range => range.trim());

        for (const range of ranges) {
            const [startStr, endStr] = range.split('-');
            if (!startStr || !endStr) continue;

            const [startHour, startMinute] = startStr.split(':').map(Number);
            const [endHour, endMinute] = endStr.split(':').map(Number);

            const startTimeInMinutes = startHour * 60 + startMinute;
            const endTimeInMinutes = endHour * 60 + endMinute;

            if (checkTimeInMinutes >= startTimeInMinutes && checkTimeInMinutes <= endTimeInMinutes) {
                return true;
            }
        }
        return false;
    },

    // 시간 범위 입력 포맷팅 (예: 1200-1300 -> 12:00-13:00)
    formatTimeRangeInput(input) {
        if (!input) return '';
        return input.split(',')
            .map(range => {
                const parts = range.trim().split('-');
                if (parts.length === 2) {
                    const start = parts[0].trim().replace(/[^0-9]/g, '');
                    const end = parts[1].trim().replace(/[^0-9]/g, '');
                    
                    const formatPart = (part) => {
                        if (part.length === 4) {
                            return `${part.substring(0, 2)}:${part.substring(2, 4)}`;
                        }
                        return part;
                    };

                    return `${formatPart(start)}-${formatPart(end)}`;
                }
                return range.trim();
            })
            .join(', ');
    },

    // 디바운스 함수
    debounce(func, delay) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    },

    // 고유 ID 생성
    generateId() {
        return Date.now() + Math.random();
    },

    // kebab-case를 camelCase로 변환
    toCamelCase(str) {
        if (!str) return '';
        return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
    },

    // 날짜 문자열에서 일(Day)만 추출 (YYYY-MM-DD -> DD)
    formatDay(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        return parts.length === 3 ? parts[2] : dateStr;
    },
};