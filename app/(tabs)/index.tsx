import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator, Pressable, Linking, TouchableOpacity, FlatList, ScrollView, TextInput } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAuth } from '@/ctx/auth';

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [featuredRecipe, setFeaturedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Foundation');
  const [selectedCourse, setSelectedCourse] = useState<'A코스' | 'B코스'>('A코스');
  // 퀴진 서브탭은 데이터에서 동적 생성 (중급·전문 공용, 많은 순 정렬)
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const cuisinesFor = (cat: string) => {
    const counts: Record<string, number> = {};
    recipes.forEach(r => { if (r.category === cat && r.cuisine) counts[r.cuisine] = (counts[r.cuisine] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  };
  const cuisineTabs = (selectedCategory === 'Intermediate' || selectedCategory === 'Professional')
    ? cuisinesFor(selectedCategory) : [];
  const activeCuisine = selectedCuisine && cuisineTabs.includes(selectedCuisine) ? selectedCuisine : cuisineTabs[0];
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllList, setShowAllList] = useState(false);
  const [myClass, setMyClass] = useState<{ cohort_label: string; nextLabel: string | null } | null>(null);

  // 내 수업 카드: 최근 enrollment + 다가오는 회차
  useEffect(() => {
    async function fetchMyClass() {
      if (!session?.user?.id) { setMyClass(null); return; }
      const { data: enr } = await supabase
        .from('enrollments')
        .select('class_type, cohort_label')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      const e = enr?.[0];
      if (!e) { setMyClass(null); return; }
      const today = new Date().toISOString().slice(0, 10);
      const { data: next } = await supabase
        .from('class_sessions')
        .select('session_date, week_label')
        .eq('class_type', e.class_type)
        .eq('cohort_label', e.cohort_label)
        .gte('session_date', today)
        .order('session_date', { ascending: true })
        .limit(1);
      const n = next?.[0];
      setMyClass({
        cohort_label: e.cohort_label,
        nextLabel: n ? `다음 수업 ${n.session_date.slice(5).replace('-', '.')} · ${n.week_label ?? ''}` : null,
      });
    }
    fetchMyClass();
  }, [session]);

  useEffect(() => {
    async function fetchRecipes() {
      setIsLoading(true);
      try {
        // Fetch standard recipes
        const { data: standardData, error: standardError } = await supabase.from('recipes').select('*').order('cooking_method', { ascending: true }).order('week', { ascending: true }).order('id', { ascending: true });
        if (standardError) throw standardError;
        setRecipes(standardData || []);

        // Fetch featured recipe (latest one marked as featured)
        const { data: featuredData, error: featuredError } = await supabase
          .from('recipes')
          .select('*')
          .eq('is_featured', true)
          .order('id', { ascending: false })
          .limit(1)
          .single();
        
        // We do not throw an error here because finding zero rows is an expected "No featured recipe" state.
        if (!featuredError && featuredData) {
          setFeaturedRecipe(featuredData);
        }

      } catch (error) {
        console.error("Error", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipes();
  }, []);

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F0E8', dark: '#0C1D36' }}
      headerImage={
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.headerTitle}>ESPRIT</ThemedText>
          <ThemedText style={styles.headerSubtitle}>{t('header_subtitle')}</ThemedText>
        </View>
      }>

      <ThemedView style={styles.contentContainer}>

        {/* MY CLASS 카드 — 수강생 복습 허브 진입점 */}
        <TouchableOpacity
          onPress={() => router.push('/my-class')}
          activeOpacity={0.8}
          style={styles.myClassCard}
        >
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.myClassLabel}>{t('my_class_label')}</ThemedText>
            {myClass ? (
              <>
                <ThemedText style={styles.myClassTitle}>{myClass.cohort_label}</ThemedText>
                {myClass.nextLabel && (
                  <ThemedText style={styles.myClassNext} numberOfLines={1}>{myClass.nextLabel}</ThemedText>
                )}
              </>
            ) : (
              <>
                <ThemedText style={styles.myClassTitle}>수강생이신가요?</ThemedText>
                <ThemedText style={styles.myClassNext}>가입 코드를 입력하면 내 수업 기록이 열립니다</ThemedText>
              </>
            )}
          </View>
          <ThemedText style={{ color: '#CAA876', fontSize: 22 }}>›</ThemedText>
        </TouchableOpacity>

        {/* Dynamic Featured Signature Section */}
        <View style={styles.hofContainer}>
          <ThemedText style={styles.hofLabel}>{t('signature_label')}</ThemedText>
          <View style={[styles.hofCard, { borderColor }]}>
            {featuredRecipe ? (
              <>
                <Image 
                  source={{ uri: featuredRecipe.image_url }} 
                  style={styles.hofImage}
                  contentFit="cover" 
                />
                <View style={styles.hofOverlay}>
                  <ThemedText style={styles.hofDishLabel}>{featuredRecipe.title_ko || featuredRecipe.title_en}</ThemedText>
                  <ThemedText style={styles.hofUserLabel}>{featuredRecipe.category || 'Featured Collection'}</ThemedText>
                </View>
              </>
            ) : (
              <View style={[styles.hofImage, { backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText style={{ opacity: 0.5, letterSpacing: 2 }}>{t('nothing_featured')}</ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.divider, { borderBottomColor: borderColor }]} />

        {/* Classes Section */}
        <ThemedText style={styles.sectionHeader}>{t('classes_label')}</ThemedText>
        <View style={styles.classesContainer}>
          {[
            {
              level: '01',
              title: '기초요리반',
              en: 'Foundation',
              desc: '기초 원리부터 배우는 소수정예 셰프 직강. 주 1회, 12주 과정.',
              color: '#CAA876',
            },
            {
              level: '02',
              title: '중급·전문반',
              en: 'World Cuisine',
              desc: '이탈리안·프렌치·아시안 등 세계 요리 집중 심화 과정.',
              color: '#4A90D9',
            },
            {
              level: '03',
              title: '대회 출전반',
              en: 'Competition',
              desc: '기능경기대회·국제대회 출전을 목표로 하는 전문 훈련 과정.',
              color: '#E05C5C',
            },
          ].map((cls) => (
            <TouchableOpacity
              key={cls.level}
              onPress={() => Linking.openURL('https://espritchefs.com')}
              style={[styles.classCard, { borderColor }]}
              activeOpacity={0.75}
            >
              <View style={[styles.classLevelBadge, { backgroundColor: cls.color + '22', borderColor: cls.color + '55' }]}>
                <ThemedText style={[styles.classLevelText, { color: cls.color }]}>{cls.level}</ThemedText>
              </View>
              <View style={styles.classCardBody}>
                <ThemedText style={[styles.classTitle, { color: cls.color }]}>{cls.title}</ThemedText>
                <ThemedText style={styles.classEn}>{cls.en}</ThemedText>
                <ThemedText style={styles.classDesc}>{cls.desc}</ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Kakao Consultation Button */}
        <TouchableOpacity
          onPress={() => Linking.openURL('https://pf.kakao.com/_BxeTqj/chat')}
          style={styles.kakaoButton}
          activeOpacity={0.85}
        >
          <ThemedText style={styles.kakaoButtonText}>{t('kakao_consult')}</ThemedText>
        </TouchableOpacity>

        <View style={[styles.divider, { borderBottomColor: borderColor, marginTop: 40 }]} />

        <ThemedText style={styles.sectionHeader}>{t('vault_record')}</ThemedText>

        {/* 레시피 검색 — 전체 카테고리 대상 */}
        <View style={styles.searchBox}>
          <ThemedText style={{ opacity: 0.4, fontSize: 14 }}>⌕</ThemedText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search_recipes', { count: recipes.length })}
            placeholderTextColor="rgba(150,150,150,0.5)"
            style={[styles.searchInput, { color: textColor }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <ThemedText style={{ opacity: 0.4, fontSize: 16 }}>✕</ThemedText>
            </Pressable>
          )}
        </View>

        {searchQuery.trim().length > 0 ? (
          // 검색 결과 모드
          (() => {
            const q = searchQuery.trim().toLowerCase();
            const matched = recipes.filter(r =>
              (r.title_ko || '').toLowerCase().includes(q) || (r.title_en || '').toLowerCase().includes(q)
            ).slice(0, 30);
            if (matched.length === 0) {
              return (
                <View style={styles.loadingContainer}>
                  <ThemedText style={{ opacity: 0.5 }}>{t('no_results', { query: searchQuery })}</ThemedText>
                </View>
              );
            }
            return (
              <View style={styles.recipeList}>
                {matched.map(recipe => (
                  <TouchableOpacity
                    key={recipe.id}
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                    style={[styles.searchResultRow, { borderBottomColor: borderColor }]}
                    activeOpacity={0.6}
                  >
                    <Image
                      source={recipe.image_url ? { uri: recipe.image_url } : CATEGORY_COVERS[recipe.category] || CATEGORY_COVERS.Foundation}
                      style={styles.searchThumb}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.recipeTitle} numberOfLines={1}>{recipe.title_ko}</ThemedText>
                      <ThemedText style={styles.searchResultMeta}>
                        {t(`category_${(recipe.category || '').toLowerCase()}`)}{displayWeek(recipe.week) ? ` · ${displayWeek(recipe.week)}` : ''}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.recipeChevron}>›</ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })()
        ) : (
        <>
        <View style={styles.categoryRow}>
          {['Foundation', 'Intermediate', 'Professional', 'Banchan'].map((cat) => (
            <Pressable 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryButton, 
                selectedCategory === cat ? { borderBottomColor: '#CAA876' } : { borderBottomColor: 'transparent'}
              ]}
            >
              <ThemedText style={[
                styles.categoryText, 
                selectedCategory === cat ? { color: '#CAA876', fontWeight: 'bold' } : { opacity: 0.5 }
              ]}>
                {t(`category_${cat.toLowerCase()}`)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Foundation 전용 A/B 코스 서브탭 */}
        {selectedCategory === 'Foundation' && (
          <View style={styles.courseRow}>
            {(['A코스', 'B코스'] as const).map((course) => (
              <Pressable
                key={course}
                onPress={() => setSelectedCourse(course)}
                style={[styles.courseButton, selectedCourse === course && styles.courseButtonActive]}
              >
                <ThemedText style={[styles.courseText, selectedCourse === course && styles.courseTextActive]}>
                  {course === 'A코스' ? 'A  건열조리' : 'B  습열조리'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {/* 중급·전문 공용 Cuisine 서브탭 (데이터 기반 동적 생성) */}
        {cuisineTabs.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cuisineScroll}
            contentContainerStyle={styles.cuisineScrollContent}
          >
            {cuisineTabs.map((cuisine) => (
              <Pressable
                key={cuisine}
                onPress={() => setSelectedCuisine(cuisine)}
                style={[styles.cuisineButton, activeCuisine === cuisine && styles.cuisineButtonActive]}
              >
                <ThemedText style={[styles.cuisineText, activeCuisine === cuisine && styles.cuisineTextActive]}>
                  {cuisine}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={textColor} />
            <ThemedText style={styles.loadingText}>{t('preparing_ingredients')}</ThemedText>
          </View>
        ) : (() => {
          const filtered = recipes.filter(r => {
            if (r.category !== selectedCategory) return false;
            if (selectedCategory === 'Foundation') return r.cooking_method === selectedCourse;
            if (cuisineTabs.length > 1) return r.cuisine === activeCuisine;
            return true;
          });
          if (filtered.length === 0) {
            return (
              <View style={styles.loadingContainer}>
                <ThemedText type="subtitle">{t('empty_vault')}</ThemedText>
                <ThemedText style={{ opacity: 0.5, marginTop: 8 }}>{t('empty_vault_desc')}</ThemedText>
              </View>
            );
          }
          // 실사가 있는 레시피를 카드 레일 앞쪽에 (무드커버 반복 노출 방지)
          const top = [...filtered]
            .sort((a, b) => (b.image_url ? 1 : 0) - (a.image_url ? 1 : 0))
            .slice(0, 6);
          const cover = CATEGORY_COVERS[selectedCategory] || CATEGORY_COVERS.Foundation;
          return (
            <>
              {/* 상위 6개 — 이미지 카드 레일 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRail}>
                {top.map((recipe) => (
                  <TouchableOpacity
                    key={recipe.id}
                    onPress={() => router.push(`/recipe/${recipe.id}`)}
                    style={styles.recipeCard}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={recipe.image_url ? { uri: recipe.image_url } : cover}
                      style={styles.recipeCardImage}
                      contentFit="cover"
                      transition={400}
                    />
                    <View style={styles.recipeCardOverlay}>
                      {displayWeek(recipe.week) ? (
                        <ThemedText style={styles.recipeCardWeek}>{displayWeek(recipe.week)}</ThemedText>
                      ) : null}
                      <ThemedText style={styles.recipeCardTitle} numberOfLines={2}>{recipe.title_ko}</ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 나머지 — 전체 보기 토글 */}
              {filtered.length > 6 && (
                <Pressable onPress={() => setShowAllList(v => !v)} style={[styles.showAllButton, { borderColor }]}>
                  <ThemedText style={styles.showAllText}>
                    {showAllList ? t('collapse') : t('show_all', { count: filtered.length })}
                  </ThemedText>
                </Pressable>
              )}
              {showAllList && (
                <View style={styles.recipeList}>
                  {filtered.slice(6).map((recipe) => (
                    <TouchableOpacity
                      key={recipe.id}
                      onPress={() => router.push(`/recipe/${recipe.id}`)}
                      style={[styles.recipeRow, { borderBottomColor: borderColor }]}
                      activeOpacity={0.6}
                    >
                      <ThemedText style={styles.recipeTitle} numberOfLines={1}>{recipe.title_ko}</ThemedText>
                      <ThemedText style={styles.recipeChevron}>›</ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          );
        })()}
        </>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

// "12강" 같은 강 번호는 표기하지 않음 (수업 주차 '1주차' 등은 유지)
const displayWeek = (week: string | null | undefined) =>
  week && !/^\d+\s*강$/.test(week.trim()) ? week : null;

// 카테고리별 폴백 커버 (레시피에 실사가 없을 때) — AI 무드컷, 음식 완성컷 아님
const CATEGORY_COVERS: Record<string, any> = {
  Foundation: require('@/assets/images/covers/foundation.jpg'),
  Intermediate: require('@/assets/images/covers/intermediate.jpg'),
  Professional: require('@/assets/images/covers/professional.jpg'),
  Banchan: require('@/assets/images/covers/banchan.jpg'),
};

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    letterSpacing: 10,
    textAlign: 'center',
    color: '#CAA876',       // gold-300
    fontSize: 32,
  },
  headerSubtitle: {
    letterSpacing: 4,
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: 300,
  },
  myClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(202,168,118,0.45)',
    backgroundColor: 'rgba(202,168,118,0.07)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 36,
  },
  myClassLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: '#CAA876',
    marginBottom: 6,
  },
  myClassTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  myClassNext: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.25)',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  searchResultMeta: {
    fontSize: 11,
    opacity: 0.45,
    marginTop: 2,
  },
  cardRail: {
    gap: 12,
    paddingVertical: 4,
  },
  recipeCard: {
    width: 150,
    height: 200,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(150,150,150,0.08)',
  },
  recipeCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  recipeCardOverlay: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 12,
    backgroundColor: 'rgba(4,12,26,0.62)',
  },
  recipeCardWeek: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#CAA876',
    marginBottom: 4,
  },
  recipeCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    color: '#FFFFFF',
  },
  showAllButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  hofContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  hofLabel: {
    fontSize: 10,
    letterSpacing: 4,
    opacity: 0.5,
    marginBottom: 16,
  },
  hofCard: {
    width: '100%',
    height: 400,
    borderWidth: 1,
  },
  hofImage: {
    width: '100%',
    height: '100%',
  },
  hofOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  hofDishLabel: {
    fontFamily: 'PlayfairDisplay_800ExtraBold_Italic',
    fontSize: 24,
    color: '#FFF',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'center',
  },
  hofUserLabel: {
    fontSize: 10,
    color: '#FFF',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  divider: {
    borderBottomWidth: 1,
    marginBottom: 40,
    marginHorizontal: '20%',
    opacity: 0.2,
  },
  sectionHeader: {
    fontSize: 10,
    letterSpacing: 4,
    opacity: 0.5,
    marginBottom: 24,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 16,
    flexWrap: 'wrap',
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
  },
  categoryText: {
    fontSize: 12,
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
    gap: 20,
  },
  loadingText: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
  },
  classesContainer: {
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 16,
  },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderWidth: 1,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  classLevelBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  classLevelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  classCardBody: {
    flex: 1,
    gap: 2,
  },
  classTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  classEn: {
    fontSize: 9,
    letterSpacing: 2,
    opacity: 0.4,
    textTransform: 'uppercase',
  },
  classDesc: {
    fontSize: 12,
    opacity: 0.55,
    lineHeight: 17,
    marginTop: 4,
  },
  courseRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  courseButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(202,168,118,0.2)',
    borderRadius: 2,
  },
  courseButtonActive: {
    borderColor: '#CAA876',
    backgroundColor: 'rgba(202,168,118,0.08)',
  },
  courseText: {
    fontSize: 11,
    letterSpacing: 2,
    opacity: 0.4,
  },
  courseTextActive: {
    color: '#CAA876',
    opacity: 1,
    fontWeight: '600',
  },
  cuisineScroll: {
    marginBottom: 24,
    marginHorizontal: -16,
  },
  cuisineScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cuisineButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(202,168,118,0.2)',
    borderRadius: 2,
  },
  cuisineButtonActive: {
    borderColor: '#CAA876',
    backgroundColor: 'rgba(202,168,118,0.08)',
  },
  cuisineText: {
    fontSize: 11,
    letterSpacing: 1.5,
    opacity: 0.4,
  },
  cuisineTextActive: {
    color: '#CAA876',
    opacity: 1,
    fontWeight: '600',
  },
  recipeList: {
    width: '100%',
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  recipeWeek: {
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.4,
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
  recipeIndex: {
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.3,
    width: 32,
    textAlign: 'right',
    flexShrink: 0,
  },
  recipeTitle: {
    flex: 1,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  recipeChevron: {
    fontSize: 18,
    opacity: 0.3,
    flexShrink: 0,
  },
  kakaoButton: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 2,
    backgroundColor: '#CAA876',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kakaoButtonText: {
    color: '#0A2342',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
