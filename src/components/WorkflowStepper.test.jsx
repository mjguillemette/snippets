// WorkflowStepper.test.jsx
import React from 'react';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextUIProvider } from '@nextui-org/react';
import { WorkflowStepper, useNavigationControl } from './WorkflowStepper';

// Mock the validator context used by the component
jest.mock('../contexts/CITEDValidatorContext', () => ({
  useCITEDValidator: jest.fn(() => ({})),
}));

// Optional: silence Framer Motion warnings in test env
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    // Keep motion.* working; AnimatePresence can pass-through to avoid strict exit timing issues
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

function wrapper(ui) {
  return render(<NextUIProvider>{ui}</NextUIProvider>);
}

// A simple step component that can call completeStep through the public hook
function StepBody({ label = 'Step Body' }) {
  const { completeStep } = useNavigationControl();
  return (
    <div>
      <span>{label}</span>
      <button onClick={() => completeStep({ some: 'data' })}>Complete</button>
    </div>
  );
}

describe('WorkflowStepper', () => {
  const testIdPrefix = 'wspec';

  function makeSteps({ withDropdown = true } = {}) {
    return [
      {
        id: 'step-1',
        title: 'Step One',
        validate: () => true, // available initially
        component: () => <StepBody label="Step 1 Content" />,
        ...(withDropdown
          ? {
              subItems: [
                { id: 's1-a', title: 'Sub A', description: 'A' },
                { id: 's1-b', title: 'Sub B', description: 'B' },
              ],
            }
          : {}),
      },
      {
        id: 'step-2',
        title: 'Step Two',
        validate: () => false, // not available
        isLoading: () => false, // should become "next"
        component: () => <div>Step 2 Content</div>,
      },
      {
        id: 'step-3',
        title: 'Step Three',
        validate: () => false, // locked
        component: () => <div>Step 3 Content</div>,
      },
    ];
  }

  test('renders empty state when no steps provided', () => {
    wrapper(<WorkflowStepper steps={[]} testIdPrefix={testIdPrefix} />);
    expect(screen.getByTestId(`${testIdPrefix}-empty`)).toBeInTheDocument();
  });

  test('initial states: first step active, second next, third locked; progress reflects active bonus', () => {
    wrapper(
      <WorkflowStepper steps={makeSteps()} testIdPrefix={testIdPrefix} />
    );

    const step1 = screen.getByTestId(`${testIdPrefix}-step-step-1`);
    const step2 = screen.getByTestId(`${testIdPrefix}-step-step-2`);
    const step3 = screen.getByTestId(`${testIdPrefix}-step-step-3`);

    // aria-current marks the active "step"
    expect(step1).toHaveAttribute('aria-current', 'step');
    expect(step2).not.toHaveAttribute('aria-current');
    expect(step3).not.toHaveAttribute('aria-current');

    // "Next" chip should appear on step 2
    expect(within(step2).getByText(/Next/i)).toBeInTheDocument();

    // step 3 is disabled/locked
    expect(step3).toHaveAttribute('aria-disabled', 'true');

    // progressbar should have an approximate value of 16.7 (0.5 out of 3 steps)
    const progress = screen.getByTestId(`${testIdPrefix}-progress`);
    // NextUI Progress renders role="progressbar" with aria-valuenow
    const progressbar = within(progress).getByRole('progressbar');
    const valNow = Number(progressbar.getAttribute('aria-valuenow'));
    expect(valNow).toBeGreaterThan(15);
    expect(valNow).toBeLessThan(20);
  });

  test('clicking a locked step does nothing; clicking available step triggers onStepChange', async () => {
    const user = userEvent.setup();
    const onStepChange = jest.fn();

    wrapper(
      <WorkflowStepper
        steps={makeSteps()}
        onStepChange={onStepChange}
        testIdPrefix={testIdPrefix}
      />
    );

    const step3 = screen.getByTestId(`${testIdPrefix}-step-step-3`);
    await user.click(step3);
    expect(onStepChange).not.toHaveBeenCalledWith('step-3');

    const step1 = screen.getByTestId(`${testIdPrefix}-step-step-1`);
    await user.click(step1); // clicking active step re-fires change
    expect(onStepChange).toHaveBeenCalledWith('step-1');
  });

  test('completeStep advances to the next non-locked step', async () => {
    const user = userEvent.setup();
    const onStepChange = jest.fn();

    wrapper(
      <WorkflowStepper
        steps={makeSteps({ withDropdown: false })}
        onStepChange={onStepChange}
        testIdPrefix={testIdPrefix}
      />
    );

    // Current component is Step 1 body; click "Complete"
    await user.click(screen.getByRole('button', { name: /Complete/i }));

    // After completion, the "next" step (step-2) should become active
    const step2 = await screen.findByTestId(`${testIdPrefix}-step-step-2`);
    // Wait for effect-driven navigation; assert aria-current
    expect(step2).toHaveAttribute('aria-current', 'step');
    expect(onStepChange).toHaveBeenCalledWith('step-2');
  });

  test('debounce prevents rapid double navigation', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onStepChange = jest.fn();

    wrapper(
      <WorkflowStepper
        steps={makeSteps()}
        onStepChange={onStepChange}
        testIdPrefix={testIdPrefix}
      />
    );

    const step1 = screen.getByTestId(`${testIdPrefix}-step-step-1`);

    await user.dblClick(step1); // two rapid clicks
    // First click should register; second should be ignored by cooldown
    expect(onStepChange).toHaveBeenCalledTimes(1);

    // After cooldown, another click should register
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await user.click(step1);
    expect(onStepChange).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('subItems dropdown fires onSubItemSelect when an item is chosen', async () => {
    const user = userEvent.setup();
    const onSubItemSelect = jest.fn();

    wrapper(
      <WorkflowStepper
        steps={makeSteps({ withDropdown: true })}
        onSubItemSelect={onSubItemSelect}
        testIdPrefix={testIdPrefix}
      />
    );

    // Open the dropdown from step-1 (it has subItems)
    const triggerBtn = screen.getByTestId(`${testIdPrefix}-step-step-1`);
    await user.click(triggerBtn);

    // The DropdownMenu should render; click on "Sub A"
    const menu = await screen.findByTestId(`${testIdPrefix}-submenu-step-1`);
    const subItem = within(menu).getByTestId(
      `${testIdPrefix}-submenu-item-step-1-s1-a`
    );
    await user.click(subItem);

    expect(onSubItemSelect).toHaveBeenCalledWith('step-1', 's1-a');
  });

  test('validation banner is hidden by default when no errors are recorded', () => {
    wrapper(
      <WorkflowStepper steps={makeSteps()} testIdPrefix={testIdPrefix} />
    );
    expect(
      screen.queryByTestId(`${testIdPrefix}-validation-banner`)
    ).not.toBeInTheDocument();
  });
});
