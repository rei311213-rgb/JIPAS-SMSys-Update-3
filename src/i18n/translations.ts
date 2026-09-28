export type Language = 'en' | 'fr';

export interface Translations {
  [key: string]: {
    en: string;
    fr: string;
  };
}

export const translations: Translations = {
  // Brand & Header
  'app.name': {
    en: 'JIPAS',
    fr: 'JIPAS'
  },
  'app.subtitle': {
    en: 'School Management System • Est. 1990',
    fr: 'Système de Gestion Scolaire • Fondé en 1990'
  },
  'app.motto': {
    en: 'Education is Wealth',
    fr: "L'Éducation est une Richesse"
  },
  'app.dbSynced': {
    en: 'Supabase Synced',
    fr: 'Supabase Synchronisé'
  },
  'app.role': {
    en: 'Role',
    fr: 'Rôle'
  },
  'app.role.admin': {
    en: 'Admin',
    fr: 'Administrateur'
  },
  'app.role.sub_admin': {
    en: 'Sub-Admin',
    fr: 'Sous-Administrateur'
  },
  'app.role.clerk': {
    en: 'Clerk / Officer',
    fr: 'Commis / Agent'
  },
  'app.role.teacher': {
    en: 'Teacher',
    fr: 'Enseignant'
  },
  'app.role.accountant': {
    en: 'Accountant',
    fr: 'Comptable'
  },
  'app.role.student': {
    en: 'Student / Parent',
    fr: 'Élève / Parent'
  },
  'app.logout': {
    en: 'Logout',
    fr: 'Déconnexion'
  },
  'app.language': {
    en: 'Language',
    fr: 'Langue'
  },
  'app.language.en': {
    en: 'English',
    fr: 'Anglais'
  },
  'app.language.fr': {
    en: 'French',
    fr: 'Français'
  },

  // Admin Dashboard Cards
  'dashboard.totalEnrolled': {
    en: 'Total Enrolled',
    fr: 'Total Inscrits'
  },
  'dashboard.activeStudents': {
    en: 'Active Students',
    fr: 'Élèves Actifs'
  },
  'dashboard.pendingPayments': {
    en: 'Pending Payments',
    fr: 'Paiements en Attente'
  },
  'dashboard.outstandingBalances': {
    en: 'Outstanding Balances',
    fr: 'Soldes Restants'
  },
  'dashboard.newNotifications': {
    en: 'New Notifications',
    fr: 'Nouvelles Notifications'
  },
  'dashboard.unreadAlerts': {
    en: 'Unread Alerts',
    fr: 'Alertes Non Lues'
  },
  'dashboard.totalRevenue': {
    en: 'Total Revenue',
    fr: 'Recettes Totales'
  },
  'dashboard.feeCollections': {
    en: 'Fee Collections',
    fr: 'Frais Collectés'
  },
  'dashboard.teachingStaff': {
    en: 'Teaching Staff',
    fr: 'Corps Enseignant'
  },
  'dashboard.certifiedEducators': {
    en: 'Certified Educators',
    fr: 'Éducateurs Certifiés'
  },
  'dashboard.title': {
    en: 'School Management System Dashboard',
    fr: 'Tableau de Bord du Système Scolaire'
  },
  'dashboard.activeTerm': {
    en: 'Active Term',
    fr: 'Trimestre Actif'
  },
  'dashboard.backupDb': {
    en: 'Backup Database',
    fr: 'Sauvegarder la Base'
  },
  'dashboard.enrollStudent': {
    en: 'Enroll New Student',
    fr: 'Inscrire un Élève'
  },

  // Modules & Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    fr: 'Tableau de bord'
  },
  'nav.students': {
    en: 'Students',
    fr: 'Élèves'
  },
  'nav.teachers': {
    en: 'Teachers',
    fr: 'Enseignants'
  },
  'nav.classes': {
    en: 'Classes & Departments',
    fr: 'Classes & Départements'
  },
  'nav.fees': {
    en: 'Fees & Billing',
    fr: 'Frais & Facturation'
  },
  'nav.reports': {
    en: 'Terminal Reports',
    fr: 'Bulletins Trimestriels'
  },
  'nav.calendar': {
    en: 'Academic Calendar',
    fr: 'Calendrier Académique'
  },
  'nav.notifications': {
    en: 'Notifications & SMS',
    fr: 'Notifications & SMS'
  },
  'nav.academicSetup': {
    en: 'Academic Setup',
    fr: 'Configuration Académique'
  },
  'nav.loginHistory': {
    en: 'Login History',
    fr: 'Historique des Connexions'
  },
  'nav.profile': {
    en: 'Profile',
    fr: 'Profil'
  },

  // Common Actions
  'action.save': {
    en: 'Save',
    fr: 'Enregistrer'
  },
  'action.cancel': {
    en: 'Cancel',
    fr: 'Annuler'
  },
  'action.delete': {
    en: 'Delete',
    fr: 'Supprimer'
  },
  'action.edit': {
    en: 'Edit',
    fr: 'Modifier'
  },
  'action.search': {
    en: 'Search...',
    fr: 'Rechercher...'
  },
  'action.filter': {
    en: 'Filter',
    fr: 'Filtrer'
  },
  'action.print': {
    en: 'Print',
    fr: 'Imprimer'
  },
  'action.download': {
    en: 'Download',
    fr: 'Télécharger'
  },
  'action.export': {
    en: 'Export',
    fr: 'Exporter'
  },
  'action.back': {
    en: 'Back',
    fr: 'Retour'
  },
  'action.close': {
    en: 'Close',
    fr: 'Fermer'
  },
  'action.refresh': {
    en: 'Refresh',
    fr: 'Actualiser'
  },
  'action.view': {
    en: 'View',
    fr: 'Voir'
  },
  'action.submit': {
    en: 'Submit',
    fr: 'Soumettre'
  },
  'action.signIn': {
    en: 'Sign In',
    fr: 'Se Connecter'
  },

  // Student & Parent Portal
  'student.reportCard': {
    en: 'Terminal Report Card',
    fr: 'Bulletin de Notes Trimestriel'
  },
  'student.accountStatement': {
    en: 'Statement of Account',
    fr: 'Relevé de Compte'
  },
  'student.digitalId': {
    en: 'Digital Student ID',
    fr: "Carte Scolaire Numérique"
  },
  'student.parentGuardian': {
    en: 'Parent / Guardian Name',
    fr: 'Nom du Parent / Tuteur'
  },
  'student.emergencyPhone': {
    en: 'Parent Emergency Phone',
    fr: "Téléphone d'Urgence Parent"
  },
  'student.attendanceRate': {
    en: 'Attendance Rate',
    fr: 'Taux de Présence'
  },
  'student.averageScore': {
    en: 'Average Score',
    fr: 'Moyenne Générale'
  },
  'student.classPosition': {
    en: 'Class Position',
    fr: 'Rang de Classe'
  },
  'student.feesClearance': {
    en: 'Fees Clearance',
    fr: 'Règlement des Frais'
  },
  'student.tuitionFee': {
    en: 'Tuition Fee',
    fr: 'Frais de Scolarité'
  },
  'student.totalPayable': {
    en: 'Total Payable',
    fr: 'Total à Payer'
  },
  'student.totalPaid': {
    en: 'Total Paid',
    fr: 'Total Payé'
  },
  'student.balanceDue': {
    en: 'Balance Due',
    fr: 'Solde Dû'
  },
  'student.selectTerm': {
    en: 'Select Academic Term',
    fr: 'Sélectionner le Trimestre'
  },
  'student.notificationsAlerts': {
    en: 'Student & Parent Notifications & Fee Alerts',
    fr: 'Notifications et Alertes de Frais pour Élèves et Parents'
  },

  // Login Screen
  'login.welcome': {
    en: 'Welcome to JIPAS Portal',
    fr: 'Bienvenue sur le Portail JIPAS'
  },
  'login.prompt': {
    en: 'Sign in to access your administrative, educator, or student account',
    fr: 'Connectez-vous pour accéder à votre compte administratif, enseignant ou élève'
  },
  'login.identifier': {
    en: 'Email, Staff ID, or Student Admission No.',
    fr: "Email, Identifiant ou N° d'Admission Élève"
  },
  'login.password': {
    en: 'Password / Access PIN',
    fr: "Mot de Passe / PIN d'Accès"
  },
  'login.rememberMe': {
    en: 'Remember me on this device',
    fr: 'Se souvenir de moi sur cet appareil'
  },
  'login.signInBtn': {
    en: 'Sign In to Portal',
    fr: 'Accéder au Portail'
  },
  'login.demoCredentials': {
    en: 'Demo Credentials & Quick Fill',
    fr: 'Comptes de Démonstration & Remplissage Rapide'
  },

  // System Settings Translations
  'settings.title': {
    en: 'System Configuration & Institutional Profile',
    fr: 'Configuration du Système & Profil de l’Institution'
  },
  'settings.subtitle': {
    en: 'Manage institutional metadata, academic parameters, SMS sender credentials, and system settings.',
    fr: 'Gérez les métadonnées de l’établissement, les paramètres académiques, les identifiants SMS et les règles du portail.'
  },
  'settings.savedToast': {
    en: 'Institutional system settings updated successfully!',
    fr: 'Paramètres du système institutionnel mis à jour avec succès !'
  },
  'settings.profileTab': {
    en: 'Institutional Profile & General Settings',
    fr: 'Profil Institutionnel & Paramètres Généraux'
  },
  'settings.paletteTab': {
    en: 'Global Color Palette Studio',
    fr: 'Studio de Palette de Couleurs Globale'
  },
  'settings.identityHeader': {
    en: 'INSTITUTION IDENTITY & BRANDING',
    fr: 'IDENTITÉ & MARQUE DE L’INSTITUTION'
  },
  'settings.schoolName': {
    en: 'School / Institution Name *',
    fr: 'Nom de l’école / Nom de l’institution *'
  },
  'settings.schoolMotto': {
    en: 'School Motto / Slogan',
    fr: 'Devise de l’école / Slogan'
  },
  'settings.address': {
    en: 'Official Postal & Physical Location Address',
    fr: 'Adresse postale officielle et adresse physique'
  },
  'settings.email': {
    en: 'Official Email Address',
    fr: 'Adresse e-mail officielle'
  },
  'settings.phone': {
    en: 'Primary Contact Phone',
    fr: 'Téléphone principal'
  },
  'settings.quote': {
    en: '“Quality education today, a brighter tomorrow.”',
    fr: '« Une éducation de qualité aujourd’hui, un meilleur avenir demain. »'
  },
  'settings.saveChanges': {
    en: 'Save Changes',
    fr: 'Enregistrer les modifications'
  },
  'settings.crestHeader': {
    en: 'Official Crest & Institutional Logo',
    fr: 'Armoiries Officielles & Logo de l’Établissement'
  },
  'settings.crestSubtitle': {
    en: 'Customize the school logo displayed across headers, transcripts, invoices, and ID cards.',
    fr: 'Personnalisez le logo affiché sur les en-têtes, bannières, reçus et bulletins.'
  },
  'settings.reset': {
    en: 'Reset',
    fr: 'Réinitialiser'
  },
  'settings.logoUpdated': {
    en: 'School logo updated successfully across the entire application.',
    fr: 'Logo de l’école mis à jour avec succès dans toute l’application.'
  },
  'settings.livePreview': {
    en: 'Live Preview',
    fr: 'Aperçu en Direct'
  },
  'settings.activeRealtime': {
    en: 'Active in Real-Time',
    fr: 'Actif en temps réel'
  },
  'settings.uploadLogo': {
    en: 'Upload Logo',
    fr: 'Importer un Logo'
  },
  'settings.orUrl': {
    en: 'Or image URL (https://...)',
    fr: 'Ou URL image (https://...)'
  },
  'settings.apply': {
    en: 'Apply',
    fr: 'Appliquer'
  },
  'settings.academicHeader': {
    en: 'Academic Parameters & Operational Rules',
    fr: 'Paramètres Académiques & Règles Opérationnelles'
  },
  'settings.academicYear': {
    en: 'Active Academic Year',
    fr: 'Année Académique Active'
  },
  'settings.activeTerm': {
    en: 'Active Term',
    fr: 'Trimestre Actif'
  },
  'settings.reopeningDate': {
    en: 'Next Term Resumption Date',
    fr: 'Date de Reprise'
  },
  'settings.smsSenderId': {
    en: 'SMS Sender ID',
    fr: 'ID Expéditeur SMS'
  },
  'settings.saveAll': {
    en: 'Save All System Settings',
    fr: 'Enregistrer Tous les Paramètres'
  },
  'feedback.giveFeedback': {
    en: 'Give Feedback',
    fr: 'Donner un Avis'
  },
  'feedback.modalTitle': {
    en: 'Give Feedback & Report Issues',
    fr: 'Donner un Avis & Signaler un Problème'
  },
  'feedback.modalSubtitle': {
    en: 'Sent directly to school administrators via Supabase',
    fr: 'Envoyé directement aux administrateurs via Supabase'
  },
  'feedback.tabSend': {
    en: 'Send New Feedback',
    fr: 'Envoyer un Avis'
  },
  'feedback.tabHistory': {
    en: 'My Submissions',
    fr: 'Mes Soumissions'
  },
  'feedback.typeLabel': {
    en: 'Feedback Type',
    fr: 'Type de Commentaire'
  },
  'feedback.titleLabel': {
    en: 'Subject / Summary',
    fr: 'Objet / Résumé'
  },
  'feedback.messageLabel': {
    en: 'Description / Details',
    fr: 'Description / Détails'
  },
  'feedback.submitBtn': {
    en: 'Submit Feedback',
    fr: 'Envoyer le Commentaire'
  },
  'feedback.submittedTitle': {
    en: 'Feedback Received!',
    fr: 'Commentaire Reçu !'
  }
};
