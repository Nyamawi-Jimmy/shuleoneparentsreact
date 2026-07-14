import React from 'react';
import { EventsView } from '../../screens/StudentAccount/views/EventsView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

// SchemeFresh remounts the screen content on a theme flip so every card,
// chip and app-bar detail rebuilds against the new scheme.
export default function Route() {
  return <SchemeFresh><EventsView /></SchemeFresh>;
}
