import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { AssignmentsView } from '../../screens/StudentAccount/views/AssignmentsView';

export default function AssignmentsViewRoute() {
  return (
    <TierProvider>
      <AssignmentsView />
    </TierProvider>
  );
}
