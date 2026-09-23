import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../Contexts/AppContext';
import Navigation from './Navigation';

const mockContextValue = {
  buttonLabels: { buttonLabelType: 'gp2040', swapTpShareLabels: false },
  setButtonLabels: vi.fn(),
  usedPins: [],
  setUsedPins: vi.fn(),
  availablePeripherals: {},
  setAvailablePeripherals: vi.fn(),
  getAvailablePeripherals: vi.fn(),
  expansionPins: {},
  setExpansionPins: vi.fn(),
  HETriggerCalibrations: {},
  setHETriggerCalibrations: vi.fn(),
  updateHETriggerCalibrations: vi.fn(),
  boardDefinition: {},
  getSelectedPeripheral: vi.fn(),
  updatePeripherals: vi.fn(),
  updateUsedPins: vi.fn(),
  updateExpansionPins: vi.fn(),
  updateBoardDefinition: vi.fn(),
  savedColorScheme: 'auto',
  setSavedColorScheme: vi.fn(),
  savedLanguage: 'en',
  setSavedLanguage: vi.fn(),
  loading: false,
  setLoading: vi.fn(),
};

const renderNav = () =>
  render(
    <AppContext.Provider value={mockContextValue}>
      <MemoryRouter>
        <Navigation />
      </MemoryRouter>
    </AppContext.Provider>,
  );

describe('Navigation logo', () => {
  it("points the logo at the app's own base URL, not a hardcoded root path", () => {
    renderNav();
    const logo = screen.getByAltText('GP2040-CE logo');
    // import.meta.env.BASE_URL defaults to '/' in this test environment, matching
    // today's firmware-embedded behavior exactly; the loader build
    // (vite.loader.config.ts, Task 2) sets BASE_URL to the published site's URL
    // instead, so this same source resolves correctly in both contexts.
    expect(logo).toHaveAttribute('src', `${import.meta.env.BASE_URL}images/logo.png`);
    expect(logo.getAttribute('src')).toBe('/images/logo.png');
  });
});
