import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LiveClassesView } from '../../screens/StudentAccount/views/LiveClassesView';

export default function LiveClassesViewRoute() {
  return (
    <TierProvider>
      <LiveClassesView />
    </TierProvider>
  );
}
