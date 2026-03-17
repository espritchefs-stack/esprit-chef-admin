import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TextInput, 
  Pressable, 
  KeyboardAvoidingView, 
  Platform,
  Alert
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

// Types corresponding to Supabase structure
type Ingredient = {
  name: string;
  amount: string;
  unit: string;
};

type Instruction = {
  step: number;
  text: string;
  tip?: string;
  image_url?: string;
};

export default function RecipeEditorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  const [isPreview, setIsPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<'Foundation' | 'Intermediate' | 'Professional'>('Foundation');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');

  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', amount: '', unit: '' }
  ]);

  const [instructions, setInstructions] = useState<Instruction[]>([
    { step: 1, text: '', tip: '', image_url: '' }
  ]);

  // Handlers for Ingredients
  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: '', unit: '' }]);
  };

  const removeIngredient = (index: number) => {
    const newArr = [...ingredients];
    newArr.splice(index, 1);
    setIngredients(newArr);
  };

  const updateIngredient = (index: number, key: keyof Ingredient, value: string) => {
    const newArr = [...ingredients];
    newArr[index][key] = value;
    setIngredients(newArr);
  };

  // Handlers for Instructions
  const addInstruction = () => {
    setInstructions([...instructions, { step: instructions.length + 1, text: '', tip: '', image_url: '' }]);
  };

  const removeInstruction = (index: number) => {
    const newArr = [...instructions];
    newArr.splice(index, 1);
    // Re-index steps
    newArr.forEach((inst, i) => inst.step = i + 1);
    setInstructions(newArr);
  };

  const updateInstruction = (index: number, key: keyof Instruction, value: string) => {
    const newArr = [...instructions];
    // @ts-ignore
    newArr[index][key] = value;
    setInstructions(newArr);
  };

  const handleSave = async () => {
    Alert.alert('Save Output', 'Data structure ready to post to Supabase.');
    console.log({
      title, description, image_url: imageUrl, category, prep_time: prepTime, cook_time: cookTime, difficulty,
      ingredients, instructions
    });
  };

  if (isPreview) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          <View style={[styles.header, { paddingTop: insets.top }]}>
             <Pressable onPress={() => setIsPreview(false)} hitSlop={15}>
               <IconSymbol name="chevron.left" size={24} color={textColor} />
             </Pressable>
             <ThemedText style={styles.headerTitle}>PREVIEW</ThemedText>
             <View style={{ width: 24 }} />
          </View>

          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewHero} />
          ) : (
             <View style={[styles.previewHero, { backgroundColor: borderColor, justifyContent: 'center', alignItems: 'center' }]}>
               <ThemedText style={{ opacity: 0.5 }}>No Image</ThemedText>
             </View>
          )}

          <View style={styles.previewContent}>
            <View style={styles.previewBadge}>
              <ThemedText style={styles.previewBadgeText}>{category.toUpperCase()}</ThemedText>
            </View>
            <ThemedText style={styles.previewTitle}>{title || 'Untitled Recipe'}</ThemedText>
            <ThemedText style={styles.previewDesc}>{description || 'No description provided.'}</ThemedText>

            <View style={[styles.previewMeta, { borderTopColor: borderColor, borderBottomColor: borderColor }]}>
              <View style={styles.metaItem}>
                <ThemedText style={styles.metaLabel}>PREP</ThemedText>
                <ThemedText style={styles.metaValue}>{prepTime || '-'}m</ThemedText>
              </View>
              <View style={styles.metaItem}>
                <ThemedText style={styles.metaLabel}>COOK</ThemedText>
                <ThemedText style={styles.metaValue}>{cookTime || '-'}m</ThemedText>
              </View>
              <View style={styles.metaItem}>
                <ThemedText style={styles.metaLabel}>LEVEL</ThemedText>
                <ThemedText style={styles.metaValue}>{difficulty.toUpperCase()}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.sectionTitle}>INGREDIENTS</ThemedText>
            {ingredients.map((ing, i) => (
              <View key={i} style={styles.ingRow}>
                <ThemedText style={styles.ingName}>{ing.name || 'Unknown'}</ThemedText>
                <ThemedText style={styles.ingAmount}>{ing.amount} {ing.unit}</ThemedText>
              </View>
            ))}

            <ThemedText style={[styles.sectionTitle, { marginTop: 32 }]}>INSTRUCTIONS</ThemedText>
            {instructions.map((inst, i) => (
              <View key={i} style={styles.stepContainer}>
                <ThemedText style={styles.stepNumber}>Step {inst.step}</ThemedText>
                <ThemedText style={styles.stepText}>{inst.text || 'No instruction text'}</ThemedText>
                {inst.tip ? (
                  <View style={[styles.tipBox, { backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}>
                    <IconSymbol name="lightbulb.fill" size={16} color="#D4AF37" />
                    <ThemedText style={styles.tipText}>{inst.tip}</ThemedText>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom || 24, borderTopColor: borderColor }]}>
           <Pressable style={styles.actionButton} onPress={() => setIsPreview(false)}>
             <ThemedText style={styles.actionButtonText}>BACK TO EDIT</ThemedText>
           </Pressable>
           <Pressable style={[styles.actionButton, styles.primaryButton]} onPress={handleSave}>
             <ThemedText style={styles.primaryButtonText}>PUBLISH RECIPE</ThemedText>
           </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={() => router.back()} hitSlop={15}>
            <IconSymbol name="chevron.left" size={24} color={textColor} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>ESPRIT LABS</ThemedText>
          <Pressable onPress={() => setIsPreview(true)} hitSlop={15}>
            <IconSymbol name="eye" size={24} color={textColor} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Basic Info */}
          <View style={styles.adminSection}>
            <ThemedText style={styles.adminSectionTitle}>BASIC INFO</ThemedText>
            <TextInput 
              style={[styles.input, { color: textColor, borderColor }]} 
              placeholder="Recipe Title (e.g. Beef Wellington)" 
              placeholderTextColor={textColor + '60'}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput 
              style={[styles.input, { color: textColor, borderColor, height: 80 }]} 
              placeholder="Description & Story" 
              placeholderTextColor={textColor + '60'}
              multiline
              value={description}
              onChangeText={setDescription}
            />
            <TextInput 
              style={[styles.input, { color: textColor, borderColor }]} 
              placeholder="Cover Image URL" 
              placeholderTextColor={textColor + '60'}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
            />
            
            <View style={styles.row}>
              <TextInput 
                style={[styles.input, { flex: 1, color: textColor, borderColor }]} 
                placeholder="Prep Time (mins)" 
                placeholderTextColor={textColor + '60'}
                keyboardType="numeric"
                value={prepTime}
                onChangeText={setPrepTime}
              />
              <View style={{ width: 12 }} />
              <TextInput 
                style={[styles.input, { flex: 1, color: textColor, borderColor }]} 
                placeholder="Cook Time (mins)" 
                placeholderTextColor={textColor + '60'}
                keyboardType="numeric"
                value={cookTime}
                onChangeText={setCookTime}
              />
            </View>

            <ThemedText style={styles.label}>Vault Category</ThemedText>
            <View style={styles.categoryRow}>
              {['Foundation', 'Intermediate', 'Professional'].map(cat => (
                <Pressable 
                  key={cat} 
                  style={[styles.catBadge, category === cat && styles.catBadgeActive, { borderColor }]}
                  onPress={() => setCategory(cat as any)}
                >
                  <ThemedText style={[styles.catText, category === cat && styles.catTextActive]}>{cat}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Ingredients Form */}
          <View style={styles.adminSection}>
            <View style={styles.sectionHeaderRow}>
               <ThemedText style={styles.adminSectionTitle}>INGREDIENTS</ThemedText>
               <Pressable onPress={addIngredient} hitSlop={10}>
                 <IconSymbol name="plus.circle" size={20} color="#D4AF37" />
               </Pressable>
            </View>
            
            {ingredients.map((ing, i) => (
              <View key={i} style={[styles.dynamicRow, { borderColor }]}>
                <TextInput 
                  style={[styles.inputSm, { flex: 2, color: textColor, borderColor }]} 
                  placeholder="Name (e.g. Garlic)" 
                  placeholderTextColor={textColor + '60'}
                  value={ing.name}
                  onChangeText={(val) => updateIngredient(i, 'name', val)}
                />
                <TextInput 
                  style={[styles.inputSm, { flex: 1, color: textColor, borderColor }]} 
                  placeholder="Amt" 
                  placeholderTextColor={textColor + '60'}
                  value={ing.amount}
                  onChangeText={(val) => updateIngredient(i, 'amount', val)}
                />
                <TextInput 
                  style={[styles.inputSm, { flex: 1, color: textColor, borderColor }]} 
                  placeholder="Unit" 
                  placeholderTextColor={textColor + '60'}
                  value={ing.unit}
                  onChangeText={(val) => updateIngredient(i, 'unit', val)}
                />
                <Pressable onPress={() => removeIngredient(i)} style={styles.deleteBtn}>
                  <IconSymbol name="trash" size={20} color="#E02424" />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Instructions Form */}
          <View style={styles.adminSection}>
            <View style={styles.sectionHeaderRow}>
               <ThemedText style={styles.adminSectionTitle}>INSTRUCTIONS & TIPS</ThemedText>
               <Pressable onPress={addInstruction} hitSlop={10}>
                 <IconSymbol name="plus.circle" size={20} color="#D4AF37" />
               </Pressable>
            </View>
            
            {instructions.map((inst, i) => (
              <View key={i} style={[styles.dynamicContainer, { borderColor }]}>
                <View style={styles.stepHeader}>
                   <ThemedText style={styles.stepLabel}>Step {inst.step}</ThemedText>
                   <Pressable onPress={() => removeInstruction(i)} hitSlop={10}>
                     <IconSymbol name="trash" size={16} color="#E02424" />
                   </Pressable>
                </View>

                <TextInput 
                  style={[styles.input, { color: textColor, borderColor, height: 60 }]} 
                  placeholder="Instruction text..." 
                  placeholderTextColor={textColor + '60'}
                  multiline
                  value={inst.text}
                  onChangeText={(val) => updateInstruction(i, 'text', val)}
                />
                <TextInput 
                  style={[styles.input, { color: textColor, borderColor }]} 
                  placeholder="Pro Tip (Optional)" 
                  placeholderTextColor={textColor + '60'}
                  value={inst.tip}
                  onChangeText={(val) => updateInstruction(i, 'tip', val)}
                />
                <TextInput 
                  style={[styles.input, { color: textColor, borderColor }]} 
                  placeholder="Step Image URL (Optional)" 
                  placeholderTextColor={textColor + '60'}
                  value={inst.image_url}
                  onChangeText={(val) => updateInstruction(i, 'image_url', val)}
                  autoCapitalize="none"
                />
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 16,
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
  },
  adminSection: {
    marginBottom: 32,
  },
  adminSectionTitle: {
    fontSize: 10,
    letterSpacing: 3,
    opacity: 0.5,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  inputSm: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginRight: 8,
  },
  row: {
    flexDirection: 'row',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catBadge: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  catBadgeActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  catText: {
    fontSize: 12,
  },
  catTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  dynamicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtn: {
    padding: 8,
  },
  dynamicContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stepLabel: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
  },
  
  // Preview Styles
  previewHero: {
    width: '100%',
    height: 300,
  },
  previewContent: {
    padding: 24,
  },
  previewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 16,
  },
  previewBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  previewTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    marginBottom: 16,
  },
  previewDesc: {
    fontFamily: 'PlayfairDisplay_400Regular',
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 24,
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 32,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    letterSpacing: 2,
    opacity: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    letterSpacing: 1,
    marginBottom: 16,
  },
  ingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  ingName: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  ingAmount: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 14,
  },
  stepContainer: {
    marginBottom: 24,
  },
  stepNumber: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    color: '#D4AF37',
    marginBottom: 8,
  },
  stepText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  tipBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    color: '#D4AF37',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 24,
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4AF37',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#D4AF37',
  },
  actionButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#D4AF37',
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 1,
    color: '#000',
  },
});
