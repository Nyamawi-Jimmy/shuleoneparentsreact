import React from 'react';
import { TierProvider } from '../../screens/StudentAccount/TierContext';
import { LessonProgressProvider } from '../../screens/StudentAccount/LessonProgressContext';
import { LessonPlayer } from '../../screens/StudentAccount/views/LessonPlayer';

export default function LessonRoute() {
  return (
    <TierProvider>
      <LessonProgressProvider>
        <LessonPlayer />
      </LessonProgressProvider>
    </TierProvider>
  );
}
