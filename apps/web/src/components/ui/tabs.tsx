import * as React from "react"

const Tabs = ({ value, onValueChange, children, className }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode; className?: string }) => {
  return (
    <div className={className}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange } as any)
        }
        return child
      })}
    </div>
  )
}

const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`inline-flex rounded-lg bg-muted p-1 ${className}`}>
      {children}
    </div>
  )
}

const TabsTrigger = ({ value, onValueChange, children, className }: { value: string; onValueChange?: (value: string) => void; children: React.ReactNode; className?: string }) => {
  return (
    <button
      onClick={() => onValueChange?.(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  return (
    <div className={`mt-2 ${className}`}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
