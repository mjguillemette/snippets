import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { TestCard } from "./TestCard";

export const CardGroup = ({
  groupTitle,
  cards,
  selectedCards,
  onToggleSelect,
  onOpenDetail,
  onDownload
}) => {
  // Calculate summary stats for the header
  const totalTests = useMemo(
    () => cards.reduce((acc, card) => acc + card.tests.length, 0),
    [cards]
  );

  return (
    <div className="mb-10">
      <div className="px-1 mb-4">
        <h2 className="text-xl font-bold text-slate-800">
          {groupTitle}
        </h2>
        <p className="text-sm text-slate-500">
          {cards.length} configurations, {totalTests} total tests
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {cards.map(cardProps =>
          <TestCard
            key={cardProps.id}
            {...cardProps}
            isSelected={selectedCards.has(cardProps.id)}
            onToggleSelect={() => onToggleSelect(cardProps.id)}
            onOpenDetail={() => onOpenDetail(cardProps.groupName)}
            onDownload={() => onDownload(cardProps.groupName)}
          />
        )}
      </div>
    </div>
  );
};

CardGroup.propTypes = {
  groupTitle: PropTypes.string.isRequired,
  cards: PropTypes.array.isRequired,
  selectedCards: PropTypes.object.isRequired, // Should be a Set
  onToggleSelect: PropTypes.func.isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  onDownload: PropTypes.func.isRequired
};
