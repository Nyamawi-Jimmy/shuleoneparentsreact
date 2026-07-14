import React from 'react';
import { StudentNotificationsView } from '../../screens/StudentAccount/views/StudentNotificationsView';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

export default function Route() {
  return <SchemeFresh><StudentNotificationsView /></SchemeFresh>;
}
