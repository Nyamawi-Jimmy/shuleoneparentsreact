import React from 'react';
import { QuestView } from '../../screens/StudentAccount/views/QuestView';
import { ProfessionalPathView } from '../../screens/StudentAccount/views/ProfessionalPathView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';
import { useTier } from '../../screens/StudentAccount/TierContext';

// SchemeFresh remounts the screen content on a theme flip so every card,
// chip and app-bar detail rebuilds against the new scheme.
//
// Campus/college learners reach coding through this tab (labelled "Coding"),
// and it renders the professional 7-level path (Python/Web/SWE/AI) — mirroring
// the web's CampusLearn. Every younger tier gets the quest map.
export default function Route() {
  const { tier } = useTier();
  return (
    <SchemeFresh>
      {tier === 'campus' ? <ProfessionalPathView /> : <QuestView />}
    </SchemeFresh>
  );
}
