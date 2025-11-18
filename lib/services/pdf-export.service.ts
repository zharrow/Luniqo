/**
 * PDF Export Service
 * Generates PDF reports for cleaning sessions
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface SessionExportData {
  id: string
  date: string
  status: string
  completed_tasks: number
  total_tasks: number
  completion_percentage: number
  logs: Array<{
    room_name: string
    task_name: string
    task_description?: string
    status: string
    performed_by?: string
    performed_at?: string
    note?: string
  }>
  enterprise_name: string
}

export class PDFExportService {
  /**
   * Export a cleaning session to PDF
   */
  exportSession(data: SessionExportData): void {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Rapport de Session de Nettoyage', 14, 20)

    // Enterprise name
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(data.enterprise_name, 14, 28)

    // Date
    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    doc.setFontSize(10)
    doc.text(`Date: ${formattedDate}`, 14, 35)

    // Status and Progress
    doc.text(`Statut: ${this.getStatusLabel(data.status)}`, 14, 42)
    doc.text(`Progression: ${data.completed_tasks} / ${data.total_tasks} tâches (${data.completion_percentage}%)`, 14, 49)

    // Line separator
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 52, 196, 52)

    // Logs table
    if (data.logs.length > 0) {
      const tableData = data.logs.map(log => [
        log.room_name,
        log.task_name,
        this.getLogStatusLabel(log.status),
        log.performed_by || '-',
        log.performed_at ? new Date(log.performed_at).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        }) : '-',
        log.note || '-'
      ])

      autoTable(doc, {
        startY: 58,
        head: [['Pièce', 'Tâche', 'Statut', 'Effectué par', 'Heure', 'Note']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229], // primary-600
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 35 },
          2: { cellWidth: 20 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 },
          5: { cellWidth: 45 }
        },
        margin: { left: 14, right: 14 }
      })

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || 58
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Généré le ${new Date().toLocaleString('fr-FR')}`,
        14,
        finalY + 10
      )
    } else {
      doc.setFontSize(10)
      doc.text('Aucune tâche enregistrée pour cette session', 14, 65)
    }

    // Save PDF
    const fileName = `session-${data.date}-${Date.now()}.pdf`
    doc.save(fileName)
  }

  /**
   * Export multiple sessions summary
   */
  exportSummary(
    sessions: Array<{
      date: string
      status: string
      completed_tasks: number
      total_tasks: number
      completion_percentage: number
    }>,
    startDate: string,
    endDate: string,
    enterpriseName: string
  ): void {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Rapport Récapitulatif', 14, 20)

    // Enterprise and period
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(enterpriseName, 14, 28)

    doc.setFontSize(10)
    const start = new Date(startDate).toLocaleDateString('fr-FR')
    const end = new Date(endDate).toLocaleDateString('fr-FR')
    doc.text(`Période: du ${start} au ${end}`, 14, 35)

    // Statistics
    const totalSessions = sessions.length
    const completedSessions = sessions.filter(s => s.status === 'COMPLETEE').length
    const avgCompletion = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.completion_percentage, 0) / sessions.length)
      : 0

    doc.text(`Nombre de sessions: ${totalSessions}`, 14, 42)
    doc.text(`Sessions complétées: ${completedSessions} (${Math.round((completedSessions / totalSessions) * 100)}%)`, 14, 49)
    doc.text(`Taux de complétion moyen: ${avgCompletion}%`, 14, 56)

    // Line separator
    doc.setDrawColor(200, 200, 200)
    doc.line(14, 60, 196, 60)

    // Sessions table
    if (sessions.length > 0) {
      const tableData = sessions.map(session => [
        new Date(session.date).toLocaleDateString('fr-FR'),
        this.getStatusLabel(session.status),
        `${session.completed_tasks} / ${session.total_tasks}`,
        `${session.completion_percentage}%`
      ])

      autoTable(doc, {
        startY: 66,
        head: [['Date', 'Statut', 'Tâches', 'Complétion']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40 },
          2: { cellWidth: 40 },
          3: { cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      })

      // Footer
      const finalY = (doc as any).lastAutoTable.finalY || 66
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Généré le ${new Date().toLocaleString('fr-FR')}`,
        14,
        finalY + 10
      )
    }

    // Save PDF
    const fileName = `rapport-${startDate}-${endDate}-${Date.now()}.pdf`
    doc.save(fileName)
  }

  private getStatusLabel(status: string): string {
    switch (status) {
      case 'COMPLETEE': return 'Complétée'
      case 'EN_COURS': return 'En cours'
      case 'INCOMPLETE': return 'Incomplète'
      default: return status
    }
  }

  private getLogStatusLabel(status: string): string {
    switch (status) {
      case 'FAIT': return 'Fait'
      case 'PARTIEL': return 'Partiel'
      case 'REPORTE': return 'Reporté'
      case 'IMPOSSIBLE': return 'Impossible'
      default: return status
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService()
