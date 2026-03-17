import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as WebBrowser from 'expo-web-browser';
import { openPolarCheckout } from '@/lib/polar';

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [recipe, setRecipe] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    async function fetchRecipe() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setRecipe(data);
      } catch (error) {
        console.error("Error fetching recipe:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
        <ThemedText style={styles.loadingText}>LOADING RECIPE...</ThemedText>
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ThemedText>Recipe not found</ThemedText>
      </View>
    );
  }

  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];

  const handleSubscribe = async () => {
    setIsCheckingOut(true);
    const success = await openPolarCheckout('premium_tier');
    setIsCheckingOut(false);
    
    if (success) {
      // Typically you'd refresh the user context to unlock the content
      console.log('Returned from Polar checkout flow');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor }]} contentContainerStyle={styles.contentContainer}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <IconSymbol name="chevron.left" size={20} color={textColor} />
        <ThemedText style={styles.backText}>{t('back_to_list')}</ThemedText>
      </Pressable>

      <View style={styles.header}>
        {recipe.week && <ThemedText style={styles.weekText}>{recipe.week}</ThemedText>}
        <ThemedText type="title" style={styles.titleEn}>
          {recipe.title_en}
        </ThemedText>
        <ThemedText type="subtitle" style={styles.titleKo}>
          {recipe.title_ko}
        </ThemedText>
      </View>

      <View style={[styles.imageContainer, { borderColor }]}>
        <Image
          source={recipe.image_url}
          style={styles.image}
          contentFit="cover"
          transition={1000}
        />
      </View>

      {recipe.pdf_url && (
        <View style={styles.pdfContainer}>
          <Pressable 
            style={[styles.pdfButton, { backgroundColor: '#D4AF37' }]}
            onPress={async () => {
              await WebBrowser.openBrowserAsync(recipe.pdf_url);
            }}
          >
            <ThemedText style={styles.pdfButtonText}>수업용 레시피 PDF 열람하기</ThemedText>
          </Pressable>
        </View>
      )}

      <View style={styles.subscribeContainer}>
        <ThemedText style={styles.subscribeDescription}>
          {t('subscribe_desc')}
        </ThemedText>
        <Pressable 
          onPress={handleSubscribe}
          disabled={isCheckingOut}
          style={({ pressed }) => [
            styles.subscribeButton,
            { backgroundColor: textColor },
            pressed && { opacity: 0.8 },
            isCheckingOut && { opacity: 0.5 }
          ]}
        >
          <ThemedText style={[styles.subscribeButtonText, { color: backgroundColor }]}>
            {isCheckingOut ? 'WAIT...' : t('subscribe_premium')}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingTop: 80, // Allow room for transparent header
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
    opacity: 0.5,
  },
  backText: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  weekText: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.5,
    marginBottom: 16,
  },
  titleEn: {
    textAlign: 'center',
    fontSize: 28,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  titleKo: {
    textAlign: 'center',
    fontSize: 18,
    opacity: 0.7,
  },
  imageContainer: {
    width: '100%',
    height: 350,
    marginBottom: 48,
    borderWidth: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  section: {
    marginBottom: 48,
  },
  sectionHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingBottom: 16,
    opacity: 0.5,
  },
  list: {
    gap: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ingredientName: {
    fontSize: 14,
    opacity: 0.8,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 16,
  },
  stepNumber: {
    opacity: 0.3,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 24,
    opacity: 0.8,
    paddingTop: 4,
  },
  chefsNoteContainer: {
    padding: 32,
    borderWidth: 1,
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  chefsNoteTitle: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.5,
  },
  chefsNoteText: {
    fontSize: 14,
    lineHeight: 28,
    textAlign: 'center',
    opacity: 0.8,
  },
  subscribeContainer: {
    marginTop: 64,
    alignItems: 'center',
    gap: 24,
  },
  subscribeDescription: {
    fontSize: 12,
    opacity: 0.5,
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  subscribeButton: {
    width: '100%',
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
  },
  pdfContainer: {
    marginBottom: 48,
    alignItems: 'center',
    width: '100%',
  },
  pdfButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pdfButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 2,
    color: '#000000',
  }
});
