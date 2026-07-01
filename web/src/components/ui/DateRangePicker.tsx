'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

// --- Date Utils ---
const toISODate = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseISODate = (iso: string) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// Returns 0 for Monday, 6 for Sunday
const getFirstDayOfMonth = (year: number, month: number) => {
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7; 
};

// --- Presets Logic ---
const getPresets = () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getPresetRange = (type: string): DateRange => {
    const start = new Date(today);
    const end = new Date(today);
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday = 0

    switch (type) {
      case 'Today':
        break;
      case 'Yesterday':
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'Last 7 Days':
        start.setDate(end.getDate() - 6);
        break;
      case 'This Week':
        start.setDate(start.getDate() - dayOfWeek);
        end.setDate(start.getDate() + 6);
        break;
      case 'Last Week':
        start.setDate(start.getDate() - dayOfWeek - 7);
        end.setDate(start.getDate() + 6);
        break;
      case 'This Month':
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'Last Month':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
      case 'This Year':
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
      case 'Last Year':
        start.setFullYear(start.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
    }
    return { start: toISODate(start), end: toISODate(end) };
  };

  return [
    { label: 'Today', range: getPresetRange('Today') },
    { label: 'Yesterday', range: getPresetRange('Yesterday') },
    { label: 'Last 7 Days', range: getPresetRange('Last 7 Days') },
    { label: 'This Week', range: getPresetRange('This Week') },
    { label: 'Last Week', range: getPresetRange('Last Week') },
    { label: 'This Month', range: getPresetRange('This Month') },
    { label: 'Last Month', range: getPresetRange('Last Month') },
    { label: 'This Year', range: getPresetRange('This Year') },
    { label: 'Last Year', range: getPresetRange('Last Year') },
  ];
};

const PRESETS = getPresets();
const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export function DateRangePicker({ value, onChange, className = '' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for the popover
  const [localStart, setLocalStart] = useState<string>(value?.start || '');
  const [localEnd, setLocalEnd] = useState<string>(value?.end || '');
  
  // Calendar view state (which month/year is currently being viewed)
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value?.start) return parseISODate(value.start) || new Date();
    return new Date();
  });

  // Track selection phase (0 = selecting start, 1 = selecting end)
  const [selectPhase, setSelectPhase] = useState<0 | 1>(0);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Sync incoming value to local state when opening
  useEffect(() => {
    if (isOpen) {
      setLocalStart(value?.start || '');
      setLocalEnd(value?.end || '');
      if (value?.start) {
        setViewDate(parseISODate(value.start) || new Date());
      }
      setSelectPhase(0);
    }
  }, [isOpen, value]);

  const handleApply = () => {
    onChange({ start: localStart, end: localEnd });
    setIsOpen(false);
  };

  const handleDayClick = (dateStr: string) => {
    if (selectPhase === 0) {
      setLocalStart(dateStr);
      setLocalEnd('');
      setSelectPhase(1);
    } else {
      // If selected end is before start, swap them
      if (new Date(dateStr) < new Date(localStart)) {
        setLocalEnd(localStart);
        setLocalStart(dateStr);
      } else {
        setLocalEnd(dateStr);
      }
      setSelectPhase(0);
    }
  };

  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));

  // Build calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIdx = getFirstDayOfMonth(year, month);
  
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const grid: { date: string, dayNum: number, isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  for (let i = 0; i < firstDayIdx; i++) {
    const dayNum = prevMonthDays - firstDayIdx + i + 1;
    const d = new Date(year, month - 1, dayNum);
    grid.push({ date: toISODate(d), dayNum, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    grid.push({ date: toISODate(d), dayNum: i, isCurrentMonth: true });
  }

  // Next month leading days (to fill 6 rows of 7 = 42 cells)
  const remainingCells = 42 - grid.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    grid.push({ date: toISODate(d), dayNum: i, isCurrentMonth: false });
  }

  const isSelected = (d: string) => d === localStart || d === localEnd;
  const isInRange = (d: string) => {
    if (!localStart || !localEnd) return false;
    return d > localStart && d < localEnd;
  };

  // Format the button label
  let displayLabel = 'Select Date Range';
  if (value?.start && value?.end) {
    if (value.start === value.end) {
      displayLabel = 'Select Date Range';
    } else {
      displayLabel = `${value.start.replace(/-/g, '/')} - ${value.end.replace(/-/g, '/')}`;
    }
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-medium"
      >
        <CalendarIcon size={16} className="text-gray-500" />
        <span className="text-gray-700 whitespace-nowrap">{displayLabel}</span>
        <ChevronDown size={16} className="text-gray-500 ml-2" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 shadow-xl rounded-lg flex p-4 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left scale-[0.8] md:scale-100">
          
          {/* Left Sidebar (Presets) */}
          <div className="flex flex-col gap-2 pr-4 border-r border-gray-100 min-w-[130px]">
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => {
                  setLocalStart(preset.range.start);
                  setLocalEnd(preset.range.end);
                  setViewDate(parseISODate(preset.range.start) || new Date());
                }}
                className="text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Center (Calendar) */}
          <div className="px-6 w-[320px]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <button onClick={prevMonth} className="p-1 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600">
                <ChevronLeft size={16} />
              </button>
              <div className="font-bold text-gray-800 tracking-wide text-lg">
                {MONTHS[month]} <span className="font-normal text-gray-500">{year}</span>
              </div>
              <button onClick={nextMonth} className="p-1 rounded-full border border-gray-200 hover:bg-gray-50 text-gray-600">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((day, idx) => (
                <div 
                  key={day} 
                  className={`text-center text-xs font-semibold ${idx >= 5 ? 'text-red-500' : 'text-gray-500'}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {grid.map((cell, idx) => {
                const selected = isSelected(cell.date);
                const inRange = isInRange(cell.date);
                const colIdx = idx % 7;
                const isWeekend = colIdx === 5 || colIdx === 6;

                let cellBg = '';
                if (selected) cellBg = 'bg-blue-600 text-white font-bold rounded-md';
                else if (inRange) cellBg = 'bg-blue-100 text-blue-800';
                else if (!cell.isCurrentMonth) cellBg = 'text-gray-300';
                else cellBg = 'hover:bg-gray-100 rounded-md';

                let textCol = '';
                if (!selected && cell.isCurrentMonth && isWeekend && !inRange) textCol = 'text-red-500';
                else if (!selected && cell.isCurrentMonth && !inRange) textCol = 'text-gray-800';

                return (
                  <button
                    key={idx}
                    onClick={() => handleDayClick(cell.date)}
                    className={`h-10 w-full flex items-center justify-center text-sm transition-colors ${cellBg} ${textCol}`}
                  >
                    {cell.dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar (Controls) */}
          <div className="flex flex-col gap-6 pl-6 pr-2 min-w-[140px] pt-12">
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Starts</label>
              <input 
                type="text" 
                readOnly 
                value={localStart ? localStart.replace(/-/g, '/') : ''} 
                className="px-3 py-2 bg-gray-100 border-none rounded text-sm text-gray-800 font-medium w-full focus:outline-none"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Ends</label>
              <input 
                type="text" 
                readOnly 
                value={localEnd ? localEnd.replace(/-/g, '/') : ''} 
                className="px-3 py-2 bg-gray-100 border-none rounded text-sm text-gray-800 font-medium w-full focus:outline-none"
                placeholder="YYYY/MM/DD"
              />
            </div>

            <div className="mt-auto">
              <button 
                onClick={handleApply}
                disabled={!localStart || !localEnd}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
