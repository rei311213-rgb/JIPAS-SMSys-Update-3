import React, { useState, useMemo } from 'react';
import { 
  DepartmentItem, ClassItem, SubjectItem, CourseItem 
} from '../../types';
import { 
  Building2, School, BookOpen, ChevronRight, ChevronDown, Search, Filter, 
  Layers, CheckCircle, GraduationCap, Users, Sparkles, FolderTree, Network, Plus, Trash2, Edit3, X, Save
} from 'lucide-react';
import { saveClass } from '../../services/dbService';
import { 
  INITIAL_DEPARTMENTS, INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_SHS_COURSES 
} from '../../data/setupData';

interface AcademicTreeViewProps {
  departments: DepartmentItem[];
  courses?: CourseItem[];
  classes: ClassItem[];
  subjects: SubjectItem[];
  onNavigate?: (module: string) => void;
  onUpdateClasses?: (classes: ClassItem[]) => void;
}

export default function AcademicTreeView({
  departments: propDepartments = [],
  courses: propCourses = [],
  classes: propClasses = [],
  subjects: propSubjects = [],
  onNavigate,
  onUpdateClasses
}: AcademicTreeViewProps) {
  // Ensure we always have data to visualize even before sync
  const departments = propDepartments.length > 0 ? propDepartments : INITIAL_DEPARTMENTS;
  const courses = propCourses.length > 0 ? propCourses : INITIAL_SHS_COURSES;
  const classes = propClasses.length > 0 ? propClasses : INITIAL_CLASSES;
  const subjects = propSubjects.length > 0 ? propSubjects : INITIAL_SUBJECTS;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'dept-all': true,
  });

  // State for subject editing modal
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [selectedNewSubject, setSelectedNewSubject] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAll = () => {
    const allKeys: Record<string, boolean> = { 'dept-all': true };
    departments.forEach(d => {
      allKeys[`dept-${d.id}`] = true;
      if (d.subDepartments) {
        d.subDepartments.forEach(sd => {
          allKeys[`subdept-${sd}`] = true;
        });
      }
    });
    courses.forEach(c => {
      allKeys[`course-${c.id}`] = true;
    });
    classes.forEach(cls => {
      allKeys[`class-${cls.id}`] = true;
    });
    setExpandedNodes(allKeys);
  };

  const collapseAll = () => {
    setExpandedNodes({ 'dept-all': false });
  };

  // Filter departments based on selected filter
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      if (selectedDeptFilter !== 'All' && d.name !== selectedDeptFilter && d.code !== selectedDeptFilter) {
        return false;
      }
      return true;
    });
  }, [departments, selectedDeptFilter]);

  // Subject lookup map
  const subjectMap = useMemo(() => {
    const map = new Map<string, SubjectItem>();
    subjects.forEach(s => map.set((s.name || '').toLowerCase(), s));
    return map;
  }, [subjects]);

  const saveClassChanges = async (targetClass: ClassItem) => {
    try {
      await saveClass(targetClass);
      const updatedList = classes.map(c => c.id === targetClass.id ? targetClass : c);
      if (onUpdateClasses) {
        onUpdateClasses(updatedList);
      }
      showToast(`Successfully updated subjects for ${targetClass.name}!`);
    } catch (err) {
      showToast('Error saving subject changes: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleQuickAddSubject = (cls: ClassItem, subjectName: string) => {
    if (!subjectName.trim()) return;
    const currentAssigned = cls.assignedSubjects || [];
    if (currentAssigned.includes(subjectName)) {
      showToast(`"${subjectName}" is already assigned to ${cls.name}.`);
      return;
    }
    const updatedClass: ClassItem = {
      ...cls,
      assignedSubjects: [...currentAssigned, subjectName]
    };
    saveClassChanges(updatedClass);
  };

  const handleQuickRemoveSubject = (cls: ClassItem, subjectName: string) => {
    const currentAssigned = cls.assignedSubjects || [];
    const updatedClass: ClassItem = {
      ...cls,
      assignedSubjects: currentAssigned.filter(s => s !== subjectName)
    };
    saveClassChanges(updatedClass);
  };

  const handleAddSubjectToClass = () => {
    if (!editingClass || !selectedNewSubject.trim()) return;
    const currentAssigned = editingClass.assignedSubjects || [];
    if (currentAssigned.includes(selectedNewSubject)) {
      showToast('Subject is already assigned to this class.');
      return;
    }
    const updatedAssigned = [...currentAssigned, selectedNewSubject];
    const updatedClass: ClassItem = {
      ...editingClass,
      assignedSubjects: updatedAssigned
    };

    setEditingClass(updatedClass);
    setSelectedNewSubject('');
    saveClassChanges(updatedClass);
  };

  const handleRemoveSubjectFromClass = (subjectName: string) => {
    if (!editingClass) return;
    const currentAssigned = editingClass.assignedSubjects || [];
    const updatedAssigned = currentAssigned.filter(s => s !== subjectName);
    const updatedClass: ClassItem = {
      ...editingClass,
      assignedSubjects: updatedAssigned
    };

    setEditingClass(updatedClass);
    saveClassChanges(updatedClass);
  };

  return (
    <div className="space-y-6">
      {/* Toast notification banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-700/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-indigo-400" /> Master Curriculum Hierarchy & Quick Actions
            </span>
            <h2 className="text-2xl font-black mt-1">Interactive Academic Tree Explorer</h2>
            <p className="text-xs text-indigo-200 mt-1 max-w-2xl">
              Visualize and manage the hierarchical relationship between institutional departments, sub-departments, SHS programmes, classes, and their assigned subject curricula with instant quick-action controls.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 rounded-xl text-xs font-bold border border-indigo-600/50 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FolderTree className="w-3.5 h-3.5" /> Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 rounded-xl text-xs font-bold border border-indigo-600/50 transition-all cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search classes, departments, subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold whitespace-nowrap">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter Department:
          </div>
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="All">All Departments ({departments.length})</option>
            {departments.map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tree Visualization Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderTree className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">JIPAS Structural Node Map</h3>
              <p className="text-[11px] text-slate-500">Departments → Sub-Departments / Programmes → Classes → Assigned Subject Curricula</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span> Departments ({departments.length})
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Classes ({classes.length})
            </span>
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Subjects ({subjects.length})
            </span>
          </div>
        </div>

        {/* Tree Root */}
        <div className="space-y-4">
          {filteredDepartments.map((dept) => {
            const deptKey = `dept-${dept.id}`;
            const isDeptExpanded = expandedNodes[deptKey] !== false;

            const deptClasses = classes.filter(c => {
              if (c.department.toLowerCase() === dept.name.toLowerCase()) return true;
              if (dept.code && c.department.toLowerCase().includes(dept.code.toLowerCase())) return true;
              return false;
            });

            const isShs = dept.name.toLowerCase().includes('senior') || dept.code === 'SHS';
            const deptCourses = isShs ? courses : [];

            return (
              <div key={dept.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 transition-all hover:border-slate-300">
                {/* Department Node Header */}
                <div 
                  onClick={() => toggleNode(deptKey)}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                      {isDeptExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900">{dept.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">
                          Code: {dept.code || 'DEPT'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        HOD: <span className="font-semibold text-slate-700">{dept.headOfDepartment || 'Unassigned'}</span> • {deptClasses.length} Classes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">
                      {deptClasses.length} Active Classes
                    </span>
                  </div>
                </div>

                {/* Department Children */}
                {isDeptExpanded && (
                  <div className="mt-4 pl-8 border-l-2 border-teal-200 space-y-3">
                    {/* If SHS, show Programmes/Courses first */}
                    {isShs && deptCourses.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">SHS Programmes & Curricula</span>
                        {deptCourses.map(course => {
                          const courseKey = `course-${course.id}`;
                          const isCourseExpanded = expandedNodes[courseKey] !== false;
                          const courseClasses = deptClasses.filter(c => c.course?.toLowerCase() === course.name.toLowerCase());

                          return (
                            <div key={course.id} className="border border-indigo-100 rounded-xl p-3 bg-white shadow-xs">
                              <div 
                                onClick={() => toggleNode(courseKey)}
                                className="flex items-center justify-between cursor-pointer"
                              >
                                <div className="flex items-center gap-2.5">
                                  <button className="w-5 h-5 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                    {isCourseExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                                  <span className="text-xs font-bold text-slate-800">{course.name} Programme</span>
                                </div>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                                  {courseClasses.length} Classes
                                </span>
                              </div>

                              {/* Classes under this course */}
                              {isCourseExpanded && (
                                <div className="mt-3 pl-6 border-l border-indigo-200 space-y-2.5">
                                  {courseClasses.map(cls => (
                                    <ClassTreeNode
                                      key={cls.id}
                                      cls={cls}
                                      subjectMap={subjectMap}
                                      availableSubjects={subjects}
                                      onOpenEditModal={setEditingClass}
                                      onQuickAddSubject={handleQuickAddSubject}
                                      onQuickRemoveSubject={handleQuickRemoveSubject}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Non-SHS or direct classes */}
                    <div className="space-y-3">
                      {(!isShs ? deptClasses : deptClasses.filter(c => !c.course)).map(cls => (
                        <ClassTreeNode
                          key={cls.id}
                          cls={cls}
                          subjectMap={subjectMap}
                          availableSubjects={subjects}
                          onOpenEditModal={setEditingClass}
                          onQuickAddSubject={handleQuickAddSubject}
                          onQuickRemoveSubject={handleQuickRemoveSubject}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SUBJECT EDITING MODAL */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Quick Curriculum Editor</span>
                <h3 className="text-lg font-black mt-0.5">Manage Subjects for {editingClass.name}</h3>
                <p className="text-xs text-indigo-200">Department: {editingClass.department} {editingClass.course ? `• ${editingClass.course}` : ''}</p>
              </div>
              <button 
                onClick={() => setEditingClass(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Add Subject Quick Form */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <label className="text-xs font-bold text-slate-700 block mb-2">Assign New Subject to Class</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedNewSubject}
                    onChange={(e) => setSelectedNewSubject(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select subject from master list...</option>
                    {subjects.map(subj => (
                      <option key={subj.id} value={subj.name}>
                        {subj.name} ({subj.category || 'General'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddSubjectToClass}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" /> Assign Subject
                  </button>
                </div>
              </div>

              {/* Currently Assigned Subjects List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Currently Assigned Subjects ({editingClass.assignedSubjects?.length || 0})
                  </h4>
                </div>

                {!editingClass.assignedSubjects || editingClass.assignedSubjects.length === 0 ? (
                  <div className="text-center py-8 bg-amber-50/50 rounded-2xl border border-dashed border-amber-200 text-amber-800 text-xs">
                    No subjects assigned to this class yet. Use the selector above to add subjects.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editingClass.assignedSubjects.map((subjName, idx) => {
                      const foundSubj = subjectMap.get(subjName.toLowerCase());
                      return (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                              <BookOpen className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">{subjName}</span>
                              <span className="text-[10px] text-slate-500">
                                {foundSubj ? `${foundSubj.category} • ${foundSubj.code || 'Standard'}` : 'Custom Curriculum Subject'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSubjectFromClass(subjName)}
                            className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all cursor-pointer"
                            title="Remove Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setEditingClass(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" /> Done & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ClassTreeNodeProps {
  key?: React.Key;
  cls: ClassItem;
  subjectMap: Map<string, SubjectItem>;
  availableSubjects: SubjectItem[];
  onOpenEditModal: (cls: ClassItem) => void;
  onQuickAddSubject: (cls: ClassItem, subjectName: string) => void;
  onQuickRemoveSubject: (cls: ClassItem, subjectName: string) => void;
}

function ClassTreeNode({
  cls,
  subjectMap,
  availableSubjects,
  onOpenEditModal,
  onQuickAddSubject,
  onQuickRemoveSubject
}: ClassTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [quickSelectSubject, setQuickSelectSubject] = useState('');
  const assignedList = cls.assignedSubjects || [];

  // Find subjects not yet assigned to this class
  const unassignedSubjects = availableSubjects.filter(
    s => !assignedList.includes(s.name)
  );

  const handleQuickAdd = () => {
    if (!quickSelectSubject) return;
    onQuickAddSubject(cls, quickSelectSubject);
    setQuickSelectSubject('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs hover:shadow-sm transition-all space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div 
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2.5 cursor-pointer flex-1 select-none"
        >
          <button className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            <School className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">{cls.name}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Room {cls.roomNumber || 'N/A'}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {cls.department}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Teacher: <span className="font-medium text-slate-700">{cls.classTeacher || 'Unassigned'}</span> • Capacity: {cls.capacity} students
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/50 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-amber-600" /> {assignedList.length} Subjects
          </span>

          {/* Inline Quick Add Subject */}
          <div className="flex items-center gap-1">
            <select
              value={quickSelectSubject}
              onChange={(e) => setQuickSelectSubject(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 max-w-[130px]"
            >
              <option value="">+ Assign...</option>
              {unassignedSubjects.map(sub => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
            {quickSelectSubject && (
              <button
                onClick={handleQuickAdd}
                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                title="Confirm Add"
              >
                Add
              </button>
            )}
          </div>

          <button
            onClick={() => onOpenEditModal(cls)}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
            title="Manage and Edit Assigned Subjects in Modal"
          >
            <Edit3 className="w-3 h-3" /> Edit Subjects
          </button>
        </div>
      </div>

      {/* Assigned Subjects Leaf Nodes & Inline Removal */}
      {expanded && (
        <div className="pl-8 pt-2.5 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Assigned Curriculum Subjects ({assignedList.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Click &times; to remove directly from class
            </span>
          </div>

          {assignedList.length === 0 ? (
            <div className="p-3 rounded-lg bg-amber-50/60 border border-dashed border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <span>No subjects currently assigned to {cls.name}.</span>
              <button
                onClick={() => onOpenEditModal(cls)}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Assign Now &rarr;
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {assignedList.map((subjName, idx) => {
                const foundSubj = subjectMap.get((subjName || '').toLowerCase());
                return (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-[11px] font-medium shadow-2xs group"
                  >
                    <BookOpen className="w-3 h-3 text-amber-600" />
                    <span>{subjName}</span>
                    {foundSubj && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900">
                        {foundSubj.code || foundSubj.category || 'Core'}
                      </span>
                    )}
                    {/* Quick Delete direct on UI component */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickRemoveSubject(cls, subjName);
                      }}
                      className="ml-0.5 text-amber-500 hover:text-red-600 hover:bg-red-50 rounded p-0.5 cursor-pointer transition-colors"
                      title={`Remove ${subjName} from ${cls.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
