import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SelectionBanner = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [items, setItems] = useState([]);

  const toggleSelection = id => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleCreateGroup = () => {
    console.log("Creating group with items:", Array.from(selectedItems));
    clearSelection();
  };

  const handleAddToGroup = () => {
    console.log("Adding items to group:", Array.from(selectedItems));
    clearSelection();
  };

  const bannerVariants = {
    hidden: {
      y: -80,
      opacity: 0
    },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
        opacity: { duration: 0.2 }
      }
    },
    exit: {
      y: -80,
      opacity: 0,
      transition: {
        duration: 0.15,
        ease: "easeInOut"
      }
    }
  };

  const buttonVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 }
  };

  return (
    <AnimatePresence>
      {selectedItems.size > 0 &&
        <motion.div
          variants={bannerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed top-0 left-0 right-0 bg-slate-900 text-white z-50 shadow-lg"
        >
          <div className="h-14 px-6 flex items-center justify-between">
            {/* Left Section - Selection Count */}
            <div className="flex items-center space-x-4">
              <motion.div
                key={selectedItems.size}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="flex items-center space-x-3"
              >
                <span className="text-sm font-medium text-white/90">
                  {selectedItems.size}{" "}
                  {selectedItems.size === 1 ? "item" : "items"} selected
                </span>
              </motion.div>

              <button
                onClick={clearSelection}
                className="text-sm text-white/50 hover:text-white/80 transition-colors duration-200"
              >
                X
              </button>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex items-center space-x-3">
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={handleAddToGroup}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/15 rounded-md font-medium text-sm transition-all duration-200"
              >
                Add to Group
              </motion.button>

              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={handleCreateGroup}
                className="px-4 py-1.5 bg-white hover:bg-white/95 text-slate-900 rounded-md font-medium text-sm transition-all duration-200"
              >
                Create Group
              </motion.button>
            </div>
          </div>
        </motion.div>}
    </AnimatePresence>
  );
};

export default SelectionBanner;
