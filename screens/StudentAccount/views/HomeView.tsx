import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTier } from '../TierContext';
import { useTokens } from '../tokens';
import { TopBar } from '../components/TopBar';
import { PlayHome } from '../home/PlayHome';
import { TeenHome } from '../home/TeenHome';
import { SeniorHome } from '../home/SeniorHome';
import { CampusHome } from '../home/CampusHome';

export const HomeView: React.FC = () => {
  const { layout, tier } = useTier();
  const tokens = useTokens(tier);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tokens.bgColor }]}>
      <TopBar />
      {layout === 'play' && <PlayHome />}
      {layout === 'teen' && <TeenHome />}
      {layout === 'senior' && <SeniorHome />}
      {layout === 'campus' && <CampusHome />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
});
