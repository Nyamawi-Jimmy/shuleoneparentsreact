import React from 'react';
import { TierProvider } from '../../../screens/StudentAccount/TierContext';
import { RoboticsView } from '../../../screens/StudentAccount/views/RoboticsView';

export default function RoboticsViewRoute() {
  return (
    <TierProvider>
      <RoboticsView />
    </TierProvider>
  );
}
