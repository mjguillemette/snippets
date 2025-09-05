import React, { useState, useMemo } from "react";
import {
  Button,
  ButtonGroup,
  Input,
  Select,
  SelectItem,
  Checkbox,
  Chip,
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  getKeyValue
} from "@nextui-org/react";
import { Search, Download, X, Rows, LayoutGrid, Table2 } from "lucide-react";

// Sample data for demonstration
const sampleData = [
  {
    id: 1,
    name: "Product A",
    category: "Electronics",
    region: "North",
    status: "Active",
    value: 1200
  },
  {
    id: 2,
    name: "Product B",
    category: "Electronics",
    region: "South",
    status: "Inactive",
    value: 800
  },
  {
    id: 3,
    name: "Product C",
    category: "Clothing",
    region: "North",
    status: "Active",
    value: 450
  },
  {
    id: 4,
    name: "Product D",
    category: "Clothing",
    region: "East",
    status: "Active",
    value: 650
  },
  {
    id: 5,
    name: "Product E",
    category: "Books",
    region: "West",
    status: "Inactive",
    value: 200
  },
  {
    id: 6,
    name: "Product F",
    category: "Books",
    region: "South",
    status: "Active",
    value: 300
  },
  {
    id: 7,
    name: "Product G",
    electronics: "Electronics",
    region: "East",
    status: "Active",
    value: 950
  },
  {
    id: 8,
    name: "Product H",
    category: "Clothing",
    region: "West",
    status: "Inactive",
    value: 380
  },
  {
    id: 9,
    name: "Gadget Pro",
    category: "Electronics",
    region: "West",
    status: "Active",
    value: 1500
  },
  {
    id: 10,
    name: "Comfort Tee",
    category: "Clothing",
    region: "South",
    status: "Active",
    value: 250
  }
];

const groupByOptions = [
  { key: "category", label: "Category" },
  { key: "region", label: "Region" },
  { key: "status", label: "Status" }
];

