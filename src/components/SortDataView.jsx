'use client';

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

// Assumes these hooks are imported from your project's hook files.
import { useGroupedData, useProcessedData, useFilteredData, useSortedData } from '../hooks/dataHooks'; 
import GroupAnalysisView from './GroupAnalysisView';

// Assumes these libraries are installed in your project.
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  Progress,
  Select,
  SelectItem,
  Pagination,
  useDisclosure,
} from '@nextui-org/react';
import { LuArrowUpDown, LuSearch, LuTrash, LuX } from 'react-icons/lu';


// --- PropType Definitions ---
const processedGroupShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  passRate: PropTypes.number.isRequired,
  mostRecentDate: PropTypes.string.isRequired,
  mostRecentDateRaw: PropTypes.instanceOf(Date),
  // Add any other properties your GroupAnalysisView might need
});


// --- Presentational Component ---
// This component is responsible for rendering the UI and receives all data and handlers as props.
const GroupListView = ({
    paginatedItems,
    selection,
    searchQuery,
    sortBy,
    thenByKey,
    page,
    pages,
    handleSelectionChange,
    handleAnalyze,
    handleAnalyzeSelection,
    setSearchQuery,
    setSortBy,
    setThenByKey,
    toggleSortDirection,
    setPage,
    clearSelection,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Wraps the analysis handlers to include opening the modal
  const openAnalysisModal = (group) => {
    setSelectedGroup(group);
    onOpen();
  };
  
  const analyzeSingle = (group) => handleAnalyze(group, openAnalysisModal);
  const analyzeSelection = () => handleAnalyzeSelection(openAnalysisModal);

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 p-4 bg-content1 border-b border-divider rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            isClearable
            aria-label="Search"
            placeholder="Search groups..."
            startContent={<LuSearch />}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="w-full sm:w-64"
          />
          <div className="flex items-center gap-2">
             <Select
              aria-label="Sort by"
              selectedKeys={[sortBy.key]}
              onSelectionChange={(keys) => setSortBy((prev) => ({ ...prev, key: Array.from(keys)[0] }))}
              className="w-40"
            >
              <SelectItem key="key">Name</SelectItem>
              <SelectItem key="count">Test Count</SelectItem>
              <SelectItem key="passRate">Pass Rate</SelectItem>
              <SelectItem key="mostRecentDateRaw">Most Recent</SelectItem>
            </Select>
            <Select
              aria-label="Then by"
              selectedKeys={[thenByKey]}
              onSelectionChange={(keys) => setThenByKey(Array.from(keys)[0])}
              className="w-40"
            >
              <SelectItem key="key">Name</SelectItem>
              <SelectItem key="count">Test Count</SelectItem>
              <SelectItem key="passRate">Pass Rate</SelectItem>
            </Select>
            <Button isIconOnly variant="ghost" aria-label="Toggle sort direction" onClick={toggleSortDirection}>
              <LuArrowUpDown />
            </Button>
          </div>
        </div>
        <div>
          {selection.size > 0 && (
            <div className="flex items-center gap-2">
              <Chip>{`${selection.size} selected`}</Chip>
              <Button color="primary" variant="flat" onPress={analyzeSelection}>Analyze Selection</Button>
              <Button isIconOnly variant="light" aria-label="Clear selection" onPress={clearSelection}>
                <LuTrash />
              </Button>
            </div>
          )}
        </div>
      </div>

      {paginatedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedItems.map((group) => (
            <Card shadow="sm" key={group.key} isPressable onPress={() => analyzeSingle(group)}>
              <CardHeader className="flex justify-between items-start">
                  <div className="flex flex-col items-start">
                      <p className="text-md font-bold truncate">{group.key}</p>
                      <p className="text-sm text-default-500">{`${group.count} tests`}</p>
                  </div>
                  <Checkbox
                      aria-label={`Select ${group.key}`}
                      isSelected={selection.has(group.key)}
                      onValueChange={() => handleSelectionChange(group.key)}
                      onClick={(e) => e.stopPropagation()}
                  />
              </CardHeader>
              <CardBody>
                  <Progress
                      aria-label="Pass rate"
                      value={group.passRate}
                      color={group.passRate >= 90 ? 'success' : group.passRate >= 70 ? 'warning' : 'danger'}
                      label={`${group.passRate.toFixed(1)}% Pass Rate`}
                      showValueLabel
                      className="w-full"
                  />
              </CardBody>
              <CardFooter className="text-sm justify-between">
                  <span>Last Test:</span>
                  <span className="text-default-500">{group.mostRecentDate}</span>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-default-500"><p>No results found.</p></div>
      )}

      {pages > 1 && (
        <div className="flex w-full justify-center mt-8">
            <Pagination isCompact showControls page={page} total={pages} onChange={setPage} />
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center">
                Group Analysis
                <Button isIconOnly variant="light" onPress={onClose}><LuX /></Button>
              </ModalHeader>
              <ModalBody>{selectedGroup && <GroupAnalysisView group={selectedGroup} />}</ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

// Assign propTypes to the presentational component
GroupListView.propTypes = { /* ... */ };


// --- Container Component ---
// This component manages all state and data processing logic.
const DataDashboardContainer = ({ rawData }) => {
  // State for user interactions
  const [groupByKey, setGroupByKey] = useState('testResult'); // Default grouping
  const [selection, setSelection] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState({ key: 'count', direction: 'desc' });
  const [thenByKey, setThenByKey] = useState('key');
  const [page, setPage] = useState(1);
  const rowsPerPage = 12;

  // --- HOOK CHAIN ---
  // 1. Group the raw flat data.
  const groupedData = useGroupedData(rawData, groupByKey);
  // 2. Process each group to calculate metrics.
  const processedData = useProcessedData(groupedData);
  // 3. Filter the processed groups based on search.
  const filteredData = useFilteredData(processedData, searchQuery);
  // 4. Sort the filtered groups.
  const finalData = useSortedData(filteredData, [{...sortBy}, {key: thenByKey, direction: 'asc'}]);

  // --- PAGINATION LOGIC ---
  const pages = Math.ceil(finalData.length / rowsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return finalData.slice(start, start + rowsPerPage);
  }, [page, finalData]);

  // --- EVENT HANDLERS ---
  const handleSelectionChange = (key) => {
    setSelection(prev => {
        const newSelection = new Set(prev);
        newSelection.has(key) ? newSelection.delete(key) : newSelection.add(key);
        return newSelection;
    });
  };

  const handleAnalyze = (group, openModal) => {
    openModal(group);
  };
  
  const handleAnalyzeSelection = (openModal) => {
    const selectedItems = processedData.filter(g => selection.has(g.key));
    if (selectedItems.length === 0) return;

    // Create a composite group for analysis
    const compositeGroup = {
      key: `${selectedItems.length} Selected Groups`,
      count: selectedItems.reduce((acc, item) => acc + item.count, 0),
      passCount: selectedItems.reduce((acc, item) => acc + item.passCount, 0),
      get passRate() { return this.count > 0 ? (this.passCount / this.count) * 100 : 0 },
      tests: selectedItems.flatMap(item => item.tests),
      data: selectedItems.flatMap(item => item.data),
    };
    openModal(compositeGroup);
  };

  const toggleSortDirection = () => {
    setSortBy(prev => ({...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <GroupListView
      paginatedItems={paginatedItems}
      selection={selection}
      searchQuery={searchQuery}
      sortBy={sortBy}
      thenByKey={thenByKey}
      page={page}
      pages={pages}
      handleSelectionChange={handleSelectionChange}
      handleAnalyze={handleAnalyze}
      handleAnalyzeSelection={handleAnalyzeSelection}
      setSearchQuery={setSearchQuery}
      setSortBy={setSortBy}
      setThenByKey={setThenByKey}
      toggleSortDirection={toggleSortDirection}
      setPage={setPage}
      clearSelection={() => setSelection(new Set())}
    />
  );
};

DataDashboardContainer.propTypes = {
  rawData: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default DataDashboardContainer;