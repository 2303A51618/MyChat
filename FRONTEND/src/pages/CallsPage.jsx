import React, { useState } from 'react';
import { useAuthStore } from '../Store/useAuthStore';

const CallsPage = () => {
  const { friends } = useAuthStore();
  const [calls, setCalls] = useState([
    { id: 1, who: 'Alice', type: 'audio', at: 'Today, 10:03' },
    { id: 2, who: 'Bob', type: 'video', at: 'Yesterday, 18:10' },
  ]);
  const [showDial, setShowDial] = useState(false);
  const [target, setTarget] = useState('');

  const startCall = () => {
    if (!target) return;
    setCalls([{ id: Date.now(), who: target, type: 'audio', at: 'Just now' }, ...calls]);
    setShowDial(false);
    setTarget('');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Calls</h2>
      <p className="text-sm text-gray-600 mb-4">Recent calls and quick call actions.</p>

      <div className="mb-4">
        <button onClick={()=>setShowDial(true)} className="btn btn-primary">Start Call</button>
      </div>

      {showDial && (
        <div className="mb-4 p-3 border rounded section-card">
          <input value={target} onChange={(e)=>setTarget(e.target.value)} className="input input-bordered w-full mb-2" placeholder="Friend name or id" />
          <div className="flex gap-2 justify-end">
            <button className="btn" onClick={()=>setShowDial(false)}>Cancel</button>
            <button className="btn btn-success" onClick={startCall}>Start</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {calls.map(c => (
          <div key={c.id} className="p-3 border rounded flex items-center justify-between section-card">
            <div>
              <div className="font-medium">{c.who}</div>
              <div className="text-xs text-gray-500">{c.type} • {c.at}</div>
            </div>
            <div>
              <button className="btn btn-sm btn-ghost">Call</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CallsPage;
