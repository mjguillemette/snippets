import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

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
  const { token, userId, sessionId, userName } = useAuth();
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [operationError, setOperationError] = useState(null);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'X-User-Id': userId,
    'X-Session-Id': sessionId,
    ...options.headers
  }), [token, userId, sessionId, options.headers]);

  const fetchGroups = useCallback(async (visibilityFilter) => {
    setLoading(true);
    setError(null);
    
    const retrieveRequest = {
        groupVisibility: visibilityFilter,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/chimpbeRetrieveGroup`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(retrieveRequest)
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

  const createGroup = useCallback(async (groupData) => {
    setCreating(true);
    setOperationError(null);
    
    const payload = {
      name: groupData.name,
      filterValue: groupData.filterValue || {},
      visibility: groupData.visibility || 'private',
      appliesTo: groupData.appliesTo || [],
      createdBy: groupData.createdBy || userName || userId,
      ...(groupData.description && { description: groupData.description })
    };
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chimpbeCreateGroup`, {
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

  const updateGroup = useCallback(async (groupId, updates) => {
    setUpdating(true);
    setOperationError(null);
    
    const payload = { id: groupId };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.filterValue !== undefined) payload.filterValue = updates.filterValue;
    if (updates.visibility !== undefined) payload.visibility = updates.visibility;
    if (updates.appliesTo !== undefined) payload.appliesTo = updates.appliesTo;
    if (updates.description !== undefined) payload.description = updates.description;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chimpbeUpdateGroup`, {
        method: 'POST', 
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

  const deleteGroup = useCallback(async (groupId) => {
    setDeleting(true);
    setOperationError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/chimpbeDeleteGroup`, {
        method: 'POST', 
        headers: getHeaders(),
        body: JSON.stringify({ id: groupId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed to delete group: ${response.statusText}`
        );
      }

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

  const deleteMultipleGroups = useCallback(async (groupIds) => {
    setDeleting(true);
    setOperationError(null);
    
    try {
      // NOTE: Endpoint assumed to follow the new pattern. Update if different.
      const response = await fetch(`${API_BASE_URL}/api/chimpbeBatchDeleteGroups`, {
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

  const refresh = useCallback(() => {
    return fetchGroups();
  }, [fetchGroups]);

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

  const clearError = useCallback(() => {
    setError(null);
    setOperationError(null);
  }, []);

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

    // Operations
    fetchGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    deleteMultipleGroups,
    refresh,
    clearError,

    // Utility actions
    addPartNumbers,
    removePartNumbers,
    updateVisibility,
    updateFilterValue,

    // Filter value utilities
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