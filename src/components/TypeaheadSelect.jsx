import * as React from 'react';
import ReactDOM from 'react-dom';
import {
  Input,
  Listbox,
  ListboxItem,
  Chip,
  Checkbox
} from '@nextui-org/react';

export function TypeaheadSelect({
  label,
  options = [],
  selectedKeys = new Set(),
  onSelectionChange,
  onClose,
  placeholder = 'Type to search...',
  getKey = (item) => String(item),
  getDisplayValue = (item) => String(item),
  enableSelectAll = false,
  selectAllLabel = 'Select all',
  enterSelectsFirst = false,
  maxHeight = 320,
  showClearAll = true,
  maxVisibleChips = 5
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dropdownPosition, setDropdownPosition] = React.useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: maxHeight,
    shouldFlip: false
  });

  const rootRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const dropdownRef = React.useRef(null);
 
  // Generate stable IDs for ARIA
  const inputId = React.useId();
  const listboxId = React.useId();

  // Create option map for O(1) lookups
  const optionMap = React.useMemo(() => {
    const map = new Map();
    options.forEach(option => {
      const key = getKey(option);
      map.set(key, option);
    });
    return map;
  }, [options, getKey]);

  // Get all option keys
  const allOptionKeys = React.useMemo(
    () => new Set(options.map(o => getKey(o))),
    [options, getKey]
  );

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;
   
    return options.filter(option => {
      try {
        const displayValue = getDisplayValue(option);
        const searchString = (typeof displayValue === 'string'
          ? displayValue
          : String(displayValue)
        ).toLowerCase();
        return searchString.includes(query);
      } catch (error) {
        console.warn('Error filtering option:', option, error);
        return false;
      }
    });
  }, [options, searchTerm, getDisplayValue]);

  // Check if all filtered items are selected
  const allFilteredSelected = React.useMemo(() => {
    if (filteredOptions.length === 0) return false;
    return filteredOptions.every(opt => selectedKeys.has(getKey(opt)));
  }, [filteredOptions, selectedKeys, getKey]);

  // Calculate dropdown position with flip detection
  const updateDropdownPosition = React.useCallback(() => {
    if (!inputRef.current) return;
   
    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Estimate height: 40px per item + padding/borders
    const estimatedHeight = Math.min(
      maxHeight,
      filteredOptions.length * 40 + (enableSelectAll ? 80 : 40)
    );
   
    const shouldFlip = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
   
    setDropdownPosition({
      top: shouldFlip
        ? rect.top + window.scrollY - estimatedHeight - 4
        : rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
      maxHeight: shouldFlip
        ? Math.min(maxHeight, spaceAbove - 20)
        : Math.min(maxHeight, spaceBelow - 20),
      shouldFlip
    });
  }, [filteredOptions.length, maxHeight, enableSelectAll]);

  // Open dropdown
  const open = React.useCallback(() => {
    updateDropdownPosition();
    setIsOpen(true);
  }, [updateDropdownPosition]);

  // Close dropdown
  const close = React.useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Handle focus/blur - let outside click handler deal with null relatedTarget
  const handleBlurCapture = React.useCallback((e) => {
    const relatedTarget = e.relatedTarget;
   
    // If relatedTarget is null (mouse click), let outside-click handler decide
    if (!relatedTarget) return;
   
    // Keep open if focus moves within component
    if (
      rootRef.current?.contains(relatedTarget) ||
      dropdownRef.current?.contains(relatedTarget)
    ) {
      return;
    }
   
    // Close if focus leaves component via keyboard
    close();
  }, [close]);

  // Handle keyboard navigation
  const handleInputKeyDown = React.useCallback((e) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        close();
        break;
      case 'ArrowDown':
        e.preventDefault();
        // Move focus to first option in listbox
        dropdownRef.current?.querySelector('[role="option"]')?.focus();
        break;
      case 'Enter':
        if (enterSelectsFirst && filteredOptions.length > 0) {
          e.preventDefault();
          const firstKey = getKey(filteredOptions[0]);
          const newSelection = new Set(selectedKeys);
          if (newSelection.has(firstKey)) {
            newSelection.delete(firstKey);
          } else {
            newSelection.add(firstKey);
          }
          onSelectionChange(newSelection);
        }
        break;
    }
  }, [close, enterSelectsFirst, filteredOptions, getKey, selectedKeys, onSelectionChange]);

  // Handle select/deselect all
  const handleSelectAll = React.useCallback((checked) => {
    const newSelection = new Set(selectedKeys);
    if (checked) {
      // Select all filtered items
      filteredOptions.forEach(opt => {
        newSelection.add(getKey(opt));
      });
    } else {
      // Deselect all filtered items
      filteredOptions.forEach(opt => {
        newSelection.delete(getKey(opt));
      });
    }
    onSelectionChange(newSelection);
  }, [filteredOptions, selectedKeys, getKey, onSelectionChange]);

  // Handle listbox selection changes - let Listbox manage selection state
  const handleListboxSelectionChange = React.useCallback((keys) => {
    // NextUI returns "all" when all items are selected
    if (keys === 'all') {
      // Select all current filtered options
      const newSelection = new Set(selectedKeys);
      filteredOptions.forEach(opt => {
        newSelection.add(getKey(opt));
      });
      onSelectionChange(newSelection);
    } else {
      // Validate keys are real options
      const normalized = new Set();
      keys.forEach(k => {
        if (optionMap.has(k)) normalized.add(k);
      });
      onSelectionChange(normalized);
    }
  }, [filteredOptions, selectedKeys, getKey, optionMap, onSelectionChange]);

  // Remove single item
  const removeKey = React.useCallback((key) => {
    const newSelection = new Set(selectedKeys);
    newSelection.delete(key);
    onSelectionChange(newSelection);
  }, [selectedKeys, onSelectionChange]);

  // Clear all selections
  const handleClearAll = React.useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;
   
    const handlePointerDown = (e) => {
      const target = e.target;
      if (
        rootRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };
   
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isOpen, close]);

  // Update position on scroll/resize and layout changes
  React.useEffect(() => {
    if (!isOpen) return;
   
    const handleUpdate = () => updateDropdownPosition();
   
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
   
    // Use ResizeObserver for dynamic layout changes
    const resizeObserver = new ResizeObserver(handleUpdate);
    if (rootRef.current) resizeObserver.observe(rootRef.current);
    if (inputRef.current) resizeObserver.observe(inputRef.current);
   
    // Initial position
    updateDropdownPosition();
   
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      resizeObserver.disconnect();
    };
  }, [isOpen, updateDropdownPosition]);

  // Recalculate position when filtered options change
  React.useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
    }
  }, [filteredOptions.length, isOpen, updateDropdownPosition]);

  const selectedCount = selectedKeys.size;
  const displaySuffix = selectedCount > 0 ? `${selectedCount} selected` : '';

  // Get visible selected items for chips
  const visibleSelectedItems = React.useMemo(() => {
    const items = [];
    let count = 0;
    for (const key of selectedKeys) {
      if (count >= maxVisibleChips) break;
      const item = optionMap.get(key);
      if (item) {
        items.push({ key, item });
        count++;
      }
    }
    return items;
  }, [selectedKeys, optionMap, maxVisibleChips]);

  const hiddenCount = selectedCount - visibleSelectedItems.length;

  return (
    <>
      <div
        ref={rootRef}
        className="relative w-full"
        onBlurCapture={handleBlurCapture}
      >
        {/* Selected chips */}
        {selectedCount > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <div className="flex flex-wrap gap-1 flex-1">
              {visibleSelectedItems.map(({ key, item }) => (
                <Chip
                  key={String(key)}
                  size="sm"
                  onClose={() => removeKey(key)}
                  variant="flat"
                  classNames={{
                    base: "max-w-[200px]",
                    content: "truncate"
                  }}
                >
                  {getDisplayValue(item)}
                </Chip>
              ))}
              {hiddenCount > 0 && (
                <span className="text-small text-default-500 px-1">
                  +{hiddenCount} more
                </span>
              )}
            </div>
            {showClearAll && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-small text-danger hover:text-danger-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        <Input
          ref={inputRef}
          id={inputId}
          label={label}
          placeholder={placeholder}
          value={searchTerm}
          onValueChange={setSearchTerm}
          onFocus={open}
          onKeyDown={handleInputKeyDown}
          endContent={
            displaySuffix ? (
              <span className="text-small text-default-400">{displaySuffix}</span>
            ) : null
          }
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-autocomplete="list"
        />
      </div>

      {/* Portal dropdown to body */}
      {typeof document !== 'undefined' &&
        ReactDOM.createPortal(
          isOpen ? (
            <div
              ref={dropdownRef}
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 10000,
                maxHeight: dropdownPosition.maxHeight,
                overflowY: 'auto'
              }}
              className="bg-content1 border border-divider rounded-medium shadow-large"
            >
              {/* Select All Option */}
              {enableSelectAll && filteredOptions.length > 0 && (
                <div className="border-b border-divider p-2 sticky top-0 bg-content1 z-10">
                  <label className="flex items-center gap-2 cursor-pointer hover:bg-default-100 p-1 rounded transition-colors">
                    <Checkbox
                      isSelected={allFilteredSelected}
                      onValueChange={handleSelectAll}
                      size="sm"
                      aria-label={`${selectAllLabel} (${filteredOptions.length} items)`}
                    />
                    <span className="text-sm font-medium select-none">
                      {selectAllLabel} ({filteredOptions.length})
                    </span>
                  </label>
                </div>
              )}

              <Listbox
                id={listboxId}
                selectionMode="multiple"
                selectedKeys={selectedKeys}
                onSelectionChange={handleListboxSelectionChange}
                disallowEmptySelection={false}
                aria-label={label || 'Typeahead options'}
                classNames={{
                  base: "p-0",
                  list: "p-0"
                }}
              >
                {filteredOptions.length === 0 && searchTerm ? (
                  <ListboxItem
                    key="__NO_RESULTS__"
                    isDisabled
                    textValue="No results"
                  >
                    <span className="text-default-400">
                      No options found for "{searchTerm}"
                    </span>
                  </ListboxItem>
                ) : (
                  filteredOptions.map(option => {
                    const key = getKey(option);
                    const displayValue = getDisplayValue(option);
                    return (
                      <ListboxItem
                        key={key}
                        textValue={
                          typeof displayValue === 'string'
                            ? displayValue
                            : String(displayValue)
                        }
                      >
                        {displayValue}
                      </ListboxItem>
                    );
                  })
                )}
              </Listbox>
            </div>
          ) : null,
          document.body
        )}
    </>
  );
}
