import React from 'react';
import { ProgressView } from '../../screens/StudentAccount/views/ProgressView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

// SchemeFresh remounts the screen content on a theme flip so every card,
// chip and app-bar detail rebuilds against the new scheme.
export default function Route() {
  return <SchemeFresh><ProgressView /></SchemeFresh>;
}
