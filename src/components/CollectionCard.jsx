import React from 'react';
import PropTypes from 'prop-types';

import {
  NextUIProvider,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem
} from "https://esm.sh/@nextui-org/react";

import {
  LuMoreHorizontal,
  LuEye,
  LuEyeOff,
  LuLineChart,
  LuChevronDown,
  LuDatabase,
  LuPackage,
  LuHash,
  LuCopy,
  LuCheck,
  LuEdit,
  LuTrash2
} from "https://esm.sh/react-icons/lu";

// --- Utility function ---
const cn = (...inputs) => inputs.filter(Boolean).join(' ');

// --- App Components ---

const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const CopyButton = ({ text }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Button
      isIconOnly
      size="sm"
      variant="light"
      className="data-[hover=true]:bg-gray-200"
      onPress={handleCopy}
      aria-label={copied ? "Copied!" : "Copy"}
    >
      {copied ? <LuCheck className="w-4 h-4 text-green-600" /> : <LuCopy className="w-4 h-4 text-gray-500" />}
    </Button>
  );
};
CopyButton.propTypes = { text: PropTypes.string.isRequired };

const DetailsPanel = ({ details, type = 'default' }) => {
  const groupedDetails = details.reduce((acc, detail) => {
    const detailType = detail.label.toLowerCase().includes('test') ? 'tests' :
      detail.label.toLowerCase().includes('legacy') ? 'legacy' :
      detail.label.toLowerCase().includes('part') ? 'parts' : 'other';
    if (!acc[detailType]) acc[detailType] = [];
    acc[detailType].push(detail.value);
    return acc;
  }, {});

  const ListDisplay = ({ title, items, color }) => {
    if (!items || items.length === 0) return null;
    const allValues = items.join(', ');
    return (
      <div>
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</h5>
        <div className={`flex items-start gap-2 p-3 rounded-lg bg-${color}-50 text-${color}-800`}>
          <p className="text-xs font-mono break-all flex-grow">{allValues}</p>
          <CopyButton text={allValues} />
        </div>
      </div>
    );
  };
  ListDisplay.propTypes = {
      title: PropTypes.string.isRequired,
      items: PropTypes.arrayOf(PropTypes.string),
      color: PropTypes.string,
  };


  return (
    <div className={cn("mt-4 space-y-3", type === 'sidebar' ? "px-1" : "")}>
      <ListDisplay title="Test Results" items={groupedDetails.tests} color="gray" />
      <ListDisplay title="Part Numbers" items={groupedDetails.parts} color="blue" />
      <ListDisplay title="Legacy IDs" items={groupedDetails.legacy} color="amber" />
    </div>
  );
};
DetailsPanel.propTypes = {
  details: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })).isRequired,
  type: PropTypes.oneOf(['default', 'sidebar'])
};


