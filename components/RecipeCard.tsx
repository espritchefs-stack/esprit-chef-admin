import React from 'react';
import { StyleSheet, View, ImageBackground, Pressable } from 'react-native';
import { Link } from 'expo-router';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface RecipeCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

export function RecipeCard({ id, title, description, imageUrl }: RecipeCardProps) {
  const cardBackgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  return (
    <Link href={`/recipe/${id}`} asChild>
      <Pressable>
        <ThemedView style={[styles.card, { backgroundColor: cardBackgroundColor, borderColor }]}>
          <ImageBackground
            source={{ uri: imageUrl }}
            style={styles.image}
            imageStyle={styles.imageStyle}
          >
            <View style={styles.overlay} />
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
});
