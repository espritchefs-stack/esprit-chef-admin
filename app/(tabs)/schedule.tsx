import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Pressable, Linking, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

// ── 구글 시트 설정 (웹사이트와 동일한 Sheet ID) ──
const SHEET_ID = '1OFObW7mNGFoXRXeIVfwW5BmqrGeAXA383fHzrH6wYXE';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

// ── 수업 타입 컬러 (웹사이트와 동일) ──
const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  foundation:  { bg: 'rgba(186,151,97,0.15)',  text: '#BA9761', dot: '#BA9761' },
  world:       { bg: 'rgba(99,160,200,0.15)',   text: '#63A0C8', dot: '#63A0C8' },
  competition: { bg: 'rgba(200,100,100,0.15)',  text: '#C86464', dot: '#C86464' },
  professional:{ bg: 'rgba(212,140,80,0.15)',   text: '#D48C50', dot: '#D48C50' },
  special:     { bg: 'rgba(140,180,120,0.15)',  text: '#8CB478', dot: '#8CB478' },
  external:    { bg: 'rgba(160,130,200,0.15)',  text: '#A082C8', dot: '#A082C8' },
  closed:      { bg: 'rgba(100,100,100,0.15)',  text: '#888888', dot: '#888888' },
};

const TYPE_LABELS: Record<string, string> = {
  foundation:  '파운데이션 기초반',
  world:       '월드퀴진 중급반',
  competition: '국제대회반',
  professional:'전문요리반',
  special:     '기업특강',
  external:    '외부강의',
  closed:      '휴강',
};

const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

type ClassEntry = { time: string; className: string; menu: string; note: string };
type ScheduleData = Record<string, ClassEntry[]>;

// ── 유틸 ──
function getMonday(d: Date): Date {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  return dt;
}
function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function classifyType(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('대회') || n.includes('competition')) return 'competition';
  if (n.includes('전문')) return 'professional';
  if (n.includes('세계') || n.includes('world') || n.includes('중급') || n.includes('월드')) return 'world';
  if (n.includes('파운데이션') || n.includes('기초')) return 'foundation';
  if (n.includes('외부강의') || n.includes('외부')) return 'external';
  if (n.includes('특별') || n.includes('special') || n.includes('케이터링') || n.includes('특강')) return 'special';
  if (n.includes('휴강') || n.includes('closed')) return 'closed';
  return 'foundation';
}

