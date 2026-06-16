import React, { useState, useEffect } from 'react';

const QuizLoading = React.memo(() => {
 const messages = [
  "Loading your quiz...",
  "Getting ready...",
  "Almost there...",
  "Just a moment..."
];
  
  const [index, setIndex] = useState(0);

  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: "'Segoe UI', sans-serif"
  };

  const pulseStyle = {
    width: '70px',
    height: '70px',
    backgroundColor: '#4338ca', // आपकी चुनी हुई थीम
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '32px',
    animation: 'pulse 1.5s infinite ease-in-out',
    marginBottom: '25px',
    boxShadow: '0 10px 15px -3px rgba(67, 56, 202, 0.3)'
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>
      
      <div style={pulseStyle}>
        <span>?</span>
      </div>
      
      <h2 style={{ color: '#4338ca', margin: '0', fontSize: '24px' }}>
        {messages[index]}
      </h2>
      <p style={{ color: '#666', marginTop: '10px' }}>Please wait a moment</p>
    </div>
  );
});

export default QuizLoading;