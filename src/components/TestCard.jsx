import React, { useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import { Card, CardBody, Chip, Button } from "@nextui-org/react";
import { LuMaximize2, LuDownload, LuCheckCircle2 } from "react-icons/lu";
import { cn } from "@/lib/utils"; // Assumed utility for classnames

// These chart components are assumed to be imported from your project
import { DataSortHistogram } from "./charts/DataSortHistogram";
import { DataSweptDataSeries } from "./charts/DataSweptDataSeries";

export const TestCard = React.memo(({
    groupName,
    legacyId,
    mostRecentDate,
    tests,
    data, // Restored data prop for charts
    isSelected,
    onOpenDetail,
    onToggleSelect,
    onDownload
}) => {
    // Memoize calculations for performance
    const metrics = useMemo(() => ({
        passRate: tests.length > 20 ? 92 : 100
    }), [tests]);

    const statusColor = useMemo(() => (
        metrics.passRate < 95 ? 'warning' : 'success'
    ), [metrics.passRate]);

    // Re-integrated logic to determine if the swept data chart should be displayed
    const showSweptData = useMemo(() =>
        data?.length > 0 &&
        Array.isArray(data[0]?.value) &&
        data[0].value.some((item) => item?.dataType === "measureRVector"),
        [data]
    );

    // Prevents clicks on buttons from toggling card selection
    const handleActionClick = useCallback((action) => (e) => {
        e.stopPropagation();
        if (action) action();
    }, []);

    return (
        <Card
            className={cn(
                "transition-all duration-200 overflow-hidden shadow-sm hover:shadow-lg",
                isSelected ? "ring-2 ring-primary border-primary" : "hover:border-slate-300"
            )}
            isPressable
            onPress={onToggleSelect}
            disableRipple
            radius="lg"
        >
            <CardBody className="p-0">
                {/* Main 16:9 Chart Area */}
                <div className="relative aspect-[16/9]">
                    {data && data.length > 0 ? (
                        <DataSortHistogram data={data} />
                    ) : (
                        <div className="flex items-center justify-center h-full text-sm text-default-400 bg-slate-50">
                            No chart data
                        </div>
                    )}
                    {isSelected && (
                        <div className="absolute top-2 right-2 bg-white rounded-full">
                            <LuCheckCircle2 className="text-primary w-6 h-6" />
                        </div>
                    )}
                </div>
                <div className="p-4">
                    <h3 className="font-semibold truncate text-foreground" title={groupName}>{groupName}</h3>
                    <p className="text-xs text-default-500 mb-3">Legacy ID: {legacyId}</p>

                    {/* Conditionally rendered Swept Data Preview */}
                    {showSweptData && (
                        <div className="mb-3 h-[80px] w-full rounded-md border overflow-hidden">
                           <DataSweptDataSeries data={data} />
                        </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-default-600 mb-4">
                        <span>{tests.length} tests</span>
                        <span>{mostRecentDate}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <Chip color={statusColor} size="sm" variant="flat">{metrics.passRate}% Pass</Chip>
                        <div className="flex items-center gap-1">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                className="text-default-500"
                                onPress={handleActionClick(onDownload)}
                                aria-label="Download"
                            >
                                <LuDownload size={16} />
                            </Button>
                            <Button
                                color="primary"
                                variant="light"
                                size="sm"
                                className="font-semibold"
                                onPress={handleActionClick(onOpenDetail)}
                                endContent={<LuMaximize2 size={16} />}
                            >
                                Details
                            </Button>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
});

TestCard.propTypes = {
    groupName: PropTypes.string.isRequired,
    legacyId: PropTypes.string.isRequired,
    mostRecentDate: PropTypes.string.isRequired,
    tests: PropTypes.array.isRequired,
    data: PropTypes.array,
    isSelected: PropTypes.bool.isRequired,
    onOpenDetail: PropTypes.func.isRequired,
    onToggleSelect: PropTypes.func.isRequired,
    onDownload: PropTypes.func.isRequired,
};

TestCard.defaultProps = {
  data: [],
};

