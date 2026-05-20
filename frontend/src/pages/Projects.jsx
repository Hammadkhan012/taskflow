import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { format } from 'date-fns';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/projects')
      .then(r => setProjects(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <span className="spinner" style={{width:32,height:32,borderWidth:3}}/>
    </div>
  );

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} you're part of</div>
        </div>
        <Link to="/projects/new" className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
          </svg>
          <h3>No projects yet</h3>
          <p>Create your first project to start managing tasks.</p>
          <Link to="/projects/new" className="btn btn-primary" style={{marginTop:16, display:'inline-flex'}}>
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="project-card">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8}}>
                <div className="project-card-name">{p.name}</div>
                <span className={`badge badge-${p.role}`}>{p.role}</span>
              </div>
              <div className="project-card-desc">
                {p.description || <span style={{opacity:0.4}}>No description</span>}
              </div>
              <div className="project-card-meta">
                <span>👥 {p.member_count} member{p.member_count != 1 ? 's' : ''}</span>
                <span>✓ {p.task_count} task{p.task_count != 1 ? 's' : ''}</span>
                <span>{format(new Date(p.created_at), 'MMM d, yyyy')}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
