import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Purchases from 'react-native-purchases';

// recipe-pdfs 버킷은 private — pdf_url(구 public URL)에서 경로를 추출해 signed URL을 만든다.
// 권한(RLS): profiles.is_premium 또는 is_admin. 권한 없으면 createSignedUrl이 실패한다.
async function getSignedPdfUrl(pdfUrl: string): Promise<{ url?: string; status: 'ok' | 'denied' | 'error' }> {
  const marker = '/recipe-pdfs/';
  const idx = pdfUrl.indexOf(marker);
  if (idx === -1) return { status: 'error' };
  const path = decodeURIComponent(pdfUrl.slice(idx + marker.length));
  const { data, error } = await supabase.storage.from('recipe-pdfs').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    return { status: error?.message?.toLowerCase().includes('not found') ? 'error' : 'denied' };
  }
  return { url: data.signedUrl, status: 'ok' };
}

async function openRecipePdf(pdfUrl: string): Promise<'ok' | 'denied' | 'error'> {
  const { url, status } = await getSignedPdfUrl(pdfUrl);
  if (status !== 'ok' || !url) return status;
  await WebBrowser.openBrowserAsync(url);
  return 'ok';
}

// PDF를 기기에 내려받아 공유 시트(카톡·파일 저장 등)를 연다 — 자료 분실 대응
async function saveAndSharePdf(pdfUrl: string, title: string): Promise<'ok' | 'denied' | 'error'> {
  const { url, status } = await getSignedPdfUrl(pdfUrl);
  if (status !== 'ok' || !url) return status;
  const safeName = (title || 'recipe').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60);
  const fileUri = `${FileSystem.cacheDirectory}${safeName}.pdf`;
  const { uri } = await FileSystem.downloadAsync(url, fileUri);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${title} 레시피 PDF` });
    return 'ok';
  }
  return 'error';
}
export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [recipe, setRecipe] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        let profileData = null;
        if (session?.user?.id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          profileData = pData;
        }
        setProfile(profileData);

        const { data: rData, error: rError } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();
        
        if (rError) throw rError;
        setRecipe(rData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
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
    try {
      // Use RevenueCat to purchase the product
      const { customerInfo } = await Purchases.purchaseProduct('esprit_premium_monthly');
      
      // Check if entitlement is active or any subscription is active
      const hasPremium = typeof customerInfo.entitlements.active['Premium'] !== "undefined" 
                         || customerInfo.activeSubscriptions.length > 0;
      
      if (hasPremium) {
        // Refresh profile to reflect active premium status
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (pData) {
            setProfile(pData);
          } else {
            // Optimistic update if fetch fails
            setProfile((prev: any) => ({ ...prev, is_premium: true }));
          }
        } else {
          setProfile((prev: any) => ({ ...prev, is_premium: true }));
        }
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.warn("Purchase error:", e.message);
        Alert.alert(
          '결제 연결 안내', 
          `에러 원인: ${e.message}\n\n💡 영자의 팁: 인앱 결제(RevenueCat) 기능은 일반적인 Expo Go 앱에서는 테스트할 수 없고, EAS로 고유 빌드(Dev Client)를 뽑으셔야 정상 작동한답니다!`
        );
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isPremium = profile?.is_premium;

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
          source={recipe.image_url ? { uri: recipe.image_url } : require('@/assets/images/icon.png')}
          style={styles.image}
          contentFit="cover"
          transition={1000}
        />
      </View>

      {recipe.pdf_url && (
        <View style={styles.pdfContainer}>
          {isPremium ? (
            <>
              <Pressable
                style={[styles.pdfButton, { backgroundColor: '#CAA876' }]}
                onPress={async () => {
                  const result = await openRecipePdf(recipe.pdf_url);
                  if (result === 'denied') {
                    Alert.alert('열람 권한 없음', '프리미엄 구독 후 이용할 수 있습니다.');
                  } else if (result === 'error') {
                    Alert.alert('오류', 'PDF를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
                  }
                }}
              >
                <ThemedText style={styles.pdfButtonText}>수업용 레시피 PDF 열람하기</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.pdfButton, styles.pdfSaveButton]}
                onPress={async () => {
                  try {
                    const result = await saveAndSharePdf(recipe.pdf_url, recipe.title_ko || recipe.title_en);
                    if (result === 'denied') {
                      Alert.alert('권한 없음', '프리미엄 구독 후 이용할 수 있습니다.');
                    } else if (result === 'error') {
                      Alert.alert('오류', 'PDF 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
                    }
                  } catch {
                    Alert.alert('오류', 'PDF 저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IconSymbol name="square.and.arrow.down" size={16} color="#CAA876" />
                  <ThemedText style={[styles.pdfButtonText, { color: '#CAA876' }]}>기기에 저장 · 공유</ThemedText>
                </View>
              </Pressable>
            </>
          ) : (
            <Pressable 
              style={[styles.pdfButton, { backgroundColor: '#0C1D36', borderColor: '#CAA876', borderWidth: 1 }]}
              onPress={handleSubscribe}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <ActivityIndicator size="small" color="#D4AF37" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <IconSymbol name="lock.fill" size={16} color="#D4AF37" />
                  <ThemedText style={[styles.pdfButtonText, { color: '#CAA876' }]}>프리미엄 구독하고 레시피 열람하기</ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>
      )}

      {recipe.purchase_url && (
        <View style={styles.purchaseContainer}>
          <Pressable 
            style={({ pressed }) => [
              styles.purchaseButton,
              { borderColor: textColor, backgroundColor: backgroundColor },
              pressed && { opacity: 0.7 }
            ]}
            onPress={async () => {
              await WebBrowser.openBrowserAsync(recipe.purchase_url);
            }}
          >
            <ThemedText style={[styles.purchaseButtonText, { color: textColor }]}>
              셰프의 엄선: 이 요리에 필요한 도구/재료 보러가기
            </ThemedText>
          </Pressable>
        </View>
      )}

      {!isPremium && (
        <View style={styles.paywallContainer}>
          <ThemedText style={styles.paywallTitle}>
            한 달에 커피 한 잔 값으로,{'\n'}내 주방에 품격을 더하다.
          </ThemedText>
          
          <ThemedText style={styles.paywallSubtitle}>
            월 $4.99로 에스프릿 셰프의 모든 프렌치 시크릿 레시피와 24시간 AI 어시스턴트를 무제한으로 누려보세요. 클래스의 감동이 일상에서도 계속됩니다.
          </ThemedText>

          <View style={styles.paywallBenefitsContainer}>
            <View style={styles.paywallBenefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={16} color="#D4AF37" />
              <ThemedText style={styles.paywallBenefitText}>오프라인 클래스 핵심 레시피 무제한 열람</ThemedText>
            </View>
            <View style={styles.paywallBenefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={16} color="#D4AF37" />
              <ThemedText style={styles.paywallBenefitText}>셰프의 노하우가 담긴 팁과 지속적인 신규 요리 업데이트</ThemedText>
            </View>
            <View style={styles.paywallBenefitRow}>
              <IconSymbol name="checkmark.circle.fill" size={16} color="#D4AF37" />
              <ThemedText style={styles.paywallBenefitText}>궁금할 땐 언제든 답해주는 나만의 AI 요리 조수</ThemedText>
            </View>
          </View>

          <Pressable 
            onPress={handleSubscribe}
            disabled={isCheckingOut}
            style={({ pressed }) => [
              styles.subscribeButton,
              { backgroundColor: '#CAA876' },
              pressed && { opacity: 0.8 },
              isCheckingOut && { opacity: 0.5 }
            ]}
          >
            <ThemedText style={[styles.subscribeButtonText, { color: '#000000' }]}>
              {isCheckingOut ? '결제 진행 중...' : '[ $4.99 / 월 구독으로 시작하기 ]'}
            </ThemedText>
          </Pressable>
        </View>
      )}
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
  purchaseContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  purchaseButton: {
    width: '100%',
    paddingVertical: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseButtonText: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  paywallContainer: {
    marginTop: 64,
    padding: 24,
    backgroundColor: 'rgba(202, 168, 118, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(202, 168, 118, 0.25)',
    alignItems: 'center',
    gap: 20,
  },
  paywallTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    color: '#CAA876',
  },
  paywallSubtitle: {
    fontSize: 13,
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
  paywallBenefitsContainer: {
    width: '100%',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  paywallBenefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  paywallBenefitText: {
    fontSize: 13,
    opacity: 0.9,
    flex: 1,
    lineHeight: 18,
  },
  subscribeButton: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#CAA876',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
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
    shadowColor: '#CAA876',
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
  },
  pdfSaveButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(202,168,118,0.5)',
    shadowOpacity: 0,
    elevation: 0,
  }
});
