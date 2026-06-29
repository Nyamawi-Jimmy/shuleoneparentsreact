import React from 'react';
import { TierProvider } from '../../../screens/StudentAccount/TierContext';
import { BlocklyView } from '../../../screens/StudentAccount/views/BlocklyView';

export default function BlocklyViewRoute() {
  return (
    <TierProvider>
      <BlocklyView />
    </TierProvider>
  );
}
