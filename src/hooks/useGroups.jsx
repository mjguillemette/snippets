import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth'; // Assuming you have this hook

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

/**
 * @typedef {Object} FilterValue
 * @property {string[]} [legacyId] - Array of legacy test identifiers (e.g., "cold ambient", "hot ambient 120")
 * @property {string[]} [testResultName] - Array of test result names (e.g., "Gain", "EQ", "Power on voltage")
 */

/**
 * @typedef {Object} Group
 * @property {string} id - Unique identifier for referencing and storage
 * @property {string} name - Human-readable identifier for users to recognize filters
 * @property {string} [description] - Optional: Clarifies filter purpose for complex logic
 * @property {FilterValue} filterValue - Core filter logic with legacyId or testResultName arrays
 * @property {'private'|'public'} visibility - Controls sharing scope
 * @property {string[]} partNumbers - List of part numbers associated with the group
 * @property {string} createdBy - Attribution and ownership tracking
 */

/**
 * Hook for managing groups with CRUD operations
 * @param {Object} options - Configuration options for the hook
 * @returns {Object} Groups data and operations
 */
export const useGroups = (options = {}) => {
  const { token, userId, sessionId, userName } = useAuth(); // Added userName for createdBy
  
  // State for groups list
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for individual operations
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [operationError, setOperationError] = useState(null);

  // Base headers with session info
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId,
    'X-Session-Id': sessionId,
    ...options.headers
  }), [token, userId, sessionId, options.headers]);

  // Fetch all groups
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'GET',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to fetch groups: ${response.statusText}`
        );
      }

      const data = await response.json();
      setGroups(data);
      return data;
    } catch (err) {
      console.error('[useGroups] Error fetching groups:', err);
      setError(err.message || 'Failed to fetch groups');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Create a new group
  const createGroup = useCallback(async (groupData) => {
    setCreating(true);
    setOperationError(null);
    
    // Ensure required fields and set defaults
    const payload = {
      name: groupData.name,
      filterValue: groupData.filterValue || {},
      visibility: groupData.visibility || 'private',
      appliesTo: groupData.appliesTo || [],
      createdBy: groupData.createdBy || userName || userId,
      ...(groupData.description && { description: groupData.description })
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to create group: ${response.statusText}`
        );
      }

      const newGroup = await response.json();
      
      // Optimistically update local state
      setGroups(prevGroups => [...prevGroups, newGroup]);
      
      return newGroup;
    } catch (err) {
      console.error('[useGroups] Error creating group:', err);
      setOperationError(err.message || 'Failed to create group');
      throw err;
    } finally {
      setCreating(false);
    }
  }, [getHeaders, userName, userId]);

  // Update an existing group
  const updateGroup = useCallback(async (groupId, updates) => {
    setUpdating(true);
    setOperationError(null);
    
    // Only include fields that are being updated
    const payload = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.filterValue !== undefined) payload.filterValue = updates.filterValue;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.appliesTo !== undefined) payload.appliesTo = updates.appliesTo;
    if (updates.description !== undefined) payload.description = updates.description;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to update group: ${response.statusText}`
        );
      }

      const updatedGroup = await response.json();
      
      // Update local state
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId ? updatedGroup : group
        )
      );
      
      return updatedGroup;
    } catch (err) {
      console.error('[useGroups] Error updating group:', err);
      setOperationError(err.message || 'Failed to update group');
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [getHeaders]);

  // Delete a group
  const deleteGroup = useCallback(async (groupId) => {
    setDeleting(true);
    setOperationError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to delete group: ${response.statusText}`
        );
      }

      // Remove from local state
      setGroups(prevGroups => 
        prevGroups.filter(group => group.id !== groupId)
      );
      
      return { success: true, deletedId: groupId };
    } catch (err) {
      console.error('[useGroups] Error deleting group:', err);
      setOperationError(err.message || 'Failed to delete group');
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [getHeaders]);

  // Batch operations
  const deleteMultipleGroups = useCallback(async (groupIds) => {
    setDeleting(true);
    setOperationError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/groups/batch-delete`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ groupIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to delete groups: ${response.statusText}`
        );
      }

      const result = await response.json();
      
      // Remove deleted groups from local state
      setGroups(prevGroups => 
        prevGroups.filter(group => !groupIds.includes(group.id))
      );
      
      return result;
    } catch (err) {
      console.error('[useGroups] Error deleting multiple groups:', err);
      setOperationError(err.message || 'Failed to delete groups');
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [getHeaders]);

  // Refresh groups (force refetch)
  const refresh = useCallback(() => {
    return fetchGroups();
  }, [fetchGroups]);

  // Utility functions for working with filter values
  const addFilterItems = useCallback(async (groupId, filterType, items) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    if (filterType !== 'legacyId' && filterType !== 'testResultName') {
      throw new Error('Filter type must be either "legacyId" or "testResultName"');
    }
    
    const currentItems = group.filterValue?.[filterType] || [];
    const updatedItems = [...new Set([...currentItems, ...items])];
    
    const updatedFilterValue = {
      ...group.filterValue,
      [filterType]: updatedItems
    };
    
    return updateGroup(groupId, { filterValue: updatedFilterValue });
  }, [groups, updateGroup]);

  const removeFilterItems = useCallback(async (groupId, filterType, items) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    if (filterType !== 'legacyId' && filterType !== 'testResultName') {
      throw new Error('Filter type must be either "legacyId" or "testResultName"');
    }
    
    const currentItems = group.filterValue?.[filterType] || [];
    const updatedItems = currentItems.filter(item => !items.includes(item));
    
    const updatedFilterValue = {
      ...group.filterValue,
      [filterType]: updatedItems
    };
    
    return updateGroup(groupId, { filterValue: updatedFilterValue });
  }, [groups, updateGroup]);

  const setFilterItems = useCallback(async (groupId, filterType, items) => {
    if (filterType !== 'legacyId' && filterType !== 'testResultName') {
      throw new Error('Filter type must be either "legacyId" or "testResultName"');
    }
    
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedFilterValue = {
      ...group.filterValue,
      [filterType]: items
    };
    
    return updateGroup(groupId, { filterValue: updatedFilterValue });
  }, [groups, updateGroup]);

  const clearFilterType = useCallback(async (groupId, filterType) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedFilterValue = { ...group.filterValue };
    delete updatedFilterValue[filterType];
    
    return updateGroup(groupId, { filterValue: updatedFilterValue });
  }, [groups, updateGroup]);

  const getGroupsByFilterType = useCallback((filterType) => {
    return groups.filter(g => g.filterValue?.[filterType] && g.filterValue[filterType].length > 0);
  }, [groups]);

  const getGroupsWithLegacyIds = useCallback(() => {
    return groups.filter(g => g.filterValue?.legacyId && g.filterValue.legacyId.length > 0);
  }, [groups]);

  const getGroupsWithTestResults = useCallback(() => {
    return groups.filter(g => g.filterValue?.testResultName && g.filterValue.testResultName.length > 0);
  }, [groups]);

  const searchGroupsByFilterValue = useCallback((searchTerm) => {
    const term = searchTerm.toLowerCase();
    return groups.filter(g => {
      const legacyMatches = g.filterValue?.legacyId?.some(id => 
        id.toLowerCase().includes(term)
      );
      const testResultMatches = g.filterValue?.testResultName?.some(name => 
        name.toLowerCase().includes(term)
      );
      return legacyMatches || testResultMatches;
    });
  }, [groups]);

  // Utility functions for working with groups
  const addPartNumbers = useCallback(async (groupId, partNumbers) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedAppliesTo = [...new Set([...group.appliesTo, ...partNumbers])];
    return updateGroup(groupId, { appliesTo: updatedAppliesTo });
  }, [groups, updateGroup]);

  const removePartNumbers = useCallback(async (groupId, partNumbers) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) throw new Error('Group not found');
    
    const updatedAppliesTo = group.appliesTo.filter(pn => !partNumbers.includes(pn));
    return updateGroup(groupId, { appliesTo: updatedAppliesTo });
  }, [groups, updateGroup]);

  const updateVisibility = useCallback(async (groupId, visibility) => {
    return updateGroup(groupId, { visibility });
  }, [updateGroup]);

  const updateFilterValue = useCallback(async (groupId, filterValue) => {
    return updateGroup(groupId, { filterValue });
  }, [updateGroup]);

  // Filter groups by various criteria
  const getGroupsByVisibility = useCallback((visibility) => {
    return groups.filter(g => g.visibility === visibility);
  }, [groups]);

  const getGroupsByCreator = useCallback((creatorId) => {
    return groups.filter(g => g.createdBy === creatorId);
  }, [groups]);

  const getGroupsForPartNumber = useCallback((partNumber) => {
    return groups.filter(g => g.appliesTo.includes(partNumber));
  }, [groups]);

  const searchGroups = useCallback((searchTerm) => {
    const term = searchTerm.toLowerCase();
    return groups.filter(g => 
      g.name.toLowerCase().includes(term) ||
      g.description?.toLowerCase().includes(term) ||
      g.appliesTo.some(pn => pn.toLowerCase().includes(term)) ||
      g.filterValue?.legacyId?.some(id => id.toLowerCase().includes(term)) ||
      g.filterValue?.testResultName?.some(name => name.toLowerCase().includes(term))
    );
  }, [groups]);

  // Clear errors
  const clearError = useCallback(() => {
    setError(null);
    setOperationError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (token && userId) {
      fetchGroups();
    }
  }, [token, userId, fetchGroups]);

  return {
    // Data
    groups,
    
    // Loading states
    loading,
    creating,
    updating,
    deleting,
    isProcessing: creating || updating || deleting,
    
    // Errors
    error,
    operationError,
    
    // CRUD Actions
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    deleteMultipleGroups,
    refresh,
    clearError,
    
    // Utility actions for common operations
    addPartNumbers,
    removePartNumbers,
    updateVisibility,
    updateFilterValue,
    
    // Filter value specific utilities
    addFilterItems,
    removeFilterItems,
    setFilterItems,
    clearFilterType,
    getGroupsByFilterType,
    getGroupsWithLegacyIds,
    getGroupsWithTestResults,
    searchGroupsByFilterValue,
    
    // Query/Filter utilities
    getGroupById: (id) => groups.find(g => g.id === id),
    getGroupsByVisibility,
    getGroupsByCreator,
    getGroupsForPartNumber,
    searchGroups,
    
    // Computed properties
    isEmpty: groups.length === 0,
    count: groups.length,
    privateGroups: groups.filter(g => g.visibility === 'private'),
    publicGroups: groups.filter(g => g.visibility === 'public'),
    myGroups: groups.filter(g => g.createdBy === userId)
  };
};

