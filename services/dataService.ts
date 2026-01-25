
import { Entry, Stats, User, SmartAlert } from '../types';

// Access jsPDF from window (CDN)
declare const window: any;

export const formatHoursToHHMM = (decimalHours: number): string => {
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  // Handle edge case where rounding minutes results in 60
  if (minutes === 60) {
      return `${(hours + 1).toString().padStart(2, '0')}:00`;
  }
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const parseHHMMToHours = (hours: number, minutes: number): number => {
  return hours + (minutes / 60);
};

export const getDaysDifference = (start: string, end: string): number => {
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays === 0 ? 1 : diffDays + 1; // Inclusive
};

export const getAutomaticLockDate = (): string => {
  const now = new Date();
  // Rule: Close previous month on the 10th.
  // Example: On Feb 5th, Jan is still Open. Lock date is Dec 31st.
  // Example: On Feb 11th, Jan is Closed. Lock date is Jan 31st.
  
  const cutoffDay = 10;
  let targetDate;

  if (now.getDate() >= cutoffDay) {
    // We are past the 10th. The previous month is fully locked.
    // Set lock date to the last day of the previous month.
    targetDate = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    // We are before the 10th. The previous month is still open for reporting.
    // The lock date is the last day of the month BEFORE the previous month.
    targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  }
  
  // Return YYYY-MM-DD
  return targetDate.toISOString().split('T')[0];
};

export const isEntryLocked = (dateStr: string, globalLockDate: string | null): boolean => {
  if (!globalLockDate) return false;
  return dateStr <= globalLockDate;
};

export const filterEntries = (
  entries: Entry[],
  userId: string | null,
  zoneId: string | null,
  startDate: string,
  endDate: string
): Entry[] => {
  return entries.filter((entry) => {
    const validUser = userId ? entry.userId === userId : true;
    const validZone = zoneId ? entry.zoneId === zoneId : true;
    const validDate = entry.date >= startDate && entry.date <= endDate;
    return validUser && validZone && validDate;
  });
};

export const calculateStats = (entries: Entry[], daysInPeriod: number): Stats => {
  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const entryCount = entries.length;
  
  return {
    totalHours: Number(totalHours.toFixed(2)),
    entryCount,
    avgHoursPerEntry: entryCount > 0 ? Number((totalHours / entryCount).toFixed(2)) : 0,
    avgHoursPerDay: daysInPeriod > 0 ? Number((totalHours / daysInPeriod).toFixed(2)) : 0,
  };
};

export const formatDateDisplay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

// --- Smart Alerts Logic ---
export const checkSmartAlerts = (entries: Entry[], users: User[]): SmartAlert[] => {
  const alerts: SmartAlert[] = [];
  const entriesByUser: Record<string, Entry[]> = {};

  entries.forEach(e => {
    if (!entriesByUser[e.userId]) entriesByUser[e.userId] = [];
    entriesByUser[e.userId].push(e);
  });

  Object.entries(entriesByUser).forEach(([userId, userEntries]) => {
    // 1. High Hours No Notes
    const suspiciousHighHours = userEntries.filter(e => e.hours >= 4 && (!e.notes || e.notes.length < 5));
    if (suspiciousHighHours.length > 0) {
      alerts.push({
        id: `high_hours_${userId}`,
        type: 'high_hours_no_note',
        userId,
        severity: 'high',
        message: `${suspiciousHighHours.length} registros com horas altas (>04:00) sem observação adequada.`,
        count: suspiciousHighHours.length
      });
    }

    // 2. Frequent Edits
    const editedEntries = userEntries.filter(e => e.editCount > 2);
    if (editedEntries.length > 0) {
      alerts.push({
        id: `freq_edits_${userId}`,
        type: 'frequent_edits',
        userId,
        severity: 'medium',
        message: `${editedEntries.length} registros editados mais de 2 vezes.`,
        count: editedEntries.length
      });
    }

    // 3. Last Minute Bulk (Created on same day, many entries for past dates)
    const createdMap: Record<string, number> = {};
    userEntries.forEach(e => {
      const createdDate = e.createdAt.split('T')[0];
      // If created date is significantly after entry date (e.g., > 2 days)
      const entryDateObj = new Date(e.date);
      const createdDateObj = new Date(createdDate);
      const diffTime = createdDateObj.getTime() - entryDateObj.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays > 3) {
          createdMap[createdDate] = (createdMap[createdDate] || 0) + 1;
      }
    });

    Object.entries(createdMap).forEach(([cDate, count]) => {
      if (count >= 5) {
        alerts.push({
          id: `bulk_${userId}_${cDate}`,
          type: 'last_minute_bulk',
          userId,
          severity: 'medium',
          message: `Acúmulo de lançamentos: ${count} registros antigos lançados no dia ${formatDateDisplay(cDate)}.`,
          count
        });
      }
    });
  });

  return alerts;
};

