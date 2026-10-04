import React from 'react';

export const DummyPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <>
      <div className="hdr">
        <h2>{title}</h2>
      </div>
      <div className="content">
        <div className="card" style={{ padding: 20 }}>
          <p>The <b>{title}</b> page design is currently pending implementation based on the remaining reference files.</p>
        </div>
      </div>
    </>
  );
};
