import React from 'react';
import { StyleSheet, View, ImageBackground, Pressable, Alert, Linking } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

export interface RecipeCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  isLocked?: boolean;
}

export function RecipeCard({ id, title, description, imageUrl, isLocked }: RecipeCardProps) {
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  const handleLockedPress = () => {
    Alert.alert(
      "Class Vault Locked",
      "대회반 수강생 전용 콘텐츠입니다.\n셰프님과 1:1 상담 후 열람하실 수 있습니다.",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "카카오톡 상담하기", 
          onPress: () => Linking.openURL('http://pf.kakao.com/_BxeTqj/chat').catch(err => console.error(err))
        }
      ]
    );
  };

  const CardContent = (
    <Pressable onPress={isLocked ? handleLockedPress : undefined}>
      <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}>
        <ImageBackground
          source={{ uri: imageUrl }}
          style={styles.image}
          imageStyle={styles.imageStyle}
        >
          <View style={styles.overlay} />
          {isLocked && (
            <View style={styles.lockedOverlay}>
              <View style={styles.lockIconContainer}>
                <IconSymbol name="lock.fill" size={24} color="#D4AF37" />
              </View>
              <ThemedText style={styles.lockedText}>COMPETITION CLASS</ThemedText>
            </View>
          )}
        </ImageBackground>
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText style={styles.description} numberOfLines={2}>
            {description}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );

  if (isLocked) {
    return CardContent;
  }

  return (
    <Link href={`/recipe/${id}`} asChild>
      {CardContent}
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    height: 200,
    width: '100%',
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIconContainer: {
    padding: 12,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.5)',
  },
  lockedText: {
    color: '#D4AF37',
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  }
});
