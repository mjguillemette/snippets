import React, { useState, useMemo } from 'react';
import { Card, CardBody, Button, Switch, Input, Select, SelectItem, Divider } from '@nextui-org/react';
import { LuFilter, LuFlaskConical, LuRotateCcw, LuPlus, LuTrash2 } from "react-icons/lu";
import { AnimatePresence, motion } from "framer-motion";

// Helper to generate fields for our selects from AG Grid column definitions
const generateFields = (columnDefs) => {
  return columnDefs
    .filter(col => col.field && col.headerName)
    .map(col => ({
      value: col.field,
      label: col.headerName,
      // You could expand this to include data types for smarter operator choices
    }));
};

// Available operators for the query builder
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


// == The Custom Query Builder UI Component ==
const QueryBuilderGroup = ({ group, onGroupChange, fields }) => {

  const handleRuleChange = (index, newRule) => {
    const newRules = [...group.rules];
    newRules[index] = { ...newRules[index], ...newRule };
    onGroupChange({ ...group, rules: newRules });
  };

  const addRule = () => {
    const newRule = { field: fields[0]?.value || '', operator: '=', value: '' };
    onGroup_change({ ...group, rules: [...group.rules, newRule] });
  };

  const removeRule = (index) => {
    const newRules = group.rules.filter((_, i) => i !== index);
    onGroupChange({ ...group, rules: newRules });
  };

  const handleCombinatorChange = (newCombinator) => {
    onGroupChange({ ...group, combinator: newCombinator });
  }

  return (
    <div className="bg-default-100/50 p-4 rounded-lg border-2 border-dashed border-default-200">
      <div className="flex items-center gap-2 mb-3">
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
        <p className="text-sm text-foreground-500">combinator for the following rules:</p>
      </div>

      <div className="space-y-3">
        {group.rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2 flex-wrap">
            <Select
              aria-label="Field"
              size="sm"
              selectedKeys={[rule.field]}
              onChange={(e) => handleRuleChange(index, { field: e.target.value })}
              className="flex-grow min-w-[150px]"
            >
              {fields.map(field => (
                <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
              ))}
            </Select>
            <Select
              aria-label="Operator"
              size="sm"
              selectedKeys={[rule.operator]}
              onChange={(e) => handleRuleChange(index, { operator: e.target.value })}
              className="flex-grow min-w-[150px]"
            >
              {operators.map(op => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </Select>
            <Input
              aria-label="Value"
              size="sm"
              value={rule.value}
              onValueChange={(value) => handleRuleChange(index, { value })}
              className="flex-grow min-w-[150px]"
            />
            <Button isIconOnly size="sm" variant="light" color="danger" onClick={() => removeRule(index)}>
              <LuTrash2 />
            </Button>
          </div>
        ))}
      </div>

      <Button size="sm" variant="light" color="primary" onClick={addRule} className="mt-3">
        <LuPlus className="mr-1" /> Add Rule
      </Button>
    </div>
  );
};


// == Main Exported Component ==
export const AdvancedFilter = ({ gridApi, columnDefs }) => {
  const [isAdvanced, setIsAdvanced] = useState(false);

  // State for Simple Filters
  const [simpleStatus, setSimpleStatus] = useState('');
  const [simpleAssignee, setSimpleAssignee] = useState('');

  // State for Advanced Filter (our custom query builder)
  const [query, setQuery] = useState({ combinator: 'and', rules: [] });

  const fields = useMemo(() => generateFields(columnDefs), [columnDefs]);

  const buildAgGridFilterModel = (q) => {
    // This function translates our custom query state into an AG Grid filter model.
    // NOTE: This is a simplified version that handles one level of grouping.
    // A recursive function would be needed for deeply nested groups.
    if (q.rules.length === 0) return null;

    const operatorMap = {
      '=': { type: 'equals' }, '!=': { type: 'notEqual' },
      'contains': { type: 'contains' }, 'notContains': { type: 'notContains' },
      'startsWith': { type: 'startsWith' }, 'endsWith': { type: 'endsWith' },
      '>': { type: 'greaterThan' }, '<': { type: 'lessThan' },
    };

    const conditions = q.rules.map(rule => ({
      field: rule.field,
      filter: {
        ...operatorMap[rule.operator],
        filter: rule.value,
      }
    }));
    
    const filterModel = {};
    conditions.forEach(cond => {
        // If a field is already filtered, we need to apply a condition (AND/OR)
        if (filterModel[cond.field]) {
            filterModel[cond.field] = {
                operator: q.combinator.toUpperCase(),
                condition1: filterModel[cond.field],
                condition2: cond.filter
            }
        } else {
            filterModel[cond.field] = cond.filter;
        }
    });

    return filterModel;
  };

  const handleApplyFilter = () => {
    if (!gridApi) return;

    let modelToApply = null;
    if (isAdvanced) {
      modelToApply = buildAgGridFilterModel(query);
      console.log('Applying Advanced Filter Model:', modelToApply);
    } else {
      const simpleModel = {};
      if (simpleStatus) simpleModel.status = { type: 'equals', filter: simpleStatus };
      if (simpleAssignee) simpleModel.assignee = { type: 'contains', filter: simpleAssignee };
      modelToApply = Object.keys(simpleModel).length > 0 ? simpleModel : null;
      console.log('Applying Simple Filter Model:', modelToApply);
    }
    gridApi.setFilterModel(modelToApply);
    gridApi.onFilterChanged();
  };

  const handleClearFilter = () => {
    if (!gridApi) return;
    setSimpleStatus('');
    setSimpleAssignee('');
    setQuery({ combinator: 'and', rules: [] });
    gridApi.setFilterModel(null);
    gridApi.onFilterChanged();
  };

  return (
    <Card className="mb-4">
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">{isAdvanced ? 'Advanced Filter' : 'Simple Filter'}</h3>
          <Switch
            isSelected={isAdvanced}
            onValueChange={setIsAdvanced}
            thumbIcon={({ isSelected, className }) => isSelected && <LuFlaskConical className={className} />}
          >
            Advanced
          </Switch>
        </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  selectedKeys={simpleStatus ? [simpleStatus] : []}
                  onChange={(e) => setSimpleStatus(e.target.value)}
                >
                  <SelectItem key="Open" value="Open">Open</SelectItem>
                  <SelectItem key="In Progress" value="In Progress">In Progress</SelectItem>
                  <SelectItem key="Done" value="Done">Done</SelectItem>
                </Select>
                <Input
                  label="Assignee"
                  value={simpleAssignee}
                  onValueChange={setSimpleAssignee}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <Divider className="my-4" />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClearFilter} startContent={<LuRotateCcw />}>
            Clear All
          </Button>
          <Button color="primary" onClick={handleApplyFilter} startContent={<LuFilter />}>
            Apply
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};