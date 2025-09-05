import React, { useState, useEffect, useCallback } from "react";

// A custom React hook for managing the state and logic of a multi-step wizard.
const useWizard = (config = {}) => {
  const {
    steps = 3,
    onComplete = async (data) => console.log("Completed:", data),
    onStepChange = (step) => {},
    initialData = {}
  } = config;
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const reset = useCallback(() => {
    setCurrentStep(1);
    setFormData(initialData);
    setErrors({});
    setIsLoading(false);
    setIsEditing(false);
  }, [initialData]);

  const open = useCallback(() => {
    reset();
    setIsOpen(true);
  }, [reset]);

  const openForEdit = useCallback((item) => {
    setCurrentStep(1);
    setErrors({});
    setIsLoading(false);
    setFormData(item);
    setIsEditing(true);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTimeout(reset, 300);
  }, [reset]);

  const goToStep = useCallback(
    (step) => {
      const canGo = isEditing || step <= currentStep;
      if (step >= 1 && step <= steps && canGo) {
        setCurrentStep(step);
        onStepChange(step);
      }
    },
    [currentStep, steps, onStepChange, isEditing]
  );

  const next = useCallback(
    (validator) => {
      if (validator && !validator()) return false;
      if (currentStep < steps) {
        setCurrentStep((prev) => prev + 1);
        onStepChange(currentStep + 1);
        return true;
      }
      return false;
    },
    [currentStep, steps, onStepChange]
  );

  const previous = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      onStepChange(currentStep - 1);
    }
  }, [currentStep, onStepChange]);

  const updateField = useCallback(
    (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  const setFieldError = useCallback((field, error) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const submit = useCallback(async () => {
    setIsLoading(true);
    try {
      await onComplete(formData);
      close();
    } catch (error) {
      console.error("Wizard submission error:", error);
      setErrors({ submit: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [formData, onComplete, close]);

  return {
    isOpen,
    currentStep,
    formData,
    errors,
    isLoading,
    isEditing,
    totalSteps: steps,
    open,
    openForEdit,
    close,
    next,
    previous,
    goToStep,
    updateField,
    setFieldError,
    submit,
    reset,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === steps,
    canGoBack: currentStep > 1,
    canGoForward: currentStep < steps,
    progress: (currentStep / steps) * 100
  };
};

const MultiStepModal = ({ wizard, title = "Create New Item", children }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!wizard.isOpen) return;
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const validator = wizard.stepValidators?.[wizard.currentStep];
        if (wizard.isLastStep) {
          if (validator && !validator()) return;
          wizard.submit();
        } else {
          wizard.next(validator);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [wizard]);

  if (!wizard.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={wizard.close}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-white rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Step {wizard.currentStep} of {wizard.totalSteps}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {Array.from({ length: wizard.totalSteps }, (_, i) => (
                <button
                  key={i}
                  onClick={() => wizard.goToStep(i + 1)}
                  disabled={!wizard.isEditing && i + 1 > wizard.currentStep}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${
                    i + 1 === wizard.currentStep
                      ? "bg-blue-600 text-white scale-110 shadow-lg"
                      : i + 1 < wizard.currentStep || wizard.isEditing
                      ? "bg-green-500 text-white cursor-pointer hover:scale-105"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {i + 1 < wizard.currentStep || wizard.isEditing ? "✓" : i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${wizard.progress}%` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {typeof children === "function" ? children(wizard) : children}
          {wizard.errors.submit && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{wizard.errors.submit}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">
                Ctrl+Enter
              </kbd>{" "}
              to continue
            </div>
            <div className="flex gap-3">
              {!wizard.isFirstStep && (
                <button
                  onClick={wizard.previous}
                  disabled={wizard.isLoading}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              )}
              {wizard.isLastStep ? (
                <button
                  onClick={() => {
                    const validator =
                      wizard.stepValidators?.[wizard.currentStep];
                    if (validator && !validator()) return;
                    wizard.submit();
                  }}
                  disabled={wizard.isLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {wizard.isLoading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  )}
                  {wizard.isEditing ? "Save Changes" : "Complete"}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const validator =
                      wizard.stepValidators?.[wizard.currentStep];
                    wizard.next(validator);
                  }}
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

const CollectionDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isLoading
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Delete Item</h2>
        </div>
        <div className="flex-1 px-6 py-6">
          <p className="text-gray-600">
            Are you sure you want to delete the item{" "}
            <strong className="text-gray-800">"{itemName}"</strong>?
          </p>
          <p className="mt-2 text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:bg-red-400 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

// --- NEW COMPONENT ---
const AddToCollectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  items,
  collections,
  isLoading
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState(new Set());
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleItemToggle = (itemId) => {
    const newSet = new Set(selectedItemIds);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setSelectedItemIds(newSet);
  };

  useEffect(() => {
    if (!isOpen) {
      setSelectedItemIds(new Set());
      setSelectedCollectionId("");
      setSearchTerm("");
    }
  }, [isOpen]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleConfirm = () =>
    onConfirm({
      collectionId: selectedCollectionId,
      itemIds: Array.from(selectedItemIds)
    });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Items to Collection
          </h2>
        </div>
        <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Collection
            </label>
            <select
              value={selectedCollectionId}
              onChange={(e) => setSelectedCollectionId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Choose a collection...
              </option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Items ({selectedItemIds.size} selected)
            </label>
            <input
              type="search"
              placeholder="Search for items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => handleItemToggle(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-800">
                      {item.name}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center p-4">
                  No items found.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              isLoading || !selectedCollectionId || selectedItemIds.size === 0
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-blue-400 flex items-center gap-2"
          >
            {isLoading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            Add to Collection
          </button>
        </div>
      </div>
    </div>
  );
};

const TagInput = ({ tags, onTagsChange }) => {
  const [input, setInput] = useState("");
  const addTag = () => {
    const newTags = input
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (newTags.length) {
      onTagsChange([...new Set([...tags, ...newTags])]);
      setInput("");
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
            if (e.key === "Enter") {
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

export default function App() {
  const [items, setItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [modalTitle, setModalTitle] = useState("Create New Item");
  // --- NEW STATE ---
  const [collections, setCollections] = useState([
    { id: "c1", name: "Work Projects" },
    { id: "c2", name: "Personal Errands" },
    { id: "c3", name: "Vacation Ideas" }
  ]);
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);

  const wizard = useWizard({
    steps: 3,
    initialData: {
      name: "",
      description: "",
      category: "general",
      tags: [],
      priority: "medium",
      notifications: true
    },
    onComplete: async (data) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (data.id) {
        const updatedItem = { ...data, updatedAt: new Date().toISOString() };
        setItems((prev) =>
          prev.map((item) => (item.id === data.id ? updatedItem : item))
        );
        setToast(`Successfully updated "${data.name}"`);
      } else {
        const newItem = {
          id: Date.now(),
          ...data,
          createdAt: new Date().toISOString()
        };
        setItems((prev) => [newItem, ...prev]);
        setToast(`Successfully created "${data.name}"`);
      }
      setTimeout(() => setToast(null), 3000);
    },
    onStepChange: (step) => {
      console.log("Step changed to:", step);
    }
  });

  const handleCreate = () => {
    setModalTitle("Create New Item");
    wizard.open();
  };
  const handleEdit = (item) => {
    setModalTitle(`Edit "${item.name}"`);
    wizard.openForEdit(item);
  };
  const handleDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
    setToast(`Successfully deleted "${itemToDelete.name}"`);
    setTimeout(() => setToast(null), 3000);
    setIsDeleting(false);
    setItemToDelete(null);
  };

  // --- NEW HANDLER ---
  const handleConfirmAddToCollection = async ({ collectionId, itemIds }) => {
    setIsAddingToCollection(true);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

    const collection = collections.find((c) => c.id === collectionId);
    console.log(
      `Adding ${itemIds.length} items to collection "${collection.name}"`,
      { collectionId, itemIds }
    );

    setToast(`Added ${itemIds.length} items to "${collection.name}"`);
    setTimeout(() => setToast(null), 3000);
    setIsAddingToCollection(false);
    setIsAddToCollectionOpen(false);
  };

  const validateStep1 = () => {
    let hasErrors = false;
    const name = wizard.formData.name?.trim();
    if (!name) {
      wizard.setFieldError("name", "Name is required");
      hasErrors = true;
    } else if (name.length < 2) {
      wizard.setFieldError("name", "Name must be at least 2 characters");
      hasErrors = true;
    }
    return !hasErrors;
  };
  wizard.stepValidators = { 1: validateStep1, 2: () => true, 3: () => true };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Multi-Functional Modal Demo
          </h1>
          <p className="text-lg text-gray-600">
            A system for creating, editing, deleting, and organizing items.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Try It Out</h2>
              <p className="text-gray-600">
                Create items, then organize them into collections.
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCreate}
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
              >
                Create New Item
              </button>
              {/* --- NEW BUTTON --- */}
              <button
                onClick={() => setIsAddToCollectionOpen(true)}
                disabled={items.length === 0}
                className="px-8 py-3 bg-white border border-gray-300 text-gray-800 font-medium rounded-lg hover:bg-gray-50 transform hover:scale-105 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Created Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative group"
                >
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(item)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-blue-100 hover:text-blue-600"
                      aria-label="Edit item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                        <path
                          fillRule="evenodd"
                          d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setItemToDelete({ id: item.id, name: item.name })
                      }
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-red-100 hover:text-red-600"
                      aria-label="Delete item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                  <h4 className="font-semibold text-lg mb-2 pr-16">
                    {item.name}
                  </h4>
                  <p className="text-gray-600 text-sm mb-3">
                    {item.description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        <MultiStepModal wizard={wizard} title={modalTitle}>
          {(wizard) => (
            <>
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
                      onChange={(e) =>
                        wizard.updateField("name", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        wizard.errors.name
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      autoFocus
                    />
                    {wizard.errors.name && (
                      <p className="text-red-500 text-sm mt-1">
                        {wizard.errors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="Add a description (optional)"
                      value={wizard.formData.description}
                      onChange={(e) =>
                        wizard.updateField("description", e.target.value)
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <div className="space-y-2">
                      {["general", "work", "personal", "urgent"].map((cat) => (
                        <label key={cat} className="flex items-center">
                          <input
                            type="radio"
                            value={cat}
                            checked={wizard.formData.category === cat}
                            onChange={(e) =>
                              wizard.updateField("category", e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="capitalize">{cat}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {wizard.currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <TagInput
                      tags={wizard.formData.tags || []}
                      onTagsChange={(tags) => wizard.updateField("tags", tags)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <div className="flex gap-3">
                      {["low", "medium", "high"].map((priority) => (
                        <label key={priority} className="flex items-center">
                          <input
                            type="radio"
                            value={priority}
                            checked={wizard.formData.priority === priority}
                            onChange={(e) =>
                              wizard.updateField("priority", e.target.value)
                            }
                            className="mr-2"
                          />
                          <span className="capitalize">{priority}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {wizard.currentStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="font-semibold text-lg mb-4">
                      Review Your Item
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">
                          {wizard.formData.name || "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Category:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm capitalize">
                          {wizard.formData.category}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="text-gray-600">Priority:</span>
                        <span
                          className={`px-2 py-1 rounded text-sm capitalize ${
                            wizard.formData.priority === "high"
                              ? "bg-red-100 text-red-700"
                              : wizard.formData.priority === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {wizard.formData.priority}
                        </span>
                      </div>
                      {wizard.formData.tags?.length > 0 && (
                        <div className="py-2 border-b border-gray-200">
                          <span className="text-gray-600">Tags:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {wizard.formData.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </MultiStepModal>
        <CollectionDeleteModal
          isOpen={!!itemToDelete}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDelete}
          itemName={itemToDelete?.name}
          isLoading={isDeleting}
        />
        {/* --- NEW MODAL RENDER --- */}
        <AddToCollectionModal
          isOpen={isAddToCollectionOpen}
          onClose={() => setIsAddToCollectionOpen(false)}
          onConfirm={handleConfirmAddToCollection}
          items={items}
          collections={collections}
          isLoading={isAddingToCollection}
        />
        {toast && (
          <div className="fixed bottom-4 right-4 bg-white shadow-xl rounded-lg p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
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
