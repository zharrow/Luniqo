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
    photo_urls?: string[]
  }>
  enterprise_name: string
  signature?: string // Base64 signature image
}

export class PDFExportService {
  /**
   * Export a cleaning session to PDF with photos and signature
   */
  async exportSession(data: SessionExportData): Promise<void> {
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

    let currentY = 58

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
        log.note || '-',
        log.photo_urls && log.photo_urls.length > 0 ? `${log.photo_urls.length} photo(s)` : '-'
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['Pièce', 'Tâche', 'Statut', 'Effectué par', 'Heure', 'Note', 'Photos']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [90, 157, 201], // primary pastel blue
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 18 },
          3: { cellWidth: 28 },
          4: { cellWidth: 15 },
          5: { cellWidth: 40 },
          6: { cellWidth: 18 }
        },
        margin: { left: 14, right: 14 }
      })

      currentY = (doc as any).lastAutoTable.finalY || currentY

      // Add photos section if any log has photos
      const logsWithPhotos = data.logs.filter(log => log.photo_urls && log.photo_urls.length > 0)
      if (logsWithPhotos.length > 0) {
        // Add new page for photos
        doc.addPage()
        currentY = 20

        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('Photos des tâches', 14, currentY)
        currentY += 10

        for (const log of logsWithPhotos) {
          if (!log.photo_urls) continue

          // Check if we need a new page
          if (currentY > 250) {
            doc.addPage()
            currentY = 20
          }

          // Log title
          doc.setFontSize(12)
          doc.setFont('helvetica', 'bold')
          doc.text(`${log.room_name} - ${log.task_name}`, 14, currentY)
          currentY += 8

          // Try to load and add photos
          const maxPhotosPerRow = 2
          const photoWidth = 80
          const photoHeight = 60
          const photoSpacing = 10

          for (let i = 0; i < Math.min(log.photo_urls.length, 4); i++) {
            try {
              const photoUrl = log.photo_urls[i]
              const xPos = 14 + (i % maxPhotosPerRow) * (photoWidth + photoSpacing)
              const yPos = currentY + Math.floor(i / maxPhotosPerRow) * (photoHeight + photoSpacing)

              // Add photo placeholder with URL reference
              doc.setFillColor(240, 240, 240)
              doc.rect(xPos, yPos, photoWidth, photoHeight, 'F')
              doc.setFontSize(8)
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(100, 100, 100)
              doc.text('Photo disponible', xPos + photoWidth / 2, yPos + photoHeight / 2, { align: 'center' })
              doc.text(`en ligne`, xPos + photoWidth / 2, yPos + photoHeight / 2 + 5, { align: 'center' })
              doc.setTextColor(0, 0, 0)
            } catch (error) {
              console.warn('Could not load photo:', error)
            }
          }

          currentY += Math.ceil(Math.min(log.photo_urls.length, 4) / maxPhotosPerRow) * (photoHeight + photoSpacing) + 15
        }
      }

      // Add signature if provided
      if (data.signature) {
        // Check if we need a new page
        if (currentY > 220 || logsWithPhotos.length > 0) {
          doc.addPage()
          currentY = 20
        } else {
          currentY += 20
        }

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Signature du responsable', 14, currentY)
        currentY += 10

        try {
          // Add signature image
          doc.addImage(data.signature, 'PNG', 14, currentY, 60, 30)
          currentY += 35
        } catch (error) {
          console.warn('Could not add signature:', error)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'italic')
          doc.text('(Signature disponible dans la version numérique)', 14, currentY)
          currentY += 10
        }

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Signé le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, currentY)
      }

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.text(
          `Généré le ${new Date().toLocaleString('fr-FR')} - Page ${i}/${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        )
      }
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

  // ============================================================================
  // HACCP EXPORT
  // ============================================================================

  /**
   * Export HACCP traceability report for audits
   * Includes: meals, temperatures, non-compliances, equipment
   */
  async exportHACCP(data: {
    enterpriseName: string
    startDate: string
    endDate: string
    meals?: Array<{
      date: string
      type: string
      menu: string | null
      allergens: string | null
      validated: boolean
    }>
    temperatures?: Array<{
      date: string
      checkpoint: string
      value: number
      compliant: boolean
      notes: string | null
    }>
    nonCompliances?: Array<{
      date: string
      type: string
      description: string
      status: string
      correctiveAction: string | null
    }>
    equipment?: Array<{
      name: string
      category: string | null
      lastMaintenance: string | null
      nextMaintenance: string | null
    }>
  }): Promise<void> {
    const doc = new jsPDF()
    let currentY = 20

    // ========== HEADER ==========
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Rapport de Traçabilité HACCP', 14, currentY)
    currentY += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(data.enterpriseName, 14, currentY)
    currentY += 8

    doc.setFontSize(10)
    const startDate = new Date(data.startDate).toLocaleDateString('fr-FR')
    const endDate = new Date(data.endDate).toLocaleDateString('fr-FR')
    doc.text(`Période: du ${startDate} au ${endDate}`, 14, currentY)
    currentY += 10

    doc.setDrawColor(200, 200, 200)
    doc.line(14, currentY, 196, currentY)
    currentY += 10

    // ========== MEALS ==========
    if (data.meals && data.meals.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('1. Planning des Repas', 14, currentY)
      currentY += 8

      const mealsData = data.meals.map(meal => [
        new Date(meal.date).toLocaleDateString('fr-FR'),
        this.getMealTypeLabel(meal.type),
        meal.menu || '-',
        meal.allergens || 'Aucun',
        meal.validated ? 'Oui' : 'Non'
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Type', 'Menu', 'Allergènes', 'Validé']],
        body: mealsData,
        theme: 'striped',
        headStyles: {
          fillColor: [181, 234, 215], // success pastel mint
          textColor: [41, 98, 83],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 60 },
          3: { cellWidth: 40 },
          4: { cellWidth: 20 }
        },
        margin: { left: 14, right: 14 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // ========== TEMPERATURES ==========
    if (data.temperatures && data.temperatures.length > 0) {
      // Check if we need a new page
      if (currentY > 200) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('2. Contrôle des Températures', 14, currentY)
      currentY += 8

      const tempData = data.temperatures.map(temp => [
        new Date(temp.date).toLocaleDateString('fr-FR'),
        this.getCheckpointLabel(temp.checkpoint),
        `${temp.value}°C`,
        temp.compliant ? '✓ Conforme' : '✗ Non conforme',
        temp.notes || '-'
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Point de contrôle', 'Température', 'Conformité', 'Notes']],
        body: tempData,
        theme: 'striped',
        headStyles: {
          fillColor: [181, 234, 215],
          textColor: [41, 98, 83],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 55 }
        },
        margin: { left: 14, right: 14 },
        didParseCell: (data: any) => {
          // Highlight non-compliant temperatures in red
          if (data.column.index === 3 && data.cell.raw && data.cell.raw.toString().includes('✗')) {
            data.cell.styles.textColor = [220, 38, 38] // red
            data.cell.styles.fontStyle = 'bold'
          }
        }
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // ========== NON-COMPLIANCES ==========
    if (data.nonCompliances && data.nonCompliances.length > 0) {
      // Check if we need a new page
      if (currentY > 200) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('3. Non-Conformités et Actions Correctives', 14, currentY)
      currentY += 8

      const ncData = data.nonCompliances.map(nc => [
        new Date(nc.date).toLocaleDateString('fr-FR'),
        this.getComplianceTypeLabel(nc.type),
        nc.description,
        this.getComplianceStatusLabel(nc.status),
        nc.correctiveAction || 'En cours'
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Type', 'Description', 'Statut', 'Action corrective']],
        body: ncData,
        theme: 'striped',
        headStyles: {
          fillColor: [244, 194, 194], // secondary pastel pink
          textColor: [127, 29, 29],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 50 },
          3: { cellWidth: 20 },
          4: { cellWidth: 50 }
        },
        margin: { left: 14, right: 14 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // ========== EQUIPMENT ==========
    if (data.equipment && data.equipment.length > 0) {
      // Check if we need a new page
      if (currentY > 200) {
        doc.addPage()
        currentY = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('4. Équipements et Maintenance', 14, currentY)
      currentY += 8

      const equipData = data.equipment.map(equip => [
        equip.name,
        equip.category || '-',
        equip.lastMaintenance ? new Date(equip.lastMaintenance).toLocaleDateString('fr-FR') : '-',
        equip.nextMaintenance ? new Date(equip.nextMaintenance).toLocaleDateString('fr-FR') : '-'
      ])

      autoTable(doc, {
        startY: currentY,
        head: [['Équipement', 'Catégorie', 'Dernière maintenance', 'Prochaine maintenance']],
        body: equipData,
        theme: 'striped',
        headStyles: {
          fillColor: [90, 157, 201],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 35 },
          2: { cellWidth: 40 },
          3: { cellWidth: 45 }
        },
        margin: { left: 14, right: 14 }
      })

      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // ========== FOOTER ==========
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const footerY = doc.internal.pageSize.height - 10
      doc.text(
        `Rapport HACCP généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`,
        14,
        footerY
      )
      doc.text(
        'Document conforme aux normes HACCP françaises',
        doc.internal.pageSize.width - 14,
        footerY,
        { align: 'right' }
      )
    }

    // Save PDF
    const fileName = `haccp-${data.startDate}-${data.endDate}-${Date.now()}.pdf`
    doc.save(fileName)
  }

  private getMealTypeLabel(type: string): string {
    switch (type) {
      case 'Breakfast': return 'Petit déjeuner'
      case 'Lunch': return 'Déjeuner'
      case 'Snack': return 'Goûter'
      default: return type
    }
  }

  private getCheckpointLabel(checkpoint: string): string {
    switch (checkpoint) {
      case 'Reception': return 'Réception'
      case 'Holding': return 'Maintien au chaud'
      case 'Service': return 'Service'
      case 'Storage': return 'Stockage'
      default: return checkpoint
    }
  }

  private getComplianceTypeLabel(type: string): string {
    switch (type) {
      case 'Product': return 'Produit'
      case 'Temperature': return 'Température'
      case 'Hygiene': return 'Hygiène'
      case 'Other': return 'Autre'
      default: return type
    }
  }

  private getComplianceStatusLabel(status: string): string {
    switch (status) {
      case 'Open': return 'Ouvert'
      case 'Corrected': return 'Corrigé'
      case 'Closed': return 'Fermé'
      default: return status
    }
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService()
