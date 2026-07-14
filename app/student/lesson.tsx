import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { LessonPlayer } from '../../screens/StudentAccount/views/LessonPlayer';
import { SchemeFresh } from '../../screens/StudentAccount/SchemeFresh';

export default function LessonRoute() {
  return (
    <TierProvider>
      <LessonProgressProvider>
        <SchemeFresh><LessonPlayer /></SchemeFresh>
      </LessonProgressProvider>
    </TierProvider>
  );
}
