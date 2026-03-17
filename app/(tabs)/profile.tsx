import React, { useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/auth';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';

export default function GamifiedProfileScreen() {
  const { session, isGuest, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

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
    
    if (!session?.user?.id) return;

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
            <ThemedText style={styles.tier}>{profile?.tier || 'MEMBER'} TIER</ThemedText>
          </View>
        </View>

        {/* Tier Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressLabel}>{t('tier_reveal')}</ThemedText>
            <ThemedText style={styles.progressText}>{nextTierName}</ThemedText>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(150,150,150,0.2)' }]}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: '#D4AF37' }]} />
          </View>
        </View>

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
                <ThemedText style={[styles.costText, { color: isAffordable ? '#D4AF37' : textColor }]}>
                  {item.cost.toLocaleString()} pts
                </ThemedText>
              </Pressable>
            );
          })}
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
    color: '#D4AF37', // Gold accent
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
    color: '#D4AF37',
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
  }
});
