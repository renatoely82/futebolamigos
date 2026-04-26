export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

export function SkeletonCircle({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-full animate-pulse ${className}`} />
}

export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
}