// Example usage:
/*
function GroupsManager() {
  const {
    groups,
    loading,
    creating,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addPartNumbers,
    removePartNumbers,
    updateVisibility,
    addFilterItems,
    removeFilterItems,
    setFilterItems,
    getGroupsWithLegacyIds,
    getGroupsWithTestResults,
    searchGroups,
    myGroups,
    publicGroups,
    refresh
  } = useGroups();

  // Create a new group with legacyId filter
  const handleCreateLegacyGroup = async () => {
    try {
      const newGroup = await createGroup({
        name: 'Temperature Test Suite',
        description: 'All temperature-related ambient tests',
        filterValue: {
          legacyId: ["cold ambient", "hot ambient 120", "hot 120", "cold ambient 80"]
        },
        visibility: 'private',
        appliesTo: ['PN-12345', 'PN-67890']
      });
      console.log('Legacy group created:', newGroup);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  // Create a new group with testResultName filter
  const handleCreateTestResultGroup = async () => {
    try {
      const newGroup = await createGroup({
        name: 'Audio Analysis Tests',
        description: 'Standard audio measurement tests',
        filterValue: {
          testResultName: ["Gain", "EQ 1", "EQ 2", "Power on voltage", "Spectrogram"]
        },
        visibility: 'public',
        appliesTo: ['PN-AUDIO-001', 'PN-AUDIO-002']
      });
      console.log('Test result group created:', newGroup);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  };

  // Add legacy IDs to existing group
  const handleAddLegacyIds = async (groupId) => {
    try {
      await addFilterItems(groupId, 'legacyId', ["cold ambient 60", "cold ambient 20"]);
      console.log('Legacy IDs added');
    } catch (err) {
      console.error('Failed to add legacy IDs:', err);
    }
  };

  // Add test result names to existing group
  const handleAddTestResults = async (groupId) => {
    try {
      await addFilterItems(groupId, 'testResultName', ["STTO +/-", "Phase Response"]);
      console.log('Test results added');
    } catch (err) {
      console.error('Failed to add test results:', err);
    }
  };

  // Remove specific filter items
  const handleRemoveFilterItems = async (groupId) => {
    try {
      await removeFilterItems(groupId, 'legacyId', ["hot 120"]);
      console.log('Filter items removed');
    } catch (err) {
      console.error('Failed to remove filter items:', err);
    }
  };

  // Replace all filter items of a type
  const handleReplaceFilterItems = async (groupId) => {
    try {
      await setFilterItems(groupId, 'testResultName', [
        "Gain", 
        "Frequency Response", 
        "THD+N"
      ]);
      console.log('Filter items replaced');
    } catch (err) {
      console.error('Failed to replace filter items:', err);
    }
  };

  // Get specialized groups
  const legacyGroups = getGroupsWithLegacyIds();
  const testResultGroups = getGroupsWithTestResults();

  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const filteredGroups = searchTerm ? searchGroups(searchTerm) : groups;

  if (loading) return <div>Loading groups...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div>
        <h2>My Groups ({myGroups.length})</h2>
        <button onClick={handleCreateLegacyGroup} disabled={creating}>
          Create Legacy Test Group
        </button>
        <button onClick={handleCreateTestResultGroup} disabled={creating}>
          Create Test Result Group
        </button>
        <button onClick={refresh}>Refresh</button>
      </div>

      <input
        type="text"
        placeholder="Search groups, tests, or part numbers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div>
        <h3>Groups with Legacy IDs: {legacyGroups.length}</h3>
        <h3>Groups with Test Results: {testResultGroups.length}</h3>
      </div>
      
      {filteredGroups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          {group.description && <p>{group.description}</p>}
          
          {group.filterValue?.legacyId && (
            <div>
              <strong>Legacy IDs:</strong>
              <ul>
                {group.filterValue.legacyId.map((id, idx) => (
                  <li key={idx}>{id}</li>
                ))}
              </ul>
            </div>
          )}
          
          {group.filterValue?.testResultName && (
            <div>
              <strong>Test Results:</strong>
              <ul>
                {group.filterValue.testResultName.map((name, idx) => (
                  <li key={idx}>{name}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div>
            <span>Visibility: {group.visibility}</span>
            <span>Applies to: {group.appliesTo.length} parts</span>
          </div>
          
          <div>
            <button onClick={() => handleAddLegacyIds(group.id)}>
              Add Legacy IDs
            </button>
            <button onClick={() => handleAddTestResults(group.id)}>
              Add Test Results
            </button>
            <button onClick={() => handleRemoveFilterItems(group.id)}>
              Remove Items
            </button>
            <button onClick={() => deleteGroup(group.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Example: Using groups as filters in a test report component
function TestReportFilter() {
  const { groups, getGroupsWithLegacyIds, getGroupsWithTestResults } = useGroups();
  const [filterType, setFilterType] = useState('all');
  
  const displayGroups = filterType === 'legacy' 
    ? getGroupsWithLegacyIds()
    : filterType === 'testResult'
    ? getGroupsWithTestResults()
    : groups;
  
  return (
    <div>
      <h3>Select Test Filters</h3>
      <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
        <option value="all">All Filters</option>
        <option value="legacy">Legacy Test Filters</option>
        <option value="testResult">Test Result Filters</option>
      </select>
      
      {displayGroups.map(group => (
        <div key={group.id}>
          <label>
            <input type="checkbox" />
            {group.name}
            {group.filterValue?.legacyId && (
              <span> ({group.filterValue.legacyId.length} legacy tests)</span>
            )}
            {group.filterValue?.testResultName && (
              <span> ({group.filterValue.testResultName.length} test results)</span>
            )}
          </label>
        </div>
      ))}
    </div>
  );
}
*/