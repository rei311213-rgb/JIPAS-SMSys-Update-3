import { FeeOptionItem, FeePolicySettings } from '../types';

export interface FeeDescriptionCategory {
  id: string;
  category: string;
  description?: string;
  options: string[];
}

export const INITIAL_FEE_DESCRIPTION_CATEGORIES: FeeDescriptionCategory[] = [
  {
    id: 'fdc-1',
    category: 'Tuition & Academic Term Fees',
    description: 'Core tuition and termly academic fees across departments',
    options: [
      'Tuition Fee (Full Term Payment)',
      'Tuition Fee (Part Payment / 1st Installment)',
      'Tuition Fee (Part Payment / 2nd Installment)',
      'First Term School Fees',
      'Second Term School Fees',
      'Third Term School Fees',
      'Full Academic Year Fees (Advance Payment)',
    ]
  },
  {
    id: 'fdc-2',
    category: 'Statutory Levies & Development',
    description: 'Mandatory infrastructural, PTA, and computer lab levies',
    options: [
      'P.T.A Development Levy',
      'ICT & Computer Lab Levy',
      'Terminal Examination & Printing Fee',
      'First Aid & Clinic Health Levy',
      'Sports, Games & Cultural Levy',
      'Library & Resource Center Levy',
      'School Maintenance & Utility Levy'
    ]
  },
  {
    id: 'fdc-3',
    category: 'Student Welfare & Auxiliary Services',
    description: 'Transit, canteen, uniform, and educational tours',
    options: [
      'School Bus Transit Service (Monthly/Termly)',
      'School Feeding & Canteen Fee',
      'School Uniforms & Sports Wear Package',
      'Textbooks, Exercise Books & Stationery',
      'Excursion / Educational Tour Fee',
      'Extra / Saturday Remedial Classes'
    ]
  },
  {
    id: 'fdc-4',
    category: 'Administrative & Special Charges',
    description: 'Registration, ID card, graduation, and clearance fees',
    options: [
      'New Admission & Registration Fee',
      'Graduation & Speech & Prize-Giving Day Fee',
      'BECE / External Mock Registration Fee',
      'Student ID Card & Badge Replacement',
      'Transcript & Official Document Processing',
      'Previous Academic Arrears Clearance'
    ]
  }
];

export const PAID_AS_CATEGORIES = INITIAL_FEE_DESCRIPTION_CATEGORIES;

export const QUICK_PAID_AS_SUGGESTIONS = [
  'Tuition Fee (Full Payment)',
  'Tuition Fee (Part Payment)',
  'Third Term School Fees',
  'P.T.A Development Levy',
  'ICT & Computer Lab Levy',
  'School Bus Transit Service',
  'Feeding & Canteen Fee',
  'Arrears Clearance'
];

export const INITIAL_FEE_OPTIONS_DATA: FeeOptionItem[] = [];

export const DEFAULT_FEE_POLICY: FeePolicySettings = {
  currencySymbol: 'GHS',
  defaultPaymentTerm: 'Third Term (2025-2026)',
  allowPartPayments: true,
  minDepositPercentage: 40,
  lateFeePenaltyPercent: 5,
  siblingDiscountPercent: 10,
  scholarshipGrantActive: true,
  receiptHeaderNote: 'Official Receipt of JIPAS • Education is Wealth',
  receiptFooterNote: 'Fees once paid are non-refundable. Thank you for your continued partnership.'
};

