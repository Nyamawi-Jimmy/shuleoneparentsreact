// Remounts its children whenever the active colour scheme flips. A remount
// forces EVERY descendant — however deep, memoised, or otherwise clever — to
// rebuild against the new scheme, so no card, chip, or app-bar detail can be
// left behind on the old theme. Navigation state is untouched: only the
// screen's content is rebuilt, in place.
import React from 'react';
import { useSchemeTick } from './studentTheme';

export const SchemeFresh: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useSchemeTick();
  return <React.Fragment key={scheme}>{children}</React.Fragment>;
};
