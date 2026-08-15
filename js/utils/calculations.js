// 시간 및 스케줄 계산 유틸리티
export class Calculations {
    // 정비 알림 계산 (공통 로직)
    static calculateMaintenanceAlerts(vehicleLog, maintenanceCategories) {
        const alerts = [];
        const mileageRecords = vehicleLog.mileage || [];
        const maintenanceRecords = vehicleLog.maintenance || [];
        const intervals = vehicleLog.settings?.maintenanceIntervals || {};

        if (!mileageRecords.length || !intervals) return alerts;

        const currentMileage = mileageRecords.reduce((max, r) => Math.max(max, r.value), 0);
        const today = new Date();

        // 삭제된 기본 카테고리 제외
        const deletedDefaults = vehicleLog.settings?.deletedDefaultCategories || [];
        const availableCategories = maintenanceCategories.filter(cat =>
            cat !== '기타' && !deletedDefaults.includes(cat)
        );

        availableCategories.forEach(category => {
            const interval = intervals[category];
            if (!interval) return;

            const kmInterval = typeof interval === 'object' ? interval.km : interval;
            const monthInterval = typeof interval === 'object' ? interval.months : 0;

            if (kmInterval <= 0 && monthInterval <= 0) return;

            const lastMaintenance = maintenanceRecords
                .filter(m => m.item === category)
                .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            let lastMileage = lastMaintenance?.mileage || 0;
            let lastDate = lastMaintenance ? new Date(lastMaintenance.date) : null;

            let kmProgress = 0;
            let kmRemaining = 0;
            let kmStatus = 'none';

            if (kmInterval > 0) {
                const kmSinceLast = currentMileage - lastMileage;
                kmProgress = Math.min((kmSinceLast / kmInterval) * 100, 100);
                kmRemaining = Math.max(kmInterval - kmSinceLast, 0);

                if (kmProgress >= 100) kmStatus = 'urgent';
                else if (kmProgress >= 80) kmStatus = 'warning';
                else if (kmProgress >= 50) kmStatus = 'caution';
                else kmStatus = 'good';
            }

            let monthProgress = 0;
            let monthRemaining = 0;
            let monthStatus = 'none';

            if (monthInterval > 0 && lastDate) {
                const monthsSinceLast = (today.getFullYear() - lastDate.getFullYear()) * 12 +
                                       (today.getMonth() - lastDate.getMonth());
                monthProgress = Math.min((monthsSinceLast / monthInterval) * 100, 100);
                monthRemaining = Math.max(monthInterval - monthsSinceLast, 0);

                if (monthProgress >= 100) monthStatus = 'urgent';
                else if (monthProgress >= 80) monthStatus = 'warning';
                else if (monthProgress >= 50) monthStatus = 'caution';
                else monthStatus = 'good';
            }

            const statusPriority = { urgent: 4, warning: 3, caution: 2, good: 1, none: 0 };
            const overallStatus = statusPriority[kmStatus] > statusPriority[monthStatus] ? kmStatus : monthStatus;

            if (overallStatus !== 'none' && overallStatus !== 'good') {
                alerts.push({
                    category,
                    kmProgress,
                    kmRemaining,
                    kmStatus,
                    monthProgress,
                    monthRemaining,
                    monthStatus,
                    overallStatus,
                    lastMileage,
                    lastDate,
                    currentMileage
                });
            }
        });

        return alerts.sort((a, b) => {
            const priority = { urgent: 4, warning: 3, caution: 2 };
            return priority[b.overallStatus] - priority[a.overallStatus];
        });
    }
    static ASAN_FACTORY = { 
        id: 0, 
        name: '연세유업 아산공장',
        address: '충남 아산시 음봉면 음봉로 829',
        latitude: 36.827737,
        longitude: 127.098371
    };

    // 시간 포맷팅 (초 -> HH:MM)
    static formatHHMM(seconds) {
        if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '-';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours === 0) {
            return `${minutes}분`;
        }
        
