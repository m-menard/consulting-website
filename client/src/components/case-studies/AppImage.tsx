import type { CSSProperties, ImgHTMLAttributes } from "react"

interface AppImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fill?: boolean
}

export default function AppImage({ fill = false, style, ...props }: AppImageProps) {
  const mergedStyle: CSSProperties = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        ...style,
      }
    : (style ?? {})

  return <img {...props} style={mergedStyle} />
}
