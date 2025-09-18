import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Switch, 
  Input, 
  Select, 
  SelectItem, 
  Divider, 
  Tooltip 
} from '@nextui-org/react';
import { LuFilter, LuFlaskConical, LuRotateCcw, LuPlus, LuTrash2 } from "react-icons/lu";
import { AnimatePresence, motion } from "framer-motion";

// --- HELPERS & CONSTANTS ---

/**
 * Generates an array of field objects for Select components from AG Grid column definitions.
 * @param {Array<object>} columnDefs - The column definitions from AG Grid.
 * @returns {Array<{value: string, label: string}>}
 */
const generateFields = (columnDefs) => {
  return columnDefs
    .filter(col => col.field && col.headerName) // Ensure field and headerName exist
    .map(col => ({
      value: col.field,
      label: col.headerName,
    }));
};

const operators = [
  { value: '=', label: 'Equals' },
  { value: '!=', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'notContains', label: 'Does Not Contain' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: '>', label: 'Greater Than' },
  { value: '<', label: 'Less Than' },
];

// --- SUB-COMPONENTS ---

/**
 * @description A UI component for building a single group of filter rules.
 * @param {{group: object, onGroupChange: Function, fields: Array<object>}} props
 */
const QueryBuilderGroup = ({ group, onGroupChange, fields }) => {

  const handleRuleChange = (index, newRule) => {
    const newRules = [...group.rules];
    newRules[index] = { ...newRules[index], ...newRule };
    onGroupChange({ ...group, rules: newRules });
  };

  const addRule = () => {
    const newRule = { field: fields[0]?.value || '', operator: 'contains', value: '' };
    onGroupChange({ ...group, rules: [...group.rules, newRule] });
  };

  const removeRule = (index) => {
    const newRules = group.rules.filter((_, i) => i !== index);
    onGroupChange({ ...group, rules: newRules });
  };

  const handleCombinatorChange = (newCombinator) => {
    onGroupChange({ ...group, combinator: newCombinator });
  };

  return (
    <div className="bg-default-100/50 p-4 rounded-lg border-2 border-dashed border-default-200">
      <div className="flex items-center gap-2 mb-4">
        <Select
          size="sm"
          aria-label="Combinator"
          selectedKeys={[group.combinator]}
          onChange={(e) => handleCombinatorChange(e.target.value)}
          className="w-32"
        >
          <SelectItem key="and" value="and">AND</SelectItem>
          <SelectItem key="or" value="or">OR</SelectItem>
        </Select>
        <p className="text-sm text-foreground-500">all rules in this group</p>
      </div>

      <div className="space-y-3">
        {group.rules.length === 0 && (
            <div className="text-center text-foreground-500 py-4">
                <p>No rules defined.</p>
                <p className="text-sm">Click "Add Rule" to create a filter condition.</p>
            </div>
        )}
        <AnimatePresence>
            {group.rules.map((rule, index) => (
            <motion.div
                key={index}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                className="flex items-center gap-2 flex-wrap"
            >
                <Select
                    aria-label="Field"
                    placeholder="Select Field"
                    size="sm"
                    selectedKeys={rule.field ? [rule.field] : []}
                    onChange={(e) => handleRuleChange(index, { field: e.target.value })}
                    className="flex-grow min-w-[150px]"
                >
                {fields.map(field => (
                    <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                ))}
                </Select>
                <Select
                    aria-label="Operator"
                    placeholder="Select Operator"
                    size="sm"
                    selectedKeys={[rule.operator]}
                    onChange={(e) => handleRuleChange(index, { operator: e.target.value })}
                    className="w-[150px]"
                >
                {operators.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
                </Select>
                <Input
                    aria-label="Value"
                    size="sm"
                    placeholder="Enter value..."
                    value={rule.value}
                    onValueChange={(value) => handleRuleChange(index, { value })}
                    className="flex-grow min-w-[150px]"
                />
                <Tooltip content="Remove Rule" color="danger">
                    <Button isIconOnly size="sm" variant="light" color="danger" onClick={() => removeRule(index)}>
                        <LuTrash2 />
                    </Button>
                </Tooltip>
            </motion.div>
            ))}
        </AnimatePresence>
      </div>

      <Button size="sm" variant="flat" color="primary" onClick={addRule} className="mt-4">
        <LuPlus className="mr-1" /> Add Rule
      </Button>
    </div>
  );
};

// --- MAIN COMPONENT ---

/**
 * @description A highly flexible filter component for AG Grid with Simple and Advanced modes.
 * @param {{gridApi: object, columnDefs: Array<object>}} props
 */
export const AdvancedFilter = ({ gridApi, columnDefs }) => {
  const [isAdvanced, setIsAdvanced] = useState(false);

  // A single state object for all simple filters, making it dynamic.
  const [simpleFilters, setSimpleFilters] = useState({});

  // State for the advanced query builder
  const [query, setQuery] = useState({ combinator: 'and', rules: [] });

  // Memoize fields derived from column definitions
  const fields = useMemo(() => generateFields(columnDefs || []), [columnDefs]);
  
  // Dynamically select the first few fields for the "Simple Filter" view
  const simpleFilterFields = useMemo(() => fields.slice(0, 4), [fields]);

  /**
   * Translates the custom query state into a valid AG Grid filter model.
   * @param {object} q - The query object from the component's state.
   * @returns {object|null} The filter model for AG Grid's api.setFilterModel().
   * @note AG Grid's standard filter model implicitly uses 'AND' between different fields.
   * The combinator ('AND'/'OR') in our UI will correctly apply to multiple rules
   * on the *same field* (e.g., Price > 10 AND Price < 50).
   */
  const buildAgGridFilterModel = (q) => {
    if (!q.rules || q.rules.length === 0) return null;

    const operatorMap = {
      '=': { type: 'equals' }, '!=': { type: 'notEqual' },
      'contains': { type: 'contains' }, 'notContains': { type: 'notContains' },
      'startsWith': { type: 'startsWith' }, 'endsWith': { type: 'endsWith' },
      '>': { type: 'greaterThan' }, '<': { type: 'lessThan' },
    };

    const filterModel = {};

    q.rules.forEach(rule => {
      // Ignore rules that are incomplete
      if (!rule.field || !rule.operator || !rule.value) return;
      
      const agGridFilter = {
        filterType: 'text', // Assuming text filter; can be enhanced for date/number
        ...operatorMap[rule.operator],
        filter: rule.value,
      };

      // If a filter already exists for this field, combine them with the group combinator
      if (filterModel[rule.field]) {
        filterModel[rule.field] = {
          operator: q.combinator.toUpperCase(),
          condition1: filterModel[rule.field],
          condition2: agGridFilter,
        };
      } else {
        filterModel[rule.field] = agGridFilter;
      }
    });

    return Object.keys(filterModel).length > 0 ? filterModel : null;
  };

  const handleApplyFilter = () => {
    if (!gridApi) return;

    let modelToApply = null;
    if (isAdvanced) {
      modelToApply = buildAgGridFilterModel(query);
      console.log('Applying Advanced Filter Model:', modelToApply);
    } else {
      const simpleModel = {};
      for (const field in simpleFilters) {
        const value = simpleFilters[field];
        if (value) {
          // Defaulting to 'contains' for simple text search; can be customized
          simpleModel[field] = { type: 'contains', filter: value };
        }
      }
      modelToApply = Object.keys(simpleModel).length > 0 ? simpleModel : null;
      console.log('Applying Simple Filter Model:', modelToApply);
    }
    gridApi.setFilterModel(modelToApply);
    gridApi.onFilterChanged();
  };

  const handleClearFilter = () => {
    if (!gridApi) return;
    setSimpleFilters({});
    setQuery({ combinator: 'and', rules: [] });
    gridApi.setFilterModel(null);
    gridApi.onFilterChanged();
  };

  const handleSimpleFilterChange = (field, value) => {
      setSimpleFilters(prev => ({...prev, [field]: value}));
  };

  return (
    <Card className="mb-4 shadow-md">
      <CardHeader className="flex justify-between items-center p-4">
        <h3 className="text-xl font-semibold text-foreground-800">
          {isAdvanced ? 'Advanced Filter' : 'Filter'}
        </h3>
        <Switch
          isSelected={isAdvanced}
          onValueChange={setIsAdvanced}
          thumbIcon={({ isSelected, className }) => isSelected && <LuFlaskConical className={className} />}
        >
          Advanced
        </Switch>
      </CardHeader>
      <CardBody className="p-4">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={isAdvanced ? 'advanced' : 'simple'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {isAdvanced ? (
              <QueryBuilderGroup group={query} onGroupChange={setQuery} fields={fields} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {simpleFilterFields.map(field => (
                    <Input
                        key={field.value}
                        aria-label={field.label}
                        label={field.label}
                        placeholder={`Filter by ${field.label}...`}
                        value={simpleFilters[field.value] || ''}
                        onValueChange={(value) => handleSimpleFilterChange(field.value, value)}
                        isClearable
                        onClear={() => handleSimpleFilterChange(field.value, '')}
                    />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <Divider className="my-5" />

        <div className="flex justify-end gap-2">
          <Button variant="bordered" onClick={handleClearFilter} startContent={<LuRotateCcw />}>
            Clear All
          </Button>
          <Button color="primary" onClick={handleApplyFilter} startContent={<LuFilter />}>
            Apply Filters
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};