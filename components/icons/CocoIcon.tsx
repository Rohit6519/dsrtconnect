import React from 'react'

export const CocoIcon = ({ className }: { className?: string }) => {
  return (
    <img 
      src="/public/coco-icon.svg" 
      alt="COCO" 
      className={className || "w-5 h-5"}
      onError={(e) => {
        // Fallback to stylized 'C' if file is missing
        e.currentTarget.style.display = 'none';
        e.currentTarget.parentElement?.classList.add('fallback-coco');
      }}
    />
  )
}