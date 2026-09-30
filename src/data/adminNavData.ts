import { 
  LayoutDashboard, Users, UserCheck, CreditCard, Award, Calendar, Bell, 
  FileText, Shield, Plus, Search, CheckCircle, AlertCircle, ArrowUpRight, DollarSign, BookOpen,
  Settings, UserCog, GraduationCap, ClipboardCheck, BarChart3, MessageSquare, KeyRound, Layers, Building2, School, Bookmark,
  Send, Eye, History, RefreshCw, CheckCircle2, Mail, Clock, AlertTriangle, LogOut, Printer, Wallet, TrendingUp, ChevronRight, ChevronDown,
  PanelLeftClose, PanelLeftOpen, MessageCircle, Database, Trash2, X, Sparkles, Palette, Download, Menu, Presentation, ShieldCheck,
  GitCompare, Activity, Upload, Crown, FolderTree, Briefcase, Zap, UserPlus, Receipt, Compass, HardDrive,
  Bus, ShieldAlert, ArrowRightLeft, Wrench, QrCode, Scale
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    id: 'setup',
    title: 'Setup',
    icon: School,
    color: 'blue',
  },
  {
    id: 'teacher',
    title: 'Staff',
    icon: UserCheck,
    color: 'green',
  },
  {
    id: 'student',
    title: 'Students',
    icon: Users,
    color: 'purple',
  },
  {
    id: 'exam',
    title: 'Exams',
    icon: Award,
    color: 'orange',
  },
  {
    id: 'fee',
    title: 'Finance',
    icon: DollarSign,
    color: 'cyan',
  },
  {
    id: 'payroll',
    title: 'Payroll',
    icon: Wallet,
    color: 'yellow',
  }
];
