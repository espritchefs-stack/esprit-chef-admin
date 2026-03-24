import { StyleSheet, View, Pressable, Linking, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const [scheduleImageUrl, setScheduleImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const kakaoUrl = 'http://pf.kakao.com/_BxeTqj/chat';

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('schedule_image_url')
          .eq('id', 'global')
          .single();
        
        if (error) {
          console.error('Error fetching app settings:', error);
        } else if (data?.schedule_image_url) {
          setScheduleImageUrl(data.schedule_image_url);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleKakaoInquiry = () => {
    Linking.openURL(kakaoUrl).catch((err) => 
      console.error('Failed to open KakaoTalk URL', err)
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>CLASS SCHEDULE</ThemedText>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        ) : (
          <Image 
            source={scheduleImageUrl ? { uri: scheduleImageUrl } : require('@/assets/images/class_schedule_poster.png')} 
            style={styles.scheduleImage}
            contentFit="contain"
          />
        )}
      </ScrollView>

      <Pressable 
        style={({ pressed }) => [
          styles.kakaoButton, 
          { backgroundColor: '#D4AF37' }, // Esprit Gold
          pressed && { opacity: 0.8 }
        ]}
        onPress={handleKakaoInquiry}
      >
        <ThemedText style={styles.kakaoButtonText}>셰프님과 1:1 상담 및 예약하기</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Leave room for floating button
    flexGrow: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  scheduleImage: {
    width: '100%',
    aspectRatio: 0.7, // Assume a vertical poster-like ratio (approx A4)
    borderRadius: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  kakaoButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
    letterSpacing: 1,
  }
});
