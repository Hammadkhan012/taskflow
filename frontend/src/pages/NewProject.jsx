import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const NewProject = () => {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/projects', form);
      addToast('Project created!', 'success');
      nav(`/projects/${res.data.id}`);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create project', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{maxWidth:560}}>
      <div className="page-header">
        <div>
          <div className="page-title">New Project</div>
          <div className="page-subtitle">You'll be assigned as Admin automatically.</div>
        </div>
        <Link to="/projects" className="btn btn-ghost">Cancel</Link>
      </div>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="What is this project about?"
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%',justifyContent:'center'}}>
            {loading ? <span className="spinner" /> : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewProject;
