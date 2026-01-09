"use client";

import React, { useState, useCallback, useMemo } from "react";
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
  notes?: string;
  status?: string;
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
  const [currentView, setCurrentView] = useState<(typeof Views)[keyof typeof Views]>(Views.WEEK);

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
    <div className="h-[700px] bg-neutral-900 rounded-2xl p-4 border border-neutral-800">
      <DnDCalendar
        localizer={localizer}
        events={events}
        defaultDate={defaultDate}
        date={currentDate}
        onNavigate={(date: Date) => setCurrentDate(date)}
        view={currentView}
        onView={(view: (typeof Views)[keyof typeof Views]) => setCurrentView(view)}
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
          previous: "Anterior",
          next: "Siguiente",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
          noEventsInRange: "No hay reservas en este período",
        }}
        className="booking-calendar"
      />
      <style jsx global>{`
        .booking-calendar .rbc-toolbar {
          margin-bottom: 1rem;
          color: #fff;
        }
        .booking-calendar .rbc-toolbar button {
          color: #a3a3a3;
          border-color: #525252;
          background: transparent;
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
          padding: 8px 0;
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
