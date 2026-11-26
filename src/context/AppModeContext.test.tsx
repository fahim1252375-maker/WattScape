import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AppModeProvider, useAppMode } from './AppModeContext';

function ModeProbe() {
  const { mode, setMode } = useAppMode();
  return <div><span>{mode === 'demo' ? 'Synthetic demo fixtures' : 'Live API tenant data'}</span><button onClick={() => setMode('live')}>Choose live</button><button onClick={() => setMode('demo')}>Choose demo</button></div>;
}

describe('explicit Demo and Live mode boundary', () => {
  it('starts in Demo Mode and switches to a separately persisted Live API Mode', () => {
    window.sessionStorage.clear();
    const { rerender } = render(<AppModeProvider><ModeProbe /></AppModeProvider>);
    expect(screen.getByText('Synthetic demo fixtures')).toBeTruthy();
    fireEvent.click(screen.getByText('Choose live'));
    expect(screen.getByText('Live API tenant data')).toBeTruthy();
    expect(window.sessionStorage.getItem('wattscape.app-mode')).toBe('live');
    rerender(<AppModeProvider><ModeProbe /></AppModeProvider>);
    expect(screen.getByText('Live API tenant data')).toBeTruthy();
    fireEvent.click(screen.getByText('Choose demo'));
    expect(window.sessionStorage.getItem('wattscape.app-mode')).toBe('demo');
  });
});