// --- PDF Generation Logic ---
export const generatePDF = (type: 'executive' | 'detailed', entries: Entry[], users: User[], zoneName: string, period: {start: string, end: string}) => {
  if (!window.jspdf) {
    alert("Erro: Biblioteca PDF não carregada. Tente recarregar a página.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const displayPeriod = `${formatDateDisplay(period.start)} a ${formatDateDisplay(period.end)}`;

  // Header Helper
  const drawHeader = () => {
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("Horas de Tradução", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Relatório ${type === 'executive' ? 'Executivo' : 'Detalhado'}`, 14, 26);
    doc.text(`Zona: ${zoneName}`, 14, 31);
    doc.text(`Período: ${displayPeriod}`, 14, 36);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 41);

    // Watermark
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(60);
    doc.text("USO INTERNO", 30, 150, { angle: 45 });
  };

  drawHeader();

  // Summary Section
  doc.setDrawColor(200);
  doc.line(14, 45, 196, 45);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Resumo Geral", 14, 55);

  const stats = [
    ['Total de Horas', `${formatHoursToHHMM(totalHours)}`],
    ['Total de Registros', `${entries.length}`],
    ['Instrutores Ativos', `${new Set(entries.map(e => e.userId)).size}`]
  ];

  doc.autoTable({
    startY: 60,
    head: [['Métrica', 'Valor']],
    body: stats,
    theme: 'plain',
    styles: { fontSize: 12 },
    headStyles: { fillColor: [240, 240, 240] }
  });

  if (type === 'detailed') {
    doc.addPage();
    drawHeader();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detalhamento por Registro", 14, 55);

    const tableData = entries.map(e => {
        const user = users.find(u => u.id === e.userId);
        return [
            formatDateDisplay(e.date),
            user?.name || 'N/A',
            e.designation,
            e.languages.join('/'),
            formatHoursToHHMM(e.hours),
            e.notes || '-'
        ];
    });

    doc.autoTable({
        startY: 60,
        head: [['Data', 'Instrutor', 'Tarefa', 'Langs', 'Hrs', 'Obs']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255 },
        styles: { fontSize: 8 },
        columnStyles: {
            5: { cellWidth: 50 } // Notes column width
        }
    });
  } else {
    // Executive: Group by Person
    const byUser: Record<string, number> = {};
    entries.forEach(e => {
        byUser[e.userId] = (byUser[e.userId] || 0) + e.hours;
    });

    const userTableData = Object.entries(byUser).map(([uid, hours]) => {
        const user = users.find(u => u.id === uid);
        return [user?.name || 'N/A', formatHoursToHHMM(hours), user?.subgroup || '-'];
    }).sort((a,b) => parseFloat(b[1]) - parseFloat(a[1])); // Sort by hours string not perfect but acceptable or sort before formatting

    // Correct sorting by numeric value
    const sortedUserTableData = Object.entries(byUser)
        .sort((a, b) => b[1] - a[1])
        .map(([uid, hours]) => {
            const user = users.find(u => u.id === uid);
            return [user?.name || 'N/A', formatHoursToHHMM(hours), user?.subgroup || '-'];
        });


    doc.text("Horas por Instrutor", 14, doc.lastAutoTable.finalY + 15);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Nome', 'Total Horas']],
        body: sortedUserTableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });
  }

  // Footer Pagination
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: 'right' });
  }

  doc.save(`Relatorio_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCSV = (entries: Entry[], users: any[]): string => {
  const headers = ['Data', 'Nome', 'Designação', 'Idiomas', 'Horas', 'Status', 'Obs', 'Link'];
  
  const rows = entries.map(e => {
    const user = users.find(u => u.id === e.userId);
    return [
      e.date,
      user?.name || 'Unknown',
      e.designation,
      e.languages.join('/'),
      formatHoursToHHMM(e.hours),
      e.status,
      `"${e.notes || ''}"`,
      e.link || ''
    ].join(';');
  });

  return [headers.join(';'), ...rows].join('\n');
};

export const downloadCSV = (content: string, fileName: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
