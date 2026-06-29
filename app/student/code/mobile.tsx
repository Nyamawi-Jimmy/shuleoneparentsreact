import React from 'react';
import { TierProvider } from '../../../screens/StudentAccount/TierContext';
import { MobileDevView } from '../../../screens/StudentAccount/views/MobileDevView';

export default function MobileDevViewRoute() {
  return (
    <TierProvider>
      <MobileDevView />
    </TierProvider>
  );
}
