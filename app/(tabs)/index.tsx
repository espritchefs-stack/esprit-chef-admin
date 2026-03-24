import { Image } from 'expo-image';
import { StyleSheet, View, ActivityIndicator, Pressable } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecipeCard } from '@/components/RecipeCard';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [featuredRecipe, setFeaturedRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Foundation');
  const { t } = useTranslation();
  useEffect(() => {
    async function fetchRecipes() {
      setIsLoading(true);
      try {
        // Fetch standard recipes
        const { data: standardData, error: standardError } = await supabase.from('recipes').select('*').order('id', { ascending: true });
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
      headerBackgroundColor={{ light: '#EEEEEE', dark: '#222222' }}
      headerImage={
        <View style={styles.headerContainer}>
          <ThemedText type="title" style={styles.headerTitle}>ESPRIT</ThemedText>
        </View>
      }>

      <ThemedView style={styles.contentContainer}>
        
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

        <ThemedText style={styles.sectionHeader}>{t('vault_record')}</ThemedText>

        <View style={styles.categoryRow}>
          {['Foundation', 'Intermediate', 'Professional'].map((cat) => (
            <Pressable 
              key={cat} 
              onPress={() => setSelectedCategory(cat)}
              style={[
                styles.categoryButton, 
                selectedCategory === cat ? { borderBottomColor: '#D4AF37' } : { borderBottomColor: 'transparent'}
              ]}
            >
              <ThemedText style={[
                styles.categoryText, 
                selectedCategory === cat ? { color: '#D4AF37', fontWeight: 'bold' } : { opacity: 0.5 }
              ]}>
                {t(`category_${cat.toLowerCase()}`)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color={textColor} />
             <ThemedText style={styles.loadingText}>{t('preparing_ingredients')}</ThemedText>
          </View>
        ) : recipes.filter(r => r.category === selectedCategory || (selectedCategory === 'Foundation' && !r.category)).length === 0 ? (
          <View style={styles.loadingContainer}>
             <ThemedText type="subtitle">{t('empty_vault')}</ThemedText>
             <ThemedText style={{ opacity: 0.5, marginTop: 8 }}>{t('empty_vault_desc')}</ThemedText>
          </View>
        ) : (
          recipes.filter(r => r.category === selectedCategory || (selectedCategory === 'Foundation' && !r.category)).map((recipe) => (
              <RecipeCard
              key={recipe.id}
              id={recipe.id.toString()}
              title={recipe.title_en || recipe.title_ko}
              description={recipe.week || 'Special Entry'}
              imageUrl={recipe.image_url}
              isLocked={recipe.category === 'Competition Class'}
            />
          ))
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    letterSpacing: 8,
    textAlign: 'center',
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: 300,
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
});
