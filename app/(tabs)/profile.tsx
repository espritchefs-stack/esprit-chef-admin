import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Alert, TextInput, Modal, Linking } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/auth';
import { getOfferings, purchasePackage } from '@/lib/purchases';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function GamifiedProfileScreen() {
  const { session, isGuest, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  // Contact Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // QR Scanner State
  const [isScannerVisible, setIsScannerVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // Tier Logic Helper
  const currentPoints = profile?.points || 0;
  let nextTierName = 'ESPRIT ELITE';
  let nextTierPoints = 20000;
  
  if (currentPoints < 1000) {
    nextTierName = 'NOVICE';
    nextTierPoints = 1000;
  } else if (currentPoints < 5000) {
    nextTierName = 'MEMBER';
    nextTierPoints = 5000;
  } else if (currentPoints < 15000) {
    nextTierName = 'EXPERT';
    nextTierPoints = 15000;
  } else if (currentPoints < 30000) {
    nextTierName = 'ESPRIT ELITE';
    nextTierPoints = 30000;
  } else {
    nextTierName = 'MASTER CHEF';
    nextTierPoints = 50000;
  }

  const progressPercent = Math.min((currentPoints / nextTierPoints) * 100, 100);

  const fetchProfile = async () => {
    if (isGuest) {
      const storedPoints = await AsyncStorage.getItem('guest_points');
      setProfile({
        username: 'VIP Guest',
        tier: 'ESPRIT ELITE',
        points: storedPoints ? parseInt(storedPoints, 10) : 12500,
        avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
      });
      setIsLoading(false);
      return;
    }
    
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [session, isGuest])
  );

  const handleExchange = (reward: string, cost: number) => {
    if (!profile) return;
    if (profile.points < cost) {
      Alert.alert('Insufficient Mileage', `Requires ${cost} Esprit Mileage.`);
    } else {
      Alert.alert('Reserved', `You reserved: ${reward}. A concierge will contact you shortly.`);
    }
  };

  const handleContactSubmit = async () => {
    if (!name || !email || !message) {
      Alert.alert('Notice', '모든 항목을 입력해주세요.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('https://formspree.io/f/xojkprne', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, email, message })
      });
      
      if (response.ok) {
        Alert.alert('전송 완료', '문의가 성공적으로 접수되었습니다. 곧 연락드리겠습니다.');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        throw new Error('Network response was not ok.');
      }
    } catch (error) {
      Alert.alert('Error', '문의 접수 중 문제가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpgradePremium = async () => {
    try {
      setIsLoading(true);
      const packages = await getOfferings();
      if (packages.length === 0) {
        Alert.alert('Notice', '현재 가입 가능한 멤버십 상품이 없습니다. (API 설정 확인 필요)');
        setIsLoading(false);
        return;
      }
      
      // Select the first available package (usually Monthly or Annual)
      const success = await purchasePackage(packages[0]);
      if (success) {
        Alert.alert('Success', '프리미엄 멤버십 구독이 완료되었습니다! 🎉');
        // Update user tier in supabase
        if (session?.user?.id) {
          await supabase.from('profiles').update({ is_premium: true, tier: 'MASTER CHEF' }).eq('id', session.user.id);
        }
        await fetchProfile(); // Refresh profile UI
      }
    } catch (error) {
      Alert.alert('Error', '결제 진행 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenScanner = async () => {
    if (!cameraPermission?.granted) {
      const { status } = await requestCameraPermission();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is needed to scan the attendance QR code.');
        return;
      }
    }
    setScanned(false);
    setIsScannerVisible(true);
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    setIsScannerVisible(false);
    
    if (data === 'ESPRIT_ATTEND_2026') {
      Alert.alert(
        '출석 완료', 
        '에스프릿 셰프 스튜디오에 오신 것을 환영합니다! 오늘 수업도 화이팅하세요.'
      );
    } else {
      Alert.alert(
        '알 수 없는 코드', 
        '유효한 에스프릿 출석 QR 코드가 아닙니다.\n데이터: ' + data
      );
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.header, { position: 'relative', width: '100%', justifyContent: 'center' }]}>
          <Pressable onLongPress={() => router.push('/admin/recipe-editor')} delayLongPress={2000}>
            <ThemedText style={styles.logoText}>ESPRIT BOUTIQUE</ThemedText>
          </Pressable>
        </View>

        <View style={styles.profileSection}>
          <Image 
            source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }} 
            style={styles.avatar} 
          />
          <View style={styles.profileInfo}>
            <ThemedText style={styles.username}>{profile?.username || 'Chef'}</ThemedText>
            {profile?.is_premium ? (
              <View style={[styles.premiumBadge, { backgroundColor: '#CAA876' }]}>
                <ThemedText style={styles.premiumBadgeText}>PREMIUM MEMBER</ThemedText>
              </View>
            ) : (
              <View>
                <ThemedText style={styles.tier}>{profile?.tier || 'MEMBER'} TIER</ThemedText>
                <Pressable onPress={handleUpgradePremium} style={styles.upgradeBtn}>
                  <ThemedText style={styles.upgradeBtnText}>✨ Upgrade to Premium</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Tier Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>{t('tier_reveal')}</ThemedText>
            <ThemedText style={styles.progressText}>{nextTierName}</ThemedText>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(150,150,150,0.2)' }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: '#CAA876' }]} />
          </View>
        </View>

        {/* QR Scanner Action */}
        <Pressable 
          style={({ pressed }) => [
            styles.qrButton, 
            { borderColor },
            pressed && { opacity: 0.7 }
          ]} 
          onPress={handleOpenScanner}
        >
          <IconSymbol name="qrcode.viewfinder" size={24} color={textColor} />
          <ThemedText style={styles.qrButtonText}>스튜디오 출석 스캔</ThemedText>
        </Pressable>

        <View style={[styles.mileageCard, { borderColor }]}>
          <ThemedText style={styles.mileageLabel}>{t('esprit_mileage')}</ThemedText>
          <ThemedText style={styles.mileageValue}>{profile?.points?.toLocaleString() || 0}</ThemedText>
        </View>

        {/* Gamification Guide */}
        <View style={styles.guideContainer}>
          <ThemedText style={styles.sectionTitle}>{t('how_to_earn')}</ThemedText>
          <View style={styles.guideRow}>
            <ThemedText style={styles.guideAction}>Creation: +50P</ThemedText>
            <ThemedText style={styles.guidePoints}>+50P</ThemedText>
          </View>
          <View style={styles.guideRow}>
            <ThemedText style={styles.guideAction}>First Blood Comment Bonus</ThemedText>
            <ThemedText style={styles.guidePoints}>+15P</ThemedText>
          </View>
          <View style={styles.guideRow}>
            <ThemedText style={styles.guideAction}>Leave a Comment</ThemedText>
            <ThemedText style={styles.guidePoints}>+5P</ThemedText>
          </View>
          <View style={[styles.guideRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <ThemedText style={styles.guideAction}>Appreciate a Post (Like)</ThemedText>
            <ThemedText style={styles.guidePoints}>+5P</ThemedText>
          </View>
        </View>

        <View style={styles.rewardsSection}>
          <ThemedText style={styles.sectionTitle}>{t('exclusive_exchanges')}</ThemedText>
          
          {[
            { name: 'Esprit Chef Signature Tweezers', desc: 'Precision crafted for fine dining plating.', cost: 3000 },
            { name: 'Esprit Chef Eco Bag', desc: 'Minimalist canvas tote for market runs.', cost: 1500 },
            { name: 'Professional Cooking Bag', desc: 'Leather knife roll and gear transport.', cost: 8000 },
            { name: 'Studio Secret Ingredients Drop', desc: 'Curated box of truffles and spices. (Offline Pickup)', cost: 13000 }
          ].map((item, idx) => {
            const isAffordable = profile && profile.points >= item.cost;
            
            return (
              <Pressable 
                key={idx}
                disabled={!isAffordable}
                style={({ pressed }) => [
                  styles.rewardButton, 
                  { borderColor }, 
                  pressed && { opacity: 0.7 },
                  !isAffordable && { opacity: 0.3 }
                ]}
                onPress={() => handleExchange(item.name, item.cost)}
              >
                <View style={styles.rewardInfo}>
                  <ThemedText style={styles.rewardName}>{item.name}</ThemedText>
                  <ThemedText style={styles.rewardDesc}>{item.desc}</ThemedText>
                </View>
                <ThemedText style={[styles.costText, { color: isAffordable ? '#CAA876' : textColor }]}>
                  {item.cost.toLocaleString()} pts
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Contact Form Section */}
        <View style={styles.contactSection}>
          <ThemedText style={styles.sectionTitle}>CONTACT US</ThemedText>
          <TextInput
            style={[styles.input, { color: textColor, borderColor: 'rgba(150,150,150,0.3)' }]}
            placeholder="Name / Company"
            placeholderTextColor="rgba(150,150,150,0.5)"
            value={name}
            onChangeText={setName}
            editable={!isSubmitting}
          />
          <TextInput
            style={[styles.input, { color: textColor, borderColor: 'rgba(150,150,150,0.3)' }]}
            placeholder="Email"
            placeholderTextColor="rgba(150,150,150,0.5)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            editable={!isSubmitting}
          />
          <TextInput
            style={[styles.textArea, { color: textColor, borderColor: 'rgba(150,150,150,0.3)' }]}
            placeholder="Message"
            placeholderTextColor="rgba(150,150,150,0.5)"
            multiline
            numberOfLines={4}
            value={message}
            onChangeText={setMessage}
            editable={!isSubmitting}
            textAlignVertical="top"
          />
          <Pressable 
            style={({ pressed }) => [
              styles.submitButton, 
              { borderColor: 'rgba(150,150,150,0.3)' },
              pressed && { opacity: 0.7 },
              isSubmitting && { opacity: 0.5 }
            ]}
            onPress={handleContactSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <ThemedText style={styles.submitButtonText}>SUBMIT</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Legal Section */}
        <View style={styles.legalSection}>
          <ThemedText style={styles.sectionTitle}>LEGAL</ThemedText>
          <Pressable onPress={() => Linking.openURL('https://espritchefs.notion.site/Terms-of-Service')} style={styles.legalLink}>
            <ThemedText style={styles.legalText}>이용약관 (Terms of Service)</ThemedText>
            <IconSymbol name="chevron.right" size={16} color="rgba(150,150,150,0.5)" />
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://espritchefs.notion.site/Privacy-Policy')} style={styles.legalLink}>
            <ThemedText style={styles.legalText}>개인정보 처리방침 (Privacy Policy)</ThemedText>
            <IconSymbol name="chevron.right" size={16} color="rgba(150,150,150,0.5)" />
          </Pressable>
        </View>

        {/* Action Bottom Section */}
        <View style={styles.logoutSection}>
          <Pressable 
            style={[styles.logoutButton, { borderColor: '#E02424' }]} 
            onPress={() => {
              Alert.alert(t('logout') || 'Log Out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log Out', style: 'destructive', onPress: signOut }
              ]);
            }}
          >
            <ThemedText style={styles.logoutButtonText}>{t('logout') || 'LOGOUT'}</ThemedText>
          </Pressable>
        </View>

      </ScrollView>

      {/* QR Scanner Modal */}
      <Modal visible={isScannerVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <Pressable onPress={() => setIsScannerVisible(false)} style={styles.scannerCloseButton}>
              <ThemedText style={styles.scannerCloseText}>닫기</ThemedText>
            </Pressable>
            <ThemedText style={styles.scannerTitle}>스튜디오 출석 스캔</ThemedText>
            <View style={{ width: 50 }} />
          </View>
          
          <CameraView 
            style={styles.cameraView}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <ThemedText style={styles.scannerHint}>QR 코드를 사각형 안에 맞춰주세요.</ThemedText>
            </View>
          </CameraView>
        </View>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    letterSpacing: 4,
    fontSize: 16,
    opacity: 0.8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 40,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    justifyContent: 'center',
  },
  username: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 24,
    marginBottom: 4,
  },
  tier: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#000',
  },
  upgradeBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CAA876',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  upgradeBtnText: {
    fontSize: 10,
    color: '#CAA876',
    fontWeight: '700',
    letterSpacing: 1,
  },
  progressContainer: {
    marginBottom: 48,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
  },
  progressText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#CAA876', // Gold accent
    letterSpacing: 1,
  },
  progressBarTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 48,
    gap: 12,
  },
  qrButtonText: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 1,
  },
  mileageCard: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 48,
  },
  mileageLabel: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: 12,
  },
  mileageValue: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 36,
    lineHeight: 44,
  },
  guideContainer: {
    marginBottom: 48,
  },
  guideRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  guideAction: {
    fontSize: 12,
    opacity: 0.8,
  },
  guidePoints: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CAA876',
  },
  rewardsSection: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingBottom: 16,
  },
  rewardButton: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    borderBottomColor: 'rgba(150,150,150,0.1)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  rewardInfo: {
    flex: 1,
    paddingRight: 16,
  },
  rewardName: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 10,
    opacity: 0.5,
    lineHeight: 16,
  },
  costText: {
    fontSize: 12,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  contactSection: {
    marginTop: 32,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 0,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 12,
  },
  textArea: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 0,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 12,
    height: 80,
  },
  submitButton: {
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitButtonText: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 12,
    letterSpacing: 2,
  },
  logoutSection: {
    marginTop: 48,
    alignItems: 'center',
    width: '100%',
  },
  logoutButton: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    letterSpacing: 2,
    color: '#E02424',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000',
    zIndex: 10,
  },
  scannerCloseButton: {
    padding: 8,
  },
  scannerCloseText: {
    color: '#FFF',
    fontSize: 16,
  },
  scannerTitle: {
    color: '#FFF',
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    letterSpacing: 1.5,
  },
  cameraView: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(212, 175, 55, 0.15)', // Light luxury gold tint overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#CAA876', // Gold border
    backgroundColor: 'transparent',
    borderRadius: 16, // Softer edges for luxury feel
    shadowColor: '#CAA876',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  scannerHint: {
    color: '#FFF',
    marginTop: 24,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  legalSection: {
    marginTop: 48,
    gap: 8,
  },
  legalLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  legalText: {
    fontSize: 14,
    opacity: 0.8,
  }
});
