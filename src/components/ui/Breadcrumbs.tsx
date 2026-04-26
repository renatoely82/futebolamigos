'use client'

import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && (
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast || !item.href ? (
              <span className={`truncate ${isLast ? 'text-gray-700 font-medium' : ''}`}>{item.label}</span>
            ) : (
              <Link href={item.href} className="truncate hover:text-gray-600 transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
