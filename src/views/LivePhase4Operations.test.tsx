import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import LivePhase4Operations from './LivePhase4Operations';
import type { WattScapeBackendClient } from '../services/backendApiClient';

describe('Live Phase 4 operations feedback', () => {
  afterEach(() => cleanup());

  it('keeps the mutation success announcement visible while refreshed data loads', async () => {
    const api = {
      floorPlan: vi.fn(async () => null),
      spatialElements: vi.fn(async () => []),
      createFloorPlan: vi.fn(async () => undefined),
    } as unknown as WattScapeBackendClient;
    const user = userEvent.setup();

    render(<LivePhase4Operations
      api={api}
      siteId="synthetic-site"
      floors={[{ id: 'synthetic-floor', name: 'Ground floor', level: 0 }]}
      rooms={[]}
      assets={[]}
      role="Organization Admin"
      actorSubject="synthetic-admin"
    />);

    await user.click(await screen.findByRole('button', { name: 'Save plan' }));
    expect((await screen.findByRole('status')).textContent).toContain('New floor plan revision saved.');
    expect(api.createFloorPlan).toHaveBeenCalledOnce();
  });
});
