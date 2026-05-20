import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import TaskModal from '../components/TaskModal';
import AddMemberModal from '../components/AddMemberModal';
import { format, isPast, parseISO } from 'date-fns';

const StatusBadge = ({ s }) => <span className={`badge badge-${s}`}>{s.replace('_',' ')}</span>;
const PriorityBadge = ({ p }) => <span className={`badge badge-${p}`}>{p}</span>;

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: 'var(--text2)' },
  { key: 'in_progress', label: 'In Progress', color: 'var(--accent)' },
  { key: 'done', label: 'Done', color: 'var(--accent3)' }
];

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const nav = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', priority: '' });

  const load = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks/project/${id}`, { params: filter })
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
    } catch (err) {
      if (err.response?.status === 403) { addToast('Access denied', 'error'); nav('/projects'); }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, filter]);

  const isAdmin = project?.role === 'admin';
  const members = project?.members || [];

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      addToast('Task deleted', 'success');
      load();
    } catch { addToast('Failed to delete task', 'error'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      addToast('Member removed', 'success');
      load();
    } catch { addToast('Failed to remove member', 'error'); }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this entire project? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      addToast('Project deleted', 'success');
      nav('/projects');
    } catch { addToast('Failed to delete project', 'error'); }
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <span className="spinner" style={{width:32,height:32,borderWidth:3}}/>
    </div>
  );

  if (!project) return null;

  const tasksByStatus = (status) => tasks.filter(t => t.status === status);

  const TaskCard = ({ task }) => {
    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
    const canEdit = isAdmin || task.assigned_to === user?.id;
    return (
      <div className={`task-item ${isOverdue ? 'overdue' : ''}`} style={{flexDirection:'column', gap:8}}>
        <div className="flex-between">
          <span style={{fontWeight:600, fontSize:14, flex:1}}>{task.title}</span>
          <div style={{display:'flex', gap:4}}>
            {canEdit && (
              <button className="btn btn-ghost btn-icon btn-sm"
                onClick={() => { setEditTask(task); setShowTaskModal(true); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
            {isAdmin && (
              <button className="btn btn-danger btn-icon btn-sm"
                onClick={() => handleDeleteTask(task.id)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        {task.description && (
          <div style={{fontSize:12, color:'var(--text2)', lineHeight:1.5}}>
            {task.description.length > 80 ? task.description.slice(0,80) + '...' : task.description}
          </div>
        )}
        <div style={{display:'flex', gap:6, flexWrap:'wrap', alignItems:'center'}}>
          <PriorityBadge p={task.priority} />
          {task.assigned_name && (
            <span style={{fontSize:11, color:'var(--text2)', fontFamily:'var(--font-mono)'}}>
              → {task.assigned_name}
            </span>
          )}
          {task.due_date && (
            <span style={{fontSize:11, color: isOverdue ? 'var(--danger)' : 'var(--text2)', fontFamily:'var(--font-mono)', marginLeft:'auto'}}>
              {format(parseISO(task.due_date), 'MMM d')}
              {isOverdue && ' ⚠'}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div style={{fontSize:13, color:'var(--text2)', marginBottom:4}}>
            <Link to="/projects" style={{color:'var(--text2)'}}>Projects</Link> /
          </div>
          <div className="page-title">{project.name}</div>
          {project.description && (
            <div className="page-subtitle">{project.description}</div>
          )}
          <div style={{marginTop:8}}>
            <span className={`badge badge-${project.role}`}>{project.role}</span>
          </div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {isAdmin && (
            <>
              <button className="btn btn-primary" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>
                + Add Task
              </button>
              <button className="btn btn-ghost" onClick={() => setShowMemberModal(true)}>
                + Member
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>
                Delete Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid var(--border)', paddingBottom:0}}>
        {['board','list','members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              background:'none', border:'none', cursor:'pointer',
              padding:'10px 20px', fontSize:14, fontWeight:600,
              color: tab === t ? 'var(--accent)' : 'var(--text2)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily:'var(--font-display)', textTransform:'capitalize', transition:'all 0.2s'
            }}>
            {t === 'board' ? '📋 Board' : t === 'list' ? '📄 List' : '👥 Team'}
          </button>
        ))}
      </div>

      {/* Filters (list view) */}
      {tab === 'list' && (
        <div style={{display:'flex', gap:12, marginBottom:20, flexWrap:'wrap'}}>
          <select className="form-select" style={{width:'auto'}} value={filter.status}
            onChange={e => setFilter({...filter, status: e.target.value})}>
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select className="form-select" style={{width:'auto'}} value={filter.priority}
            onChange={e => setFilter({...filter, priority: e.target.value})}>
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          {(filter.status || filter.priority) && (
            <button className="btn btn-ghost btn-sm" onClick={() => setFilter({status:'',priority:''})}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Board View */}
      {tab === 'board' && (
        <div className="kanban-board">
          {COLUMNS.map(col => (
            <div key={col.key} className="kanban-col">
              <div className="kanban-col-header">
                <span className="kanban-col-title" style={{color: col.color}}>{col.label}</span>
                <span style={{fontSize:12, color:'var(--text2)', fontFamily:'var(--font-mono)'}}>
                  {tasksByStatus(col.key).length}
                </span>
              </div>
              <div className="kanban-tasks">
                {tasksByStatus(col.key).length === 0 ? (
                  <div style={{fontSize:13, color:'var(--text2)', textAlign:'center', padding:'20px 0', opacity:0.5}}>
                    No tasks
                  </div>
                ) : (
                  tasksByStatus(col.key).map(task => <TaskCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {tab === 'list' && (
        <div className="gap-8">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <h3>No tasks found</h3>
              <p>Adjust filters or add new tasks.</p>
            </div>
          ) : tasks.map(task => {
            const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            const canEdit = isAdmin || task.assigned_to === user?.id;
            return (
              <div key={task.id} className={`task-item ${isOverdue ? 'overdue' : ''}`}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:4}}>
                    <span style={{fontWeight:600, fontSize:14}}>{task.title}</span>
                    <StatusBadge s={task.status} />
                    <PriorityBadge p={task.priority} />
                  </div>
                  <div style={{display:'flex', gap:12, fontSize:12, color:'var(--text2)', flexWrap:'wrap'}}>
                    {task.assigned_name && <span>→ {task.assigned_name}</span>}
                    {task.due_date && (
                      <span style={{color: isOverdue ? 'var(--danger)' : 'inherit'}}>
                        📅 {format(parseISO(task.due_date), 'MMM d, yyyy')}
                        {isOverdue && ' (overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{display:'flex', gap:6}}>
                  {canEdit && (
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => { setEditTask(task); setShowTaskModal(true); }}>
                      Edit
                    </button>
                  )}
                  {isAdmin && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members View */}
      {tab === 'members' && (
        <div>
          {isAdmin && (
            <div style={{marginBottom:20}}>
              <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
                + Add Member
              </button>
            </div>
          )}
          <div className="gap-8">
            {members.map(m => (
              <div key={m.id} className="card card-sm flex-between" style={{display:'flex', alignItems:'center'}}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                  <div className="nav-avatar">
                    {m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <div>
                    <div style={{fontWeight:600, fontSize:14}}>{m.name}</div>
                    <div style={{fontSize:12, color:'var(--text2)'}}>{m.email}</div>
                  </div>
                </div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <span className={`badge badge-${m.role}`}>{m.role}</span>
                  {isAdmin && m.id !== user?.id && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showTaskModal && (
        <TaskModal
          projectId={id}
          members={members}
          task={editTask}
          isAdmin={isAdmin}
          currentUserId={user?.id}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSaved={load}
        />
      )}
      {showMemberModal && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowMemberModal(false)}
          onAdded={load}
        />
      )}
    </div>
  );
};

export default ProjectDetail;
