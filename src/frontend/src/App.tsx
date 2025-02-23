import React from 'react';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <ChatInterface />
    </div>
  );
};

export default App;