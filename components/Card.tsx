
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 sm:p-8 ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
    title: string;
    description: string;
    icon: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, description, icon }) => (
    <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        <div className="bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 rounded-lg p-3">
            {icon}
        </div>
        <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
    </div>
);
