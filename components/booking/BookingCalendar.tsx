"use client";

import { useState, useCallback, useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views, SlotInfo } from "react-big-calendar";
import withDragAndDrop, { EventInteractionArgs } from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: string;
  status?: string;
  isExternal?: boolean;
  provider?: string;
  accountName?: string;
}

const DnDCalendar = withDragAndDrop<BookingEvent>(Calendar);

interface Props {
  events: BookingEvent[];
  onEventAdd?: (event: { start: Date; end: Date }) => void;
  onEventDrop?: (event: BookingEvent, start: Date, end: Date) => void;
  onEventSelect?: (event: BookingEvent) => void;
}

export default function BookingCalendar({ events, onEventAdd, onEventDrop, onEventSelect }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Default to day view on mobile for better UX
  const [currentView, setCurrentView] = useState<(typeof Views)[keyof typeof Views]>(
    typeof window !== 'undefined' && window.innerWidth < 768 ? Views.DAY : Views.WEEK
  );

  const handleSelectSlot = useCallback(
    (slotInfo: SlotInfo) => {
      if (onEventAdd) {
        onEventAdd({ start: slotInfo.start, end: slotInfo.end });
      }
    },
    [onEventAdd]
  );

  const handleEventDrop = useCallback(
    (args: EventInteractionArgs<BookingEvent>) => {
      if (onEventDrop && args.event && args.start && args.end) {
        onEventDrop(args.event, new Date(args.start), new Date(args.end));
      }
    },
    [onEventDrop]
  );

  const handleSelectEvent = useCallback(
    (event: BookingEvent) => {
      if (onEventSelect) {
        onEventSelect(event);
      }
    },
    [onEventSelect]
  );

  const eventStyleGetter = useCallback((event: BookingEvent) => {
    let backgroundColor = "#059669"; // green for confirmed

    if (event.isExternal) {
      return {
        style: {
          backgroundColor: event.provider === 'google_calendar' ? '#DB4437' : '#0078D4', // Google Red or Outlook Blue
          borderRadius: "6px",
          border: "none",
          color: "white",
          fontSize: "12px",
          padding: "2px 6px",
          opacity: 0.8,
          borderLeft: "3px solid white"
        }
      };
    }

    if (event.status === "pending") backgroundColor = "#f59e0b"; // yellow
    if (event.status === "cancelled") backgroundColor = "#6b7280"; // gray

    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        border: "none",
        color: "white",
        fontSize: "12px",
        padding: "2px 6px",
      },
    };
  }, []);

  const { defaultDate, formats } = useMemo(
    () => ({
      defaultDate: new Date(),
      formats: {
        dayFormat: (date: Date, culture: any, localizer: any) =>
          localizer.format(date, "dd EEE", culture),
        weekdayFormat: (date: Date, culture: any, localizer: any) =>
          localizer.format(date, "EEEE", culture),
        monthHeaderFormat: (date: Date, culture: any, localizer: any) =>
          localizer.format(date, "MMMM yyyy", culture),
      }
    }),
    []
  );

  return (
    <div className="h-[500px] md:h-[600px] lg:h-[700px] bg-neutral-900 rounded-xl md:rounded-2xl p-2 md:p-4 border border-neutral-800">
      <DnDCalendar
        localizer={localizer}
        events={events}
        defaultDate={defaultDate}
        date={currentDate}
        onNavigate={(date: Date) => setCurrentDate(date)}
        view={currentView}
        onView={(view: (typeof Views)[keyof typeof Views]) => setCurrentView(view)}
        views={['month', 'week', 'day', 'agenda']}
        selectable
        resizable
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        culture="es"
        formats={formats}
        style={{ height: "100%" }}
        messages={{
          today: "Hoy",
          previous: "<",
          next: ">",
          month: "Mes",
          week: "Sem",
          day: "Día",
          agenda: "Lista",
          noEventsInRange: "No hay reservas",
        }}
        className="booking-calendar"
      />
      <style jsx global>{`
        .booking-calendar .rbc-toolbar {
          margin-bottom: 0.5rem;
          color: #fff;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .booking-calendar .rbc-toolbar-label {
          font-size: 14px;
          font-weight: 500;
          order: -1;
          width: 100%;
          text-align: center;
          margin-bottom: 0.5rem;
        }
        @media (min-width: 768px) {
          .booking-calendar .rbc-toolbar {
            margin-bottom: 1rem;
            flex-wrap: nowrap;
          }
          .booking-calendar .rbc-toolbar-label {
            font-size: 16px;
            order: 0;
            width: auto;
            margin-bottom: 0;
          }
        }
        .booking-calendar .rbc-toolbar button {
          color: #a3a3a3;
          border-color: #525252;
          background: transparent;
          padding: 4px 8px;
          font-size: 11px;
        }
        @media (min-width: 768px) {
          .booking-calendar .rbc-toolbar button {
            padding: 6px 12px;
            font-size: 13px;
          }
        }
        .booking-calendar .rbc-toolbar button:hover {
          background: #262626;
          color: #fff;
        }
        .booking-calendar .rbc-toolbar button.rbc-active {
          background: #fff;
          color: #000;
        }
        .booking-calendar .rbc-header {
          color: #a3a3a3;
          border-color: #404040;
          padding: 4px 0;
          font-size: 10px;
        }
        @media (min-width: 768px) {
          .booking-calendar .rbc-header {
            padding: 8px 0;
            font-size: 12px;
          }
        }
        .booking-calendar .rbc-month-view,
        .booking-calendar .rbc-time-view,
        .booking-calendar .rbc-agenda-view {
          border-color: #404040;
        }
        .booking-calendar .rbc-day-bg {
          background: #171717;
        }
        .booking-calendar .rbc-off-range-bg {
          background: #0a0a0a;
        }
        .booking-calendar .rbc-today {
          background: rgba(16, 185, 129, 0.1);
        }
        .booking-calendar .rbc-date-cell {
          color: #d4d4d4;
          padding: 4px 8px;
        }
        .booking-calendar .rbc-date-cell.rbc-off-range {
          color: #525252;
        }
        .booking-calendar .rbc-month-row,
        .booking-calendar .rbc-day-slot .rbc-time-slot {
          border-color: #404040;
        }
        .booking-calendar .rbc-timeslot-group {
          border-color: #404040;
        }
        .booking-calendar .rbc-time-content {
          border-color: #404040;
        }
        .booking-calendar .rbc-time-header-content {
          border-color: #404040;
        }
        .booking-calendar .rbc-time-gutter {
          color: #a3a3a3;
        }
      `}</style>
    </div>
  );
}
