import { useState } from 'react';
import api from '../utils/api';
import { useToast } from '../context/ToastContext';

const AddMemberModal = ({ projectId, onClose, onAdded }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { email, role });
      addToast('Member added!', 'success');
      onAdded();
      onClose();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add member', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{maxWidth:400}}>
        <div className="modal-header">
          <div className="modal-title">Add Team Member</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">User Email</label>
            <input className="form-input" type="email" placeholder="member@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
            <span style={{fontSize:12, color:'var(--text2)'}}>The user must already have an account.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
              <option value="member">Member — can view and update task status</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="spinner" /> : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