// ── 구글 시트 파싱 ──
function parseSheet(raw: string): ScheduleData {
  try {
    const jsonStr = raw.replace(/^[^(]+\(/, '').replace(/\);\s*$/, '');
    const json = JSON.parse(jsonStr);
    const rows = json.table?.rows || [];
    const result: ScheduleData = {};

    rows.forEach((row: any) => {
      const cols = row.c || [];
      if (!cols[0]?.v && !cols[0]?.f) return;

      let dateKey = '';
      const rawDate = cols[0]?.f || cols[0]?.v;
      if (typeof rawDate === 'string') {
        const clean = rawDate.replace(/\./g, '-').replace(/\//g, '-').trim();
        const parts = clean.split('-').map((s: string) => s.trim());
        if (parts.length === 3) {
          const y = parts[0].length === 4 ? parts[0] : `20${parts[0]}`;
          const m = String(parseInt(parts[1])).padStart(2, '0');
          const d = String(parseInt(parts[2])).padStart(2, '0');
          dateKey = `${y}-${m}-${d}`;
        }
      }
      if (!dateKey && cols[0]?.v) {
        try {
          const str = JSON.stringify(cols[0].v);
          const match = str.match(/Date\((\d+),(\d+),(\d+)\)/);
          if (match) {
            dateKey = `${match[1]}-${String(+match[2] + 1).padStart(2, '0')}-${String(+match[3]).padStart(2, '0')}`;
          }
        } catch (e) {}
      }
      if (!dateKey) return;

      const entry: ClassEntry = {
        time: (cols[1]?.v || cols[1]?.f || '').toString().trim(),
        className: (cols[2]?.v || '').toString().trim(),
        menu: (cols[3]?.v || '').toString().trim(),
        note: (cols[4]?.v || '').toString().trim(),
      };
      if (!entry.className && !entry.menu) return;
      if (!result[dateKey]) result[dateKey] = [];
      result[dateKey].push(entry);
    });
    return result;
  } catch (e) {
    return {};
  }
}

// ── 컴포넌트 ──
export default function ScheduleScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  const [scheduleData, setScheduleData] = useState<ScheduleData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getMonday(new Date()));
  const [view, setView] = useState<'week' | 'month'>('week');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const kakaoUrl = 'http://pf.kakao.com/_BxeTqj/chat';

  // ── 구글 시트 fetch ──
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`${SHEET_URL}&_=${Date.now()}`);
        const raw = await res.text();
        setScheduleData(parseSheet(raw));
      } catch (e) {
        console.error('Schedule fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // ── 주간 이동 ──
  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  // ── 주 라벨 ──
  const weekDiff = Math.round((currentWeekStart.getTime() - getMonday(new Date()).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const weekLabel = weekDiff === 0 ? '이번 주' : weekDiff === -1 ? '지난 주' : weekDiff === 1 ? '다음 주' : weekDiff > 1 ? `${weekDiff}주 후` : `${Math.abs(weekDiff)}주 전`;
  const weekEnd = new Date(currentWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const weekRange = `${currentWeekStart.getMonth() + 1}/${currentWeekStart.getDate()} (월) — ${weekEnd.getMonth() + 1}/${weekEnd.getDate()} (일)`;

  // ── 월별 데이터 정렬 ──
  const monthEntries = Object.entries(scheduleData)
    .filter(([key]) => new Date(key) >= today || toKey(today) === key)
    .sort(([a], [b]) => a.localeCompare(b));

  const byMonth: Record<string, { key: string; date: Date; classes: ClassEntry[] }[]> = {};
  monthEntries.forEach(([key, classes]) => {
    const d = new Date(key);
    const mk = `${d.getFullYear()}-${d.getMonth() + 1}`;
    if (!byMonth[mk]) byMonth[mk] = [];
    byMonth[mk].push({ key, date: d, classes });
  });

  // ── 주간 카드 렌더 ──
  const renderWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      if (i === 5) continue; // 토요일 건너뜀 (웹과 동일하게 조정 가능)
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      const key = toKey(day);
      const classes = scheduleData[key] || [];
      const isToday = sameDay(day, today);
      const isPast = day < today && !isToday;

      days.push(
        <View
          key={key}
          style={[
            styles.dayCard,
            { borderColor: isToday ? 'rgba(202,168,118,0.35)' : 'rgba(255,255,255,0.07)' },
            isToday && { backgroundColor: 'rgba(202,168,118,0.06)' },
            isPast && { opacity: 0.5 },
          ]}
        >
          {/* 날짜 헤더 */}
          <View style={styles.dayHeader}>
            <View>
              <ThemedText style={[styles.dayName, isToday && { color: '#CAA876' }]}>
                {DAY_FULL[day.getDay()]}
              </ThemedText>
              <ThemedText style={[styles.dayNum, isToday && { color: '#CAA876' }]}>
                {day.getDate()}
              </ThemedText>
            </View>
            {isToday && (
              <View style={styles.todayBadge}>
                <ThemedText style={styles.todayBadgeText}>오늘</ThemedText>
              </View>
            )}
          </View>

          {/* 수업 목록 */}
          {isLoading ? (
            <View style={styles.shimmer} />
          ) : classes.length === 0 ? (
            <ThemedText style={styles.noClass}>수업 없음</ThemedText>
          ) : (
            classes.map((cls, idx) => {
              const type = classifyType(cls.className);
              const color = TYPE_COLORS[type];
              return (
                <View key={idx} style={styles.classItem}>
                  <View style={styles.classChipRow}>
                    <View style={[styles.classDot, { backgroundColor: color.dot }]} />
                    <View style={[styles.classChip, { backgroundColor: color.bg }]}>
                      <ThemedText style={[styles.classChipText, { color: color.text }]}>
                        {TYPE_LABELS[type]}
                      </ThemedText>
                    </View>
                    {!!cls.time && (
                      <ThemedText style={styles.classTime}>{cls.time}</ThemedText>
                    )}
                  </View>
                  {!!cls.menu && cls.menu !== '비공개' && (
                    <ThemedText style={styles.classMenu}>{cls.menu}</ThemedText>
                  )}
                  {cls.menu === '비공개' && (
                    <ThemedText style={styles.classSecret}>🔒 커리큘럼 비공개</ThemedText>
                  )}
                  {!!cls.note && cls.note !== '커리큘럼 사전 비공개' && (
                    <ThemedText style={styles.classNote}>{cls.note}</ThemedText>
                  )}
                </View>
              );
            })
          )}
        </View>
      );
    }
    return days;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* 헤더 */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.headerTitle}>CLASS SCHEDULE</ThemedText>
        <ThemedText style={styles.headerSub}>에스프릿셰프 수업 일정</ThemedText>
      </View>

      {/* 뷰 탭 */}
      <View style={[styles.tabRow, { borderBottomColor: borderColor }]}>
        <TouchableOpacity
          style={[styles.tab, view === 'week' && styles.tabActive]}
          onPress={() => setView('week')}
        >
          <ThemedText style={[styles.tabText, view === 'week' && styles.tabTextActive]}>
            주간
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'month' && styles.tabActive]}
          onPress={() => setView('month')}
        >
          <ThemedText style={[styles.tabText, view === 'month' && styles.tabTextActive]}>
            전체 일정
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* 주간 뷰 */}
      {view === 'week' && (
        <>
          {/* 주 이동 컨트롤 */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={prevWeek} style={styles.navBtn}>
              <IconSymbol name="chevron.left" size={18} color={textColor} />
            </TouchableOpacity>
            <View style={styles.weekLabelBlock}>
              <ThemedText style={styles.weekLabel}>{weekLabel}</ThemedText>
              <ThemedText style={styles.weekRange}>{weekRange}</ThemedText>
            </View>
            <TouchableOpacity onPress={nextWeek} style={styles.navBtn}>
              <IconSymbol name="chevron.right" size={18} color={textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.weekScroll}
            showsVerticalScrollIndicator={false}
          >
            {renderWeekDays()}
          </ScrollView>
        </>
      )}

      {/* 전체 일정 뷰 */}
      {view === 'month' && (
        <ScrollView contentContainerStyle={styles.monthScroll} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#CAA876" style={{ marginTop: 60 }} />
          ) : Object.keys(byMonth).length === 0 ? (
            <View style={styles.emptyBox}>
              <ThemedText style={styles.emptyText}>등록된 일정이 없습니다.</ThemedText>
            </View>
          ) : (
            Object.entries(byMonth).map(([mk, days]) => {
              const [y, m] = mk.split('-');
              return (
                <View key={mk} style={styles.monthGroup}>
                  <ThemedText style={styles.monthLabel}>{y}년 {m}월</ThemedText>
                  <View style={[styles.monthCard, { borderColor: 'rgba(255,255,255,0.07)' }]}>
                    {days.map(({ key, date, classes }) => {
                      const isToday = sameDay(date, today);
                      return classes.map((cls, idx) => {
                        const type = classifyType(cls.className);
                        const color = TYPE_COLORS[type];
                        return (
                          <View
                            key={`${key}-${idx}`}
                            style={[
                              styles.monthRow,
                              { borderBottomColor: 'rgba(255,255,255,0.05)' },
                              isToday && { backgroundColor: 'rgba(202,168,118,0.05)' },
                            ]}
                          >
                            {idx === 0 ? (
                              <View style={styles.dateBadge}>
                                <ThemedText style={[styles.dateNum, isToday && { color: '#CAA876' }]}>
                                  {date.getDate()}
                                </ThemedText>
                                <ThemedText style={[styles.dateDow, isToday && { color: 'rgba(202,168,118,0.7)' }]}>
                                  {DAY_KO[date.getDay()]}
                                </ThemedText>
                              </View>
                            ) : (
                              <View style={styles.dateBadge} />
                            )}
                            <View style={styles.monthClassInfo}>
                              <View style={styles.classChipRow}>
                                <View style={[styles.classChip, { backgroundColor: color.bg }]}>
                                  <ThemedText style={[styles.classChipText, { color: color.text }]}>
                                    {TYPE_LABELS[type]}
                                  </ThemedText>
                                </View>
                                {!!cls.time && (
                                  <ThemedText style={styles.classTime}>{cls.time}</ThemedText>
                                )}
                                {isToday && idx === 0 && (
                                  <View style={styles.todayBadge}>
                                    <ThemedText style={styles.todayBadgeText}>오늘</ThemedText>
                                  </View>
                                )}
                              </View>
                              {!!cls.menu && cls.menu !== '비공개' && (
                                <ThemedText style={styles.classMenu}>{cls.menu}</ThemedText>
                              )}
                              {cls.menu === '비공개' && (
                                <ThemedText style={styles.classSecret}>🔒 커리큘럼 비공개</ThemedText>
                              )}
                            </View>
                          </View>
                        );
                      });
                    })}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* 카카오 상담 버튼 */}
      <Pressable
        style={({ pressed }) => [styles.kakaoButton, pressed && { opacity: 0.85 }]}
        onPress={() => Linking.openURL(kakaoUrl).catch(console.error)}
      >
        <ThemedText style={styles.kakaoButtonText}>셰프님과 1:1 상담 및 예약하기</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 4,
    color: '#CAA876',
  },
  headerSub: {
    fontSize: 11,
    letterSpacing: 1,
    opacity: 0.4,
    marginTop: 4,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(202,168,118,0.1)',
    borderColor: 'rgba(202,168,118,0.25)',
  },
  tabText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#CAA876',
  },

  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabelBlock: { flex: 1, alignItems: 'center' },
  weekLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekRange: {
    fontSize: 11,
    opacity: 0.4,
    marginTop: 2,
  },

  weekScroll: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },

  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 11,
    opacity: 0.45,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayNum: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: 'rgba(202,168,118,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(202,168,118,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  todayBadgeText: {
    fontSize: 11,
    color: '#CAA876',
    fontWeight: '600',
  },

  shimmer: {
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginTop: 4,
  },
  noClass: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },

  classItem: { marginTop: 8, gap: 3 },
  classChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  classDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  classChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  classTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  classMenu: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
    marginLeft: 2,
  },
  classSecret: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.28)',
    marginLeft: 2,
  },
  classNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
    marginLeft: 2,
  },

  // 전체 일정
  monthScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  monthGroup: { marginBottom: 24 },
  monthLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CAA876',
    letterSpacing: 1,
    marginBottom: 8,
  },
  monthCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  dateBadge: {
    width: 40,
    alignItems: 'center',
  },
  dateNum: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 22,
  },
  dateDow: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  monthClassInfo: { flex: 1, gap: 4 },

  emptyBox: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.3,
  },

  kakaoButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CAA876',
    shadowColor: '#CAA876',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  kakaoButtonText: {
    fontSize: 14,
    color: '#0A2342',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
