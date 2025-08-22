import React, { useMemo, useState, useCallback } from "react";
import { 
  Button, 
  Card, 
  CardBody, 
  Input, 
  Select, 
  SelectItem, 
  Chip, 
  Avatar, 
  Tooltip,
  Badge,
  Switch,
} from "@nextui-org/react";
import { 
  LuSearch, 
  Heart, 
  Edit3, 
  Trash2, 
  Plus, 
  Grid3X3, 
  List, 
  X, 
  BarChart3, 
  Calendar, 
  Tag, 
  Folder,
  Star,
  BookOpen
} from "lucide-react";

/**
 * Enhanced Group Manager with improved NextUI design
 */

function getGroupKey(group, index) {
  const id = group && group.id;
  if (id !== undefined && id !== null && String(id).length > 0) return `id:${id}:${index}`;
  if (group && group.name) return `name:${group.name}:${index}`;
  return `idx:${index}`;
}

const priorityColors = {
  low: "default",
  medium: "warning", 
  high: "danger"
};

const categoryIcons = {
  work: "💼",
  personal: "👤", 
  general: "📁",
  research: "🔬",
  creative: "🎨"
};

export function GroupManager({
  groups = [],
  onEdit,
  onDelete,
  onCreate,
  onAnalyze,
  side = "left",
  initialOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("createdAt");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const filteredGroups = useMemo(() => {
    let list = Array.isArray(groups) ? [...groups] : [];

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((g = {}) =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q) ||
        (g.tags || []).some((t) => String(t).toLowerCase().includes(q))
      );
    }

    if (onlyFavorites) list = list.filter((g = {}) => !!g.isFavorite);

    if (sortKey === "createdAt") list.sort((a = {}, b = {}) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sortKey === "name") list.sort((a = {}, b = {}) => (a.name || "").localeCompare(b.name || ""));
    else if (sortKey === "favorites") list.sort((a = {}, b = {}) => Number(!!b.isFavorite) - Number(!!a.isFavorite));

    return list;
  }, [groups, query, sortKey, onlyFavorites]);

  const handleAnalyzeClick = useCallback(
    (group) => {
      setIsFullscreen(false);
      setIsOpen(true);
      if (onAnalyze) onAnalyze(group);
    },
    [onAnalyze]
  );

  if (!isOpen) {
    return (
      <Button
        isIconOnly
        color="primary"
        variant="shadow"
        className="fixed top-4 z-50"
        style={{ [side]: 16 }}
        onClick={() => setIsOpen(true)}
      >
        <LuBookOpen size={20} />
      </Button>
    );
  }

  const renderSidebarList = () => (
    <div className="space-y-3">
      {filteredGroups.map((group, i) => (
        <Card key={getGroupKey(group, i)} className="hover:shadow-md transition-shadow">
          <CardBody className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 pt-1">
                {group?.isFavorite ? (
                  <LuHeart size={18} className="text-red-500 fill-current" />
                ) : (
                  <LuHeart size={18} className="text-gray-300" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm truncate">
                      {group?.name || "Untitled"}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      {group?.category && (
                        <Chip 
                          size="sm" 
                          variant="flat" 
                          color="default"
                          startContent={<LuFolder size={12} />}
                        >
                          {group.category}
                        </Chip>
                      )}
                      {group?.priority && (
                        <Chip 
                          size="sm" 
                          color={priorityColors[group.priority]} 
                          variant="flat"
                        >
                          {group.priority}
                        </Chip>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <Tooltip content="Analyze Group">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="primary"
                        variant="flat"
                        onClick={() => handleAnalyzeClick(group)}
                      >
                        <LuBarChart3 size={14} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Edit">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        variant="flat"
                        onClick={() => onEdit && onEdit(group)}
                      >
                        <LuEdit3 size={14} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Delete">
                      <Button 
                        isIconOnly 
                        size="sm" 
                        color="danger" 
                        variant="flat"
                        onClick={() => onDelete && onDelete(group)}
                      >
                        <LuTrash2 size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                </div>
                
                {group?.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                    {group.description}
                  </p>
                )}
                
                {Array.isArray(group?.tags) && group.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.tags.slice(0, 3).map((tag, j) => (
                      <Chip key={`t-${j}`} size="sm" variant="bordered" className="text-xs">
                        #{tag}
                      </Chip>
                    ))}
                    {group.tags.length > 3 && (
                      <Chip size="sm" variant="bordered" className="text-xs">
                        +{group.tags.length - 3}
                      </Chip>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  const renderFullscreenGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredGroups.map((group, i) => (
        <Card key={getGroupKey(group, i)} className="h-full hover:shadow-lg transition-shadow">
          <CardBody className="p-5 flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Avatar 
                  size="sm" 
                  name={group?.name || "U"}
                  className="flex-shrink-0"
                  color="primary"
                />
                <h3 className="font-semibold truncate">
                  {group?.name || "Untitled"}
                </h3>
              </div>
              {group?.isFavorite && (
                <LuHeart size={16} className="text-red-500 fill-current flex-shrink-0" />
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4 flex-1 line-clamp-3">
              {group?.description || "No description available"}
            </p>

            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {group?.category && (
                  <Chip 
                    size="sm" 
                    variant="flat" 
                    color="secondary"
                    startContent={<LuFolder size={12} />}
                  >
                    {group.category}
                  </Chip>
                )}
                {group?.priority && (
                  <Chip 
                    size="sm" 
                    color={priorityColors[group.priority]} 
                    variant="flat"
                    startContent={<LuStar size={12} />}
                  >
                    {group.priority}
                  </Chip>
                )}
              </div>

              {Array.isArray(group?.tags) && group.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {group.tags.slice(0, 4).map((tag, j) => (
                    <Chip key={`t-${j}`} size="sm" variant="bordered" startContent={<LuTag size={10} />}>
                      {tag}
                    </Chip>
                  ))}
                  {group.tags.length > 4 && (
                    <Chip size="sm" variant="bordered">
                      +{group.tags.length - 4} more
                    </Chip>
                  )}
                </div>
              )}

              <Button 
                color="primary" 
                className="w-full"
                startContent={<LuBarChart3 size={16} />}
                onClick={() => handleAnalyzeClick(group)}
              >
                Analyze Group Data
              </Button>

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="bordered" 
                  className="flex-1"
                  startContent={<LuEdit3 size={14} />}
                  onClick={() => onEdit && onEdit(group)}
                >
                  Edit
                </Button>
                <Button 
                  size="sm" 
                  color="danger" 
                  variant="bordered"
                  className="flex-1"
                  startContent={<LuTrash2 size={14} />}
                  onClick={() => onDelete && onDelete(group)}
                >
                  Delete
                </Button>
              </div>

              {group?.createdAt && (
                <div className="flex items-center gap-1 text-xs text-gray-500 pt-2">
                  <LuCalendar size={12} />
                  Created {new Date(group.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );

  return (
    <div
      className="fixed top-0 bottom-0 bg-white border-r border-gray-200 z-50 overflow-hidden flex flex-col"
      style={{
        [side]: 0,
        width: isFullscreen ? "100%" : 400,
        boxShadow: "2px 0 10px rgba(0,0,0,0.1)"
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center gap-2">
          <LuBookOpen size={20} className="text-blue-600" />
          <h2 className="font-bold text-lg">Collections</h2>
          <Badge content={filteredGroups.length} color="primary" size="sm">
            <div></div>
          </Badge>
        </div>
        <div className="flex gap-2">
          <Tooltip content={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}>
            <Button 
              isIconOnly 
              size="sm" 
              variant="flat"
              onClick={() => setIsFullscreen((f) => !f)}
            >
              {isFullscreen ? <LuList size={16} /> : <LuGrid3X3 size={16} />}
            </Button>
          </Tooltip>
          <Tooltip content="Close Panel">
            <Button 
              isIconOnly 
              size="sm" 
              variant="flat"
              onClick={() => setIsOpen(false)}
            >
              <LuX size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b bg-gray-50 space-y-3">
        <Input
          placeholder="Search collections..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          startContent={<LuSearch size={16} />}
          size="sm"
          clearable
          onClear={() => setQuery("")}
        />
        
        <div className="flex gap-3 items-center">
          <Select
            size="sm"
            placeholder="Sort by"
            selectedKeys={[sortKey]}
            onSelectionChange={(keys) => setSortKey([...keys][0])}
            className="flex-1"
          >
            <SelectItem key="createdAt">Recent</SelectItem>
            <SelectItem key="name">Name</SelectItem>
            <SelectItem key="favorites">Favorites</SelectItem>
          </Select>
          
          <Switch
            size="sm"
            isSelected={onlyFavorites}
            onValueChange={setOnlyFavorites}
            startContent={<LuHeart size={12} />}
          >
            Favorites
          </Switch>
        </div>

        {onCreate && (
          <Button 
            color="primary" 
            className="w-full"
            startContent={<LuPlus size={16} />}
            onClick={onCreate}
          >
            Create New Collection
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <LuBookOpen size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No Collections Found</h3>
            <p className="text-sm text-gray-400 mb-4">
              {query || onlyFavorites 
                ? "Try adjusting your search or filters" 
                : "Create your first collection to get started"
              }
            </p>
            {onCreate && !query && !onlyFavorites && (
              <Button 
                color="primary" 
                variant="flat"
                startContent={<LuPlus size={16} />}
                onClick={onCreate}
              >
                Create Collection
              </Button>
            )}
          </div>
        ) : isFullscreen ? (
          renderFullscreenGrid()
        ) : (
          renderSidebarList()
        )}
      </div>
    </div>
  );
}

/**
 * Demo App with enhanced test data
 */
export default function DemoApp() {
  const now = Date.now();
  const [groups, setGroups] = useState([
    { 
      id: 1, 
      name: "Data Analytics Team", 
      description: "Core data analysts working on business intelligence and reporting systems. This team focuses on extracting insights from large datasets.", 
      category: "work", 
      priority: "high", 
      tags: ["analytics", "reporting", "business-intelligence", "sql"], 
      isFavorite: true, 
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString() 
    },
    { 
      name: "Personal Projects", 
      description: "Collection of personal side projects and hobby work", 
      category: "personal", 
      priority: "low", 
      tags: ["hobby", "side-projects"], 
      isFavorite: false, 
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString() 
    },
    { 
      id: null, 
      name: "Research Papers", 
      description: "Academic research papers and scientific publications for review", 
      category: "research", 
      priority: "medium", 
      tags: ["academic", "papers", "research"], 
      isFavorite: true, 
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString() 
    },
    { 
      id: "dup", 
      name: "Marketing Campaign Alpha", 
      description: "Q1 marketing campaign materials and analytics", 
      category: "work", 
      priority: "medium", 
      tags: ["marketing", "q1", "campaign"], 
      isFavorite: false, 
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 10).toISOString() 
    },
    { 
      id: "dup", 
      name: "Marketing Campaign Beta", 
      description: "Q2 marketing campaign with advanced targeting", 
      category: "work", 
      priority: "high", 
      tags: ["marketing", "q2", "targeting", "advanced"], 
      isFavorite: false, 
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString() 
    },
    { 
      id: 999, 
      name: "Long Collection Name That Should Demonstrate Proper Text Truncation", 
      description: "This is a stress test collection with a very long name to demonstrate how the UI handles text truncation and maintains proper layout stability across different screen sizes and view modes.", 
      category: "creative", 
      priority: "high", 
      tags: ["ui-test", "truncation", "layout", "stress-test", "design"], 
      isFavorite: true, 
      createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString() 
    },
  ]);

  const handleCreate = () => {
    const name = prompt("New collection name?");
    if (!name) return;
    setGroups((prev) => [
      { 
        id: Date.now(), 
        name, 
        description: "", 
        category: "general", 
        priority: "medium", 
        tags: [], 
        isFavorite: false, 
        createdAt: new Date().toISOString() 
      },
      ...prev,
    ]);
  };

  const handleEdit = (group) => {
    const name = prompt("Edit collection name:", group?.name || "");
    if (name === null) return;
    setGroups((prev) =>
      prev.map((g, i) => {
        if (group?.id !== undefined && group?.id !== null) return g?.id === group.id ? { ...g, name } : g;
        if (group?.name) return g?.name === group.name ? { ...g, name } : g;
        return i === prev.indexOf(group) ? { ...g, name } : g;
      })
    );
  };

  const handleDelete = (group) => {
    const ok = confirm(`Delete collection "${group?.name || "Untitled"}"?`);
    if (!ok) return;
    setGroups((prev) =>
      prev.filter((g) => {
        if (group?.id !== undefined && group?.id !== null) return g?.id !== group.id;
        if (group?.name) return g?.name !== group.name || g?.description !== group?.description;
        return g !== group;
      })
    );
  };

  const handleAnalyze = (group) => {
    alert(`Analyzing "${group?.name || "Untitled"}" collection`);
    console.log("Analyze group ->", group);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Enhanced Collection Manager
          </h1>
          <p className="text-gray-600 mb-8">
            A modern, responsive collection management interface built with NextUI components.
            Try the fullscreen view, search functionality, and different sorting options.
          </p>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">Features Demonstrated:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-2">
                <li>✓ Responsive sidebar and fullscreen views</li>
                <li>✓ Advanced search and filtering</li>
                <li>✓ Favorite collections with heart icons</li>
                <li>✓ Priority and category chips</li>
              </ul>
              <ul className="space-y-2">
                <li>✓ Tag system with overflow handling</li>
                <li>✓ Smooth animations and hover effects</li>
                <li>✓ Tooltip guidance for actions</li>
                <li>✓ Proper text truncation for long names</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <GroupManager
        groups={groups}
        onAnalyze={handleAnalyze}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
      />
    </div>
  );
}