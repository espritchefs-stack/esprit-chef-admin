import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useTranslation } from 'react-i18next';

export default function SearchScreen() {
  const { t } = useTranslation();
  
  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{t('search')}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
