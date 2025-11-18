/**
 * KPI Card Component
 * Reusable stat card for analytics dashboard
 */

import React from 'react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: 'blue' | 'green' | 'purple' | 'orange';
}

const gradients = {
  blue: 'from-blue-400 to-blue-600',
  green: 'from-green-400 to-green-600',
  purple: 'from-purple-400 to-purple-600',
  orange: 'from-orange-400 to-orange-600',
};

export default function KpiCard({ title, value, icon, gradient }: KpiCardProps) {
  return (
    <div className={`card bg-gradient-to-br ${gradients[gradient]} text-white p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90 mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-4xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}
