"use client";

import { useState } from "react";
import { Calculator, X } from "lucide-react";

interface FloatingCalculatorProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function FloatingCalculator({ isOpen, onToggle }: FloatingCalculatorProps) {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") return { x: -24, y: -24 };

    const saved = localStorage.getItem("calculatorPosition");
    if (!saved) return { x: -24, y: -24 };

    try {
      return JSON.parse(saved) as { x: number; y: number };
    } catch {
      return { x: -24, y: -24 };
    }
  }); // bottom-6 right-6 equivalent relative to screen bottom-right
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 4;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Só marca o início do gesto; o arraste real (e a captura do ponteiro) só
    // começa se houver movimento, para não engolir cliques simples (abrir/fechar).
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging && dragStart) {
      const moved = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
      if (moved > DRAG_THRESHOLD_PX) {
        setIsDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }
    if (isDragging) {
      const newPos = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      setPosition(newPos);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      localStorage.setItem('calculatorPosition', JSON.stringify(position));
    }
    setIsDragging(false);
    setDragStart(null);
  };


  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay("0.");
      setNewNumber(false);
    } else if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);
    if (previousValue !== null && operation && !newNumber) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    } else {
      setPreviousValue(currentValue);
    }
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case "+": return prev + current;
      case "-": return prev - current;
      case "×": return prev * current;
      case "÷": return current !== 0 ? prev / current : 0;
      default: return current;
    }
  };

  const handleEquals = () => {
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handlePercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const formatDisplay = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "0";
    if (value.includes(".")) {
      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return num.toLocaleString("pt-BR");
  };

  const isDefaultPosition = position.x === -24 && position.y === -24;

  if (!isOpen) {
    return (
      <div 
        className="fixed z-50"
        style={isDefaultPosition ? {
          right: 24,
          bottom: 24,
        } : {
          transform: `translate(${position.x}px, ${position.y}px)`,
          left: 0,
          top: 0,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          onClick={onToggle}
          className="bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary/90 transition-all hover:scale-110 cursor-move"
          title="Calculadora"
        >
          <Calculator className="h-6 w-6 pointer-events-none" />
        </button>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50"
      style={isDefaultPosition ? {
        right: 24,
        bottom: 24,
      } : {
        transform: `translate(${position.x}px, ${position.y}px)`,
        left: 0,
        top: 0,
      }}
    >
      <div className="bg-card rounded-xl shadow-2xl border border-border w-80 overflow-hidden">
        {/* Header */}
        <div 
          className="bg-primary text-white px-4 py-3 flex items-center justify-between cursor-move"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            <span className="font-semibold">Calculadora</span>
          </div>
          <button
            onClick={onToggle}
            className="hover:bg-card/20 rounded-full p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-muted px-4 py-4 border-b border-border">
          <div className="text-right text-3xl font-mono font-semibold text-foreground">
            {formatDisplay(display)}
          </div>
          {operation && previousValue !== null && (
            <div className="text-right text-sm text-muted-foreground mt-1">
              {formatDisplay(String(previousValue))} {operation}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="p-4 grid grid-cols-4 gap-2">
          <button
            onClick={handleClear}
            className="bg-red-100 hover:bg-red-200 text-red-700 dark:text-red-500 font-semibold rounded-md p-3 transition-colors"
          >
            C
          </button>
          <button
            onClick={handlePercent}
            className="bg-muted hover:bg-muted text-foreground font-semibold rounded-md p-3 transition-colors"
          >
            %
          </button>
          <button
            onClick={() => handleOperation("÷")}
            className="bg-muted hover:bg-muted text-foreground font-semibold rounded-md p-3 transition-colors"
          >
            ÷
          </button>
          <button
            onClick={() => handleOperation("×")}
            className="bg-muted hover:bg-muted text-foreground font-semibold rounded-md p-3 transition-colors"
          >
            ×
          </button>

          <button
            onClick={() => handleNumber("7")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            7
          </button>
          <button
            onClick={() => handleNumber("8")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            8
          </button>
          <button
            onClick={() => handleNumber("9")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            9
          </button>
          <button
            onClick={() => handleOperation("-")}
            className="bg-muted hover:bg-muted text-foreground font-semibold rounded-md p-3 transition-colors"
          >
            -
          </button>

          <button
            onClick={() => handleNumber("4")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            4
          </button>
          <button
            onClick={() => handleNumber("5")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            5
          </button>
          <button
            onClick={() => handleNumber("6")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            6
          </button>
          <button
            onClick={() => handleOperation("+")}
            className="bg-muted hover:bg-muted text-foreground font-semibold rounded-md p-3 transition-colors"
          >
            +
          </button>

          <button
            onClick={() => handleNumber("1")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            1
          </button>
          <button
            onClick={() => handleNumber("2")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            2
          </button>
          <button
            onClick={() => handleNumber("3")}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            3
          </button>
          <button
            onClick={handleEquals}
            className="bg-primary hover:bg-primary/90 text-white font-semibold rounded-md p-3 transition-colors row-span-2"
          >
            =
          </button>

          <button
            onClick={() => handleNumber("0")}
            className="col-span-2 bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            0
          </button>
          <button
            onClick={handleDecimal}
            className="bg-card hover:bg-muted text-foreground font-semibold rounded-md p-3 border border-border transition-colors"
          >
            ,
          </button>
        </div>
      </div>
    </div>
  );
}
