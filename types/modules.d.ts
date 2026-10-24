// Fix TypeScript module resolution for packages without built-in types
declare module 'react-easy-crop' {
  import { ComponentType } from 'react'
  
  interface CropperProps {
    image: string
    crop: { x: number; y: number }
    zoom: number
    rotation?: number
    aspect: number
    cropShape?: 'rect' | 'round'
    showGrid?: boolean
    onCropChange: (crop: { x: number; y: number }) => void
    onZoomChange: (zoom: number) => void
    onRotationChange?: (rotation: number) => void
    onCropComplete: (croppedArea: any, croppedAreaPixels: any) => void
  }
  
  const Cropper: ComponentType<CropperProps>
  export default Cropper
}

declare module 'rss-parser' {
  class Parser {
    constructor(options?: any)
    parseURL(url: string): Promise<any>
  }
  export default Parser
}

declare module '*.css' {
  const content: Record<string, string>
  export default content
}

declare module '*.scss' {
  const content: Record<string, string>
  export default content
}

declare module '*.svg' {
  const content: any
  export default content
}