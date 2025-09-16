const ListDisplay = ({ title, items, color }) => {
  if (!items || items.length === 0) return null;
  const allValues = items.join(", ");
  return (
    <div>
      <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </h5>
      <div
        className={cn(
          `flex items-start gap-2 p-3 rounded-lg`,
          color === "gray" && "bg-gray-100 text-gray-800",
          color === "blue" && "bg-blue-50 text-blue-800",
          color === "amber" && "bg-amber-50 text-amber-800"
        )}
      >
        <p className="text-xs font-mono break-all flex-grow">
          {allValues}
        </p>
        <CopyButton text={allValues} />
      </div>
    </div>
  );
};
ListDisplay.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.string),
  color: PropTypes.string
};

// --- Main Component ---

const CollectionDataPanel = ({ details, type = "default" }) => {
  const groupedDetails = details.reduce((acc, detail) => {
    const detailType = detail.label.toLowerCase().includes("test")
      ? "tests"
      : detail.label.toLowerCase().includes("legacy")
        ? "legacy"
        : detail.label.toLowerCase().includes("part") ? "parts" : "other";
    if (!acc[detailType]) acc[detailType] = [];
    acc[detailType].push(detail.value);
    return acc;
  }, {});

  return (
    <div className={cn("mt-4 space-y-3", type === "sidebar" ? "px-1" : "")}>
      <ListDisplay
        title="Test Results"
        items={groupedDetails.tests}
        color="gray"
      />
      <ListDisplay
        title="Part Numbers"
        items={groupedDetails.parts}
        color="blue"
      />
      <ListDisplay
        title="Legacy IDs"
        items={groupedDetails.legacy}
        color="amber"
      />
    </div>
  );
};

CollectionDataPanel.propTypes = {
  details: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired,
  type: PropTypes.oneOf(["default", "sidebar"])
};