export default function MatrixView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const [primaryGroup, setPrimaryGroup] = useState("category");
  const [secondaryGroup, setSecondaryGroup] = useState("region");
  const [viewMode, setViewMode] = useState("matrix"); // matrix, cards, table

  // Memoize filtered data to avoid re-calculating on every render
  const filteredData = useMemo(
    () => {
      if (!searchTerm) return sampleData;
      return sampleData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    },
    [searchTerm]
  );

  const selectedItemsCount =
    selectedKeys === "all" ? filteredData.length : selectedKeys.size;

  // Memoize unique values for grouping dimensions
  const primaryValues = useMemo(
    () => [...new Set(filteredData.map(item => item[primaryGroup]))].sort(),
    [filteredData, primaryGroup]
  );

  const secondaryValues = useMemo(
    () => [...new Set(filteredData.map(item => item[secondaryGroup]))].sort(),
    [filteredData, secondaryGroup]
  );

  // Memoize grouped data for the matrix view
  const matrixData = useMemo(
    () => {
      const matrix = new Map();
      for (const primaryValue of primaryValues) {
        for (const secondaryValue of secondaryValues) {
          const cellKey = `${primaryValue}-${secondaryValue}`;
          const items = filteredData.filter(
            item =>
              item[primaryGroup] === primaryValue &&
              item[secondaryGroup] === secondaryValue
          );
          matrix.set(cellKey, items);
        }
      }
      return matrix;
    },
    [filteredData, primaryGroup, secondaryGroup, primaryValues, secondaryValues]
  );

  // Memoize grouped data for the cards view
  const cardGroupData = useMemo(
    () => {
      const grouped = {};
      primaryValues.forEach(primaryValue => {
        grouped[primaryValue] = filteredData.filter(
          item => item[primaryGroup] === primaryValue
        );
      });
      return grouped;
    },
    [filteredData, primaryGroup, primaryValues]
  );

  const handleExport = () => {
    let selectedData;
    if (selectedKeys === "all") {
      selectedData = filteredData;
    } else {
      selectedData = filteredData.filter(item =>
        selectedKeys.has(String(item.id))
      );
    }
    console.log("Exporting:", selectedData);
    // In a real app, you would convert selectedData to CSV/JSON and trigger a download.
  };

  const renderItem = item =>
    <div
      key={item.id}
      className="flex items-center gap-2 p-2 rounded-lg border-default-200 border bg-default-50/50"
    >
      <Checkbox
        size="sm"
        isSelected={selectedKeys === "all" || selectedKeys.has(String(item.id))}
        onValueChange={() => {
          const newSelectedKeys = new Set(selectedKeys);
          if (newSelectedKeys.has(String(item.id))) {
            newSelectedKeys.delete(String(item.id));
          } else {
            newSelectedKeys.add(String(item.id));
          }
          setSelectedKeys(newSelectedKeys);
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">
          {item.name}
        </p>
        <p className="text-xs text-default-500">
          ${item.value}
        </p>
      </div>
      <div
        className={`w-2 h-2 rounded-full ${item.status === "Active"
          ? "bg-success-400"
          : "bg-default-400"}`}
        title={item.status}
      />
    </div>;

  const renderContent = () => {
    switch (viewMode) {
      case "matrix":
        return (
          <div className="border border-default-200 rounded-xl overflow-hidden bg-background">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full align-middle">
                {/* Header Row */}
                <div className="flex border-b border-default-200 bg-default-50 sticky top-0 z-10">
                  <div className="w-40 p-3 border-r border-default-200 shrink-0">
                    <p className="text-sm font-semibold text-default-600 capitalize">
                      {secondaryGroup} \ {primaryGroup}
                    </p>
                  </div>
                  {primaryValues.map(value =>
                    <div
                      key={value}
                      className="w-56 p-3 border-r border-default-200 shrink-0"
                    >
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {value}
                      </p>
                    </div>
                  )}
                </div>
                {/* Data Rows */}
                {secondaryValues.map(secondaryValue =>
                  <div
                    key={secondaryValue}
                    className="flex border-b border-default-200 last:border-b-0"
                  >
                    <div className="w-40 p-3 border-r border-default-200 bg-default-50 shrink-0">
                      <p className="text-sm font-medium text-foreground capitalize">
                        {secondaryValue}
                      </p>
                    </div>
                    {primaryValues.map(primaryValue => {
                      const cellData =
                        matrixData.get(`${primaryValue}-${secondaryValue}`) ||
                        [];
                      return (
                        <div
                          key={`${primaryValue}-${secondaryValue}`}
                          className="w-56 p-2 border-r border-default-200 shrink-0"
                        >
                          <div className="space-y-2 h-full">
                            {cellData.length === 0
                              ? <div className="text-xs text-default-400 italic h-full flex items-center justify-center">
                                  No items
                                </div>
                              : cellData.map(renderItem)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case "cards":
        return (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(cardGroupData).map(([groupName, items]) =>
              <Card key={groupName} shadow="sm">
                <CardHeader>
                  <div className="w-full">
                    <h3 className="text-lg font-semibold text-foreground capitalize">
                      {groupName}
                    </h3>
                    <p className="text-sm text-default-500">
                      {items.length} items
                    </p>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <div className="space-y-3">
                    {items.length > 0
                      ? items.map(renderItem)
                      : <p className="text-sm text-default-400 italic">
                          No items
                        </p>}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        );
      case "table":
        return (
          <Table
            aria-label="Product Data Table"
            selectionMode="multiple"
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            sortDescriptor={{ column: primaryGroup, direction: "ascending" }}
          >
            <TableHeader>
              <TableColumn key="name" allowsSorting>
                Name
              </TableColumn>
              <TableColumn key="category" allowsSorting>
                Category
              </TableColumn>
              <TableColumn key="region" allowsSorting>
                Region
              </TableColumn>
              <TableColumn key="status" allowsSorting>
                Status
              </TableColumn>
              <TableColumn key="value" allowsSorting>
                Value
              </TableColumn>
            </TableHeader>
            <TableBody items={filteredData} emptyContent="No products found.">
              {item =>
                <TableRow key={item.id}>
                  {columnKey =>
                    <TableCell>
                      {getKeyValue(item, columnKey)}
                    </TableCell>}
                </TableRow>}
            </TableBody>
          </Table>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-background text-foreground font-sans">
      {/* Header */}
      <header className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Product Explorer</h1>
          {selectedItemsCount > 0 &&
            <Chip color="primary" variant="flat">
              {selectedItemsCount} selected
            </Chip>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ButtonGroup>
            <Button
              isIconOnly
              variant={viewMode === "matrix" ? "solid" : "bordered"}
              onClick={() => setViewMode("matrix")}
            >
              <Rows size={18} />
            </Button>
            <Button
              isIconOnly
              variant={viewMode === "cards" ? "solid" : "bordered"}
              onClick={() => setViewMode("cards")}
            >
              <LayoutGrid size={18} />
            </Button>
            <Button
              isIconOnly
              variant={viewMode === "table" ? "solid" : "bordered"}
              onClick={() => setViewMode("table")}
            >
              <Table2 size={18} />
            </Button>
          </ButtonGroup>
          <Button
            color="primary"
            variant="bordered"
            onClick={() =>
              setSelectedKeys(
                selectedItemsCount === filteredData.length ? new Set([]) : "all"
              )}
          >
            {selectedItemsCount === filteredData.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            color="danger"
            variant="light"
            onClick={() => setSelectedKeys(new Set([]))}
            isDisabled={selectedItemsCount === 0}
            startContent={<X size={16} />}
          >
            Clear
          </Button>
          <Button
            color="success"
            variant="solid"
            onClick={handleExport}
            isDisabled={selectedItemsCount === 0}
            startContent={<Download size={16} />}
          >
            Export
          </Button>
        </div>
      </header>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          isClearable
          placeholder="Search products..."
          value={searchTerm}
          onClear={() => setSearchTerm("")}
          onValueChange={setSearchTerm}
          startContent={<Search className="text-default-400" size={18} />}
          className="w-full md:max-w-xs"
        />
        <div className="flex gap-4">
          <Select
            label={viewMode === "matrix" ? "Group By (Columns)" : "Group By"}
            selectedKeys={[primaryGroup]}
            onChange={e => setPrimaryGroup(e.target.value)}
            className="min-w-[160px]"
          >
            {groupByOptions.map(opt =>
              <SelectItem
                key={opt.key}
                value={opt.key}
                isDisabled={opt.key === secondaryGroup && viewMode === "matrix"}
              >
                {opt.label}
              </SelectItem>
            )}
          </Select>

          {viewMode === "matrix" &&
            <Select
              label="Then By (Rows)"
              selectedKeys={[secondaryGroup]}
              onChange={e => setSecondaryGroup(e.target.value)}
              className="min-w-[160px]"
            >
              {groupByOptions.map(opt =>
                <SelectItem
                  key={opt.key}
                  value={opt.key}
                  isDisabled={opt.key === primaryGroup}
                >
                  {opt.label}
                </SelectItem>
              )}
            </Select>}
        </div>
      </div>

      {/* Main Content */}
      <main>
        {renderContent()}
      </main>
    </div>
  );
}
