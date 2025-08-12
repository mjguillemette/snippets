import React, {
  useState,
  useMemo,
  useRef,
  createContext,
  useContext,
  useCallback,
  useEffect,
} from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { LuLock, LuCheckCircle2, LuMoreHorizontal } from 'react-icons/lu';
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Progress,
  Button,
  Chip,
} from '@nextui-org/react';
import { useCITEDValidator } from '../contexts/CITEDValidatorContext';

/** -----------------------------
 * Navigation Context & Hook
 * ------------------------------*/
const NavigationContext = createContext(null);

/**
 * Access controls for the workflow stepper.
 * @returns {{
 *   currentStepId: string|null,
 *   stepStates: Record<string,'locked'|'next'|'loading'|'available'|'active'|'completed'>,
 *   completeStep: (data?: any) => void,
 *   navigateToStep: (stepId: string) => void,
 *   resetToStep: (stepId: string) => void,
 *   updateContext: (updates: any) => void,
 *   getStepState: (stepId: string) => string,
 *   context: any,
 *   steps: Array<any>,
 *   manuallyCompleted: Set<string>
 * }}
 */
export const useNavigationControl = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationControl must be used within WorkflowStepper');
  }
  return context;
};

/** -----------------------------
 * Style Tokens
 * ------------------------------*/
const STATE_STYLES = {
  completed: 'bg-success text-success-foreground shadow-sm',
  active: 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20',
  available: 'bg-default-100 hover:bg-default-200 text-foreground',
  next: 'bg-warning-50 text-warning-700 border-2 border-dashed border-warning-300',
  loading: 'bg-default-100 text-default-600 ring-1 ring-default-300',
  locked: 'bg-default-50 text-default-400 cursor-not-allowed opacity-60',
};

const BUTTON_COLOR = (state) =>
  state === 'completed'
    ? 'success'
    : state === 'active'
    ? 'primary'
    : state === 'next'
    ? 'warning'
    : 'default';

const BUTTON_VARIANT = (state) => (state === 'active' ? 'solid' : 'flat');

/** -----------------------------
 * Safe helpers for user callbacks
 * ------------------------------*/
function safeTry(fn, fallback) {
  try {
    return fn();
  } catch (e) {
    console.warn('WorkflowStepper: Callback error', e);
    return fallback;
  }
}

function callValidate(step, ctx) {
  if (typeof step.validate !== 'function') return false;
  return safeTry(() => !!step.validate(ctx), false);
}

function callIsLoading(step, ctx) {
  if (typeof step.isLoading !== 'function') return false;
  return safeTry(() => !!step.isLoading(ctx), false);
}

/** -----------------------------
 * Button Content
 * ------------------------------*/
function NavigationButtonContent({ state, step, showTitle }) {
  const Icon = step.icon;

  return (
    <div className="flex items-center gap-2">
      {state === 'completed' ? (
        <LuCheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : state === 'locked' ? (
        <LuLock className="w-4 h-4 flex-shrink-0" />
      ) : (
        Icon && <Icon className="w-4 h-4 flex-shrink-0" />
      )}

      <AnimatePresence>
        {showTitle && (
          <motion.span
            layout="position"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="font-medium whitespace-nowrap overflow-hidden"
          >
            {step.title}
          </motion.span>
        )}
      </AnimatePresence>

      {step.subItems && <LuMoreHorizontal className="w-3 h-3 opacity-60" />}
    </div>
  );
}

NavigationButtonContent.propTypes = {
  state: PropTypes.string.isRequired,
  step: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    icon: PropTypes.elementType,
    subItems: PropTypes.array,
  }).isRequired,
  showTitle: PropTypes.bool,
};

/** -----------------------------
 * Workflow Stepper
 * ------------------------------*/
