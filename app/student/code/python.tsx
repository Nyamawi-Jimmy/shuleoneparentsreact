import React from 'react';
import { TierProvider } from '../../../screens/StudentAccount/TierContext';
import { PythonView } from '../../../screens/StudentAccount/views/PythonView';

export default function PythonViewRoute() {
  return (
    <TierProvider>
      <PythonView />
    </TierProvider>
  );
}
