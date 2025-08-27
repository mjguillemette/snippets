import React, { useState, useEffect, useCallback } from 'react';

// A custom React hook for managing the state and logic of a multi-step wizard.
// This hook encapsulates all the core functionality, making the UI component
// more reusable and presentational.
const useWizard = (config = {}) => {
  // Destructure configuration with default values.
  const {
    steps = 3,
    onComplete = async (data) => console.log('Completed:', data),
    onStepChange = (step) => {},
    initialData = {}
  } = config;

  // State variables for the wizard.
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Resets the wizard to its initial state.
  const reset = useCallback(() => {
    setCurrentStep(1);
    setFormData(initialData);
    setErrors({});
    setIsLoading(false);
  }, [initialData]);

  // Handlers to open and close the modal.
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(reset, 300); // Reset state after the modal animation completes.
  }, [reset]);

  // Navigation functions.
  // Jumps to a specific step.
  const goToStep = useCallback((step) => {
    if (step >= 1 && step <= steps && step <= currentStep) {
      setCurrentStep(step);
      onStepChange(step);
    }
  }, [currentStep, steps, onStepChange]);

  // Advances to the next step.
  const next = useCallback(() => {
    if (currentStep < steps) {
      setCurrentStep(prev => prev + 1);
      onStepChange(currentStep + 1);
    }
  }, [currentStep, steps, onStepChange]);

  // Goes back to the previous step.
  const previous = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  // Manages form data.
  // Updates a specific field in the form data.
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear the error for this field if it exists.
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Sets a validation error for a specific field.
  const setFieldError = useCallback((field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  // Handles the final form submission.
  const submit = useCallback(async () => {
    setIsLoading(true);
    try {
      await onComplete(formData);
      close();
    } catch (error) {
      console.error('Wizard submission error:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [formData, onComplete, close]);

  return {
    // State values exposed to the component.
    isOpen,
    currentStep,
    formData,
    errors,
    isLoading,
    totalSteps: steps,
    
    // Actions exposed to the component.
    open,
    close,
    next,
    previous,
    goToStep,
    updateField,
    setFieldError,
    submit,
    reset,
    
    // Computed boolean values for UI logic.
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === steps,
    canGoBack: currentStep > 1,
    canGoForward: currentStep < steps,
    progress: (currentStep / steps) * 100
  };
};

// A reusable UI component for a multi-step modal.
// It receives all its logic from the `useWizard` hook via props.
const MultiStepModal = ({ 
  wizard,
  title = "Create New Item",
  children 
}) => {
  // Adds a keyboard shortcut for navigation.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!wizard.isOpen) return;
      
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (wizard.isLastStep) {
          wizard.submit();
        } else {
          wizard.next();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wizard]);

  // Render nothing if the modal is not open.
  if (!wizard.isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={wizard.close}
    >
      <div 
        className="w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the modal.
      >
        {/* Header section with title and progress indicators */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {wizard.currentStep} of {wizard.totalSteps}
              </p>
            </div>
            {/* Step indicator buttons */}
            <div className="flex items-center gap-2">
              {Array.from({ length: wizard.totalSteps }, (_, i) => (
                <button
                  key={i}
                  onClick={() => wizard.goToStep(i + 1)}
                  disabled={i + 1 > wizard.currentStep}
                  className={`
                    w-8 h-8 rounded-full text-xs font-medium transition-all
                    ${i + 1 === wizard.currentStep 
                      ? 'bg-blue-600 text-white scale-110 shadow-lg' 
                      : i + 1 < wizard.currentStep
                      ? 'bg-green-500 text-white cursor-pointer hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                >
                  {i + 1 < wizard.currentStep ? '✓' : i + 1}
                </button>
              ))}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${wizard.progress}%` }}
            />
          </div>
        </div>
        
        {/* Main content area for the current step */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Renders the children. If children is a function, it passes the wizard object. */}
          {typeof children === 'function' 
            ? children(wizard)
            : children
          }
          
          {/* Displays a submission error if one exists. */}
          {wizard.errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{wizard.errors.submit}</p>
            </div>
          )}
        </div>
        
        {/* Footer section with navigation buttons */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {/* Keyboard shortcut hint */}
            <div className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+Enter</kbd> to continue
            </div>
            <div className="flex gap-3">
              {/* Back button */}
              {!wizard.isFirstStep && (
                <button 
                  onClick={wizard.previous}
                  disabled={wizard.isLoading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              )}
              
              {/* Conditional button for "Complete" or "Continue" */}
              {wizard.isLastStep ? (
                <button 
                  onClick={wizard.submit}
                  disabled={wizard.isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {wizard.isLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Complete
                </button>
              ) : (
                <button 
                  onClick={wizard.next}
                  disabled={wizard.isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// A simple component for a tag input.
const TagInput = ({ tags, onTagsChange }) => {
  const [input, setInput] = useState('');

  const addTag = () => {
    // Splits the input string by commas, filters out empty strings, and creates a unique set of tags.
    const newTags = input.split(',').map(t => t.trim()).filter(Boolean);
    if (newTags.length) {
      onTagsChange([...new Set([...tags, ...newTags])]);
      setInput('');
    }
  };

  const removeTag = (index) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Add tags (comma separated)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button 
          onClick={addTag}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Add
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span 
              key={i} 
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {tag}
              <button 
                onClick={() => removeTag(i)}
                className="hover:text-blue-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// The main application component that orchestrates the entire experience.
export default function App() {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);

  // Initialize the useWizard hook with a custom onComplete handler.
  const wizard = useWizard({
    steps: 3,
    initialData: {
      name: '',
      description: '',
      category: 'general',
      tags: [],
      priority: 'medium',
      notifications: true
    },
    onComplete: async (data) => {
      // Simulate an asynchronous API call.
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a new item object and add it to the state.
      const newItem = {
        id: Date.now(),
        ...data,
        createdAt: new Date().toISOString()
      };
      setItems(prev => [newItem, ...prev]);
      
      // Display a toast notification for success.
      setToast(`Successfully created "${data.name}"`);
      setTimeout(() => setToast(null), 3000);
      
      return newItem;
    },
    onStepChange: (step) => {
      console.log('Step changed to:', step);
    }
  });

  // A simple validation function for the first step.
  const validateStep1 = () => {
    // Check if the name field is empty.
    if (!wizard.formData.name?.trim()) {
      wizard.setFieldError('name', 'Name is required');
      return false;
    }
    // Check if the name is long enough.
    if (wizard.formData.name.length < 3) {
      wizard.setFieldError('name', 'Name must be at least 3 characters');
      return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        {/* Header section of the demo page */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Multi-Step Modal Demo
          </h1>
          <p className="text-lg text-gray-600">
            A reusable wizard component with a custom hook for easy API integration
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">React Hook</span>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">TypeScript Ready</span>
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">API Integration</span>
          </div>
        </div>

        {/* The main demo card with a button to open the modal */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Try It Out</h2>
              <p className="text-gray-600">
                Click below to open the multi-step modal wizard
              </p>
            </div>
            
            <button 
              onClick={wizard.open}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
            >
              Open Modal
            </button>

            {/* Feature grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl mt-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">🎯</div>
                <div className="text-sm font-medium">Form Validation</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-sm font-medium">Async Support</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">🎨</div>
                <div className="text-sm font-medium">Customizable</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-1">📱</div>
                <div className="text-sm font-medium">Responsive</div>
              </div>
            </div>
          </div>
        </div>

        {/* Displays the list of created items */}
        {items.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Created Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <h4 className="font-semibold text-lg mb-2">{item.name}</h4>
                  <p className="text-gray-600 text-sm mb-3">{item.description || 'No description'}</p>
                  <div className="flex gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' : 
                      item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.priority}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {item.category}
                    </span>
                  </div>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* The Multi-Step Modal component, which renders the wizard UI. */}
        <MultiStepModal wizard={wizard} title="Create New Item">
          {/* This function provides the content for each step based on the wizard's state. */}
          {(wizard) => (
            <>
              {/* Step 1: Basic Information */}
              {wizard.currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter item name"
                      value={wizard.formData.name}
                      onChange={(e) => wizard.updateField('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        wizard.errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      autoFocus
                    />
                    {wizard.errors.name && (
                      <p className="text-red-500 text-sm mt-1">{wizard.errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Add a description (optional)"
                      value={wizard.formData.description}
                      onChange={(e) => wizard.updateField('description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <div className="space-y-2">
                      {['general', 'work', 'personal', 'urgent'].map(cat => (
                        <label key={cat} className="flex items-center">
                          <input
                            type="radio"
                            value={cat}
                            checked={wizard.formData.category === cat}
                            onChange={(e) => wizard.updateField('category', e.target.value)}
                            className="mr-2"
                          />
                          <span className="capitalize">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Tags and Priority */}
              {wizard.currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <TagInput
                      tags={wizard.formData.tags || []}
                      onTagsChange={(tags) => wizard.updateField('tags', tags)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <div className="flex gap-3">
                      {['low', 'medium', 'high'].map(priority => (
                        <label key={priority} className="flex items-center">
                          <input
                            type="radio"
                            value={priority}
                            checked={wizard.formData.priority === priority}
                            onChange={(e) => wizard.updateField('priority', e.target.value)}
                            className="mr-2"
                          />
                          <span className="capitalize">{priority}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Use tags to organize and filter your items. 
                      Priority helps you focus on what matters most.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {wizard.currentStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-4">Review Your Item</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{wizard.formData.name || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Category:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm capitalize">
                          {wizard.formData.category}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Priority:</span>
                        <span className={`px-2 py-1 rounded text-sm capitalize ${
                          wizard.formData.priority === 'high' ? 'bg-red-100 text-red-700' : 
                          wizard.formData.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {wizard.formData.priority}
                        </span>
                      </div>
                      {wizard.formData.tags?.length > 0 && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600">Tags:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {wizard.formData.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {wizard.formData.description && (
                        <div className="py-2">
                          <span className="text-gray-600">Description:</span>
                          <p className="mt-1 text-gray-800">{wizard.formData.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      Everything looks good! Click "Complete" to create your item.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </MultiStepModal>

        {/* Toast notification component */}
        {toast && (
          <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 flex items-center gap-3 animate-slide-in">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
            <span className="font-medium">{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * useWizard - A custom React hook for managing the state and logic of a multi-step wizard.
 * Encapsulates all the core functionality, making UI components more reusable and presentational.
 * 
 * @param {Object} [config={}] - Configuration object for the wizard
 * @param {number} [config.steps=3] - Total number of steps in the wizard
 * @param {Function} [config.onComplete] - Async function called when wizard is completed, receives formData
 * @param {Function} [config.onStepChange] - Function called when step changes, receives new step number
 * @param {Object} [config.initialData={}] - Initial data object for the form
 * 
 * @returns {Object} Wizard state and actions object (see wizardPropType for full interface)
 */

/**
 * MultiStepModal - A reusable UI component for a multi-step modal wizard.
 * Receives all its logic from the useWizard hook via props.
 * 
 * @param {Object} wizard - The wizard object from useWizard hook (see wizardPropType)
 * @param {string} [title="Create New Item"] - Title displayed in modal header
 * @param {React.Node|Function} children - Content to render, can be JSX or render function
 */

/**
 * TagInput - A simple component for managing tags input with add/remove functionality.
 * 
 * @param {string[]} tags - Array of current tag strings
 * @param {Function} onTagsChange - Callback function called when tags array changes
 */

/**
 * GroupCreationModal - A specialized modal for creating groups, built on top of MultiStepModal.
 * 
 * @param {Object} wizard - The wizard object from useWizard hook (see wizardPropType)
 * @param {string} [title] - Title displayed in modal header
 * @param {React.Node|Function} [children] - Content to render, can be JSX or render function
 * @param {Array} selection - Array of selected items for group creation
 */

import PropTypes from 'prop-types';

// Shared wizard PropType definition
const wizardPropType = PropTypes.shape({
  isOpen: PropTypes.bool.isRequired,
  currentStep: PropTypes.number.isRequired,
  totalSteps: PropTypes.number.isRequired,
  formData: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isFirstStep: PropTypes.bool.isRequired,
  isLastStep: PropTypes.bool.isRequired,
  canGoBack: PropTypes.bool.isRequired,
  canGoForward: PropTypes.bool.isRequired,
  progress: PropTypes.number.isRequired,
  open: PropTypes.func.isRequired,
  close: PropTypes.func.isRequired,
  next: PropTypes.func.isRequired,
  previous: PropTypes.func.isRequired,
  goToStep: PropTypes.func.isRequired,
  updateField: PropTypes.func.isRequired,
  setFieldError: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
  reset: PropTypes.func.isRequired
});

// MultiStepModal component propTypes
MultiStepModal.propTypes = {
  wizard: wizardPropType.isRequired,
  title: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func
  ]).isRequired
};

// TagInput component propTypes
TagInput.propTypes = {
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onTagsChange: PropTypes.func.isRequired
};

// GroupCreationModal component propTypes
GroupCreationModal.propTypes = {
  wizard: wizardPropType.isRequired,
  title: PropTypes.string,
  children: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func
  ]),
  selection: PropTypes.array.isRequired
};

// Export the shared wizard PropType for use in other components
export { wizardPropType };