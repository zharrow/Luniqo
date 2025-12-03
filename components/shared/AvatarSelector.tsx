'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

interface AvatarSelectorProps {
  selectedAvatar: string | null
  onSelect: (avatar: string) => void
  className?: string
}

const AVATARS = [
  { id: 'men.jpg', label: 'Homme', src: '/men.jpg' },
  { id: 'women.jpg', label: 'Femme', src: '/women.jpg' }
]

export function AvatarSelector({ selectedAvatar, onSelect, className = '' }: AvatarSelectorProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        Photo de profil
      </label>
      <div className="grid grid-cols-2 gap-4">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={`
              relative rounded-2xl overflow-hidden border-2 transition-all duration-300
              hover:scale-105 hover:shadow-lg
              ${
                selectedAvatar === avatar.id
                  ? 'border-[#5a9dc9] ring-4 ring-[#5a9dc9]/20'
                  : 'border-gray-200 hover:border-[#5a9dc9]/50'
              }
            `}
          >
            {/* Image d'avatar */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100">
              <Image
                src={avatar.src}
                alt={avatar.label}
                fill
                className="object-cover"
              />

              {/* Overlay avec gradient au hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Label */}
            <div className="py-2 px-3 bg-white">
              <p className="text-sm font-medium text-gray-700 text-center">
                {avatar.label}
              </p>
            </div>

            {/* Checkmark si sélectionné */}
            {selectedAvatar === avatar.id && (
              <div className="absolute top-2 right-2 bg-[#5a9dc9] rounded-full p-1 shadow-lg">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {selectedAvatar && (
        <button
          type="button"
          onClick={() => onSelect('')}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Retirer l'avatar
        </button>
      )}
    </div>
  )
}
