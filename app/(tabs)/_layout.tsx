import { Tabs } from 'expo-router';
import { useLanguage } from '../../context/LanguageContext';
import { BrandTabBar } from '../../components/BrandTabBar';

export default function TabLayout() {
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BrandTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="learning" options={{ title: t('nav.learning') }} />
      <Tabs.Screen name="finance" options={{ title: t('nav.fees') }} />
      <Tabs.Screen name="academics" options={{ title: t('nav.academics') }} />
      <Tabs.Screen name="communication" options={{ title: t('nav.communication') }} />
    </Tabs>
  );
}
