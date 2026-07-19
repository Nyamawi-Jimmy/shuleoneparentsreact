import React from 'react';
import { TestsView } from '../../screens/StudentAccount/views/TestsView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

// School exams + transcripts. Only reachable for voyager/scholar/campus AND
// in-school learners — the tab is hidden otherwise (see _layout).
// SchemeFresh remounts the screen content on a theme flip so every card,
// chip and app-bar detail rebuilds against the new scheme.
export default function Route() {
  return <SchemeFresh><TestsView /></SchemeFresh>;
}
