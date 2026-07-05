import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  ActivityIndicator, 
  Pressable, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/ctx/auth';
import { uploadPostImage } from '@/lib/storage';
import { awardMileage } from '@/lib/mileage';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function CommunityFeedScreen() {
  const { session, isGuest } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'community' | 'reviews'>('community');
  const [posts, setPosts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [isPremium, setIsPremium] = useState(false);

  // Post Creation State
  const [isModalVisible, setModalVisible] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedBase64, setSelectedBase64] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  async function fetchPosts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select(`
          id, content, image_url, likes_count, created_at,
          profiles(username, tier, avatar_url, points),
          comments(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (isGuest) {
        let feedPosts: any[] = data || [];

        const likedStr = await AsyncStorage.getItem('guest_liked_posts');
        if (likedStr) {
          try { setLikedPosts(new Set(JSON.parse(likedStr))); } catch {}
        }

        const storedPoints = await AsyncStorage.getItem('guest_points');
        if (!storedPoints) {
          await AsyncStorage.setItem('guest_points', '12500');
        }

        // 1. Load any locally published posts by the Guest
        const guestPublishedStr = await AsyncStorage.getItem('guest_published_posts');
        const guestPublished = guestPublishedStr ? JSON.parse(guestPublishedStr) : [];
        feedPosts = [...guestPublished, ...feedPosts];

        // 2. Always show the initial luxurious mock post at the bottom of the feed for guests
        const storedMockCommentsStr = await AsyncStorage.getItem('mock_comments_mock-1');
        const parsedMockComments = storedMockCommentsStr ? JSON.parse(storedMockCommentsStr) : [
          { id: '1' }, { id: '2' }, { id: '3' }
        ];

        const initialMockPost = {
          id: 'mock-1',
          content: 'Just perfected my classic Beef Wellington. The secret is definitely in the mushroom duxelles and a perfectly crisp prosciutto wrap! 🥩✨',
          image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=2000&auto=format&fit=crop',
          likes_count: 24,
          created_at: new Date().toISOString(),
          comments: parsedMockComments,
          profiles: {
            username: 'Chef Esprit',
            tier: 'EXPERT',
            avatar_url: 'https://i.pravatar.cc/150?u=fake_chef',
            points: 34500
          }
        };
        // Avoid duplicate if it somehow merged
        if (!feedPosts.some(p => p.id === 'mock-1')) {
          feedPosts.push(initialMockPost);
        }

        setPosts(feedPosts);
      } else {
        setPosts(data || []);
        
        // Also fetch current user's premium status
        if (session?.user?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', session.user.id)
            .single();
            
          if (profileData) {
            setIsPremium(profileData.is_premium);
          }
        }
      }
    } catch (e) {
      console.error("Error fetching community posts", e);
      // Fallback for missing RLS policies while testing
      if (isGuest && posts.length === 0) {
         setPosts([{
            id: 'mock-error-fallback',
            content: 'Welcome to the Community! Post your first culinary creation using the button below. (Database connection is currently pending or restricted).',
            image_url: 'https://images.unsplash.com/photo-1414235077428-33898bd12258?q=80&w=2000&auto=format&fit=crop',
            likes_count: 0,
            created_at: new Date().toISOString(),
            profiles: {
              username: 'System Admin',
              tier: 'STAFF',
              avatar_url: 'https://i.pravatar.cc/150?u=admin',
              points: 99999
            }
          }]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchReviews() {
    setIsReviewsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, content, rating, image_url, created_at, profiles(username, tier, avatar_url)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setReviews(data);
      }
    } catch (e) {
      console.error('Error fetching reviews', e);
    } finally {
      setIsReviewsLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      fetchReviews();
    }, [isGuest, session])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].uri);
      setSelectedBase64(result.assets[0].base64);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].uri);
      setSelectedBase64(result.assets[0].base64);
    }
  };

  const handlePublish = async () => {
    if (!selectedBase64) {
      Alert.alert('Missing Image', 'Please select an image for your post.');
      return;
    }
    if (!postContent.trim()) {
      Alert.alert('Missing Content', 'Please add a description.');
      return;
    }
    if (isGuest) {
      setIsPublishing(true);
      // VIP Guest Mock Upload Flow
      setTimeout(async () => {
        setIsPublishing(false);
        const currentPointsRaw = await AsyncStorage.getItem('guest_points');
        const currentPoints = parseInt(currentPointsRaw || '12500', 10);
        const newPoints = currentPoints + 50;
        await AsyncStorage.setItem('guest_points', newPoints.toString());

        const newPost = {
          id: `mock-new-${Date.now()}`,
          content: postContent,
          image_url: selectedImage, 
          likes_count: 0,
          created_at: new Date().toISOString(),
          comments: [{ id: 'mock-bot' }],
          profiles: {
            username: 'VIP Guest',
            tier: 'ESPRIT ELITE',
            avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
            points: newPoints // Show incremented points
          }
        };

        const existingStr = await AsyncStorage.getItem('guest_published_posts');
        const existing = existingStr ? JSON.parse(existingStr) : [];
        await AsyncStorage.setItem('guest_published_posts', JSON.stringify([newPost, ...existing]));

        const botComment = {
          id: Math.random().toString(),
          content: '멋진 실습이네요! 복습 포인트가 적립되었습니다. 셰프님께도 전달해 드릴게요!',
          created_at: new Date().toISOString(),
          profiles: null // Bot profile
        };
        await AsyncStorage.setItem(`mock_comments_${newPost.id}`, JSON.stringify([botComment]));

        Alert.alert('Published!', 'Your creation has been added. +50 Esprit Mileage awarded.');
        resetModal();
        fetchPosts(); // Reload local list
      }, 1500);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert('Action Restricted', 'Please log in to publish posts.');
      return;
    }

    setIsPublishing(true);
    try {
      // 1. Upload Image to Storage Bucket
      const publicUrl = await uploadPostImage(selectedBase64, 'jpeg');

      // 2. Insert Post to Database
      const { error: insertError } = await supabase
        .from('community_posts')
        .insert([
          {
            user_id: session.user.id,
            image_url: publicUrl,
            content: postContent,
          }
        ]);

      if (insertError) throw insertError;

      // 3. Award Mileage (+50P)
      await awardMileage(session.user.id, 'POST_CREATION');

      Alert.alert('Published!', 'Your creation has been added. +50 Esprit Mileage awarded.');
      resetModal();
      fetchPosts(); // Refresh Feed
    } catch (err) {
      console.error(err);
      Alert.alert('Publish Failed', 'An error occurred while publishing your post.');
    } finally {
      setIsPublishing(false);
    }
  };

  const resetModal = () => {
    setModalVisible(false);
    setPostContent('');
    setSelectedImage(null);
    setSelectedBase64(null);
  };

  const renderPost = ({ item }: { item: any }) => {
    const profile = item.profiles || {};
    const commentCount = item.comments ? item.comments.length : 0;
    const isLiked = likedPosts.has(item.id);
    
    // Apply Optimistic local likes count so going back doesn't revert to DB zero
    const displayLikes = (item.likes_count || 0) + (isLiked && !item.id.toString().startsWith('mock-') ? 1 : 0);
    
    return (
      <Pressable 
        style={[styles.postCard, { borderColor, backgroundColor }]}
        onPress={() => router.push({ pathname: '/post/[id]' as any, params: { id: item.id } })}
      >
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <Image 
              source={{ uri: profile.avatar_url || 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }} 
              style={styles.avatar} 
            />
            <View style={styles.headerText}>
              <ThemedText style={styles.username}>{profile.username || 'Anonymous User'}</ThemedText>
              <ThemedText style={styles.tier}>{profile.tier || 'NOVICE'} TIER</ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.postPoints, { color: '#CAA876' }]}>
            {profile.points ? `${profile.points.toLocaleString()}P` : '0P'}
          </ThemedText>
        </View>

        <View style={styles.imageWrapper}>
          <Image source={{ uri: item.image_url }} style={styles.postImage} contentFit="cover" />
        </View>

        <View style={styles.postFooter}>
          <View style={styles.actions}>
            <Pressable 
              hitSlop={15}
              onPress={async () => {
                if (likedPosts.has(item.id)) return;
                
                setLikedPosts(prev => {
                  const next = new Set(prev);
                  next.add(item.id);
                  AsyncStorage.setItem('guest_liked_posts', JSON.stringify(Array.from(next)));
                  return next;
                });

                // Optimistic Local UI Update
                setPosts(prev => prev.map(p => 
                  p.id === item.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
                ));

                // Persist mock likes if it's a guest-authored post
                if (item.id.toString().startsWith('mock-')) {
                  const existingStr = await AsyncStorage.getItem('guest_published_posts');
                  if (existingStr) {
                    let existing = JSON.parse(existingStr);
                    existing = existing.map((p: any) => 
                      p.id === item.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
                    );
                    await AsyncStorage.setItem('guest_published_posts', JSON.stringify(existing));
                  }
                } else if (session?.user?.id) {
                   // Real Supabase Like Logic (Phase 9 Future)
                }
                
                Alert.alert('Liked!', 'Thank you for your appreciation! +5 Esprit Mileage awarded.');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <IconSymbol name={isLiked ? "heart.fill" : "heart"} size={24} color={isLiked ? "#E02424" : textColor} />
              <ThemedText style={styles.likes}>{item.id.toString().startsWith('mock-') ? item.likes_count || 0 : displayLikes}</ThemedText>
            </Pressable>
            
            <IconSymbol name="message" size={24} color={textColor} style={{ marginLeft: 16 }} />
            <ThemedText style={styles.likes}>{commentCount}</ThemedText>
          </View>
          <ThemedText style={styles.content}>{item.content}</ThemedText>
        </View>
      </Pressable>
    );
  };

  const renderReview = ({ item }: { item: any }) => {
    const profile = item.profiles || {};
    const stars = item.rating || 5;
    return (
      <View style={[styles.reviewCard, { borderColor }]}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <Image
              source={{ uri: profile.avatar_url || 'https://i.pravatar.cc/150?u=review' }}
              style={styles.avatar}
            />
            <View style={styles.headerText}>
              <ThemedText style={styles.username}>{profile.username || '수강생'}</ThemedText>
              <ThemedText style={styles.tier}>{profile.tier || 'STUDENT'} TIER</ThemedText>
            </View>
          </View>
          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <ThemedText key={i} style={{ color: i < stars ? '#CAA876' : 'rgba(255,255,255,0.2)', fontSize: 12 }}>★</ThemedText>
            ))}
          </View>
        </View>
        {item.image_url ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item.image_url }} style={styles.postImage} contentFit="cover" />
          </View>
        ) : null}
        <View style={styles.postFooter}>
          <ThemedText style={styles.content}>{item.content}</ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ThemedText type="title" style={styles.screenTitle}>COMMUNITY</ThemedText>

      {/* Tab Selector */}
      <View style={[styles.tabRow, { borderBottomColor: borderColor }]}>
        {[
          { key: 'community', label: '커뮤니티' },
          { key: 'reviews', label: '수강후기' },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && { borderBottomColor: '#CAA876', borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab(tab.key as 'community' | 'reviews')}
          >
            <ThemedText style={[
              styles.tabLabel,
              activeTab === tab.key ? { color: '#CAA876', fontWeight: '700' } : { opacity: 0.45 },
            ]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {activeTab === 'community' ? (
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.center}>
            <ThemedText style={styles.emptyText}>{t('write_post')}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderPost}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        isReviewsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={textColor} />
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.center}>
            <ThemedText style={styles.emptyText}>아직 등록된 후기가 없습니다</ThemedText>
          </View>
        ) : (
          <FlatList
            data={reviews}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderReview}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {/* Floating Action Button (Create Post) — community tab only */}
      {activeTab === 'community' && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}
          onPress={() => setModalVisible(true)}
        >
          <IconSymbol name="plus" size={24} color="#FFF" />
          <ThemedText style={styles.fabText}>{t('community')}</ThemedText>
        </Pressable>
      )}

      {/* Premium Specific Channel.io / KakaoTalk Floating Button */}
      {isPremium && (
        <Pressable 
          style={({ pressed }) => [styles.premiumSupportFab, pressed && { opacity: 0.8 }]} 
          onPress={() => {
            Linking.openURL('http://pf.kakao.com/_BxeTqj/chat').catch((err) => 
              console.error('Failed to open KakaoTalk URL', err)
            );
          }}
        >
          <IconSymbol name="bubble.left.and.bubble.right.fill" size={20} color="#000" />
          <ThemedText style={styles.premiumSupportText}>셰프님께 1:1 질문하기</ThemedText>
        </Pressable>
      )}

      {/* Post Creation Modal */}
      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView 
          style={[styles.modalContainer, { backgroundColor }]} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={resetModal}>
              <ThemedText style={styles.modalCancel}>Cancel</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>{t('write_post')}</ThemedText>
            <Pressable onPress={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <ActivityIndicator size="small" color="#D4AF37" />
              ) : (
                <ThemedText style={styles.modalPublish}>{t('publish_btn')}</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            {selectedImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                <Pressable style={styles.changeImageBtn} onPress={pickImage}>
                  <ThemedText style={styles.changeImageText}>Change Image</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={[styles.imageSelectionContainer, { borderColor }]}>
                <Pressable style={styles.premiumUploadBtn} onPress={pickImage}>
                  <IconSymbol name="photo.fill" size={24} color={textColor} />
                  <ThemedText style={styles.premiumUploadBtnText}>Choose from Gallery</ThemedText>
                </Pressable>
                <View style={[styles.uploadDivider, { backgroundColor: borderColor }]} />
                <Pressable style={styles.premiumUploadBtn} onPress={takePhoto}>
                  <IconSymbol name="camera.fill" size={24} color={textColor} />
                  <ThemedText style={styles.premiumUploadBtnText}>Take a Photo</ThemedText>
                </Pressable>
              </View>
            )}

            <TextInput
              style={[styles.textArea, { color: textColor }]}
              placeholder="Describe your culinary creation..."
              placeholderTextColor={textColor + '80'}
              multiline
              value={postContent}
              onChangeText={setPostContent}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
  },
  screenTitle: {
    paddingHorizontal: 24,
    marginBottom: 24,
    letterSpacing: 4,
    fontSize: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
    letterSpacing: 2,
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  postCard: {
    marginBottom: 60,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerText: {
    justifyContent: 'center',
  },
  username: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  tier: {
    fontSize: 9,
    opacity: 0.5,
    letterSpacing: 1,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  postPoints: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.2)',
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postFooter: {
    paddingVertical: 16,
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likes: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
  },
  content: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    lineHeight: 24,
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: '#CAA876', // Luxury Gold
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#FFF',
    fontSize: 14,
    letterSpacing: 1,
  },
  premiumSupportFab: {
    position: 'absolute',
    bottom: 100, // Positioned above the primary FAB
    right: 24,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#EEEEEE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#CAA876',
  },
  premiumSupportText: {
    fontFamily: 'Inter_600SemiBold',
    color: '#000',
    fontSize: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 24 : 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  modalTitle: {
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: 'PlayfairDisplay_600SemiBold',
  },
  modalCancel: {
    fontSize: 14,
    opacity: 0.6,
  },
  modalPublish: {
    fontSize: 14,
    color: '#CAA876',
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
    padding: 24,
  },
  imageSelectionContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  premiumUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  premiumUploadBtnText: {
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    letterSpacing: 0.5,
  },
  uploadDivider: {
    height: 1,
    width: '100%',
    opacity: 0.3,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  changeImageBtn: {
    marginTop: 12,
    padding: 8,
  },
  changeImageText: {
    color: '#CAA876',
    fontSize: 12,
  },
  textArea: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    letterSpacing: 1,
  },
  reviewCard: {
    marginBottom: 48,
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
