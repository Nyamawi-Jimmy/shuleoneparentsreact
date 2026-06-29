import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { StarsView } from '../../screens/StudentAccount/views/StarsView';

export default function StarsRoute() {
  return (
    <TierProvider>
      <StarsView />
    </TierProvider>
  );
}
