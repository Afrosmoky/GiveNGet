import React from 'react';

interface NotificationsDetailViewProps {
  userData: {
    email: string;
  };
}

export const NotificationsDetailView: React.FC<NotificationsDetailViewProps> = ({
}) => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Notifications Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '0',
        boxShadow: 'none',
        padding: '30px',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'center',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#9ca3af',
          margin: '0'
        }}>
          T.B.D
        </h1>
      </div>
    </div>
  );
}; 