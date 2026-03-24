import React, { useState, useRef } from 'react';
import { StyleSheet, View, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
  imageUrl?: string;
};

// Removed QUICK_LINKS array as requested

export default function AIAssistantScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      text: '안녕하세요. 에스프릿 셰프의 시크릿 레시피를 학습한 AI 어시스턴트입니다.\n요리하시다 막히는 부분이 있거나 셰프님의 요리에 대한 피드백이 필요하면 사진과 함께 질문해주세요!', 
      isUser: false 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("사진 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const sendMessage = async (text: string, imageUri: string | null = null) => {
    if (!text.trim() && !imageUri) return;

    const userMessage: Message = { id: Date.now().toString(), text, isUser: true, imageUrl: imageUri || undefined };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // Vision AI (이미지 파일 파싱 등) 더미 처리
      let bodyData: any = { message: text };
      if (imageUri) bodyData.hasImage = true;

      const { data, error } = await supabase.functions.invoke('esprit-ai-assistant', {
        body: bodyData
      });

      if (error) throw error;

      const aiMessage = { 
        id: (Date.now() + 1).toString(), 
        text: data.reply || '죄송합니다. 셰프님, 연결이 원활하지 않습니다.', 
        isUser: false 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Edge Function Error:', error);
      const errorMessage = { 
        id: (Date.now() + 1).toString(), 
        text: '죄송합니다. 셰프님, 시스템 응답에 문제가 생겼습니다.', 
        isUser: false 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.isUser;
    return (
      <View style={[styles.messageWrapper, isUser ? styles.messageWrapperUser : styles.messageWrapperAI]}>
        {!isUser && (
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' }} // Chef Avatar Placeholder
            style={styles.aiAvatar}
          />
        )}
        <View style={[
          styles.messageBubble, 
          isUser ? [styles.messageBubbleUser, { backgroundColor: textColor }] : [styles.messageBubbleAI, { backgroundColor: 'transparent', borderColor }]
        ]}>
          {item.imageUrl && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={{ width: 220, height: 220, borderRadius: 8, marginBottom: 8 }} 
              contentFit="cover" 
            />
          )}
          {item.text ? (
            <ThemedText style={[styles.messageText, { color: isUser ? backgroundColor : textColor }]}>
              {item.text}
            </ThemedText>
          ) : null}
          
          {/* Append KakaoTalk Guide for AI Messages */}
          {!isUser && (
            <View style={styles.aiActionContainer}>
              <View style={[styles.aiActionDivider, { backgroundColor: borderColor }]} />
              <ThemedText style={styles.aiActionGuide}>
                제 답변이 부족하거나 더 자세한 상담이 필요하시면 셰프님께 직접 물어보세요!
              </ThemedText>
              <Pressable 
                style={({ pressed }) => [
                  styles.aiActionButton, 
                  { borderColor: '#D4AF37', backgroundColor: pressed ? 'rgba(212, 175, 55, 0.1)' : 'transparent' }
                ]}
                onPress={() => Linking.openURL('http://pf.kakao.com/_BxeTqj/chat').catch(err => console.error(err))}
              >
                <IconSymbol name="bubble.left.and.bubble.right.fill" size={16} color="#D4AF37" />
                <ThemedText style={styles.aiActionButtonText}>셰프님께 직접 1:1 질문하기</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <ThemedText style={styles.headerTitle}>ESPRIT AI ASSISTANT</ThemedText>
        <ThemedText style={styles.headerSubtitle}>By Chef Jung Woo-sung</ThemedText>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Quick Links (Single Spotlight Button) */}
      <View style={styles.quickLinksContainer}>
        <Pressable 
          style={({ pressed }) => [
            styles.quickLinkButton, 
            { borderColor: '#D4AF37', backgroundColor: pressed ? 'rgba(212, 175, 55, 0.1)' : 'transparent' }
          ]}
          onPress={() => sendMessage("셰프님, 소금 한 꼬집은 정확히 어느 정도 양인가요?")}
          disabled={isLoading}
        >
          <ThemedText style={styles.quickLinkText}>
            "셰프님, 소금 한 꼬집은 정확히 어느 정도 양인가요?"
          </ThemedText>
        </Pressable>
      </View>

      {/* Input Area */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputWrapper, { borderTopColor: borderColor }]}>
          {selectedImage && (
            <View style={styles.selectedImageContainer}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImagePreview} />
              <Pressable style={styles.removeImageButton} onPress={removeImage}>
                <IconSymbol name="xmark.circle.fill" size={20} color="#000" />
              </Pressable>
            </View>
          )}
          <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 16 }]}>
            <Pressable onPress={pickImage} style={styles.attachButton}>
              <IconSymbol name="photo.fill" size={26} color={textColor} />
            </Pressable>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder="셰프님, 무엇이 궁금하신가요?"
              placeholderTextColor="rgba(150,150,150,0.5)"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => sendMessage(inputText, selectedImage)}
              editable={!isLoading}
            />
            <Pressable 
              style={[styles.sendButton, { backgroundColor: (inputText.trim() || selectedImage) && !isLoading ? '#D4AF37' : 'rgba(150,150,150,0.2)' }]}
              onPress={() => sendMessage(inputText, selectedImage)}
              disabled={(!inputText.trim() && !selectedImage) || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <IconSymbol name="paperplane.fill" size={20} color={(inputText.trim() || selectedImage) ? "#000" : "rgba(150,150,150,0.5)"} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 16,
    letterSpacing: 2,
    color: '#D4AF37', // Gold accent
  },
  headerSubtitle: {
    fontSize: 10,
    letterSpacing: 1,
    opacity: 0.5,
    marginTop: 4,
  },
  chatList: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 24,
    width: '100%',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperAI: {
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 16,
    borderRadius: 20,
  },
  messageBubbleUser: {
    borderBottomRightRadius: 4,
  },
  messageBubbleAI: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
    padding: 16,
  },
  messageText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
  },
  aiActionContainer: {
    marginTop: 16,
    paddingTop: 16,
    gap: 12,
  },
  aiActionDivider: {
    height: 1,
    width: '100%',
    opacity: 0.2,
  },
  aiActionGuide: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    opacity: 0.6,
    lineHeight: 16,
  },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  aiActionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#D4AF37',
  },
  quickLinksContainer: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  quickLinkButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickLinkText: {
    fontSize: 13,
    fontFamily: 'PlayfairDisplay_600SemiBold',
    color: '#D4AF37',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    borderTopWidth: 1,
    backgroundColor: 'transparent',
  },
  selectedImageContainer: {
    padding: 16,
    paddingBottom: 0,
    alignItems: 'flex-start',
  },
  selectedImagePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    left: 60,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  attachButton: {
    padding: 4,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    minHeight: 48,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
