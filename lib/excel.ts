import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportTask {
    id: string;
    title: string;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    toleranceDate?: string | Date | null;
    priority?: string | null;
    assignees?: { name: string | null; email: string | null }[];
    columnId?: string;
    level?: number;
    progress?: number;
}


// Helper to darken a hex color
function darkenHex(hex: string, amount: number = 40): string {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');

    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);

    const toHex = (n: number) => n.toString(16).padStart(2, '0').toUpperCase();
    return toHex(r) + toHex(g) + toHex(b);
}

export const exportToExcel = async (
    tasks: ExportTask[],
    columns: { id: string; name: string; color?: string | null }[],
    projectName: string
) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cronograma');

    // Setup Columns
    worksheet.columns = [
        { header: 'Tarea', key: 'title', width: 40 },
        { header: 'Progreso', key: 'progress', width: 12 },
        { header: 'Estado', key: 'status', width: 15 },
        { header: 'Prioridad', key: 'priority', width: 12 },
        { header: 'Asignado a', key: 'assignees', width: 25 },
        { header: 'Inicio', key: 'startDate', width: 12 },
        { header: 'Fin', key: 'endDate', width: 12 },
        { header: 'Fecha Tolerancia', key: 'toleranceDate', width: 15 },
    ];

    // Calculate Timeline Range
    const dates = tasks
        .flatMap(t => [t.startDate, t.endDate, t.toleranceDate])
        .filter(Boolean)
        .map(d => new Date(d as string));

    let minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    let maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // Add padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    // Add Timeline Headers
    let currentDate = new Date(minDate);
    let colIndex = 9; // Reset to 9 because we added toleranceDate column
    const dateColMap = new Map<string, number>();

    while (currentDate <= maxDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const cell = worksheet.getCell(1, colIndex);

        cell.value = currentDate.getDate();
        cell.alignment = { horizontal: 'center' };

        // Highlight weekends
        const day = currentDate.getDay();
        const isWeekend = day === 0 || day === 6;

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isWeekend ? 'FFEFEFEF' : 'FFE0E0E0' }
        };
        cell.border = {
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };

        dateColMap.set(dateStr, colIndex);
        worksheet.getColumn(colIndex).width = 4;

        currentDate.setDate(currentDate.getDate() + 1);
        colIndex++;
    }

    // Add Data and Bars
    const columnMap = new Map(columns.map(c => [c.id, c]));

    tasks.forEach((task, index) => {
        const rowIndex = index + 2;
        const row = worksheet.getRow(rowIndex);

        const statusCol = columnMap.get(task.columnId || '');
        const statusName = statusCol?.name || 'Unknown';
        const rawColor = statusCol?.color || '#3B82F6';
        const hexColor = rawColor.replace('#', '');
        const assignees = task.assignees?.map(a => a.name || a.email).join(', ') || '';

        // Indentation for hierarchy
        const indentation = task.level ? '    '.repeat(task.level) : '';

        row.getCell('title').value = indentation + task.title;
        row.getCell('progress').value = (task.progress || 0) + '%';
        row.getCell('status').value = statusName;
        row.getCell('priority').value = task.priority;
        row.getCell('assignees').value = assignees;
        row.getCell('startDate').value = task.startDate ? new Date(task.startDate as string).toLocaleDateString() : '';
        row.getCell('endDate').value = task.endDate ? new Date(task.endDate as string).toLocaleDateString() : '';
        row.getCell('toleranceDate').value = task.toleranceDate ? new Date(task.toleranceDate as string).toLocaleDateString() : '';

        // Gantt Bar Coloring
        if (task.startDate && task.endDate) {
            const start = new Date(task.startDate as string);
            const end = new Date(task.endDate as string);
            const progress = task.progress || 0;

            // Calculate duration in days
            const durationMs = end.getTime() - start.getTime();
            const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24)) + 1;
            const completedDays = Math.round(durationDays * (progress / 100));

            let curr = new Date(start);
            let dayCounter = 0;

            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                const colIdx = dateColMap.get(dateStr);

                if (colIdx) {
                    const cell = row.getCell(colIdx);

                    // Logic for Progress Visualization
                    // Completed part = Solid color
                    // Removing part = Lighter opacity (simulated with lighter hex if possible, or pattern)
                    // ExcelJS patterns are limited. Let's use two colors.

                    const isCompleted = dayCounter < completedDays;
                    // Fully opaque for completed, semi-transparent (lighter) for remaining
                    // Actually, let's use the full color for completed, and a lighter gray/pastel version for remaining.
                    // Or keep user color for remaining and DARKER for completed?
                    // Let's use:
                    // Completed: The Status Color
                    // Remaining: A lighter version or pattern.
                    // Let's stick to simple:
                    // Completed: Status Color
                    // Remaining: 'FF' + 'E0E0E0' (Light Gray) - Simple progress bar style.
                    // WAIT, the "Status" color identifies the phase. We want to keep that.
                    // So:
                    // Completed: Solid Status Color
                    // Remaining: 30% Opacity Status Color? Excel ARGB supports alpha? No, mostly just RGB.
                    // Let's use:
                    // Completed: Solid Status Color
                    // Remaining: Pattern 'mediumGray' or just a lighter fixed color if we can't compute it easily.
                    // Let's just use a pattern for the remaining part to indicate "ToDo".

                    const argbColor = 'FF' + hexColor;

                    if (isCompleted) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: argbColor }
                        };
                    } else {
                        // Creating a "lighter" look using a pattern
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'darkGrid', // Texture to show it's not done yet
                            fgColor: { argb: argbColor },
                            bgColor: { argb: 'FFFFFFFF' }
                        };
                    }
                }
                curr.setDate(curr.getDate() + 1);
                dayCounter++;
            }
        }

        // Tolerance Date Visualization
        if (task.toleranceDate) {
            const tolDate = new Date(task.toleranceDate as string);
            const dateStr = tolDate.toISOString().split('T')[0];
            const colIdx = dateColMap.get(dateStr);

            if (colIdx) {
                const cell = row.getCell(colIdx);

                // Calculate Darker Color based on status/column color
                // We default to a standard blue if no color is provided
                const darkerHex = darkenHex(hexColor, 60);
                const darkerArgb = 'FF' + darkerHex;

                // Apply darker fill
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: darkerArgb }
                };

                // Ensure NO border is set (or reset it if previously set)
                // We keep the standard thin gray border from the grid setup
                cell.border = {
                    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                    right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
                };
            }
        }
    });

    // Final Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).border = { bottom: { style: 'medium' } };

    // Generate File
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `${projectName.replace(/\s+/g, '_')}_Gantt_Visual.xlsx`;
    saveAs(new Blob([buffer]), fileName);
};
