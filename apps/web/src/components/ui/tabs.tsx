import * as React from "react"

const TabsContext = React.createContext<{ activeValue: string; onValueChange: (value: string) => void }>({
  activeValue: "",
  onValueChange: () => {},
})

const Tabs = ({ value, onValueChange, children, className }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode; className?: string }) => {
  return (
    <TabsContext.Provider value={{ activeValue: value, onValueChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={`inline-flex rounded-lg bg-muted p-1 ${className}`}>
      {children}
    </div>
  )
}

const TabsTrigger = ({ value, children, className, ...rest }: { value: string; children: React.ReactNode; className?: string; [key: string]: unknown }) => {
  const { activeValue, onValueChange } = React.useContext(TabsContext)
  const isActive = activeValue === value

  return (
    <button
      onClick={() => onValueChange(value)}
      data-state={isActive ? "active" : "inactive"}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const { activeValue } = React.useContext(TabsContext)

  if (activeValue !== value) return null

  return (
    <div className={`mt-2 ${className}`}>
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
