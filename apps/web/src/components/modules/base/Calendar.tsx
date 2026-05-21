"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X } from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  status: string;
  type: 'os' | 'obra';
  description?: string;
  color?: string;
}

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  title?: string;
}

export function Calendar({ events, onEventClick, title = "Calendário" }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startDayOfWeek, firstDay, lastDay };
  };

  const getFilteredEvents = () => {
    if (selectedStatus === "all") return events;
    return events.filter(e => e.status === selectedStatus);
  };

  const getEventsForDay = (day: Date) => {
    const dayStr = day.toISOString().split('T')[0];
    return getFilteredEvents().filter(event => {
      const eventDate = event.date.split('T')[0];
      const eventEndDate = event.endDate ? event.endDate.split('T')[0] : eventDate;
      return dayStr >= eventDate && dayStr <= eventEndDate;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
      case 'planejada':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'em_andamento':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'concluida':
      case 'concluido':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelada':
      case 'cancelado':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'os' ? 'bg-indigo-500' : 'bg-emerald-500';
  };

  const { daysInMonth, startDayOfWeek, firstDay, lastDay } = getDaysInMonth(currentDate);
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const uniqueStatuses = Array.from(new Set(events.map(e => e.status)));

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium bg-muted hover:bg-slate-200 rounded-md transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todos os status</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before first day of month */}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-32 bg-slate-50/50 rounded-md" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div
                key={i}
                className={`h-32 border border-border rounded-md p-2 overflow-hidden transition-colors ${
                  isToday ? 'bg-primary/5 border-primary' : 'bg-card'
                } ${isPast ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {i + 1}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground">{dayEvents.length}</span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-24">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={`text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(event.status)}`}
                      title={event.title}
                    >
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${getTypeColor(event.type)}`} />
                        <span className="truncate font-medium">{event.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayEvents.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Empty cells for days after last day of month */}
          {Array.from({ length: (7 - ((startDayOfWeek + daysInMonth) % 7)) % 7 }).map((_, i) => (
            <div key={`empty-end-${i}`} className="h-32 bg-slate-50/50 rounded-md" />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground">OS</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Obras</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200" />
            <span className="text-muted-foreground">Aberta/Planejada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-100 border border-amber-200" />
            <span className="text-muted-foreground">Em andamento</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
            <span className="text-muted-foreground">Concluída</span>
          </div>
        </div>
      </div>
    </div>
  );
}