        return `${hours}시간 ${minutes}분`;
    }

    // 분 포맷팅 (초 -> X분)
    static formatMinutes(seconds) {
        if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '-';
        if (seconds === 0) return '0분';
        return `${Math.round(seconds / 60)}분`;
    }

    // 시간 계산 (기본 시간 + 초)
    static calculateTime(baseTime, secondsToAdd) {
        if (!baseTime || secondsToAdd === null || secondsToAdd === undefined || isNaN(secondsToAdd)) return '-';
        
        // HH:mm 형식을 ISO 형식에 맞춰 보정 (파싱 안정성 확보)
        const [hStr, mStr] = baseTime.split(':');
        const base = new Date(`2000-01-01T${hStr.padStart(2, '0')}:${mStr.padStart(2, '0')}:00`);
        if (isNaN(base.getTime())) return '-';

        base.setSeconds(base.getSeconds() + secondsToAdd);
        
        const hours = String(base.getHours()).padStart(2, '0');
        const minutes = String(base.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 작업 시간 계산
    static calculateWorkTime(stop, agency) {
        if (!agency) return 0;

        // 1. 통계적 평균 작업시간이 저장되어 있으면 우선적으로 사용
        if (agency.avgWorkTimeInSeconds !== undefined && agency.avgWorkTimeInSeconds !== null) {
            return agency.avgWorkTimeInSeconds;
        }
        
        // 2. 저장된 평균값이 없으면 기본값(15분)을 반환하여 초기 스케줄 추정치를 제공.
        const DEFAULT_WORK_TIME_SECONDS = 15 * 60;
        return DEFAULT_WORK_TIME_SECONDS;
    }

    // 이동 시간 조회
    static getTravelTime(fromId, toId, travelTimes) {
        const key1 = `${fromId}-${toId}`;
        const key2 = `${toId}-${fromId}`;
        
        return travelTimes[key1] || travelTimes[key2] || null;
    }

    // 스케줄 시간 계산 (핵심 로직)
    static calculateScheduleTimes(stops, departureTime, agenciesMap, travelTimes) {
        if (!stops || !stops.length || !departureTime) return [];
    
        const stopsWithTimes = [];
        let currentTimeInSeconds = 0; // 출발 시간 기준 상대적 시간(초)
        let prevAgencyId = this.ASAN_FACTORY.id;
        
        // 출발 시간 파싱 안정성 확보
        const [startH, startM] = departureTime.split(':');
        const baseTime = new Date(`2000-01-01T${startH.padStart(2, '0')}:${startM.padStart(2, '0')}:00`);
        const isBaseTimeValid = !isNaN(baseTime.getTime());
    
        stops.forEach((stop, index) => {
            const agency = stop.agencyId ? agenciesMap.get(stop.agencyId) : null;
    
            let travelTimeInSeconds = 0;
            let arrivalTimeInSeconds = 0;
            let workTimeInSeconds = 0;
            let departureTimeInSeconds = 0;

            // 예측 이동 시간 (기록된 평균값)
            const travelTimeFromPrev = this.getTravelTime(prevAgencyId, stop.agencyId, travelTimes);
            const predictedTravelTimeInSeconds = travelTimeFromPrev !== null ? travelTimeFromPrev * 60 : null;
    
            // 1. 이동 시간 결정
            // 같은 그룹 내의 연속된 경유지는 이동 시간을 0으로 처리
            if (stop.groupId && index > 0 && stops[index - 1].groupId === stop.groupId) {
                travelTimeInSeconds = 0;
            } else {
                // [Request] 상시 기록된 평균값이 표시되게 함. 
                // 수동 계획값이 있더라도 실제 도착 기록이 없는 경우 평균 이동 시간을 우선 표시합니다.
                travelTimeInSeconds = predictedTravelTimeInSeconds ?? 0;
            }
    
            // 2. 도착 시간 결정
            if (stop.manualArrivalTime && isBaseTimeValid) {
                try {
                    const [arrH, arrM] = stop.manualArrivalTime.split(':');
                    const manualArrivalDate = new Date(`2000-01-01T${arrH.padStart(2, '0')}:${arrM.padStart(2, '0')}:00`);
                    
                    if (!isNaN(manualArrivalDate)) {
                        arrivalTimeInSeconds = (manualArrivalDate.getTime() - baseTime.getTime()) / 1000;
                        // 수동/GPS 도착 시간이 있으면, 이전 경유지 출발부터 현재 경유지 도착까지의 '실제 이동 시간'을 역산하여 적용합니다.
                        // 이 값은 화면에 즉시 반영되며 하루 동안 유지됩니다.
                        travelTimeInSeconds = arrivalTimeInSeconds - currentTimeInSeconds;
                    } else {
                        // 수동 입력 시간이 유효하지 않으면 기본 로직 사용
                        arrivalTimeInSeconds = currentTimeInSeconds + travelTimeInSeconds;
                    }
                } catch(e) {
                     arrivalTimeInSeconds = currentTimeInSeconds + travelTimeInSeconds;
                }
            } else {
                arrivalTimeInSeconds = currentTimeInSeconds + travelTimeInSeconds;
            }
    
            // 3. 작업 시간 계산
            workTimeInSeconds = agency ? this.calculateWorkTime(stop, agency) : 0;
            let actualWorkTimeInSeconds = (stop.actualWorkTimeInSeconds !== undefined && stop.actualWorkTimeInSeconds !== null)
                ? Number(stop.actualWorkTimeInSeconds) : workTimeInSeconds;
    
            // 4. 출발 시간 결정
            if (stop.manualDepartureTime && isBaseTimeValid) {
                try {
                    const [depH, depM] = stop.manualDepartureTime.split(':');
                    const manualDepartureDate = new Date(`2000-01-01T${depH.padStart(2, '0')}:${depM.padStart(2, '0')}:00`);
                    
                     if (!isNaN(manualDepartureDate)) {
                        departureTimeInSeconds = (manualDepartureDate.getTime() - baseTime.getTime()) / 1000;
                        // 수동 출발 시간이 있으면, 작업 시간을 역산 (표시용)
                        actualWorkTimeInSeconds = departureTimeInSeconds - arrivalTimeInSeconds;
                    } else {
                        departureTimeInSeconds = arrivalTimeInSeconds + actualWorkTimeInSeconds;
                    }
                } catch (e) {
                    departureTimeInSeconds = arrivalTimeInSeconds + actualWorkTimeInSeconds;
                }
            } else {
                departureTimeInSeconds = arrivalTimeInSeconds + actualWorkTimeInSeconds;
            }

            // 실제 작업 시간을 결정 (수동 입력이나 기록이 있으면 해당 값, 아니면 추정값)
            const finalWorkTime = (stop.manualDepartureTime || (stop.actualWorkTimeInSeconds !== undefined && stop.actualWorkTimeInSeconds !== null))
                ? actualWorkTimeInSeconds : workTimeInSeconds;

            // [Request 4] 비정상적인 값 확인 (코스 작성 및 스케줄 계산 시)
            // 이동시간이 0보다 작거나 5시간(18000초)을 초과하는 경우
            const isAbnormalTravelTime = travelTimeInSeconds < 0 || travelTimeInSeconds > 18000;
            // 작업시간이 0보다 작거나 3시간(10800초)을 초과하는 경우
            const isAbnormalWorkTime = actualWorkTimeInSeconds < 0 || actualWorkTimeInSeconds > 10800;
    
            stopsWithTimes.push({
                ...stop,
                agency,
                predictedTravelTimeInSeconds, // 예측 이동 시간(평균)
                travelTimeInSeconds,
                arrivalTimeInSeconds,
                workTimeInSeconds, // 순수 계산된 작업 시간
                actualWorkTimeInSeconds: finalWorkTime, // 수동 출발시간에 의해 변경된 작업시간 또는 실제 기록된 작업시간
                departureTimeInSeconds,
                isPathDataComplete: this.isPathDataComplete(stop, stops[index + 1], travelTimes),
                isAbnormalTravelTime,
                isAbnormalWorkTime,
                isArrivalEditable: true,
                isDepartureEditable: true
            });
    
            // 다음 루프를 위해 현재 시간과 위치 업데이트
            currentTimeInSeconds = departureTimeInSeconds;
            prevAgencyId = stop.agencyId;
        });
    
        return stopsWithTimes;
    }

    // 경로 데이터 완성도 확인
    static isPathDataComplete(currentStop, nextStop, travelTimes) {
        if (!currentStop.agencyId) return false;
        
        const fromId = currentStop.agencyId;
        const toId = nextStop ? nextStop.agencyId : this.ASAN_FACTORY.id;
        
        return this.getTravelTime(fromId, toId, travelTimes) !== null;
    }

    // 총계 계산
    static calculateTotals(stopsWithTimes) {
        // [Request 2] 총계 연산 값이 정상적인지 확인 (NaN 방지 및 실제 값 우선)
        const totalTravelTime = stopsWithTimes.reduce((sum, stop) => sum + (Number(stop.travelTimeInSeconds) || 0), 0);
        // actualWorkTimeInSeconds가 계산된 최종 작업시간을 담고 있으므로 이를 합산합니다.
        const totalWorkTime = stopsWithTimes.reduce((sum, stop) => sum + (Number(stop.actualWorkTimeInSeconds) || 0), 0);

        return {
            totalTravelTime,
            totalWorkTime
        };
    }

    // 코스별 회전 계산
    static getRotationsForDay(editableStops, courses, selectedCourseOrder) {
        const rotations = [];
        
        // 선택된 코스 순서대로 처리
        selectedCourseOrder.forEach(courseId => {
            const course = courses.find(c => c.id === courseId);
            if (!course) return;

            const stopsInCourse = editableStops.filter(stop => stop.courseId === courseId);
            if (stopsInCourse.length > 0) {
                rotations.push({
                    course,
                    stops: stopsInCourse
                });
            }
        });

        // 코스 미지정 경유지 처리
        const unassignedStops = editableStops.filter(stop => 
            stop.courseId === null || !selectedCourseOrder.includes(stop.courseId)
        );
        
        if (unassignedStops.length > 0) {
            rotations.push({
                course: { id: null, name: '코스 미지정' },
                stops: unassignedStops
            });
        }

        return rotations;
    }

    // 'HH:MM' 형식의 시간 문자열을 자정부터의 분으로 변환
    static timeStringToMinutes(timeStr) {
        if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
            return null;
        }
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    // 보정된 이동 시간을 기반으로 평균 이동 시간을 업데이트
    static updateAverageTravelTimes(recordedTimes, existingTravelTimes, routeStops, factoryId) {
        const updatedTravelTimes = { ...existingTravelTimes };
        
        // 전체 경로 구성 (공장 -> 경유지들 -> 공장)
        // 그룹핑된 대리점 처리: 같은 그룹 내의 연속된 경유지는 이동 시간이 0이므로 건너뜀
        const fullRouteIds = [factoryId];
        let prevGroupId = null;
        
        for (const stop of routeStops) {
            // 같은 그룹 내의 연속된 경유지는 경로에 추가하지 않음 (이동 시간이 0이므로)
            if (stop.groupId && prevGroupId === stop.groupId) {
                continue;
            }
            fullRouteIds.push(stop.agencyId);
            prevGroupId = stop.groupId;
        }
        fullRouteIds.push(factoryId);

        for (let i = 0; i < fullRouteIds.length - 1; i++) {
            const fromId = fullRouteIds[i];
            const toId = fullRouteIds[i + 1];

            if (!fromId || !toId) continue;

            const fromRecord = recordedTimes[fromId];
            const toRecord = recordedTimes[toId];

            if (!fromRecord?.departure || !toRecord?.arrival) {
                continue; // 출발 또는 도착 시간이 기록되지 않았으면 건너뜀
            }

            const departureMinutes = this.timeStringToMinutes(fromRecord.departure);
            const arrivalMinutes = this.timeStringToMinutes(toRecord.arrival);

            if (departureMinutes === null || arrivalMinutes === null) {
                continue;
            }

            let newTravelTime = arrivalMinutes - departureMinutes;
            if (newTravelTime < 0) {
                newTravelTime += 24 * 60; // 자정을 넘는 경우 처리
            }
            
            // 1분 미만이거나 300분(5시간)을 초과하는 이동 시간은 비정상적인 데이터로 간주하여 무시합니다.
            if (newTravelTime < 1 || newTravelTime > 300) {
                continue;
            }

            const key1 = `${fromId}-${toId}`;
            const key2 = `${toId}-${fromId}`;

            const oldAverageTime = updatedTravelTimes[key1];

            let newAverage;
            if (oldAverageTime !== undefined && oldAverageTime !== null) {
                // 1. 기존 평균값이 비정상(300분 초과)인 경우, 새로운 정상 측정값으로 즉시 보정(초기화)합니다.
                if (oldAverageTime > 300) {
                    newAverage = newTravelTime;
                } else {
                    const difference = Math.abs(newTravelTime - oldAverageTime);

                    // 2. 만약 새로 측정된 시간과 기존 평균의 차이가 60분을 초과하면,
                    // 단일 측정값이 전체 평균에 미치는 영향을 줄이기 위해 가중 평균을 사용합니다. (기존 70%, 신규 30%)
                    if (difference > 60) {
                        newAverage = Math.round((oldAverageTime * 0.7) + (newTravelTime * 0.3));
                    } else {
                        // 3. 차이가 크지 않으면 기존처럼 50/50 평균을 사용합니다.
                        newAverage = Math.round((oldAverageTime + newTravelTime) / 2);
                    }
                }
            } else {
                // 기존 기록이 없으면 새 측정값을 그대로 사용
                newAverage = newTravelTime;
            }
            
            // 양방향으로 새로운 평균 시간 업데이트
            updatedTravelTimes[key1] = newAverage;
            updatedTravelTimes[key2] = newAverage;
        }

        return updatedTravelTimes;
    }

    // 거리 유형 계산
    static calculateDistanceType(scheduleStops, courseIdsInSchedule, allCourses) {
        let hasMidRangeAgency = false;
        let hasLongRangeAgency = false;

        // 대리점 타입 확인
        for (const stop of scheduleStops) {
            const agency = App.state.cache.agenciesMap.get(stop.agencyId);
            if (agency) {
                if (agency.type === '초장거리') hasLongRangeAgency = true;
                if (agency.type === '중장거리') hasMidRangeAgency = true;
            }
        }

        // 코스별 기준 확인
        let minStopsForMidRange = null;
        let minStopsForLongRange = null;

        if (courseIdsInSchedule.size > 0) {
            let currentMidMin = Infinity;
            let currentLongMin = Infinity;

            courseIdsInSchedule.forEach(courseId => {
                const course = allCourses.find(c => c.id === courseId);
                if (course) {
                    if (course.midRangeMinStops != null && course.midRangeMinStops < currentMidMin) {
                        currentMidMin = course.midRangeMinStops;
                    }
                    if (course.longRangeMinStops != null && course.longRangeMinStops < currentLongMin) {
                        currentLongMin = course.longRangeMinStops;
                    }
                }
            });

            if (currentMidMin !== Infinity) minStopsForMidRange = currentMidMin;
            if (currentLongMin !== Infinity) minStopsForLongRange = currentLongMin;
        }

        // 경유지 9개 이상 시 '중장거리'로 자동 변환되던 기본값(fallback) 로직 제거
        // if (minStopsForMidRange === null) minStopsForMidRange = 9;
        if (hasLongRangeAgency || (minStopsForLongRange !== null && scheduleStops.length >= minStopsForLongRange)) return '초장거리';
        if (hasMidRangeAgency || (minStopsForMidRange !== null && scheduleStops.length >= minStopsForMidRange)) return '중장거리';

        return null;
    }
}