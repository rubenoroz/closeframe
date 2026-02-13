import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface ExportTask {
    id: string;
    title: string;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    priority?: string | null;
    assignees?: { name: string | null; email: string | null }[];
    columnId?: string;
    level?: number;
    progress?: number;
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
    ];

    // Calculate Timeline Range
    const dates = tasks
        .flatMap(t => [t.startDate, t.endDate])
        .filter(Boolean)
        .map(d => new Date(d as string));

    let minDate = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    let maxDate = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();

    // Add padding
    minDate.setDate(minDate.getDate() - 3);
    maxDate.setDate(maxDate.getDate() + 7);

    // Add Timeline Headers
    let currentDate = new Date(minDate);
    let colIndex = 8; // Reset to 8 because we added a column
    const dateColMap = new Map<string, number>();

    while (currentDate <= maxDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const cell = worksheet.getCell(1, colIndex);

        cell.value = currentDate.getDate();
        cell.alignment = { horizontal: 'center' };

        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
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
        const statusColor = statusCol?.color || '#E0E0E0';
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

        // Gantt Bar Coloring
        if (task.startDate && task.endDate) {
            const start = new Date(task.startDate as string);
            const end = new Date(task.endDate as string);

            let curr = new Date(start);
            while (curr <= end) {
                const dateStr = curr.toISOString().split('T')[0];
                const colIdx = dateColMap.get(dateStr);

                if (colIdx) {
                    const cell = row.getCell(colIdx);
                    const argbColor = 'FF' + ((statusColor || '#3B82F6').replace('#', '')); // 'FF' + hex

                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: argbColor }
                    };
                }
                curr.setDate(curr.getDate() + 1);
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
