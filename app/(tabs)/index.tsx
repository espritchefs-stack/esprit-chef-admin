import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator, Pressable, Linking, TouchableOpacity, FlatList, ScrollView } from 'react-native';

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
  const CUISINES = ['이탈리안', '프렌치', '한식·일식', '아시안', '아메리칸', '유러피안'] as const;
  type Cuisine = typeof CUISINES[number];
  const [selectedCuisine, setSelectedCuisine] = useState<Cuisine>('이탈리안');
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
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
          <ThemedText style={styles.headerSubtitle}>CHEF · COOKING ACADEMY</ThemedText>
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
            <ThemedText style={styles.myClassLabel}>MY CLASS</ThemedText>
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
          <ThemedText style={styles.hofLabel}>ESPRIT SIGNATURE</ThemedText>
          <View style={[styles.hofCard, { borderColor }]}>
            {featuredRecipe ? (
              <>
                <Image 
                  source={{ uri: featuredRecipe.image_url }} 
                  style={styles.hofImage}
                  contentFit="cover" 
                />
                <View style={styles.hofOverlay}>
                  <ThemedText style={styles.hofDishLabel}>{featuredRecipe.title_en || featuredRecipe.title_ko}</ThemedText>
                  <ThemedText style={styles.hofUserLabel}>{featuredRecipe.category || 'Featured Collection'}</ThemedText>
                </View>
              </>
            ) : (
              <View style={[styles.hofImage, { backgroundColor: 'rgba(150,150,150,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText style={{ opacity: 0.5, letterSpacing: 2 }}>NOTHING FEATURED YET</ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.divider, { borderBottomColor: borderColor }]} />

        {/* Classes Section */}
        <ThemedText style={styles.sectionHeader}>CLASSES</ThemedText>
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
          <ThemedText style={styles.kakaoButtonText}>카카오톡으로 상담하기</ThemedText>
        </TouchableOpacity>

        <View style={[styles.divider, { borderBottomColor: borderColor, marginTop: 40 }]} />

        <ThemedText style={styles.sectionHeader}>{t('vault_record')}</ThemedText>

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

        {/* Intermediate 전용 Cuisine 서브탭 */}
        {selectedCategory === 'Intermediate' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cuisineScroll}
            contentContainerStyle={styles.cuisineScrollContent}
          >
            {CUISINES.map((cuisine) => (
              <Pressable
                key={cuisine}
                onPress={() => setSelectedCuisine(cuisine)}
                style={[styles.cuisineButton, selectedCuisine === cuisine && styles.cuisineButtonActive]}
              >
                <ThemedText style={[styles.cuisineText, selectedCuisine === cuisine && styles.cuisineTextActive]}>
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
            if (selectedCategory === 'Intermediate') return r.cuisine === selectedCuisine;
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
          return (
            <View style={styles.recipeList}>
              {filtered.map((recipe, index) => (
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
          );
        })()}
      </ThemedView>
    </ParallaxScrollView>
  );
}

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
