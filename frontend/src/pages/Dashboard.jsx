import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { format, isPast, parseISO } from 'date-fns';

const StatusBadge = ({ s }) => <span className={`badge badge-${s}`}>{s.replace('_',' ')}</span>;
const PriorityBadge = ({ p }) => <span className={`badge badge-${p}`}>{p}</span>;

const Dashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/dashboard')
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <span className="spinner" style={{width:32,height:32,borderWidth:3}}/>
    </div>
  );

  const stats = data?.stats || {};
  const recent = data?.recent || [];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {user?.name?.split(' ')[0]} 👋</div>
          <div className="page-subtitle">Here's what's happening across your projects.</div>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card accent">
          <div className="stat-value">{stats.my_tasks || 0}</div>
          <div className="stat-label">My Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.todo || 0}</div>
          <div className="stat-label">To Do</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{stats.in_progress || 0}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card warn">
          <div className="stat-value">{stats.done || 0}</div>
          <div className="stat-label">Done</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{stats.overdue || 0}</div>
          <div className="stat-label">Overdue</div>
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{fontSize:18, fontWeight:700}}>Recent Activity</h2>
        <Link to="/projects" style={{color:'var(--accent)', fontSize:13, fontWeight:600}}>View all projects →</Link>
      </div>

      {recent.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          <h3>No tasks yet</h3>
          <p>Create a project and add some tasks to get started.</p>
        </div>
      ) : (
        <div className="gap-8">
          {recent.map(task => {
            const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && task.status !== 'done';
            return (
              <div key={task.id} className={`task-item ${isOverdue ? 'overdue' : ''}`}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4}}>
                    <span style={{fontWeight:600, fontSize:14}}>{task.title}</span>
                    <StatusBadge s={task.status} />
                    <PriorityBadge p={task.priority} />
                  </div>
                  <div style={{display:'flex', gap:12, fontSize:12, color:'var(--text2)'}}>
                    <span>📁 {task.project_name}</span>
                    {task.due_date && (
                      <span style={{color: isOverdue ? 'var(--danger)' : 'inherit'}}>
                        📅 {format(parseISO(task.due_date), 'MMM d')}
                        {isOverdue && ' (overdue)'}
                      </span>
                    )}
                  </div>
                </div>
                <Link to={`/projects/${task.project_id}`} className="btn btn-ghost btn-sm">
                  View
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
