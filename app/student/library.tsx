import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LibraryView } from '../../screens/StudentAccount/views/LibraryView';

export default function LibraryViewRoute() {
  return (
    <TierProvider>
      <LibraryView />
    </TierProvider>
  );
}
