/**
 * Enterprises List Component
 * Table showing all enterprises with admin and activity stats
 */

'use client';

import React, { useState } from 'react';
import type { EnterpriseStats } from '@/types/analytics.types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

interface EnterprisesListProps {
  enterprises: EnterpriseStats[];
}

export default function EnterprisesList({ enterprises }: EnterprisesListProps) {
  const [sortField, setSortField] = useState<keyof EnterpriseStats>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof EnterpriseStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedEnterprises = [...enterprises].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle null values
    if (aValue === null) aValue = '';
    if (bValue === null) bValue = '';

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Jamais';
    try {
      return format(new Date(lastLogin), 'dd MMM yyyy HH:mm', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  if (enterprises.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">Aucune entreprise enregistrée</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                Crèche {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('admin_name')}
              >
                Admin {sortField === 'admin_name' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('admin_email')}
              >
                Email {sortField === 'admin_email' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('employee_count')}
              >
                Employés{' '}
                {sortField === 'employee_count' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('sessions_this_month')}
              >
                Sessions/mois{' '}
                {sortField === 'sessions_this_month' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('last_admin_login')}
              >
                Dernière connexion{' '}
                {sortField === 'last_admin_login' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEnterprises.map((enterprise) => (
              <tr key={enterprise.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{enterprise.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">{enterprise.admin_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-600">{enterprise.admin_email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {enterprise.employee_count}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {enterprise.sessions_this_month}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {formatLastLogin(enterprise.last_admin_login)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
