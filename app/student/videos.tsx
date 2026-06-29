import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { VideosView } from '../../screens/StudentAccount/views/VideosView';

export default function VideosViewRoute() {
  return (
    <TierProvider>
      <VideosView />
    </TierProvider>
  );
}