/**
 * A gated workflow navigation component with animated steps.
 * @param {Object} props
 * @param {Array<{
 *   id:string, title:string, icon?:React.ComponentType,
 *   component?:React.ComponentType, validate?:(ctx:any)=>boolean,
 *   isLoading?:(ctx:any)=>boolean,
 *   subItems?:Array<{id:string,title:string,description?:string}>
 * }>} props.steps
 * @param {(stepId:string)=>void} [props.onStepChange]
 * @param {(stepId:string, subId:string)=>void} [props.onSubItemSelect]
 * @param {(updates:any)=>void} [props.onContextUpdate]
 * @param {string} [props.className]
 * @param {string} [props.emptyMessage]
 * @param {boolean} [props.showErrorFeedback]
 * @param {string} [props.testIdPrefix] A prefix for all data-testid attributes to aid testing.
 */
export function WorkflowStepper({
  steps = [],
  onStepChange,
  onSubItemSelect,
  onContextUpdate,
  className = '',
  emptyMessage = 'No steps configured.',
  showErrorFeedback = true,
  testIdPrefix = 'workflow-stepper',
}) {
  const context = useCITEDValidator();

  // Guard: no steps configured
  const firstId = steps?.[0]?.id ?? null;
  const [currentStepId, setCurrentStepId] = useState(firstId);
  const [hoveredStep, setHoveredStep] = useState(null);
  const [manuallyCompleted, setManuallyCompleted] = useState(new Set());
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Lightweight debounce for rapid navigation clicks
  const lastNavAtRef = useRef(0);
  const NAV_COOLDOWN_MS = 250;
  const canNavigateNow = () => Date.now() - lastNavAtRef.current >= NAV_COOLDOWN_MS;
  const stampNav = () => {
    lastNavAtRef.current = Date.now();
  };

  if (!steps || steps.length === 0) {
    return (
      <div className={className} data-testid={`${testIdPrefix}-empty`}>
        {emptyMessage}
      </div>
    );
  }

  /** -----------------------------
   * Step states computation
   * ------------------------------*/
  const { stepStates, errors: computedErrors } = useMemo(() => {
    const states = {};
    const errors = [];
    let firstNonAvailableIndex = -1;

    // Precompute validation and loading states
    const computed = steps.map((step) => {
      const isValid = callValidate(step, context);
      const isLoading = callIsLoading(step, context);
      return { id: step.id, isValid, isLoading };
    });

    // Mark available steps
    computed.forEach(({ id, isValid }, index) => {
      const isManually = manuallyCompleted.has(id);
      if (isValid || isManually) {
        states[id] = 'available';
      } else if (firstNonAvailableIndex === -1) {
        firstNonAvailableIndex = index;
      }
    });

    // Assign next/loading & locked states
    if (firstNonAvailableIndex !== -1) {
      steps.forEach((step, index) => {
        if (states[step.id]) return; // already available
        if (index === firstNonAvailableIndex) {
          const isLoading = computed[index].isLoading;
          states[step.id] = isLoading ? 'loading' : 'next';
        } else if (index > firstNonAvailableIndex) {
          states[step.id] = 'locked';
        }
      });
    }

    // Mark completed: available steps before current
    const currentIdx = steps.findIndex((s) => s.id === currentStepId);
    steps.forEach((step, index) => {
      if (index < currentIdx && states[step.id] === 'available') {
        states[step.id] = 'completed';
      }
    });

    // Override current step to active (if not locked)
    const curState = states[currentStepId];
    if (curState && curState !== 'locked') {
      states[currentStepId] = 'active';
    } else if (!curState) {
      // Current step might be unknown; default to locked
      states[currentStepId] = 'locked';
    }

    return { stepStates: states, errors };
  }, [steps, currentStepId, context, manuallyCompleted]);

  // Set validation errors (kept for future extension)
  useEffect(() => {
    setValidationErrors(computedErrors);
  }, [computedErrors]);

  /** -----------------------------
   * Progress calculation
   * ------------------------------*/
  const progress = useMemo(() => {
    const values = Object.values(stepStates);
    const completedCount = values.filter((s) => s === 'completed').length;
    const activeState = stepStates[currentStepId];
    const activeBonus =
      activeState === 'active' || activeState === 'loading' ? 0.5 : 0;
    return ((completedCount + activeBonus) / steps.length) * 100;
  }, [stepStates, currentStepId, steps.length]);

  const CurrentComponent =
    steps.find((s) => s.id === currentStepId)?.component || null;

  /** -----------------------------
   * Handlers
   * ------------------------------*/
  const handleStepClick = useCallback(
    (stepId, state) => {
      if (state === 'locked') return;
      if (!canNavigateNow()) return;
      stampNav();
      setCurrentStepId(stepId);
      onStepChange?.(stepId);
    },
    [onStepChange]
  );

  const completeStep = useCallback(
    (data) => {
      const currentIndex = steps.findIndex((s) => s.id === currentStepId);

      setManuallyCompleted((prev) => {
        const updated = new Set(prev);
        updated.add(currentStepId);
        return updated;
      });

      if (data) {
        safeTry(() => onContextUpdate?.(data), null);
      }

      // Defer navigation to effect to avoid race conditions
      setPendingAdvance(true);

      // If last step, still notify
      if (currentIndex === steps.length - 1) {
        onStepChange?.(currentStepId);
      }
    },
    [currentStepId, steps, onContextUpdate, onStepChange]
  );

  const navigateToStep = useCallback(
    (stepId) => {
      const state = stepStates[stepId];
      if (state === 'locked') return;
      if (!canNavigateNow()) return;
      stampNav();
      setCurrentStepId(stepId);
      onStepChange?.(stepId);
    },
    [stepStates, onStepChange]
  );

  const resetToStep = useCallback(
    (stepId) => {
      const stepIndex = steps.findIndex((s) => s.id === stepId);
      if (stepIndex < 0) return;
      const idsToReset = steps.slice(stepIndex).map((s) => s.id);

      setManuallyCompleted((prev) => {
        const next = new Set(prev);
        idsToReset.forEach((id) => next.delete(id));
        return next;
      });

      setCurrentStepId(stepId);
      onStepChange?.(stepId);
    },
    [steps, onStepChange]
  );

  const updateContext = useCallback(
    (updates) => {
      safeTry(() => onContextUpdate?.(updates), null);
    },
    [onContextUpdate]
  );

  const getStepState = useCallback(
    (stepId) => {
      return stepStates[stepId] || 'locked';
    },
    [stepStates]
  );

  // Effect to handle deferred navigation after completion
  useEffect(() => {
    if (!pendingAdvance) return;

    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    // Find the first step after current that is not locked
    const next = steps.find((step, index) => {
      if (index <= currentIndex) return false;
      const state = stepStates[step.id];
      return state && state !== 'locked';
    });

    if (next) {
      stampNav();
      setCurrentStepId(next.id);
      onStepChange?.(next.id);
    }

    setPendingAdvance(false);
  }, [pendingAdvance, stepStates, steps, currentStepId, onStepChange]);

  const navigationContextValue = useMemo(
    () => ({
      currentStepId,
      stepStates,
      completeStep,
      navigateToStep,
      resetToStep,
      updateContext,
      getStepState,
      context,
      steps,
      manuallyCompleted,
    }),
    [
      currentStepId,
      stepStates,
      completeStep,
      navigateToStep,
      resetToStep,
      updateContext,
      getStepState,
      context,
      steps,
      manuallyCompleted,
    ]
  );

  /** -----------------------------
   * Render
   * ------------------------------*/
  return (
    <NavigationContext.Provider value={navigationContextValue}>
      <div 
        className={`flex flex-col h-full ${className}`}
        data-testid={`${testIdPrefix}-root`}
      >
        {/* Top progress + nav */}
        <div className="bg-background/50 backdrop-blur-sm border-b">
          <Progress
            value={progress}
            aria-label="Workflow progress"
            className="h-1"
            classNames={{
              indicator: 'bg-gradient-to-r from-primary to-primary/60',
            }}
            data-testid={`${testIdPrefix}-progress`}
          />

          <nav
            className="flex items-center justify-center gap-2 px-4 py-3"
            role="navigation"
            aria-label="Workflow steps"
            data-testid={`${testIdPrefix}-nav`}
          >
            {steps.map((step, index) => {
              const state = stepStates[step.id];
              const isHovered = hoveredStep === step.id;
              const showTitle = isHovered || state === 'active';

              const buttonProps = {
                size: 'sm',
                variant: BUTTON_VARIANT(state),
                color: BUTTON_COLOR(state),
                className: `min-w-0 ${STATE_STYLES[state] || STATE_STYLES.locked} transition-all duration-200`,
                isDisabled: state === 'locked',
                'aria-current': state === 'active' ? 'step' : undefined,
                'aria-disabled': state === 'locked' ? 'true' : undefined,
                'aria-busy': state === 'loading' ? 'true' : undefined,
                onMouseEnter: () => setHoveredStep(step.id),
                onMouseLeave: () => setHoveredStep(null),
                endContent:
                  state === 'loading' ? (
                    <Chip size="sm" variant="dot" color="default">
                      Loading
                    </Chip>
                  ) : state === 'next' ? (
                    <Chip size="sm" color="warning" variant="dot">
                      Next
                    </Chip>
                  ) : null,
                'data-testid': `${testIdPrefix}-step-${step.id}`,
              };

              return (
                <React.Fragment key={step.id}>
                  {step.subItems ? (
                    <Dropdown>
                      <DropdownTrigger>
                        <Button
                          {...buttonProps}
                          onPress={() => handleStepClick(step.id, state)}
                        >
                          <NavigationButtonContent
                            state={state}
                            step={step}
                            showTitle={showTitle}
                          />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        aria-label={`${step.title} submenu`}
                        onAction={(key) => onSubItemSelect?.(step.id, key)}
                        data-testid={`${testIdPrefix}-submenu-${step.id}`}
                      >
                        {step.subItems.map((subItem) => (
                          <DropdownItem
                            key={subItem.id}
                            description={subItem.description}
                            startContent={
                              <div className="w-2 h-2 rounded-full bg-default-400" />
                            }
                            data-testid={`${testIdPrefix}-submenu-item-${step.id}-${subItem.id}`}
                          >
                            {subItem.title}
                          </DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                  ) : (
                    <motion.div
                      whileHover={state !== 'locked' ? { scale: 1.02 } : undefined}
                      whileTap={state !== 'locked' ? { scale: 0.98 } : undefined}
                    >
                      <Button
                        {...buttonProps}
                        onPress={() => handleStepClick(step.id, state)}
                      >
                        <NavigationButtonContent
                          state={state}
                          step={step}
                          showTitle={showTitle}
                        />
                      </Button>
                    </motion.div>
                  )}

                  {index < steps.length - 1 && (
                    <motion.div
                      className="w-4 h-0.5 bg-default-200"
                      style={{ transformOrigin: 'left' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      data-testid={`${testIdPrefix}-connector-${index}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>

        {/* Step content */}
        <div 
          className="flex-1 overflow-auto relative"
          data-testid={`${testIdPrefix}-content`}
        >
          <AnimatePresence mode="wait">
            {CurrentComponent ? (
              <motion.div
                key={currentStepId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                <CurrentComponent />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-default-500"
              >
                No content for this step.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error feedback */}
          <AnimatePresence>
            {showErrorFeedback && validationErrors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute bottom-4 left-4 right-4 p-3 bg-warning-50 border border-warning-200 rounded-lg"
                role="alert"
                aria-live="polite"
                data-testid={`${testIdPrefix}-validation-banner`}
              >
                <p className="text-sm text-warning-700 font-medium">
                  Validation Issues Detected
                </p>
                <p className="text-xs text-warning-600 mt-1">
                  Some step validations encountered errors. Affected steps have been
                  locked.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </NavigationContext.Provider>
  );
}

WorkflowStepper.propTypes = {
  steps: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
      component: PropTypes.elementType,
      validate: PropTypes.func, // (context) => boolean
      isLoading: PropTypes.func, // (context) => boolean
      subItems: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          description: PropTypes.string,
        })
      ),
    })
  ),
  onStepChange: PropTypes.func,
  onSubItemSelect: PropTypes.func,
  onContextUpdate: PropTypes.func,
  className: PropTypes.string,
  emptyMessage: PropTypes.string,
  showErrorFeedback: PropTypes.bool,
  testIdPrefix: PropTypes.string,
};