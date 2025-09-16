'use client';

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

// Assumes these hooks are in a central file, e.g., src/hooks/dataHooks.js
import { useProcessedData, useFilteredData, useSortedData } from '../hooks/dataHooks'; 

// Assumes this is your detailed drill-down component
import GroupAnalysisView from './GroupAnalysisView'; 

// Assumes these libraries are installed in your project
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
  Pagination,
  Progress,
  Select,
  SelectItem,
  useDisclosure,
} from '@nextui-org/react';
import { LuArrowUpDown, LuSearch } from 'react-icons/lu';

// --- PropType Definitions ---

const processedGroupShape = PropTypes.shape({
  key: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
  passRate: PropTypes.number.isRequired,
  mostRecentDate: PropTypes.string.isRequired,
  mostRecentDateRaw: PropTypes.instanceOf(Date),
  passCount: PropTypes.number.isRequired,
  failCount: PropTypes.number.isRequired,
  tests: PropTypes.array.isRequired,
  data: PropTypes.array.isRequired,
});

// --- Main Components ---

const GroupListView = ({ processedData }) => {
  const [selection, setSelection] = useState(new Set());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState({ key: 'count', direction: 'desc' });
  const [thenByKey, setThenByKey] = useState('key'); // State for secondary sort key
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Create the array of sort descriptors for multi-level sorting
  const sortDescriptors = useMemo(() => {
    const descriptors = [{ ...sortBy }];
    // Add the secondary sort key if it's different from the primary
    if (thenByKey && thenByKey !== sortBy.key) {
      descriptors.push({ key: thenByKey, direction: 'asc' }); // Default secondary to ascending
    }
    return descriptors;
  }, [sortBy, thenByKey]);

  // Chain the custom hooks to process the data for display
  const filteredData = useFilteredData(processedData, searchQuery);
  const sortedData = useSortedData(filteredData, sortDescriptors);

  // Calculate pagination based on the final sorted and filtered data
  const pages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedData.slice(start, end);
  }, [page, rowsPerPage, sortedData]);

  const selectedItems = useMemo(() => processedData.filter((group) => selection.has(group.key)), [selection, processedData]);

  const handleAnalyze = (group) => {
    setSelectedGroup(group);
    onOpen();
  };

  const handleAnalyzeSelection = () => {
    if (selectedItems.length === 0) return;
    const compositeGroup = {
      key: `${selectedItems.length} Selected Groups`,
      count: selectedItems.reduce((acc, item) => acc + item.count, 0),
      passCount: selectedItems.reduce((acc, item) => acc + item.passCount, 0),
      failCount: selectedItems.reduce((acc, item) => acc + item.failCount, 0),
      // Use a getter for passRate to calculate it dynamically
      get passRate() { return this.count > 0 ? (this.passCount / this.count) * 100 : 0; },
      tests: selectedItems.flatMap((item) => item.tests),
      data: selectedItems.flatMap((item) => item.data),
    };
    setSelectedGroup(compositeGroup);
    onOpen();
  };

  const handleSelectionChange = (key) => {
    setSelection((prev) => {
      const newSelection = new Set(prev);
      newSelection.has(key) ? newSelection.delete(key) : newSelection.add(key);
      return newSelection;
    });
  };

  const toggleSortDirection = () => {
    setSortBy((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 p-4 bg-content1 border-b border-divider rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            isClearable aria-label="Search" placeholder="Search groups..." startContent={<LuSearch />}
            value={searchQuery} onValueChange={setSearchQuery} className="w-full sm:w-64"
          />
          <div className="flex items-center gap-2">
            <Select
              aria-label="Sort by" placeholder="Sort by" selectedKeys={[sortBy.key]}
              onSelectionChange={(keys) => setSortBy((prev) => ({ ...prev, key: Array.from(keys)[0] }))}
              className="w-40"
            >
              <SelectItem key="key">Name</SelectItem>
              <SelectItem key="count">Test Count</SelectItem>
              <SelectItem key="passRate">Pass Rate</SelectItem>
              <SelectItem key="mostRecentDateRaw">Most Recent</SelectItem>
            </Select>
            <Select
              aria-label="Then by" placeholder="Then by" selectedKeys={[thenByKey]}
              onSelectionChange={(keys) => setThenByKey(Array.from(keys)[0])}
              className="w-40"
            >
              <SelectItem key="key">Name</SelectItem>
              <SelectItem key="count">Test Count</SelectItem>
              <SelectItem key="passRate">Pass Rate</SelectItem>
              <SelectItem key="mostRecentDateRaw">Most Recent</SelectItem>
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
              <Button color="primary" variant="flat" onPress={handleAnalyzeSelection}>Analyze Selection</Button>
              <Button variant="light" aria-label="Clear selection" onPress={() => setSelection(new Set())}>Clear</Button>
            </div>
          )}
        </div>
      </div>

      {paginatedItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedItems.map((group) => (
            <Card shadow="sm" key={group.key} isPressable onPress={() => handleAnalyze(group)}>
              <CardHeader className="flex justify-between items-start">
                <div className="flex flex-col items-start"><p className="text-md font-bold truncate">{group.key}</p><p className="text-sm text-default-500">{`${group.count} tests`}</p></div>
                <Checkbox aria-label={`Select ${group.key}`} isSelected={selection.has(group.key)} onValueChange={() => handleSelectionChange(group.key)} onClick={(e) => e.stopPropagation()} />
              </CardHeader>
              <CardBody>
                <Progress aria-label="Pass rate" value={group.passRate} color={group.passRate >= 90 ? 'success' : group.passRate >= 70 ? 'warning' : 'danger'} label={`${group.passRate.toFixed(1)}% Pass Rate`} showValueLabel className="w-full" />
              </CardBody>
              <CardFooter className="text-sm justify-between"><span>Last Test:</span><span className="text-default-500">{group.mostRecentDate}</span></CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-default-500"><p>No results found.</p><p className="text-sm">Try adjusting your search or filters.</p></div>
      )}

      {pages > 1 && (
        <div className="flex w-full justify-center mt-8 gap-4 items-center">
          <Pagination isCompact showControls showShadow color="primary" page={page} total={pages} onChange={setPage} />
          <Select
            aria-label="Items per page"
            className="w-28"
            selectedKeys={[rowsPerPage.toString()]}
            onSelectionChange={(keys) => {
              setRowsPerPage(Number(Array.from(keys)[0]));
              setPage(1);
            }}
          >
            <SelectItem key="8">8 / page</SelectItem>
            <SelectItem key="12">12 / page</SelectItem>
            <SelectItem key="20">20 / page</SelectItem>
          </Select>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center">
                Group Analysis
                <Button variant="light" onPress={onClose}>Close</Button>
              </ModalHeader>
              <ModalBody>{selectedGroup && <GroupAnalysisView group={selectedGroup} />}</ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

GroupListView.propTypes = {
  processedData: PropTypes.arrayOf(processedGroupShape).isRequired,
};

const DataDashboardContainer = ({ rawGroupedData }) => {
  const processedData = useProcessedData(rawGroupedData);
  return <GroupListView processedData={processedData} />;
};

DataDashboardContainer.propTypes = {
  rawGroupedData: PropTypes.objectOf(PropTypes.array).isRequired,
};

export default DataDashboardContainer;