function CollectionCard({
  name,
  description,
  isPublic,
  testResultsCount = 0,
  legacyIdsCount = 0,
  partNumbersCount = 0,
  details = [],
  onEdit,
  onDelete,
  onAnalyze,
  view = "default",
  isExpanded,
  onToggleExpand,
}) {

  const cardActions = (
    <Dropdown>
      <DropdownTrigger>
        <Button isIconOnly variant="light" size="sm">
          <LuMoreHorizontal className="h-5 w-5" />
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Card Actions">
        {onEdit && <DropdownItem key="edit" startContent={<LuEdit className="w-4 h-4" />} onPress={onEdit}>Edit Collection</DropdownItem>}
        {onDelete && <DropdownItem key="delete" className="text-danger" color="danger" startContent={<LuTrash2 className="w-4 h-4" />} onPress={onDelete}>Delete Collection</DropdownItem>}
      </DropdownMenu>
    </Dropdown>
  );

  if (view === "sidebar") {
    return (
      <div className={cn("rounded-xl p-3 cursor-pointer transition-all duration-200", isExpanded ? "bg-gray-100 ring-2 ring-gray-200" : "hover:bg-gray-100")} onClick={onToggleExpand}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-semibold text-gray-900 truncate">{name}</h4>
              <Chip size="sm" startContent={isPublic ? <LuEye className="w-3 h-3" /> : <LuEyeOff className="w-3 h-3" />} variant="flat" color={isPublic ? "primary" : "warning"}>
                {isPublic ? "Public" : "Private"}
              </Chip>
            </div>
            <p className="text-xs text-gray-500 line-clamp-1">{description}</p>
            <div className="flex items-center gap-3 mt-2">
              {testResultsCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs text-gray-600" title={pluralize(testResultsCount, "test result")}><LuDatabase className="w-3.5 h-3.5" />{testResultsCount}</span>}
              {partNumbersCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs text-blue-600" title={pluralize(partNumbersCount, "part number")}><LuPackage className="w-3.5 h-3.5" />{partNumbersCount}</span>}
              {legacyIdsCount > 0 && <span className="inline-flex items-center gap-1.5 text-xs text-amber-600" title={pluralize(legacyIdsCount, "legacy ID")}><LuHash className="w-3.5 h-3.5" />{legacyIdsCount}</span>}
            </div>
          </div>
          <div className="flex items-center">
             {cardActions}
          </div>
        </div>
        {isExpanded && <DetailsPanel details={details} type="sidebar" />}
      </div>
    );
  }

  return (
    <Card isPressable={!isExpanded} onPress={onToggleExpand} className={cn(isExpanded && "ring-2 ring-primary-300")}>
      <CardHeader className="flex gap-3 items-start">
        <div className="flex flex-col flex-grow">
          <p className="text-md font-semibold">{name}</p>
          <Chip size="sm" startContent={isPublic ? <LuEye className="w-3 h-3" /> : <LuEyeOff className="w-3 h-3" />} variant="flat" color={isPublic ? "primary" : "warning"}>
            {isPublic ? "Public" : "Private"}
          </Chip>
        </div>
        {onAnalyze && <Button color="default" variant="bordered" size="sm" startContent={<LuLineChart className="w-4 h-4" />} onPress={(e) => { e.stopPropagation(); onAnalyze(); }}>Analyze</Button>}
        {cardActions}
      </CardHeader>
      <CardBody>
        <p className="text-sm text-gray-600 mb-4">{description}</p>
        <div className="flex flex-wrap gap-2">
            {testResultsCount > 0 && <Chip startContent={<LuDatabase className="w-4 h-4"/>} variant="bordered">{pluralize(testResultsCount, "test result")}</Chip>}
            {partNumbersCount > 0 && <Chip startContent={<LuPackage className="w-4 h-4"/>} variant="bordered" color="primary">{pluralize(partNumbersCount, "part number")}</Chip>}
            {legacyIdsCount > 0 && <Chip startContent={<LuHash className="w-4 h-4"/>} variant="bordered" color="warning">{pluralize(legacyIdsCount, "legacy ID")}</Chip>}
        </div>
        {isExpanded && <DetailsPanel details={details} />}
      </CardBody>
      <CardFooter className="justify-between">
         <p className="text-xs text-gray-500">Last updated 2 hours ago</p>
         <Button
            size="sm"
            variant="light"
            onPress={onToggleExpand}
            endContent={<LuChevronDown className={cn('w-4 h-4 transition-transform duration-200', isExpanded && 'rotate-180')} />}
          >
            {isExpanded ? 'Hide' : 'Show'} Details
          </Button>
      </CardFooter>
    </Card>
  );
}

CollectionCard.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  isPublic: PropTypes.bool.isRequired,
  testResultsCount: PropTypes.number,
  legacyIdsCount: PropTypes.number,
  partNumbersCount: PropTypes.number,
  details: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })),
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAnalyze: PropTypes.func,
  view: PropTypes.oneOf(['default', 'sidebar']),
  isExpanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
};