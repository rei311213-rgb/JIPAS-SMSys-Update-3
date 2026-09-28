import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, TermReport, StudentBill, PaymentRecord } from '../types';
import { getStoredReports } from './storageService';

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: any;
  }
}

export interface SchoolPerformanceSummaryOptions {
  term?: string;
  academicYear?: string;
  title?: string;
  campus?: string;
}

import { printBlob } from '../utils/printUtils';

export class PDFGeneratorService {
  private static readonly SCHOOL_NAME = 'JOY INTERNATIONAL SCHOOL (JIPAS)';
  private static readonly SCHOOL_ADDRESS = '01 BP. 2364 • Kpéhénou N°1 Behind T-Oil Feeling Station, and Hedzranawoe 4th Corner after Radio Maria, Lomé — Togo';
  private static readonly SCHOOL_COLOR: [number, number, number] = [79, 70, 229]; // Indigo-600

  private static addHeader(doc: jsPDF, title: string) {
    // Background accent
    doc.setFillColor(249, 250, 251);
    doc.rect(0, 0, 210, 40, 'F');

    // School Name
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(this.SCHOOL_NAME, 105, 15, { align: 'center' });

    // Address
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(this.SCHOOL_ADDRESS, 105, 22, { align: 'center' });

    // Document Title
    doc.setDrawColor(this.SCHOOL_COLOR[0], this.SCHOOL_COLOR[1], this.SCHOOL_COLOR[2]);
    doc.setLineWidth(0.5);
    doc.line(20, 30, 190, 30);
    
    doc.setTextColor(this.SCHOOL_COLOR[0], this.SCHOOL_COLOR[1], this.SCHOOL_COLOR[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 105, 38, { align: 'center' });
  }

  /**
   * Generates a downloadable PDF summary of total school performance metrics (average score per class).
   */
  static async generateSchoolPerformanceSummary(
    reports?: TermReport[],
    options?: SchoolPerformanceSummaryOptions
  ) {
    let sourceReports = reports && reports.length > 0 ? reports : getStoredReports();

    if (options?.term) {
      const termFiltered = sourceReports.filter(r => r.term === options.term);
      if (termFiltered.length > 0) sourceReports = termFiltered;
    }

    if (options?.academicYear) {
      const yearFiltered = sourceReports.filter(r => r.academicYear === options.academicYear);
      if (yearFiltered.length > 0) sourceReports = yearFiltered;
    }

    // Group by className
    const classMap: Record<string, TermReport[]> = {};
    sourceReports.forEach(r => {
      const cName = r.className || 'General';
      if (!classMap[cName]) classMap[cName] = [];
      classMap[cName].push(r);
    });

    const classSummaries = Object.keys(classMap).map(className => {
      const classReports = classMap[className];
      const count = classReports.length;
      
      let totalSum = 0;
      let highest = -1;
      let lowest = 101;
      let topStudentName = 'N/A';
      let passCount = 0;

      classReports.forEach(rep => {
        const avg = rep.averageScore ?? (rep.totalScore ? rep.totalScore / (rep.scores?.length || 4) : 0);
        totalSum += avg;
        if (avg > highest) {
          highest = avg;
          topStudentName = rep.studentName || 'N/A';
        }
        if (avg < lowest) {
          lowest = avg;
        }
        if (avg >= 50) {
          passCount++;
        }
      });

      if (lowest === 101) lowest = 0;
      if (highest === -1) highest = 0;

      const classAvg = count > 0 ? totalSum / count : 0;
      const passRate = count > 0 ? (passCount / count) * 100 : 0;

      return {
        className,
        studentCount: count,
        classAverage: classAvg,
        highestScore: highest,
        lowestScore: lowest,
        passRate,
        topStudentName
      };
    }).sort((a, b) => b.classAverage - a.classAverage);

    // School total metrics
    const totalStudents = sourceReports.length;
    const totalClasses = classSummaries.length;
    const overallScoreSum = classSummaries.reduce((sum, c) => sum + (c.classAverage * c.studentCount), 0);
    const overallAverage = totalStudents > 0 ? overallScoreSum / totalStudents : 0;
    
    const totalPassedStudents = sourceReports.filter(r => {
      const avg = r.averageScore ?? (r.totalScore ? r.totalScore / (r.scores?.length || 4) : 0);
      return avg >= 50;
    }).length;
    const overallPassRate = totalStudents > 0 ? (totalPassedStudents / totalStudents) * 100 : 0;

    const topClass = classSummaries[0] ? classSummaries[0].className : 'N/A';

    const doc = new jsPDF();
    
    // Header
    this.addHeader(doc, options?.title || 'School Performance & Class Metrics Summary');

    // Term / Scope Banner
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 45, 180, 14, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const termLabel = `PERIOD: ${options?.term || 'Current Term'} (${options?.academicYear || '2025/2026'})`;
    const campusLabel = options?.campus ? ` | CAMPUS: ${options.campus}` : '';
    const dateStr = `Date Generated: ${new Date().toLocaleDateString('en-GB')}`;
    
    doc.text(`${termLabel}${campusLabel}`, 20, 53);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, 185, 53, { align: 'right' });

    // KPI Summary Metrics Block
    const startY = 65;

    // Stat Box 1: Overall Average
    doc.setFillColor(79, 70, 229); // Indigo
    doc.rect(15, startY, 42, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('SCHOOL AVERAGE', 36, startY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${overallAverage.toFixed(1)}%`, 36, startY + 16, { align: 'center' });

    // Stat Box 2: Total Assessed
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(61, startY, 42, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('STUDENTS ASSESSED', 82, startY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${totalStudents}`, 82, startY + 16, { align: 'center' });

    // Stat Box 3: Pass Rate
    doc.setFillColor(245, 158, 11); // Amber
    doc.rect(107, startY, 42, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('OVERALL PASS RATE', 128, startY + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${overallPassRate.toFixed(1)}%`, 128, startY + 16, { align: 'center' });

    // Stat Box 4: Top Performing Class
    doc.setFillColor(139, 92, 246); // Purple
    doc.rect(153, startY, 42, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('TOP CLASS', 174, startY + 6, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${topClass}`, 174, startY + 16, { align: 'center' });

    // Section Header
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CLASS-BY-CLASS PERFORMANCE BREAKDOWN', 15, startY + 32);

    // AutoTable for Class Metrics
    const tableBody: any[] = classSummaries.map((c, index) => [
      (index + 1).toString(),
      c.className,
      c.studentCount.toString(),
      `${c.classAverage.toFixed(1)}%`,
      `${c.highestScore.toFixed(1)}%`,
      `${c.lowestScore.toFixed(1)}%`,
      `${c.passRate.toFixed(1)}%`,
      c.topStudentName
    ]);

    // Footer summary row
    tableBody.push([
      '--',
      'INSTITUTIONAL TOTAL / AVG',
      totalStudents.toString(),
      `${overallAverage.toFixed(1)}%`,
      '--',
      '--',
      `${overallPassRate.toFixed(1)}%`,
      `Top: ${topClass}`
    ]);

    autoTable(doc, {
      startY: startY + 36,
      head: [['#', 'Class Name', 'Enrolled', 'Class Avg', 'Highest', 'Lowest', 'Pass Rate', 'Top Student']],
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: this.SCHOOL_COLOR, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' },
        7: { cellWidth: 34 }
      },
      didParseCell: (data: any) => {
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [238, 242, 255];
          data.cell.styles.textColor = [79, 70, 229];
        }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 180;

    // Additional Highlights & Executive Notes
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text('EXECUTIVE OBSERVATIONS & AUDIT NOTES:', 15, finalY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);

    const notes = [
      `1. Evaluated academic records across ${totalClasses} active classes with a combined institutional mean of ${overallAverage.toFixed(1)}%.`,
      `2. Highest class performance recorded by ${topClass} (${classSummaries[0]?.classAverage.toFixed(1) || '0'}% average).`,
      `3. Minimum pass rate benchmark (50%) achieved by ${overallPassRate.toFixed(1)}% of all registered students.`
    ];

    let noteY = finalY + 18;
    notes.forEach(note => {
      doc.text(note, 15, noteY);
      noteY += 6;
    });

    // Authorization & Sign-off Section
    const signY = Math.min(noteY + 12, 250);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);

    // Column 1: Headmaster / Director
    doc.text('APPROVED BY HEADMASTER:', 15, signY);
    doc.line(15, signY + 12, 85, signY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Signature & Date', 15, signY + 16);

    // Column 2: Examinations Officer
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EXAMINATIONS CONTROLLER:', 115, signY);
    doc.line(115, signY + 12, 185, signY + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Signature & Date', 115, signY + 16);

    // Stamp box
    doc.setDrawColor(209, 213, 219);
    doc.rect(88, signY - 2, 22, 22);
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text('OFFICIAL', 99, signY + 8, { align: 'center' });
    doc.text('SEAL', 99, signY + 13, { align: 'center' });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`JIPAS School Management System — Confidential Academic Performance Summary`, 105, 285, { align: 'center' });

    // Download / Save file
    const safeYear = (options?.academicYear || '2025-2026').replace(/[/\\ ]/g, '_');
    const safeTerm = (options?.term || 'Term_3').replace(/[/\\ ]/g, '_');
    doc.save(`JIPAS_School_Performance_Summary_${safeTerm}_${safeYear}.pdf`);
  }

  static async generateTerminalReport(report: TermReport) {
    const doc = new jsPDF();
    this.addHeader(doc, 'Terminal Academic Report');

    // Student Info Section
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    doc.text(`Student Name: ${report.studentName}`, 20, 50);
    doc.text(`Admission No: ${report.admissionNo}`, 20, 56);
    doc.text(`Class: ${report.className}`, 20, 62);
    
    doc.text(`Academic Year: ${report.academicYear}`, 130, 50);
    doc.text(`Term: ${report.term}`, 130, 56);
    doc.text(`Position: ${report.position}`, 130, 62);

    // Scores Table
    autoTable(doc, {
      startY: 70,
      head: [['Subject', 'Class Score (30%)', 'Exam Score (70%)', 'Total (100%)', 'Grade', 'Remark']],
      body: report.scores.map(s => [s.subject, s.classScore, s.examScore, s.total, s.grade, s.remark]),
      theme: 'striped',
      headStyles: { fillColor: this.SCHOOL_COLOR },
      alternateRowStyles: { fillColor: [243, 244, 246] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Summary Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PERFORMANCE SUMMARY', 20, finalY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Score: ${report.totalScore ?? 0}`, 20, finalY + 22);
    doc.text(`Average Score: ${(report.averageScore ?? 0).toFixed(2)}%`, 20, finalY + 28);
    doc.text(`Attendance: ${report.attendancePresent ?? 0}/${report.attendanceTotal ?? 0} days`, 20, finalY + 34);

    // Comments Section
    doc.setFont('helvetica', 'bold');
    doc.text('TEACHER\'S COMMENT:', 20, finalY + 45);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(report.teacherComment || 'No comment provided.', 170), 20, finalY + 50);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('HEADMASTER\'S COMMENT:', 20, finalY + 65);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(report.headmasterComment || 'Keep up the good work.', 170), 20, finalY + 70);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.warn('[PDFGeneratorService] Direct print for report failed, falling back to download:', err);
      doc.save(`${report.admissionNo}_Terminal_Report.pdf`);
    }
  }

  static async generateFeeReceipt(payment: PaymentRecord, student: Student) {
    const doc = new jsPDF();
    this.addHeader(doc, 'Official Payment Receipt');

    // Receipt Metadata
    doc.setTextColor(55, 65, 81);
    doc.setFontSize(10);
    doc.text(`Receipt No: ${payment.id}`, 20, 50);
    doc.text(`Date: ${payment.date}`, 140, 50);

    // Bill To
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIVED FROM:', 20, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${student.fullName}`, 20, 72);
    doc.text(`Admission No: ${student.admissionNo}`, 20, 78);
    doc.text(`Class: ${student.className}`, 20, 84);

    const paidAmount = Number(payment.paid ?? (payment as any).amount ?? 0);

    // Payment Details Table
    autoTable(doc, {
      startY: 95,
      head: [['Description', 'Payment Mode', 'Reference', 'Amount Paid (CFA)']],
      body: [[
        payment.description || 'School Fees Payment',
        payment.method || (payment as any).paymentMethod || 'Cash',
        payment.referenceNo || (payment as any).transactionId || 'N/A',
        (paidAmount ?? 0).toFixed(2)
      ]],
      theme: 'grid',
      headStyles: { fillColor: this.SCHOOL_COLOR },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 130;

    // Totals
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL PAID: CFA ${(paidAmount ?? 0).toFixed(2)}`, 190, finalY + 15, { align: 'right' });

    // Authorization
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Authorized Signature:', 20, finalY + 40);
    doc.line(60, finalY + 40, 110, finalY + 40);
    
    doc.setDrawColor(200, 200, 200);
    doc.rect(140, finalY + 30, 40, 40); // Placeholder for official stamp
    doc.setFontSize(8);
    doc.text('OFFICIAL STAMP', 160, finalY + 52, { align: 'center' });

    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.warn('[PDFGeneratorService] Direct print failed, falling back to download:', err);
      doc.save(`Receipt_${payment.id}.pdf`);
    }
  }
}

export async function generateSchoolPerformanceSummary(
  reports?: TermReport[],
  options?: SchoolPerformanceSummaryOptions
) {
  return PDFGeneratorService.generateSchoolPerformanceSummary(reports, options);
}
