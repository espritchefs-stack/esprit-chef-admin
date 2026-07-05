import React, { useCallback, useState } from 'react';
import {
  StyleSheet, View, ScrollView, ActivityIndicator, Pressable, Alert,
  TextInput, RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/auth';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

const GOLD = '#CAA876';

type Enrollment = {
  id: string;
  class_type: string;
  cohort_label: string;
  status: string;
};

type Session = {
  id: string;
  session_date: string;
  week_label: string | null;
  note: string | null;
  recipe_ids: number[];
  photos: { id: string; signedUrl: string | null; caption: string | null }[];
  recipes: { id: number; title_ko: string | null }[];
};

export default function MyClassScreen() {
  const { session, isGuest } = useAuth();
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState<Enrollment | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const loadSessions = useCallback(async (enrollment: Enrollment) => {
    const { data: sessionRows } = await supabase
      .from('class_sessions')
      .select('id, session_date, week_label, note, recipe_ids')
      .eq('class_type', enrollment.class_type)
      .eq('cohort_label', enrollment.cohort_label)
      .order('session_date', { ascending: true });

    const rows = sessionRows || [];

    // 회차별 사진 (private 버킷 → signed URL) + 연결 레시피
    const sessionIds = rows.map(r => r.id);
    const photosBySession: Record<string, Session['photos']> = {};
    if (sessionIds.length > 0) {
      const { data: photoRows } = await supabase
        .from('session_photos')
        .select('id, session_id, image_url, caption, sort_order')
        .in('session_id', sessionIds)
        .order('sort_order', { ascending: true });
      for (const p of photoRows || []) {
        const { data: signed } = await supabase.storage
          .from('session-photos')
          .createSignedUrl(p.image_url, 3600);
        (photosBySession[p.session_id] ||= []).push({
          id: p.id,
          signedUrl: signed?.signedUrl ?? null,
          caption: p.caption,
        });
      }
    }

    const allRecipeIds = [...new Set(rows.flatMap(r => r.recipe_ids || []))];
    let recipeMap: Record<number, { id: number; title_ko: string | null }> = {};
    if (allRecipeIds.length > 0) {
      const { data: recipeRows } = await supabase
        .from('recipes')
        .select('id, title_ko')
        .in('id', allRecipeIds);
      for (const r of recipeRows || []) recipeMap[r.id] = r;
    }

    setSessions(rows.map(r => ({
      ...r,
      recipe_ids: r.recipe_ids || [],
      photos: photosBySession[r.id] || [],
      recipes: (r.recipe_ids || []).map((id: number) => recipeMap[id]).filter(Boolean),
    })));
  }, []);

  const loadAll = useCallback(async () => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('enrollments')
        .select('id, class_type, cohort_label, status')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      const list = data || [];
      setEnrollments(list);
      const active = list[0] || null;
      setSelected(active);
      if (active) await loadSessions(active);
      else setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, loadSessions]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleRedeem = async () => {
    if (!code.trim()) return;
    if (!session?.user?.id) {
      Alert.alert('로그인 필요', '가입 코드 등록은 이메일 계정 로그인 후 가능합니다.');
      return;
    }
    setIsRedeeming(true);
    try {
      const { data, error } = await supabase.rpc('redeem_class_code', { input_code: code });
      if (error) throw error;
      if (data?.success) {
        Alert.alert('등록 완료', `${data.cohort_label}에 등록되었습니다. 환영합니다!`);
        setCode('');
        await loadAll();
      } else {
        Alert.alert('코드 오류', '유효하지 않은 코드입니다. 수업 때 안내받은 코드를 확인해주세요.');
      }
    } catch (e: any) {
      Alert.alert('오류', e.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={loadAll} tintColor={GOLD} />}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={20} color={textColor} />
        <ThemedText style={styles.backText}>뒤로</ThemedText>
      </Pressable>

      <ThemedText style={styles.pageLabel}>수강생 전용</ThemedText>
      <ThemedText type="title" style={styles.pageTitle}>내 수업</ThemedText>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={GOLD} /></View>
      ) : !session?.user?.id ? (
        // 게스트/비로그인
        <View style={[styles.emptyCard, { borderColor }]}>
          <ThemedText style={styles.emptyTitle}>수강생이신가요?</ThemedText>
          <ThemedText style={styles.emptyDesc}>
            {isGuest
              ? '게스트 모드에서는 내 수업 기록을 이용할 수 없습니다.\n이메일 계정으로 가입 후 수업 때 안내받은 가입 코드를 입력해주세요.'
              : '로그인 후 수업 때 안내받은 가입 코드를 입력하면\n내 수업의 자료·사진·복습 기록이 열립니다.'}
          </ThemedText>
        </View>
      ) : (
        <>
          {/* 수강 반 선택 (복수 등록 시) */}
          {enrollments.length > 1 && (
            <View style={styles.cohortRow}>
              {enrollments.map(e => (
                <Pressable
                  key={e.id}
                  onPress={async () => { setSelected(e); setIsLoading(true); await loadSessions(e); setIsLoading(false); }}
                  style={[styles.cohortChip, selected?.id === e.id && styles.cohortChipActive]}
                >
                  <ThemedText style={[styles.cohortChipText, selected?.id === e.id && { color: '#000' }]}>
                    {e.cohort_label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {selected ? (
            <>
              <View style={[styles.cohortHeader, { borderColor }]}>
                <ThemedText style={styles.cohortTitle}>{selected.cohort_label}</ThemedText>
                <ThemedText style={styles.cohortMeta}>
                  전체 {sessions.length}회 · {sessions.filter(s => s.session_date <= today).length}회 진행
                </ThemedText>
              </View>

              {/* 회차 타임라인 */}
              {sessions.map((s) => {
                const isPast = s.session_date <= today;
                return (
                  <View key={s.id} style={[styles.sessionCard, { borderColor }, !isPast && { opacity: 0.55 }]}>
                    <View style={styles.sessionHeaderRow}>
                      <ThemedText style={styles.sessionDate}>
                        {s.session_date.slice(5).replace('-', '.')}
                      </ThemedText>
                      {!isPast && <ThemedText style={styles.upcomingBadge}>예정</ThemedText>}
                    </View>
                    <ThemedText style={styles.sessionWeek}>{s.week_label || '수업'}</ThemedText>

                    {s.note ? (
                      <View style={styles.noteBox}>
                        <ThemedText style={styles.noteLabel}>셰프 노트</ThemedText>
                        <ThemedText style={styles.noteText}>{s.note}</ThemedText>
                      </View>
                    ) : null}

                    {/* 그날의 사진 */}
                    {s.photos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                        {s.photos.map(p => p.signedUrl && (
                          <Image key={p.id} source={{ uri: p.signedUrl }} style={styles.photo} contentFit="cover" />
                        ))}
                      </ScrollView>
                    )}

                    {/* 그날의 레시피 */}
                    {s.recipes.map(r => (
                      <Pressable
                        key={r.id}
                        onPress={() => router.push(`/recipe/${r.id}`)}
                        style={[styles.recipeLink, { borderColor }]}
                      >
                        <IconSymbol name="doc.text" size={14} color={GOLD} />
                        <ThemedText style={styles.recipeLinkText} numberOfLines={1}>{r.title_ko}</ThemedText>
                        <ThemedText style={{ color: GOLD }}>›</ThemedText>
                      </Pressable>
                    ))}

                    {isPast && s.photos.length === 0 && s.recipes.length === 0 && (
                      <ThemedText style={styles.emptySession}>자료 준비 중입니다.</ThemedText>
                    )}
                  </View>
                );
              })}
            </>
          ) : (
            <View style={[styles.emptyCard, { borderColor }]}>
              <ThemedText style={styles.emptyTitle}>등록된 수업이 없습니다</ThemedText>
              <ThemedText style={styles.emptyDesc}>
                수업 때 안내받은 가입 코드를 입력하면{'\n'}내 수업의 자료·사진·복습 기록이 열립니다.
              </ThemedText>
            </View>
          )}

          {/* 가입 코드 입력 */}
          <View style={[styles.codeBox, { borderColor }]}>
            <ThemedText style={styles.codeLabel}>
              {selected ? '다른 반 가입 코드 등록' : '가입 코드 입력'}
            </ThemedText>
            <View style={styles.codeRow}>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="예: BANCHAN1"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="characters"
                style={[styles.codeInput, { borderColor, color: textColor }]}
              />
              <Pressable
                onPress={handleRedeem}
                disabled={isRedeeming}
                style={[styles.codeButton, isRedeeming && { opacity: 0.6 }]}
              >
                {isRedeeming
                  ? <ActivityIndicator size="small" color="#000" />
                  : <ThemedText style={styles.codeButtonText}>등록</ThemedText>}
              </Pressable>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 72, paddingBottom: 80 },
  center: { paddingVertical: 60, alignItems: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, gap: 8, opacity: 0.5 },
  backText: { fontSize: 10, letterSpacing: 2 },
  pageLabel: { fontSize: 10, letterSpacing: 4, color: GOLD, marginBottom: 8 },
  pageTitle: { marginBottom: 28 },
  cohortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  cohortChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(202,168,118,0.4)',
  },
  cohortChipActive: { backgroundColor: GOLD },
  cohortChipText: { fontSize: 12 },
  cohortHeader: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 24 },
  cohortTitle: { fontSize: 22, fontWeight: '600', color: GOLD },
  cohortMeta: { fontSize: 12, opacity: 0.5, marginTop: 6, letterSpacing: 1 },
  sessionCard: { borderWidth: 1, borderRadius: 14, padding: 18, marginBottom: 16 },
  sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { fontSize: 11, letterSpacing: 2, opacity: 0.5 },
  upcomingBadge: {
    fontSize: 10, letterSpacing: 1, color: GOLD,
    borderWidth: 1, borderColor: 'rgba(202,168,118,0.4)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden',
  },
  sessionWeek: { fontSize: 15, fontWeight: '600', marginTop: 8, lineHeight: 22 },
  noteBox: {
    marginTop: 12, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(202,168,118,0.07)',
  },
  noteLabel: { fontSize: 9, letterSpacing: 2, color: GOLD, marginBottom: 6 },
  noteText: { fontSize: 13, lineHeight: 20, opacity: 0.85 },
  photoRow: { marginTop: 14 },
  photo: { width: 130, height: 130, borderRadius: 10, marginRight: 10 },
  recipeLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12,
  },
  recipeLinkText: { flex: 1, fontSize: 13 },
  emptySession: { fontSize: 12, opacity: 0.4, marginTop: 12 },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: GOLD },
  emptyDesc: { fontSize: 13, lineHeight: 21, opacity: 0.7, textAlign: 'center' },
  codeBox: { borderWidth: 1, borderRadius: 14, padding: 18, marginTop: 24 },
  codeLabel: { fontSize: 10, letterSpacing: 2, color: GOLD, marginBottom: 12 },
  codeRow: { flexDirection: 'row', gap: 10 },
  codeInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, letterSpacing: 1,
  },
  codeButton: {
    backgroundColor: GOLD, borderRadius: 10, paddingHorizontal: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  codeButtonText: { color: '#000', fontWeight: '600', fontSize: 13, letterSpacing: 1 },
});
