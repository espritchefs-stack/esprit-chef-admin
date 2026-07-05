import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  FlatList, 
  ActivityIndicator, 
  Pressable, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { supabase } from '@/lib/supabase';
import { Image } from 'expo-image';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/ctx/auth';
import { useTranslation } from 'react-i18next';
import { awardMileage } from '@/lib/mileage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session, isGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const fetchPostDetails = async () => {
    setIsLoading(true);
    try {
      const postId = Array.isArray(id) ? id[0] : (id as string);

      const likedStr = await AsyncStorage.getItem('guest_liked_posts');
      if (likedStr) {
        try {
          const likedSet = new Set(JSON.parse(likedStr));
          setIsLiked(likedSet.has(postId));
        } catch {}
      }

      // 0. Intercept and completely bypass Supabase for Mock IDs to avoid Postgres 22P02 crashes
      if (postId && postId.startsWith('mock-')) {
        let mockPost = null;

        if (postId === 'mock-1') {
          mockPost = {
            id: 'mock-1',
            content: 'Just perfected my classic Beef Wellington. The secret is definitely in the mushroom duxelles and a perfectly crisp prosciutto wrap! 🥩✨',
            image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?q=80&w=2000&auto=format&fit=crop',
            likes_count: 24,
            created_at: new Date().toISOString(),
            profiles: {
              username: 'Chef Esprit',
              tier: 'EXPERT',
              avatar_url: 'https://i.pravatar.cc/150?u=fake_chef',
              points: 34500
            }
          };
        } else if (postId === 'mock-error-fallback') {
          mockPost = {
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
          };
        } else {
          // It's a user-published mock post
          const guestPublishedStr = await AsyncStorage.getItem('guest_published_posts');
          const guestPublished = guestPublishedStr ? JSON.parse(guestPublishedStr) : [];
          mockPost = guestPublished.find((p: any) => p.id === postId);
        }

        if (mockPost) setPost(mockPost);

        // Load comments for this mock post from storage
        const storedMockCommentsStr = await AsyncStorage.getItem(`mock_comments_${postId}`);
        if (storedMockCommentsStr) {
           setComments(JSON.parse(storedMockCommentsStr));
        } else {
           if (postId === 'mock-1') {
             const initialMocks = [
              { id: 'comment-1', content: 'This looks absolutely incredible! The crust is so uniform. Did you use an egg wash?', created_at: new Date(Date.now() - 3600000).toISOString(), profiles: { username: 'Baker_Jean', tier: 'INTERMEDIATE', avatar_url: 'https://i.pravatar.cc/150?u=jean'} },
              { id: 'comment-2', content: 'Chef, your duxelles technique is flawless. Looking forward to your next upload!', created_at: new Date(Date.now() - 1800000).toISOString(), profiles: { username: 'GourmetLife', tier: 'NOVICE', avatar_url: 'https://i.pravatar.cc/150?u=gourmet'} },
              { id: 'comment-3', content: 'Thank you! Yes, double egg wash for that golden shine. ✨', created_at: new Date(Date.now() - 900000).toISOString(), profiles: { username: 'Chef Esprit', tier: 'EXPERT', avatar_url: 'https://i.pravatar.cc/150?u=fake_chef'} }
            ];
            setComments(initialMocks);
            await AsyncStorage.setItem(`mock_comments_${postId}`, JSON.stringify(initialMocks));
           } else {
             setComments([]); // Empty for new guest posts
           }
        }
        setIsLoading(false);
        return;
      }

      // 1. Fetch Post Data from Supabase
      const { data: postData, error: postErr } = await supabase
        .from('community_posts')
        .select(`
          id, content, image_url, likes_count, created_at,
          profiles(username, tier, avatar_url, points)
        `)
        .eq('id', postId)
        .single();
      
      if (postErr) throw postErr;
      setPost(postData);

      // 2. Fetch Comments
      const { data: commentsData, error: commentsErr } = await supabase
        .from('comments')
        .select(`
          id, content, created_at,
          profiles(username, avatar_url, tier)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsErr) {
        console.warn('Comments table might not exist yet during testing', commentsErr);
      } else {
        setComments(commentsData || []);
      }

    } catch (e) {
      console.error('Error fetching details', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchPostDetails();
  }, [id]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    
    if (isGuest) {
      setIsSubmitting(true);
      setTimeout(async () => {
        setIsSubmitting(false);
        const currentPointsRaw = await AsyncStorage.getItem('guest_points');
        const currentPoints = parseInt(currentPointsRaw || '12500', 10);
        
        // First Blood Check (If only Bot exists, length = 1. Or 0 if old post)
        const isFirstBlood = comments.length <= 1;
        const ptsToAdd = isFirstBlood ? 15 : 5;
        const newPoints = currentPoints + ptsToAdd;
        
        await AsyncStorage.setItem('guest_points', newPoints.toString());

        const mockComment = {
          id: Math.random().toString(),
          content: newComment,
          created_at: new Date().toISOString(),
          profiles: {
            username: 'VIP Guest',
            avatar_url: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
          }
        };

        const postId = Array.isArray(id) ? id[0] : (id as string);
        const updatedComments = [...comments, mockComment];
        setComments(updatedComments);
        
        // Save back to AsyncStorage to sync with the Feed Comments array
        await AsyncStorage.setItem(`mock_comments_${postId}`, JSON.stringify(updatedComments));

        // Sync comment array length back to guest_published_posts so Feed can count it
        if (postId.toString().startsWith('mock-')) {
          const existingStr = await AsyncStorage.getItem('guest_published_posts');
          if (existingStr) {
            let existing = JSON.parse(existingStr);
            existing = existing.map((p: any) => 
              p.id === postId ? { ...p, comments: updatedComments } : p
            );
            await AsyncStorage.setItem('guest_published_posts', JSON.stringify(existing));
          }
        }

        setNewComment('');
        Alert.alert(
          isFirstBlood ? 'First Blood! 🩸' : 'Commented!', 
          `Thank you for your feedback! +${ptsToAdd} Esprit Mileage awarded.`
        );
      }, 1000);
      return;
    }

    if (!session?.user?.id) {
      Alert.alert('Restricted', 'Please log in to leave a comment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: id,
        user_id: session.user.id,
        content: newComment.trim()
      });

      if (error) throw error;

      // First Blood Check
      const isFirstBlood = comments.length <= 1;
      const ruleToApply = isFirstBlood ? 'COMMENT_FIRST_BLOOD' : 'COMMENT_CREATION';
      const ptsToAdd = isFirstBlood ? 15 : 5;

      await awardMileage(session.user.id, ruleToApply);
      setNewComment('');
      fetchPostDetails(); // Refresh list to get real ID and remote data
      Alert.alert(
        isFirstBlood ? 'First Blood! 🩸' : 'Commented!', 
        `Thank you for your feedback! +${ptsToAdd} Esprit Mileage awarded.`
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: any }) => {
    // If the database trigger sets user_id = NULL, Supabase won't return a profile object.
    const isBot = !item.profiles;
    const profile = item.profiles || {};
    
    const displayName = isBot ? 'Esprit Sous-Chef' : (profile.username || 'User');
    const displayAvatar = isBot 
      ? 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' 
      : (profile.avatar_url || 'https://i.pravatar.cc/150');
    
    return (
      <View style={[styles.commentRow, { borderBottomColor: borderColor }]}>
        <Image 
          source={{ uri: displayAvatar }} 
          style={styles.commentAvatar} 
        />
        <View style={styles.commentBody}>
          <ThemedText style={[styles.commentUsername, isBot && { color: '#CAA876' }]}>
            {displayName} {isBot && '🛡️'}
          </ThemedText>
          <ThemedText style={styles.commentText}>{item.content}</ThemedText>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!post) return null;
    const profile = post.profiles || {};
    
    return (
      <View style={styles.postCard}>
        {/* Nav Back */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.right" size={28} color={textColor} style={{ transform: [{ rotate: '180deg'}]}} />
        </Pressable>

        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <Image 
              source={{ uri: profile.avatar_url || 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }} 
              style={styles.avatar} 
            />
            <View style={styles.headerText}>
              <ThemedText style={styles.username}>{profile.username || 'Anonymous'}</ThemedText>
              <ThemedText style={styles.tier}>{profile.tier || 'NOVICE'} TIER</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.imageWrapper}>
          <Image source={{ uri: post.image_url }} style={styles.postImage} contentFit="cover" />
        </View>

        <View style={styles.postFooter}>
          <ThemedText style={styles.content}>{post.content}</ThemedText>
          <View style={styles.actions}>
            <Pressable 
              hitSlop={15}
              onPress={async () => {
                if (isLiked) return;
                setIsLiked(true);

                // Optimistic Local UI Update
                setPost((prev: any) => ({ ...prev, likes_count: (prev.likes_count || 0) + 1 }));

                const postId = Array.isArray(id) ? id[0] : (id as string);
                const likedStr = await AsyncStorage.getItem('guest_liked_posts');
                let likedList: Set<string> = new Set();
                try { likedList = new Set(likedStr ? JSON.parse(likedStr) : []); } catch {}
                likedList.add(postId);
                await AsyncStorage.setItem('guest_liked_posts', JSON.stringify(Array.from(likedList)));

                // Persist mock likes if it's a guest-authored post
                if (post.id.toString().startsWith('mock-')) {
                  const existingStr = await AsyncStorage.getItem('guest_published_posts');
                  if (existingStr) {
                    let existing = JSON.parse(existingStr);
                    existing = existing.map((p: any) => 
                      p.id === post.id ? { ...p, likes_count: (p.likes_count || 0) + 1 } : p
                    );
                    await AsyncStorage.setItem('guest_published_posts', JSON.stringify(existing));
                  }
                }
                Alert.alert('Liked!', 'Thank you for your appreciation! +5 Esprit Mileage awarded.');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <IconSymbol name={isLiked ? "heart.fill" : "heart"} size={20} color={isLiked ? "#E02424" : textColor} />
              <ThemedText style={styles.likes}>{post.likes_count || 0}</ThemedText>
            </Pressable>
            <IconSymbol name="message" size={20} color={textColor} style={{ marginLeft: 16 }} />
            <ThemedText style={styles.likes}>{comments.length}</ThemedText>
          </View>
        </View>
      </View>
    );
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
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={comments}
          keyExtractor={(item, index) => item.id || index.toString()}
          ListHeaderComponent={renderHeader()}
          renderItem={renderComment}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyComments}>
              <ThemedText style={styles.emptyText}>{t('add_comment')}</ThemedText>
            </View>
          }
        />

        {/* Comment Input Sticky Bottom */}
        <View style={[
          styles.inputContainer, 
          { backgroundColor, borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 16) }
        ]}>
          <TextInput
            style={[styles.textInput, { color: textColor, borderColor }]}
            placeholder={t('add_comment')}
            placeholderTextColor={textColor + '60'}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <Pressable 
            onPress={handlePostComment} 
            disabled={isSubmitting || !newComment.trim()}
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
          >
            {isSubmitting ? (
               <ActivityIndicator size="small" color="#D4AF37" />
            ) : (
               <ThemedText style={[styles.submitText, (!newComment.trim()) && { opacity: 0.3 }]}>Post</ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  listContent: {
    paddingTop: 40,
    paddingBottom: 24,
  },
  postCard: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
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
    gap: 16,
  },
  content: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    lineHeight: 24,
    opacity: 0.9,
    letterSpacing: 0.5,
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
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentBody: {
    flex: 1,
    justifyContent: 'center',
  },
  commentUsername: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 12,
    marginBottom: 4,
  },
  commentText: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.8,
  },
  emptyComments: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
    fontSize: 12,
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 12,
    maxHeight: 100,
  },
  submitBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  submitText: {
    color: '#CAA876',
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
