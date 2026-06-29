import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { TestsView } from '../../screens/StudentAccount/views/TestsView';

export default function TestsViewRoute() {
  return (
    <TierProvider>
      <TestsView />
    </TierProvider>
  );
}
