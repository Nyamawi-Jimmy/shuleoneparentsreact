import React from 'react';
import { TierProvider } from '../../../screens/StudentAccount/TierContext';
import { ScratchView } from '../../../screens/StudentAccount/views/ScratchView';

export default function ScratchViewRoute() {
  return (
    <TierProvider>
      <ScratchView />
    </TierProvider>
  );
}
