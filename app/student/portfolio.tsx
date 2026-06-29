import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { PortfolioView } from '../../screens/StudentAccount/views/PortfolioView';

export default function PortfolioViewRoute() {
  return (
    <TierProvider>
      <PortfolioView />
    </TierProvider>
  );
}
