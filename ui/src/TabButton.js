import React from 'react';
import './TabButton.css';

export default function TabButton({ children, isActive, onClick }) {
  return (
    <button
      className={`tab-button ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
