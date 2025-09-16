'use client';

import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

// Import NextUI components and icons - Assumes these are installed in your project
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
  useDisclosure,
} from '@nextui-org/react';
import { LuArrowUpDown, LuSearch, LuTrash, LuX } from 'react-icons/lu';

// --- Data Processing Logic (formerly in dataProcessor.js and useProcessedData.js) ---

const TEST_RESULT_FAIL = 'Fail';
const UNKNOWN_GROUP = 'Unknown Group';
const NOT_APPLICABLE = 'N/A';

// Note: `parseDate` is an assumed utility. If not globally available, define it here.
// const parseDate = (dateString) => new Date(dateString);

const processGroupData = (key, values) => {
    const summary = values.reduce((acc, item) => {
        if (item.testResult !== TEST_RESULT_FAIL) acc.passCount++; else acc.failCount++;
        if (item.dutIdentifier) acc.uniqueIdentifiers.add(item.dutIdentifier[0]);
        // `parseDate` is assumed to exist and return a valid Date object or null
        const stopTime = typeof parseDate !== 'undefined' ? parseDate(item.parentRecordData?.stopTime) : new Date(item.parentRecordData?.stopTime);
        if (stopTime instanceof Date && !isNaN(stopTime)) acc.timestamps.push(stopTime);
        return acc;
    }, { passCount: 0, failCount: 0, uniqueIdentifiers: new Set(), timestamps: [] });

    const totalCount = values.length;
    const passRate = totalCount ? (summary.passCount / totalCount) * 100 : 0;
    const mostRecentDateRaw = summary.timestamps.length > 0 ? new Date(Math.max(...summary.timestamps)) : null;

    return {
        key: key ?? UNKNOWN_GROUP,
        count: totalCount,
        passRate: parseFloat(passRate.toFixed(1)),
        passCount: summary.passCount,
        failCount: summary.failCount,
        uniqueIdentifiers: summary.uniqueIdentifiers.size,
        mostRecentDate: mostRecentDateRaw ? mostRecentDateRaw.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : NOT_APPLICABLE,
        mostRecentDateRaw,
        tests: values,
        data: values.map(v => v.data), // Simplified data mapping
    };
};

const useProcessedData = (groupedData) => {
    return useMemo(() => {
        if (!groupedData || Object.keys(groupedData).length === 0) return [];
        return Object.entries(groupedData).map(([key, values]) => processGroupData(key, values));
    }, [groupedData]);
};


// --- Placeholder for the Detailed Analysis View ---

const GroupAnalysisView = ({ group }) => (
  <div className="p-4">
    <h2 className="text-2xl font-bold mb-4">{group.key}</h2>
    <p>This is the detailed analysis view. Build out charts and tables here.</p>
    <pre className="bg-content2 p-4 rounded-md overflow-auto">
      {JSON.stringify(group, (key, value) => (key === 'tests' || key === 'data') ? `[${value.length} items]` : value, 2)}
    </pre>
  </div>
);

GroupAnalysisView.propTypes = {
  group: PropTypes.object.isRequired,
};


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
  const [sortDescriptor, setSortDescriptor] = useState({ key: 'count', direction: 'desc' });
  const { isOpen, onOpen, onClose } = useDisclosure();

  const filteredAndSortedData = useMemo(() => {
    let items = [...processedData];
    if (searchQuery) {
      items = items.filter((group) => group.key.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    items.sort((a, b) => {
      const first = a[sortDescriptor.key];
      const second = b[sortDescriptor.key];
      const cmp = first < second ? -1 : first > second ? 1 : 0;
      return sortDescriptor.direction === 'asc' ? cmp : -cmp;
    });
    return items;
  }, [processedData, searchQuery, sortDescriptor]);

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
    setSortDescriptor((prev) => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }));
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
              aria-label="Sort by" placeholder="Sort by" selectedKeys={[sortDescriptor.key]}
              onSelectionChange={(keys) => setSortDescriptor((prev) => ({ ...prev, key: Array.from(keys)[0] }))}
              className="w-48"
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
              <Button isIconOnly variant="light" aria-label="Clear selection" onPress={() => setSelection(new Set())}>
                <LuTrash />
              </Button>
            </div>
          )}
        </div>
      </div>

      {filteredAndSortedData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSortedData.map((group) => (
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

      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex justify-between items-center">Group Analysis<Button isIconOnly variant="light" onPress={onClose}><LuX /></Button></ModalHeader>
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

