import React from 'react';
import { AvatarView } from '../../screens/StudentAccount/views/AvatarView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

// SchemeFresh remounts the screen content on a theme flip so every card,
// chip and app-bar detail rebuilds against the new scheme.
export default function Route() {
  return <SchemeFresh><AvatarView /></SchemeFresh>;
}
