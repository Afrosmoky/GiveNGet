import React from 'react';

interface OrdersDetailViewProps {
  userData: {
    email: string;
  };
}

export const OrdersDetailView: React.FC<OrdersDetailViewProps> = ({
}) => {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Orders Section */}
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